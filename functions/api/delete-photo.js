/**
 * POST /api/delete-photo
 * Body: { keys: string[] }   — array of R2 object keys to delete
 *
 * Cloudflare Pages dashboard setup required:
 *   Settings → Functions → R2 bucket bindings → add  PHOTOS → zrp-photos
 */
// Auth: caller must present a valid Supabase session token (the admin's login).
// The token is verified server-side against Supabase's auth endpoint.
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

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!(await verifySupabaseUser(request, env))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const keys = Array.isArray(body.keys) ? body.keys : (body.key ? [body.key] : []);
  if (!keys.length) {
    return Response.json({ error: 'No keys provided' }, { status: 400 });
  }

  try {
    await Promise.all(keys.map(k => env.PHOTOS.delete(k)));
  } catch (e) {
    return Response.json({ error: 'Delete failed: ' + e.message }, { status: 500 });
  }

  return Response.json({ ok: true, deleted: keys.length });
}
