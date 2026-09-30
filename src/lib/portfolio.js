const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
async function publicRows(table, query) {
  if (!url || !key) throw new Error('The photo connection is not configured.');
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('The photo service is unavailable.');
  return response.json();
}
export function loadPublicPhotos() {
  return publicRows('portfolio_photos', 'select=url,web_url,thumb_url,width,height,sport,title,location&on_portfolio=eq.true&order=created_at.desc&limit=500');
}
export async function loadStartingPrice() {
  const data = await publicRows('package_pricing', 'select=base_price,sale_price,on_sale&available=eq.true');
  const prices = data.map(p => Number(p.on_sale && p.sale_price != null ? p.sale_price : p.base_price)).filter(p => Number.isFinite(p) && p >= 0);
  return prices.length ? Math.min(...prices) : null;
}
export function renderCategoryFilters(photos, onSelect) {
  const counts = new Map();
  photos.forEach(p => { if (p.sport) counts.set(p.sport, (counts.get(p.sport) || 0) + 1); });
  const categories = [...counts.keys()].sort();
  const container = document.getElementById('cat-tags');
  container.replaceChildren(...[null, ...categories].map(category => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'category-filter'; button.dataset.category = category || '';
    button.append(document.createTextNode(category || 'All work'));
    const count = document.createElement('sup'); count.textContent = String(category ? counts.get(category) : photos.length).padStart(2, '0');
    button.append(count); button.addEventListener('click', () => onSelect(category));
    return button;
  }));
  return categories;
}
export function syncCategoryFilters(category) {
  document.querySelectorAll('.category-filter').forEach(button => {
    const active = button.dataset.category === (category || '');
    button.classList.toggle('active', active);button.setAttribute('aria-pressed',String(active));
  });
}
