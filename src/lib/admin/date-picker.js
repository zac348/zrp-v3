import {easternDay} from '../booking-pause.js';

// Month calendar for Studio date fields, in the site's style. Values are Eastern
// calendar days ('YYYY-MM-DD'); day arithmetic stays in UTC so DST never shifts
// a date. Keyboard: arrows move by day/week, Home/End to the week's ends,
// PageUp/PageDown by month, Enter picks, Escape closes.
const key = date => date.toISOString().slice(0, 10);
const parse = day => new Date(day + 'T00:00:00Z');
const addDays = (day, n) => { const d = parse(day); d.setUTCDate(d.getUTCDate() + n); return key(d); };
const addMonths = (day, n) => {
  const [y, m, d] = day.split('-').map(Number);
  const last = new Date(Date.UTC(y, m + n, 0)).getUTCDate();
  return key(new Date(Date.UTC(y, m - 1 + n, Math.min(d, last))));
};
const format = (day, options) => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', ...options}).format(parse(day));

export function createDatePicker({input, trigger, pop, placeholder = 'Choose a date'}) {
  const root = trigger.parentElement;
  let min = '', view = '', focusDay = '';

  const head = document.createElement('div'); head.className = 'dp-head';
  const title = document.createElement('p'); title.className = 'dp-month'; title.setAttribute('aria-live', 'polite');
  const nav = document.createElement('div'); nav.className = 'dp-nav';
  const navButton = (text, label, step) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.setAttribute('aria-label', label);
    b.addEventListener('click', () => { view = addMonths(view + '-01', step).slice(0, 7); focusDay = clamp(view + '-01'); render(); });
    return b;
  };
  const prev = navButton('‹', 'Previous month', -1), next = navButton('›', 'Next month', 1);
  nav.append(prev, next); head.append(title, nav);
  const dow = document.createElement('div'); dow.className = 'dp-dow'; dow.setAttribute('aria-hidden', 'true');
  for (const d of ['S', 'M', 'T', 'W', 'T', 'F', 'S']) dow.append(Object.assign(document.createElement('span'), {textContent: d}));
  const grid = document.createElement('div'); grid.className = 'dp-days';
  pop.replaceChildren(head, dow, grid);

  const clamp = day => (min && day < min ? min : day);
  function label() {
    trigger.textContent = input.value ? format(input.value, {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'}) : placeholder;
  }
  function render() {
    const [y, m] = view.split('-').map(Number);
    const first = view + '-01', length = new Date(Date.UTC(y, m, 0)).getUTCDate(), today = easternDay(new Date());
    title.textContent = format(first, {month: 'long', year: 'numeric'});
    prev.disabled = !!min && addDays(first, -1) < min;
    const cells = [];
    for (let i = parse(first).getUTCDay(); i > 0; i--) cells.push(Object.assign(document.createElement('span'), {className: 'dp-empty'}));
    for (let d = 1; d <= length; d++) {
      const day = `${view}-${String(d).padStart(2, '0')}`;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'dp-day'; b.textContent = d; b.dataset.day = day;
      b.setAttribute('aria-label', format(day, {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'}));
      if (day === input.value) b.setAttribute('aria-pressed', 'true');
      if (day === today) b.setAttribute('aria-current', 'date');
      b.disabled = !!min && day < min;
      b.tabIndex = day === focusDay ? 0 : -1;
      cells.push(b);
    }
    grid.replaceChildren(...cells);
  }
  function moveTo(day) {
    focusDay = clamp(day);
    if (focusDay.slice(0, 7) !== view) view = focusDay.slice(0, 7);
    render();
    grid.querySelector(`[data-day="${focusDay}"]`)?.focus();
  }
  function open() {
    focusDay = clamp(input.value || addDays(easternDay(new Date()), 1));
    view = focusDay.slice(0, 7);
    render();
    pop.hidden = false; trigger.setAttribute('aria-expanded', 'true');
    grid.querySelector(`[data-day="${focusDay}"]`)?.focus();
  }
  function close(returnFocus) {
    if (pop.hidden) return;
    pop.hidden = true; trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus();
  }
  function choose(day) {
    input.value = day; label(); close(true);
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }

  trigger.addEventListener('click', () => (pop.hidden ? open() : close(false)));
  grid.addEventListener('click', e => { const b = e.target.closest('.dp-day'); if (b && !b.disabled) choose(b.dataset.day); });
  pop.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
    const day = e.target.dataset?.day; if (!day) return;
    const weekday = parse(day).getUTCDay();
    const moves = {ArrowLeft: () => addDays(day, -1), ArrowRight: () => addDays(day, 1), ArrowUp: () => addDays(day, -7), ArrowDown: () => addDays(day, 7),
      Home: () => addDays(day, -weekday), End: () => addDays(day, 6 - weekday), PageUp: () => addMonths(day, -1), PageDown: () => addMonths(day, 1)};
    if (moves[e.key]) { e.preventDefault(); moveTo(moves[e.key]()); }
  });
  // Close when focus moves elsewhere on the page, not when the window itself loses focus.
  root.addEventListener('focusout', () => setTimeout(() => { if (!root.contains(document.activeElement)) close(false); }));
  pop.addEventListener('mousedown', e => { if (!e.target.closest('button')) e.preventDefault(); }); // blank space keeps focus
  document.addEventListener('pointerdown', e => { if (!root.contains(e.target)) close(false); });
  label();

  return {
    set(value) { input.value = value || ''; label(); },
    setMin(day) { min = day || ''; },
    close,
  };
}
