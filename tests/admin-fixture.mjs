// Minimal DOM/database doubles for action-level regression tests, not visual QA.
export function studioFixture(seed={}) {
  const old={location:globalThis.location,document:globalThis.document,fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap};
  const byId=new Map(),dialogs=[],requests=[],blobs=[];
  class Element {
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.handlers={};this.attrs={};this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.isConnected=true;this.style={};this.options=[new ElementOption()];this.classList={add(){},remove(){},toggle(){}};}
    set innerHTML(value){this.html=value;this.children=[];} get innerHTML(){return this.html||'';}
    setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k];}
    append(...nodes){this.children.push(...nodes);} appendChild(n){this.append(n);} replaceChildren(...n){this.children=n;}
    addEventListener(type,fn){(this.handlers[type] ||= []).push(fn);}
    async fire(type,props={}){for(const fn of this.handlers[type]||[])await fn({target:this,preventDefault(){},...props});}
    focus(){doc.activeElement=this;} select(){} scrollIntoView(){} after(){}
    remove(){this.isConnected=false;} showModal(){dialogs.push(this);this.open=true;} close(){this.open=false;this.fire('close');}
    querySelector(){return null;} getContext(){return {drawImage(){}};}
    toBlob(callback,type,quality){blobs.push({width:this.width,height:this.height,type,quality});callback(new Blob(['preview'],{type}));}
  }
  function ElementOption(){}
  const doc={activeElement:new Element('button'),body:new Element('body'),createElement:tag=>new Element(tag),getElementById:id=>{if(!byId.has(id))byId.set(id,new Element());return byId.get(id);},querySelectorAll:()=>[]};
  globalThis.document=doc;globalThis.location={origin:'https://studio.test'};
  const tables=structuredClone(seed);
  let failure=null;
  const sb={auth:{getSession:async()=>({data:{session:{access_token:'test'}}})},from(table){
    let method='GET',body,filters=[];
    const query={select(){return query;},order(){return query;},update(v){method='PATCH';body=v;return query;},insert(v){method='POST';body=v;return query;},delete(){method='DELETE';return query;},eq(k,v){filters.push([k,v]);return query;},in(k,v){filters.push([k,v]);return query;},then(resolve,reject){
      requests.push({table,method,body:structuredClone(body),filters:structuredClone(filters)});
      if(failure?.(table,method,body))return Promise.resolve({error:{message:'Database refused save'},data:null}).then(resolve,reject);
      const rows=tables[table] ||= [];const match=r=>filters.every(([k,v])=>Array.isArray(v)?v.includes(r[k]):r[k]===v);
      let result=rows.filter(match);
      if(method==='PATCH')result.forEach(r=>Object.assign(r,body));
      if(method==='POST'){result=(Array.isArray(body)?body:[body]).map((r,i)=>({id:r.id||'new-'+rows.length+'-'+i,...r}));rows.push(...result);}
      if(method==='DELETE')tables[table]=rows.filter(r=>!match(r));
      return Promise.resolve({data:structuredClone(result),error:null}).then(resolve,reject);
    }};return query;
  }};
  const ctx={sb,state:{photos:tables.portfolio_photos||[],galleries:tables.client_galleries||[],coupons:[],blocks:[]},photos:{populateGalDropdowns(){},load:async()=>{},syncOptimizeButton(){}},galleries:{render(){}},overview:{render(){}}};
  function answer(value=true){const d=dialogs.at(-1);if(!d?.open)throw new Error('No confirmation opened');const form=d.children[0];const input=form.children.find(n=>n.tagName==='INPUT');if(value===null)d.close();else {if(input)input.value=value;form.fire('submit');}}
  return {ctx,doc,requests,tables,blobs,answer,field:(id,value)=>{const e=doc.getElementById(id);if(value!==undefined)e.value=value;return e;},failWith:fn=>failure=fn,restore(){Object.assign(globalThis,old);}};
}
