import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,finalize,validateDetails,Drive} from '../supabase/functions/delivery/core.js';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const token='a'.repeat(64),gallery='b'.repeat(64);
const details={name:'Client Test',email:'client@example.test',phone:'',session_type:'Portraits',date:'2026-10-15',time:'17:30',location:'Test studio',notes:''};
function fixture(overrides={}){
 let row={id,status:'accepted',name:'Client',contact:'client@example.test',preferred_date:'October',details_token:token,gallery_token:gallery,token_expires_at:new Date(Date.now()+86400000).toISOString(),...overrides};
 const calls=[];
 const store={
   isAdmin:async auth=>auth==='Bearer admin-test',list:async()=>[row],
   get:async(field,value)=>row[field]===value?structuredClone(row):undefined,
   enquire:async()=>{calls.push('enquire');return {created:true};},
   patch:async(_,changes,filter='')=>{
     const params=new URLSearchParams(filter.slice(1));
     for(const [key,value]of params){if(value==='is.null'&&row[key]!=null)return [];if(value.startsWith('eq.')&&String(row[key])!==value.slice(3))return [];}
     row={...row,...changes};return [structuredClone(row)];
   },
 };
 const drive={generateId:async()=>{calls.push('generate');return 'drive-folder-123';},ensureFolder:async(file)=>{calls.push(['create',file]);return file;},files:async()=>[{id:'photo-123456',name:'original.jpg',mimeType:'image/jpeg'}],file:async()=>new Response('original'),health:async()=>({can_create:true})};
 return {store,drive,calls,get row(){return row;},handler:createHandler({store,drive})};
}
async function call(f,action,data={},admin=false){
 const r=await f.handler(new Request('https://test.test',{method:'POST',headers:admin?{Authorization:'Bearer admin-test'}:{},body:JSON.stringify({action,...data})}));
 return {status:r.status,body:await r.json()};
}
test('pending enquiry cannot open the details form or create a folder',async()=>{
 const f=fixture({status:'pending'});
 assert.equal((await call(f,'form',{token})).status,404);
 assert.equal((await call(f,'complete',{token,details})).status,404);
 assert.equal(f.calls.length,0);
});
test('only an allowlisted admin can list, accept, publish or complete on behalf of a client',async()=>{
 for(const action of ['list','accept','publish','health','retry','decline','renew','unpublish'])assert.equal((await call(fixture(),action,{id})).status,403);
 assert.equal((await call(fixture(),'complete',{id,details})).status,403);
});
test('accepting does not contact Google and creates a 30-day form window',async()=>{
 const f=fixture({status:'pending'});assert.equal((await call(f,'accept',{id},true)).status,200);
 assert.equal(f.row.status,'accepted');assert.equal(f.calls.length,0);assert.ok(Date.parse(f.row.token_expires_at)>Date.now()+29*86400000);
});
test('required details are validated before saving or creating a Drive folder',async()=>{
 const f=fixture();assert.equal((await call(f,'complete',{token,details:{...details,location:''}})).status,400);assert.equal(f.calls.length,0);assert.equal(f.row.status,'accepted');
 assert.throws(()=>validateDetails({...details,date:'2026-02-30'}));assert.throws(()=>validateDetails({...details,email:'not an email'}));
});
test('completed form creates one folder, keeps gallery unpublished, and retries do not create again',async()=>{
 const f=fixture();assert.equal((await call(f,'complete',{token,details})).body.status,'ready');
 assert.equal((await call(f,'complete',{token,details})).body.status,'ready');
 assert.equal(f.calls.filter(c=>Array.isArray(c)).length,1);assert.equal(f.row.status,'ready');
 assert.equal((await call(f,'gallery',{token:gallery})).status,404);
 const receipt=(await call(f,'form',{token})).body;assert.deepEqual(receipt,{status:'ready'});
});
test('concurrent completion claims one worker and creates exactly one folder',async()=>{
 const f=fixture();const results=await Promise.all([call(f,'complete',{token,details}),call(f,'complete',{token,details})]);
 assert.ok(results.every(r=>r.status===200));assert.equal(f.calls.filter(c=>Array.isArray(c)).length,1);
});
test('Google failure preserves details and reserved folder ID; admin retry reuses it',async()=>{
 const f=fixture();const ensure=f.drive.ensureFolder;f.drive.ensureFolder=async()=>{throw new Error('network');};
 assert.equal((await call(f,'complete',{token,details})).body.status,'folder_error');
 assert.equal(f.row.details.name,details.name);assert.equal(f.row.drive_folder_id,'drive-folder-123');
 f.drive.ensureFolder=ensure;assert.equal((await call(f,'retry',{id},true)).body.status,'ready');assert.equal(f.calls.filter(c=>c==='generate').length,1);
});
test('expired form is blocked, owner can complete it, and renewed tokens invalidate old links',async()=>{
 const f=fixture({token_expires_at:'2020-01-01'});assert.equal((await call(f,'complete',{token,details})).status,410);
 await call(f,'renew',{id},true);assert.equal((await call(f,'form',{token})).status,404);
 assert.equal((await call(f,'complete',{id,details},true)).body.status,'ready');
});
test('publication requires photos; private gallery token never opens the details form',async()=>{
 const f=fixture({status:'ready',details,drive_folder_id:'folder'});f.drive.files=async()=>[];
 assert.equal((await call(f,'publish',{id},true)).status,409);
 f.drive.files=async()=>[{id:'file'}];assert.equal((await call(f,'publish',{id},true)).status,200);
 assert.equal((await call(f,'gallery',{token:gallery})).status,200);
 assert.equal((await call(f,'form',{token:gallery})).status,404);
 await call(f,'unpublish',{id},true);assert.equal((await call(f,'gallery',{token:gallery})).status,404);
});
test('GET cannot change booking state',async()=>{
 const f=fixture();const r=await f.handler(new Request(`https://test.test?action=accept&id=${id}`,{headers:{Authorization:'Bearer admin-test'}}));assert.equal(r.status,405);
});
test('Drive original download preserves exact bytes and checks folder membership before media access',async()=>{
 const bytes=new Uint8Array([0xff,0xd8,0,1,2,255,55,0xff,0xd9]);let calls=0;
 const d=new Drive('{}','parent');d.token=async()=> 'test';
 d.request=async path=>{calls++;return path.includes('alt=media')?new Response(bytes,{headers:{'Content-Type':'image/jpeg'}}):Response.json({id:'photo-123456',name:'Original.jpg',mimeType:'image/jpeg',parents:['album']});};
 const r=await d.file('album','photo-123456');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes);assert.match(r.headers.get('content-disposition'),/Original.jpg/);
 calls=0;await assert.rejects(()=>d.file('other-album','photo-123456'));assert.equal(calls,1);
});
test('Drive retry accepts existing folder only after verifying album identity and parent',async()=>{
 const d=new Drive('{}','parent');d.request=async()=>new Response('',{status:409});
 d.json=async()=>({id:'reserved',mimeType:'application/vnd.google-apps.folder',parents:['parent'],appProperties:{zr_delivery_id:id}});
 assert.equal(await d.ensureFolder('reserved','Album',id),'reserved');
 d.json=async()=>({id:'reserved',mimeType:'application/vnd.google-apps.folder',parents:['other'],appProperties:{zr_delivery_id:id}});
 await assert.rejects(()=>d.ensureFolder('reserved','Album',id));
});
