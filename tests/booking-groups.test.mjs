import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupBookings} from '../src/lib/booking-groups.js';
test('new and legacy pending requests share the top enquiry section',()=>{const g=groupBookings([{id:'new',status:'pending',created_at:'2026-10-02'}],[{id:'old',status:'pending',created_at:'2026-10-01'}]);assert.deepEqual(g.new.map(e=>e.row.id),['new','old']);assert.equal(g.active.length,0);});
test('approval moves the same request into active bookings without duplication',()=>{const row={id:'one',status:'pending'};assert.equal(groupBookings([row]).new.length,1);row.status='accepted';const g=groupBookings([row]);assert.equal(g.new.length,0);assert.equal(g.active.length,1);assert.equal(g.active[0].row.id,'one');});
test('unfinished and failed folder setup remain active; completed and declined records go to history',()=>{const statuses=['accepted','processing','folder_error','ready','published','declined'];const g=groupBookings(statuses.map(status=>({status})),[{status:'confirmed',event_date:'2020-01-01'},{status:'delivered'},{status:'cancelled'}]);assert.equal(g.active.length,5);assert.equal(g.history.length,4);});
