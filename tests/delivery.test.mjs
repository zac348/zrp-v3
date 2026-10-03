import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,finalize,validateDetails,Drive,caption} from '../supabase/functions/delivery/core.js';
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

// Portfolio from the Google Drive portfolio folder
const ROOT='portfolioRoot0001',SUB='soccerFolder0001',CLIENT='clientFolder0001';
function portfolioDrive(){
 const files={
  [ROOT]:[{id:'looseImage00001',name:'Thorncrown Chapel.jpg',mimeType:'image/jpeg',createdTime:'2026-09-01T00:00:00Z',modifiedTime:'2026-09-01T00:00:00Z',imageMediaMetadata:{width:3000,height:2000}},
          {id:SUB,name:' Soccer ',mimeType:'application/vnd.google-apps.folder'},
          {id:'notesDocument01',name:'notes',mimeType:'application/vnd.google-apps.document'}],
  [SUB]:[{id:'soccerImage0001',name:'IMG_4031.JPG',mimeType:'image/jpeg',createdTime:'2026-09-20T00:00:00Z',modifiedTime:'2026-09-21T00:00:00Z',imageMediaMetadata:{width:6000,height:4000,rotation:1}},
         {id:'soccerVideo0001',name:'clip.mov',mimeType:'video/quicktime',createdTime:'2026-09-22T00:00:00Z'}],
 };
 const meta={
  looseImage00001:{id:'looseImage00001',mimeType:'image/jpeg',parents:[ROOT],thumbnailLink:'https://lh3.googleusercontent.com/drive-storage/abc=s220'},
  soccerImage0001:{id:'soccerImage0001',mimeType:'image/jpeg',parents:[SUB],thumbnailLink:'https://lh3.googleusercontent.com/drive-storage/def=s220'},
  clientImage0001:{id:'clientImage0001',mimeType:'image/jpeg',parents:[CLIENT],thumbnailLink:'https://lh3.googleusercontent.com/drive-storage/ghi=s220'},
  [SUB]:{id:SUB,mimeType:'application/vnd.google-apps.folder',parents:[ROOT]},
  [CLIENT]:{id:CLIENT,mimeType:'application/vnd.google-apps.folder',parents:['sharedDriveRoot1']},
  [ROOT]:{id:ROOT,name:'port',mimeType:'application/vnd.google-apps.folder'},
 };
 const fetched=[];
 const fetcher=async(url)=>{
  fetched.push(url);
  if(url.startsWith('https://lh3.googleusercontent.com/'))return new Response('jpeg-bytes',{headers:{'Content-Type':'image/jpeg'}});
  const u=new URL(url);
  if(u.pathname.endsWith('/files')){const parent=u.searchParams.get('q').match(/'([^']+)' in parents/)[1];return Response.json({files:files[parent]||[]});}
  const id=u.pathname.split('/').pop();return meta[id]?Response.json(meta[id]):new Response('{}',{status:404});
 };
 const drive=new Drive('{}','sharedDriveRoot1',fetcher);drive.token=async()=>'test-token';
 return {drive,fetched};
}
test('portfolio lists loose photos and subfolder photos with categories, captions and orientation',async()=>{
 const {drive}=portfolioDrive();const photos=await drive.portfolio(ROOT);
 assert.equal(photos.length,2);
 assert.deepEqual(photos[0],{id:'soccerImage0001',caption:'',category:'Soccer',width:4000,height:6000,created:'2026-09-20T00:00:00Z',modified:'2026-09-21T00:00:00Z'});
 assert.equal(photos[1].caption,'Thorncrown Chapel');assert.equal(photos[1].category,'');assert.equal(photos[1].width,3000);
});
test('portfolio images come only from the portfolio folder or its subfolders, resized by Google',async()=>{
 const {drive,fetched}=portfolioDrive();
 const loose=await drive.portfolioImage(ROOT,'looseImage00001',2200);assert.equal(loose.headers.get('Content-Type'),'image/jpeg');
 assert.ok(fetched.includes('https://lh3.googleusercontent.com/drive-storage/abc=s2200'));
 assert.equal((await drive.portfolioImage(ROOT,'soccerImage0001',700)).status,200);
 await assert.rejects(drive.portfolioImage(ROOT,'clientImage0001',2200),e=>e.status===404);
 await assert.rejects(drive.portfolioImage(ROOT,'looseImage00001',5000),e=>e.status===400);
 await assert.rejects(drive.portfolioImage(ROOT,'../etc',700),e=>e.status===404);
});
test('portfolio and portfolio images are public reads; nothing else opens without sign-in',async()=>{
 const drive={portfolio:async root=>[{id:'x',root}],portfolioImage:async(root,file,size)=>new Response(`${root}:${file}:${size}`,{headers:{'Content-Type':'image/jpeg'}})};
 const handler=createHandler({store:{isAdmin:async()=>false},drive,portfolioFolder:ROOT});
 const list=await handler(new Request('https://test.test/?action=portfolio'));assert.equal(list.status,200);assert.equal((await list.json()).photos[0].root,ROOT);
 const image=await handler(new Request('https://test.test/?action=portfolio-image&file=looseImage00001&size=700'));assert.equal(await image.text(),`${ROOT}:looseImage00001:700`);
 assert.equal((await handler(new Request('https://test.test/?action=list'))).status,405);
});
test('Drive check reports whether the portfolio folder is readable',async()=>{
 const {drive}=portfolioDrive();drive.json=async path=>path.startsWith('files/sharedDriveRoot1')?{name:'Clients',mimeType:'application/vnd.google-apps.folder',driveId:'d',capabilities:{canAddChildren:true}}:Promise.reject(new Error('404'));
 drive.key=JSON.stringify({client_email:'drive-bot@project.iam.gserviceaccount.com'});
 const r=await drive.health(ROOT);assert.equal(r.portfolio.ok,false);assert.match(r.portfolio.message,/Share it with drive-bot@project\.iam\.gserviceaccount\.com/);
});
test('captions come from file names; camera names and dates get none',()=>{
 for(const [name,expected] of [['Thorncrown Chapel.jpg','Thorncrown Chapel'],['Biloxi,_Mississippi.JPG','Biloxi, Mississippi'],['IMG_4031.JPG',''],['_DSC1234.NEF',''],['DSCF0001.jpg',''],['PXL_20260101_123456.jpg',''],['20260920_181500.jpg',''],['Pine Lake 2.jpg','Pine Lake 2'],['Sarasota, Florida (2).jpg','Sarasota, Florida'],['Senior Night 2026.jpg','Senior Night 2026']])assert.equal(caption(name),expected,name);
});

