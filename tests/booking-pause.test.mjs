import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pauseState,easternMidnight,easternDay,resumeLabel,countdown} from '../src/lib/booking-pause.js';

test('resume dates start at midnight Eastern in standard and daylight time',()=>{
  assert.equal(easternMidnight('2026-01-15').toISOString(),'2026-01-15T05:00:00.000Z');
  assert.equal(easternMidnight('2026-07-15').toISOString(),'2026-07-15T04:00:00.000Z');
  assert.equal(easternMidnight('2026-03-08').toISOString(),'2026-03-08T05:00:00.000Z');
  assert.equal(easternMidnight('2026-11-01').toISOString(),'2026-11-01T04:00:00.000Z');
  for(const bad of ['2026-02-30','2026-13-01','soon','',null])assert.equal(easternMidnight(bad),null);
});
test('the pause is only active before its resume time',()=>{
  const now=Date.parse('2026-10-02T12:00:00Z');
  assert.deepEqual(pauseState({booking_paused:true,booking_resume_at:'2026-10-20T04:00:00Z'},now),{paused:true,resumeAt:new Date('2026-10-20T04:00:00Z')});
  assert.equal(pauseState({booking_paused:true,booking_resume_at:'2026-10-01T04:00:00Z'},now).paused,false);
  assert.equal(pauseState({booking_paused:false,booking_resume_at:'2026-10-20T04:00:00Z'},now).paused,false);
  assert.equal(pauseState({booking_paused:true,booking_resume_at:null},now).paused,false);
  assert.equal(pauseState(null,now).paused,false);
});
test('dates and countdowns read in Eastern time',()=>{
  assert.equal(easternDay(new Date('2026-10-20T03:30:00Z')),'2026-10-19');
  assert.equal(resumeLabel(new Date('2026-10-20T04:00:00Z'),new Date('2026-10-02T12:00:00Z')),'Tuesday, October 20');
  assert.equal(resumeLabel(new Date('2027-01-05T05:00:00Z'),new Date('2026-10-02T12:00:00Z')),'Tuesday, January 5, 2027');
  assert.deepEqual(countdown(((2*24+3)*3600+4*60+5)*1000+999),{days:2,hours:3,minutes:4,seconds:5});
  assert.deepEqual(countdown(-5000),{days:0,hours:0,minutes:0,seconds:0});
});
