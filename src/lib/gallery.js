export function photoAlt(photo) { return [photo.title || photo.sport || 'Photograph', photo.location].filter(Boolean).join(', '); }
let viewer;
let collection = [];
let position = 0;
let trigger;
let oldOverflow = '';
export function bindLightbox() {
  viewer = document.getElementById('photo-viewer');
  viewer.querySelector('.viewer-close').addEventListener('click',closeLightbox);
  document.getElementById('viewer-prev').addEventListener('click',()=>step(-1));
  document.getElementById('viewer-next').addEventListener('click',()=>step(1));
  viewer.addEventListener('click',event=>{if(event.target===viewer)closeLightbox();});
  viewer.addEventListener('cancel',event=>{event.preventDefault();closeLightbox();});
  viewer.addEventListener('close',()=>{document.body.style.overflow=oldOverflow;trigger?.focus({preventScroll:true});});
  viewer.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}
    if(event.key==='ArrowRight'){event.preventDefault();step(1);}
  });
}
function showPhoto() {
  const photo=collection[position];
  const image=document.getElementById('viewer-image');
  const status=document.getElementById('viewer-status'); status.hidden=true; image.hidden=false;
  image.onload=()=>{status.hidden=true;image.hidden=false;};
  image.onerror=()=>{image.hidden=true;status.hidden=false;status.textContent='This photograph couldn’t load. Try another photograph, or close the viewer.';};
  image.alt=photoAlt(photo);image.width=photo.width||2200;image.height=photo.height||1467;image.src=photo.web_url||photo.thumb_url||'';
  document.getElementById('viewer-count').textContent=`${String(position+1).padStart(2,'0')} / ${String(collection.length).padStart(2,'0')}`;
  document.getElementById('viewer-caption').textContent=photoAlt(photo);
  document.getElementById('viewer-prev').disabled=collection.length<2;
  document.getElementById('viewer-next').disabled=collection.length<2;
}
function step(direction){position=(position+direction+collection.length)%collection.length;showPhoto();}
export function openPhoto(photos,index,element) {
  if(!photos.length)return;
  collection=photos;position=index;trigger=element||document.activeElement;showPhoto();
  if(!viewer.open){oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';viewer.showModal();}
  viewer.querySelector('.viewer-close').focus();
}
export function closeLightbox(){document.body.style.overflow=oldOverflow;viewer.close();}
export function makeTile(photo,index,photos,eagerCount=0) {
  const figure=document.createElement('figure');figure.className='photo-entry';
  const button=document.createElement('button');button.type='button';button.className='photo-button';button.setAttribute('aria-label','View '+photoAlt(photo));
  const image=document.createElement('img');image.loading=index<eagerCount?'eager':'lazy';image.decoding='async';image.alt=photoAlt(photo);
  image.width=photo.width||700;image.height=photo.height||467;
  if(photo.thumb_url&&photo.web_url){image.sizes='(max-width:600px) 100vw, (max-width:1000px) 50vw, 65vw';image.srcset=`${photo.thumb_url} 700w, ${photo.web_url} 2200w`;}
  image.src=photo.thumb_url||photo.web_url||'';
  image.addEventListener('error',()=>{image.hidden=true;if(!button.querySelector('.image-error')){const message=document.createElement('span');message.className='image-error';message.textContent='Preview unavailable. Open photograph';button.append(message);}});
  image.addEventListener('load',()=>image.classList.add('loaded'));
  button.append(image);button.addEventListener('click',()=>openPhoto(photos,index,button));
  const caption=document.createElement('figcaption');
  const label=document.createElement('span');label.className='photo-label';label.textContent=photo.location||photo.title||photo.sport||'Untitled';
  const category=document.createElement('span');category.className='photo-category';category.textContent=photo.sport||'Photograph';
  caption.append(label,category);figure.append(button,caption);return figure;
}
