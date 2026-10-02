import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderBody,renderPost,renderIndex,makeSlug,validSlug,safeImage} from '../src/lib/blog-format.js';
import {readBlog,serveBlog} from '../src/lib/blog-server.js';
import {persistPost} from '../src/lib/admin/blog.js';
import {studioFixture} from './admin-fixture.mjs';
const env={PUBLIC_SUPABASE_URL:'https://db.test',PUBLIC_SUPABASE_ANON_KEY:'public-test'};
const post={id:'one',title:'An afternoon in Valdosta',slug:'an-afternoon',excerpt:'A short description.',body:'## At the park\n\nA **portrait** session.\n\n- One\n- Two',cover_url:'https://images.test/cover.jpg',cover_alt:'A tree beside a path',published_at:'2026-01-01T12:00:00Z',updated_at:'2026-01-01T12:00:00Z'};
test('blog format escapes HTML, attributes and unsafe links while keeping supported text formatting',()=>{
 const html=renderBody('<script>alert(1)</script>\n\n[bad](javascript:alert) [safe](https://example.com/?x="bad")\n\n**bold** and *italics*\n\n- first\n- second');
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('href="javascript:'));assert.match(html,/&lt;script&gt;/);assert.match(html,/<strong>bold<\/strong>/);assert.match(html,/<em>italics<\/em>/);assert.match(html,/<ul><li>first<\/li>/);assert.ok(!html.includes('href="https://example.com/?x="'));
 assert.equal(safeImage('javascript:alert(1)'), '');assert.equal(safeImage('https://user:pass@images.test/x'),'');
 assert.ok(!renderPost({...post,title:'<img onerror=alert(1)>',cover_alt:'" onerror="bad'}).includes('alt="" onerror='));
});
test('slugs are stable, URL-safe and bounded',()=>{assert.equal(makeSlug('A café in Valdosta!'),'a-cafe-in-valdosta');for(const slug of ['../admin','two words','x?y','A-B','x'.repeat(101),''])assert.equal(validSlug(slug),false);assert.equal(validSlug('one-post-2'),true);});
test('public readers only query published posts and never forward a viewer session',async t=>{
 let request;t.mock.method(globalThis,'fetch',async(url,options)=>{request={url:new URL(url),options};return Response.json([post,{...post,title:'Private draft',published_at:null},{...post,title:'Future post',published_at:'2099-01-01'}]);});
 const result=await readBlog(env);assert.equal(result.status,200);assert.match(result.html,/An afternoon/);assert.ok(!result.html.includes('Private draft'));assert.ok(!result.html.includes('Future post'));assert.match(request.url.searchParams.get('published_at'),/^lte\./);assert.equal(request.options.headers.Authorization,'Bearer public-test');assert.ok(!request.url.searchParams.get('select').split(',').includes('body'));
});
test('unpublished, missing and invalid posts return 404 without exposing their text',async t=>{let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json([{...post,published_at:null}]);});const hidden=await readBlog(env,{slug:post.slug});assert.equal(hidden.status,404);assert.ok(!hidden.html.includes(post.body));assert.equal((await readBlog(env,{slug:'../bad'})).status,404);assert.equal(calls,1);});
test('pagination is bounded and renders the next page only when present',async t=>{let query;t.mock.method(globalThis,'fetch',async url=>{query=new URL(url).searchParams;return Response.json(Array.from({length:13},(_,i)=>({...post,slug:'post-'+i})));});const result=await readBlog(env,{page:2});assert.equal(query.get('offset'),'12');assert.equal(query.get('limit'),'13');assert.match(result.html,/page=3/);assert.match(result.html,/page=1/);assert.equal((result.html.match(/class="blog-entry/g)||[]).length,12);});
test('public failures do not leak upstream error details or secrets',async t=>{t.mock.method(globalThis,'fetch',async()=>Response.json({error:'private database details'},{status:500}));const result=await readBlog(env);assert.equal(result.status,503);assert.ok(!JSON.stringify(result).includes('private database'));});
test('draft creation, publishing, editing and unpublishing preserve the post and stable link',async t=>{
 const f=studioFixture({blog_posts:[]});t.after(f.restore);
 let saved=await persistPost(f.ctx.sb,{...post,published_at:null});assert.equal(saved.published_at,null);
 saved=await persistPost(f.ctx.sb,{...saved,published_at:post.published_at},saved);assert.equal(saved.published_at,post.published_at);
 saved=await persistPost(f.ctx.sb,{...saved,title:'Edited title',slug:'changed-link'},saved);assert.equal(saved.slug,post.slug);assert.equal(saved.title,'Edited title');
 saved=await persistPost(f.ctx.sb,{...saved,published_at:null},saved);assert.equal(saved.published_at,null);assert.equal(saved.body,post.body);assert.equal(f.tables.blog_posts.length,1);
});
test('stale edit cannot overwrite a newer post',async t=>{const f=studioFixture({blog_posts:[{...post,updated_at:'new-version'}]});t.after(f.restore);await assert.rejects(persistPost(f.ctx.sb,{...post,title:'Stale edit'},post),/another window/);assert.equal(f.tables.blog_posts[0].title,post.title);});
test('invalid body, image or cover description cannot save; rejected writes remain errors',async t=>{const f=studioFixture({blog_posts:[]});t.after(f.restore);for(const bad of [{body:' '},{cover_url:'javascript:bad'},{cover_alt:''},{title:'x'.repeat(161)}])await assert.rejects(persistPost(f.ctx.sb,{...post,...bad}));assert.equal(f.requests.length,0);f.failWith(()=>true);await assert.rejects(persistPost(f.ctx.sb,post),/could not be saved/);});
test('rendered article and empty blog have clear content and usable links',()=>{const article=renderPost(post);assert.match(article,/<h1>An afternoon/);assert.match(article,/<h2>At the park/);assert.match(article,/href="\/blog"/);assert.match(renderIndex([]),/No posts yet/);});
test('server-rendered blog rewrites page metadata and uses no-store responses',async t=>{
 const handlers=new Map();const previous=globalThis.HTMLRewriter;t.after(()=>{globalThis.HTMLRewriter=previous;});
 globalThis.HTMLRewriter=class{on(selector,handler){handlers.set(selector,handler);return this;}transform(response){return response;}};
 t.mock.method(globalThis,'fetch',async()=>Response.json([post]));
 const assets={fetch:async request=>{assert.equal(new URL(request.url).pathname,'/blog/');return new Response('<html>template</html>',{headers:{'Content-Type':'text/html','ETag':'old'}});}};
 const result=await serveBlog({request:new Request('https://site.test/blog/'+post.slug),env:{...env,ASSETS:assets},params:{slug:post.slug}});
 assert.equal(result.status,200);assert.equal(result.headers.get('Cache-Control'),'no-store');assert.equal(result.headers.get('ETag'),null);
 let title;handlers.get('title').element({setInnerContent:v=>title=v});assert.equal(title,post.title+' — ZR Photos');
 let content;handlers.get('#blog-content').element({setAttribute(){},setInnerContent:v=>content=v});assert.match(content,/At the park/);
 let image;handlers.get('meta[property="og:image"]').element({setAttribute:(key,value)=>image=value});assert.equal(image,post.cover_url);
 let head='';handlers.get('head').element({append:value=>head+=value});assert.match(head,/rel="canonical"/);assert.match(head,/article:published_time/);
});
