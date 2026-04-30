/**
 * POST /api/delete-photo
 * Body: { keys: string[] }   — array of R2 object keys to delete
 *
 * Cloudflare Pages dashboard setup required:
 *   Settings → Functions → R2 bucket bindings → add  PHOTOS → zrp-photos
 */
export async function onRequestPost(context) {
  const { request, env } = context;

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
