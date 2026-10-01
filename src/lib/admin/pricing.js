import {checked, checkedFetch, esc, toast, fmtBytes} from './shared.js';
export function setupPricing(ctx) {
  const {sb,state}=ctx;
// ── PRICING ──
async function loadPricing() {
  const pkgRes   = await checked(sb.from('package_pricing').select('*').order('base_price'));
  const addonRes = await checked(sb.from('addon_pricing').select('*').order('price'));
  renderPricing(pkgRes.data || [], addonRes.data || []);
}

function renderPricing(packages, addons) {
  const pList = document.getElementById('pricing-list');
  if (!packages.length) { pList.innerHTML = '<p class="no-data">No packages in database yet.</p>'; }
  else pList.innerHTML = packages.map(pkg => {
    const onSale = pkg.on_sale && pkg.sale_price;
    const unavail = pkg.available === false;
    return `<div class="pricing-card${onSale?' on-sale':''}${unavail?' unavailable':''}">
      <div>
        <div class="pricing-pkg-name">${esc(pkg.package_name)}</div>
        <div class="pricing-pkg-sub">ID: ${pkg.id?.slice(-8)}</div>
      </div>
      <div class="pricing-right">
        <div class="pricing-row">
          <label for="pr-base-${pkg.id}">Base $</label>
          <input type="number" id="pr-base-${pkg.id}" value="${pkg.base_price}" min="0"/>
        </div>
        <div class="pricing-row">
          <label for="pr-sale-${pkg.id}">Sale $</label>
          <input type="number" id="pr-sale-${pkg.id}" value="${pkg.sale_price || ''}" min="0" ${!pkg.on_sale?'disabled':''}/>
        </div>
        <label class="pricing-toggle">
          <input type="checkbox" ${pkg.on_sale?'checked':''} id="pr-onsale-${pkg.id}"
            data-change="toggleSale" data-args="${esc(JSON.stringify([pkg.id, "$checked"]))}"/>
          <span class="pricing-toggle-label">On sale</span>
        </label>
        <label class="pricing-toggle">
          <input type="checkbox" ${pkg.available!==false?'checked':''} id="pr-avail-${pkg.id}"
            data-change="toggleAvail" data-args="${esc(JSON.stringify([pkg.id, "$checked", 'pkg']))}"/>
          <span class="pricing-toggle-label">Available</span>
        </label>
        <button class="save-price-btn" data-action="savePkg" data-args="${esc(JSON.stringify([pkg.id]))}">Save</button>
      </div>
    </div>`;
  }).join('');

  const aList = document.getElementById('addon-list');
  if (!addons.length) { aList.innerHTML = '<p class="no-data">No add-ons yet — use "Add starter pack" below to load the standard set.</p>'; }
  else aList.innerHTML = addons.map(a => `
    <div class="addon-card${a.available===false?' unavailable':''}">
      <div><div class="addon-name">${esc(a.addon_name)}</div><div class="addon-price">$${a.price}</div></div>
      <div class="actions">
        <label class="avail-toggle">
          <input type="checkbox" ${a.available!==false?'checked':''} data-change="toggleAvail" data-args="${esc(JSON.stringify([a.id, "$checked", 'addon']))}"/>
          Available
        </label>
        <button class="btn-sm red" data-action="deleteAddon" data-args="${esc(JSON.stringify([a.id]))}">Delete</button>
      </div>
    </div>`).join('');
}

// ── ADD-ON MANAGEMENT ──
const STARTER_ADDONS = [
  { addon_name: 'Rush delivery (24 hrs)',      price: 40 },
  { addon_name: 'Extended coverage (+1 hour)', price: 30 },
  { addon_name: 'Second photographer',         price: 75 },
  { addon_name: 'Video highlight reel',        price: 50 },
  { addon_name: 'Social media crop pack',      price: 10 },
  { addon_name: 'All unedited photos',         price: 25 },
  { addon_name: 'Printed photo album',         price: 60 },
  { addon_name: 'Canvas print (16×20)',        price: 45 },
];

async function addAddon() {
  const name  = document.getElementById('new-addon-name').value.trim();
  const price = parseFloat(document.getElementById('new-addon-price').value);
  if (!name || !isFinite(price) || price < 0) { toast('Enter an add-on name and price'); return; }
  const { error } = await checked(sb.from('addon_pricing').insert({ addon_name: name, price, available: true }));
  if (error) { toast('Could not add: ' + error.message); return; }
  document.getElementById('new-addon-name').value = '';
  document.getElementById('new-addon-price').value = '';
  await loadPricing(); toast('Add-on added');
}

async function seedAddons() {
  const { data } = await checked(sb.from('addon_pricing').select('addon_name'));
  const existing = new Set((data || []).map(a => (a.addon_name || '').toLowerCase()));
  const missing = STARTER_ADDONS
    .filter(a => !existing.has(a.addon_name.toLowerCase()))
    .map(a => ({ ...a, available: true }));
  if (!missing.length) { toast('Starter add-ons are already in the list'); return; }
  const { error } = await checked(sb.from('addon_pricing').insert(missing));
  if (error) { toast('Could not add: ' + error.message); return; }
  await loadPricing(); toast(missing.length + ' add-ons added');
}

async function deleteAddon(id) {
  if (!confirm('Delete this add-on? Clients will no longer see it.')) return;
  const { error } = await checked(sb.from('addon_pricing').delete().eq('id', id));
  if (error) { toast('Could not delete: ' + error.message); return; }
  await loadPricing(); toast('Add-on deleted');
}

function toggleSale(id, checked) {
  const saleInput = document.getElementById('pr-sale-'+id);
  if (saleInput) saleInput.disabled = !checked;
}

async function savePkg(id) {
  const base  = parseFloat(document.getElementById('pr-base-'+id)?.value) || 0;
  const onSale = document.getElementById('pr-onsale-'+id)?.checked;
  const sale  = onSale ? parseFloat(document.getElementById('pr-sale-'+id)?.value) || null : null;
  const avail = document.getElementById('pr-avail-'+id)?.checked;
  await checked(sb.from('package_pricing').update({ base_price:base, sale_price:sale, on_sale:onSale, available:avail }).eq('id', id));
  await loadPricing(); toast('Package saved');
}

async function toggleAvail(id, available, type) {
  const table = type === 'pkg' ? 'package_pricing' : 'addon_pricing';
  await checked(sb.from(table).update({ available }).eq('id', id));
  await loadPricing(); toast('Availability updated');
}


  return {load: loadPricing, render: renderPricing, actions: {addAddon, deleteAddon, savePkg, seedAddons, toggleAvail, toggleSale}};
}
