# ZR Photos v4 — dependency audit

Generated October 1, 2026 from source revision d14963b. Phase 1 evidence; not an implementation checklist marked complete.

## Search evidence

Commands below were actually run. Exit 1 means no matches. Long lines are shown by location only after 210 characters; selectors and symbol inventories below provide the complete names. No environment files were read for this report.

### Unused notification

```sh
rg -n notify-booking src functions tests supabase HANDOFF.md REDESIGN.md public/robots.txt
```

Exit 0; 3 matching lines.

```text
functions/api/notify-booking.js:2: * POST /api/notify-booking
functions/api/notify-booking.js:45:      if (!res.ok) console.error('notify-booking Resend error:', await res.text());
functions/api/notify-booking.js:48:      console.error('notify-booking send error:', e);
```

### Thanks route / storage

```sh
rg -n '(/thanks|zrp_booking_num)' src functions tests supabase HANDOFF.md REDESIGN.md public/robots.txt
```

Exit 0; 2 matching lines.

```text
REDESIGN.md:57:- /privacy, /terms, /thanks, /confirm, /invoice, /gallery, /reset, /coupon-card, and 404 route smoke checks.
src/pages/thanks.astro:104:const num = sessionStorage.getItem('zrp_booking_num');
```

### Logo references

```sh
rg -n 'zr-logo\.(png|svg)' src functions tests supabase HANDOFF.md REDESIGN.md public/robots.txt
```

Exit 1; 0 matching lines.

```text
No matches.
```

### Old API consumers

```sh
rg -n '/api/(accept-booking|confirm-booking)' src functions tests supabase HANDOFF.md REDESIGN.md public/robots.txt
```

Exit 0; 4 matching lines.

```text
functions/api/confirm-booking.js:2: * POST /api/confirm-booking
functions/api/accept-booking.js:2: * POST /api/accept-booking
src/pages/admin.astro:1371:    const res = await fetch('/api/accept-booking', {
src/pages/confirm.astro:539:    fetch('/api/confirm-booking', {
```

### Old URL consumers

```sh
rg -n '/confirm|/invoice' src functions tests supabase HANDOFF.md REDESIGN.md public/robots.txt
```

Exit 0; 12 matching lines.

```text
REDESIGN.md:36:| 10. Less floating, rounding, and padding | Tilted/shadowed inset image, lifted/shadowed package cards, floating Popular tags, slightly rounded admin/confirmation labels. | No inset photo or hov … [long line; see source]
REDESIGN.md:57:- /privacy, /terms, /thanks, /confirm, /invoice, /gallery, /reset, /coupon-card, and 404 route smoke checks.
public/robots.txt:6:Disallow: /confirm
public/robots.txt:7:Disallow: /invoice
HANDOFF.md:108:- **Emailing clients needs a verified domain.** Resend's default sender can only email *your own* address. To send accept/confirmation emails to *clients*, verify your domain (e.g. `zrphotos.net` … [long line; see source]
functions/api/confirm-booking.js:2: * POST /api/confirm-booking
functions/api/confirm-booking.js:29:  const invoiceUrl = `${siteUrl}/invoice?ztn=${ztn}`;
functions/api/accept-booking.js:29:  const confirmUrl = `${siteUrl}/confirm?token=${token}`;
src/pages/admin.astro:1266:      ${b.ztn_number ? `<a class="btn-sm" href="/invoice?ztn=${encodeURIComponent(b.ztn_number)}" target="_blank">Invoice</a>` : ''}
src/pages/confirm.astro:539:    fetch('/api/confirm-booking', {
src/config.js:9:// Either way, clients already mid-booking can still finish at their /confirm
src/layouts/Layout.astro:25:    {(redirectTo || ['/admin','/login','/reset','/confirm','/invoice','/gallery','/client-details','/client-gallery','/coupon-card'].includes(path)) && <meta name="robots" content="noindex,nofollow"/>}
```

### Old booking database

```sh
rg -n 'from\(['"'"'"]bookings['"'"'"]\)|next_booking_number|ztn_number|booking_number' src functions tests supabase HANDOFF.md REDESIGN.md public/robots.txt
```

Exit 0; 18 matching lines.

```text
functions/api/notify-booking.js:108:    b.booking_number   && ['Booking #', b.booking_number],
src/pages/admin.astro:1207:  const { data } = await sb.from('bookings').select('*').order('created_at', { ascending: false });
src/pages/admin.astro:1229:  const numDisplay = b.ztn_number || b.booking_number || b.id?.slice(-8).toUpperCase() || '—';
src/pages/admin.astro:1266:      ${b.ztn_number ? `<a class="btn-sm" href="/invoice?ztn=${encodeURIComponent(b.ztn_number)}" target="_blank">Invoice</a>` : ''}
src/pages/admin.astro:1282:  const num = b.ztn_number || b.booking_number || '';
src/pages/admin.astro:1321:  const { data, error } = await sb.from('bookings').delete().eq('id', pendingDelete.id).select('id');
src/pages/admin.astro:1341:  const { data: booking, error: getErr } = await sb.from('bookings').select('*').eq('id', id).single();
src/pages/admin.astro:1345:  const { error: upErr } = await sb.from('bookings').update({ status: 'accepted' }).eq('id', id);
src/pages/admin.astro:1408:  await sb.from('bookings').update({ status }).eq('id', id);
src/pages/invoice.astro:197:  let query = sb.from('bookings').select('*');
src/pages/invoice.astro:198:  if (ztn)   query = query.eq('ztn_number', ztn);
src/pages/invoice.astro:210:  document.getElementById('inv-ztn-display').textContent = b.ztn_number || b.booking_number || '—';
src/pages/invoice.astro:214:  document.title = 'Invoice ' + (b.ztn_number || '') + ' — ZRP';
src/pages/confirm.astro:288:    .from('bookings')
src/pages/confirm.astro:299:    document.getElementById('cs-ztn').textContent = data.ztn_number || '';
src/pages/confirm.astro:497:    const { data: numData, error: numErr } = await sb.rpc('next_booking_number');
src/pages/confirm.astro:522:      .from('bookings')
src/pages/confirm.astro:525:        ztn_number:      ztn,
```

### Legacy admin functions

```sh
rg -n '\b(isPastBooking|todayStr|bookingCard|loadBookings|renderBookings|renderOvBookings|openDeleteModal|closeDeleteModal|deletePhraseMatches|confirmDeleteBooking|acceptBooking|setStatus|mailTo)\b' src functions tests supabase HANDOFF.md REDESIGN.md public/robots.txt
```

Exit 0; 44 matching lines.

```text
src/pages/admin.astro:677:      <button class="btn-sm" onclick="closeDeleteModal()">Cancel</button>
src/pages/admin.astro:678:      <button class="btn-sm red" id="del-confirm" onclick="confirmDeleteBooking()" disabled>Delete booking</button>
src/pages/admin.astro:692:const loadDeliveries = setupDeliveryAdmin(sb, {getLegacy:()=>allBookings, legacyCard:bookingCard, onChange:()=>{updateStats();renderOvBookings();}, refreshLegacy:loadBookings});
src/pages/admin.astro:722:  await Promise.all([loadPhotos(), loadGalleries(), loadBookings(), loadBlocks(), loadCoupons(), loadPricing(), loadDeliveries()]);
src/pages/admin.astro:1129:  if (allBookings.length) { renderBookings(); renderOvBookings(); }
src/pages/admin.astro:1192:function todayStr() {
src/pages/admin.astro:1199:function isPastBooking(b) {
src/pages/admin.astro:1201:  return !!b.event_date && b.event_date < todayStr();
src/pages/admin.astro:1206:async function loadBookings() {
src/pages/admin.astro:1209:  renderBookings();
src/pages/admin.astro:1210:  renderOvBookings();
src/pages/admin.astro:1213:function renderBookings() {
src/pages/admin.astro:1218:function renderOvBookings() {
src/pages/admin.astro:1222:  list.innerHTML = recent.map(b => bookingCard(b)).join('');
src/pages/admin.astro:1225:function bookingCard(b) {
src/pages/admin.astro:1261:      ${status === 'pending'   ? `<button class="btn-sm green"  onclick="acceptBooking('${id}')" title="Accept and email client with confirm link">Accept</button>` : ''}
src/pages/admin.astro:1262:      ${status === 'accepted'  ? `<button class="btn-sm on-ink" onclick="setStatus('${id}','confirmed')">Mark confirmed</button>` : ''}
src/pages/admin.astro:1263:      ${status === 'confirmed' ? `<button class="btn-sm on-ink" onclick="setStatus('${id}','delivered')">Mark delivered</button>` : ''}
src/pages/admin.astro:1264:      ${status !== 'cancelled' ? `<button class="btn-sm red"    onclick="setStatus('${id}','cancelled')">Cancel</button>` : ''}
src/pages/admin.astro:1265:      ${status !== 'pending'   ? `<button class="btn-sm"        onclick="setStatus('${id}','pending')">Reset</button>` : ''}
src/pages/admin.astro:1267:      ${b.email ? `<button class="btn-sm" onclick="mailTo('${id}')" title="Open email client">Email</button>` : ''}
src/pages/admin.astro:1268:      ${isPastBooking(b) ? `<button class="btn-sm red" style="margin-left:auto" onclick="openDeleteModal('${id}')">Delete</button>` : ''}
src/pages/admin.astro:1276:function openDeleteModal(id) {
src/pages/admin.astro:1278:  if (!b || !isPastBooking(b)) return;               // never offered for active bookings
src/pages/admin.astro:1293:window.openDeleteModal = openDeleteModal;
src/pages/admin.astro:1295:function closeDeleteModal() {
src/pages/admin.astro:1300:window.closeDeleteModal = closeDeleteModal;
src/pages/admin.astro:1302:function deletePhraseMatches() {
src/pages/admin.astro:1308:  document.getElementById('del-confirm').disabled = !deletePhraseMatches();
src/pages/admin.astro:1311:  if (e.key === 'Escape') closeDeleteModal();
src/pages/admin.astro:1312:  if (e.key === 'Enter' && deletePhraseMatches()) confirmDeleteBooking();
src/pages/admin.astro:1315:async function confirmDeleteBooking() {
src/pages/admin.astro:1316:  if (!deletePhraseMatches()) return;
src/pages/admin.astro:1328:  closeDeleteModal();
src/pages/admin.astro:1329:  await loadBookings();
src/pages/admin.astro:1333:window.confirmDeleteBooking = confirmDeleteBooking;
src/pages/admin.astro:1335:async function acceptBooking(id) {
src/pages/admin.astro:1348:  await loadBookings();
src/pages/admin.astro:1405:window.acceptBooking = acceptBooking;
src/pages/admin.astro:1407:async function setStatus(id, status) {
src/pages/admin.astro:1409:  await loadBookings(); toast('Status updated to ' + status);
src/pages/admin.astro:1411:window.setStatus = setStatus;
src/pages/admin.astro:1413:function mailTo(id) {
src/pages/admin.astro:1418:window.mailTo = mailTo;
```

### Legacy modal and values

```sh
rg -n 'del-modal|del-summary|del-phrase|booking-num|ztn_number|booking_number|deposit|mailTo' src
```

Exit 0; 50 matching lines.

```text
src/pages/thanks.astro:26:.booking-num-card {
src/pages/thanks.astro:33:.booking-num-label {
src/pages/thanks.astro:40:.booking-num {
src/pages/thanks.astro:47:.booking-num-note { font-size: 12px; color: var(--text-3); margin-top: 6px }
src/pages/thanks.astro:82:    <div class="booking-num-card">
src/pages/thanks.astro:83:      <div class="booking-num-label">Your booking reference</div>
src/pages/thanks.astro:84:      <div class="booking-num" id="booking-num">—</div>
src/pages/thanks.astro:85:      <div class="booking-num-note">Keep this reference for your records</div>
src/pages/thanks.astro:105:if (num) document.getElementById('booking-num').textContent = num;
src/pages/invoice.astro:198:  if (ztn)   query = query.eq('ztn_number', ztn);
src/pages/invoice.astro:210:  document.getElementById('inv-ztn-display').textContent = b.ztn_number || b.booking_number || '—';
src/pages/invoice.astro:214:  document.title = 'Invoice ' + (b.ztn_number || '') + ' — ZRP';
src/pages/invoice.astro:254:  const deposit = parseFloat((b.deposit || '$0').replace('$', '')) || 0;
src/pages/invoice.astro:255:  const balance = total - deposit;
src/pages/invoice.astro:260:    <div class="inv-total-row"><span>Deposit (50%)</span><span>$${deposit.toFixed(2)}</span></div>
src/pages/terms.astro:68:    <li>A <strong>50% deposit</strong> secures your date once your booking is confirmed. The remaining balance is due on the day of the session.</li>
src/pages/terms.astro:74:    <li>Need to move or cancel? Give at least <strong>48 hours' notice</strong> and your deposit transfers to the new date, or gets refunded if you cancel outright.</li>
src/pages/terms.astro:75:    <li>Cancellations with less than 48 hours' notice (or no-shows) may forfeit the deposit — that time was reserved for you.</li>
src/pages/admin.astro:168:.booking-num { font-family: var(--font-sans); font-size: 12px; letter-spacing: .01em; color: var(--text-3) }
src/pages/admin.astro:355:.del-modal { position: fixed; inset: 0; z-index: 8500; display: none; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.6) }
src/pages/admin.astro:356:.del-modal.open { display: flex }
src/pages/admin.astro:359:.del-summary { font-size: 13px; color: var(--text); margin-bottom: 12px }
src/pages/admin.astro:669:<div class="del-modal" id="del-modal" role="dialog" aria-modal="true" aria-labelledby="del-title">
src/pages/admin.astro:672:    <p class="del-summary" id="del-summary"></p>
src/pages/admin.astro:674:    <label for="del-input">To confirm, type <strong id="del-phrase"></strong></label>
src/pages/admin.astro:1229:  const numDisplay = b.ztn_number || b.booking_number || b.id?.slice(-8).toUpperCase() || '—';
src/pages/admin.astro:1238:        <div class="booking-num">${esc(numDisplay)}</div>
src/pages/admin.astro:1251:      <div class="booking-detail"><strong>Deposit</strong>${esc(b.deposit || '—')}</div>
src/pages/admin.astro:1266:      ${b.ztn_number ? `<a class="btn-sm" href="/invoice?ztn=${encodeURIComponent(b.ztn_number)}" target="_blank">Invoice</a>` : ''}
src/pages/admin.astro:1267:      ${b.email ? `<button class="btn-sm" onclick="mailTo('${id}')" title="Open email client">Email</button>` : ''}
src/pages/admin.astro:1282:  const num = b.ztn_number || b.booking_number || '';
src/pages/admin.astro:1283:  document.getElementById('del-summary').textContent =
src/pages/admin.astro:1285:  document.getElementById('del-phrase').textContent = pendingDelete.phrase;
src/pages/admin.astro:1290:  document.getElementById('del-modal').classList.add('open');
src/pages/admin.astro:1296:  document.getElementById('del-modal').classList.remove('open');
src/pages/admin.astro:1310:document.getElementById('del-modal').addEventListener('keydown', e => {
src/pages/admin.astro:1413:function mailTo(id) {
src/pages/admin.astro:1418:window.mailTo = mailTo;
src/pages/confirm.astro:101:.cost-line.deposit { font-size: 12px; font-weight: 500; color: var(--text) }
src/pages/confirm.astro:231:          <div class="cost-line deposit"><span>Deposit due at booking (50%)</span><span id="cl-deposit"></span></div>
src/pages/confirm.astro:299:    document.getElementById('cs-ztn').textContent = data.ztn_number || '';
src/pages/confirm.astro:393:  const deposit = Math.round(total * 50) / 100;
src/pages/confirm.astro:394:  const balance = total - deposit;
src/pages/confirm.astro:406:  document.getElementById('cl-deposit').textContent = '$' + deposit.toFixed(2);
src/pages/confirm.astro:497:    const { data: numData, error: numErr } = await sb.rpc('next_booking_number');
src/pages/confirm.astro:505:    const deposit    = Math.round(finalTotal * 50) / 100;
src/pages/confirm.astro:506:    const balance    = finalTotal - deposit;
src/pages/confirm.astro:525:        ztn_number:      ztn,
src/pages/confirm.astro:529:        deposit:         '$' + deposit.toFixed(2),
src/pages/confirm.astro:550:        deposit,
```

### Confirm-only behaviors

```sh
rg -n 'next_booking_number|checkTravel|chQty|togAddon|DEFAULT_ADDONS|nominatim|project-osrm' src functions tests
```

Exit 0; 17 matching lines.

```text
src/pages/confirm.astro:186:            <button class="qty-btn" type="button" onclick="chQty('photos',-1)">−</button>
src/pages/confirm.astro:188:            <button class="qty-btn" type="button" onclick="chQty('photos',1)">+</button>
src/pages/confirm.astro:195:            <button class="qty-btn" type="button" onclick="chQty('prints',-1)">−</button>
src/pages/confirm.astro:197:            <button class="qty-btn" type="button" onclick="chQty('prints',1)">+</button>
src/pages/confirm.astro:215:            <button type="button" id="travel-btn" onclick="checkTravel()" style="flex-shrink:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);pa … [long line; see source]
src/pages/confirm.astro:320:const DEFAULT_ADDONS = [
src/pages/confirm.astro:343:  if (!list.length) list = DEFAULT_ADDONS;
src/pages/confirm.astro:346:    <div class="toggle-pill" data-name="${esc(a.name)}" data-price="${a.price}" onclick="togAddon(this)">
src/pages/confirm.astro:356:function chQty(t, d) {
src/pages/confirm.astro:370:window.chQty = chQty;
src/pages/confirm.astro:372:function togAddon(pill) {
src/pages/confirm.astro:379:window.togAddon = togAddon;
src/pages/confirm.astro:411:async function checkTravel() {
src/pages/confirm.astro:423:      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(venue),
src/pages/confirm.astro:434:      `https://router.project-osrm.org/route/v1/driving/${ZACH_LNG},${ZACH_LAT};${vLng},${vLat}?overview=false`
src/pages/confirm.astro:469:window.checkTravel = checkTravel;
src/pages/confirm.astro:497:    const { data: numData, error: numErr } = await sb.rpc('next_booking_number');
```

### Invoice-only behaviors

```sh
rg -n 'loadInvoice|inv-content|inv-line-items|inv-totals' src
```

Exit 0; 9 matching lines.

```text
src/pages/invoice.astro:93:.inv-totals {
src/pages/invoice.astro:149:  <div id="inv-content" style="display:none">
src/pages/invoice.astro:171:      <div id="inv-line-items"></div>
src/pages/invoice.astro:174:    <div class="inv-totals" id="inv-totals"></div>
src/pages/invoice.astro:190:async function loadInvoice() {
src/pages/invoice.astro:247:  const linesEl = document.getElementById('inv-line-items');
src/pages/invoice.astro:257:  const totalsEl = document.getElementById('inv-totals');
src/pages/invoice.astro:264:  document.getElementById('inv-content').style.display = 'block';
src/pages/invoice.astro:272:loadInvoice();
```

### Grouping adapters

```sh
rg -n 'groupBookings|getLegacy|legacyCard|refreshLegacy' src tests
```

Exit 0; 11 matching lines.

```text
tests/booking-groups.test.mjs:3:import {groupBookings} from '../src/lib/booking-groups.js';
tests/booking-groups.test.mjs:4:test('new and legacy pending requests share the top enquiry section',()=>{const g=groupBookings([{id:'new',status:'pending',created_at:'2026-10-02'}],[{id:'old',status:'pending', … [long line; see source]
tests/booking-groups.test.mjs:5:test('approval moves the same request into active bookings without duplication',()=>{const row={id:'one',status:'pending'};assert.equal(groupBookings([row]).new.length,1);row.sta … [long line; see source]
tests/booking-groups.test.mjs:6:test('unfinished and failed folder setup remain active; completed and declined records go to history',()=>{const statuses=['accepted','processing','folder_error','ready','publish … [long line; see source]
src/pages/admin.astro:692:const loadDeliveries = setupDeliveryAdmin(sb, {getLegacy:()=>allBookings, legacyCard:bookingCard, onChange:()=>{updateStats();renderOvBookings();}, refreshLegacy:loadBookings});
src/lib/delivery-admin.js:2:import {groupBookings} from './booking-groups.js';
src/lib/delivery-admin.js:19:    const groups=groupBookings(rows,options.getLegacy?.() || []);
src/lib/delivery-admin.js:28:          wrapper.innerHTML=options.legacyCard(row);list.append(wrapper);continue;
src/lib/delivery-admin.js:80:  document.getElementById('delivery-refresh').addEventListener('click',async()=>{if(!busy){await options.refreshLegacy?.();await load();}});
src/lib/delivery-admin.js:82:  window.addEventListener('focus',async()=>{if(!busy){await options.refreshLegacy?.();await load();}});
src/lib/booking-groups.js:3:export function groupBookings(deliveries=[],legacy=[]) {
```

### Package fallback and metadata retry

```sh
rg -n 'DEFAULT_PKGS|metaColError|fallbackErr|needs? the SQL|columns missing' src functions tests supabase HANDOFF.md REDESIGN.md public/robots.txt
```

Exit 0; 9 matching lines.

```text
src/pages/book.astro:333:const DEFAULT_PKGS = [
src/pages/book.astro:363:        features: DEFAULT_PKGS.find(x=>x.name===p.package_name)?.features || ['Photos included', 'Private gallery link'],
src/pages/book.astro:365:    : DEFAULT_PKGS;
src/pages/admin.astro:816:function metaColError(error) {
src/pages/admin.astro:818:    ? 'Title/location columns missing — run the SQL in HANDOFF.md first.'
src/pages/admin.astro:832:  if (error) { toast(metaColError(error)); return; }
src/pages/admin.astro:844:  if (error) { toast(metaColError(error)); return; }
src/pages/admin.astro:1048:      const { error: fallbackErr } = await sb.from('portfolio_photos').insert({
src/pages/admin.astro:1052:      if (!fallbackErr) status.textContent = 'Saved, but some fields need the SQL in HANDOFF.md: ' + insErr.message;
```

### Moved module consumers

```sh
rg -n 'delivery-admin|setupDeliveryAdmin|gallery\.js|makeTile|bindLightbox|openPhoto|photoAlt|site\.css|delivery\.css' src tests
```

Exit 0; 27 matching lines.

```text
src/pages/admin.astro:2:import '../styles/delivery.css';
src/pages/admin.astro:519:    <p class="delivery-status" id="delivery-admin-status" role="status" aria-live="polite"></p>
src/pages/admin.astro:685:import { setupDeliveryAdmin } from '../lib/delivery-admin.js';
src/pages/admin.astro:692:const loadDeliveries = setupDeliveryAdmin(sb, {getLegacy:()=>allBookings, legacyCard:bookingCard, onChange:()=>{updateStats();renderOvBookings();}, refreshLegacy:loadBookings});
src/pages/client-gallery.astro:3:import '../styles/delivery.css';
src/pages/client-details.astro:3:import '../styles/delivery.css';
src/lib/archive.js:2:import { makeTile, bindLightbox } from './gallery.js';
src/lib/archive.js:3:bindLightbox();
src/lib/archive.js:8:  const next=filtered.slice(shown,shown+BATCH);grid.append(...next.map((photo,i)=>makeTile(photo,shown+i,filtered,2)));shown+=next.length;
src/lib/home.js:2:import { makeTile, bindLightbox, openPhoto, photoAlt } from './gallery.js';
src/lib/home.js:3:bindLightbox();
src/lib/home.js:14:  coverImage.alt=photoAlt(photo);coverImage.hidden=false;
src/lib/home.js:20:  coverOpen.setAttribute('aria-label','View '+photoAlt(photo));coverOpen.disabled=false;
src/lib/home.js:25:coverOpen.addEventListener('click',()=>openPhoto(featured,coverIndex,coverOpen));
src/lib/home.js:36:  grid.replaceChildren(...photos.map((photo,i)=>makeTile(photo,i,photos,2)));
src/lib/delivery-admin.js:5:export function setupDeliveryAdmin(sb, options = {}) {
src/lib/delivery-admin.js:6:  const status=document.getElementById('delivery-admin-status');
src/lib/gallery.js:1:export function photoAlt(photo) { return [photo.title || photo.sport || 'Photograph', photo.location].filter(Boolean).join(', '); }
src/lib/gallery.js:7:export function bindLightbox() {
src/lib/gallery.js:26:  image.alt=photoAlt(photo);image.src=photo.web_url||photo.url||photo.thumb_url;
src/lib/gallery.js:28:  document.getElementById('viewer-caption').textContent=photoAlt(photo);
src/lib/gallery.js:33:export function openPhoto(photos,index,element) {
src/lib/gallery.js:40:export function makeTile(photo,index,photos,eagerCount=0) {
src/lib/gallery.js:42:  const button=document.createElement('button');button.type='button';button.className='photo-button';button.setAttribute('aria-label','View '+photoAlt(photo));
src/lib/gallery.js:43:  const image=document.createElement('img');image.loading=index<eagerCount?'eager':'lazy';image.decoding='async';image.alt=photoAlt(photo);
src/lib/gallery.js:48:  button.append(image);button.addEventListener('click',()=>openPhoto(photos,index,button));
src/layouts/Layout.astro:4:import '../styles/site.css';
```

### Global page blocks

```sh
rg -n '<style is:global>' src/pages
```

Exit 0; 12 matching lines.

```text
src/pages/coupon-card.astro:5:<style is:global>
src/pages/book.astro:6:<style is:global>
src/pages/gallery.astro:5:<style is:global>
src/pages/thanks.astro:5:<style is:global>
src/pages/login.astro:5:<style is:global>
src/pages/invoice.astro:5:<style is:global>
src/pages/privacy.astro:5:<style is:global>
src/pages/terms.astro:5:<style is:global>
src/pages/reset.astro:5:<style is:global>
src/pages/admin.astro:7:<style is:global>
src/pages/404.astro:5:<style is:global>
src/pages/confirm.astro:5:<style is:global>
```

### Font and canvas consumers

```sh
rg -n 'fonts/|Bodoni Moda|Public Sans|document\.fonts' src
```

Exit 0; 41 matching lines.

```text
src/pages/coupon-card.astro:67:    <div class="preview-label">preview <span style="font-size: 12px;opacity:.55;letter-spacing:0;text-transform:none;font-family:'Public Sans',sans-serif;margin-left:4px">(scaled)</span></div>
src/pages/coupon-card.astro:114:  ctx.font = '500 28px "Public Sans", sans-serif';
src/pages/coupon-card.astro:126:    ctx.font = '300 32px "Public Sans", sans-serif';
src/pages/coupon-card.astro:132:  ctx.font = '400 160px "Bodoni Moda", sans-serif';
src/pages/coupon-card.astro:137:  ctx.font = '500 44px "Public Sans", sans-serif';
src/pages/coupon-card.astro:143:  ctx.font = '700 80px "Public Sans", sans-serif';
src/pages/coupon-card.astro:155:    ctx.font = '400 30px "Public Sans", sans-serif';
src/pages/coupon-card.astro:161:  ctx.font = '400 26px "Public Sans", sans-serif';
src/pages/coupon-card.astro:174:  await document.fonts.ready;
src/pages/coupon-card.astro:183:document.fonts.ready.then(render);
src/pages/gallery.astro:93:  font-family: "Public Sans", sans-serif;
src/pages/gallery.astro:269:          'font-family:"Public Sans",sans-serif',
src/pages/gallery.astro:326:  ctx.font        = 'bold ' + sz + 'px "Public Sans", sans-serif';
src/pages/gallery.astro:374:        await document.fonts.load('600 16px "Public Sans"');
src/pages/admin.astro:39:  font-family: 'Public Sans', sans-serif;
src/pages/admin.astro:47:  font-family: 'Public Sans', sans-serif;
src/pages/admin.astro:141:  font-family: 'Public Sans', sans-serif; font-size: 12px; color: var(--text);
src/pages/admin.astro:1844:    envCtx.fillStyle = text3; envCtx.font = '600 28px "Public Sans"'; envCtx.letterSpacing='6px';
src/pages/admin.astro:1848:    if (client) { envCtx.fillStyle=text2; envCtx.font='300 36px "Public Sans"'; envCtx.fillText('For: '+client, 60, 185); }
src/pages/admin.astro:1850:    envCtx.fillStyle=text3; envCtx.font='400 28px "Public Sans"'; envCtx.letterSpacing='3px';
src/pages/admin.astro:1853:    envCtx.fillStyle=ink; envCtx.font='400 120px "Bodoni Moda"';
src/pages/admin.astro:1857:    if (msg) { envCtx.fillStyle=text2; envCtx.font='400 30px "Public Sans"'; envCtx.fillText(msg, 60, 700); }
src/pages/admin.astro:1860:    envCtx.fillStyle=text3; envCtx.font='400 26px "Public Sans"'; envCtx.letterSpacing='1px';
src/pages/admin.astro:1867:  document.fonts.ready.then(renderEnv);
src/pages/admin.astro:1870:    await document.fonts.ready;
src/pages/confirm.astro:108:  font-family: 'Public Sans', sans-serif; font-size: 14px; font-weight: 500;
src/layouts/Layout.astro:32:    <link rel="preload" href="/fonts/bodoni-moda-400-normal.ttf" as="font" type="font/ttf" crossorigin/>
src/layouts/Layout.astro:33:    <link rel="preload" href="/fonts/public-sans-400-normal.ttf" as="font" type="font/ttf" crossorigin/>
src/styles/fonts.css:2:  font-family: 'Bodoni Moda';
src/styles/fonts.css:6:  src: url(/fonts/bodoni-moda-400-italic.ttf) format('truetype');
src/styles/fonts.css:9:  font-family: 'Bodoni Moda';
src/styles/fonts.css:13:  src: url(/fonts/bodoni-moda-400-normal.ttf) format('truetype');
src/styles/fonts.css:16:  font-family: 'Bodoni Moda';
src/styles/fonts.css:20:  src: url(/fonts/bodoni-moda-500-normal.ttf) format('truetype');
src/styles/fonts.css:23:  font-family: 'Public Sans';
src/styles/fonts.css:27:  src: url(/fonts/public-sans-400-normal.ttf) format('truetype');
src/styles/fonts.css:30:  font-family: 'Public Sans';
src/styles/fonts.css:34:  src: url(/fonts/public-sans-500-normal.ttf) format('truetype');
src/styles/fonts.css:37:  font-family: 'Public Sans';
src/styles/fonts.css:41:  src: url(/fonts/public-sans-600-normal.ttf) format('truetype');
src/styles/global.css:3::root{color-scheme:light;--bg:#ffffff;--surface:#fafafa;--surface-dim:#eeeeee;--border:#d6d6d6;--border-2:#a8a8a8;--text:#111111;--text-2:#444444;--text-3:#666666;--ink:#111111;--ink-hov … [long line; see source]
```

### Candidate dead helpers

```sh
rg -n '\b(fmtBytes|calBlocks)\b' src functions tests
```

Exit 0; 2 matching lines.

```text
src/pages/admin.astro:735:function fmtBytes(bytes) {
src/pages/admin.astro:1421:let calYear, calMonth, calBlocks = [], selectedDate = null, blockType = null;
```

### Old section markup

```sh
rg -n 'class=['"'"'"][^'"'"'"]*\b(introduction|intro-copy|about-lede|nav-logo-img|legend-dot|cal-dot)\b|className\s*=\s*['"'"'"](legend-dot|cal-dot)['"'"'"]' src
```

Exit 1; 0 matching lines.

```text
No matches.
```

### Animation declarations/use

```sh
rg -n '\b(page-in|fade-in|rise-in|scale-in|draw-check)\b' src
```

Exit 0; 8 matching lines.

```text
src/pages/book.astro:27:  animation: rise-in .6s cubic-bezier(.16,1,.3,1) both;
src/pages/book.astro:208:.success-state.show { display: block; animation: scale-in .5s cubic-bezier(.16,1,.3,1) both }
src/pages/book.astro:211:  animation: draw-check .6s ease .25s both;
src/styles/global.css:53:@keyframes page-in{from{opacity:0}to{opacity:1}}
src/styles/global.css:54:@keyframes fade-in{from{opacity:0}to{opacity:1}}
src/styles/global.css:55:@keyframes rise-in{from{opacity:0}to{opacity:1}}
src/styles/global.css:56:@keyframes scale-in{from{opacity:0}to{opacity:1}}
src/styles/global.css:57:@keyframes draw-check{from{stroke-dashoffset:30}to{stroke-dashoffset:0}}
```

### Inline style/handler scope

```sh
rg -n '\bstyle\s*=|on(click|change|input|keydown)=|window\.[A-Za-z_$]+\s*=' src
```

Exit 0; 262 matching lines.

```text
src/pages/coupon-card.astro:24:  <a href="/" class="nav-logo" style="font-size: 12px;font-weight:600;letter-spacing: .01em;color:var(--text);text-decoration:none">ZRP</a>
src/pages/coupon-card.astro:31:    <div class="sec-label" style="margin-bottom:16px">customize</div>
src/pages/coupon-card.astro:35:      <input type="text" id="env-client" placeholder="e.g. Smith Family" oninput="render()"/>
src/pages/coupon-card.astro:39:      <input type="text" id="env-code" placeholder="e.g. SUMMER25" style="" oninput="this.value=this.value.toUpperCase();render()"/>
src/pages/coupon-card.astro:43:      <input type="text" id="env-discount" placeholder="e.g. 20% off" oninput="render()"/>
src/pages/coupon-card.astro:47:      <input type="text" id="env-msg" placeholder="Thank you for your business!" maxlength="60" oninput="render()"/>
src/pages/coupon-card.astro:51:      <input type="text" id="env-expiry" placeholder="e.g. Expires 12/31/2025" oninput="render()"/>
src/pages/coupon-card.astro:55:      <select id="env-style" onchange="render()">
src/pages/coupon-card.astro:61:    <button class="btn" style="width:100%;margin-top:6px" onclick="download()">Download PNG</button>
src/pages/coupon-card.astro:62:    <p style="font-size: 12px;color:var(--text-3);text-align:center;margin-top:8px">Print at 6×4 inches</p>
src/pages/coupon-card.astro:67:    <div class="preview-label">preview <span style="font-size: 12px;opacity:.55;letter-spacing:0;text-transform:none;font-family:'Public Sans',sans-serif;margin-left:4px">(scaled)</span></div>
src/pages/coupon-card.astro:83:  const style    = val('env-style');
src/pages/coupon-card.astro:84:  const isDark   = style === 'dark';
src/pages/coupon-card.astro:181:window.download = download;
src/pages/book.astro:216:  <div class="sec-label" style="margin-bottom:6px">book a session</div>
src/pages/book.astro:217:  <h1  style="font-size:24px;font-weight:300;letter-spacing:-.02em;margin-bottom:4px">Request a session</h1>
src/pages/book.astro:218:  <p  style="font-size:13px;color:var(--text-3);margin-bottom:32px">Choose a package, any add-ons, and a preferred date. Zachary will review your request before you complete the session details.</p>
src/pages/book.astro:223:    <div class="pkg-card unavail" style="height:120px"></div>
src/pages/book.astro:224:    <div class="pkg-card unavail" style="height:120px"></div>
src/pages/book.astro:225:    <div class="pkg-card unavail" style="height:120px"></div>
src/pages/book.astro:232:    <div style="position:absolute;left:-5000px;top:auto;height:0;overflow:hidden" aria-hidden="true">
src/pages/book.astro:241:      <hr class="divider" style="grid-column:1/-1"/>
src/pages/book.astro:248:            <button type="button" class="cal-nav" onclick="calShift(-1)" aria-label="Previous month">‹</button>
src/pages/book.astro:250:            <button type="button" class="cal-nav" onclick="calShift(1)" aria-label="Next month">›</button>
src/pages/book.astro:257:            <span class="lg-strike">15</span><span style="margin-left:-6px">booked</span>
src/pages/book.astro:264:        <input type="time" id="f-time" onclick="this.showPicker()" onkeydown="return false" style="cursor:pointer"/>
src/pages/book.astro:277:      <div id="type-questions" style="display:contents"></div>
src/pages/book.astro:279:      <hr class="divider" style="grid-column:1/-1"/>
src/pages/book.astro:286:        <div id="cost-lines" style="display:none">
src/pages/book.astro:288:          <div class="cost-line" id="cl-coupon" style="display:none;color:var(--green)"><span id="cl-coupon-n"></span><span id="cl-coupon-v"></span></div>
src/pages/book.astro:292:        <div style="display:flex;gap:8px;margin-top:12px">
src/pages/book.astro:293:          <input type="text" id="f-coupon" placeholder="Promo code (optional)" style="flex:1;min-width:0" oninput="this.value=this.value.toUpperCase()"/>
src/pages/book.astro:294:          <button type="button" class="btn" id="coupon-btn" onclick="applyCoupon()" style="flex-shrink:0">Apply</button>
src/pages/book.astro:296:        <div id="coupon-status" style="font-size: 12px;margin-top:6px;min-height:14px;color:var(--text-3)"></div>
src/pages/book.astro:299:      <hr class="divider" style="grid-column:1/-1"/>
src/pages/book.astro:321:    <h2 style="font-size:18px;font-weight:400;margin-bottom:8px">Request sent!</h2>
src/pages/book.astro:322:    <p style="font-size:13px;color:var(--text-3);line-height:1.7;max-width:340px;margin:0 auto">Your request is saved. Zachary will review it and contact you. After acceptance, you can complete the final session details.</p>
src/pages/book.astro:372:    <div class="pkg-card" role="button" tabindex="0" aria-pressed="false" id="pkg-${i}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick … [long line; see source]
src/pages/book.astro:390:window.selectPkg = selectPkg;
src/pages/book.astro:425:window.applyCoupon = applyCoupon;
src/pages/book.astro:550:window.calShift = calShift;
src/pages/gallery.astro:133:  <div id="not-found" class="not-found" style="display:none">
src/pages/gallery.astro:138:  <div id="gallery-content" style="display:none">
src/pages/gallery.astro:146:      <button class="dl-all" id="dl-all-btn" onclick="downloadAll()" style="display:none">
src/pages/gallery.astro:157:<dialog class="lightbox" id="lb" aria-label="Client photograph viewer" onclick="closeLB(event)">
src/pages/gallery.astro:158:  <button type="button" class="lb-close" aria-label="Close photograph viewer" onclick="closeLB()">×</button>
src/pages/gallery.astro:159:  <div style="position:relative;display:inline-block;max-width:90vw;max-height:80vh">
src/pages/gallery.astro:160:    <img id="lb-img" alt="" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:var(--radius);display:block"/>
src/pages/gallery.astro:161:    <div id="lb-wm" style="display:none;position:absolute;inset:0;pointer-events:none;user-select:none;overflow:hidden"></div>
src/pages/gallery.astro:226:    grid.innerHTML = '<p class="no-data" style="grid-column:1/-1;padding:40px;text-align:center">No photos in this gallery yet.</p>';
src/pages/gallery.astro:290:window.openLB = openLB;
src/pages/gallery.astro:297:window.closeLB = closeLB;
src/pages/gallery.astro:385:window.downloadPhoto = downloadPhoto;
src/pages/gallery.astro:399:window.downloadAll = downloadAll;
src/pages/thanks.astro:97:      <a href="/" class="btn" style="background:var(--surface);color:var(--text);border:1px solid var(--border)">Back to home</a>
src/pages/client-gallery.astro:6:  <div class="details-page" style="max-width:1120px">
src/pages/client-gallery.astro:11:    <button type="button" class="btn" id="drive-gallery-more" hidden style="margin-top:24px">Show more photographs</button>
src/pages/client-details.astro:21:      <p style="font-size:12px;margin-bottom:20px">These details are shared with Zachary to arrange your session. <a href="/privacy">Privacy policy</a>.</p>
src/pages/login.astro:53:  <button class="btn" style="width:100%;margin-top:4px" id="login-btn" type="submit">Sign in</button>
src/pages/login.astro:56:  <button class="forgot" id="forgot-btn" type="button" onclick="forgotPw()">Forgot password?</button>
src/pages/login.astro:112:window.doLogin = doLogin;
src/pages/login.astro:130:window.forgotPw = forgotPw;
src/pages/invoice.astro:142:  <div id="loading-state" style="text-align:center;padding:80px 24px">
src/pages/invoice.astro:143:    <p style="font-size:13px;color:var(--text-3)">Loading invoice…</p>
src/pages/invoice.astro:145:  <div class="not-found" id="not-found" style="display:none">
src/pages/invoice.astro:149:  <div id="inv-content" style="display:none">
src/pages/invoice.astro:153:        <div style="font-size:20px;font-weight:300;letter-spacing:-.02em;margin-top:4px">Invoice</div>
src/pages/invoice.astro:155:      <div style="text-align:right">
src/pages/invoice.astro:157:        <div style="font-size: 12px;color:var(--text-3);margin-top:3px" id="inv-date-display"></div>
src/pages/invoice.astro:176:    <button class="inv-print-btn" onclick="window.print()">
src/pages/privacy.astro:65:  <div class="sec-label" style="margin-bottom:8px">legal</div>
src/pages/privacy.astro:183:  <p style="font-size:12px;color:var(--text-3);line-height:1.8">If I make any meaningful changes to this policy, I'll update the date at the top. Questions? Just reach out.</p>
src/pages/terms.astro:57:  <div class="sec-label" style="margin-bottom:8px">legal</div>
src/pages/terms.astro:103:  <p style="font-size:12px;color:var(--text-3);line-height:1.8">If these terms change meaningfully, the date at the top gets updated. See also the <a href="/privacy">Privacy Policy</a>.</p>
src/pages/reset.astro:30:  <div id="form-wrap" style="display:none">
src/pages/reset.astro:39:    <button class="btn" style="width:100%;margin-top:4px" id="save-btn" onclick="savePw()">Save new password</button>
src/pages/reset.astro:115:window.savePw = savePw;
src/pages/admin.astro:373:    <button class="sb-link active" onclick="switchTab('overview',this)">
src/pages/admin.astro:376:    <button class="sb-link" onclick="switchTab('upload',this)">
src/pages/admin.astro:379:    <button class="sb-link" id="gallery-nav" onclick="switchTab('galleries',this)">
src/pages/admin.astro:382:    <button class="sb-link" id="bookings-nav" onclick="switchTab('bookings',this)">
src/pages/admin.astro:386:    <button class="sb-link" onclick="switchTab('calendar',this)">
src/pages/admin.astro:390:    <button class="sb-link" onclick="switchTab('pricing',this)">
src/pages/admin.astro:394:    <button class="sb-link" onclick="switchTab('coupons',this)">
src/pages/admin.astro:398:    <button class="sb-link" onclick="switchTab('envelope',this)">
src/pages/admin.astro:406:    <button class="logout-btn" onclick="doLogout()">Sign out</button>
src/pages/admin.astro:416:    <p style="margin-bottom:24px"><a href="#enquiries" onclick="switchTab('bookings',document.getElementById('bookings-nav'))">Review enquiries and bookings</a></p>
src/pages/admin.astro:441:    <div style="display:flex;gap:8px">
src/pages/admin.astro:442:      <div class="field" style="flex:1"><label>Title (optional)</label><input type="text" id="up-title" placeholder="e.g. Friday night lights"/></div>
src/pages/admin.astro:443:      <div class="field" style="flex:1"><label>Location (optional)</label><input type="text" id="up-location" placeholder="e.g. Bazemore-Hyder Stadium"/></div>
src/pages/admin.astro:445:    <p style="font-size: 12px;color:var(--text-3);margin:4px 0 10px">Applies to every file in this upload — edit per photo after with the Edit button.</p>
src/pages/admin.astro:446:    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
src/pages/admin.astro:447:      <input type="checkbox" id="up-portfolio" style="width:14px;height:14px;accent-color:var(--text)"/>
src/pages/admin.astro:448:      <label for="up-portfolio" style="font-size:12px;color:var(--text-2);cursor:pointer">Add to the public Portfolio page</label>
src/pages/admin.astro:450:    <p style="font-size: 12px;color:var(--text-3);margin:-4px 0 10px">Photos are automatically resized for the web on upload — the full-size original is kept for client downloads.</p>
src/pages/admin.astro:451:    <div class="drop-zone" id="drop-zone" onclick="document.getElementById('file-input').click()">
src/pages/admin.astro:459:    <div id="optimize-row" style="display:none;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
src/pages/admin.astro:460:      <button class="btn-sm" id="optimize-btn" onclick="optimizeExisting()">Optimize existing photos</button>
src/pages/admin.astro:461:      <span id="optimize-status" style="font-size: 12px;color:var(--text-3)"></span>
src/pages/admin.astro:466:          <input type="checkbox" id="select-all-cb" onchange="toggleSelectAll(this.checked)"/>
src/pages/admin.astro:470:      <div class="bulk-actions" id="bulk-actions" style="display:none">
src/pages/admin.astro:471:        <div style="display:flex;align-items:center;gap:6px">
src/pages/admin.astro:478:          <button class="btn-sm on-ink" onclick="bulkChangeSport()">Apply</button>
src/pages/admin.astro:480:        <div style="display:flex;align-items:center;gap:6px">
src/pages/admin.astro:482:          <button class="btn-sm on-ink" onclick="bulkAddToGallery()">Apply</button>
src/pages/admin.astro:484:        <div style="display:flex;align-items:center;gap:6px">
src/pages/admin.astro:490:          <button class="btn-sm on-ink" onclick="bulkSetPortfolio()">Apply</button>
src/pages/admin.astro:492:        <button class="btn-sm on-ink" onclick="bulkSetLocation()">Set location</button>
src/pages/admin.astro:493:        <button class="btn-sm red" onclick="bulkDelete()">Delete selected</button>
src/pages/admin.astro:505:      <button class="btn" onclick="createGallery()" style="align-self:flex-end">Create gallery</button>
src/pages/admin.astro:542:      <button class="btype-btn" onclick="applyBulk('unavailable')">Full day — unavailable</button>
src/pages/admin.astro:543:      <button class="btype-btn" onclick="applyBulk('available')">Mark available</button>
src/pages/admin.astro:544:      <button class="btype-btn" onclick="applyBulk('clear')">Clear</button>
src/pages/admin.astro:545:      <button class="btn-sm" onclick="toggleBulkMode()" style="margin-left:auto">Cancel bulk</button>
src/pages/admin.astro:548:    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
src/pages/admin.astro:549:      <button class="btn-sm" id="bulk-mode-btn" onclick="toggleBulkMode()">Bulk select</button>
src/pages/admin.astro:556:          <button class="cal-nav-btn" onclick="shiftMonth(-1)"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
src/pages/admin.astro:557:          <button class="cal-nav-btn" onclick="shiftMonth(1)"><svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg></button>
src/pages/admin.astro:574:        <button class="btype-btn" id="btn-unavail" onclick="setBlockType('unavailable')">Full day — unavailable</button>
src/pages/admin.astro:575:        <button class="btype-btn" id="btn-partial" onclick="setBlockType('partial')">Partial block</button>
src/pages/admin.astro:576:        <button class="btype-btn" id="btn-avail" onclick="setBlockType('available')">Mark available</button>
src/pages/admin.astro:577:        <button class="btype-btn" id="btn-clear" onclick="setBlockType('clear')">Clear</button>
src/pages/admin.astro:580:        <div class="field" style="margin:0"><label>From</label><input type="time" id="block-start" value="09:00"/></div>
src/pages/admin.astro:581:        <div class="field" style="margin:0"><label>To</label><input type="time" id="block-end" value="17:00"/></div>
src/pages/admin.astro:585:        <button class="btn" onclick="saveBlock()">Save</button>
src/pages/admin.astro:586:        <button class="btn-sm" onclick="closeEditor()">Cancel</button>
src/pages/admin.astro:599:    <div class="sec-label" style="margin-top:24px">add-ons</div>
src/pages/admin.astro:601:    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;align-items:center">
src/pages/admin.astro:602:      <input type="text" id="new-addon-name" placeholder="New add-on (e.g. Second photographer)" style="flex:1;min-width:200px"/>
src/pages/admin.astro:603:      <input type="number" id="new-addon-price" placeholder="$" min="0" style="width:90px"/>
src/pages/admin.astro:604:      <button class="btn-sm on-ink" onclick="addAddon()">Add</button>
src/pages/admin.astro:605:      <button class="btn-sm" onclick="seedAddons()">Add starter pack</button>
src/pages/admin.astro:607:    <p style="font-size: 12px;color:var(--text-3);margin-top:8px">Available add-ons show up on the client's booking confirmation page automatically.</p>
src/pages/admin.astro:614:    {!BOOKING_OPEN && <p class="main-sub" style="color:var(--amber)">Online booking is turned off right now, so coupon links open the contact section instead of the booking form. Turn  … [long line; see source]
src/pages/admin.astro:616:      <div class="sec-label" style="margin-bottom:14px">new coupon</div>
src/pages/admin.astro:618:        <div class="field" style="margin:0"><label>Code</label><input type="text" id="cp-code" placeholder="e.g. SUMMER25" style="" oninput="this.value=this.value.toUpperCase()"/></div>
src/pages/admin.astro:619:        <div class="field" style="margin:0"><label>Type</label>
src/pages/admin.astro:620:          <select id="cp-type" onchange="onCouponTypeChange()">
src/pages/admin.astro:626:        <div class="field" style="margin:0" id="cp-value-wrap"><label id="cp-value-label">Discount %</label><input type="number" id="cp-value" placeholder="e.g. 20" min="0"/></div>
src/pages/admin.astro:627:        <div class="field" style="margin:0"><label>Expires (optional)</label><input type="date" id="cp-expires"/></div>
src/pages/admin.astro:628:        <div class="field" style="margin:0"><label>Max uses (optional)</label><input type="number" id="cp-max-uses" placeholder="Unlimited"/></div>
src/pages/admin.astro:629:        <div class="field" style="margin:0;justify-content:flex-end">
src/pages/admin.astro:630:          <label style="opacity:0">.</label>
src/pages/admin.astro:631:          <button class="btn" style="width:100%" onclick="createCoupon()">Create coupon</button>
src/pages/admin.astro:645:        <div class="sec-label" style="margin-bottom:4px">customize</div>
src/pages/admin.astro:646:        <div class="field" style="margin:0"><label>Client name</label><input type="text" id="env-client" placeholder="e.g. Smith Family" oninput="renderEnv()"/></div>
src/pages/admin.astro:647:        <div class="field" style="margin:0"><label>Style</label>
src/pages/admin.astro:648:          <select id="env-style" onchange="renderEnv()">
src/pages/admin.astro:653:        <div class="field" style="margin:0"><label>Message</label><input type="text" id="env-msg" placeholder="Thank you for your order!" maxlength="60" oninput="renderEnv()"/></div>
src/pages/admin.astro:654:        <button class="btn" style="width:100%;margin-top:4px" onclick="downloadEnv()">Download PNG</button>
src/pages/admin.astro:655:        <p style="font-size: 12px;color:var(--text-3);text-align:center;margin-top:8px">Print at 6×4 inches</p>
src/pages/admin.astro:656:        <a href="/coupon-card" target="_blank" style="font-size: 12px;color:var(--text-3);text-align:center;display:block;margin-top:6px;text-decoration:none">Open coupon card generator →</a>
src/pages/admin.astro:659:        <div class="sec-label" style="margin-bottom:12px">preview</div>
src/pages/admin.astro:677:      <button class="btn-sm" onclick="closeDeleteModal()">Cancel</button>
src/pages/admin.astro:678:      <button class="btn-sm red" id="del-confirm" onclick="confirmDeleteBooking()" disabled>Delete booking</button>
src/pages/admin.astro:699:window.doLogout = doLogout;
src/pages/admin.astro:716:window.switchTab = switchTab;
src/pages/admin.astro:764:          onchange="togglePhotoSelect('${p.id}',this.checked)" onclick="event.stopPropagation()"/>
src/pages/admin.astro:767:        onclick="photoCardClick('${p.id}')" style="cursor:pointer"/>
src/pages/admin.astro:769:        <div class="photo-sport">${esc(p.sport || 'No category')}${p.location ? ' · ' + esc(p.location) : ''}${p.on_portfolio ? ' · <span style="color:var(--accent)">◆ Portfolio</span>' : ''}</div>
src/pages/admin.astro:773:        <button class="btn-sm" onclick="editPhotoMeta('${p.id}')">Edit</button>
src/pages/admin.astro:774:        <button class="btn-sm red" onclick="delPhoto('${p.id}','${p.storage_path}')">Del</button>
src/pages/admin.astro:792:    <span style="font-family:var(--font-sans);font-size: 12px;letter-spacing: .01em;color:var(--text-3)">
src/pages/admin.astro:795:    <div style="display:flex;gap:6px">
src/pages/admin.astro:796:      <button class="btn-sm" onclick="setPhotoPage(${photoPage-1})" ${photoPage===0?'disabled style="opacity:.3"':''}>← Prev</button>
src/pages/admin.astro:797:      <button class="btn-sm" onclick="setPhotoPage(${photoPage+1})" ${photoPage>=totalPages-1?'disabled style="opacity:.3"':''}>Next →</button>
src/pages/admin.astro:801:window.setPhotoPage = setPhotoPage;
src/pages/admin.astro:809:window.togglePhotoSelect = togglePhotoSelect;
src/pages/admin.astro:813:window.photoCardClick = photoCardClick;
src/pages/admin.astro:835:window.editPhotoMeta = editPhotoMeta;
src/pages/admin.astro:847:window.bulkSetLocation = bulkSetLocation;
src/pages/admin.astro:850:window.toggleSelectAll = toggleSelectAll;
src/pages/admin.astro:902:window.delPhoto = delPhoto;
src/pages/admin.astro:910:window.bulkChangeSport = bulkChangeSport;
src/pages/admin.astro:918:window.bulkAddToGallery = bulkAddToGallery;
src/pages/admin.astro:939:window.bulkSetPortfolio = bulkSetPortfolio;
src/pages/admin.astro:958:window.bulkDelete = bulkDelete;
src/pages/admin.astro:1122:window.optimizeExisting = optimizeExisting;
src/pages/admin.astro:1144:        <button class="btn-sm ${g.watermarked ? 'on-amber' : ''}" onclick="toggleWatermark('${g.id}',${!!g.watermarked})" title="Toggle watermark">
src/pages/admin.astro:1147:        <button class="btn-sm" onclick="copyLink('${link}')">Copy link</button>
src/pages/admin.astro:1149:        <button class="btn-sm red" onclick="deleteGallery('${g.id}','${g.name}')">Delete</button>
src/pages/admin.astro:1160:window.toggleWatermark = toggleWatermark;
src/pages/admin.astro:1171:window.createGallery = createGallery;
src/pages/admin.astro:1179:window.deleteGallery = deleteGallery;
src/pages/admin.astro:1185:window.copyLink = copyLink;
src/pages/admin.astro:1254:      ${b.addons_selected ? `<div class="booking-detail" style="grid-column:1/-1"><strong>Add-ons</strong>${esc(b.addons_selected)}</div>` : ''}
src/pages/admin.astro:1255:      ${b.notes ? `<div class="booking-detail" style="grid-column:1/-1"><strong>Notes</strong>${esc(b.notes)}</div>` : ''}
src/pages/admin.astro:1256:      ${b.gallery_id ? `<div class="booking-detail" style="grid-column:1/-1"><strong>Gallery</strong>${gal
src/pages/admin.astro:1257:        ? `<a href="/gallery?g=${encodeURIComponent(gal.slug)}" target="_blank" style="color:var(--text-2);text-decoration:underline">${esc(gal.name || gal.slug)}</a>`
src/pages/admin.astro:1261:      ${status === 'pending'   ? `<button class="btn-sm green"  onclick="acceptBooking('${id}')" title="Accept and email client with confirm link">Accept</button>` : ''}
src/pages/admin.astro:1262:      ${status === 'accepted'  ? `<button class="btn-sm on-ink" onclick="setStatus('${id}','confirmed')">Mark confirmed</button>` : ''}
src/pages/admin.astro:1263:      ${status === 'confirmed' ? `<button class="btn-sm on-ink" onclick="setStatus('${id}','delivered')">Mark delivered</button>` : ''}
src/pages/admin.astro:1264:      ${status !== 'cancelled' ? `<button class="btn-sm red"    onclick="setStatus('${id}','cancelled')">Cancel</button>` : ''}
src/pages/admin.astro:1265:      ${status !== 'pending'   ? `<button class="btn-sm"        onclick="setStatus('${id}','pending')">Reset</button>` : ''}
src/pages/admin.astro:1267:      ${b.email ? `<button class="btn-sm" onclick="mailTo('${id}')" title="Open email client">Email</button>` : ''}
src/pages/admin.astro:1268:      ${isPastBooking(b) ? `<button class="btn-sm red" style="margin-left:auto" onclick="openDeleteModal('${id}')">Delete</button>` : ''}
src/pages/admin.astro:1293:window.openDeleteModal = openDeleteModal;
src/pages/admin.astro:1300:window.closeDeleteModal = closeDeleteModal;
src/pages/admin.astro:1333:window.confirmDeleteBooking = confirmDeleteBooking;
src/pages/admin.astro:1405:window.acceptBooking = acceptBooking;
src/pages/admin.astro:1411:window.setStatus = setStatus;
src/pages/admin.astro:1418:window.mailTo = mailTo;
src/pages/admin.astro:1438:window.toggleBulkMode = toggleBulkMode;
src/pages/admin.astro:1463:window.applyBulk = applyBulk;
src/pages/admin.astro:1533:      <button class="btn-sm red" onclick="deleteBlock('${b.id}')">Remove</button>
src/pages/admin.astro:1543:window.shiftMonth = shiftMonth;
src/pages/admin.astro:1570:window.setBlockType = setBlockType;
src/pages/admin.astro:1595:window.saveBlock = saveBlock;
src/pages/admin.astro:1603:window.deleteBlock = deleteBlock;
src/pages/admin.astro:1610:window.closeEditor = closeEditor;
src/pages/admin.astro:1641:            onchange="toggleSale('${pkg.id}',this.checked)"/>
src/pages/admin.astro:1646:            onchange="toggleAvail('${pkg.id}',this.checked,'pkg')"/>
src/pages/admin.astro:1649:        <button class="save-price-btn" onclick="savePkg('${pkg.id}')">Save</button>
src/pages/admin.astro:1659:      <div style="display:flex;align-items:center;gap:14px">
src/pages/admin.astro:1661:          <input type="checkbox" ${a.available!==false?'checked':''} onchange="toggleAvail('${a.id}',this.checked,'addon')"/>
src/pages/admin.astro:1664:        <button class="btn-sm red" onclick="deleteAddon('${a.id}')">Delete</button>
src/pages/admin.astro:1691:window.addAddon = addAddon;
src/pages/admin.astro:1704:window.seedAddons = seedAddons;
src/pages/admin.astro:1712:window.deleteAddon = deleteAddon;
src/pages/admin.astro:1718:window.toggleSale = toggleSale;
src/pages/admin.astro:1728:window.savePkg = savePkg;
src/pages/admin.astro:1735:window.toggleAvail = toggleAvail;
src/pages/admin.astro:1752:window.onCouponTypeChange = onCouponTypeChange;
src/pages/admin.astro:1769:window.createCoupon = createCoupon;
src/pages/admin.astro:1794:        <button class="btn-sm" onclick="toggleCoupon('${c.id}',${c.active})">${c.active ? 'Deactivate' : 'Activate'}</button>
src/pages/admin.astro:1795:        <button class="btn-sm" onclick="copyCouponLink('${c.code}')">Copy link</button>
src/pages/admin.astro:1796:        <button class="btn-sm red" onclick="deleteCoupon('${c.id}')">Delete</button>
src/pages/admin.astro:1806:window.toggleCoupon = toggleCoupon;
src/pages/admin.astro:1813:window.deleteCoupon = deleteCoupon;
src/pages/admin.astro:1820:window.copyCouponLink = copyCouponLink;
src/pages/admin.astro:1866:  window.renderEnv = renderEnv;
src/pages/admin.astro:1874:  window.downloadEnv = downloadEnv;
src/pages/confirm.astro:137:  <div id="loading-state" style="text-align:center;padding:80px 24px">
src/pages/confirm.astro:138:    <p style="font-size:13px;color:var(--text-3)">Loading your booking…</p>
src/pages/confirm.astro:144:    <h2 style="font-size:18px;font-weight:400;margin-bottom:6px">Already confirmed</h2>
src/pages/confirm.astro:146:    <p style="font-size:13px;color:var(--text-3);line-height:1.7">Your booking is confirmed. Check your email for full details and your invoice link.</p>
src/pages/confirm.astro:152:    <h2 style="font-size:18px;font-weight:400;margin-bottom:8px">Not ready yet</h2>
src/pages/confirm.astro:153:    <p style="font-size:13px;color:var(--text-3);line-height:1.7">Zachary hasn't accepted this request yet. When he does, you'll get an email and this link will work.</p>
src/pages/confirm.astro:159:    <h2 style="font-size:18px;font-weight:400;margin-bottom:8px">Link not found</h2>
src/pages/confirm.astro:160:    <p style="font-size:13px;color:var(--text-3);line-height:1.7">This link may have expired or been used already. Contact Zachary directly if you have questions.</p>
src/pages/confirm.astro:164:  <div id="form-state" style="display:none">
src/pages/confirm.astro:165:    <div class="sec-label" style="margin-bottom:6px">complete booking</div>
src/pages/confirm.astro:166:    <h1 style="font-size:24px;font-weight:300;letter-spacing:-.02em;margin-bottom:4px">Finalize your session</h1>
src/pages/confirm.astro:167:    <p style="font-size:13px;color:var(--text-3);margin-bottom:28px">Add your location, any extras, and we're set.</p>
src/pages/confirm.astro:181:    <div style="margin-bottom:32px">
src/pages/confirm.astro:186:            <button class="qty-btn" type="button" onclick="chQty('photos',-1)">−</button>
src/pages/confirm.astro:188:            <button class="qty-btn" type="button" onclick="chQty('photos',1)">+</button>
src/pages/confirm.astro:195:            <button class="qty-btn" type="button" onclick="chQty('prints',-1)">−</button>
src/pages/confirm.astro:197:            <button class="qty-btn" type="button" onclick="chQty('prints',1)">+</button>
src/pages/confirm.astro:213:          <div style="display:flex;gap:8px">
src/pages/confirm.astro:214:            <input type="text" id="f-venue" placeholder="e.g. Drexel Park, Valdosta" required style="flex:1;min-width:0"/>
src/pages/confirm.astro:215:            <button type="button" id="travel-btn" onclick="checkTravel()" style="flex-shrink:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);pa … [long line; see source]
src/pages/confirm.astro:217:          <div id="travel-status" style="font-size: 12px;margin-top:5px;min-height:16px;color:var(--text-3)"></div>
src/pages/confirm.astro:220:        <hr class="divider" style="grid-column:1/-1"/>
src/pages/confirm.astro:235:        <hr class="divider" style="grid-column:1/-1"/>
src/pages/confirm.astro:250:        <hr class="divider" style="grid-column:1/-1"/>
src/pages/confirm.astro:346:    <div class="toggle-pill" data-name="${esc(a.name)}" data-price="${a.price}" onclick="togAddon(this)">
src/pages/confirm.astro:370:window.chQty = chQty;
src/pages/confirm.astro:379:window.togAddon = togAddon;
src/pages/confirm.astro:469:window.checkTravel = checkTravel;
src/layouts/Layout.astro:56:        window.zrpTheme = {
src/layouts/Layout.astro:131:        window.dismissConsent = dismiss;
```

## All named source functions

This inventory includes declaration names and file positions for the read scope. Generic names repeat across page-local modules; a shared name is not an import dependency.

### src/lib/archive.js

append:7, filter:11

### src/lib/booking-groups.js

groupBookings:3

### src/lib/delivery-admin.js

node:4, setupDeliveryAdmin:5, session:8, act:12, show:13, load:14, render:18, button:45, link:53

### src/lib/delivery-api.js

delivery:1, copyPrivateLink:9

### src/lib/gallery.js

photoAlt:1, bindLightbox:7, showPhoto:20, step:32, openPhoto:33, closeLightbox:39, makeTile:40

### src/lib/home.js

coverPhoto:10, selection:26, filter:33, showUnavailable:41

### src/lib/portfolio.js

publicRows:3, loadPublicPhotos:12, loadStartingPrice:15, renderCategoryFilters:20, syncCategoryFilters:35

### src/pages/admin.astro

doLogout:698, toast:701, switchTab:708, loadAll:721, updateStats:726, fmtBytes:735, loadPhotos:747, renderPhotos:755, renderPhotoPager:781, setPhotoPage:800, togglePhotoSelect:803, photoCardClick:812, metaColError:816, editPhotoMeta:822, bulkSetLocation:837, toggleSelectAll:849, updateBulkBar:852, populateGalDropdowns:860, apiAuthHeader:875, photoKeys:881, delPhoto:886, bulkChangeSport:904, bulkAddToGallery:912, bulkSetPortfolio:921, bulkDelete:941, makeVariant:975, uploadBlob:992, handleFiles:1001, syncOptimizeButton:1066, optimizeExisting:1075, loadGalleries:1125, renderGalleries:1132, toggleWatermark:1155, createGallery:1162, deleteGallery:1173, copyLink:1181, esc:1188, todayStr:1192, isPastBooking:1199, loadBookings:1206, renderBookings:1213, renderOvBookings:1218, bookingCard:1225, openDeleteModal:1276, closeDeleteModal:1295, deletePhraseMatches:1302, confirmDeleteBooking:1315, acceptBooking:1335, setStatus:1407, mailTo:1413, toggleBulkMode:1424, updateCalBulkBar:1440, applyBulk:1447, loadBlocks:1465, renderCalendar:1470, shiftMonth:1537, openEditor:1545, setBlockType:1560, saveBlock:1572, deleteBlock:1597, closeEditor:1605, loadPricing:1613, renderPricing:1619, addAddon:1681, seedAddons:1693, deleteAddon:1706, toggleSale:1714, savePkg:1720, toggleAvail:1730, loadCoupons:1738, onCouponTypeChange:1744, createCoupon:1754, renderCoupons:1771, toggleCoupon:1802, deleteCoupon:1808, copyCouponLink:1815, renderEnv:1829, downloadEnv:1869

### src/pages/book.astro

loadAddons:343, loadPackages:352, renderPackages:369, selectPkg:382, validateCoupon:395, applyCoupon:408, couponDiscount:427, updateCostBox:436, localToday:462, dayStatus:467, loadAvailability:476, renderCal:486, pickDate:534, calShift:544, renderTypeQuestions:587, collectTypeAnswers:605, showSuccessState:619

### src/pages/client-details.astro

session:39, receipt:45, load:50

### src/pages/client-gallery.astro

fileUrl:22, render:23

### src/pages/confirm.astro

init:283, esc:326, loadAddons:330, show:352, hide:353, chQty:356, togAddon:372, showLine:381, updateCost:387, checkTravel:411

### src/pages/coupon-card.astro

val:80, render:82, download:173

### src/pages/gallery.astro

loadGallery:177, showNotFound:221, renderGallery:223, openLB:246, closeLB:292, watermarkCanvas:311, saveBlob:352, downloadPhoto:358, downloadAll:387

### src/pages/invoice.astro

loadInvoice:190, showNotFound:267

### src/pages/login.astro

showErr:73, showOk:79, friendlyError:87, doLogin:96, forgotPw:114

### src/pages/reset.astro

enableForm:61, savePw:85

## Complete CSS selector inventory by old owner

For each class listed below, the executed search was `rg -l '\bCLASS\b' src -g '!OWNER'`, substituting the exact class and owner shown. These searches identify other owners that must migrate, rather than falsely treating shared rules as dead.

These are the page-global blocks being removed or merged. Global shared class collisions are preserved by migration, not declared unused.

### src/pages/404.astro

```css
.nf
.nf-inner
.nf-code
.nf h1
.nf h1 em
.nf p
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`nf`: src/styles/site.css
`nf-code`: none outside owner
`nf-inner`: src/styles/site.css

### src/pages/admin.astro

```css
html,body
.layout
.sidebar
.sidebar-logo
.sidebar-nav
.sb-link
.sb-link:hover, .sb-link.active
.sb-link svg
.sidebar-footer
.logout-btn
.logout-btn:hover
@media (max-width: 700px)
.sidebar
.sidebar-logo
.sidebar-nav
.sb-link
.sb-link svg
.sidebar-footer
.logout-btn
.main
@media (max-width: 700px)
.tab
.tab.active
.main-title
.main-sub
.stats-row
.stat-n
.stat-l
.field
.drop-zone
.drop-zone:hover, .drop-zone.dragover
.drop-zone input
.drop-text
.drop-sub
.prog-wrap
.prog-bar
.upload-status
.photos-grid
.photo-card
.photo-card.selected
.photo-cb-wrap
.photo-cb
.photo-card img
.photo-card-info
.photo-sport
.photo-name
.photo-actions
.bulk-bar
.bulk-left
.bulk-select-all
.bulk-select-all input
.bulk-actions
.bulk-select
.bulk-select option
.gal-form
.gal-form .field
.gal-list
.gal-row
.gal-info h3
.gal-info p
.gal-actions
.booking-list
.booking-card
.booking-head
.booking-name
.booking-num
.booking-badges
.badge
.badge.pending
.badge.accepted
.badge.approved
.badge.confirmed
.badge.delivered
.badge.cancelled
.badge.pkg
.booking-details
.booking-detail
.booking-detail strong
.booking-actions
.cal-wrap
.cal-header
.cal-month
.cal-nav
.cal-nav-btn
.cal-nav-btn:hover
.cal-nav-btn svg
.cal-grid
.cal-dow
.cal-day
.cal-day:hover
.cal-day.empty, .cal-day.past
.cal-day.past
.cal-day.today
.cal-day.selected
.cal-day.unavailable
.cal-day.partial
.cal-day.available
.cal-day.bulk-sel
.cal-bulk-bar
.cal-bulk-bar.visible
.bulk-bar-label
.availability-mark
.cal-legend
.cal-legend-item
.legend-dot
.day-editor
.day-editor.open
.day-editor-title
.block-type-row
.btype-btn
.btype-btn.sel-unavail
.btype-btn.sel-partial
.btype-btn.sel-avail
.btype-btn.sel-clear
.time-row
.time-row.hidden
.editor-actions
.blocks-list
.block-row
.block-row-left
.block-row-left strong
.block-status-badge
.block-status-badge.unavailable
.block-status-badge.partial
.block-status-badge.available
.pricing-card
.pricing-card.on-sale
.pricing-card.unavailable
.pricing-pkg-name
.pricing-pkg-sub
.pricing-right
.pricing-row
.pricing-row label
.pricing-row input[type="number"]
.pricing-row input[type="number"]:focus
.pricing-row input[type="number"]:disabled
.pricing-toggle
.pricing-toggle input[type="checkbox"]
.pricing-toggle-label
.save-price-btn
.save-price-btn:hover
.addon-card
.addon-card.unavailable
.addon-name
.addon-price
.avail-toggle
.avail-toggle input
.coupon-form-card
.coupon-form-grid
@media (max-width: 800px)
@media (max-width: 500px)
.coupon-list
.coupon-row
.coupon-row.inactive
.coupon-code
.coupon-info
.coupon-meta
.coupon-badge
.coupon-badge.percent
.coupon-badge.fixed
.coupon-badge.travel
.coupon-badge.expired, .coupon-badge.inactive-badge
.coupon-actions
.env-page
@media (max-width: 700px)
.env-controls
.canvas-wrap
.canvas-wrap canvas
.del-modal
.del-modal.open
.del-box
.del-box h2
.del-summary
.del-warn
.del-box label
.del-box input
.del-actions
.booking-actions
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`accepted`: src/pages/client-details.astro, src/pages/terms.astro, src/pages/confirm.astro, src/lib/delivery-admin.js, src/layouts/Layout.astro
`active`: src/pages/book.astro, src/pages/confirm.astro, src/lib/archive.js, src/lib/portfolio.js, src/lib/delivery-admin.js, src/lib/booking-groups.js, src/styles/site.css
`addon-card`: none outside owner
`addon-name`: none outside owner
`addon-price`: none outside owner
`approved`: src/pages/book.astro
`avail-toggle`: none outside owner
`availability-mark`: src/pages/book.astro
`available`: src/pages/book.astro, src/pages/client-gallery.astro, src/pages/privacy.astro, src/pages/confirm.astro, src/lib/portfolio.js, src/lib/delivery-admin.js
`badge`: src/pages/book.astro, src/pages/gallery.astro, src/styles/site.css
`block-row`: none outside owner
`block-row-left`: none outside owner
`block-status-badge`: src/styles/site.css
`block-type-row`: none outside owner
`blocks-list`: none outside owner
`booking-actions`: none outside owner
`booking-badges`: none outside owner
`booking-card`: src/styles/delivery.css
`booking-detail`: none outside owner
`booking-details`: none outside owner
`booking-head`: none outside owner
`booking-list`: src/lib/delivery-admin.js
`booking-name`: src/styles/delivery.css
`booking-num`: src/pages/thanks.astro
`btype-btn`: none outside owner
`bulk-actions`: none outside owner
`bulk-bar`: none outside owner
`bulk-bar-label`: none outside owner
`bulk-left`: none outside owner
`bulk-sel`: none outside owner
`bulk-select`: none outside owner
`bulk-select-all`: none outside owner
`cal-bulk-bar`: none outside owner
`cal-day`: none outside owner
`cal-dow`: src/pages/book.astro
`cal-grid`: none outside owner
`cal-header`: none outside owner
`cal-legend`: src/pages/book.astro, src/styles/site.css
`cal-legend-item`: none outside owner
`cal-month`: none outside owner
`cal-nav`: src/pages/book.astro
`cal-nav-btn`: none outside owner
`cal-wrap`: none outside owner
`cancelled`: src/lib/booking-groups.js
`canvas-wrap`: src/pages/coupon-card.astro
`confirmed`: src/pages/book.astro, src/pages/login.astro, src/pages/terms.astro, src/pages/confirm.astro
`coupon-actions`: none outside owner
`coupon-badge`: src/styles/site.css
`coupon-code`: none outside owner
`coupon-form-card`: none outside owner
`coupon-form-grid`: none outside owner
`coupon-info`: none outside owner
`coupon-list`: none outside owner
`coupon-meta`: none outside owner
`coupon-row`: none outside owner
`day-editor`: none outside owner
`day-editor-title`: none outside owner
`del-actions`: none outside owner
`del-box`: none outside owner
`del-modal`: none outside owner
`del-summary`: none outside owner
`del-warn`: none outside owner
`delivered`: src/pages/gallery.astro, src/pages/index.astro, src/pages/terms.astro, src/pages/confirm.astro, src/lib/booking-groups.js
`dragover`: none outside owner
`drop-sub`: none outside owner
`drop-text`: none outside owner
`drop-zone`: none outside owner
`editor-actions`: none outside owner
`empty`: src/pages/book.astro, src/lib/home.js
`env-controls`: none outside owner
`env-page`: none outside owner
`expired`: src/pages/book.astro, src/pages/gallery.astro, src/pages/reset.astro, src/pages/confirm.astro, src/lib/delivery-admin.js
`field`: src/pages/coupon-card.astro, src/pages/book.astro, src/pages/client-details.astro, src/pages/login.astro, src/pages/index.astro, src/pages/reset.astro, src/pages/confirm.astro, src/styles/site.css, src/styles/global.css, src/styles/delivery.css
`fixed`: src/pages/book.astro, src/pages/gallery.astro, src/styles/site.css, src/styles/global.css
`gal-actions`: none outside owner
`gal-form`: none outside owner
`gal-info`: none outside owner
`gal-list`: none outside owner
`gal-row`: none outside owner
`hidden`: src/pages/portfolio.astro, src/pages/coupon-card.astro, src/pages/book.astro, src/pages/gallery.astro, src/pages/client-gallery.astro, src/pages/client-details.astro, src/pages/invoice.astro, src/pages/index.astro, src/pages/confirm.astro, src/lib/archive.js, src/lib/delivery-admin.js, src/lib/gallery.js, src/lib/home.js, src/layouts/Layout.astro, src/components/PhotoViewer.astro, src/styles/site.css, src/styles/global.css, src/styles/delivery.css
`inactive`: none outside owner
`inactive-badge`: none outside owner
`layout`: none outside owner
`legend-dot`: src/styles/site.css
`logout-btn`: none outside owner
`main`: src/pages/thanks.astro, src/layouts/Layout.astro, src/styles/site.css, src/styles/global.css
`main-sub`: none outside owner
`main-title`: src/styles/site.css
`on-sale`: none outside owner
`open`: src/pages/book.astro, src/pages/gallery.astro, src/pages/index.astro, src/lib/gallery.js, src/lib/home.js, src/layouts/Layout.astro, src/styles/site.css, src/styles/global.css
`org`: src/pages/confirm.astro
`partial`: src/pages/book.astro
`past`: src/pages/book.astro
`pending`: src/pages/confirm.astro, src/lib/delivery-admin.js, src/lib/booking-groups.js
`percent`: src/pages/book.astro
`photo-actions`: none outside owner
`photo-card`: none outside owner
`photo-card-info`: none outside owner
`photo-cb`: none outside owner
`photo-cb-wrap`: none outside owner
`photo-name`: none outside owner
`photo-sport`: none outside owner
`photos-grid`: none outside owner
`pkg`: src/pages/book.astro, src/pages/confirm.astro, src/styles/site.css
`pricing-card`: none outside owner
`pricing-pkg-name`: none outside owner
`pricing-pkg-sub`: none outside owner
`pricing-right`: none outside owner
`pricing-row`: none outside owner
`pricing-toggle`: none outside owner
`pricing-toggle-label`: none outside owner
`prog-bar`: none outside owner
`prog-wrap`: none outside owner
`save-price-btn`: none outside owner
`sb-link`: src/styles/site.css
`sel-avail`: none outside owner
`sel-clear`: none outside owner
`sel-partial`: none outside owner
`sel-unavail`: none outside owner
`selected`: src/pages/book.astro, src/pages/index.astro, src/styles/site.css
`sidebar`: src/styles/site.css
`sidebar-footer`: none outside owner
`sidebar-logo`: src/styles/site.css
`sidebar-nav`: none outside owner
`stat-l`: none outside owner
`stat-n`: none outside owner
`stats-row`: none outside owner
`tab`: src/pages/privacy.astro
`time-row`: none outside owner
`today`: src/pages/book.astro
`travel`: src/pages/book.astro, src/pages/privacy.astro, src/pages/terms.astro, src/pages/confirm.astro
`unavailable`: src/pages/book.astro, src/pages/gallery.astro, src/pages/client-gallery.astro, src/lib/archive.js, src/lib/portfolio.js, src/lib/delivery-admin.js, src/lib/gallery.js, src/lib/home.js
`upload-status`: none outside owner
`visible`: src/lib/booking-groups.js, src/styles/site.css, src/styles/global.css
`w3`: none outside owner

### src/pages/book.astro

```css
.page
@media (max-width: 480px)
.pkg-grid
@media (max-width: 500px)
.pkg-card
.pkg-card:hover
.pkg-card.sel
.pkg-card.unavail
.pkg-badge
.pkg-sale-badge
.pkg-name
.pkg-orig
.pkg-price
.pkg-price small
.pkg-price.sale
.pkg-features
.pkg-features li
.pkg-features li::before
.form-grid
@media (max-width: 480px)
.field.full
.cal
.cal-head
.cal-title
.cal-nav
.cal-nav:hover:not(:disabled)
.cal-nav:disabled
.cal-dow, .cal-days
.cal-dow span
.cal-d
.cal-d:hover:not(:disabled)
.cal-d:disabled
.cal-d.blocked
.cal-d.sel
.cal-d.empty
.cal-d .availability-mark
.cal-legend
.cal-legend span
.cal-legend i
.lg-strike
.cal-picked
.cal-picked b
.cost-box
.cost-label
.cost-line
.cost-line.total
.cost-line.note
.cost-empty
.submit-btn
.submit-btn:hover:not(:disabled)
.submit-btn:disabled
.success-state
.success-icon
.success-icon svg
.success-state.show
.success-state.show .success-icon svg polyline
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`availability-mark`: src/pages/admin.astro
`blocked`: src/pages/admin.astro
`cal`: src/pages/admin.astro, src/styles/site.css
`cal-d`: src/styles/site.css
`cal-days`: none outside owner
`cal-dow`: src/pages/admin.astro
`cal-head`: none outside owner
`cal-legend`: src/pages/admin.astro, src/styles/site.css
`cal-nav`: src/pages/admin.astro
`cal-picked`: none outside owner
`cal-title`: none outside owner
`cost-box`: src/pages/confirm.astro
`cost-empty`: none outside owner
`cost-label`: src/pages/confirm.astro
`cost-line`: src/pages/confirm.astro
`empty`: src/pages/admin.astro, src/lib/home.js
`field`: src/pages/coupon-card.astro, src/pages/client-details.astro, src/pages/login.astro, src/pages/index.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/confirm.astro, src/styles/site.css, src/styles/global.css, src/styles/delivery.css
`form-grid`: src/pages/admin.astro, src/pages/confirm.astro
`full`: src/pages/portfolio.astro, src/pages/index.astro, src/pages/terms.astro, src/pages/admin.astro, src/pages/confirm.astro, src/styles/site.css
`lg-strike`: none outside owner
`note`: src/pages/thanks.astro, src/pages/admin.astro
`page`: src/pages/portfolio.astro, src/pages/coupon-card.astro, src/pages/gallery.astro, src/pages/client-gallery.astro, src/pages/quick-book.astro, src/pages/client-details.astro, src/pages/invoice.astro, src/pages/index.astro, src/pages/privacy.astro, src/pages/terms.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/404.astro, src/pages/confirm.astro, src/layouts/Layout.astro, src/styles/site.css, src/styles/global.css, src/styles/delivery.css
`pkg-badge`: src/styles/site.css
`pkg-card`: src/styles/site.css
`pkg-features`: src/styles/site.css
`pkg-grid`: src/styles/site.css
`pkg-name`: src/pages/admin.astro, src/styles/site.css
`pkg-orig`: none outside owner
`pkg-price`: src/styles/site.css
`pkg-sale-badge`: src/styles/site.css
`sale`: src/pages/privacy.astro, src/pages/admin.astro, src/styles/site.css
`sel`: src/pages/admin.astro, src/styles/site.css
`show`: src/pages/privacy.astro, src/pages/admin.astro, src/pages/confirm.astro, src/lib/delivery-admin.js, src/layouts/Layout.astro, src/styles/global.css
`submit-btn`: src/pages/confirm.astro
`success-icon`: none outside owner
`success-state`: none outside owner
`total`: src/pages/portfolio.astro, src/pages/invoice.astro, src/pages/admin.astro, src/pages/confirm.astro, src/lib/archive.js
`unavail`: src/pages/admin.astro

### src/pages/confirm.astro

```css
.page
.summary-card
.summary-grid
.summary-item strong
.summary-item span
.addons-grid
.addons-toggles
@media (max-width: 500px)
.addons-toggles
.qty-pill
.qty-pill.active
.qty-top
.qty-label
.qty-rate
.qty-row
.qty-btn
.qty-btn:hover
.qty-val
.qty-sub
.toggle-pill
.toggle-pill:hover
.toggle-pill.active
.toggle-left
.toggle-box
.toggle-pill.active .toggle-box
.toggle-box svg
.toggle-pill.active .toggle-box svg
.toggle-name
.toggle-pill.active .toggle-name
.toggle-price
.form-grid
@media (max-width: 480px)
.field.full
.cost-box
.cost-label
.cost-line
.cost-line.hide
.cost-line.total
.cost-line.deposit
.cost-line.balance
.submit-btn
.submit-btn:hover:not(:disabled)
.submit-btn:disabled
.error-state, .confirmed-state, .pending-state
.state-icon
.state-icon svg
.state-icon.ok
.state-icon.ok svg
.state-icon.err
.state-icon.err svg
.state-icon.warn
.state-icon.warn svg
.ztn-tag
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`active`: src/pages/book.astro, src/pages/admin.astro, src/lib/archive.js, src/lib/portfolio.js, src/lib/delivery-admin.js, src/lib/booking-groups.js, src/styles/site.css
`addons-grid`: none outside owner
`addons-toggles`: none outside owner
`balance`: src/pages/invoice.astro, src/pages/terms.astro
`confirmed-state`: none outside owner
`cost-box`: src/pages/book.astro
`cost-label`: src/pages/book.astro
`cost-line`: src/pages/book.astro
`deposit`: src/pages/invoice.astro, src/pages/terms.astro, src/pages/admin.astro
`err`: src/pages/book.astro, src/pages/login.astro, src/pages/reset.astro, src/lib/home.js, src/styles/site.css
`error-state`: none outside owner
`field`: src/pages/coupon-card.astro, src/pages/book.astro, src/pages/client-details.astro, src/pages/login.astro, src/pages/index.astro, src/pages/reset.astro, src/pages/admin.astro, src/styles/site.css, src/styles/global.css, src/styles/delivery.css
`form-grid`: src/pages/book.astro, src/pages/admin.astro
`full`: src/pages/portfolio.astro, src/pages/book.astro, src/pages/index.astro, src/pages/terms.astro, src/pages/admin.astro, src/styles/site.css
`hide`: src/lib/booking-groups.js
`ok`: src/pages/book.astro, src/pages/gallery.astro, src/pages/login.astro, src/pages/reset.astro, src/pages/admin.astro, src/lib/portfolio.js, src/lib/home.js, src/lib/delivery-api.js
`page`: src/pages/portfolio.astro, src/pages/coupon-card.astro, src/pages/book.astro, src/pages/gallery.astro, src/pages/client-gallery.astro, src/pages/quick-book.astro, src/pages/client-details.astro, src/pages/invoice.astro, src/pages/index.astro, src/pages/privacy.astro, src/pages/terms.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/404.astro, src/layouts/Layout.astro, src/styles/site.css, src/styles/global.css, src/styles/delivery.css
`pending-state`: none outside owner
`qty-btn`: none outside owner
`qty-label`: none outside owner
`qty-pill`: none outside owner
`qty-rate`: none outside owner
`qty-row`: none outside owner
`qty-sub`: none outside owner
`qty-top`: none outside owner
`qty-val`: none outside owner
`state-icon`: none outside owner
`submit-btn`: src/pages/book.astro
`summary-card`: none outside owner
`summary-grid`: none outside owner
`summary-item`: none outside owner
`toggle-box`: src/styles/site.css
`toggle-left`: none outside owner
`toggle-name`: none outside owner
`toggle-pill`: none outside owner
`toggle-price`: none outside owner
`total`: src/pages/portfolio.astro, src/pages/book.astro, src/pages/invoice.astro, src/pages/admin.astro, src/lib/archive.js
`warn`: src/pages/admin.astro
`ztn-tag`: none outside owner

### src/pages/coupon-card.astro

```css
nav.nav
.nav-back
.nav-back:hover
.page
@media (max-width: 700px)
.controls
.ctrl-field
.preview-label
.preview-label::after
.canvas-wrap
.canvas-wrap canvas
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`canvas-wrap`: src/pages/admin.astro
`controls`: src/pages/index.astro, src/pages/admin.astro, src/styles/site.css, src/styles/delivery.css
`ctrl-field`: none outside owner
`nav`: src/pages/book.astro, src/pages/invoice.astro, src/pages/admin.astro, src/layouts/Layout.astro, src/styles/site.css, src/styles/global.css
`nav-back`: none outside owner
`page`: src/pages/portfolio.astro, src/pages/book.astro, src/pages/gallery.astro, src/pages/client-gallery.astro, src/pages/quick-book.astro, src/pages/client-details.astro, src/pages/invoice.astro, src/pages/index.astro, src/pages/privacy.astro, src/pages/terms.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/404.astro, src/pages/confirm.astro, src/layouts/Layout.astro, src/styles/site.css, src/styles/global.css, src/styles/delivery.css
`preview-label`: none outside owner

### src/pages/gallery.astro

```css
.page
@media (max-width: 600px)
.gallery-header
.gallery-tag
.gallery-title
.gallery-meta
.gallery-meta strong
.watermark-notice
.dl-all
.dl-all:hover
.gallery-grid
@media (max-width: 500px)
.gal-item
.gal-item img
.gal-item:hover img
.gal-item-overlay
.gal-item:hover .gal-item-overlay
.dl-btn
.dl-btn:hover
.wm-badge
.not-found
.not-found h2
.not-found p
.lightbox
.lightbox.open
.lightbox img
.lb-close
.lb-close:hover
.lb-dl
.lb-dl:hover
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`dl-all`: none outside owner
`dl-btn`: src/styles/site.css
`gal-item`: src/styles/site.css
`gal-item-overlay`: src/styles/site.css
`gallery-grid`: src/pages/client-gallery.astro, src/styles/site.css
`gallery-header`: none outside owner
`gallery-meta`: none outside owner
`gallery-tag`: none outside owner
`gallery-title`: src/pages/client-gallery.astro, src/styles/site.css
`lb-close`: src/styles/global.css
`lb-dl`: src/styles/site.css
`lightbox`: src/pages/admin.astro, src/styles/site.css, src/styles/global.css
`not-found`: src/pages/invoice.astro
`open`: src/pages/book.astro, src/pages/index.astro, src/pages/admin.astro, src/lib/gallery.js, src/lib/home.js, src/layouts/Layout.astro, src/styles/site.css, src/styles/global.css
`page`: src/pages/portfolio.astro, src/pages/coupon-card.astro, src/pages/book.astro, src/pages/client-gallery.astro, src/pages/quick-book.astro, src/pages/client-details.astro, src/pages/invoice.astro, src/pages/index.astro, src/pages/privacy.astro, src/pages/terms.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/404.astro, src/pages/confirm.astro, src/layouts/Layout.astro, src/styles/site.css, src/styles/global.css, src/styles/delivery.css
`watermark-notice`: none outside owner
`wm-badge`: none outside owner

### src/pages/invoice.astro

```css
.inv-page
.inv-header
.inv-logo
.inv-ztn
.inv-from
.inv-from-label
.inv-name
.inv-email
.inv-meta
.inv-meta-cell
.inv-meta-label
.inv-meta-val
.inv-items
.inv-item-header
.inv-item-header span
.inv-row
.inv-row:last-child
.inv-row-name
.inv-row-price
.inv-totals
.inv-total-row
.inv-total-row:last-child
.inv-total-row.big
.inv-total-row.green
.inv-print-btn
.inv-print-btn:hover
.not-found
.not-found h2
.not-found p
@media print
.inv-page
body
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`big`: none outside owner
`green`: src/pages/book.astro, src/pages/thanks.astro, src/pages/login.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/confirm.astro, src/styles/global.css
`inv-email`: none outside owner
`inv-from`: none outside owner
`inv-from-label`: none outside owner
`inv-header`: none outside owner
`inv-item-header`: none outside owner
`inv-items`: none outside owner
`inv-logo`: none outside owner
`inv-meta`: none outside owner
`inv-meta-cell`: none outside owner
`inv-meta-label`: none outside owner
`inv-meta-val`: none outside owner
`inv-name`: none outside owner
`inv-page`: none outside owner
`inv-print-btn`: none outside owner
`inv-row`: none outside owner
`inv-row-name`: none outside owner
`inv-row-price`: none outside owner
`inv-total-row`: none outside owner
`inv-totals`: none outside owner
`inv-ztn`: none outside owner
`not-found`: src/pages/gallery.astro

### src/pages/login.astro

```css
body
.box
.logo
.title
.sub
.field
.err
.ok
.back
.back:hover
.forgot
.forgot:hover
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`back`: src/pages/coupon-card.astro, src/pages/thanks.astro, src/pages/client-gallery.astro, src/pages/client-details.astro, src/pages/privacy.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/confirm.astro, src/lib/home.js, src/styles/site.css
`box`: src/pages/book.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/confirm.astro, src/styles/site.css, src/styles/global.css
`err`: src/pages/book.astro, src/pages/reset.astro, src/pages/confirm.astro, src/lib/home.js, src/styles/site.css
`field`: src/pages/coupon-card.astro, src/pages/book.astro, src/pages/client-details.astro, src/pages/index.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/confirm.astro, src/styles/site.css, src/styles/global.css, src/styles/delivery.css
`forgot`: none outside owner
`logo`: src/pages/coupon-card.astro, src/pages/invoice.astro, src/pages/reset.astro, src/pages/admin.astro, src/styles/site.css, src/styles/global.css
`ok`: src/pages/book.astro, src/pages/gallery.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/confirm.astro, src/lib/portfolio.js, src/lib/home.js, src/lib/delivery-api.js
`sub`: src/pages/thanks.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/confirm.astro, src/styles/site.css
`title`: src/pages/portfolio.astro, src/pages/coupon-card.astro, src/pages/book.astro, src/pages/gallery.astro, src/pages/thanks.astro, src/pages/client-gallery.astro, src/pages/quick-book.astro, src/pages/client-details.astro, src/pages/invoice.astro, src/pages/index.astro, src/pages/privacy.astro, src/pages/terms.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/404.astro, src/pages/confirm.astro, src/lib/portfolio.js, src/lib/delivery-admin.js, src/lib/gallery.js, src/lib/home.js, src/layouts/Layout.astro, src/styles/site.css

### src/pages/privacy.astro

```css
.priv-page
.priv-page h1
.priv-meta
.priv-page h2
.priv-page p
.priv-page ul
.priv-page ul li
.priv-page a
.priv-page a:hover
.priv-divider
.priv-callout
.priv-callout p
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`priv-callout`: none outside owner
`priv-divider`: none outside owner
`priv-meta`: none outside owner
`priv-page`: none outside owner

### src/pages/reset.astro

```css
body
.box
.logo
.title
.sub
.field
.err
.ok
.back
.back:hover
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`back`: src/pages/coupon-card.astro, src/pages/thanks.astro, src/pages/client-gallery.astro, src/pages/client-details.astro, src/pages/login.astro, src/pages/privacy.astro, src/pages/admin.astro, src/pages/confirm.astro, src/lib/home.js, src/styles/site.css
`box`: src/pages/book.astro, src/pages/login.astro, src/pages/admin.astro, src/pages/confirm.astro, src/styles/site.css, src/styles/global.css
`err`: src/pages/book.astro, src/pages/login.astro, src/pages/confirm.astro, src/lib/home.js, src/styles/site.css
`field`: src/pages/coupon-card.astro, src/pages/book.astro, src/pages/client-details.astro, src/pages/login.astro, src/pages/index.astro, src/pages/admin.astro, src/pages/confirm.astro, src/styles/site.css, src/styles/global.css, src/styles/delivery.css
`logo`: src/pages/coupon-card.astro, src/pages/login.astro, src/pages/invoice.astro, src/pages/admin.astro, src/styles/site.css, src/styles/global.css
`ok`: src/pages/book.astro, src/pages/gallery.astro, src/pages/login.astro, src/pages/admin.astro, src/pages/confirm.astro, src/lib/portfolio.js, src/lib/home.js, src/lib/delivery-api.js
`sub`: src/pages/thanks.astro, src/pages/login.astro, src/pages/admin.astro, src/pages/confirm.astro, src/styles/site.css
`title`: src/pages/portfolio.astro, src/pages/coupon-card.astro, src/pages/book.astro, src/pages/gallery.astro, src/pages/thanks.astro, src/pages/client-gallery.astro, src/pages/quick-book.astro, src/pages/client-details.astro, src/pages/login.astro, src/pages/invoice.astro, src/pages/index.astro, src/pages/privacy.astro, src/pages/terms.astro, src/pages/admin.astro, src/pages/404.astro, src/pages/confirm.astro, src/lib/portfolio.js, src/lib/delivery-admin.js, src/lib/gallery.js, src/lib/home.js, src/layouts/Layout.astro, src/styles/site.css

### src/pages/terms.astro

```css
.terms-page
.terms-page h1
.terms-meta
.terms-page h2
.terms-page p
.terms-page ul
.terms-page ul li
.terms-page a
.terms-page a:hover
.terms-divider
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`terms-divider`: none outside owner
`terms-meta`: none outside owner
`terms-page`: none outside owner

### src/pages/thanks.astro

```css
.main
.card
.icon
.eyebrow
h1
.sub
.booking-num-card
.booking-num-label
.booking-num
.booking-num-note
.divider
.details
.detail-row
.detail-row span:first-child
.detail-row span:last-child
.actions
```

Class-name references outside this page (including shared stylesheet declarations; reviewed as dependencies, not presumed live consumers):

`actions`: src/pages/admin.astro, src/lib/delivery-admin.js, src/styles/delivery.css
`booking-num`: src/pages/admin.astro
`booking-num-card`: none outside owner
`booking-num-label`: none outside owner
`booking-num-note`: none outside owner
`card`: src/pages/coupon-card.astro, src/pages/book.astro, src/pages/admin.astro, src/pages/confirm.astro, src/layouts/Layout.astro, src/styles/site.css, src/styles/delivery.css
`detail-row`: none outside owner
`details`: src/pages/book.astro, src/pages/client-gallery.astro, src/pages/client-details.astro, src/pages/index.astro, src/pages/privacy.astro, src/pages/terms.astro, src/pages/admin.astro, src/pages/confirm.astro, src/lib/delivery-admin.js, src/lib/home.js, src/layouts/Layout.astro, src/styles/site.css, src/styles/delivery.css
`divider`: src/pages/book.astro, src/pages/privacy.astro, src/pages/terms.astro, src/pages/confirm.astro, src/styles/global.css
`eyebrow`: none outside owner
`icon`: src/pages/book.astro, src/pages/confirm.astro, src/layouts/Layout.astro
`main`: src/pages/admin.astro, src/layouts/Layout.astro, src/styles/site.css, src/styles/global.css
`sub`: src/pages/login.astro, src/pages/reset.astro, src/pages/admin.astro, src/pages/confirm.astro, src/styles/site.css

## Measurements

```json
{
  "revision": "d14963b",
  "src_files": 31,
  "src_lines": 5677,
  "src_bytes": 288785,
  "admin_lines": 1877,
  "admin_bytes": 91040
}
```

Line counts include blank lines. Targets in DESIGN-PLAN.md are estimates, not fabricated after-measurements.
