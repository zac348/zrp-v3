import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupPricing} from '../src/lib/admin/pricing.js';

test('package and add-on availability write the chosen value and surface failed saves', async()=>{
  const elements=new Map();
  const previous=globalThis.document;
  globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',classList:{add(){},remove(){}}});return elements.get(id);}};
  const writes=[];let fail=false;
  const sb={from(table){return {
    update(body){return {async eq(column,id){writes.push({table,body,column,id});return {error:fail?{message:'Save failed'}:null};}};},
    select(){return {async order(){return {data:[],error:null};}};},
  };}};
  try {
    const {actions}=setupPricing({sb,state:{}});
    await actions.toggleAvail('package-id',false,'pkg');
    await actions.toggleAvail('addon-id',true,'addon');
    assert.deepEqual(writes,[
      {table:'package_pricing',body:{available:false},column:'id',id:'package-id'},
      {table:'addon_pricing',body:{available:true},column:'id',id:'addon-id'},
    ]);
    elements.get('toast').textContent='';fail=true;
    await assert.rejects(actions.toggleAvail('addon-id',false,'addon'),/Save failed/);
    assert.equal(elements.get('toast').textContent,'');
  } finally {globalThis.document=previous;}
});
