/**
 * GET /api/photo-bytes?key=<r2-object-key>
 *
 * Streams one object out of the R2 bucket. Used only by the admin "Optimize
 * existing photos" tool: the public r2.dev URLs send no CORS headers, so the
 * browser can't read those bytes into a canvas to resize them. This endpoint is
 * same-origin with the admin page, so no CORS is involved.
 *
 * Requires the same Supabase session token as upload/delete.
 *
 * Cloudflare Pages setup:
 *   Settings → Functions → R2 bucket bindings → PHOTOS → your bucket
 */
async function verifySupabaseUser(request, env) {
  const auth  = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const base  = (env.PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key   = env.PUBLIC_SUPABASE_ANON_KEY || '';
  if (!token || !base || !key) return false;
  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: key, authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return !!(user && user.id);
  } catch {
    return false;
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!(await verifySupabaseUser(request, env))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get('key');
  if (!key) return Response.json({ error: 'key required' }, { status: 400 });

  const obj = await env.PHOTOS.get(key);
  if (!obj) return Response.json({ error: 'Not found' }, { status: 404 });

  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'private, no-store',
    },
  });
}
