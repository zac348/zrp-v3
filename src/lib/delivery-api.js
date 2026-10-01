export async function delivery(action, data = {}, session) {
  const headers = {'Content-Type':'application/json'};
  if(session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const r=await fetch('/api/delivery',{method:'POST',headers,body:JSON.stringify({action,...data}),signal:AbortSignal.timeout(90000)});
  const result=await r.json().catch(()=>({error:'The server could not complete the request.'}));
  if(!r.ok || result.error) throw new Error(result.error || 'Please try again.');
  return result;
}
export async function copyPrivateLink(link) {
  try { await navigator.clipboard.writeText(link); }
  catch { window.prompt('Copy this private link:',link); }
}
