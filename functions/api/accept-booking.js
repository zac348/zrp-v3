/**
 * POST /api/accept-booking
 * Body: { bookingId: string }
 *
 * Cloudflare Pages env vars required:
 *   PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY
 *   RESEND_API_KEY   — from resend.com
 *   FROM_EMAIL       — e.g. "ZRP <bookings@yourdomain.com>"
 *   SITE_URL         — e.g. "https://zacharyroutsongphotography.com"
 *   ZACHARY_EMAIL    — your email for notifications
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { bookingId } = body;
  if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

  const SB_URL = env.PUBLIC_SUPABASE_URL;
  const SB_KEY = env.PUBLIC_SUPABASE_ANON_KEY;
  const hdrs = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json',
  };

  // Fetch booking
  const getRes = await fetch(
    `${SB_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=*`,
    { headers: hdrs }
  );
  const rows = await getRes.json();
  if (!rows?.length) return Response.json({ error: 'Booking not found' }, { status: 404 });
  const booking = rows[0];

  // Update status to accepted
  await fetch(`${SB_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}`, {
    method: 'PATCH',
    headers: { ...hdrs, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ status: 'accepted' }),
  });

  // Send email if Resend configured
  if (env.RESEND_API_KEY && booking.email) {
    const siteUrl = (env.SITE_URL || 'https://zrphotos.net').replace(/\/$/, '');
    const confirmUrl = `${siteUrl}/confirm?token=${booking.token}`;
    const name = [booking.first_name, booking.last_name].filter(Boolean).join(' ') || 'there';
    const from = env.FROM_EMAIL || 'ZRP <onboarding@resend.dev>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: booking.email,
        subject: 'Your booking was accepted — finish setting it up',
        html: acceptEmail(name, booking, confirmUrl),
      }),
    }).catch(() => {}); // don't fail the request if email fails
  }

  return Response.json({ ok: true });
}

function acceptEmail(name, b, confirmUrl) {
  const rows = [
    b.event_date      && ['Date',    b.event_date],
    b.sport_type      && ['Sport',   b.sport_type],
    b.package_selected && ['Package', b.package_selected],
    b.total           && ['Total',   b.total],
  ].filter(Boolean);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1918">
<div style="max-width:520px;margin:0 auto;padding:44px 24px">
  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#999;margin:0 0 36px">Zachary Routsong Photography</p>
  <h1 style="font-size:24px;font-weight:300;letter-spacing:-.02em;color:#1a1918;margin:0 0 10px">Your booking was accepted</h1>
  <p style="font-size:13px;color:#666;line-height:1.8;margin:0 0 28px">Hi ${name}, your session request has been accepted. Click below to finish your booking — you'll set your venue, any add-ons, and final notes.</p>
  ${rows.length ? `<div style="background:#f7f6f5;border:1px solid #e8e7e6;border-radius:8px;padding:18px;margin-bottom:28px">
    ${rows.map(([k,v]) => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e8e7e6;font-size:12px"><span style="color:#999">${k}</span><span style="font-weight:500">${v}</span></div>`).join('')}
  </div>` : ''}
  <a href="${confirmUrl}" style="display:inline-block;background:#1a1918;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:13px 28px;border-radius:6px;margin-bottom:28px">Complete your booking →</a>
  <p style="font-size:11px;color:#bbb;line-height:1.7;margin:0">This link is private and unique to your booking. If you have questions reply to this email or reach Zachary directly.</p>
</div>
</body></html>`;
}
