// Accepted requests remain active until published or declined, regardless of date.
export function groupBookings(deliveries = []) {
  const groups = {new: [], active: [], history: []};
  for (const row of deliveries) {
    const status = row.status || 'pending';
    const section = status === 'pending' ? 'new' : ['published', 'declined'].includes(status) ? 'history' : 'active';
    groups[section].push({source: 'delivery', row});
  }
  for (const list of Object.values(groups)) list.sort((a, b) => (Date.parse(b.row.created_at) || 0) - (Date.parse(a.row.created_at) || 0));
  return groups;
}
