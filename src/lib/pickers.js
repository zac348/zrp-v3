import {easternDay} from './booking-pause.js';

// Site-styled replacements for the browser's date and time pickers. The native
// <input type="date|time"> stays in its form, so .value, FormData, required and
// min/max keep working; it is visually hidden behind a button that opens a month
// calendar or an iPhone-style time wheel. Code that sets input.value updates the
// button too.
const VALUE = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
const toDay = date => date.toISOString().slice(0, 10);
const parse = day => new Date(day + 'T00:00:00Z');
const addDays = (day, n) => { const d = parse(day); d.setUTCDate(d.getUTCDate() + n); return toDay(d); };
const addMonths = (day, n) => {
  const [y, m, d] = day.split('-').map(Number);
  const last = new Date(Date.UTC(y, m + n, 0)).getUTCDate();
  return toDay(new Date(Date.UTC(y, m - 1 + n, Math.min(d, last))));
};
const format = (day, options) => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', ...options}).format(parse(day));
const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };
let uid = 0;

function mount(input, kind, {placeholder, text, dialogLabel, onOpen}) {
  const n = ++uid;
  const wrap = el('span', 'picker picker-' + kind);
  input.before(wrap); wrap.append(input);
  input.classList.add('picker-native'); input.tabIndex = -1; input.setAttribute('aria-hidden', 'true');
  const trigger = el('button', 'picker-trigger'); trigger.type = 'button'; trigger.id = 'picker-' + n;
  trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
  const pop = el('div', 'picker-pop'); pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', dialogLabel);
  const message = el('p', 'picker-error'); message.id = 'picker-error-' + n; message.hidden = true;
  wrap.append(trigger, pop, message);
  const label = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
  if (label) { label.id ||= 'picker-label-' + n; trigger.setAttribute('aria-labelledby', label.id + ' ' + trigger.id); }

  const api = {
    trigger, pop,
    sync() {
      const v = VALUE.get.call(input);
      trigger.textContent = v ? text(v) : placeholder;
      trigger.classList.toggle('empty', !v);
      trigger.disabled = input.disabled;
      if (v) { message.hidden = true; trigger.removeAttribute('aria-invalid'); trigger.removeAttribute('aria-describedby'); }
    },
    set(v) {
      VALUE.set.call(input, v); api.sync();
      input.dispatchEvent(new Event('input', {bubbles: true})); input.dispatchEvent(new Event('change', {bubbles: true}));
    },
    open() { if (input.disabled || !pop.hidden) return; pop.hidden = false; trigger.setAttribute('aria-expanded', 'true'); onOpen(); },
    close(returnFocus) { if (pop.hidden) return; pop.hidden = true; trigger.setAttribute('aria-expanded', 'false'); if (returnFocus) trigger.focus(); },
  };
  Object.defineProperty(input, 'value', {configurable: true, get() { return VALUE.get.call(this); }, set(v) { VALUE.set.call(this, v); api.sync(); }});
  new MutationObserver(api.sync).observe(input, {attributes: true, attributeFilter: ['disabled']});
  input.form?.addEventListener('reset', () => setTimeout(api.sync));
  // A required field left empty shows its message under the button instead of the
  // browser's bubble, and focus goes to the button if this is the first problem.
  input.addEventListener('invalid', e => {
    e.preventDefault();
    message.textContent = input.validationMessage || 'Please choose a value.'; message.hidden = false;
    trigger.setAttribute('aria-invalid', 'true'); trigger.setAttribute('aria-describedby', message.id);
    const first = [...(input.form?.elements || [])].find(field => field.willValidate && !field.validity.valid);
    if (!first || first === input) trigger.focus();
  });
  input.addEventListener('focus', () => trigger.focus());
  label?.addEventListener('click', e => { e.preventDefault(); trigger.focus(); });
  trigger.addEventListener('click', () => (pop.hidden ? api.open() : api.close(false)));
  pop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); api.close(true); } });
  pop.addEventListener('mousedown', e => { if (!e.target.closest('button, [tabindex]')) e.preventDefault(); });
  // Close when focus moves elsewhere on the page, not when the window loses focus.
  wrap.addEventListener('focusout', () => setTimeout(() => { if (!wrap.contains(document.activeElement)) api.close(false); }));
  document.addEventListener('pointerdown', e => { if (!wrap.contains(e.target)) api.close(false); });
  api.sync();
  return api;
}

function footer(input, api, done) {
  const foot = el('div', 'picker-foot');
  if (!input.required) {
    const clear = el('button', 'btn-sm', 'Clear'); clear.type = 'button';
    clear.addEventListener('click', () => { api.set(''); api.close(true); });
    foot.append(clear);
  }
  if (done) { const ok = el('button', 'btn', 'Done'); ok.type = 'button'; ok.addEventListener('click', done); foot.append(ok); }
  return foot;
}

// Month calendar. Arrows move by day/week, Home/End to the week's ends,
// PageUp/PageDown by month, Enter picks.
export function enhanceDate(input) {
  if (input.closest('.picker')) return;
  let view = '', focusDay = '';
  const bounds = () => ({min: input.min || '', max: input.max || ''});
  const clamp = day => { const {min, max} = bounds(); return min && day < min ? min : max && day > max ? max : day; };
  const api = mount(input, 'date', {
    placeholder: 'Choose a date', dialogLabel: 'Choose a date',
    text: v => format(v, {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'}),
    onOpen() {
      focusDay = clamp(VALUE.get.call(input) || easternDay(new Date()));
      view = focusDay.slice(0, 7); render();
      grid.querySelector(`[data-day="${focusDay}"]`)?.focus();
    },
  });
  const head = el('div', 'picker-head'), title = el('p', 'picker-month'), nav = el('div', 'picker-nav');
  title.setAttribute('aria-live', 'polite');
  const navButton = (text, label, step) => {
    const b = el('button', '', text); b.type = 'button'; b.setAttribute('aria-label', label);
    b.addEventListener('click', () => { view = addMonths(view + '-01', step).slice(0, 7); focusDay = clamp(view + '-01'); render(); });
    return b;
  };
  const prev = navButton('‹', 'Previous month', -1), next = navButton('›', 'Next month', 1);
  nav.append(prev, next); head.append(title, nav);
  const dow = el('div', 'picker-dow'); dow.setAttribute('aria-hidden', 'true');
  for (const d of ['S', 'M', 'T', 'W', 'T', 'F', 'S']) dow.append(el('span', '', d));
  const grid = el('div', 'picker-days');
  api.pop.append(head, dow, grid);
  if (!input.required) api.pop.append(footer(input, api));

  function render() {
    const {min, max} = bounds();
    const [y, m] = view.split('-').map(Number);
    const first = view + '-01', length = new Date(Date.UTC(y, m, 0)).getUTCDate(), today = easternDay(new Date());
    title.textContent = format(first, {month: 'long', year: 'numeric'});
    prev.disabled = !!min && addDays(first, -1) < min;
    next.disabled = !!max && addDays(`${view}-${String(length).padStart(2, '0')}`, 1) > max;
    const cells = [];
    for (let i = parse(first).getUTCDay(); i > 0; i--) cells.push(el('span'));
    for (let d = 1; d <= length; d++) {
      const day = `${view}-${String(d).padStart(2, '0')}`;
      const b = el('button', 'picker-day', d); b.type = 'button'; b.dataset.day = day;
      b.setAttribute('aria-label', format(day, {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'}));
      if (day === VALUE.get.call(input)) b.setAttribute('aria-pressed', 'true');
      if (day === today) b.setAttribute('aria-current', 'date');
      b.disabled = (!!min && day < min) || (!!max && day > max);
      b.tabIndex = day === focusDay ? 0 : -1;
      cells.push(b);
    }
    grid.replaceChildren(...cells);
  }
  function moveTo(day) {
    focusDay = clamp(day);
    view = focusDay.slice(0, 7); render();
    grid.querySelector(`[data-day="${focusDay}"]`)?.focus();
  }
  grid.addEventListener('click', e => { const b = e.target.closest('.picker-day'); if (b && !b.disabled) { api.set(b.dataset.day); api.close(true); } });
  grid.addEventListener('keydown', e => {
    const day = e.target.dataset?.day; if (!day) return;
    const weekday = parse(day).getUTCDay();
    const moves = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday};
    if (e.key in moves) { e.preventDefault(); moveTo(addDays(day, moves[e.key])); }
    else if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); moveTo(addMonths(day, e.key === 'PageUp' ? -1 : 1)); }
  });
  return api;
}

// iPhone-style wheel: hour, minute, AM/PM columns that snap into a centre band.
// Scroll, swipe, click a row, or use the arrow keys on a column.
export function enhanceTime(input) {
  if (input.closest('.picker')) return;
  const ROW = 40;
  let armed = false, lastHour = 10;
  const to12 = v => { const [h, m] = v.split(':').map(Number); return {h: h % 12 || 12, m, pm: h >= 12}; };
  const api = mount(input, 'time', {
    placeholder: 'Choose a time', dialogLabel: 'Choose a time',
    text: v => { const t = to12(v); return `${t.h}:${String(t.m).padStart(2, '0')} ${t.pm ? 'PM' : 'AM'}`; },
    onOpen() {
      const t = to12(VALUE.get.call(input) || input.dataset.default || '10:00');
      const step = Number(input.step) >= 60 && Number(input.step) % 60 === 0 ? Number(input.step) / 60 : 5;
      const minutes = [...new Set([...Array.from({length: Math.ceil(60 / step)}, (_, i) => i * step), t.m])].filter(m => m < 60).sort((a, b) => a - b);
      fill(cols.minute, minutes.map(m => [m, String(m).padStart(2, '0')]));
      armed = false; lastHour = t.h;
      place(cols.hour, t.h - 1); place(cols.minute, minutes.indexOf(t.m)); place(cols.period, t.pm ? 1 : 0);
      cols.hour.focus({preventScroll: true});
    },
  });
  const wheel = el('div', 'wheel');
  const column = label => {
    const col = el('div', 'wheel-col'); col.tabIndex = 0;
    col.setAttribute('role', 'spinbutton'); col.setAttribute('aria-label', label);
    wheel.append(col); return col;
  };
  const cols = {hour: column('Hour'), minute: column('Minutes'), period: column('AM or PM')};
  function fill(col, items) {
    col.items = items;
    col.replaceChildren(el('div', 'wheel-pad'), ...items.map(([, text], i) => { const row = el('div', 'wheel-item', text); row.dataset.i = i; return row; }), el('div', 'wheel-pad'));
  }
  fill(cols.hour, Array.from({length: 12}, (_, i) => [i + 1, String(i + 1)]));
  fill(cols.period, [[0, 'AM'], [1, 'PM']]);
  const index = col => Math.max(0, Math.min(col.items.length - 1, Math.round(col.scrollTop / ROW)));
  // While a column animates toward a row, `target` is where it is heading, so
  // quick repeated key presses and commits use the destination, not the midpoint.
  const current = col => col.target ?? index(col);
  function mark(col) {
    const i = current(col);
    col.querySelectorAll('.wheel-item').forEach((row, j) => row.classList.toggle('on', j === i));
    col.setAttribute('aria-valuenow', String(col.items[i][0])); col.setAttribute('aria-valuetext', col.items[i][1]);
  }
  function place(col, i, behavior = 'auto') {
    col.target = behavior === 'smooth' ? Math.max(0, i) : undefined;
    col.scrollTo({top: Math.max(0, i) * ROW, behavior}); mark(col);
  }
  function commit() {
    if (!armed) return;
    const h12 = cols.hour.items[current(cols.hour)][0];
    // Like the iPhone wheel: passing between 11 and 12 flips AM/PM, so 11 AM → 12 is noon.
    if ((lastHour === 12) !== (h12 === 12)) place(cols.period, 1 - current(cols.period), smooth());
    lastHour = h12;
    const m = cols.minute.items[current(cols.minute)][0], pm = current(cols.period) === 1;
    api.set(`${String((h12 % 12) + (pm ? 12 : 0)).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  for (const col of Object.values(cols)) {
    let settle;
    col.addEventListener('scroll', () => { mark(col); clearTimeout(settle); settle = setTimeout(() => { col.target = undefined; mark(col); commit(); }, 120); });
    // A mouse-wheel notch moves exactly one row; trackpads and touch scroll natively.
    col.addEventListener('wheel', e => {
      if (e.deltaMode === 0 && Math.abs(e.deltaY) < 50) return;
      e.preventDefault(); armed = true;
      place(col, Math.max(0, Math.min(col.items.length - 1, current(col) + Math.sign(e.deltaY))), smooth()); commit();
    }, {passive: false});
    col.addEventListener('click', e => { const row = e.target.closest('.wheel-item'); if (row) { armed = true; place(col, Number(row.dataset.i), smooth()); commit(); } });
    col.addEventListener('keydown', e => {
      const last = col.items.length - 1, i = current(col);
      const next = {ArrowUp: i - 1, ArrowDown: i + 1, Home: 0, End: last}[e.key];
      if (next !== undefined) { e.preventDefault(); armed = true; place(col, Math.max(0, Math.min(last, next)), smooth()); commit(); }
      else if (e.key === 'Enter') { e.preventDefault(); armed = true; commit(); api.close(true); }
    });
  }
  // Direct scrolling, dragging or swiping takes over from any keyboard animation.
  for (const type of ['pointerdown', 'wheel', 'touchstart']) wheel.addEventListener(type, e => { armed = true; const col = e.target.closest('.wheel-col'); if (col && !e.defaultPrevented) col.target = undefined; }, {passive: true});
  api.pop.append(wheel, footer(input, api, () => { armed = true; commit(); api.close(true); }));
  return api;
}

export function enhancePickers(root = document) {
  root.querySelectorAll('input[type="date"]').forEach(enhanceDate);
  root.querySelectorAll('input[type="time"]').forEach(enhanceTime);
}
