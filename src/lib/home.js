import { loadPublicPhotos, loadStartingPackage, renderCategoryFilters, syncCategoryFilters } from './portfolio.js';
import { packageFeatures } from './packages.js';
import { makeTile, bindLightbox, openPhoto, photoAlt } from './gallery.js';
bindLightbox();
const grid=document.getElementById('portfolio-grid');
let allPhotos=[],featured=[],coverIndex=0;
const coverImage=document.getElementById('cover-image');
const coverOpen=document.getElementById('cover-open');
const coverLoading=document.getElementById('cover-loading');
let coverVersion=0;
function coverPhoto(index) {
  if(!featured.length)return;
  coverIndex=(index+featured.length)%featured.length;
  const photo=featured[coverIndex];
  const version=++coverVersion;
  coverImage.alt=photoAlt(photo);coverImage.hidden=false;
  coverImage.onload=()=>{if(version===coverVersion){coverLoading.hidden=true;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)coverImage.animate([{opacity:.15},{opacity:1}],{duration:version===1?400:180,easing:'cubic-bezier(.2,0,.2,1)'});document.querySelector('.cover-stage').setAttribute('aria-busy','false');}};
  coverImage.onerror=()=>{if(version===coverVersion){coverImage.hidden=true;coverLoading.hidden=false;coverLoading.textContent='This photograph couldn’t load. Try the next one.';document.querySelector('.cover-stage').setAttribute('aria-busy','false');}};
  coverImage.width=photo.width||2200;coverImage.height=photo.height||1467;
  coverImage.sizes='100vw';coverImage.srcset=photo.thumb_url&&photo.web_url?`${photo.thumb_url} 700w, ${photo.web_url} 2200w`:'';
  coverImage.dataset.crop=photo.location?.includes('Thorncrown')?'architecture':'horizon';
  coverImage.src=photo.web_url||photo.thumb_url||'';
  document.getElementById('cover-title').textContent=photo.location||photo.title||photo.sport||'From the portfolio';
  document.getElementById('cover-count').textContent=`${String(coverIndex+1).padStart(2,'0')} / ${String(featured.length).padStart(2,'0')}`;
  coverOpen.setAttribute('aria-label','View '+photoAlt(photo));coverOpen.disabled=false;
  document.getElementById('cover-prev').disabled=featured.length<2;document.getElementById('cover-next').disabled=featured.length<2;
}
document.getElementById('cover-prev').addEventListener('click',()=>coverPhoto(coverIndex-1));
document.getElementById('cover-next').addEventListener('click',()=>coverPhoto(coverIndex+1));
coverOpen.addEventListener('click',()=>openPhoto(featured,coverIndex,coverOpen));
function selection(pool) {
  const groups=new Map();
  pool.forEach(photo=>{const key=photo.sport||'';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(photo);});
  const result=[];
  while(result.length<Math.min(pool.length,6))for(const group of groups.values()){if(group.length&&result.length<6)result.push(group.shift());}
  return result;
}
function filter(category) {
  const pool=category?allPhotos.filter(photo=>photo.sport===category):allPhotos;
  const photos=selection(pool);
  grid.replaceChildren(...photos.map((photo,i)=>makeTile(photo,i,photos,2)));
  document.getElementById('port-count').textContent=`${String(photos.length).padStart(2,'0')} / ${String(pool.length).padStart(2,'0')} photographs${category?' — '+category:''}`;
  document.getElementById('port-link').href=category?'/portfolio?cat='+encodeURIComponent(category):'/portfolio';
  syncCategoryFilters(category);
}
function showUnavailable(empty=false) {
  grid.replaceChildren();
  const p=document.createElement('p');p.className='collection-message';p.textContent=empty?'New photographs will appear here soon. ':'The photographs couldn’t load. ';
  const a=document.createElement('a');a.href='https://instagram.com/zacharyroutsongphotos';a.target='_blank';a.rel='noopener';a.textContent='See Zachary’s work on Instagram';p.append(a);grid.append(p);
  coverLoading.textContent=empty?'New photographs coming soon':'Photographs are temporarily unavailable';
  coverOpen.disabled=true;document.querySelector('.cover-stage').setAttribute('aria-busy','false');
}
loadPublicPhotos().then(photos=>{
  allPhotos=photos;
  if(!photos.length){showUnavailable(true);return;}
  const wide=photos.filter(p=>p.width>p.height);
  const first=wide.find(p=>p.location?.includes('Biloxi'))||wide[0]||photos[0];
  const second=wide.find(p=>p.location?.includes('Thorncrown')&&p!==first);
  const third=wide.find(p=>p.location?.includes('Sarasota')&&p!==first);
  featured=[...new Set([first,second,third,...wide].filter(Boolean))].slice(0,4);
  const inline=photos.find(p=>p.location?.includes('Sarasota'))||first;
  const link=document.getElementById('statement-photo-link'),img=document.getElementById('statement-photo');
  if(inline.web_url||inline.thumb_url){link.href='/portfolio?cat='+encodeURIComponent(inline.sport||'');link.hidden=false;img.src=inline.thumb_url||inline.web_url;img.alt=photoAlt(inline);img.width=inline.width||400;img.height=inline.height||267;img.addEventListener('error',()=>link.hidden=true);}
  coverPhoto(0);renderCategoryFilters(photos,filter);filter(null);
}).catch(()=>showUnavailable()).finally(()=>{
  grid.setAttribute('aria-busy','false');
  const target=location.hash&&document.getElementById(location.hash.slice(1));
  if(target)requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant'}));
});
loadStartingPackage().then(pkg=>{if(pkg){const el=document.getElementById('starting-price');el.textContent='From '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(pkg.price);el.title=pkg.name+': '+packageFeatures(pkg.name).join(', ');}}).catch(()=>{});
const cover=document.querySelector('.cover');
cover.addEventListener('keydown',e=>{if(featured.length&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();coverPhoto(coverIndex+(e.key==='ArrowLeft'?-1:1));}});
let touchX=null;
cover.addEventListener('touchstart',e=>touchX=e.changedTouches[0].clientX,{passive:true});
cover.addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(touchX!==null&&Math.abs(delta)>50&&featured.length)coverPhoto(coverIndex+(delta<0?1:-1));touchX=null;},{passive:true});
const header=document.querySelector('.site-header'),cta=document.getElementById('mobile-cta');
let pastCover=false,contactVisible=false,footerVisible=false;
const updateCTA=()=>cta.hidden=!pastCover||contactVisible||footerVisible;
new IntersectionObserver(([entry])=>{pastCover=!entry.isIntersecting;header.classList.toggle('over-photo',entry.isIntersecting);updateCTA();},{threshold:0}).observe(cover);
new IntersectionObserver(([entry])=>{contactVisible=entry.isIntersecting;updateCTA();},{threshold:0}).observe(document.getElementById('contact'));

// Form handling stays independent of the photo service.
const loadedAt=Date.now();
const form=document.getElementById('contact-form');
let submitting=false;
let enquiryId=crypto.randomUUID();
form.addEventListener('submit',async event=>{
  event.preventDefault();if(submitting||!form.reportValidity())return;
  const value=id=>document.getElementById(id).value.trim();
  const name=value('c-name'),contact=value('c-contact'),message=value('c-message');
  const status=document.getElementById('c-status');const button=document.getElementById('c-submit');
  if(!name||!contact||!message){status.textContent='Please fill in your name, contact details, and a message.';status.classList.add('err');return;}
  submitting=true;button.disabled=true;button.firstElementChild.textContent='Sending enquiry…';status.classList.remove('err');status.textContent='';
  try {
    const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submission_id:enquiryId,name,contact,message,date:value('c-date'),website:value('c-website'),elapsed:Date.now()-loadedAt}),signal:AbortSignal.timeout(30000)});
    const data=await response.json();if(!response.ok||!data.ok)throw new Error('Could not send');
    enquiryId=crypto.randomUUID();form.reset();status.textContent='Your enquiry is saved. Zachary will get back to you soon.';button.firstElementChild.textContent='Enquiry sent';
  }catch(_){status.classList.add('err');status.textContent='Your message didn’t go through. Please try again, or text 229–300–1006.';button.disabled=false;button.firstElementChild.textContent='Send enquiry';}
  finally{submitting=false;}
});

new IntersectionObserver(([entry])=>{footerVisible=entry.isIntersecting;updateCTA();},{threshold:0}).observe(document.querySelector('.site-footer'));
