// Both booking generations use the same visible workflow. A session date
// passing does not hide an undelivered booking from the active section.
export function groupBookings(deliveries=[],legacy=[]) {
  const groups={new:[],active:[],history:[]};
  for(const [source,rows] of [['delivery',deliveries],['legacy',legacy]]) {
    for(const row of rows) {
      const status=row.status || 'pending';
      const section=status==='pending'?'new':['published','delivered','declined','cancelled'].includes(status)?'history':'active';
      groups[section].push({source,row});
    }
  }
  for(const list of Object.values(groups))list.sort((a,b)=>(Date.parse(b.row.created_at)||0)-(Date.parse(a.row.created_at)||0));
  return groups;
}
