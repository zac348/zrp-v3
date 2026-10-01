export function calendarMessage(calendar, action='Accepted') {
  if(!calendar)return '';
  const date=calendar.date?new Date(calendar.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'the session date';
  switch(calendar.status){
    case 'blocked':return `${action}. ${date} is now blocked on your calendar.`;
    case 'already_blocked':return `${action}. Heads up: ${date} was already blocked or manually marked. Check for a double booking.`;
    case 'unblocked':return `${action}. ${date} is open again.`;
    case 'no_date':return `${action}. There's no exact date yet, so the calendar will update when the session details are saved.`;
    case 'skipped_past':return `${action}. ${date} is in the past, so the calendar was not changed.`;
    case 'failed':return action==='Declined'?`Declined, but the calendar couldn't be updated. Check ${date} in Availability.`:`${action}, but the calendar couldn't be updated. Block ${date} in Availability.`;
    default:return '';
  }
}
