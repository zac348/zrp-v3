import {esc} from './shared.js';
export function setupOverview(ctx) {
  function render() {
    const {portfolio,portfolioError}=ctx.state,requests=ctx.bookings.rows();
    const categories=new Set(portfolio.map(p=>p.sport).filter(Boolean));
    const counts={portfolio:portfolioError?'—':portfolio.length,categories:portfolioError?'—':categories.size,bookings:requests.length,pending:requests.filter(r=>r.status==='pending').length};
    for(const [key,count] of Object.entries(counts))document.getElementById('st-'+key).textContent=count;
    if(portfolioError)document.getElementById('st-portfolio').title=portfolioError;
    document.getElementById('ov-bookings').innerHTML=requests.slice(0,5).map(row=>`<p><a href="#bookings">${esc(row.details?.name||row.name)}</a> — ${esc(row.status)}</p>`).join('')||'<p class="no-data">No enquiries yet.</p>';
  }
  return {render};
}
