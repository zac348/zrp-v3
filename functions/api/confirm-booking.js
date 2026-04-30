/**
 * POST /api/confirm-booking
 * Body: { token, venueAddress, addons: [{name, price}], notes }
 *
 * Creates the ZTN number, auto-creates client gallery, sends confirmation emails.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { token, venueAddress, addons, notes } = body;
  if (!token) return Response.json({ error: 'token required' }, { status: 400 });

  const SB_URL = env.PUBLIC_SUPABASE_URL;
  const SB_KEY = env.PUBLIC_SUPABASE_ANON_KEY;
  const hdrs = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json',
  };

  // Get booking by token
  const getRes = await fetch(
    `${SB_URL}/rest/v1/bookings?token=eq.${encodeURIComponent(token)}&select=*`,
    { headers: hdrs }
  );
  const rows = await getRes.json();
  if (!rows?.length) return Response.json({ error: 'Invalid or expired link' }, { status: 404 });
  const booking = rows[0];

  if (booking.status === 'confirmed' || booking.status === 'delivered') {
    return Response.json({ ok: true, ztn: booking.ztn_number, alreadyConfirmed: true });
  }
  if (booking.status !== 'accepted') {
    return Response.json({ error: 'This booking has not been accepted yet' }, { status: 400 });
  }

  // Get next sequential booking number
  const rpcRes = await fetch(`${SB_URL}/rest/v1/rpc/next_booking_number`, {
    method: 'POST',
    headers: { ...hdrs, 'Prefer': 'return=representation' },
    body: '{}',
  });
  const num = await rpcRes.json();
  const ztn = 'ZTN-' + String(num).padStart(3, '0');

  // Compute totals
  const parsedAddons = Array.isArray(addons) ? addons : [];
  const addonTotal = parsedAddons.reduce((s, a) => s + (parseFloat(a.price) || 0), 0);
  const baseTotal = parseFloat((booking.total || '$0').replace('$', '')) || 0;
  const finalTotal = baseTotal + addonTotal;
  const deposit = Math.round(finalTotal * 50) / 100;
  const balance = finalTotal - deposit;

  // Auto-create gallery
  const clientName = [booking.first_name, booking.last_name].filter(Boolean).join(' ');
  const galleryName = [clientName, booking.sport_type, booking.event_date].filter(Boolean).join(' — ');
  const gallerySlug = ztn.toLowerCase(); // "ztn-001"

  let galleryId = null;
  try {
    const galRes = await fetch(`${SB_URL}/rest/v1/client_galleries`, {
      method: 'POST',
      headers: { ...hdrs, 'Prefer': 'return=representation' },
      body: JSON.stringify({ name: galleryName, slug: gallerySlug, watermarked: false }),
    });
    const gals = await galRes.json();
    galleryId = gals?.[0]?.id || null;
  } catch (_) {}

  // Build combined notes
  const combinedNotes = [booking.notes, notes].filter(Boolean).join(' | ') || null;
  const addonsText = parsedAddons.length
    ? parsedAddons.map(a => a.name + ' +$' + parseFloat(a.price).toFixed(2)).join(', ')
    : null;

  // Update booking to confirmed
  await fetch(`${SB_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(booking.id)}`, {
    method: 'PATCH',
    headers: { ...hdrs, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      status: 'confirmed',
      ztn_number: ztn,
      venue_address: venueAddress || booking.event_location || null,
      addons_selected: addonsText,
      total: '$' + finalTotal.toFixed(2),
      deposit: '$' + deposit.toFixed(2),
      notes: combinedNotes,
      confirmed_at: new Date().toISOString(),
      gallery_id: galleryId,
    }),
  });

  // Emails
  if (env.RESEND_API_KEY) {
    const siteUrl = (env.SITE_URL || 'https://zrphotos.net').replace(/\/$/, '');
    const invoiceUrl = `${siteUrl}/invoice?ztn=${ztn}`;
    const from = env.FROM_EMAIL || 'ZRP <onboarding@resend.dev>';
    const name = clientName || 'there';

    // Client confirmation
    if (booking.email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: booking.email,
          subject: `Booking confirmed — ${ztn}`,
          html: confirmEmail(name, booking, ztn, venueAddress, parsedAddons, finalTotal, deposit, balance, invoiceUrl),
        }),
      }).catch(() => {});
    }

    // Zachary notification
    if (env.ZACHARY_EMAIL) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: env.ZACHARY_EMAIL,
          subject: `New confirmed booking — ${ztn} — ${clientName}`,
          html: zachEmail(clientName, booking, ztn, venueAddress, parsedAddons, finalTotal),
        }),
      }).catch(() => {});
    }
  }

  return Response.json({ ok: true, ztn, gallerySlug });
}

function confirmEmail(name, b, ztn, venue, addons, total, deposit, balance, invoiceUrl) {
  const rows = [
    b.event_date && ['Date', b.event_date],
    b.event_time && ['Time', b.event_time],
    b.sport_type && ['Sport', b.sport_type],
    venue        && ['Venue', venue],
    b.package_selected && ['Package', b.package_selected],
    addons.length && ['Add-ons', addons.map(a => a.name).join(', ')],
    ['Total', '$' + total.toFixed(2)],
    ['Deposit due', '$' + deposit.toFixed(2)],
    ['Balance due day of event', '$' + balance.toFixed(2)],
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
  <p style="font-size:11px;color:#bbb;line-height:1.7;margin:0">Your booking number is <strong style="color:#999">${ztn}</strong>. Your private gallery will be delivered within 5–7 days after the event.</p>
</div>
</body></html>`;
}

function zachEmail(clientName, b, ztn, venue, addons, total) {
  const rows = [
    ['Client', clientName || '—'],
    ['Email', b.email || '—'],
    b.phone && ['Phone', b.phone],
    b.event_date && ['Date', b.event_date],
    b.event_time && ['Time', b.event_time],
    b.sport_type && ['Sport', b.sport_type],
    venue && ['Venue', venue],
    b.package_selected && ['Package', b.package_selected],
    addons.length && ['Add-ons', addons.map(a => a.name + ' +$' + parseFloat(a.price).toFixed(2)).join(', ')],
    ['Total', '$' + total.toFixed(2)],
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
