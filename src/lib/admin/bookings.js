import {setupDeliveryAdmin} from '../delivery-admin.js';
export function setupBookings(ctx) {
  const load=setupDeliveryAdmin(ctx.sb,{onChange:()=>ctx.overview.render()});
  return {load,rows:load.rows};
}
