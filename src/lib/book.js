import { packageFeatures } from './packages.js';
import { pauseState, resumeLabel, countdown } from './booking-pause.js';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);



let selPkg = null;

let availableAddons=[];
const selectedAddons=new Set();
async function loadAddons(){
  const {data,error}=await sb.from("addon_pricing").select("*").eq("available",true).order("price");
  const wrap=document.getElementById("booking-addons");wrap.textContent="";
  if(error){wrap.textContent="Add-ons could not load. You can discuss extras with Zachary.";return;}
  availableAddons=data || [];
  if(!availableAddons.length){wrap.textContent="No add-ons currently offered.";return;}
  availableAddons.forEach(a=>{const label=document.createElement("label");label.className="addon-choice";const input=document.createElement("input");input.type="checkbox";input.addEventListener("change",()=>{input.checked?selectedAddons.add(String(a.id)):selectedAddons.delete(String(a.id));updateCostBox();});label.append(input,document.createTextNode(a.addon_name+" — $"+Number(a.price).toFixed(2)));wrap.append(label);});
}
async function loadPackages() {
  const { data, error } = await sb.from('package_pricing').select('*').eq('available', true).order('base_price');
  if(error || !data?.length){document.getElementById("pkg-grid").textContent="Packages are unavailable right now. Please contact Zachary.";return;}
  const pkgs = data.map((p, i) => ({
        id:       String(p.id),
        name:     p.package_name,
        price:    (p.on_sale && p.sale_price != null) ? p.sale_price : p.base_price,
        origPrice: (p.on_sale && p.sale_price != null) ? p.base_price : null,
        popular:  p.package_name === 'Standard',
        on_sale:  !!(p.on_sale && p.sale_price != null),
        features: packageFeatures(p.package_name),
      }));
  renderPackages(pkgs);
}

function renderPackages(pkgs) {
  const grid = document.getElementById('pkg-grid');
  grid.replaceChildren(...pkgs.map((pkg, i) => {
    const button=document.createElement('button');button.type='button';button.className='pkg-card';button.setAttribute('aria-pressed','false');
    const label=document.createElement('span');label.className='pkg-name';label.textContent=pkg.name+(pkg.popular?' · Popular':'');
    const price=document.createElement('span');price.className='pkg-price';price.textContent='$'+pkg.price+' / session';
    if(pkg.on_sale){const original=document.createElement('s');original.className='pkg-orig';original.textContent='$'+pkg.origPrice;price.prepend(original,document.createTextNode(' '));}
    const features=document.createElement('span');features.className='pkg-features';features.textContent=pkg.features.join(' · ');
    button.append(label,price,features);button.addEventListener('click',()=>selectPkg(i,pkg));return button;
  }));
}

function selectPkg(i, pkg) {
  selPkg = pkg;
  document.querySelectorAll('.pkg-card').forEach((c, j) => { c.classList.toggle('sel', j === i); c.setAttribute('aria-pressed', String(j === i)); });
  updateCostBox();
  const btn = document.getElementById('submit-btn');
  btn.disabled = false;
  btn.textContent = 'Send booking request';
}

// ── COUPONS ──
let appliedCoupon = null; // row from `coupons` or null

async function validateCoupon(code) {
  try {
    const { data, error } = await sb.from('coupons')
      .select('*').eq('code', code).eq('active', true).maybeSingle();
    if (error || !data) return { err: 'Invalid code' };
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { err: 'This code has expired' };
    if (data.max_uses !== null && (data.uses || 0) >= data.max_uses) return { err: 'This code has been fully redeemed' };
    return { coupon: data };
  } catch (_) {
    return { err: 'Could not check the code — try again' };
  }
}

async function applyCoupon() {
  const code = document.getElementById('f-coupon').value.trim().toUpperCase();
  const status = document.getElementById('coupon-status');
  if (!code) { appliedCoupon = null; status.textContent = ''; updateCostBox(); return; }
  status.textContent = 'Checking…';
  const { coupon, err } = await validateCoupon(code);
  if (err) {
    appliedCoupon = null;
    status.textContent = err;
    status.className = 'status error';
  } else {
    appliedCoupon = coupon;
    status.textContent = '✓ ' + code + ' applied';
    status.className = 'status success';
  }
  updateCostBox();
}

function couponDiscount(pkgPrice) {
  if (!appliedCoupon) return 0;
  if (appliedCoupon.type === 'percent')
    return Math.round(pkgPrice * (appliedCoupon.value / 100) * 100) / 100;
  if (appliedCoupon.type === 'fixed')
    return Math.min(appliedCoupon.value, pkgPrice); // never below $0
  return 0; // 'travel' — waives the travel fee, which is added later at confirmation
}

function updateCostBox() {
  if (!selPkg) return;
  const disc  = couponDiscount(selPkg.price);
  const extra=availableAddons.filter(a=>selectedAddons.has(String(a.id))).reduce((sum,a)=>sum+Math.round(Number(a.price)*100),0)/100;
  const total = Math.max(0, Math.round((Number(selPkg.price) + extra - disc) * 100) / 100);
  document.getElementById('cl-pkg-n').textContent = selPkg.name + ' package';
  document.getElementById('cl-pkg-p').textContent = '$' + selPkg.price;
  const line = document.getElementById('cl-coupon');
  if (appliedCoupon && (disc > 0 || appliedCoupon.type === 'travel')) {
    document.getElementById('cl-coupon-n').textContent = 'Coupon ' + appliedCoupon.code;
    document.getElementById('cl-coupon-v').textContent =
      appliedCoupon.type === 'travel' ? 'Travel fee waived' : '−$' + disc.toFixed(2);
    line.hidden = false;
  } else {
    line.hidden = true;
  }
  document.getElementById('cl-total').textContent = '$' + total.toFixed(2);
  document.getElementById('estimate-value').textContent = '$' + total.toFixed(2);
  document.getElementById('cl-addons').textContent = extra ? 'Add-ons: $'+extra.toFixed(2) : '';
  document.getElementById('cost-empty').hidden = true;
  document.getElementById('cost-lines').hidden = false;
}

// ── AVAILABILITY CALENDAR ──
// Reads the same `availability` table the admin marks up:
// full-day 'unavailable' = not bookable; 'partial' = bookable with a heads-up.
let availBlocks = [], calY, calM, pickedDate = null, pickedPartial = false;

function localToday() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
}

function dayStatus(ds) {
  const bs = availBlocks.filter(b => b.date === ds);
  if (!bs.length) return null;
  if (bs.some(b => b.status === 'unavailable' && !b.start_time)) return 'unavailable';
  if (bs.some(b => b.status === 'partial' || (b.status === 'unavailable' && b.start_time))) return 'partial';
  if (bs.some(b => b.status === 'available')) return 'available';
  return null;
}

async function loadAvailability() {
  try {
    const { data } = await sb.from('availability')
      .select('date, status, start_time')
      .gte('date', localToday());
    availBlocks = data || [];
  } catch (_) {}
  renderCal();
}

function renderCal() {
  const today = localToday();
  document.getElementById('cal-title').textContent =
    new Date(calY, calM, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  // don't navigate into the past
  const n = new Date();
  document.querySelector('.cal-nav').disabled = (calY === n.getFullYear() && calM === n.getMonth());

  const grid = document.getElementById('cal-days');
  grid.innerHTML = '';
  const firstDay = new Date(calY, calM, 1).getDay();
  const daysInMonth = new Date(calY, calM + 1, 0).getDate();
  const monthStr = `${calY}-${String(calM + 1).padStart(2, '0')}`;

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-d empty';
    grid.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${monthStr}-${String(d).padStart(2, '0')}`;
    const status = dayStatus(ds);
    const isPast = ds < today;
    const blocked = status === 'unavailable';

    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = d;
    let cls = 'cal-d';
    if (blocked) cls += ' blocked';
    if (ds === pickedDate) cls += ' sel';
    el.className = cls;
    el.disabled = isPast || blocked;
    el.setAttribute('aria-label', ds + (status ? ', ' + status : ''));
    el.setAttribute('aria-pressed', String(ds === pickedDate));

    if (!isPast && (status === 'partial' || status === 'available')) {
      const dot = document.createElement('span');
      dot.className = 'availability-mark '+status;
      dot.textContent = status === 'partial' ? '−' : '+';
      dot.setAttribute('aria-hidden','true');
      el.appendChild(dot);
    }
    if (!el.disabled) el.addEventListener('click', () => pickDate(ds, status === 'partial'));
    grid.appendChild(el);
  }
}

function pickDate(ds, partial) {
  pickedDate = ds;
  pickedPartial = partial;
  document.getElementById('f-date').value = ds;
  const nice = new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  document.getElementById('cal-picked').innerHTML =
    'Selected — <b>' + nice + '</b>' + (partial ? ' · limited availability, time will be confirmed' : '');
  renderCal();
}

function calShift(dir) {
  calM += dir;
  if (calM > 11) { calM = 0; calY++; }
  if (calM < 0)  { calM = 11; calY--; }
  renderCal();
}

// ── SESSION-TYPE FOLLOW-UP QUESTIONS ──
const TYPE_QUESTIONS = {
  'Portraits': [
    { label: 'Who is the session for?', ph: 'e.g. Just me / my daughter' },
    { label: 'Indoor or outdoor?', options: ['Outdoor', 'Indoor', 'Both', 'Not sure'] },
  ],
  'Family': [
    { label: 'How many people?', ph: 'e.g. 5', type: 'number' },
    { label: 'Young kids or pets coming?', ph: 'e.g. Two kids (3 & 6), one dog' },
  ],
  'Senior photos': [
    { label: 'School & class year', ph: 'e.g. Valdosta High, 2027' },
    { label: 'Outfit changes?', options: ['1 outfit', '2 outfits', '3+', 'Not sure'] },
  ],
  'Couples / Engagement': [
    { label: "Partner's name", ph: 'e.g. Sam' },
    { label: 'Surprise proposal?', options: ['No', 'Yes — keep it a secret'] },
  ],
  'Event': [
    { label: 'What kind of event?', ph: 'e.g. Birthday, graduation party' },
    { label: 'Rough guest count', ph: 'e.g. 40', type: 'number' },
  ],
  'Sports': [
    { label: 'Sport & team', ph: 'e.g. Football — Valdosta Wildcats' },
    { label: 'Player name & number', ph: 'e.g. Jordan Smith, #24' },
  ],
  'Branding / Product': [
    { label: 'Business / brand name', ph: 'e.g. South GA Coffee Co.' },
    { label: 'What are we shooting?', ph: 'e.g. Menu items, headshots' },
  ],
  'Other': [
    { label: 'What do you have in mind?', ph: 'Tell me a little about it' },
  ],
};

function renderTypeQuestions() {
  const type = document.getElementById('f-sport').value;
  const qs = TYPE_QUESTIONS[type] || [];
  const wrap = document.getElementById('type-questions');
  wrap.innerHTML = qs.map((q, i) => {
    const cls = qs.length === 1 ? 'field full' : 'field';
    if (q.options) {
      return `<div class="${cls}"><label for="tq-${i}">${q.label}</label>
        <select id="tq-${i}" class="tq" data-label="${q.label}">
          <option value="" selected>Select… (optional)</option>
          ${q.options.map(o => `<option>${o}</option>`).join('')}
        </select></div>`;
    }
    return `<div class="${cls}"><label for="tq-${i}">${q.label}</label>
      <input id="tq-${i}" type="${q.type || 'text'}" class="tq" data-label="${q.label}" placeholder="${q.ph || ''}"/></div>`;
  }).join('');
}

function collectTypeAnswers() {
  return [...document.querySelectorAll('#type-questions .tq')]
    .map(el => ({ label: el.dataset.label, val: el.value.trim() }))
    .filter(a => a.val)
    .map(a => a.label.replace(/\?$/, '') + ': ' + a.val)
    .join(' | ');
}

document.getElementById('f-sport').addEventListener('change', renderTypeQuestions);

const PAGE_LOADED = Date.now();
const bookingSubmissionId=crypto.randomUUID();
let bookingSubmitting=false;

function showSuccessState() {
  document.getElementById('booking-content').hidden = true;
  document.getElementById('booking-intro').hidden = true;
  document.getElementById('success-state').hidden = false;
  document.getElementById('success-state').focus();
}
function inlineError(message) {
  const status=document.getElementById('booking-status');status.textContent=message;status.focus();
}
document.getElementById('cal-prev').addEventListener('click',()=>calShift(-1));
document.getElementById('cal-next').addEventListener('click',()=>calShift(1));
document.getElementById('coupon-btn').addEventListener('click',applyCoupon);
document.getElementById('f-coupon').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase());

document.getElementById('book-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!selPkg) { inlineError('Please select a package first.'); return; }
  if (!document.getElementById('f-date').value) { inlineError('Pick an open date on the calendar first.'); return; }
  if (!document.getElementById('f-local').checked) { inlineError('Please confirm your session is in Valdosta or a nearby community.'); document.getElementById('f-local').focus(); return; }

  // Anti-spam: honeypot filled or form completed inhumanly fast → fake success, save nothing
  if (document.getElementById('f-website').value || Date.now() - PAGE_LOADED < 3000) {
    showSuccessState();
    return;
  }

  const btn = document.getElementById('submit-btn');
  document.getElementById('booking-status').textContent='';
  if(bookingSubmitting)return; bookingSubmitting=true;
  btn.disabled = true; btn.textContent = 'Sending…';

  const typeAnswers = collectTypeAnswers();
  const freeNotes   = document.getElementById('f-notes').value.trim();
  const dateNote    = pickedPartial ? 'Client picked a limited-availability day' : '';

  const first = document.getElementById('f-first').value.trim();
  const last  = document.getElementById('f-last').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const phone = document.getElementById('f-phone').value.trim() || null;
  const sessionType = document.getElementById('f-sport').value;
  const portfolioNote = document.getElementById('f-portfolio').checked
    ? 'Portfolio use: approved' : 'Portfolio use: not approved';
  const combinedNotes = [typeAnswers, dateNote, portfolioNote, freeNotes].filter(Boolean).join(' | ') || null;

  try {
    const response=await fetch('/api/book-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      submission_id:bookingSubmissionId,name:[first,last].join(' '),email,phone:phone || '',
      date:document.getElementById('f-date').value,time:document.getElementById('f-time').value,
      session_type:sessionType,package_id:selPkg.id,addon_ids:[...selectedAddons],
      coupon:appliedCoupon?.code || '',notes:combinedNotes || '',agreed:document.getElementById('f-agree').checked,
      local:document.getElementById('f-local').checked,
      portfolio:document.getElementById('f-portfolio').checked,website:'',elapsed:Date.now()-PAGE_LOADED
    }),signal:AbortSignal.timeout(45000)});
    const result=await response.json();
    if(!response.ok || !result.ok)throw new Error(result.error || 'Your request could not be saved.');
    showSuccessState();
  }catch(error){inlineError(error.message);btn.disabled=false;btn.textContent='Send booking request';}
  finally{bookingSubmitting=false;}
});

function startBooking() {
  const now = new Date();
  calY = now.getFullYear();
  calM = now.getMonth();
  renderCal();
  loadAvailability();
  loadPackages();
  loadAddons();
  // Prefill promo code from admin share links: /book?coupon=CODE
  const urlCoupon = new URLSearchParams(window.location.search).get('coupon');
  if (urlCoupon) {
    document.getElementById('f-coupon').value = urlCoupon.toUpperCase();
    applyCoupon();
  }
}

// Studio can pause booking until a resume date. Show a countdown instead of the
// form; when it reaches zero the page reloads and the form is back. A slow or
// missing setting never blocks booking.
function showPause(resumeAt) {
  document.getElementById('booking-intro').hidden = true;
  document.getElementById('booking-content').hidden = true;
  const panel = document.getElementById('booking-paused');
  panel.hidden = false;
  document.getElementById('paused-date').textContent = 'Bookings open ' + resumeLabel(resumeAt) + '.';
  const units = [...panel.querySelectorAll('[data-unit]')];
  let timer;
  const tick = () => {
    const left = resumeAt - Date.now();
    if (left <= 0) { clearInterval(timer); location.reload(); return; }
    const parts = countdown(left);
    units.forEach(el => { el.textContent = String(parts[el.dataset.unit]).padStart(2, '0'); });
  };
  tick();
  timer = setInterval(tick, 1000);
}
const settingsTimeout = new Promise(resolve => setTimeout(() => resolve({}), 4000));
Promise.race([sb.from('site_settings').select('booking_paused,booking_resume_at').eq('id', 1).maybeSingle(), settingsTimeout])
  .then(({ data }) => pauseState(data), () => pauseState(null))
  .then(pause => { if (pause.paused) showPause(pause.resumeAt); else startBooking(); })
  .finally(() => document.querySelector('.booking-page').removeAttribute('data-pause-check'));
