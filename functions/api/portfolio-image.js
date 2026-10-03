// GET /api/portfolio-image?id=<drive file>&s=700|1400|2200&v=<modified time>
// A resized portfolio photograph from Google Drive. The delivery function only
// serves files inside the portfolio folder. `v` changes when the file changes,
// so each version can be cached for a year at the edge and in browsers.
const ID = /^[a-zA-Z0-9_-]{10,150}$/;
const SIZES = new Set(['700', '1400', '2200']);

export async function onRequestGet({request, env, waitUntil}) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '', size = url.searchParams.get('s') || '2200', version = url.searchParams.get('v') || '';
  const missing = (status = 404) => new Response('Photo not found.', {status, headers: {'Cache-Control': 'no-store'}});
  if (!ID.test(id) || !SIZES.has(size) || !/^\d{0,16}$/.test(version)) return missing();
  const cache = globalThis.caches?.default;
  const key = new Request(new URL('/api/portfolio-image?' + new URLSearchParams({id, s: size, v: version}), url.origin));
  const hit = await cache?.match(key);
  if (hit) return hit;
  if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) return missing(503);
  try {
    const r = await fetch(`${env.PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/delivery?` + new URLSearchParams({action: 'portfolio-image', file: id, size}),
      {headers: {apikey: env.PUBLIC_SUPABASE_ANON_KEY}, signal: AbortSignal.timeout(30000)});
    const type = r.headers.get('Content-Type') || '';
    if (!r.ok || !type.startsWith('image/')) return missing(r.status === 404 || r.status === 400 ? 404 : 502);
    const response = new Response(r.body, {headers: {'Content-Type': type, 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': version ? 'public, max-age=31536000, immutable' : 'public, max-age=86400'}});
    if (cache) waitUntil(cache.put(key, response.clone()));
    return response;
  } catch {
    return missing(502);
  }
}
