const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/;
const FILE = /^[a-zA-Z0-9_-]{10,150}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FOLDER = 'application/vnd.google-apps.folder';
const safeHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
export class Problem extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
function text(value, max, label, required = false) {
  const s = typeof value === 'string' ? value.trim() : '';
  if ((required && !s) || s.length > max) throw new Problem(`Please check ${label}.`);
  return s;
}
export function validateDetails(input = {}) {
  const d = {
    name: text(input.name, 100, 'your name', true),
    email: text(input.email, 200, 'your email', true),
    phone: text(input.phone, 50, 'your phone number'),
    session_type: text(input.session_type, 100, 'the session type', true),
    date: text(input.date, 10, 'the session date', true),
    time: text(input.time, 5, 'the session time'),
    location: text(input.location, 500, 'the location', true),
    notes: text(input.notes, 3000, 'the notes'),
  };
  if (!EMAIL.test(d.email)) throw new Problem('Enter a valid email address.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Number.isFinite(Date.parse(d.date)) || new Date(d.date).toISOString().slice(0,10) !== d.date) throw new Problem('Enter a valid session date.');
  if (d.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) throw new Problem('Enter a valid session time.');
  return d;
}
export function folderName(d) {
  return `${d.date} — ${d.name} — ${d.session_type}`.replace(/[\x00-\x1f/\\]/g, ' ').slice(0, 220);
}

// Portfolio captions come from file names: "Thorncrown Chapel.jpg" → "Thorncrown Chapel".
// Camera defaults (IMG_4031, DSC_0012, DJI_0007…) and date-only names get no caption.
const CAMERA_NAME = /^(img|dsc|dscn|dscf|dsc_|mg|dji|pxl|gopr|gp|mvimg|vid|photo|image|p)\s?\d+/i;
export function caption(name = '') {
  const base = String(name).replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  return !base || CAMERA_NAME.test(base) || /^[\d\s.-]+$/.test(base) ? '' : base.slice(0, 120);
}
const PORTFOLIO_SIZES = [700, 1400, 2200];

export class Store {
  constructor(env, fetcher = fetch) { this.env = env; this.fetch = fetcher; }
  async db(path, method = 'GET', body) {
    const r = await this.fetch(`${this.env.SUPABASE_URL}/rest/v1/${path}`, {
      method, headers: { apikey: this.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      if (e.code === 'P0001') throw new Problem('Too many enquiries. Please try again later.', 429);
      throw new Problem('Could not save the changes. Please try again.', 503);
    }
    return r.status === 204 ? null : r.json();
  }
  async isAdmin(auth) {
    if (!auth?.startsWith('Bearer ')) return false;
    const r = await this.fetch(`${this.env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: this.env.SUPABASE_ANON_KEY, Authorization: auth }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return false;
    const u = await r.json();
    if (!UUID.test(u.id || '')) return false;
    return (await this.db(`delivery_admins?user_id=eq.${u.id}&select=user_id`)).length === 1;
  }
  async get(field, value) { return (await this.db(`delivery_requests?${field}=eq.${encodeURIComponent(value)}&limit=1`))[0]; }
  list() { return this.db('delivery_requests?order=created_at.desc&limit=500'); }
  patch(id, changes, filter = '') { return this.db(`delivery_requests?id=eq.${id}${filter}`, 'PATCH', changes); }
  enquire(b) { return this.db('rpc/delivery_enquire', 'POST', { p_submission: b.submission_id, p_name: b.name, p_contact: b.contact, p_message: b.message, p_date: b.date }); }
}

// The existing availability id is UUID-shaped. Reuse the enquiry UUID as a
// deterministic primary key: overlapping workers cannot insert duplicate blocks.
export class Calendar extends Store {
  today() {
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const value=type=>parts.find(p=>p.type===type).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }
  note(id) { return `Booked (ref ${id.slice(0,8)})`; }
  own(row, id) { return row.id===id && row.note===this.note(id) && row.status==='unavailable' && !row.start_time; }
  async owned(id) {
    return (await this.db(`availability?id=eq.${id}&note=eq.${encodeURIComponent(this.note(id))}`)).filter(row=>this.own(row,id));
  }
  async removeRow(row,id) {
    // Both the date and exact note remain predicates at deletion time. Owner
    // changes to status/time are protected even if they happen after our read.
    await this.db(`availability?id=eq.${id}&date=eq.${row.date}&note=eq.${encodeURIComponent(this.note(id))}&status=eq.unavailable&start_time=is.null`,'DELETE');
  }
  async remove(id) {
    const rows=await this.owned(id);
    for(const row of rows)await this.removeRow(row,id);
    return {status:rows.length?'unblocked':'no_date',date:rows[0]?.date||null};
  }
  async sync(id,date) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'') || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date)return {status:'no_date',date:null};
    const owned=await this.owned(id);
    for(const row of owned)if(row.date!==date)await this.removeRow(row,id);
    if(date<this.today())return {status:'skipped_past',date};
    const rows=await this.db(`availability?date=eq.${date}`);
    // Explicit Available or Partial entries are intentional owner overrides.
    const other=rows.find(row=>!this.own(row,id)&&(row.status==='available'||row.status==='partial'||row.status==='unavailable'));
    if(other)return {status:'already_blocked',date};
    if(rows.some(row=>this.own(row,id)))return {status:'blocked',date};
    const response=await this.fetch(`${this.env.SUPABASE_URL}/rest/v1/availability?on_conflict=id`,{
      method:'POST',headers:{apikey:this.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=representation'},
      body:JSON.stringify({id,date,status:'unavailable',start_time:null,note:this.note(id)}),signal:AbortSignal.timeout(15000),
    });
    if(!response.ok)throw new Error('Calendar insert failed');
    const after=await this.db(`availability?date=eq.${date}`);
    // Concurrent enquiries may both insert before either reads the other. Only
    // the higher UUID yields to another automatic block, so they cannot both
    // remove themselves and accidentally reopen the date. Manual entries win.
    const conflict=after.some(row=>!this.own(row,id)&&['available','partial','unavailable'].includes(row.status)&&
      (!UUID.test(row.id||'') || !this.own(row,row.id) || row.id<id));
    if(conflict){
      for(const row of after.filter(row=>this.own(row,id)))await this.removeRow(row,id);
      return {status:'already_blocked',date};
    }
    if(!after.some(row=>this.own(row,id)))throw new Error('Calendar write could not be verified');
    return {status:'blocked',date};
  }
}

async function updateCalendar(store,calendar,row) {
  if(!calendar)return undefined;
  let date=row.details?.date||row.preferred_date||null;
  try {
    // An accept worker can finish after a client completion or decline. Read the
    // latest saved state and reconcile again if another action changed it while
    // the calendar write was in flight. No private fields go into availability.
    let current=await store.get('id',row.id)||row;
    for(let attempt=0;attempt<3;attempt++){
      date=current.details?.date||current.preferred_date||null;
      const result=current.status==='declined'?await calendar.remove(row.id):await calendar.sync(row.id,date);
      const latest=await store.get('id',row.id)||current;
      if(latest.status===current.status && (latest.details?.date||latest.preferred_date)===(current.details?.date||current.preferred_date))return result;
      current=latest;
    }
    throw new Error('Calendar changed during update');
  } catch (_) {
    console.error('Delivery calendar update failed');
    return {status:'failed',date:/^\d{4}-\d{2}-\d{2}$/.test(date||'')?date:null};
  }
}

function b64(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
export class Drive {
  constructor(key, parent, fetcher = fetch) { this.key = key; this.parent = parent; this.fetch = fetcher; }
  async token() {
    if (this.cached && this.expires > Date.now()) return this.cached;
    const sa = JSON.parse(this.key || '{}');
    if (!sa.private_key || !sa.client_email) throw new Problem('Drive credentials are not configured.', 503);
    const now = Math.floor(Date.now()/1000);
    const enc = v => b64(new TextEncoder().encode(JSON.stringify(v)));
    const payload = `${enc({alg:'RS256',typ:'JWT'})}.${enc({iss:sa.client_email,scope:'https://www.googleapis.com/auth/drive',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})}`;
    const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----|\s/g,'')), c=>c.charCodeAt(0));
    const key = await crypto.subtle.importKey('pkcs8', der, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['sign']);
    const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(payload)));
    const r = await this.fetch('https://oauth2.googleapis.com/token', {method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${payload}.${b64(signature)}`}),signal:AbortSignal.timeout(15000)});
    if (!r.ok) throw new Problem('Google could not authorize Drive access. Check the service account.', 503);
    this.cached = (await r.json()).access_token; this.expires = Date.now()+3300000; return this.cached;
  }
  async request(path, options = {}) {
    return this.fetch(`https://www.googleapis.com/drive/v3/${path}`, {
      ...options, headers: {Authorization:`Bearer ${await this.token()}`, 'Content-Type':'application/json', ...options.headers}, signal:AbortSignal.timeout(45000),
    });
  }
  async json(path, options) {
    const r = await this.request(path, options);
    if (!r.ok) {
      if (r.status === 403) throw new Problem('Google denied access. Check the service account’s Shared drive permissions or organization policy.', 503);
      if (r.status === 404) throw new Problem('The Drive folder or file is unavailable. Check its location and sharing.', 404);
      throw new Problem('Google Drive is temporarily unavailable. Please try again.', 503);
    }
    return r.json();
  }
  async health(portfolioRoot) {
    const p = await this.json(`files/${this.parent}?supportsAllDrives=true&fields=id,name,mimeType,driveId,capabilities(canAddChildren)`);
    if (p.mimeType !== FOLDER || !p.driveId || !p.capabilities?.canAddChildren) throw new Problem('The service account needs permission to add folders in this Shared drive.', 503);
    const result = {name:p.name, can_create:true};
    if (portfolioRoot) {
      try {
        const f = await this.json(`files/${portfolioRoot}?supportsAllDrives=true&fields=id,name,mimeType,trashed`);
        result.portfolio = f.mimeType === FOLDER && !f.trashed ? {ok:true, name:f.name} : {ok:false, message:'The portfolio folder link points to something that is not a folder.'};
      } catch (_) {
        let account = 'the service account';
        try { account = JSON.parse(this.key || '{}').client_email || account; } catch (_) {}
        result.portfolio = {ok:false, message:`The portfolio folder can't be opened. Share it with ${account} (Viewer is enough).`};
      }
    }
    return result;
  }
  async generateId() { return (await this.json('files/generateIds?count=1&space=drive&type=files')).ids[0]; }
  async ensureFolder(id, name, requestId) {
    const r = await this.request('files?supportsAllDrives=true&fields=id', {method:'POST',body:JSON.stringify({id,name,mimeType:FOLDER,parents:[this.parent],appProperties:{zr_delivery_id:requestId}})});
    // Persisted, pre-generated IDs make retries safe even if creation succeeds
    // but the response is lost, or a worker crashes before the database update.
    if (!r.ok && r.status !== 409) {
      if (r.status === 403) throw new Problem('Google denied folder creation. Check Shared drive permissions or organization policy.', 503);
      throw new Problem('Drive could not create the folder. The details are saved; use Retry folder.', 503);
    }
    const f = await this.json(`files/${id}?supportsAllDrives=true&fields=id,parents,appProperties,trashed,mimeType`);
    if (f.trashed || f.mimeType !== FOLDER || !f.parents?.includes(this.parent) || f.appProperties?.zr_delivery_id !== requestId) throw new Problem('Drive folder verification failed. Contact the site administrator.', 409);
    return f.id;
  }
  async files(folder) {
    const all = []; let next;
    do {
      const q = new URLSearchParams({q:`'${folder}' in parents and trashed = false and mimeType != '${FOLDER}'`,supportsAllDrives:'true',includeItemsFromAllDrives:'true',pageSize:'100',fields:'nextPageToken,files(id,name,mimeType,size)',orderBy:'name'});
      if (next) q.set('pageToken',next);
      const result = await this.json(`files?${q}`); all.push(...(result.files || [])); next = result.nextPageToken;
      if (all.length > 10000) throw new Problem('This album is too large to display. Please split it into smaller albums.', 413);
    } while(next);
    return all.filter(f=>!f.mimeType.startsWith('application/vnd.google-apps.'));
  }
  async file(folder, id, preview = false) {
    if (!FILE.test(id || '')) throw new Problem('File not found.', 404);
    const f = await this.json(`files/${id}?supportsAllDrives=true&fields=id,name,mimeType,parents,trashed,thumbnailLink`);
    if (f.trashed || !f.parents?.includes(folder) || f.mimeType === FOLDER || f.mimeType.startsWith('application/vnd.google-apps.')) throw new Problem('File not found in this gallery.',404);
    let r;
    if (preview) {
      if (!f.thumbnailLink) throw new Problem('Preview unavailable. Download the original file.',404);
      const target = new URL(f.thumbnailLink);
      if (target.protocol !== 'https:' || !/(^|\.)(googleusercontent\.com|google\.com)$/.test(target.hostname)) throw new Problem('Preview unavailable.',404);
      r = await this.fetch(target.href,{headers:{Authorization:`Bearer ${await this.token()}`},signal:AbortSignal.timeout(30000)});
    } else r = await this.request(`files/${id}?alt=media&supportsAllDrives=true`);
    if (!r.ok) throw new Problem('The file could not be downloaded. Please try again.',502);
    const h = new Headers(safeHeaders);
    h.set('Content-Type', preview ? (r.headers.get('Content-Type') || 'image/jpeg') : 'application/octet-stream');
    if (!preview) h.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`);
    const length = r.headers.get('Content-Length'); if(length) h.set('Content-Length',length);
    // No canvas, image encoder, resize, or byte conversion on original downloads.
    return new Response(r.body, {headers:h});
  }
  // Public portfolio: images in the portfolio folder and its direct subfolders.
  // Each subfolder is a category; loose images have none.
  async children(folder) {
    const all = []; let next;
    do {
      const q = new URLSearchParams({q:`'${folder}' in parents and trashed = false`,supportsAllDrives:'true',includeItemsFromAllDrives:'true',pageSize:'1000',fields:'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,imageMediaMetadata(width,height,rotation))'});
      if (next) q.set('pageToken', next);
      const result = await this.json(`files?${q}`); all.push(...(result.files || [])); next = result.nextPageToken;
      if (all.length > 5000) throw new Problem('The portfolio folder is too large. Keep it under 5,000 items.', 413);
    } while (next);
    return all;
  }
  async portfolio(root) {
    if (!FILE.test(root || '')) throw new Problem('The portfolio folder is not configured.', 503);
    const top = await this.children(root);
    const folders = top.filter(f => f.mimeType === FOLDER);
    const nested = await Promise.all(folders.map(async folder => (await this.children(folder.id)).map(f => ({...f, category:folder.name.trim()}))));
    return [...top.map(f => ({...f, category:''})), ...nested.flat()]
      .filter(f => f.mimeType?.startsWith('image/'))
      .map(f => {
        const m = f.imageMediaMetadata || {}, turned = (m.rotation || 0) % 2 === 1;
        return {id:f.id, caption:caption(f.name), category:f.category, width:(turned ? m.height : m.width) || null, height:(turned ? m.width : m.height) || null, created:f.createdTime, modified:f.modifiedTime};
      })
      .sort((a, b) => (Date.parse(b.created) || 0) - (Date.parse(a.created) || 0));
  }
  // The service account can see every client folder, so a file is served only
  // when it sits directly in the portfolio folder or one of its subfolders.
  async inPortfolio(root, parents = []) {
    if (parents.includes(root)) return true;
    for (const id of parents) {
      if (!FILE.test(id)) continue;
      const folder = await this.json(`files/${id}?supportsAllDrives=true&fields=id,mimeType,parents,trashed`).catch(() => null);
      if (folder && folder.mimeType === FOLDER && !folder.trashed && folder.parents?.includes(root)) return true;
    }
    return false;
  }
  async portfolioImage(root, id, size) {
    if (!FILE.test(id || '') || !FILE.test(root || '')) throw new Problem('Photo not found.', 404);
    if (!PORTFOLIO_SIZES.includes(size)) throw new Problem('Unsupported size.', 400);
    const f = await this.json(`files/${id}?supportsAllDrives=true&fields=id,mimeType,parents,trashed,thumbnailLink`);
    if (f.trashed || !f.mimeType?.startsWith('image/') || !(await this.inPortfolio(root, f.parents))) throw new Problem('Photo not found.', 404);
    if (!f.thumbnailLink) throw new Problem('Preview not ready yet. Try again shortly.', 404);
    // Google resizes: the thumbnail link takes a longest-side size, e.g. =s2200.
    const target = new URL(/=s\d+$/.test(f.thumbnailLink) ? f.thumbnailLink.replace(/=s\d+$/, `=s${size}`) : `${f.thumbnailLink}=s${size}`);
    if (target.protocol !== 'https:' || !/(^|\.)(googleusercontent\.com|google\.com)$/.test(target.hostname)) throw new Problem('Photo not found.', 404);
    const r = await this.fetch(target.href, {headers:{Authorization:`Bearer ${await this.token()}`}, signal:AbortSignal.timeout(30000)});
    const type = r.headers.get('Content-Type') || '';
    if (!r.ok || !type.startsWith('image/')) throw new Problem('The photo could not be loaded. Please try again.', 502);
    const h = new Headers(safeHeaders);
    h.set('Content-Type', type); h.set('Cache-Control', 'public, max-age=86400');
    return new Response(r.body, {headers:h});
  }
}

export async function finalize(store, drive, row, input, actor, calendar) {
  if (['ready','published'].includes(row.status)) return {ok:true,status:row.status};
  if (!['accepted','folder_error','processing'].includes(row.status)) throw new Problem('Zachary must accept this enquiry first.',409);
  if (row.status === 'processing' && Date.parse(row.locked_at) > Date.now()-120000) return {ok:true,status:'processing'};
  const details = row.details || validateDetails(input);
  const lock = crypto.randomUUID();
  const filter = `&status=eq.${row.status}` + (row.status === 'processing' ? `&lock_id=eq.${row.lock_id}` : '');
  const claimed = await store.patch(row.id, {status:'processing', details, lock_id:lock, locked_at:new Date().toISOString(), last_error:null, completed_by:row.completed_by || actor},filter);
  if (!claimed.length) return {ok:true,status:'processing'};
  let current = claimed[0];
  const calendarResult=await updateCalendar(store,calendar,current);
  const calendarResponse=actor==='admin'&&calendarResult?{calendar:calendarResult}:{};
  try {
    if (!current.drive_folder_id) {
      const id = await drive.generateId();
      const saved = await store.patch(row.id,{drive_folder_id:id},`&lock_id=eq.${lock}&drive_folder_id=is.null`);
      if (!saved.length) throw new Problem('The booking changed. Refresh before trying again.',409);
      current = saved[0];
    }
    await drive.ensureFolder(current.drive_folder_id, folderName(details), row.id);
    const saved = await store.patch(row.id,{status:'ready',completed_at:new Date().toISOString(),lock_id:null,locked_at:null,last_error:null},`&lock_id=eq.${lock}`);
    if (!saved.length) return {ok:true,status:'processing'};
    return {ok:true,status:'ready',...calendarResponse};
  } catch(e) {
    const message = e instanceof Problem ? e.message : 'Drive is unavailable. Details are saved; use Retry folder.';
    await store.patch(row.id,{status:'folder_error',lock_id:null,locked_at:null,last_error:message},`&lock_id=eq.${lock}`);
    return {ok:true,status:'folder_error',message:'Your details are saved. Zachary will finish setting up your album.',...calendarResponse};
  }
}

export function createHandler({store,drive,calendar,portfolioFolder}) {
  return async request => {
    try {
      const url = new URL(request.url);
      if (!['GET','POST'].includes(request.method)) throw new Problem('Method not allowed.',405);
      if (Number(request.headers.get('content-length') || 0) > 16000) throw new Problem('Request too large.',413);
      const raw = request.method === 'POST' ? await request.text() : '';
      if(raw.length>16000) throw new Problem('Request too large.',413);
      let b; try { b = raw ? JSON.parse(raw) : Object.fromEntries(url.searchParams); } catch { throw new Problem('Invalid request.'); }
      const action = b.action;
      const readActions = ['form','gallery','file','preview','portfolio','portfolio-image'];
      if (request.method === 'GET' && !readActions.includes(action)) throw new Problem('Use POST for this action.',405);
      const publicActions = ['enquire','form','complete','gallery','file','preview','portfolio','portfolio-image'];
      const admin = publicActions.includes(action) && !b.id ? false : await store.isAdmin(request.headers.get('authorization'));
      const requireAdmin = () => { if(!admin) throw new Problem('Please sign in as the studio administrator.',403); };
      let result;
      if (action === 'enquire') {
        if(b.website || Number(b.elapsed || 0)<3000) result={ok:true,created:false};
        else {
          if(!UUID.test(b.submission_id || '')) throw new Problem('Refresh the form and try again.');
          result={ok:true,...await store.enquire({submission_id:b.submission_id,name:text(b.name,100,'your name',true),contact:text(b.contact,200,'your contact details',true),message:text(b.message,3000,'your message',true),date:text(b.date,100,'the preferred date')})};
        }
      } else if (action === 'list') { requireAdmin(); result={requests:await store.list()}; }
      else if (action === 'health') { requireAdmin(); result=await drive.health(portfolioFolder); }
      else if (action === 'portfolio') result={photos:await drive.portfolio(portfolioFolder)};
      else if (action === 'portfolio-image') return await drive.portfolioImage(portfolioFolder,b.file,Number(b.size));
      else if (['accept','decline','renew','publish','unpublish','retry'].includes(action)) {
        requireAdmin(); if(!UUID.test(b.id || '')) throw new Problem('Invalid enquiry.');
        const row=await store.get('id',b.id); if(!row) throw new Problem('Enquiry not found.',404);
        if(action==='accept') {
          if(row.status!=='pending') throw new Problem('This enquiry has already been reviewed.',409);
          const saved=await store.patch(row.id,{status:'accepted',token_expires_at:new Date(Date.now()+30*86400000).toISOString()},'&status=eq.pending');
          if(saved.length&&calendar)result={ok:true,calendar:await updateCalendar(store,calendar,saved[0])};
        } else if(action==='decline') {
          if(!['pending','accepted'].includes(row.status)) throw new Problem('Only unfinished enquiries can be declined.',409);
          const saved=await store.patch(row.id,{status:'declined'},`&status=eq.${row.status}`);
          if(!saved.length) throw new Problem('This enquiry changed. Refresh and try again.',409);
          if(calendar)result={ok:true,calendar:await updateCalendar(store,calendar,saved[0])};
        } else if(action==='renew') {
          if(row.status!=='accepted') throw new Problem('This form is no longer awaiting details.',409);
          await store.patch(row.id,{details_token:Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join(''),token_expires_at:new Date(Date.now()+30*86400000).toISOString()},'&status=eq.accepted');
        } else if(action==='retry') result=await finalize(store,drive,row,row.details,'admin',calendar);
        else if(action==='publish') {
          if(row.status!=='ready') throw new Problem('Finish the client details and Drive folder first.',409);
          if(!(await drive.files(row.drive_folder_id)).length) throw new Problem('Upload the finished files to the Drive folder before publishing.',409);
          await store.patch(row.id,{status:'published',published_at:new Date().toISOString()},'&status=eq.ready');
        } else {
          if(row.status!=='published') throw new Problem('This gallery is not published.',409);
          await store.patch(row.id,{status:'ready',published_at:null},'&status=eq.published');
        }
        result ||= {ok:true};
      } else if(action==='form' || action==='complete') {
        let row;
        if(b.id) { requireAdmin(); if(!UUID.test(b.id)) throw new Problem('Invalid enquiry.'); row=await store.get('id',b.id); }
        else { if(!TOKEN.test(b.token || '')) throw new Problem('This private link is invalid or expired.',404); row=await store.get('details_token',b.token); }
        if(!row || row.status==='declined' || row.status==='pending') throw new Problem('This private link is unavailable.',404);
        if(!admin && (!row.token_expires_at || Date.parse(row.token_expires_at)<Date.now())) throw new Problem('This link has expired. Ask Zachary for a new link.',410);
        if(action==='form') {
          // A completed client link becomes a receipt, never a way to retrieve
          // submitted private details or discover the separate gallery link.
          result={status:row.status,...(row.status==='accepted' || admin ? {name:row.name,contact:row.contact,preferred_date:row.preferred_date,details:row.details} : {})};
        } else result=await finalize(store,drive,row,b.details,admin?'admin':'client',calendar);
      } else if(['gallery','file','preview'].includes(action)) {
        if(!TOKEN.test(b.token || '')) throw new Problem('Gallery unavailable.',404);
        const row=await store.get('gallery_token',b.token);
        if(!row || row.status!=='published') throw new Problem('This gallery is not available yet.',404);
        if(action==='gallery') result={name:row.details.name,date:row.details.date,files:await drive.files(row.drive_folder_id)};
        else return await drive.file(row.drive_folder_id,b.file,action==='preview');
      } else throw new Problem('Unknown action.',400);
      return Response.json(result,{headers:safeHeaders});
    } catch(e) {
      const known=e instanceof Problem;
      return Response.json({error:known?e.message:'The service is temporarily unavailable. Please try again.'},{status:known?e.status:503,headers:safeHeaders});
    }
  };
}
