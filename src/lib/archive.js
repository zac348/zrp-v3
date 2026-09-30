import { loadPublicPhotos, renderCategoryFilters, syncCategoryFilters } from './portfolio.js';
import { makeTile, bindLightbox } from './gallery.js';
bindLightbox();
const BATCH=24;
let allPhotos=[],filtered=[],shown=0,categories=[],active=null;
const grid=document.getElementById('portfolio-grid');const more=document.getElementById('load-more');
function append(){
  const next=filtered.slice(shown,shown+BATCH);grid.append(...next.map((photo,i)=>makeTile(photo,shown+i,filtered,2)));shown+=next.length;
  document.getElementById('port-count').textContent=`${String(shown).padStart(2,'0')} / ${String(filtered.length).padStart(2,'0')} photographs${active?' — '+active:''}`;more.hidden=shown>=filtered.length;
}
function filter(category,fromUser=false){
  active=categories.includes(category)?category:null;
  filtered=active?allPhotos.filter(p=>p.sport===active):allPhotos;shown=0;grid.replaceChildren();append();syncCategoryFilters(active);
  if(fromUser){const url=new URL(location.href);active?url.searchParams.set('cat',active):url.searchParams.delete('cat');history.pushState(null,'',url);}
}
more.addEventListener('click',append);
window.addEventListener('popstate',()=>filter(new URLSearchParams(location.search).get('cat')));
loadPublicPhotos().then(photos=>{
  allPhotos=photos;document.getElementById('port-total').textContent=String(photos.length).padStart(2,'0')+' photographs';
  if(!photos.length){grid.innerHTML='<p class="collection-message">New photographs will appear here soon.</p>';return;}
  categories=renderCategoryFilters(photos,category=>filter(category,true));filter(new URLSearchParams(location.search).get('cat'));
}).catch(()=>{
  document.getElementById('port-total').textContent='Collection unavailable';
  grid.innerHTML='<p class="collection-message">The photographs couldn’t load. Please try again, or <a href="https://instagram.com/zacharyroutsongphotos" target="_blank" rel="noopener">see Zachary’s work on Instagram</a>.</p>';
}).finally(()=>grid.setAttribute('aria-busy','false'));
