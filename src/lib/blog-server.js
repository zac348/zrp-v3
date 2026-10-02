import {validSlug,renderPost,renderIndex,escapeHTML,safeImage} from './blog-format.js';
export async function readBlog(env,{slug,page=1}={}) {
  if(slug!==undefined&&!validSlug(slug))return {status:404,title:'Post not found — ZR Photos',html:'<h1>Post not found</h1><p>This post is unavailable.</p><a href="/blog">All posts</a>'};
  page = Number.isSafeInteger(Number(page)) && Number(page)>0 && Number(page)<=10000 ? Number(page) : 1;
  try {
    if(!env.PUBLIC_SUPABASE_URL||!env.PUBLIC_SUPABASE_ANON_KEY)throw new Error('Missing configuration');
    const query=new URLSearchParams({select:slug?'title,slug,excerpt,body,cover_url,cover_alt,published_at':'title,slug,excerpt,cover_url,cover_alt,published_at',published_at:'lte.'+new Date().toISOString(),order:'published_at.desc,id.desc',limit:slug?'1':'13'});
    if(slug)query.set('slug','eq.'+slug);else query.set('offset',String((page-1)*12));
    const response=await fetch(`${env.PUBLIC_SUPABASE_URL.replace(/\/$/,'')}/rest/v1/blog_posts?${query}`,{headers:{apikey:env.PUBLIC_SUPABASE_ANON_KEY,Authorization:`Bearer ${env.PUBLIC_SUPABASE_ANON_KEY}`},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Unavailable');
    const data=await response.json();if(!Array.isArray(data))throw new Error('Invalid response');
    // Defense in depth: even a misconfigured policy cannot expose drafts here.
    const posts=data.filter(p=>p.published_at&&Number.isFinite(Date.parse(p.published_at))&&Date.parse(p.published_at)<=Date.now());
    if(slug){const post=posts.find(p=>p.slug===slug);if(!post)return {status:404,title:'Post not found — ZR Photos',html:'<h1>Post not found</h1><p>This post is unavailable.</p><a href="/blog">All posts</a>'};return {status:200,title:post.title+' — ZR Photos',description:post.excerpt||post.body.slice(0,160),image:safeImage(post.cover_url),publishedAt:post.published_at,html:renderPost(post)};}
    return {status:200,title:'Blog — Zachary Routsong',description:'Posts and photographs by Zachary Routsong in Valdosta, Georgia.',html:renderIndex(posts.slice(0,12),page,posts.length>12)};
  } catch { return {status:503,title:'Blog — Zachary Routsong',html:'<h1>Blog</h1><p class="no-data">Posts could not load. Please try again shortly.</p><a href="/blog">Try again</a>'}; }
}
export async function serveBlog({request,env,params={}}) {
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const url=new URL(request.url),slug=params.slug;
  const result=await readBlog(env,{slug,page:url.searchParams.get('page')||1});
  const templateURL=new URL('/blog/',url.origin);
  const template=await env.ASSETS.fetch(new Request(templateURL));
  if(!template.ok)return new Response('Blog is temporarily unavailable.',{status:503});
  const description=result.description||'Photographs and posts by Zachary Routsong.';
  const canonical=new URL(slug?'/blog/'+slug:'/blog',url.origin);if(!slug&&Number(url.searchParams.get('page'))>1)canonical.searchParams.set('page',url.searchParams.get('page'));
  const html=new HTMLRewriter().on('#blog-content',{element(e){e.setAttribute('data-rendered','true');e.setInnerContent(result.html,{html:true});}})
    .on('title',{element(e){e.setInnerContent(result.title);}})
    .on('meta[name="description"], meta[property="og:description"]',{element(e){e.setAttribute('content',description);}})
    .on('meta[property="og:title"]',{element(e){e.setAttribute('content',result.title);}})
    .on('meta[property="og:url"]',{element(e){e.setAttribute('content',canonical.href);}})
    .on('meta[property="og:type"]',{element(e){e.setAttribute('content',slug?'article':'website');}})
    .on('meta[property="og:image"]',{element(e){if(result.image)e.setAttribute('content',result.image);}})
    .on('head',{element(e){e.append(`<link rel="canonical" href="${escapeHTML(canonical.href)}">`,{html:true});if(result.publishedAt)e.append(`<meta property="article:published_time" content="${escapeHTML(result.publishedAt)}">`,{html:true});if(result.status!==200)e.append('<meta name="robots" content="noindex,nofollow">',{html:true});}}).transform(template);
  const headers=new Headers(html.headers);headers.delete('Content-Length');headers.delete('Content-Encoding');headers.delete('ETag');headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');
  return new Response(request.method==='HEAD'?null:html.body,{status:result.status,headers});
}
