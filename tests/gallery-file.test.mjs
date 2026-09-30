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

test('upload and original download preserve every byte, independently of preview files', async t => {
  const { onRequestPost } = await import('../functions/api/upload.js');
  const original = Uint8Array.from({ length: 65537 }, (_, i) => (i * 37) % 256);
  const objects = new Map();
  const env = {
    PUBLIC_SUPABASE_URL: 'https://database.test',
    PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    R2_BASE_URL: 'https://images.test',
    PHOTOS: {
      async put(key, stream, options) {
        objects.set(key, { bytes: new Uint8Array(await new Response(stream).arrayBuffer()), ...options });
      },
      async get(key) {
        const object = objects.get(key);
        return object ? { body: object.bytes, httpMetadata: object.httpMetadata } : null;
      }
    }
  };
  let saved;
  t.mock.method(globalThis, 'fetch', async url => {
    const request = new URL(url);
    if (request.pathname === '/auth/v1/user') return Response.json({ id: 'admin' });
    if (request.pathname.endsWith('/client_galleries')) return Response.json([{ id: 'gallery-1' }]);
    return Response.json([{
      storage_path: saved.key, url: saved.url, file_name: 'full-resolution.jpg',
      web_url: 'https://images.test/web.jpg', thumb_url: 'https://images.test/thumb.jpg'
    }]);
  });
  const form = new FormData();
  form.append('file', new File([original], 'full-resolution.jpg', { type: 'image/jpeg' }));
  const upload = await onRequestPost({
    env, request: new Request('https://example.test/api/upload', {
      method: 'POST', headers: { authorization: 'Bearer test-session' }, body: form
    })
  });
  assert.equal(upload.status, 200);
  saved = await upload.json();
  objects.set('web.jpg', { bytes: new Uint8Array([1, 2, 3]) });
  objects.set('thumb.jpg', { bytes: new Uint8Array([4, 5]) });
  const request = new Request('https://example.test/api/gallery-file?g=shared-gallery&photo=photo-1');
  const response = await onRequestGet({ request, env });
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), original);
  assert.match(response.headers.get('content-disposition'), /full-resolution\.jpg/);

  // A missing original must fail instead of silently substituting a smaller file.
  objects.delete(saved.key);
  assert.equal((await onRequestGet({ request, env })).status, 404);
});
