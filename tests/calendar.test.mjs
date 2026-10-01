import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Calendar,createHandler} from '../supabase/functions/delivery/core.js';
import {calendarMessage} from '../src/lib/calendar-message.js';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',token='a'.repeat(64);
const details={name:'Private Client',email:'private@example.test',phone:'2295550100',session_type:'Family',date:'2099-10-15',time:'17:30',location:'Private address',notes:''};
class MockCalendar extends Calendar {
  constructor(rows=[]){super({SUPABASE_URL:'https://mock.test',SUPABASE_SERVICE_ROLE_KEY:'test'});this.rows=structuredClone(rows);this.inserts=0;this.fail=false;this.fetch=async(_url,options)=>{
    if(this.fail)throw new Error('unavailable');const row=JSON.parse(options.body);
    if(!this.rows.some(r=>r.id===row.id)){this.rows.push(row);this.inserts++;}
    return Response.json([]);
  };}
  today(){return '2099-10-01';}
  async db(path,method='GET'){
    if(this.fail)throw new Error('unavailable');
    const q=new URLSearchParams(path.split('?')[1]);
    const match=row=>[...q].every(([k,v])=>v==='is.null'?row[k]==null:v.startsWith('eq.')?String(row[k])===v.slice(3):true);
    const found=this.rows.filter(match);if(method==='DELETE')this.rows=this.rows.filter(r=>!match(r));return structuredClone(found);
  }
}
function fixture(overrides={},calendar=new MockCalendar()){
 let row={id,status:'pending',name:'Private Client',contact:'private@example.test',preferred_date:'2099-10-12',details_token:token,token_expires_at:'2100-01-01',...overrides};
 const store={isAdmin:async h=>h==='Bearer admin',get:async()=>structuredClone(row),patch:async(_,changes,filter='')=>{
   for(const [k,v]of new URLSearchParams(filter.replace(/^&/,''))){if(v==='is.null'&&row[k]!=null)return [];if(v.startsWith('eq.')&&String(row[k])!==v.slice(3))return [];}
   row={...row,...changes};return [structuredClone(row)];
 }};
 const drive={generateId:async()=> 'drive-123',ensureFolder:async()=>{},files:async()=>[]};
 const handler=createHandler({store,drive,calendar});
 async function call(action,data={id},admin=true){const r=await handler(new Request('https://mock.test',{method:'POST',headers:admin?{Authorization:'Bearer admin'}:{},body:JSON.stringify({action,...data})}));return {status:r.status,body:await r.json()};}
 return {call,store,drive,calendar,get row(){return row;}};
}
test('exact-date accept creates one anonymous full-day block and double accept cannot duplicate it',async()=>{
 const f=fixture();const results=await Promise.all([f.call('accept'),f.call('accept')]);assert.ok(results.some(r=>r.body.calendar?.status==='blocked'));
 assert.equal(f.calendar.rows.length,1);assert.equal(f.calendar.inserts,1);assert.deepEqual(f.calendar.rows[0],{id,date:'2099-10-12',status:'unavailable',start_time:null,note:'Booked (ref aaaaaaaa)'});
 assert.equal((await f.call('accept')).status,409);
});
test('free text and impossible dates do not block a calendar day',async()=>{
 for(const date of ['October','2099-02-30','2099-1-2']){const f=fixture({preferred_date:date});assert.equal((await f.call('accept')).body.calendar.status,'no_date');assert.equal(f.calendar.rows.length,0);}
});
test('past dates are skipped',async()=>{const f=fixture({preferred_date:'2020-01-01'});assert.equal((await f.call('accept')).body.calendar.status,'skipped_past');assert.equal(f.calendar.rows.length,0);});
test('existing owner full-day block is reported and never duplicated',async()=>{
 const block={id:'owner',date:'2099-10-12',status:'unavailable',start_time:null,note:'Owner block'};const f=fixture({},new MockCalendar([block]));assert.equal((await f.call('accept')).body.calendar.status,'already_blocked');assert.deepEqual(f.calendar.rows,[block]);
});
test('explicit Available and Partial entries win over automatic blocking',async()=>{
 for(const status of ['available','partial']){const block={id:'owner',date:details.date,status,note:'Owner edit'};const f=fixture({status:'accepted'},new MockCalendar([block]));assert.equal((await f.call('complete',{id,details})).body.calendar.status,'already_blocked');assert.deepEqual(f.calendar.rows,[block]);}
});
test('completion moves only its own block and retried completion cannot duplicate it',async()=>{
 const other={id:'other',date:'2099-10-12',status:'partial',note:'Owner edit'};const f=fixture();await f.call('accept');f.calendar.rows.push(other);
 const r=await f.call('complete',{id,details});assert.equal(r.body.calendar.date,details.date);assert.equal(r.body.status,'ready');assert.equal(f.calendar.rows.length,2);assert.ok(f.calendar.rows.some(r=>r.id===id&&r.date===details.date));assert.deepEqual(f.calendar.rows.find(r=>r.id==='other'),other);
 await f.call('complete',{id,details});assert.equal(f.calendar.rows.length,2);
});
test('calendar block is saved before Drive work, including Drive failures and retry',async()=>{
 const f=fixture({status:'accepted'});f.drive.generateId=async()=>{assert.equal(f.calendar.rows[0].date,details.date);throw new Error('Drive down');};
 const r=await f.call('complete',{id,details});assert.equal(r.body.status,'folder_error');assert.equal(r.body.calendar.status,'blocked');await f.call('retry');assert.equal(f.calendar.inserts,1);
});
test('decline frees only this enquiry’s date and exact note',async()=>{
 const f=fixture();await f.call('accept');const other={id:'owner',date:'2099-10-12',status:'unavailable',note:'Someone else'};f.calendar.rows.push(other);
 assert.equal((await f.call('decline')).body.calendar.status,'unblocked');assert.deepEqual(f.calendar.rows,[other]);
});
test('owner edits that retain the id but change note, status, or time cannot be deleted',async()=>{
 for(const changes of [{note:'Owner changed it'},{status:'partial'},{start_time:'09:00'}]){const f=fixture();await f.call('accept');Object.assign(f.calendar.rows[0],changes);const before=structuredClone(f.calendar.rows);await f.call('decline');assert.deepEqual(f.calendar.rows,before);}
});
test('calendar failure cannot fail accept, decline, or completion',async()=>{
 const previous=console.error;console.error=()=>{};
 try{for(const [action,status,data] of [['accept','pending',{id}],['decline','accepted',{id}],['complete','accepted',{id,details}]]){const f=fixture({status});f.calendar.fail=true;const r=await f.call(action,data);assert.equal(r.status,200);assert.equal(r.body.calendar.status,'failed');if(action==='complete')assert.equal(r.body.status,'ready');}}finally{console.error=previous;}
});
test('client completion response has no calendar field or private details',async()=>{
 const f=fixture({status:'accepted'});assert.deepEqual((await f.call('complete',{token,details},false)).body,{ok:true,status:'ready'});assert.equal(f.calendar.rows[0].date,details.date);
});
test('public calendar note never includes a client name, contact detail, or address',async()=>{
 const f=fixture({status:'accepted'});await f.call('complete',{id,details});const text=JSON.stringify(f.calendar.rows);for(const value of [details.name,details.email,details.phone,details.location])assert.ok(!text.includes(value));
});
test('simultaneous calendar retries use a deterministic id and create one row',async()=>{
 const calendar=new MockCalendar();await Promise.all([calendar.sync(id,details.date),calendar.sync(id,details.date),calendar.sync(id,details.date)]);assert.equal(calendar.inserts,1);assert.equal(calendar.rows.length,1);
});
test('late accept worker reconciles to the agreed date after concurrent completion',async()=>{
 const f=fixture();let resume,started;const gate=new Promise(r=>resume=r);const entered=new Promise(r=>started=r);const sync=f.calendar.sync.bind(f.calendar);let first=true;
 f.calendar.sync=async(...args)=>{if(first){first=false;started();await gate;}return sync(...args);};
 const accept=f.call('accept');await entered;await f.call('complete',{id,details});resume();await accept;assert.equal(f.calendar.rows.length,1);assert.equal(f.calendar.rows[0].date,details.date);
});
test('late accept worker cannot recreate a declined block',async()=>{
 const f=fixture();let resume,started;const gate=new Promise(r=>resume=r),entered=new Promise(r=>started=r);const sync=f.calendar.sync.bind(f.calendar);f.calendar.sync=async(...args)=>{started();await gate;return sync(...args);};
 const accept=f.call('accept');await entered;await f.call('decline');resume();await accept;assert.equal(f.calendar.rows.length,0);
});
test('a deliberately cleared date may be blocked again at final details, as approved',async()=>{
 const f=fixture();await f.call('accept');f.calendar.rows=[];await f.call('complete',{id,details:{...details,date:'2099-10-12'}});assert.equal(f.calendar.rows.length,1);
});
test('calendar messages gracefully support an older backend and all result statuses',()=>{
 assert.equal(calendarMessage(undefined),'');
 for(const status of ['blocked','already_blocked','unblocked','no_date','skipped_past','failed'])assert.ok(calendarMessage({status,date:'2099-10-12'}).startsWith('Accepted'));
 assert.equal(calendarMessage({status:'unblocked',date:'2099-10-12'},'Declined'),'Declined. Oct 12 is open again.');
 assert.match(calendarMessage({status:'failed',date:'2099-10-12'},'Details saved'),/Details saved, but.*Block Oct 12/);
});
test('two different enquiries accepted concurrently leave one full-day block in place',async()=>{
 const calendar=new MockCalendar();
 await Promise.all([calendar.sync(id,details.date),calendar.sync('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',details.date)]);
 assert.equal(calendar.rows.length,1);assert.equal(calendar.rows[0].status,'unavailable');assert.equal(calendar.rows[0].date,details.date);
});
