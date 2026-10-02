import {readBlog} from '../../src/lib/blog-server.js';
export async function onRequestGet({request,env}) {
  const url=new URL(request.url);
  const result=await readBlog(env,{slug:url.searchParams.has('slug')?url.searchParams.get('slug'):undefined,page:url.searchParams.get('page')||1});
  return Response.json(result,{status:result.status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
