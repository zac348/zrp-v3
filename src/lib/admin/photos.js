import {checked, checkedFetch, esc, toast, fmtBytes} from './shared.js';
export function setupPhotos(ctx) {
  const {sb,state}=ctx;
// ── PHOTOS ──
let selectedPhotoIds = new Set();
const PHOTOS_PER_PAGE = 24;
let photoPage = 0;

async function loadPhotos() {
  const { data } = await checked(sb.from('portfolio_photos').select('*').order('created_at', { ascending: false }));
  state.photos = data || [];
  for(const id of selectedPhotoIds)if(!state.photos.some(p=>p.id===id))selectedPhotoIds.delete(id);
  renderPhotos();
  populateGalDropdowns();
  ctx.galleries.render();
  ctx.overview.render();
}

function renderPhotos() {
  const g = document.getElementById('photos-grid');
  if (!state.photos.length) { g.innerHTML = '<p class="no-data">No photos yet.</p>'; updateBulkBar();renderPhotoPager(); return; }
  photoPage=Math.min(photoPage,Math.max(0,Math.ceil(state.photos.length/PHOTOS_PER_PAGE)-1));
  const start = photoPage * PHOTOS_PER_PAGE;
  const page  = state.photos.slice(start, start + PHOTOS_PER_PAGE);
  g.innerHTML = page.map(p => `
    <div class="photo-card ${selectedPhotoIds.has(p.id) ? 'selected' : ''}" id="pc-${p.id}">
      <div class="photo-cb-wrap">
        <input type="checkbox" class="photo-cb" aria-label="Select photograph" ${selectedPhotoIds.has(p.id) ? 'checked' : ''}
          data-change="togglePhotoSelect" data-args="${esc(JSON.stringify([p.id, "$checked"]))}"/>
      </div>
      <img src="${esc(p.thumb_url || p.web_url || p.url)}" alt="" width="${Number(p.width)||700}" height="${Number(p.height)||467}" loading="lazy" decoding="async"
        data-action="photoCardClick" data-args="${esc(JSON.stringify([p.id]))}"/>
      <div class="photo-card-info">
        <div class="photo-sport">${esc(p.sport || 'No category')}${p.location ? ' · ' + esc(p.location) : ''}${p.on_portfolio ? ' · <span>Portfolio</span>' : ''}</div>
        <div class="photo-name">${esc(p.title || p.file_name)}</div>
      </div>
      <div class="photo-actions">
        <button class="btn-sm" data-action="editPhotoMeta" data-args="${esc(JSON.stringify([p.id]))}">Edit</button>
        <button class="btn-sm red" data-action="delPhoto" data-args="${esc(JSON.stringify([p.id, p.storage_path]))}">Delete</button>
      </div>
    </div>`).join('');
  updateBulkBar();
  renderPhotoPager();
}

function renderPhotoPager() {
  let pager = document.getElementById('photo-pager');
  const totalPages = Math.ceil(state.photos.length / PHOTOS_PER_PAGE);
  if (!pager) {
    pager = document.createElement('div');
    pager.id = 'photo-pager';
    pager.className = 'photo-pager';
    document.getElementById('photos-grid').after(pager);
  }
  if (totalPages <= 1) { pager.innerHTML = ''; return; }
  pager.innerHTML = `
    <span class="muted-note">
      ${photoPage*PHOTOS_PER_PAGE+1}–${Math.min((photoPage+1)*PHOTOS_PER_PAGE, state.photos.length)} of ${state.photos.length}
    </span>
    <div class="actions">
      <button class="btn-sm" data-action="setPhotoPage" data-args="${esc(JSON.stringify([photoPage-1]))}" ${photoPage===0?'disabled':''}>← Prev</button>
      <button class="btn-sm" data-action="setPhotoPage" data-args="${esc(JSON.stringify([photoPage+1]))}" ${photoPage>=totalPages-1?'disabled':''}>Next →</button>
    </div>`;
}
function setPhotoPage(p) { photoPage=Number(p); renderPhotos(); document.getElementById('tab-upload').scrollIntoView({behavior:'instant',block:'start'}); }

function togglePhotoSelect(id, checked) {
  if (checked) selectedPhotoIds.add(id); else selectedPhotoIds.delete(id);
  const card = document.getElementById('pc-'+id);
  if (card) { card.classList.toggle('selected', checked); const cb=card.querySelector('.photo-cb'); if(cb) cb.checked=checked; }
  updateBulkBar();
}

// Clicking the photo itself toggles selection (inline handlers can't see module scope)
function photoCardClick(id) { togglePhotoSelect(id, !selectedPhotoIds.has(id)); }

// ── TITLE / LOCATION EDITING ──
function metaColError(error) { return 'Error: ' + (error?.message || 'unknown'); }

async function editPhotoMeta(id) {
  const p = state.photos.find(x => x.id === id);
  if (!p) return;
  const title = prompt('Photo title (leave blank for none):', p.title || '');
  if (title === null) return;
  const location = prompt('Location (leave blank for none):', p.location || '');
  if (location === null) return;
  const { error } = await sb.from('portfolio_photos')
    .update({ title: title.trim() || null, location: location.trim() || null })
    .eq('id', id);
  if (error) { toast(metaColError(error)); return; }
  await loadPhotos(); toast('Saved');
}

async function bulkSetLocation() {
  if (!selectedPhotoIds.size) return;
  const loc = prompt('Location for ' + selectedPhotoIds.size + ' photo(s) — blank clears it:', '');
  if (loc === null) return;
  const { error } = await sb.from('portfolio_photos')
    .update({ location: loc.trim() || null })
    .in('id', [...selectedPhotoIds]);
  if (error) { toast(metaColError(error)); return; }
  await loadPhotos(); toast('Location updated');
}

function toggleSelectAll(checked) { state.photos.forEach(p => togglePhotoSelect(p.id, checked)); }

function updateBulkBar() {
  const count = selectedPhotoIds.size;
  document.getElementById('bulk-count').textContent = count + ' selected';
  document.getElementById('bulk-actions').hidden = count === 0;
  const allCb = document.getElementById('select-all-cb');
  if (allCb) allCb.checked = count > 0 && count === state.photos.length;
}

function populateGalDropdowns() {
  ['up-gallery','bulk-gallery'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const first = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(first);
    state.galleries.forEach(g => {
      const o = document.createElement('option'); o.value=g.id; o.textContent=g.name; sel.appendChild(o);
    });
  });
}


// The upload/delete API functions verify this Supabase session token server-side
async function apiAuthHeader() {
  const { data } = await sb.auth.getSession();
  return { Authorization: 'Bearer ' + (data.session?.access_token || '') };
}

// Every photo can have up to three objects in R2: original, web, thumbnail
function photoKeys(p) {
  const fromUrl = u => (u ? String(u).split('/').pop() : null);
  return [p.storage_path, fromUrl(p.web_url), fromUrl(p.thumb_url)].filter(Boolean);
}

async function delPhoto(id, storagePath) {
  if (!confirm('Delete this photo? This cannot be undone.')) return;
  const photo = state.photos.find(p => p.id === id);
  const keys = photo ? photoKeys(photo) : (storagePath ? [storagePath] : []);
  if (keys.length) {
    await checkedFetch('/api/delete-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await apiAuthHeader()) },
      body: JSON.stringify({ keys }),
    });
  }
  await checked(sb.from('portfolio_photos').delete().eq('id', id));
  selectedPhotoIds.delete(id);
  await loadPhotos();
  toast('Photo deleted');
}

async function bulkChangeSport() {
  const sport = document.getElementById('bulk-sport').value;
  if (!sport || !selectedPhotoIds.size) return;
  await checked(sb.from('portfolio_photos').update({ sport }).in('id', [...selectedPhotoIds]));
  await loadPhotos(); toast('Category updated');
}

async function bulkAddToGallery() {
  const gid = document.getElementById('bulk-gallery').value;
  if (!gid || !selectedPhotoIds.size) return;
  await checked(sb.from('portfolio_photos').update({ gallery_id: gid }).in('id', [...selectedPhotoIds]));
  await loadPhotos(); toast('Added to gallery');
}

// Add/remove the selected photos from the public /portfolio page
async function bulkSetPortfolio() {
  const mode = document.getElementById('bulk-portfolio').value;
  if (!mode || !selectedPhotoIds.size) return;
  const n = selectedPhotoIds.size;
  const { error } = await sb.from('portfolio_photos')
    .update({ on_portfolio: mode === 'add' })
    .in('id', [...selectedPhotoIds]);
  if (error) {
    toast('Portfolio column missing — run the SQL in HANDOFF.md');
    console.error('bulkSetPortfolio:', error.message);
    return;
  }
  document.getElementById('bulk-portfolio').value = '';
  await loadPhotos();
  toast(mode === 'add'
    ? n + ' photo(s) added to Portfolio'
    : n + ' photo(s) removed from Portfolio');
}

async function bulkDelete() {
  if (!selectedPhotoIds.size) return;
  if (!confirm(`Delete ${selectedPhotoIds.size} photo(s)? This cannot be undone.`)) return;
  const ids = [...selectedPhotoIds];
  const photos = state.photos.filter(p => ids.includes(p.id));
  const paths = photos.flatMap(photoKeys);
  if (paths.length) {
    await checkedFetch('/api/delete-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await apiAuthHeader()) },
      body: JSON.stringify({ keys: paths }),
    });
  }
  await checked(sb.from('portfolio_photos').delete().in('id', ids));
  selectedPhotoIds.clear();
  await loadPhotos(); toast('Deleted ' + ids.length + ' photo(s)');
}

// ── UPLOAD ──
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', e => handleFiles(e.target.files));

// ── IMAGE RESIZING ──
// Phones and laptops should never download a 14 MB original. On upload we make
// two smaller versions in the browser and keep the original for client downloads.
const WEB_EDGE = 2200, WEB_Q = 0.82;   // lightbox / large screens
const THUMB_EDGE = 700, THUMB_Q = 0.78; // grid thumbnails

async function makeVariant(blob, maxEdge, quality) {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  const natural = { width: bmp.width, height: bmp.height };
  if (bmp.close) bmp.close();
  const out = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
  canvas.width = canvas.height = 0; // let the bitmap memory go
  if(!out)throw new Error('Could not resize the photograph');
  return { blob: out, width: w, height: h, natural };
}

async function uploadBlob(blob, filename) {
  const fd = new FormData();
  fd.append('file', new File([blob], filename, { type: blob.type || 'image/jpeg' }));
  const res = await fetch('/api/upload', { method: 'POST', body: fd, headers: await apiAuthHeader() });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Upload failed');
  return json; // { key, url }
}

async function handleFiles(files) {
  if (!files?.length) return;
  const sport   = document.getElementById('up-sport').value;
  const galId   = document.getElementById('up-gallery').value || null;
  const onPort  = document.getElementById('up-portfolio').checked;
  const progWrap = document.getElementById('prog-wrap');
  const progBar  = document.getElementById('prog-bar');
  const status   = document.getElementById('up-status');
  progWrap.hidden = false; let done = 0;

  for (const file of files) {
    let orig, web = null, thumb = null, dims = null;
    try {
      status.textContent = `Uploading ${file.name} (original)…`;
      orig = await uploadBlob(file, file.name);

      status.textContent = `Resizing ${file.name}…`;
      const webV   = await makeVariant(file, WEB_EDGE, WEB_Q);
      const thumbV = await makeVariant(file, THUMB_EDGE, THUMB_Q);
      dims = webV.natural;

      status.textContent = `Uploading ${file.name} (web versions)…`;
      web   = await uploadBlob(webV.blob,   'web-'   + file.name.replace(/\.\w+$/, '') + '.jpg');
      thumb = await uploadBlob(thumbV.blob, 'thumb-' + file.name.replace(/\.\w+$/, '') + '.jpg');
    } catch (e) {
      // Resizing failed (odd format, memory) — still save the original so nothing is lost
      status.textContent = `${file.name}: ${e.message}`;
      if (!orig) continue;
    }

    const upTitle = document.getElementById('up-title').value.trim() || null;
    const upLoc   = document.getElementById('up-location').value.trim() || null;
    const row = {
      file_name: file.name, storage_path: orig.key,
      url: orig.url, sport: sport || null,
      gallery_id: galId,
      file_size: file.size,
      title: upTitle, location: upLoc,
      on_portfolio: onPort,
      web_url: web?.url || null,
      thumb_url: thumb?.url || null,
      width: dims?.width || null,
      height: dims?.height || null,
    };
    const { error: insErr } = await checked(sb.from('portfolio_photos').insert(row));
    if (insErr) { status.textContent = 'Error: ' + insErr.message; continue; }
    done++;
    progBar.value = Math.round((done / files.length) * 100);
  }

  progWrap.hidden = true; progBar.value = 0;
  status.textContent = `✓ ${done} photo(s) uploaded`;
  fileInput.value = '';
  await loadPhotos(); ctx.overview.render();
  toast(done + ' photo(s) uploaded');
}

function syncOptimizeButton() {
  const row = document.getElementById('optimize-row');
  if (row) row.hidden = !state.photos.some(p => !p.thumb_url && p.storage_path);
}

// ── ONE-TIME OPTIMIZER ──
// Photos uploaded before resizing existed are still full-size. This walks them,
// builds web + thumbnail versions in the browser, and stores those alongside the
// untouched original. Safe to stop and re-run — it skips anything already done.
async function optimizeExisting() {
  const todo = state.photos.filter(p => !p.thumb_url && p.storage_path);
  const btn = document.getElementById('optimize-btn');
  const status = document.getElementById('optimize-status');

  if (!todo.length) { toast('Every photo is already optimized'); return; }
  if (!confirm(`Optimize ${todo.length} photo(s)?\n\nThis downloads each one, makes web + thumbnail versions, and uploads them. Originals are kept. You can leave this running.`)) return;

  btn.disabled = true;
  let done = 0, failed = 0, savedBytes = 0;

  for (const p of todo) {
    status.textContent = `Optimizing ${done + failed + 1} of ${todo.length}…`;
    try {
      const res = await fetch('/api/photo-bytes?key=' + encodeURIComponent(p.storage_path), {
        headers: await apiAuthHeader(),
      });
      if (!res.ok) throw new Error('fetch failed (' + res.status + ')');
      const blob = await res.blob();

      const webV   = await makeVariant(blob, WEB_EDGE, WEB_Q);
      const thumbV = await makeVariant(blob, THUMB_EDGE, THUMB_Q);
      const base   = (p.file_name || 'photo').replace(/\.\w+$/, '');

      const web   = await uploadBlob(webV.blob,   'web-'   + base + '.jpg');
      const thumb = await uploadBlob(thumbV.blob, 'thumb-' + base + '.jpg');

      const { error } = await sb.from('portfolio_photos').update({
        web_url: web.url, thumb_url: thumb.url,
        width: webV.natural.width, height: webV.natural.height,
      }).eq('id', p.id);
      if (error) throw new Error(error.message);

      savedBytes += Math.max(0, (blob.size || 0) - webV.blob.size);
      done++;
    } catch (e) {
      failed++;
      console.error('optimize failed for', p.file_name, e);
    }
  }

  btn.disabled = false;
  status.textContent = `✓ ${done} optimized` + (failed ? `, ${failed} failed (see console)` : '') +
    (savedBytes ? ` — ~${(savedBytes / 1e6).toFixed(0)} MB lighter` : '');
  await loadPhotos(); ctx.overview.render();
  toast(done + ' photo(s) optimized');
}


function chooseFiles(){fileInput.click();}

  return {load: loadPhotos, render: renderPhotos, populateGalDropdowns, syncOptimizeButton, actions: {bulkAddToGallery, bulkChangeSport, bulkDelete, bulkSetLocation, bulkSetPortfolio, delPhoto, editPhotoMeta, optimizeExisting, photoCardClick, setPhotoPage, togglePhotoSelect, toggleSelectAll, chooseFiles}};
}
