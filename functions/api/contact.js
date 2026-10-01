/**
 * POST /api/contact
 * Body: { name, contact, message, date, website, elapsed }
 *
 * The homepage "Get in touch" form. Emails the message to the owner and, if the
 * sender left an email address, sends them a short "got your message" reply.
 * Nothing is stored in the database — the email is the record — so this keeps
 * working even if Supabase is down.
 *
 * Env: RESEND_API_KEY, ZACHARY_EMAIL (comma-separate to notify several people),
 *      FROM_EMAIL (optional; must be on the Resend-verified domain)
 */
const LIMITS = { name: 100, contact: 200, message: 3000, date: 100 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function recipients(env) {
  return String(env.ZACHARY_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Only accept posts from this site's own pages
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let b;
  try { b = await request.json(); }
  catch { return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }

  // Bots: filled the invisible field, or submitted faster than a person can type.
  // Pretend it worked so they don't learn anything.
  if (b.website || Number(b.elapsed || 0) < 3000) {
    return Response.json({ ok: true });
  }

  const f = {};
  for (const k of Object.keys(LIMITS)) f[k] = String(b[k] ?? '').trim().slice(0, LIMITS[k]);
  if (!f.name || !f.contact || !f.message) {
    return Response.json({ ok: false, error: 'Name, contact, and message are required' }, { status: 400 });
  }

  // Save the enquiry before notifications. The draft is the durable record;
  // an email outage must never make a successfully saved enquiry look lost.
  if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) {
    return Response.json({ ok: false, error: 'Enquiries are not configured' }, { status: 503 });
  }
  try {
    const saved = await fetch(`${env.PUBLIC_SUPABASE_URL.replace(/\/$/,'')}/functions/v1/delivery`, {
      method: 'POST', headers: { apikey: env.PUBLIC_SUPABASE_ANON_KEY, 'Content-Type':'application/json' },
      body: JSON.stringify({ action:'enquire', ...f, submission_id:b.submission_id, website:b.website, elapsed:b.elapsed }),
      signal: AbortSignal.timeout(15000),
    });
    if (!saved.ok) return Response.json({ok:false,error:'Could not save your enquiry. Please try again.'},{status:saved.status===429?429:503});
    const result = await saved.json();
    if (!result.ok) throw new Error('Enquiry was not saved');
    if (!result.created) return Response.json({ok:true,saved:true});
  } catch { return Response.json({ok:false,error:'Could not save your enquiry. Please try again.'},{status:503}); }

  const to = recipients(env);
  if (!env.RESEND_API_KEY || !to.length) return Response.json({ok:true,saved:true,notified:false});

  const from = env.FROM_EMAIL || 'ZRP <onboarding@resend.dev>';
  const senderEmail = EMAIL_RE.test(f.contact) ? f.contact : null;

  async function send(payload) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) console.error('contact Resend error:', await res.text());
      return res.ok;
    } catch (e) {
      console.error('contact send error:', e);
      return false;
    }
  }

  const ownerSent = await send({
    from,
    to,
    reply_to: senderEmail || undefined,
    subject: `New message — ${f.name}`,
    html: ownerEmail(f, senderEmail),
  });

  let acked = false;
  if (ownerSent && senderEmail) {
    acked = await send({
      from,
      to: senderEmail,
      reply_to: to[0],
      subject: 'Got your message — Zachary Routsong Photography',
      html: ackEmail(f),
    });
  }

  return Response.json({ ok: true, saved:true, notified:ownerSent, acked });
}

function shell(inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1918">
<div style="max-width:520px;margin:0 auto;padding:44px 24px">${inner}</div>
</body></html>`;
}

function ownerEmail(f, senderEmail) {
  const rows = [
    ['Name', f.name],
    ['Contact', f.contact],
    f.date && ['Date', f.date],
  ].filter(Boolean);
  return shell(`
  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#999;margin:0 0 28px">ZRP — Contact form</p>
  <h1 style="font-size:24px;font-weight:300;letter-spacing:-.02em;margin:0 0 20px">${esc(f.name)}</h1>
  <div style="background:#f7f6f5;border:1px solid #e8e7e6;border-radius:8px;padding:18px;margin-bottom:20px">
    ${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid #e8e7e6;font-size:12px"><span style="color:#999;flex-shrink:0">${k}</span><span style="font-weight:500;text-align:right">${esc(v)}</span></div>`).join('')}
  </div>
  <p style="font-size:14px;line-height:1.7;white-space:pre-wrap;margin:0 0 24px">${esc(f.message)}</p>
  <p style="font-size:13px;margin:0 0 20px"><a href="https://zrphotos.net/admin#enquiries">Review this enquiry in the admin panel</a></p>
  <p style="font-size:11px;color:#bbb;line-height:1.7;margin:0">${senderEmail
    ? 'Reply to this email to answer them directly.'
    : 'They left a phone number — text or call them.'}</p>`);
}

function ackEmail(f) {
  const first = f.name.split(/\s+/)[0] || 'there';
  return shell(`
  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#999;margin:0 0 36px">Zachary Routsong Photography</p>
  <h1 style="font-size:24px;font-weight:300;letter-spacing:-.02em;margin:0 0 10px">Got your message</h1>
  <p style="font-size:13px;color:#666;line-height:1.8;margin:0 0 24px">Hi ${esc(first)} — got it. I'll get back to you soon.</p>
  <p style="font-size:11px;color:#bbb;line-height:1.7;margin:0">Need me sooner? Text 229-300-1006.</p>`);
}
