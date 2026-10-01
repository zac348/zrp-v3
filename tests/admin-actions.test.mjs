import {test} from 'node:test';
import assert from 'node:assert/strict';
import {studioFixture} from './admin-fixture.mjs';
import {setupGalleries} from '../src/lib/admin/galleries.js';
import {setupPhotos} from '../src/lib/admin/photos.js';
import {setupCoupons} from '../src/lib/admin/coupons.js';
import {setupPricing} from '../src/lib/admin/pricing.js';
import {confirmChange,promptValue} from '../src/lib/admin/dialog.js';

test('confirmation cancellation and prompt save restore focus and resolve accurately',async()=>{
 const f=studioFixture();try {const trigger=f.doc.activeElement;let result=confirmChange('Delete?');assert.notEqual(f.doc.activeElement,trigger);f.answer(null);assert.equal(await result,false);assert.equal(f.doc.activeElement,trigger);result=promptValue('Location','Old');f.answer('New');assert.equal(await result,'New');}finally{f.restore();}
});
test('gallery deletion requires confirmation, unlinks photos, and never calls file deletion',async()=>{
 const f=studioFixture({client_galleries:[{id:'g',name:'Client',slug:'client'}],portfolio_photos:[{id:'p',gallery_id:'g'}]});try{
 const a=setupGalleries(f.ctx).actions;let pending=a.deleteGallery('g','Client');f.answer(null);await pending;assert.equal(f.requests.length,0);
 pending=a.deleteGallery('g','Client');f.answer();await pending;assert.equal(f.tables.portfolio_photos.length,1);assert.equal(f.tables.portfolio_photos[0].gallery_id,null);assert.equal(f.tables.client_galleries.length,0);
 assert.deepEqual(f.requests.filter(r=>r.method!=='GET').map(r=>[r.table,r.method]),[['portfolio_photos','PATCH'],['client_galleries','DELETE']]);
 }finally{f.restore();}
});
test('gallery unlink failure keeps the gallery and reports the failed save',async()=>{
 const f=studioFixture({client_galleries:[{id:'g'}],portfolio_photos:[{id:'p',gallery_id:'g'}]});try {f.failWith((table,method)=>method==='PATCH');const p=setupGalleries(f.ctx).actions.deleteGallery('g','Client');f.answer();await assert.rejects(p,/Database refused/);assert.equal(f.tables.client_galleries.length,1);}finally{f.restore();}
});
test('photo deletion removes all three file keys before deleting only selected database rows',async()=>{
 const f=studioFixture({portfolio_photos:[{id:'p',storage_path:'original.jpg',web_url:'https://photo.test/web.jpg',thumb_url:'https://photo.test/thumb.jpg'},{id:'keep',storage_path:'keep.jpg'}]});try{
 const api=[];globalThis.fetch=async(url,options)=>{api.push({url,...options});return Response.json({ok:true});};
 const a=setupPhotos(f.ctx).actions;const p=a.delPhoto('p','original.jpg');f.answer();await p;
 assert.deepEqual(JSON.parse(api[0].body),{keys:['original.jpg','web.jpg','thumb.jpg']});assert.equal(api[0].headers.Authorization,'Bearer test');assert.deepEqual(f.tables.portfolio_photos.map(p=>p.id),['keep']);
 }finally{f.restore();}
});
test('failed file deletion retains the database record for a safe retry',async()=>{
 const f=studioFixture({portfolio_photos:[{id:'p',storage_path:'original.jpg'}]});try {globalThis.fetch=async()=>Response.json({error:'failed'},{status:503});const p=setupPhotos(f.ctx).actions.delPhoto('p','original.jpg');f.answer();await assert.rejects(p,/could not be removed/);assert.equal(f.tables.portfolio_photos.length,1);}finally{f.restore();}
});
test('gallery creation and watermark toggle send the required records',async()=>{
 const f=studioFixture();try {const a=setupGalleries(f.ctx).actions;f.field('new-gal-name','Family session');await a.createGallery();const row=f.tables.client_galleries[0];assert.equal(row.name,'Family session');assert.match(row.slug,/^family-session-/);await a.toggleWatermark(row.id,false);assert.equal(f.tables.client_galleries[0].watermarked,true);}finally{f.restore();}
});
test('all three coupon types preserve expiry and usage fields; cancellation does not delete',async()=>{
 const f=studioFixture();try {const a=setupCoupons(f.ctx).actions;for(const type of ['percent','fixed','travel']){f.field('cp-code','test-'+type);f.field('cp-type',type);f.field('cp-value','20');f.field('cp-expires','2099-12-31');f.field('cp-max-uses','5');await a.createCoupon();}assert.deepEqual(f.tables.coupons.map(r=>[r.type,r.value,r.max_uses,r.expires_at]),[['percent',20,5,'2099-12-31'],['fixed',20,5,'2099-12-31'],['travel',null,5,'2099-12-31']]);const id=f.tables.coupons[0].id;await a.toggleCoupon(id,true);assert.equal(f.tables.coupons[0].active,false);let p=a.deleteCoupon(id);f.answer(null);await p;assert.equal(f.tables.coupons.length,3);p=a.deleteCoupon(id);f.answer();await p;assert.equal(f.tables.coupons.length,2);}finally{f.restore();}
});
test('starter add-ons are idempotent and package edits persist with sale and availability',async()=>{
 const f=studioFixture({package_pricing:[{id:'pkg',package_name:'Basic',base_price:10}],addon_pricing:[]});try {const a=setupPricing(f.ctx).actions;await a.seedAddons();await a.seedAddons();assert.equal(f.tables.addon_pricing.length,8);f.field('pr-base-pkg','40');f.field('pr-sale-pkg','30');f.field('pr-onsale-pkg').checked=true;f.field('pr-avail-pkg').checked=false;await a.savePkg('pkg');assert.deepEqual(f.tables.package_pricing[0],{id:'pkg',package_name:'Basic',base_price:40,sale_price:30,on_sale:true,available:false});}finally{f.restore();}
});

test('uploads preserve original bytes, save metadata, and create the required JPEG sizes/quality',async()=>{
 const f=studioFixture();try {
 const received=[];globalThis.fetch=async(url,options)=>{const file=options.body.get('file');received.push({name:file.name,bytes:new Uint8Array(await file.arrayBuffer())});return Response.json({key:file.name,url:'https://photo.test/'+file.name});};
 globalThis.createImageBitmap=async()=>({width:6000,height:4000,close(){}});
 setupPhotos(f.ctx);f.field('up-sport','Sports');f.field('up-title','Team');f.field('up-location','Field');f.field('up-gallery','g');f.field('up-portfolio').checked=true;
 const original=new File([new Uint8Array([0,255,3,99])],'photo.jpg',{type:'image/jpeg'});
 await f.field('file-input').fire('change',{target:{files:[original]}});
 assert.deepEqual([...received[0].bytes],[0,255,3,99]);assert.equal(received.length,3);
 assert.deepEqual(f.blobs,[{width:2200,height:1467,type:'image/jpeg',quality:0.82},{width:700,height:467,type:'image/jpeg',quality:0.78}]);
 const row=f.tables.portfolio_photos[0];assert.equal(row.title,'Team');assert.equal(row.gallery_id,'g');assert.equal(row.on_portfolio,true);assert.equal(row.width,6000);assert.equal(row.height,4000);assert.equal(row.web_url,'https://photo.test/web-photo.jpg');
 }finally{f.restore();}
});
test('a resize failure still saves the original and tells the owner previews need optimization',async()=>{
 const f=studioFixture();try {globalThis.fetch=async()=>Response.json({key:'original.jpg',url:'https://photo.test/original.jpg'});globalThis.createImageBitmap=async()=>{throw new Error('Unsupported image');};setupPhotos(f.ctx);await f.field('file-input').fire('change',{target:{files:[new File(['original'],'original.jpg')]}});assert.equal(f.tables.portfolio_photos.length,1);assert.equal(f.tables.portfolio_photos[0].web_url,null);assert.match(f.field('up-status').textContent,/original saved; previews need optimization/);assert.equal(f.field('file-input').disabled,false);}finally{f.restore();}
});
test('database failure during a batch is reported and does not discard later successful uploads',async()=>{
 const f=studioFixture();try {globalThis.fetch=async(_url,opt)=>{const name=opt.body.get('file').name;return Response.json({key:name,url:'https://photo.test/'+name});};globalThis.createImageBitmap=async()=>({width:6000,height:4000,close(){}});f.failWith((table,method,body)=>method==='POST'&&body.file_name==='bad.jpg');setupPhotos(f.ctx);await f.field('file-input').fire('change',{target:{files:[new File(['a'],'bad.jpg'),new File(['b'],'good.jpg')]}});assert.equal(f.tables.portfolio_photos.length,1);assert.equal(f.tables.portfolio_photos[0].file_name,'good.jpg');assert.match(f.field('up-status').textContent,/1 photo\(s\) uploaded, 1 failed/);assert.equal(f.field('file-input').disabled,false);assert.equal(f.field('prog-wrap').hidden,true);}finally{f.restore();}
});

test('availability saves partial time ranges and notes, then explicit available and clear replace that day only',async()=>{
 const {setupAvailability}=await import('../src/lib/admin/availability.js');
 const f=studioFixture({availability:[{id:'other',date:'2099-12-31',status:'unavailable'}]});try {
 const calendar=setupAvailability(f.ctx);await calendar.load();calendar.render();
 const today=new Date().toISOString().slice(0,10);
 const choose=async()=>{const button=f.field('cal-grid').children.find(e=>e.attrs['aria-label']?.startsWith(today));assert.ok(button);await button.fire('click');};
 await choose();calendar.actions.setBlockType('partial');f.field('block-start','09:00');f.field('block-end','12:00');f.field('block-note','Morning session');let p=calendar.actions.saveBlock();f.answer();await p;
 assert.deepEqual(f.tables.availability.find(r=>r.date===today),{id:'new-1-0',date:today,status:'partial',start_time:'09:00',end_time:'12:00',note:'Morning session'});
 await choose();calendar.actions.setBlockType('available');p=calendar.actions.saveBlock();f.answer();await p;assert.equal(f.tables.availability.find(r=>r.date===today).status,'available');
 await choose();calendar.actions.setBlockType('clear');p=calendar.actions.saveBlock();f.answer();await p;assert.deepEqual(f.tables.availability,[{id:'other',date:'2099-12-31',status:'unavailable'}]);
 }finally{f.restore();}
});

test('delivery UI actions use the right request, confirmation, status grouping, and private-link fragments',async()=>{
 const {setupDeliveryAdmin}=await import('../src/lib/delivery-admin.js');
 const f=studioFixture(),previousWindow=globalThis.window,clipboard=Object.getOwnPropertyDescriptor(navigator,'clipboard');
 const events={},calls=[],copied=[];
 globalThis.window={addEventListener:(name,fn)=>events[name]=fn};
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>copied.push(text)}});
 const rows=[['new','pending'],['details','accepted'],['ready','ready'],['published','published'],['retry','folder_error']].map(([id,status])=>({id,status,name:id,contact:'test@example.test',created_at:'2026-10-01',preferred_date:'2099-10-12',details_token:'a'.repeat(64),gallery_token:'b'.repeat(64),drive_folder_id:'folder',token_expires_at:'2100-01-01'}));
 globalThis.fetch=async(url,options)=>{
   const body=JSON.parse(options.body);calls.push(body);assert.equal(url,'/api/delivery');assert.equal(options.headers.Authorization,'Bearer test');
   if(body.action==='list')return Response.json({requests:rows});
   if(body.action==='health')return Response.json({name:'Client deliveries'});
   const row=rows.find(r=>r.id===body.id);
   const statuses={accept:'accepted',decline:'declined',retry:'ready',publish:'published',unpublish:'ready'};
   if(statuses[body.action])row.status=statuses[body.action];
   return Response.json({ok:true,status:row.status,calendar:{status:body.action==='decline'?'unblocked':'blocked',date:'2099-10-12'}});
 };
 const find=(root,text)=>root.children.flatMap(n=>[n,...descendants(n)]).find(n=>n.tagName==='BUTTON'&&n.textContent===text);
 const descendants=root=>root.children?.flatMap(n=>[n,...descendants(n)])||[];
 const action=(id,label)=>{const article=['new','active','history'].flatMap(k=>f.field('booking-list-'+k).children).find(n=>n.id==='delivery-'+id);assert.ok(article,'Request row '+id);return find(article,label).fire('click');};
 try {
  const load=setupDeliveryAdmin(f.ctx.sb);await load();assert.equal(f.field('booking-count-new').textContent,'1');
  await action('new','Accept');assert.equal(rows[0].status,'accepted');assert.match(f.field('delivery-admin-status').textContent,/now blocked/);
  let p=action('details','Replace form link');f.answer(null);await p;assert.equal(calls.filter(c=>c.action==='renew').length,0);
  p=action('details','Replace form link');f.answer();await p;assert.deepEqual(calls.find(c=>c.action==='renew'),{action:'renew',id:'details'});
  await action('details','Copy client form link');assert.equal(copied[0],'https://studio.test/client-details#'+'a'.repeat(64));
  p=action('new','Decline');f.answer();await p;assert.equal(rows[0].status,'declined');assert.match(f.field('delivery-admin-status').textContent,/open again/);
  await action('ready','Publish gallery');assert.equal(rows[2].status,'published');await action('ready','Copy gallery link');assert.equal(copied[1],'https://studio.test/client-gallery#'+'b'.repeat(64));
  p=action('ready','Unpublish');f.answer();await p;assert.equal(rows[2].status,'ready');
  await action('retry','Retry folder');assert.equal(rows[4].status,'ready');await f.field('delivery-check').fire('click');assert.match(f.field('delivery-admin-status').textContent,/Connected/);
  const before=calls.length;await events.focus();await f.field('delivery-refresh').fire('click');assert.equal(calls.length,before+2);
  assert.equal(f.field('booking-count-new').textContent,'0');assert.equal(f.field('booking-count-active').textContent,'3');assert.equal(f.field('booking-count-history').textContent,'2');
 }finally {f.restore();globalThis.window=previousWindow;if(clipboard)Object.defineProperty(navigator,'clipboard',clipboard);else delete navigator.clipboard;}
});
