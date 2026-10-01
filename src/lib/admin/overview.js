import {esc} from './shared.js';
export function setupOverview(ctx) {
  function render() {
    const {photos,galleries}=ctx.state,requests=ctx.bookings.rows();
    const counts={photos:photos.length,galleries:galleries.length,bookings:requests.length,pending:requests.filter(r=>r.status==='pending').length,portfolio:photos.filter(p=>p.on_portfolio).length};
    for(const [key,count] of Object.entries(counts))document.getElementById('st-'+key).textContent=count;
    document.getElementById('ov-bookings').innerHTML=requests.slice(0,5).map(row=>`<p><a href="#bookings">${esc(row.details?.name||row.name)}</a> — ${esc(row.status)}</p>`).join('')||'<p class="no-data">No enquiries yet.</p>';
    ctx.photos.syncOptimizeButton();
  }
  return {render};
}
