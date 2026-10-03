import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet as listPortfolio,toPublicPhoto} from '../functions/api/portfolio.js';
import {onRequestGet as portfolioImage} from '../functions/api/portfolio-image.js';
const env={PUBLIC_SUPABASE_URL:'https://db.test',PUBLIC_SUPABASE_ANON_KEY:'anon-test'};
const ctx=url=>({request:new Request(url),env,waitUntil(){}});

test('the public list keeps the site photo shape and versions image links by modified time',async t=>{
 t.mock.method(globalThis,'fetch',async url=>{assert.equal(url,'https://db.test/functions/v1/delivery?action=portfolio');return Response.json({photos:[{id:'soccerImage0001',caption:'Valwood School',category:'Soccer',width:4000,height:6000,modified:'2026-09-21T00:00:00Z'}]});});
 const r=await listPortfolio(ctx('https://site.test/api/portfolio'));const {photos}=await r.json();
 assert.equal(r.headers.get('Cache-Control'),'public, max-age=300');
 assert.deepEqual(photos[0],{id:'soccerImage0001',thumb_url:'/api/portfolio-image?id=soccerImage0001&s=700&v=1789948800000',web_url:'/api/portfolio-image?id=soccerImage0001&s=2200&v=1789948800000',url:'/api/portfolio-image?id=soccerImage0001&s=2200&v=1789948800000',width:4000,height:6000,sport:'Soccer',title:'',location:'Valwood School'});
});
test('an unavailable Drive service is reported, not cached',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({error:'Drive is down'},{status:503}));
 const r=await listPortfolio(ctx('https://site.test/api/portfolio'));assert.equal(r.status,503);assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('uncategorised photos have no category',()=>{assert.equal(toPublicPhoto({id:'looseImage00001',caption:'',category:'',modified:''}).sport,null);});
test('image requests are validated before reaching Drive',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('x',{headers:{'Content-Type':'image/jpeg'}});});
 for(const url of ['https://site.test/api/portfolio-image?id=short&s=700','https://site.test/api/portfolio-image?id=looseImage00001&s=4000','https://site.test/api/portfolio-image?id=looseImage00001&s=700&v=abc','https://site.test/api/portfolio-image?id=../../etc/pass&s=700'])assert.equal((await portfolioImage(ctx(url))).status,404);
 assert.equal(calls,0);
});
test('a versioned image is cached for a year; non-images are refused',async t=>{
 t.mock.method(globalThis,'fetch',async url=>{assert.match(url,/action=portfolio-image&file=looseImage00001&size=2200$/);return new Response('jpeg',{headers:{'Content-Type':'image/jpeg'}});});
 const r=await portfolioImage(ctx('https://site.test/api/portfolio-image?id=looseImage00001&s=2200&v=1789948800000'));
 assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'public, max-age=31536000, immutable');
 t.mock.method(globalThis,'fetch',async()=>Response.json({error:'Photo not found.'},{status:404}));
 assert.equal((await portfolioImage(ctx('https://site.test/api/portfolio-image?id=clientImage0001&s=700'))).status,404);
});
