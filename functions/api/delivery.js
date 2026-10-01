// Keep browser requests same-origin; credentials remain in Supabase secrets.
export async function onRequest({request,env}) {
  if(!['GET','POST'].includes(request.method)) return new Response('Method not allowed',{status:405});
  const origin=request.headers.get('origin');
  if(origin && origin !== new URL(request.url).origin) return new Response('Forbidden',{status:403});
  if(!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) return Response.json({error:'Delivery service is not configured.'},{status:503});
  const target=new URL('/functions/v1/delivery',env.PUBLIC_SUPABASE_URL);
  target.search=new URL(request.url).search;
  const headers=new Headers({apikey:env.PUBLIC_SUPABASE_ANON_KEY,'Content-Type':'application/json'});
  const auth=request.headers.get('authorization'); if(auth) headers.set('Authorization',auth);
  try {
    const body=request.method==='POST'?await request.text():undefined;
    if(body?.length>16000) return Response.json({error:'Request too large.'},{status:413});
    const response=await fetch(target,{method:request.method,headers,body});
    const h=new Headers(response.headers);
    // Fetch can decode the upstream body. Do not forward its compressed length
    // or encoding alongside the decoded stream.
    h.delete('Content-Length'); h.delete('Content-Encoding');
    h.set('Cache-Control','no-store'); h.set('Referrer-Policy','no-referrer'); h.set('X-Content-Type-Options','nosniff');
    return new Response(response.body,{status:response.status,headers:h});
  } catch { return Response.json({error:'Delivery service is unavailable. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
