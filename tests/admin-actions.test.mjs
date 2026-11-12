import {test} from 'node:test';
import assert from 'node:assert/strict';
import {studioFixture} from './admin-fixture.mjs';
import {setupCoupons} from '../src/lib/admin/coupons.js';
import {setupPricing} from '../src/lib/admin/pricing.js';
import {confirmChange,promptValue} from '../src/lib/admin/dialog.js';

test('confirmation cancellation and prompt save restore focus and resolve accurately',async()=>{
 const f=studioFixture();try {const trigger=f.doc.activeElement;let result=confirmChange('Delete?');assert.notEqual(f.doc.activeElement,trigger);f.answer(null);assert.equal(await result,false);assert.equal(f.doc.activeElement,trigger);result=promptValue('Location','Old');f.answer('New');assert.equal(await result,'New');}finally{f.restore();}
});
test('all three coupon types preserve expiry and usage fields; cancellation does not delete',async()=>{
 const f=studioFixture();try {const a=setupCoupons(f.ctx).actions;for(const type of ['percent','fixed','travel']){f.field('cp-code','test-'+type);f.field('cp-type',type);f.field('cp-value','20');f.field('cp-expires','2099-12-31');f.field('cp-max-uses','5');await a.createCoupon();}assert.deepEqual(f.tables.coupons.map(r=>[r.type,r.value,r.max_uses,r.expires_at]),[['percent',20,5,'2099-12-31'],['fixed',20,5,'2099-12-31'],['travel',null,5,'2099-12-31']]);const id=f.tables.coupons[0].id;await a.toggleCoupon(id,true);assert.equal(f.tables.coupons[0].active,false);let p=a.deleteCoupon(id);f.answer(null);await p;assert.equal(f.tables.coupons.length,3);p=a.deleteCoupon(id);f.answer();await p;assert.equal(f.tables.coupons.length,2);}finally{f.restore();}
});
test('starter add-ons are idempotent and package edits persist with sale and availability',async()=>{
 const f=studioFixture({package_pricing:[{id:'pkg',package_name:'Basic',base_price:10}],addon_pricing:[]});try {const a=setupPricing(f.ctx).actions;await a.seedAddons();await a.seedAddons();assert.equal(f.tables.addon_pricing.length,8);f.field('pr-base-pkg','40');f.field('pr-sale-pkg','30');f.field('pr-onsale-pkg').checked=true;f.field('pr-avail-pkg').checked=false;await a.savePkg('pkg');assert.deepEqual(f.tables.package_pricing[0],{id:'pkg',package_name:'Basic',base_price:40,sale_price:30,on_sale:true,available:false});}finally{f.restore();}
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
