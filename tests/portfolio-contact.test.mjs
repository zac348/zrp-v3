import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../portfolio/functions/api/portfolio-contact.js';
const env={RESEND_API_KEY:'re_test',ZACHARY_EMAIL:'owner@example.test, second@example.test',FROM_EMAIL:'Site <site@example.test>'};
const good={name:'Admissions Reader',email:'reader@example.test',message:'Hello <b>there</b>',website:'',elapsed:5000};
const ctx=(body=good,headers={origin:'https://site.test'},e=env)=>({env:e,request:new Request('https://site.test/api/portfolio-contact',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)})});
function resend(t,status=200){const sent=[];t.mock.method(globalThis,'fetch',async(url,o)=>{assert.equal(url,'https://api.resend.com/emails');sent.push(JSON.parse(o.body));return Response.json({},{status});});return sent;}

test('a valid message is emailed to the owner with the sender as reply-to and escaped content',async t=>{
 const sent=resend(t);const r=await onRequestPost(ctx());assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true});
 assert.equal(sent.length,1);assert.deepEqual(sent[0].to,['owner@example.test','second@example.test']);assert.equal(sent[0].reply_to,'reader@example.test');
 assert.match(sent[0].html,/Hello &lt;b&gt;there&lt;\/b&gt;/);assert.doesNotMatch(sent[0].html,/<b>there/);assert.equal(sent[0].subject,'Portfolio message — Admissions Reader');
});
test('bots, other sites and bad input never send mail',async t=>{
 const sent=resend(t);
 assert.equal((await onRequestPost(ctx({...good,website:'spam'}))).status,200);
 assert.equal((await onRequestPost(ctx({...good,elapsed:200}))).status,200);
 assert.equal((await onRequestPost(ctx(good,{origin:'https://elsewhere.test'}))).status,403);
 assert.equal((await onRequestPost(ctx(good,{origin:'null'}))).status,403);
 assert.equal((await onRequestPost(ctx('not json'))).status,400);
 for(const bad of [{...good,email:'nope'},{...good,name:''},{...good,message:' '},{...good,message:'x'.repeat(3001)},{...good,name:{a:1}}])assert.equal((await onRequestPost(ctx(bad))).status,400);
 assert.equal(sent.length,0);
});
test('missing setup and a failed send are reported, not hidden',async t=>{
 assert.equal((await onRequestPost(ctx(good,{},{}))).status,503);
 resend(t,500);const r=await onRequestPost(ctx());assert.equal(r.status,502);assert.equal((await r.json()).ok,false);
});
test('a subject cannot be split across lines',async t=>{const sent=resend(t);await onRequestPost(ctx({...good,name:'A\r\nBcc: x@example.test'}));assert.doesNotMatch(sent[0].subject,/[\r\n]/);});
