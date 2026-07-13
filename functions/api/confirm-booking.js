/**
 * POST /api/confirm-booking
 * Body: { email, name, ztn, booking, venueAddress, addons, finalTotal, deposit, balance }
 *
 * DB updates happen in the browser (confirm.astro) via Supabase JS client.
 * This function ONLY sends Resend emails.
 *
 * Cloudflare Pages env vars required:
 *   RESEND_API_KEY
 *   SITE_URL        — https://zrphotos.net
 *   FROM_EMAIL      — optional
 *   ZACHARY_EMAIL   — optional, for admin notification
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { email, name, ztn, booking, venueAddress, addons, finalTotal, deposit, balance } = body;

  if (!env.RESEND_API_KEY) {
    return Response.json({ ok: true, emailSent: false });
  }

  const siteUrl = (env.SITE_URL || 'https://zrphotos.net').replace(/\/$/, '');
  const invoiceUrl = `${siteUrl}/invoice?ztn=${ztn}`;
  const from = env.FROM_EMAIL || 'ZRP <onboarding@resend.dev>';
  const parsedAddons = Array.isArray(addons) ? addons : [];

  // Client confirmation email
  if (email) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: email,
        subject: `Booking confirmed — ${ztn}`,
        html: confirmEmail(name || 'there', booking || {}, ztn, venueAddress, parsedAddons, finalTotal, deposit, balance, invoiceUrl),
      }),
    }).catch(e => console.error('client email error:', e));
  }

  // Zachary notification
  if (env.ZACHARY_EMAIL) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: env.ZACHARY_EMAIL,
        subject: `New confirmed booking — ${ztn} — ${name}`,
        html: zachEmail(name, email, booking || {}, ztn, venueAddress, parsedAddons, finalTotal),
      }),
    }).catch(e => console.error('zach email error:', e));
  }

  return Response.json({ ok: true, emailSent: true });
}

function confirmEmail(name, b, ztn, venue, addons, total, deposit, balance, invoiceUrl) {
  const rows = [
    b.event_date && ['Date', b.event_date],
    b.event_time && ['Time', b.event_time],
    b.sport_type && ['Session', b.sport_type],
    venue        && ['Location', venue],
    b.package_selected && ['Package', b.package_selected],
    addons.length && ['Add-ons', addons.map(a => a.name).join(', ')],
    total  != null && ['Total', '$' + Number(total).toFixed(2)],
    deposit != null && ['Deposit due', '$' + Number(deposit).toFixed(2)],
    balance != null && ['Balance due day of session', '$' + Number(balance).toFixed(2)],
  ].filter(Boolean);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1918">
<div style="max-width:520px;margin:0 auto;padding:44px 24px">
  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#999;margin:0 0 36px">Zachary Routsong Photography</p>
  <h1 style="font-size:24px;font-weight:300;letter-spacing:-.02em;color:#1a1918;margin:0 0 6px">Booking confirmed</h1>
  <p style="font-family:'Courier New',monospace;font-size:11px;color:#999;letter-spacing:.08em;margin:0 0 24px">${ztn}</p>
  <p style="font-size:13px;color:#666;line-height:1.8;margin:0 0 24px">Hi ${name}, your session is locked in. Here's your full booking summary.</p>
  <div style="background:#f7f6f5;border:1px solid #e8e7e6;border-radius:8px;padding:18px;margin-bottom:28px">
    ${rows.map(([k,v]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e8e7e6;font-size:12px"><span style="color:#999">${k}</span><span style="font-weight:500">${v}</span></div>`).join('')}
  </div>
  <a href="${invoiceUrl}" style="display:inline-block;background:#1a1918;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:13px 28px;border-radius:6px;margin-bottom:28px">View invoice →</a>
  <p style="font-size:11px;color:#bbb;line-height:1.7;margin:0">Your booking number is <strong style="color:#999">${ztn}</strong>. Your gallery will be delivered within 5–7 days after your session.</p>
</div>
</body></html>`;
}

function zachEmail(name, email, b, ztn, venue, addons, total) {
  const rows = [
    ['Client', name || '—'],
    ['Email',  email || '—'],
    b.phone      && ['Phone',   b.phone],
    b.event_date && ['Date',     b.event_date],
    b.event_time && ['Time',     b.event_time],
    b.sport_type && ['Session',  b.sport_type],
    venue        && ['Location', venue],
    b.package_selected && ['Package', b.package_selected],
    addons.length && ['Add-ons', addons.map(a => a.name + ' +$' + Number(a.price).toFixed(2)).join(', ')],
    total != null && ['Total',  '$' + Number(total).toFixed(2)],
  ].filter(Boolean);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1918">
<div style="max-width:520px;margin:0 auto;padding:44px 24px">
  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#999;margin:0 0 36px">ZRP Admin</p>
  <h1 style="font-size:24px;font-weight:300;letter-spacing:-.02em;margin:0 0 6px">New confirmed booking</h1>
  <p style="font-family:'Courier New',monospace;font-size:11px;color:#999;letter-spacing:.08em;margin:0 0 24px">${ztn}</p>
  <table style="width:100%;border-collapse:collapse">
    ${rows.map(([k,v]) => `<tr><td style="padding:7px 0;font-size:12px;color:#999;width:130px;border-bottom:1px solid #e8e7e6;vertical-align:top">${k}</td><td style="padding:7px 0;font-size:12px;border-bottom:1px solid #e8e7e6">${v}</td></tr>`).join('')}
  </table>
</div>
</body></html>`;
}
