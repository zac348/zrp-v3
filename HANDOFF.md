# ZRP Website — Owner's Guide

Everything you need to run **zrphotos.net** day to day. No coding required for any of it.

---

## Logging in

- Admin dashboard: **zrphotos.net/login** → then you land on `/admin`
- Forgot your password? Click **"Forgot password?"** on the login page — it emails you a reset link that opens `zrphotos.net/reset`.
- To change your email/password or add another admin: **supabase.com/dashboard** → your project → **Authentication → Users**. Anyone in that list can access the admin panel, so only add people you trust.
- One-time setup check: in Supabase → **Authentication → URL Configuration → Redirect URLs**, make sure `https://zrphotos.net/reset` is listed — the password-reset email needs it.

## Uploading photos (Upload tab)

1. Pick a **Category** (Portraits, Family, Sports…) — this powers the category filters.
2. Tick **"Add to the public Portfolio page"** if these photos should be public. Leave it off for client work.
3. Click the drop zone (or drag files in). Photos are stored in Cloudflare R2.
4. Scroll down on the same tab to see **all photos**: select several (click photos or checkboxes) to bulk-change category, add to a client gallery, add/remove from the Portfolio, or delete.
5. **Photos are automatically resized on upload.** Each one is saved three ways: your untouched original (what clients download), a ~2200px web version (used when someone opens a photo), and a ~700px thumbnail (used in the grids). Visitors never download the full-size file — that's the difference between a 3 MB page and a 30 MB one.
6. **You no longer pick what's on the homepage.** It shows 6 photos at random from your Portfolio, reshuffled on every visit. Nothing to manage.
7. **Titles & locations:** the upload form has optional Title and Location fields (they apply to the whole batch). Fix individual photos anytime with the **Edit** button on a photo card, or select several and use **Set location**. Titles/locations show when visitors hover a photo on the homepage.
   - ⚠️ One-time setup: these two fields need two database columns. In Supabase → SQL Editor, run this once:
   ```sql
   alter table portfolio_photos add column if not exists title text;
   alter table portfolio_photos add column if not exists location text;
   ```
   Until you do, photos still upload fine — they just save without title/location and the admin tells you so.

## What's public: one Portfolio, one switch

There's a single public set of photos — your **Portfolio** — and one way in or out of it:

- **The `/portfolio` page** shows all of it, filterable by category, 24 at a time behind a "Load more" button.
- **The homepage** shows **6 of them at random**, reshuffled every visit. No picking, no toggle, nothing to maintain.

**To add or remove photos:** in the Upload tab's photo grid, tick the ones you want → in the bulk bar choose **Portfolio page… → Add to Portfolio** (or Remove) → **Apply**. You can also tick the box on the upload form to add a whole batch as you upload. Photos on the Portfolio show a gold **◆ PORTFOLIO** marker on their card.

Client-gallery photos can be in the Portfolio too — delivering a photo to a client doesn't stop you showing it off (just check they're OK with it; the booking form asks).

## Optimizing older photos (one-time)

Photos uploaded before automatic resizing existed are still full-size — some are 10–20 MB, which is brutal on a phone. In the Upload tab, above the photo grid, click **"Optimize existing photos."**

It walks every photo that doesn't have a web version yet, builds the smaller versions, and saves them. Originals are never touched, it shows progress as it goes, and it's safe to stop and re-run later — it skips anything already done. Do it once, on a laptop, on wifi.

## Client galleries (Galleries tab)

- Create a gallery, add photos to it (from the Upload tab's bulk actions), and share the link with your client.
- **Privacy model: the link IS the password.** Gallery links are long random URLs — anyone who has one can view and download. Don't post gallery links publicly; send them directly to the client.
- Galleries created automatically when a booking is confirmed get a random link too.

## Bookings (Bookings tab) — the flow

1. Client submits a request on `/book` or `/quick-book` → shows up as **pending**, **you get a "New booking request" email**, and **the client instantly gets a "got your request" acknowledgment**.
2. You click **Accept** → the client gets an email with a private link to finalize (location, add-ons, travel check), and **the session date is automatically blocked** on the availability calendar so nobody else can book it. (Cancelling a booking does *not* auto-unblock — remove the block in the Availability tab if the date frees up.)
3. Client finishes → status becomes **confirmed**, a gallery is auto-created, and both of you get confirmation emails with the invoice link.
4. After you deliver the photos, click **Mark delivered**.

Booking notes contain everything the client entered: session-type answers (e.g. "Sport & team: …"), coupon used, **whether they approved portfolio use of their photos**, and their free-text notes.

## Terms & photo permission

- The site has a **Terms of Service** at `/terms` — clients agree to it when booking. **Read it once and make sure the policies match how you actually work** (it currently says: 50% deposit, 48-hour reschedule/cancellation notice, 5–7 day delivery, 90-day galleries, you keep copyright, clients get personal-use rights). Edit the page if any of that isn't right.
- Every booking form has an **optional checkbox** asking permission to feature the client's photos in your portfolio/social media. Their answer is recorded in the booking's notes ("Portfolio use: approved / not approved"). **Only post photos from sessions that approved it.**

## Spam protection

The booking forms have an invisible bot trap (honeypot + a minimum fill-time check) — automated spam gets silently discarded without ever reaching your bookings list or email. If real spam ever becomes a problem anyway, the upgrade path is Cloudflare Turnstile (free) — any developer can wire it in quickly.

## Emails — how they work

Every email on the site (new-booking alerts to you, accept links, confirmations) goes through **Resend** (resend.com). There is no Formspree anymore.

- **You'll always be notified of new bookings** as long as `RESEND_API_KEY` and `ZACHARY_EMAIL` are set (below). Even without them, the booking still lands in your admin panel — you just won't get the email.
- **Clients get an instant acknowledgment** when they submit a request ("got it, you'll hear back within 24 hours — nothing confirmed yet"). Replies to it go to your `ZACHARY_EMAIL`.
- **Emailing clients needs a verified domain.** Resend's default sender can only email *your own* address. To send accept/confirmation emails to *clients*, verify your domain (e.g. `zrphotos.net`) in the Resend dashboard and set `FROM_EMAIL` to an address on it (e.g. `bookings@zrphotos.net`). Until then, client emails may not deliver.
- **If an accept email fails, the admin now tells you** — you'll get a popup saying the client didn't get their link, so it never fails silently.

## Availability (Availability tab)

Whatever you mark here is what clients see on the `/book` calendar:

- **Unavailable (full day)** → the date is struck out and unclickable for clients.
- **Partial** → clients can pick it but see "limited availability — time will be confirmed."
- **Available** → shows a green dot (a little "I'm open" signal).
- Days you haven't touched look like normal bookable days. **Keep this tab current** — it's your only calendar defense.
- "Bulk select" lets you mark many days at once.

## Pricing (Pricing tab)

- **Packages:** edit base price, set a sale price + "On sale" toggle, or mark a package unavailable (it disappears from the booking page).
- **Add-ons:** these appear on the client's booking-confirmation page automatically when marked Available. Use **"Add starter pack"** to load 8 standard ones (rush delivery, extra hour, second photographer, video reel, social crops, unedited photos, album, canvas). Add your own with the name + price form; delete ones you don't offer.

## Coupons (Coupons tab)

- Create a code (percent off, fixed $ off, or travel-fee waiver), optionally with an expiry date or max uses.
- Share it directly or via the **copy link** button — links look like `zrphotos.net/book?coupon=CODE` and pre-fill the code for the client.
- Clients enter codes in the **Promo code** box on the booking page; the discount shows in their estimate and carries through to the invoice.
- ⚠️ **If a known-good code says "Invalid code":** the coupons table needs a read policy for visitors. In Supabase → SQL Editor, run:
  ```sql
  create policy "public can read active coupons"
  on coupons for select to anon using (active = true);
  ```
- Note: the "uses" counter is informational — the site doesn't auto-increment it when a client redeems (you'll see the code in the booking's notes instead).

## Envelopes & coupon cards

The **Envelopes** tab and `/coupon-card` page generate print-ready PNGs (photo-delivery envelopes and physical coupon cards). Fill in the fields, click Download.

## How the website gets updated (deploys)

- The site's code lives at **github.com/zac348/zrp-v3**. Any push to `master` makes **Cloudflare Pages** rebuild and publish the live site automatically (~1–2 minutes).
- Content changes (photos, prices, availability, coupons, bookings) happen in the **admin panel** and are live instantly — no deploy needed.

## Required settings (already configured — don't delete!)

These live in the **Cloudflare Pages dashboard** → your project → Settings:

| Setting | Where | What breaks without it |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Environment variables | The whole site's data |
| `PUBLIC_SUPABASE_ANON_KEY` | Environment variables | The whole site's data |
| `RESEND_API_KEY` | Environment variables | **All emails** (new-booking alerts, accept links, confirmations) |
| `ZACHARY_EMAIL` | Environment variables | Your new-booking + confirmation notices |
| `SITE_URL` (`https://zrphotos.net`) | Environment variables | Links inside emails |
| `FROM_EMAIL` (verified domain) | Environment variables | Emails **to clients** (needs Resend domain verification) |
| `PHOTOS` → your R2 bucket | Functions → R2 bucket bindings | Photo upload/delete |
| `R2_BASE_URL` | Environment variables | Photo URLs |

If emails ever stop arriving, check `RESEND_API_KEY` and `ZACHARY_EMAIL` first — bookings still save without them, but you won't get notified. For client emails specifically, confirm your domain is verified in Resend and `FROM_EMAIL` uses it.

## Getting found (the stuff the website can't do for you)

- **Google Business Profile** — free, and it's how you show up when parents search "photographer near me." Set one up at google.com/business with the same name, phone (229-300-1006), and site link. This is the single biggest thing on this list.
- **Ask for reviews** — after every happy client, text them your Google review link directly. Reviews compound; five good ones changes how the profile ranks.
- **Instagram** — keep the handle (@zacharyroutsongphotos) matching the business name, keep the site link in bio, and link back to the site when you post galleries. During season, 2–3 posts a week; short video clips of game highlights tend to do the best numbers.
- **Phones first** — most parents will open this site from a link in a group chat. It's built to load fast on mobile; keep it that way by curating the homepage photos (see Uploading).

## Quick troubleshooting

- **Page looks broken/unstyled right after an update** → mid-deploy hiccup; hard-refresh (Cmd+Shift+R).
- **Can't log in** → reset the password via "Forgot password?", or directly in Supabase → Authentication → Users.
- **A date clients shouldn't book is selectable** → mark it Unavailable in the Availability tab.
- **Coupon says invalid** → see the SQL note in the Coupons section above.
