/**
 * POST /api/accept-booking
 * Body: { email, name, token, booking (object with date/sport/package/total) }
 *
 * The DB update happens in admin JS (browser already has Supabase).
 * This function ONLY sends the Resend email.
 *
 * Cloudflare Pages env vars required:
 *   RESEND_API_KEY  — from resend.com (free tier)
 *   SITE_URL        — https://zrphotos.net
 *   FROM_EMAIL      — optional, e.g. "ZRP <bookings@zrphotos.net>"
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { email, name, token, booking } = body;
  if (!email || !token) return Response.json({ error: 'email and token required' }, { status: 400 });

  if (!env.RESEND_API_KEY) {
    return Response.json({ ok: true, emailSent: false, debug: 'RESEND_API_KEY not set in Cloudflare env vars' });
  }

  let siteUrl = (env.SITE_URL || 'https://zrphotos.net').replace(/\/$/, '');
  if (!/^https?:\/\//i.test(siteUrl)) siteUrl = 'https://' + siteUrl; // tolerate SITE_URL without a scheme
  const confirmUrl = `${siteUrl}/confirm?token=${token}`;
  const from = env.FROM_EMAIL || 'ZRP <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: email,
      subject: "You're in — finish setting up your session",
      html: acceptEmail(name || 'there', booking || {}, confirmUrl),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    return Response.json({ ok: true, emailSent: false, resendError: err });
  }

  return Response.json({ ok: true, emailSent: true });
}

function acceptEmail(name, b, confirmUrl) {
  const rows = [
    b.event_date       && ['Date',    b.event_date],
    b.sport_type       && ['Session', b.sport_type],
    b.package_selected && ['Package', b.package_selected],
    b.total            && ['Total',   b.total],
  ].filter(Boolean);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1918">
<div style="max-width:520px;margin:0 auto;padding:44px 24px">
  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#999;margin:0 0 36px">Zachary Routsong Photography</p>
  <h1 style="font-size:24px;font-weight:300;letter-spacing:-.02em;color:#1a1918;margin:0 0 10px">You're in.</h1>
  <p style="font-size:13px;color:#666;line-height:1.8;margin:0 0 28px">Hi ${name} — Zachary accepted your request. Finish setting it up below: location, extras, final details.</p>
  ${rows.length ? `<div style="background:#f7f6f5;border:1px solid #e8e7e6;border-radius:8px;padding:18px;margin-bottom:28px">
    ${rows.map(([k,v]) => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e8e7e6;font-size:12px"><span style="color:#999">${k}</span><span style="font-weight:500">${v}</span></div>`).join('')}
  </div>` : ''}
  <a href="${confirmUrl}" style="display:inline-block;background:#1a1918;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:13px 28px;border-radius:6px;margin-bottom:28px">Complete your booking →</a>
  <p style="font-size:11px;color:#bbb;line-height:1.7;margin:0">This link is private. If you have questions reach Zachary directly at <a href="https://zrphotos.net" style="color:#999">zrphotos.net</a>.</p>
</div>
</body></html>`;
}
