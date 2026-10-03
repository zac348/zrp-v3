import {toast} from './shared.js';
import {pauseState,easternMidnight,easternDay,resumeLabel,countdown} from '../booking-pause.js';

// Online booking pause: stop new requests until a chosen date. Clients see a
// countdown on /book and booking reopens by itself at midnight Eastern.
export function setupBookingPause(ctx) {
  const $=id=>document.getElementById(id);
  const form=$('booking-pause-form');
  if(!form)return {load:async()=>{}};
  let state={paused:false,resumeAt:null},timer;
  const setupMessage='Setup needed: run supabase/migrations/202610020001_booking_pause.sql in Supabase → SQL Editor.';

  function show(message,paused=false){const el=$('booking-pause-state');el.textContent=message;el.classList.toggle('paused',paused);}
  function tick(){
    const left=state.resumeAt-Date.now();
    if(left<=0){state={paused:false,resumeAt:null};render();return;}
    const t=countdown(left);
    $('booking-pause-timer').textContent=`${t.days}d ${String(t.hours).padStart(2,'0')}h ${String(t.minutes).padStart(2,'0')}m ${String(t.seconds).padStart(2,'0')}s`;
  }
  function render(){
    clearInterval(timer);
    const input=$('booking-resume-date');
    input.min=easternDay(new Date(Date.now()+86400000));
    $('booking-pause-timer').hidden=!state.paused;
    $('booking-resume-now').hidden=!state.paused;
    $('booking-pause-save').textContent=state.paused?'Update date':'Pause bookings';
    if(state.paused){
      show('Paused until '+resumeLabel(state.resumeAt),true);
      input.value=easternDay(state.resumeAt);
      tick();timer=setInterval(tick,1000);
    } else { show('Open — clients can request sessions.'); input.value=''; }
  }
  function disable(disabled){for(const el of form.elements)if(!el.closest('.picker-pop'))el.disabled=disabled;}
  async function save(paused,resumeAt){
    const {data,error}=await ctx.sb.from('site_settings').update({booking_paused:paused,booking_resume_at:resumeAt?resumeAt.toISOString():null}).eq('id',1).select('booking_paused,booking_resume_at');
    if(error)throw new Error(error.message);
    if(!data?.length)throw new Error('This account can’t change the booking setting.');
    state=pauseState(data[0]);render();
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const resumeAt=easternMidnight($('booking-resume-date').value);
    if(!resumeAt||resumeAt<=Date.now()){toast('Pick a resume date after today.');return;}
    disable(true);
    try{await save(true,resumeAt);toast('Bookings paused until '+resumeLabel(resumeAt)+'.');}
    catch(error){toast(error.message||'The setting could not be saved.');}
    finally{disable(false);}
  });
  $('booking-resume-now').addEventListener('click',async()=>{
    disable(true);
    try{await save(false,null);toast('Bookings are open again.');}
    catch(error){toast(error.message||'The setting could not be saved.');}
    finally{disable(false);}
  });

  async function load(){
    const {data,error}=await ctx.sb.from('site_settings').select('booking_paused,booking_resume_at').eq('id',1).maybeSingle();
    if(error||!data){
      const missing=!data&&(!error||['42P01','PGRST205'].includes(error.code));
      show(missing?setupMessage:'The booking setting could not load. Refresh to try again.');disable(true);return;
    }
    disable(false);state=pauseState(data);render();
  }
  return {load};
}
