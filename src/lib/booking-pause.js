// Booking pause. Studio can stop new booking requests until a chosen date.
// The pause ends by itself at midnight Eastern on that date; no job runs.
// Shared by /book, Studio, and the booking endpoint, so keep it free of
// browser-only or build-only globals.
export const SETTINGS_QUERY = 'select=booking_paused,booking_resume_at&id=eq.1';

export function pauseState(row, now = Date.now()) {
  const at = row?.booking_paused ? Date.parse(row.booking_resume_at) : NaN;
  return Number.isFinite(at) && at > now ? {paused: true, resumeAt: new Date(at)} : {paused: false, resumeAt: null};
}

// 'YYYY-MM-DD' → the instant that day starts in Valdosta (America/New_York).
export function easternMidnight(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return null;
  const [y, m, d] = day.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 5); // midnight if Eastern is on standard time
  if (new Date(guess).toISOString().slice(0, 10) !== day) return null;
  const hour = Number(new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23'}).format(new Date(guess)));
  return new Date(guess - hour * 3600000); // daylight time runs an hour ahead
}

export function easternDay(date) {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'}).format(date);
}

export function resumeLabel(date, now = new Date()) {
  const sameYear = easternDay(date).slice(0, 4) === easternDay(now).slice(0, 4);
  return new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric', ...(sameYear ? {} : {year: 'numeric'})}).format(date);
}

export function countdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60};
}
