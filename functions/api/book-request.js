import {onRequestPost as saveEnquiry} from './contact.js';
const fail=(error,status=400)=>Response.json({ok:false,error},{status});
const money=n=>'$'+(n/100).toFixed(2);
export async function onRequestPost({request,env}) {
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)return fail('Forbidden',403);
  let b;try{b=await request.json();}catch{return fail('Invalid request.');}
  if(!b || typeof b!=='object')return fail('Invalid request.');
  if(b.website || Number(b.elapsed || 0)<3000)return Response.json({ok:true});
  const fields={name:100,email:200,phone:50,date:10,time:5,session_type:100,notes:1500};
  for(const [key,max]of Object.entries(fields)){
    if(b[key]!=null && typeof b[key]!=='string')return fail('Please check your '+key+'.');
    b[key]=(b[key] || '').trim();if(b[key].length>max)return fail('Please shorten '+key+'.');
  }
  if(!b.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) || !b.session_type)return fail('Name, email, and session type are required.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !Number.isFinite(Date.parse(b.date)) || new Date(b.date).toISOString().slice(0,10)!==b.date)return fail('Choose a valid date.');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(b.date<today)return fail('Choose a future session date.');
  if(b.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time))return fail('Choose a valid time.');
  if(b.agreed!==true)return fail('Please accept the terms before submitting.');
  if(b.local!==true)return fail('Please confirm your session is in Valdosta or a nearby community.');
  if(!Array.isArray(b.addon_ids) || b.addon_ids.length>30 || b.addon_ids.some(v=>typeof v!=='string'))return fail('Please check the add-ons.');
  if(typeof b.package_id!=='string')return fail('Choose a package.');
  if(!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY)return fail('Booking is temporarily unavailable.',503);
  async function rows(table,query){
    const r=await fetch(env.PUBLIC_SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+table+'?'+query,{headers:{apikey:env.PUBLIC_SUPABASE_ANON_KEY,Authorization:'Bearer '+env.PUBLIC_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw new Error('Pricing could not be checked. Please try again.');return r.json();
  }
  try{
    const [packages,addons,blocks]=await Promise.all([
      rows('package_pricing','select=*&available=eq.true'),
      b.addon_ids.length?rows('addon_pricing','select=*&available=eq.true'):[],
      rows('availability',new URLSearchParams({select:'status,start_time',date:'eq.'+b.date}).toString()),
    ]);
    if(blocks.some(d=>d.status==='unavailable'&&!d.start_time))return fail('That date is no longer available. Please choose another.',409);
    const pkg=packages.find(p=>String(p.id)===b.package_id);
    if(!pkg)return fail('That package is no longer available. Refresh and choose another.',409);
    const cents=v=>{const n=Number(v);if(v===null || v==='' || !Number.isFinite(n)||n<0)throw new Error('Pricing is unavailable. Please contact Zachary.');return Math.round(n*100);};
    const base=cents(pkg.on_sale && pkg.sale_price!=null?pkg.sale_price:pkg.base_price);
    const selected=[...new Set(b.addon_ids)].map(id=>addons.find(a=>String(a.id)===id));
    if(selected.some(a=>!a))return fail('An add-on is no longer available. Refresh and try again.',409);
    const extra=selected.reduce((sum,a)=>sum+cents(a.price),0);
    let discount=0,couponText='';
    if(b.coupon){
      if(typeof b.coupon!=='string'||b.coupon.length>80)return fail('Invalid promo code.');
      const coupons=await rows('coupons',new URLSearchParams({select:'*',code:'eq.'+b.coupon.trim().toUpperCase(),active:'eq.true'}).toString());
      const c=coupons[0];
      if(!c || (c.expires_at && Date.parse(c.expires_at)<Date.now()) || (c.max_uses!=null && (c.uses||0)>=c.max_uses))return fail('That promo code is no longer available. Remove it or choose another.',409);
      if(c.type==='percent')discount=Math.min(base,Math.round(base*Math.min(100,Math.max(0,Number(c.value)||0))/100));
      else if(c.type==='fixed')discount=Math.min(base,cents(c.value));
      couponText='Promo code: '+c.code+(c.type==='travel'?' (travel fee waiver requested)':' (-'+money(discount)+')');
    }
    const total=base+extra-discount;
    // Prices come from the current catalog, never the browser. Store the
    // verified selection in the existing private draft; no Drive call here.
    const message=[
      'BOOKING REQUEST',`Package: ${pkg.package_name} — ${money(base)}`,
      ...selected.map(a=>`Add-on: ${a.addon_name} — ${money(cents(a.price))}`),couponText,
      `Package and add-ons estimate: ${money(total)} (subject to Zachary’s confirmation; travel quoted separately)`,
      `Session: ${b.session_type}`,`Preferred date: ${b.date}${b.time?' at '+b.time:''}`,
      b.phone?'Phone: '+b.phone:'',`Portfolio use: ${b.portfolio===true?'approved':'not approved'}`,
      'Session area: Valdosta or nearby community — confirmed',
      'Terms and privacy: accepted',b.notes,
    ].filter(Boolean).join('\n');
    if(message.length>3000)return fail('Please shorten the session notes.');
    const forwarded=new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify({name:b.name,contact:b.email,date:b.date,message,submission_id:b.submission_id,website:'',elapsed:b.elapsed})});
    const response=await saveEnquiry({request:forwarded,env});
    const result=await response.json();
    return Response.json({...result,...(response.ok?{estimate:money(total)}:{})},{status:response.status});
  }catch(e){return fail(e.message || 'Could not save your booking. Please try again.',503);}
}
