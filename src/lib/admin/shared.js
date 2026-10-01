export const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
export function toast(message) {
  const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),5000);
}
export async function checked(query) {
  const result=await query;if(result.error)throw new Error(result.error.message);return result;
}
export async function checkedFetch(url, options) {
  const response=await fetch(url,options);if(!response.ok)throw new Error('The files could not be removed. Please try again.');return response;
}
export function fmtBytes(bytes) {
  if(bytes<1024)return bytes+' B';if(bytes<1048576)return (bytes/1024).toFixed(1)+' KB';return (bytes/1048576).toFixed(1)+' MB';
}
export function bindActions(actions) {
  for(const event of ['click','change','input'])document.addEventListener(event,async e=>{
    const attr=event==='click'?'action':event;
    const el=e.target.closest('[data-'+attr+']');if(!el)return;
    const fn=actions[el.dataset[attr]];if(!fn)return;
    const args=JSON.parse(el.dataset.args||'[]').map(arg=>arg==='$checked'?el.checked:arg);
    const button=event==='click'&&el.tagName==='BUTTON';
    if(button&&el.disabled)return;
    if(button)el.disabled=true;
    try{await fn(...args);}catch(error){toast(error.message||'The change could not be saved.');}
    finally{if(button)el.disabled=false;}
  });
}
