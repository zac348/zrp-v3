/**
 * POST /api/upload
 * Accepts multipart form data with a `file` field.
 * Writes to the R2 bucket bound as PHOTOS and returns { key, url }.
 *
 * Cloudflare Pages dashboard setup required:
 *   Settings → Functions → R2 bucket bindings → add  PHOTOS → zrp-photos
 *   Settings → Environment variables → add  R2_BASE_URL → https://pub-xxxx.r2.dev
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

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const key = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    await env.PHOTOS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || 'image/jpeg' },
    });
  } catch (e) {
    return Response.json({ error: 'Upload failed: ' + e.message }, { status: 500 });
  }

  const baseUrl = (env.R2_BASE_URL || '').replace(/\/$/, '');
  return Response.json({ key, url: `${baseUrl}/${key}` });
}
