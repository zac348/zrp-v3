// ── Site switches ────────────────────────────────────────────────────────────
//
// BOOKING_OPEN — turns online booking on or off for the whole site.
//
//   false  Buttons everywhere say "Get in touch" and go to the contact section
//          on the homepage. Old /book and /quick-book links redirect there too.
//   true   Buttons say "Book a session" and go to /book, like before.
//
// Either way, private client-details links and galleries keep working.
// Old confirmation and invoice links explain how to contact Zachary.
//
// To change it: flip the value below, commit, and push. Live in ~2 minutes.
export const BOOKING_OPEN = true;

export const PRIMARY_CTA = BOOKING_OPEN
  ? { href: '/book',      label: 'Book a session' }
  : { href: '/#contact',  label: 'Get in touch' };
