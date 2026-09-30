import {delivery,copyPrivateLink} from './delivery-api.js';
const labels={pending:'New enquiry',accepted:'Awaiting details',processing:'Creating folder',folder_error:'Folder needs attention',ready:'Ready for photos',published:'Published',declined:'Declined'};
function node(tag,text,cls) { const e=document.createElement(tag); if(text)e.textContent=text; if(cls)e.className=cls; return e; }
export function setupDeliveryAdmin(sb) {
  const list=document.getElementById('delivery-list');
  const status=document.getElementById('delivery-admin-status');
  const filter=document.getElementById('delivery-filter');
  let rows=[]; let busy=false;
  async function session() {
    const {data}=await sb.auth.getSession();
    if(!data.session) throw new Error('Please sign in again.'); return data.session;
  }
  async function act(action,data={}) { return delivery(action,data,await session()); }
  function show(message) { status.textContent=message; }
  async function load() {
    try { rows=(await act('list')).requests; render(); show(''); }
    catch(e) { show(e.message); list.replaceChildren(); }
  }
  function render() {
    list.replaceChildren();
    const selected=filter.value;
    const visible=rows.filter(r=>selected==='all' || (selected==='active'?!['declined','published'].includes(r.status):r.status===selected));
    if(!visible.length) {list.append(node('p','No enquiries in this view.','no-data')); return;}
    for(const row of visible) {
      const article=node('article',null,'delivery-row');
      const head=node('div',null,'delivery-row-head');
      const title=node('h3',row.details?.name || row.name);
      head.append(title,node('span',labels[row.status] || row.status,'delivery-state'));
      article.append(head,node('p',`${row.contact} · ${new Date(row.created_at).toLocaleDateString()}`,'delivery-muted'));
      article.append(node('p',row.message,'delivery-message'));
      if(row.preferred_date) article.append(node('p',`Requested date: ${row.preferred_date}`,'delivery-muted'));
      if(row.details) {
        const d=row.details;
        const details=node('details'); details.append(node('summary','Session details'));
        details.append(node('p',`${d.session_type} · ${d.date}${d.time?' at '+d.time:''}`),node('p',d.location),node('p',`${d.email}${d.phone?' · '+d.phone:''}`));
        if(d.notes) details.append(node('p',d.notes,'delivery-message')); article.append(details);
      }
      if(row.last_error) article.append(node('p',row.last_error,'delivery-error'));
      const actions=node('div',null,'delivery-actions');
      function button(label,fn) {
        const b=node('button',label,'btn-sm');b.type='button';b.disabled=busy;
        b.addEventListener('click',async()=>{
          if(busy)return;busy=true;render();show('Working…');
          try {const message=await fn();await load();if(message)show(message);}
          catch(e){show(e.message);}finally{busy=false;render();}
        }); actions.append(b);
      }
      function link(label,url) {const a=node('a',label,'btn-sm');a.href=url;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);}
      if(row.status==='pending') button('Accept',async()=>{await act('accept',{id:row.id});return 'Accepted. Copy the private form link or fill in the details yourself.';});
      if(row.status==='accepted') {
        const expired=Date.parse(row.token_expires_at)<Date.now();
        if(!expired) button('Copy client form link',async()=>{await copyPrivateLink(`${location.origin}/client-details#${row.details_token}`);return 'Private form link copied. It expires in 30 days from acceptance.';});
        link('Fill in details',`/client-details?id=${row.id}`);
        button(expired?'Renew expired link':'Replace form link',async()=>{
          if(!confirm('Replace the private form link? The previous link will stop working.'))return;
          await act('renew',{id:row.id});return 'New form link created. Use Copy client form link.';
        });
      }
      if(['pending','accepted'].includes(row.status)) button('Decline',async()=>{if(confirm('Decline this enquiry? Its private form will become unavailable.'))await act('decline',{id:row.id});});
      if(row.status==='folder_error' || row.status==='processing') button('Retry folder',async()=>{const r=await act('retry',{id:row.id});return r.status==='ready'?'Drive folder is ready.':r.status==='processing'?'Still creating the folder. Refresh shortly.':r.message;});
      if(['ready','published'].includes(row.status)) {
        link('Open photo folder',`https://drive.google.com/drive/folders/${encodeURIComponent(row.drive_folder_id)}`);
        if(row.status==='ready') button('Publish gallery',async()=>{await act('publish',{id:row.id});return 'Gallery published. Copy its private link to share it.';});
        else {
          const url=`${location.origin}/client-gallery#${row.gallery_token}`;
          button('Copy gallery link',async()=>{await copyPrivateLink(url);return 'Private gallery link copied.';});
          link('View gallery',url);
          button('Unpublish',async()=>{await act('unpublish',{id:row.id});return 'Gallery hidden from clients.';});
        }
      }
      article.append(actions);list.append(article);
    }
  }
  filter.addEventListener('change',render);
  document.getElementById('delivery-refresh').addEventListener('click',()=>{if(!busy)load();});
  document.getElementById('delivery-check').addEventListener('click',async()=>{show('Checking Drive access…');try{const r=await act('health');show(`Connected to ${r.name}. Folder creation is available.`);}catch(e){show(e.message);}});
  window.addEventListener('focus',()=>{if(!busy)load();});
  return load;
}
