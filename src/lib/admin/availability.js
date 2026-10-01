import {confirmChange} from './dialog.js';
import {checked, checkedFetch, esc, toast, fmtBytes} from './shared.js';
export function setupAvailability(ctx) {
  const {sb,state}=ctx;
// ── AVAILABILITY CALENDAR ──
let calYear, calMonth, calBlocks = [], selectedDate = null, blockType = null;
let bulkMode = false, selectedDates = new Set();

function toggleBulkMode() {
  bulkMode = !bulkMode;
  selectedDates.clear();
  selectedDate = null;
  document.getElementById('day-editor').classList.remove('open');
  document.getElementById('bulk-mode-btn').textContent = bulkMode ? 'Exit bulk' : 'Bulk select';
  document.getElementById('avail-sub').textContent = bulkMode
    ? 'Click multiple days to select them, then apply a status to all at once.'
    : 'Click any date to mark it available, partial, or unavailable.';
  updateCalBulkBar();
  renderCalendar();
}

function updateCalBulkBar() {
  const bar = document.getElementById('cal-bulk-bar');
  const count = selectedDates.size;
  bar.classList.toggle('visible', bulkMode);
  document.getElementById('bulk-count-label').textContent = count + ' day' + (count !== 1 ? 's' : '') + ' selected';
}

async function applyBulk(type) {
  if (!selectedDates.size) { toast('No days selected'); return; }
  if(!await confirmChange('Replace availability for '+selectedDates.size+' selected day(s)?'))return;
  const dates = [...selectedDates];
  for (const date of dates) {
    await checked(sb.from('availability').delete().eq('date', date));
    if (type !== 'clear') {
      await checked(sb.from('availability').insert({ date, status: type }));
    }
  }
  const { data } = await checked(sb.from('availability').select('*').order('date'));
  state.blocks = data || [];
  selectedDates.clear();
  updateCalBulkBar();
  renderCalendar();
  toast(type === 'clear' ? `Cleared ${dates.length} day(s)` : `Marked ${dates.length} day(s) as ${type}`);
}

async function loadBlocks() {
  const { data } = await checked(sb.from('availability').select('*').order('date'));
  state.blocks = data || [];
}

function renderCalendar() {
  const now = new Date();
  if (!calYear) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
  const today = now.toISOString().slice(0,10);
  document.getElementById('cal-month-label').textContent =
    new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const monthStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}`;

  for (let i=0; i<firstDay; i++) { const el=document.createElement('div'); el.className='cal-day empty'; grid.appendChild(el); }
  for (let d=1; d<=daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2,'0')}`;
    const blocks = state.blocks.filter(b => b.date === dateStr);
    const status = blocks.length
      ? (blocks.some(b=>b.status==='unavailable'&&!b.start_time) ? 'unavailable'
        : blocks.some(b=>b.status==='partial') ? 'partial'
        : blocks.some(b=>b.status==='available') ? 'available' : null)
      : null;
    const isPast = dateStr < today;
    const el = document.createElement('button');el.type='button';el.disabled=isPast;el.setAttribute('aria-label',dateStr+(status?', '+status:''));el.setAttribute('aria-pressed',String(bulkMode?selectedDates.has(dateStr):selectedDate===dateStr));
    let cls = 'cal-day';
    if (isPast) cls += ' past'; else cls += ' clickable';
    if (dateStr === today) cls += ' today';
    if (dateStr === selectedDate) cls += ' selected';
    if (bulkMode && selectedDates.has(dateStr)) cls += ' bulk-sel';
    if (status) cls += ' ' + status;
    el.className = cls;
    el.innerHTML = `<span>${d}</span>`;
    if (status) {
      const dot = document.createElement('div');
      dot.className = 'availability-mark';
      dot.textContent=status==='partial'?'−':status==='available'?'+':'×';dot.setAttribute('aria-hidden','true');
      el.appendChild(dot);
    }
    if (!isPast) el.addEventListener('click', () => {
      if (bulkMode) {
        if (selectedDates.has(dateStr)) selectedDates.delete(dateStr);
        else selectedDates.add(dateStr);
        updateCalBulkBar();
        renderCalendar();
      } else {
        openEditor(dateStr);
      }
    });
    grid.appendChild(el);
  }

  // Blocks list
  const monthBlocks = state.blocks.filter(b => b.date.startsWith(monthStr));
  const bl = document.getElementById('blocks-list');
  if (!monthBlocks.length) { bl.innerHTML = '<p class="no-data">No blocks this month.</p>'; return; }
  bl.innerHTML = monthBlocks.map(b => `
    <div class="block-row">
      <div class="block-row-left">
        <strong>${b.date}</strong>
        <span class="block-status-badge ${b.status}">${b.status}</span>
        ${b.start_time ? ` ${b.start_time}–${b.end_time || '?'}` : ''}
        ${b.note ? ` — ${esc(b.note)}` : ''}
      </div>
      <button class="btn-sm red" data-action="deleteBlock" data-args="${esc(JSON.stringify([b.id]))}">Remove</button>
    </div>`).join('');
}

function shiftMonth(dir) {
  calMonth += dir;
  if (calMonth>11) { calMonth=0; calYear++; }
  if (calMonth<0)  { calMonth=11; calYear--; }
  renderCalendar();
}

function openEditor(dateStr) {
  selectedDate = dateStr;
  blockType = null;
  document.getElementById('editor-title').textContent = 'Edit: ' + dateStr;
  document.getElementById('block-note').value = '';
  document.getElementById('block-start').value = '09:00';
  document.getElementById('block-end').value = '17:00';
  document.getElementById('time-row').classList.add('hidden');
  ['unavail','partial','avail','clear'].forEach(t => {
    document.getElementById('btn-'+t)?.classList.remove('sel-'+t);
  });
  document.getElementById('day-editor').classList.add('open');
  renderCalendar();
}

function setBlockType(type) {
  blockType = type;
  document.querySelectorAll('.btype-btn').forEach(b => {
    ['sel-unavail','sel-partial','sel-avail','sel-clear'].forEach(c => b.classList.remove(c));
  });
  const map = { unavailable:'sel-unavail', partial:'sel-partial', available:'sel-avail', clear:'sel-clear' };
  const btn = document.getElementById('btn-' + (type==='unavailable'?'unavail':type==='available'?'avail':type==='clear'?'clear':'partial'));
  if (btn && map[type]) btn.classList.add(map[type]);
  document.getElementById('time-row').classList.toggle('hidden', type !== 'partial');
}

async function saveBlock() {
  if (!selectedDate || !blockType) { toast('Pick a type first'); return; }
  if (!await confirmChange('Replace availability for '+selectedDate+'?'))return;
  if(blockType==='partial'&&document.getElementById('block-start').value>=document.getElementById('block-end').value){toast('End time must be after start time');return;}
  if (blockType === 'clear') {
    await checked(sb.from('availability').delete().eq('date', selectedDate));
    toast('Block cleared');
  } else {
    await checked(sb.from('availability').delete().eq('date', selectedDate));
    const insert = {
      date: selectedDate, status: blockType,
      note: document.getElementById('block-note').value || null,
    };
    if (blockType === 'partial') {
      insert.start_time = document.getElementById('block-start').value;
      insert.end_time   = document.getElementById('block-end').value;
    }
    await checked(sb.from('availability').insert(insert));
    toast('Availability saved');
  }
  const { data } = await checked(sb.from('availability').select('*').order('date'));
  state.blocks = data || [];
  closeEditor();
  renderCalendar();
}

async function deleteBlock(id) {
  if(!await confirmChange('Remove this availability block?'))return;
  await checked(sb.from('availability').delete().eq('id', id));
  const { data } = await checked(sb.from('availability').select('*').order('date'));
  state.blocks = data || [];
  renderCalendar(); toast('Block removed');
}

function closeEditor() {
  selectedDate = null; blockType = null;
  document.getElementById('day-editor').classList.remove('open');
  renderCalendar();
}


  return {load: loadBlocks, render: renderCalendar, actions: {applyBulk, closeEditor, deleteBlock, saveBlock, setBlockType, shiftMonth, toggleBulkMode}};
}
