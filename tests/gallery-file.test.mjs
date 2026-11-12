import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/gallery-file.js';
function context(query='g=shared-gallery&photo=photo-1') {
  const reads=[];
  return {request:new Request('https://example.test/api/gallery-file?'+query),env:{PUBLIC_SUPABASE_URL:'https://database.test',PUBLIC_SUPABASE_ANON_KEY:'test-key',PHOTOS:{get:async key=>{reads.push(key);return {body:new Uint8Array([255,216,255]),httpMetadata:{contentType:'image/jpeg'}};}}},reads};
}
const file={storage_path:'original.jpg',url:'https://images.test/original.jpg',file_name:'My photo.jpg'};
test('downloads the original only when the database confirms the gallery link and photo together',async t=>{
  const c=context();const calls=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url:String(url),body:JSON.parse(options.body)});return Response.json(file);});
  const response=await onRequestGet(c);assert.equal(response.status,200);assert.deepEqual(c.reads,['original.jpg']);
  assert.equal(calls.length,1);assert.match(calls[0].url,/\/rest\/v1\/rpc\/get_gallery_file$/);assert.deepEqual(calls[0].body,{p_slug:'shared-gallery',p_photo:'photo-1'});
  assert.match(response.headers.get('Content-Disposition'),/My%20photo\.jpg/);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
});
test('an unknown gallery or a photograph outside it never reads storage',async t=>{const c=context();t.mock.method(globalThis,'fetch',async()=>Response.json(null));assert.equal((await onRequestGet(c)).status,404);assert.deepEqual(c.reads,[]);});
test('before the database update, the table lookup still requires slug and membership',async t=>{
  const c=context();const urls=[];
  t.mock.method(globalThis,'fetch',async url=>{urls.push(new URL(url));if(urls.length===1)return new Response('{}',{status:404});return Response.json(urls.length===2?[{id:'gallery-1'}]:[file]);});
  assert.equal((await onRequestGet(c)).status,200);assert.equal(urls[1].searchParams.get('slug'),'eq.shared-gallery');assert.equal(urls[2].searchParams.get('gallery_id'),'eq.gallery-1');assert.equal(urls[2].searchParams.get('id'),'eq.photo-1');
  const d=context();let n=0;t.mock.method(globalThis,'fetch',async()=>++n===1?new Response('{}',{status:404}):Response.json(n===2?[{id:'gallery-1'}]:[]));assert.equal((await onRequestGet(d)).status,404);assert.deepEqual(d.reads,[]);
});
test('missing parameters and missing configuration fail clearly',async()=>{assert.equal((await onRequestGet(context('g=foo'))).status,400);const c=context();delete c.env.PHOTOS;assert.equal((await onRequestGet(c)).status,503);});
test('storage and upstream failures do not expose configuration',async t=>{const c=context();t.mock.method(globalThis,'fetch',async()=>new Response('internal detail',{status:500}));const response=await onRequestGet(c);assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/internal detail|test-key/);assert.deepEqual(c.reads,[]);});
test('missing R2 file returns 404',async t=>{const c=context();t.mock.method(globalThis,'fetch',async()=>Response.json({storage_path:'gone.jpg'}));c.env.PHOTOS.get=async()=>null;assert.equal((await onRequestGet(c)).status,404);});
