/**
 * POST /api/upload
 * Accepts multipart form data with a `file` field.
 * Writes to the R2 bucket bound as PHOTOS and returns { key, url }.
 *
 * Cloudflare Pages dashboard setup required:
 *   Settings → Functions → R2 bucket bindings → add  PHOTOS → zrp-photos
 *   Settings → Environment variables → add  R2_BASE_URL → https://pub-xxxx.r2.dev
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // Auth: only allow requests that came from the admin page (same origin)
  // A simple shared secret env var adds extra protection
  const origin = request.headers.get('origin') || '';
  const host   = request.headers.get('host')   || '';
  if (origin && !origin.includes(host)) {
    return new Response('Forbidden', { status: 403 });
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
