import {createClient} from '@supabase/supabase-js';
import {BOOKING_OPEN} from '../../config.js';
import {bindActions,toast} from './shared.js';
import {setupOverview} from './overview.js';
import {setupPhotos} from './photos.js';
import {setupGalleries} from './galleries.js';
import {setupBookings} from './bookings.js';
import {setupAvailability} from './availability.js';
import {setupPricing} from './pricing.js';
import {setupCoupons} from './coupons.js';
import {setupPrint} from './print.js';

const ctx={sb:createClient(import.meta.env.PUBLIC_SUPABASE_URL,import.meta.env.PUBLIC_SUPABASE_ANON_KEY),state:{photos:[],galleries:[],blocks:[],coupons:[]}};
ctx.overview=setupOverview(ctx);
ctx.photos=setupPhotos(ctx);
ctx.galleries=setupGalleries(ctx);
ctx.bookings=setupBookings(ctx);
ctx.availability=setupAvailability(ctx);
ctx.pricing=setupPricing(ctx);
ctx.coupons=setupCoupons(ctx);
ctx.print=setupPrint(ctx);

function switchTab(name) {
  if(!BOOKING_OPEN&&['calendar','coupons'].includes(name))name='overview';
  if(!document.getElementById('tab-'+name))name='overview';
  document.querySelectorAll('.tab').forEach(tab=>tab.classList.toggle('active',tab.id==='tab-'+name));
  document.querySelectorAll('[data-tab]').forEach(button=>{const active=button.dataset.tab===name;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');});
  if(name==='calendar')ctx.availability.render();
  if(name==='envelope')document.fonts.ready.then(ctx.print.render);
}
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{location.hash=button.dataset.tab;}));
function followHash(){switchTab(location.hash==='#enquiries'?'bookings':location.hash.slice(1)||'overview');}
window.addEventListener('hashchange',followHash);
bindActions(Object.assign({},...Object.values(ctx).map(m=>m.actions||{}),{uppercase:()=>{document.getElementById('cp-code').value=document.getElementById('cp-code').value.toUpperCase();},doLogout:async()=>{await ctx.sb.auth.signOut();location.href='/login';}}));
ctx.sb.auth.getSession().then(async({data})=>{
  if(!data.session){location.href='/login';return;}
  followHash();
  const loaders=[ctx.photos,ctx.galleries,ctx.pricing,ctx.bookings,...(BOOKING_OPEN?[ctx.availability,ctx.coupons]:[])];
  const results=await Promise.allSettled(loaders.map(m=>m.load()));
  for(const result of results)if(result.status==='rejected')toast(result.reason.message||'Some studio data could not load. Refresh to retry.');
  ctx.overview.render();if(location.hash==='#calendar')ctx.availability.render();
});
