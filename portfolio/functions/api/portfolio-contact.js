/**
 * POST /api/portfolio-contact
 * Body: { name, email, message, website, elapsed }
 *
 * The portfolio's contact form. Emails the message to Zachary through Resend so
 * no address or phone number has to appear on the site. Nothing is stored.
 * (Named differently from ZR Photos' /api/contact, which redirects to the
 * photo site, so the two can never be confused.)
 *
 * Env: RESEND_API_KEY, ZACHARY_EMAIL (comma-separate for several), FROM_EMAIL
 */
const LIMITS = { name: 100, email: 200, message: 3000 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ ok: false, error: 'Forbidden' }, 403);
  let b;
  try { b = await request.json(); } catch { return reply({ ok: false, error: 'Invalid request.' }, 400); }
  if (!b || typeof b !== 'object') return reply({ ok: false, error: 'Invalid request.' }, 400);
  // Bots: filled the invisible field, or sent faster than a person can type. Pretend it worked.
  if (b.website || Number(b.elapsed || 0) < 3000) return reply({ ok: true });

  const f = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    if (b[key] != null && typeof b[key] !== 'string') return reply({ ok: false, error: 'Please check the form.' }, 400);
    f[key] = (b[key] || '').trim();
    if (f[key].length > max) return reply({ ok: false, error: 'Please shorten your ' + key + '.' }, 400);
  }
  if (!f.name || !f.message || !EMAIL.test(f.email)) return reply({ ok: false, error: 'Name, a valid email, and a message are required.' }, 400);

  const to = String(env.ZACHARY_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!env.RESEND_API_KEY || !to.length) return reply({ ok: false, error: 'The contact form isn’t set up yet. Please try again later.' }, 503);
  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.FROM_EMAIL || 'Portfolio <onboarding@resend.dev>', to, reply_to: f.email,
        subject: `Portfolio message — ${f.name}`.replace(/[\r\n]+/g, ' '),
        html: `<div style="max-width:520px;margin:0 auto;padding:32px 20px;font-family:-apple-system,'Segoe UI',sans-serif;color:#191919">
<p style="font-size:12px;color:#777;margin:0 0 20px">zrphotos.net — portfolio contact form</p>
<h1 style="font-size:22px;font-weight:400;margin:0 0 6px">${esc(f.name)}</h1>
<p style="font-size:13px;color:#555;margin:0 0 20px">${esc(f.email)}</p>
<p style="font-size:15px;line-height:1.7;white-space:pre-wrap;margin:0 0 24px">${esc(f.message)}</p>
<p style="font-size:12px;color:#999;margin:0">Reply to this email to answer them.</p></div>`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!sent.ok) throw new Error('send failed');
    return reply({ ok: true });
  } catch {
    return reply({ ok: false, error: 'The message could not be sent. Please try again.' }, 502);
  }
}
