import {confirmChange} from './dialog.js';
import {escapeHTML,makeSlug,validSlug,safeImage,renderPost} from '../blog-format.js';

export async function persistPost(sb,values,existing=null) {
  const fields={title:values.title.trim(),slug:existing?.slug||values.slug.trim(),excerpt:values.excerpt.trim(),body:values.body.trim(),cover_url:values.cover_url,cover_alt:values.cover_alt.trim(),published_at:values.published_at||null};
  if(!fields.title||fields.title.length>160||!validSlug(fields.slug)||!fields.body||fields.body.length>30000||fields.excerpt.length>300||fields.cover_alt.length>180)throw new Error('Check the title, link, description, and post text.');
  if(fields.cover_url&&(!safeImage(fields.cover_url)||fields.cover_url.length>2048))throw new Error('Choose a valid cover photograph.');
  if(fields.cover_url&&!fields.cover_alt)throw new Error('Add a short description of the cover photograph.');
  const query=existing?sb.from('blog_posts').update(fields).eq('id',existing.id).eq('updated_at',existing.updated_at):sb.from('blog_posts').insert({...fields,id:values.id});
  const {data,error}=await query.select();
  if(error){if(error.code==='23505')throw new Error('That post link is already taken. Choose a different one.');throw new Error('The post could not be saved. Your text is still here; please try again.');}
  if(!data?.[0])throw new Error('This post changed in another window. Copy your text before refreshing posts.');
  return data[0];
}
export function setupBlog({sb,state}) {
  const $=id=>document.getElementById(id);
  let current=null,newID=crypto.randomUUID(),baseline='',busy=false,loaded=false,slugEdited=false;
  const values=()=>({id:current?.id||newID,title:$('blog-title').value,slug:$('blog-slug').value,excerpt:$('blog-excerpt').value,body:$('blog-body').value,cover_url:$('blog-cover').value,cover_alt:$('blog-alt').value,published_at:current?.published_at||null});
  const fingerprint=()=>JSON.stringify(values());
  const dirty=()=>baseline!==''&&baseline!==fingerprint();
  const status=message=>{$('blog-status').textContent=message;};
  function covers(saved=$('blog-cover').value) {
    const photos=state.photos.filter(p=>safeImage(p.web_url||p.thumb_url||p.url));
    const urls=new Set(photos.map(p=>p.web_url||p.thumb_url||p.url));
    $('blog-cover').innerHTML='<option value="">No cover photograph</option>'+photos.map(p=>`<option value="${escapeHTML(p.web_url||p.thumb_url||p.url)}">${escapeHTML(p.title||p.file_name||p.category||'Photograph')}</option>`).join('')+(saved&&!urls.has(saved)?`<option value="${escapeHTML(saved)}">Current cover photograph</option>`:'');
    $('blog-cover').value=saved;
  }
  function controls() {
    const published=!!current?.published_at;
    $('blog-state').textContent=published?'Published':'Draft — only visible in Studio';
    $('blog-save').textContent=published?'Save changes':'Save draft';
    $('blog-publish').hidden=published;$('blog-unpublish').hidden=!published;
    $('blog-delete').hidden=!current;$('blog-slug').readOnly=!!current;
    $('blog-live-link').hidden=!published;if(published)$('blog-live-link').href='/blog/'+current.slug;
    $('blog-alt').required=!!$('blog-cover').value;
  }
  async function choose(post=null) {
    if(busy)return;
    if(dirty()&&!await confirmChange('Discard your unsaved changes?'))return;
    current=post;newID=crypto.randomUUID();slugEdited=!!post;
    for(const key of ['title','slug','excerpt','body'])$('blog-'+key).value=post?.[key]||'';
    covers(post?.cover_url||'');$('blog-alt').value=post?.cover_alt||'';
    $('blog-preview').hidden=true;controls();baseline=fingerprint();status('');renderList();$('blog-title').focus();
  }
  let posts=[];
  function renderList(){
    const list=$('blog-post-list');list.replaceChildren();
    if(!posts.length){const p=document.createElement('p');p.className='no-data';p.textContent='No posts yet. Start a new draft.';list.append(p);return;}
    for(const post of posts){const b=document.createElement('button');b.type='button';b.className='blog-post-choice';b.setAttribute('aria-current',String(current?.id===post.id));b.textContent=post.title;const small=document.createElement('small');small.textContent=post.published_at?'Published':'Draft';b.append(small);b.addEventListener('click',()=>choose(post));list.append(b);}
  }
  async function load(){
    if(busy)return;
    const {data,error}=await sb.from('blog_posts').select('*').order('updated_at',{ascending:false});
    if(error){$('blog-load-status').textContent='Posts could not load. If this is the first visit, finish the blog database setup, then refresh.';return;}
    posts=data||[];loaded=true;$('blog-load-status').textContent='';covers();renderList();
    if(!baseline){controls();baseline=fingerprint();}
  }
  async function save(mode='save') {
    if(busy)return;
    if(mode!=='unpublish'&&!$('blog-form').reportValidity())return;
    if(mode==='publish'&&!await confirmChange('Publish this post on the website? The post text and cover photograph will be public.'))return;
    if(mode==='unpublish'&&!await confirmChange('Unpublish this post? It will stay saved as a private draft.'))return;
    busy=true;$('blog-fields').disabled=true;status('Saving…');
    try {
      const payload=mode==='unpublish'?{...current}:values();
      if(mode==='publish')payload.published_at=new Date().toISOString();
      if(mode==='unpublish')payload.published_at=null;
      const hadEdits=dirty();current=await persistPost(sb,payload,current);
      // Unpublishing must not silently discard text the author has not saved.
      if(mode!=='unpublish'||!hadEdits)baseline=JSON.stringify({...values(),published_at:current.published_at});
      else baseline='unsaved';
      controls();posts=[current,...posts.filter(p=>p.id!==current.id)];renderList();
      status(mode==='publish'?'Post published.':mode==='unpublish'?'Post unpublished. It is now a private draft.':current.published_at?'Changes published.':'Draft saved.');
    } catch(error){status(error.message);}finally{busy=false;$('blog-fields').disabled=false;}
  }
  $('blog-form').addEventListener('submit',event=>{event.preventDefault();save();});
  function changed() {
    if(busy)return;
    $('blog-preview').hidden=true;
    const message=dirty()?'Unsaved changes.':'';
    if($('blog-status').textContent!==message)status(message);
  }
  $('blog-form').addEventListener('input',changed);
  $('blog-form').addEventListener('change',changed);
  $('blog-title').addEventListener('input',()=>{if(!slugEdited&&!current)$('blog-slug').value=makeSlug($('blog-title').value);});
  $('blog-slug').addEventListener('input',()=>{slugEdited=true;});
  $('blog-cover').addEventListener('change',controls);
  $('blog-new').addEventListener('click',()=>choose());
  $('blog-refresh').addEventListener('click',async()=>{if(busy)return;if(dirty()&&!await confirmChange('Discard your unsaved changes and refresh posts?'))return;baseline='';current=null;await choose();await load();});
  $('blog-publish').addEventListener('click',()=>save('publish'));
  $('blog-unpublish').addEventListener('click',()=>save('unpublish'));
  $('blog-preview-button').addEventListener('click',()=>{if(!$('blog-form').reportValidity())return;$('blog-preview-content').innerHTML=renderPost(values(),true);$('blog-preview').hidden=false;$('blog-preview').scrollIntoView({behavior:'instant',block:'start'});});
  $('blog-delete').addEventListener('click',async()=>{
    if(busy||!current||!await confirmChange('Delete this post permanently? Its cover photograph will stay in Photos.'))return;
    busy=true;$('blog-fields').disabled=true;
    try{const {data,error}=await sb.from('blog_posts').delete().eq('id',current.id).eq('updated_at',current.updated_at).select('id');if(error)throw new Error('The post could not be deleted. Please try again.');if(!data?.length)throw new Error('This post changed in another window. Refresh posts before deleting.');posts=posts.filter(p=>p.id!==current.id);baseline='';busy=false;await choose();status('Post deleted.');}catch(error){status(error.message);}finally{busy=false;$('blog-fields').disabled=false;}
  });
  window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
  controls();baseline=fingerprint();
  return {load,activate(){covers();if(!loaded)load();},actions:{}};
}
