// Read one gallery photograph through the existing R2 binding. A gallery link
// grants access, matching the site's existing private-gallery sharing model.
export async function onRequestGet({ request, env }) {
  const params = new URL(request.url).searchParams;
  const slug = params.get('g');
  const photoId = params.get('photo');
  const fail = (error, status) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!slug || !photoId || slug.length > 200 || photoId.length > 200) return fail('A gallery and photograph are required.', 400);
  if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY || !env.PHOTOS) return fail('Photo downloads are not configured.', 503);
  const base = env.PUBLIC_SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
  const headers = { apikey: env.PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.PUBLIC_SUPABASE_ANON_KEY}` };
  const rows = async (table, query) => {
    const response = await fetch(base + table + '?' + new URLSearchParams(query), { headers, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Photo service unavailable');
    return response.json();
  };
  try {
    const galleries = await rows('client_galleries', { select: 'id', slug: 'eq.' + slug, limit: '1' });
    if (!galleries[0]) return fail('Gallery not found.', 404);
    const photos = await rows('portfolio_photos', { select: 'storage_path,url,file_name', id: 'eq.' + photoId, gallery_id: 'eq.' + galleries[0].id, limit: '1' });
    if (!photos[0]) return fail('Photograph not found in this gallery.', 404);
    const photo = photos[0];
    const storagePath = photo.storage_path || decodeURIComponent(new URL(photo.url).pathname.slice(1));
    const object = await env.PHOTOS.get(storagePath);
    if (!object) return fail('Photograph not found.', 404);
    const filename = (photo.file_name || 'photograph.jpg').replace(/[\r\n\x00-\x1f"\\/]/g, '_');
    return new Response(object.body, { headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(filename),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (_) { return fail('The photograph could not be retrieved. Please try again.', 503); }
}
