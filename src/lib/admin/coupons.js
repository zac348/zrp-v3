import {checked, checkedFetch, esc, toast, fmtBytes} from './shared.js';
export function setupCoupons(ctx) {
  const {sb,state}=ctx;
// ── COUPONS ──
async function loadCoupons() {
  const { data } = await checked(sb.from('coupons').select('*').order('created_at', { ascending: false }));
  state.coupons = data || [];
  renderCoupons();
}

function onCouponTypeChange() {
  const type = document.getElementById('cp-type').value;
  const wrap  = document.getElementById('cp-value-wrap');
  const label = document.getElementById('cp-value-label');
  const input = document.getElementById('cp-value');
  if (type === 'travel') { wrap.hidden = true; }
  else { wrap.hidden = false; label.textContent = type==='percent' ? 'Discount %' : 'Discount $'; input.placeholder = type==='percent' ? 'e.g. 20' : 'e.g. 15'; }
}

async function createCoupon() {
  const code    = document.getElementById('cp-code').value.trim().toUpperCase();
  const type    = document.getElementById('cp-type').value;
  const value   = type !== 'travel' ? parseFloat(document.getElementById('cp-value').value) || 0 : null;
  const expires = document.getElementById('cp-expires').value || null;
  const maxUses = parseInt(document.getElementById('cp-max-uses').value) || null;
  if (!code) { toast('Enter a code'); return; }
  const { error } = await checked(sb.from('coupons').insert({ code, type, value, expires_at: expires, max_uses: maxUses, uses: 0, active: true }));
  if (error) { toast('Error: ' + error.message); return; }
  document.getElementById('cp-code').value = '';
  document.getElementById('cp-value').value = '';
  document.getElementById('cp-expires').value = '';
  document.getElementById('cp-max-uses').value = '';
  await loadCoupons(); toast('Coupon created');
}

function renderCoupons() {
  const list = document.getElementById('coupon-list');
  if (!state.coupons.length) { list.innerHTML = '<p class="no-data">No coupons yet.</p>'; return; }
  const now = new Date();
  list.innerHTML = state.coupons.map(c => {
    const expired = c.expires_at && new Date(c.expires_at) < now;
    const maxed   = c.max_uses !== null && c.uses >= c.max_uses;
    const inactive = !c.active || expired || maxed;
    return `<div class="coupon-row${inactive?' inactive':''}">
      <div>
        <div class="coupon-info">
          <span class="coupon-code">${esc(c.code)}</span>
          <span class="coupon-badge ${c.type}">${c.type}</span>
          ${expired ? '<span class="coupon-badge expired">Expired</span>' : ''}
          ${!c.active ? '<span class="coupon-badge inactive-badge">Inactive</span>' : ''}
        </div>
        <div class="coupon-meta">
          ${c.type !== 'travel' ? (c.type==='percent' ? c.value+'% off' : '$'+c.value+' off') : 'Travel waived'}
          ${c.uses !== null ? ` · ${c.uses || 0}${c.max_uses ? '/' + c.max_uses : ''} uses` : ''}
          ${c.expires_at ? ` · expires ${esc(c.expires_at)}` : ''}
        </div>
      </div>
      <div class="coupon-actions">
        <button class="btn-sm" data-action="toggleCoupon" data-args="${esc(JSON.stringify([c.id, c.active]))}">${c.active ? 'Deactivate' : 'Activate'}</button>
        <button class="btn-sm" data-action="copyCouponLink" data-args="${esc(JSON.stringify([c.code]))}">Copy link</button>
        <button class="btn-sm red" data-action="deleteCoupon" data-args="${esc(JSON.stringify([c.id]))}">Delete</button>
      </div>
    </div>`;
  }).join('');
}

async function toggleCoupon(id, active) {
  await checked(sb.from('coupons').update({ active: !active }).eq('id', id));
  await loadCoupons(); toast(active ? 'Coupon deactivated' : 'Coupon activated');
}

async function deleteCoupon(id) {
  if (!confirm('Delete this coupon?')) return;
  await checked(sb.from('coupons').delete().eq('id', id));
  await loadCoupons(); toast('Coupon deleted');
}

async function copyCouponLink(code) {
  const link = location.origin + '/book?coupon=' + encodeURIComponent(code);
  await navigator.clipboard.writeText(link);
  toast('Link copied: ' + link);
}


  return {load: loadCoupons, render: renderCoupons, actions: {copyCouponLink, createCoupon, deleteCoupon, onCouponTypeChange, toggleCoupon}};
}
