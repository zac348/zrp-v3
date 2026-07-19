/**
 * POST /api/notify-booking
 * Body: { name, email, phone, event_date, event_time, session_type,
 *         event_location, package_selected, total, source, notes }
 *
 * Emails the owner whenever a new booking request comes in (from either
 * /book or /quick-book). The booking itself is already saved to Supabase by
 * the browser — this only sends the heads-up email, so it is safe to
 * fire-and-forget from the client.
 *
 * Cloudflare Pages env vars:
 *   RESEND_API_KEY  — from resend.com (required to send)
 *   ZACHARY_EMAIL   — where the notification goes (required)
 *   FROM_EMAIL      — optional; defaults to Resend's shared test sender.
 *                     Sending to your own ZACHARY_EMAIL works on the test
 *                     sender without domain verification.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  let b;
  try { b = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const to = env.ZACHARY_EMAIL;
  if (!env.RESEND_API_KEY || !to) {
    return Response.json({
      ok: true,
      emailSent: false,
      debug: !env.RESEND_API_KEY ? 'RESEND_API_KEY not set' : 'ZACHARY_EMAIL not set',
    });
  }

  const from = env.FROM_EMAIL || 'ZRP <onboarding@resend.dev>';
  const name = b.name || 'Someone';

  async function send(payload) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) console.error('notify-booking Resend error:', await res.text());
      return res.ok;
    } catch (e) {
      console.error('notify-booking send error:', e);
      return false;
    }
  }

  // 1) Heads-up to the owner (reply-to goes to the client)
  const ownerSent = await send({
    from,
    to,
    reply_to: b.email || undefined,
    subject: `New booking request — ${name}` + (b.session_type ? ` (${b.session_type})` : ''),
    html: notifyEmail(b),
  });

  // 2) Instant "we got it" acknowledgment to the client (reply-to goes to the owner)
  let clientAcked = false;
  if (b.email) {
    clientAcked = await send({
      from,
      to: b.email,
      reply_to: to,
      subject: 'Request received — Zachary Routsong Photography',
      html: ackEmail(b),
    });
  }

  return Response.json({ ok: true, emailSent: ownerSent, clientAcked });
}

function ackEmail(b) {
  const first = (b.name || '').split(' ')[0] || 'there';
  const rows = [
    b.event_date       && ['Date',     b.event_date + (b.event_time ? ' · ' + b.event_time : '')],
    b.session_type     && ['Session',  b.session_type],
    b.package_selected && ['Package',  b.package_selected],
    b.total            && ['Estimate', b.total],
  ].filter(Boolean);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1918">
<div style="max-width:520px;margin:0 auto;padding:44px 24px">
  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#999;margin:0 0 36px">Zachary Routsong Photography</p>
  <h1 style="font-size:24px;font-weight:300;letter-spacing:-.02em;color:#1a1918;margin:0 0 10px">Got your request</h1>
  <p style="font-size:13px;color:#666;line-height:1.8;margin:0 0 24px">Hi ${first} — your request came through. Zachary will look it over and get back to you within 24 hours. Nothing is confirmed (and nothing is owed) until you hear back.</p>
  ${rows.length ? `<div style="background:#f7f6f5;border:1px solid #e8e7e6;border-radius:8px;padding:18px;margin-bottom:24px">
    ${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e8e7e6;font-size:12px"><span style="color:#999">${k}</span><span style="font-weight:500">${v}</span></div>`).join('')}
  </div>` : ''}
  <p style="font-size:11px;color:#bbb;line-height:1.7;margin:0">Questions in the meantime? Just reply to this email or call 229-300-1006.</p>
</div>
</body></html>`;
}

function notifyEmail(b) {
  const rows = [
    ['Name',      b.name],
    ['Email',     b.email],
    b.phone            && ['Phone',    b.phone],
    b.event_date       && ['Date',     b.event_date + (b.event_time ? ' · ' + b.event_time : '')],
    b.session_type     && ['Session',  b.session_type],
    b.event_location   && ['Location', b.event_location],
    b.package_selected && ['Package',  b.package_selected],
    b.total            && ['Total',    b.total],
    b.notes            && ['Notes',    b.notes],
  ].filter(Boolean);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1918">
<div style="max-width:520px;margin:0 auto;padding:44px 24px">
  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#999;margin:0 0 28px">ZRP — New booking request${b.source ? ' · ' + b.source : ''}</p>
  <h1 style="font-size:24px;font-weight:300;letter-spacing:-.02em;color:#1a1918;margin:0 0 20px">${b.name || 'New request'}</h1>
  <div style="background:#f7f6f5;border:1px solid #e8e7e6;border-radius:8px;padding:18px;margin-bottom:24px">
    ${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid #e8e7e6;font-size:12px"><span style="color:#999;flex-shrink:0">${k}</span><span style="font-weight:500;text-align:right">${v}</span></div>`).join('')}
  </div>
  <a href="https://zrphotos.net/admin" style="display:inline-block;background:#1a1918;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:13px 28px;border-radius:6px">Open admin →</a>
  <p style="font-size:11px;color:#bbb;line-height:1.7;margin:24px 0 0">Reply to this email to reach the client directly. The request is already saved in your admin panel as “pending.”</p>
</div>
</body></html>`;
}
