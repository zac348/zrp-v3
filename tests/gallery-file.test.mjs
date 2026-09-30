import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/gallery-file.js';
function context(query='g=shared-gallery&photo=photo-1') {
  const reads=[];
  return {request:new Request('https://example.test/api/gallery-file?'+query),env:{PUBLIC_SUPABASE_URL:'https://database.test',PUBLIC_SUPABASE_ANON_KEY:'test-key',PHOTOS:{get:async key=>{reads.push(key);return {body:new Uint8Array([255,216,255]),httpMetadata:{contentType:'image/jpeg'}};}}},reads};
}
test('downloads the original only after matching gallery slug and photo membership',async t=>{
  const c=context();const queries=[];
  t.mock.method(globalThis,'fetch',async url=>{queries.push(new URL(url));return Response.json(queries.length===1?[{id:'gallery-1'}]:[{storage_path:'original.jpg',url:'https://images.test/original.jpg',file_name:'My photo.jpg'}]);});
  const response=await onRequestGet(c);assert.equal(response.status,200);assert.deepEqual(c.reads,['original.jpg']);assert.equal(queries[0].searchParams.get('slug'),'eq.shared-gallery');assert.equal(queries[1].searchParams.get('gallery_id'),'eq.gallery-1');assert.equal(queries[1].searchParams.get('id'),'eq.photo-1');assert.equal(response.headers.get('content-type'),'image/jpeg');assert.match(response.headers.get('content-disposition'),/My%20photo.jpg/);assert.equal(response.headers.get('cache-control'),'private, no-store');
});
test('unknown gallery never reads storage',async t=>{const c=context();t.mock.method(globalThis,'fetch',async()=>Response.json([]));assert.equal((await onRequestGet(c)).status,404);assert.deepEqual(c.reads,[]);});
test('a photograph outside the gallery never reads storage',async t=>{const c=context();let calls=0;t.mock.method(globalThis,'fetch',async()=>Response.json(++calls===1?[{id:'gallery-1'}]:[]));assert.equal((await onRequestGet(c)).status,404);assert.deepEqual(c.reads,[]);});
test('missing parameters and missing configuration fail clearly',async()=>{assert.equal((await onRequestGet(context('g=foo'))).status,400);const c=context();delete c.env.PHOTOS;assert.equal((await onRequestGet(c)).status,503);});
test('storage and upstream failures do not expose configuration',async t=>{const c=context();t.mock.method(globalThis,'fetch',async()=>new Response('internal detail',{status:500}));const response=await onRequestGet(c);assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/test-key|database.test|internal detail/);});
test('missing R2 file returns 404',async t=>{const c=context();let calls=0;t.mock.method(globalThis,'fetch',async()=>Response.json(++calls===1?[{id:'gallery-1'}]:[{storage_path:'gone.jpg'}]));c.env.PHOTOS.get=async()=>null;assert.equal((await onRequestGet(c)).status,404);});
