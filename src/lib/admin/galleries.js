import {checked, checkedFetch, esc, toast, fmtBytes} from './shared.js';
export function setupGalleries(ctx) {
  const {sb,state}=ctx;
// ── GALLERIES ──
async function loadGalleries() {
  const { data } = await checked(sb.from('client_galleries').select('*').order('created_at', { ascending: false }));
  state.galleries = data || [];
  renderGalleries();
  ctx.photos.populateGalDropdowns();
  ctx.overview.render();
}

function renderGalleries() {
  const list = document.getElementById('gal-list');
  if (!state.galleries.length) { list.innerHTML = '<p class="no-data">No galleries yet.</p>'; return; }
  list.innerHTML = state.galleries.map(g => {
    const photoCount = state.photos.filter(p => p.gallery_id === g.id).length;
    const link = location.origin + '/gallery?g=' + encodeURIComponent(g.slug);
    return `<div class="gal-row">
      <div class="gal-info">
        <h3>${esc(g.name)}</h3>
        <p>${photoCount} photo${photoCount!==1?'s':''} · ${esc(g.slug)}</p>
      </div>
      <div class="gal-actions">
        <button class="btn-sm ${g.watermarked ? 'on-amber' : ''}" data-action="toggleWatermark" data-args="${esc(JSON.stringify([g.id, !!g.watermarked]))}" title="Toggle watermark">
          ${g.watermarked ? '◆ Watermark on' : '◇ Watermark off'}
        </button>
        <button class="btn-sm" data-action="copyLink" data-args="${esc(JSON.stringify([link]))}">Copy link</button>
        <a class="btn-sm" href="/gallery?g=${esc(g.slug)}" target="_blank">Preview</a>
        <button class="btn-sm red" data-action="deleteGallery" data-args="${esc(JSON.stringify([g.id, g.name]))}">Delete</button>
      </div>
    </div>`;
  }).join('');
}

async function toggleWatermark(id, current) {
  await checked(sb.from('client_galleries').update({ watermarked: !current }).eq('id', id));
  await loadGalleries();
  toast('Watermark ' + (!current ? 'enabled' : 'disabled'));
}

async function createGallery() {
  const name = document.getElementById('new-gal-name').value.trim();
  if (!name) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
  const { error } = await checked(sb.from('client_galleries').insert({ name, slug }));
  if (error) { toast('Error: ' + error.message); return; }
  document.getElementById('new-gal-name').value = '';
  await loadGalleries(); toast('Gallery created');
}

async function deleteGallery(id, name) {
  if (!confirm(`Delete gallery "${name}"? Photos will not be deleted.`)) return;
  await checked(sb.from('portfolio_photos').update({ gallery_id: null }).eq('gallery_id', id));
  await checked(sb.from('client_galleries').delete().eq('id', id));
  await ctx.photos.load();await loadGalleries(); toast('Gallery deleted');
}

async function copyLink(link) {
  await navigator.clipboard.writeText(link);
  toast('Link copied!');
}


  return {load: loadGalleries, render: renderGalleries, actions: {copyLink, createGallery, deleteGallery, toggleWatermark}};
}
