// GET /api/portfolio — the public portfolio, read from the Google Drive
// portfolio folder (subfolders are categories) through the delivery function.
// Cached at the edge for five minutes, so changes in Drive show up shortly.
export const imagePath = (photo, size) =>
  '/api/portfolio-image?' + new URLSearchParams({id: photo.id, s: String(size), v: String(Date.parse(photo.modified) || 0)});

export function toPublicPhoto(photo) {
  const web = imagePath(photo, 2200);
  return {id: photo.id, thumb_url: imagePath(photo, 700), web_url: web, url: web, width: photo.width || null, height: photo.height || null,
    sport: photo.category || null, title: '', location: photo.caption || ''};
}

export async function onRequestGet({request, env, waitUntil}) {
  const cache = globalThis.caches?.default;
  const key = new Request(new URL('/api/portfolio', request.url));
  const hit = await cache?.match(key);
  if (hit) return hit;
  const fail = message => Response.json({error: message}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) return fail('The portfolio is not configured.');
  try {
    const r = await fetch(`${env.PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/delivery?action=portfolio`,
      {headers: {apikey: env.PUBLIC_SUPABASE_ANON_KEY}, signal: AbortSignal.timeout(20000)});
    const body = await r.json().catch(() => ({}));
    if (!r.ok || !Array.isArray(body.photos)) return fail(body.error || 'The portfolio is unavailable.');
    const response = Response.json({photos: body.photos.map(toPublicPhoto)},
      {headers: {'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff'}});
    if (cache) waitUntil(cache.put(key, response.clone()));
    return response;
  } catch {
    return fail('The portfolio is unavailable.');
  }
}
