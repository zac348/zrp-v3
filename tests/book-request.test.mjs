import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/book-request.js';
const env={PUBLIC_SUPABASE_URL:'https://db.test',PUBLIC_SUPABASE_ANON_KEY:'anon-test'};
const b={name:'Test Client',email:'test@example.test',phone:'',date:'2099-10-15',time:'14:30',session_type:'Portraits',notes:'Test request',agreed:true,local:true,package_id:'pkg',addon_ids:['addon'],submission_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',elapsed:5000};
function ctx(body=b){return {env,request:new Request('https://site.test/api/book-request',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://site.test'},body:JSON.stringify(body)})};}
function mock(t,{blocked=false,coupon=null,available=true,saveStatus=200}={}){
 const saved=[];
 t.mock.method(globalThis,'fetch',async(url,opt)=>{
 if(url.includes('package_pricing'))return Response.json(available?[{id:'pkg',package_name:'Standard',base_price:100,on_sale:true,sale_price:75}]:[]);
 if(url.includes('addon_pricing'))return Response.json([{id:'addon',addon_name:'Extra hour',price:25}]);
 if(url.includes('availability'))return Response.json(blocked?[{status:'unavailable',start_time:null}]:[]);
 if(url.includes('coupons'))return Response.json(coupon?[coupon]:[]);
 if(url.endsWith('/delivery')){saved.push(JSON.parse(opt.body));return Response.json({ok:saveStatus===200,created:true},{status:saveStatus});}
 throw new Error('Unexpected request '+url);
 });return saved;
}
test('server-priced package and add-ons create only a private enquiry, ignoring forged totals',async t=>{const saved=mock(t);const r=await onRequestPost(ctx({...b,total:1}));assert.equal(r.status,200);assert.equal((await r.json()).estimate,'$100.00');assert.equal(saved.length,1);assert.equal(saved[0].action,'enquire');assert.match(saved[0].message,/Standard — \$75.00/);assert.match(saved[0].message,/Extra hour — \$25.00/);assert.match(saved[0].message,/Portfolio use: not approved/);assert.match(saved[0].message,/Session area: Valdosta or nearby community — confirmed/);});
test('server validates coupons and applies discounts only to package price',async t=>{const saved=mock(t,{coupon:{code:'TEN',type:'percent',value:10}});const r=await onRequestPost(ctx({...b,coupon:'TEN'}));assert.equal((await r.json()).estimate,'$92.50');assert.match(saved[0].message,/Promo code: TEN/);});
test('unavailable packages, add-ons, and blocked dates never save drafts',async t=>{const saved=mock(t,{blocked:true});assert.equal((await onRequestPost(ctx())).status,409);assert.equal(saved.length,0);});
test('unknown add-on cannot be substituted or priced by the browser',async t=>{const saved=mock(t);assert.equal((await onRequestPost(ctx({...b,addon_ids:['fake']}))).status,409);assert.equal(saved.length,0);});
test('missing agreement or invalid date rejects before network calls',async t=>{let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;});assert.equal((await onRequestPost(ctx({...b,agreed:false}))).status,400);assert.equal((await onRequestPost(ctx({...b,date:'2099-02-30'}))).status,400);assert.equal(calls,0);});
test('storage failure is visible to the client',async t=>{mock(t,{saveStatus:503});assert.equal((await onRequestPost(ctx())).status,503);});

test('local session confirmation is required before any network calls',async t=>{let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;});for(const local of [undefined,false,'true',1]){const r=await onRequestPost(ctx({...b,local}));assert.equal(r.status,400);assert.match((await r.json()).error,/Valdosta or a nearby community/);}assert.equal(calls,0);});
