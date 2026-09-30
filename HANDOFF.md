# ZRP Website — Owner's Guide

Everything you need to run **zrphotos.net** day to day. No coding required for any of it.

---

## Logging in

- Admin dashboard: **zrphotos.net/login** → then you land on `/admin`
- Forgot your password? Click **"Forgot password?"** on the login page — it emails you a reset link that opens `zrphotos.net/reset`.
- To change your email/password or add another admin: **supabase.com/dashboard** → your project → **Authentication → Users**. Anyone in that list can access the admin panel, so only add people you trust.
- One-time setup check: in Supabase → **Authentication → URL Configuration → Redirect URLs**, make sure `https://zrphotos.net/reset` is listed — the password-reset email needs it.

## Uploading photos (Photos tab)

1. Pick a **Category** (Portraits, Family, Sports…) — this powers the category filters.
2. Tick **"Add to the public Portfolio page"** if these photos should be public. Leave it off for client work.
3. Click the drop zone (or drag files in). Photos are stored in Cloudflare R2.
4. Scroll down on the same tab to see **all photos**: select several (click photos or checkboxes) to bulk-change category, add to a client gallery, add/remove from the Portfolio, or delete.
5. **Photos are automatically resized on upload.** Each one is saved three ways: your untouched original (what clients download), a ~2200px web version (used when someone opens a photo), and a ~700px thumbnail (used in the grids). Visitors never download the full-size file — that's the difference between a 3 MB page and a 30 MB one.
6. **You no longer pick what's on the homepage.** It shows up to 6 photos from your Portfolio, alternating categories for a balanced selection. Newer photos appear first within each category. Nothing to manage.
7. **Titles & locations:** the upload form has optional Title and Location fields (they apply to the whole batch). Fix individual photos anytime with the **Edit** button on a photo card, or select several and use **Set location**. Titles/locations appear below each photograph, and they double as the photo's description for screen readers and Google. With no title, the category + location is used (e.g. "Soccer, Valwood School") — so filling in locations is worth it.
   - ⚠️ One-time setup: these two fields need two database columns. In Supabase → SQL Editor, run this once:
   ```sql
   alter table portfolio_photos add column if not exists title text;
   alter table portfolio_photos add column if not exists location text;
   ```
   Until you do, photos still upload fine — they just save without title/location and the admin tells you so.

## What's public: one Portfolio, one switch

There's a single public set of photos — your **Portfolio** — and one way in or out of it:

- **The `/portfolio` page** shows all of it, filterable by category, 24 at a time behind a "Load more" button.
- **The homepage** shows **up to 6 photographs**, alternating categories, with newer photographs first within each category. No picking, no toggle, nothing to maintain.

**To add or remove photos:** in the Photos tab's photo grid, tick the ones you want → in the bulk bar choose **Portfolio page… → Add to Portfolio** (or Remove) → **Apply**. You can also tick the box on the upload form to add a whole batch as you upload. Photos on the Portfolio show a gold **◆ Portfolio** marker on their card.

The redesigned homepage selects up to four landscape photographs from the public Portfolio for its opening feature. Visitors can browse them with the arrow controls. No additional uploads or admin steps are needed.

Client-gallery photos can be in the Portfolio too — delivering a photo to a client doesn't stop you showing it off (just check they're OK with it; the booking form asks).

## Optimizing older photos (one-time)

Photos uploaded before automatic resizing existed are still full-size — some are 10–20 MB, which is brutal on a phone. In the Photos tab, above the photo grid, click **"Optimize existing photos."** (The button only appears while there are photos that still need it — once everything's done, it disappears.)

It walks every photo that doesn't have a web version yet, builds the smaller versions, and saves them. Originals are never touched, it shows progress as it goes, and it's safe to stop and re-run later — it skips anything already done. Do it once, on a laptop, on wifi.

## Client galleries (Galleries tab)

- Create a gallery, add photos to it (from the Photos tab's bulk actions), and share the link with your client.
- **Privacy model: the link IS the password.** Gallery links are long random URLs — anyone who has one can view and download. Don't post gallery links publicly; send them directly to the client.
- Galleries created automatically when a booking is confirmed get a random link too.

## Enquiries → client albums (Galleries tab)

The homepage contact form now saves an **admin-only draft album** and sends the existing email notifications. Saved enquiries remain available even if notification email fails.

1. Open **Admin → Galleries → Enquiries & client albums**. Each contact submission appears as **New enquiry**.
2. Click **Accept** or **Decline**. Accepting does not create a Google Drive folder and does not automatically email the client.
3. Under **Awaiting details**, choose **Copy client form link** (send it by text or email yourself) or **Fill in details** to enter the agreed session information yourself. The private form expires 30 days after acceptance; **Replace form link** invalidates the previous one.
4. Completing the required details saves them, then creates exactly one client folder in the **cli_delivery Shared drive**. The folder is named using the session date, client name, and session type. Both client and admin use the same completion process.
5. If Google fails, the details remain saved and the album displays **Folder needs attention**. Fix the stated access problem, then click **Retry folder**. The reserved folder ID is reused; retrying does not make duplicates.
6. Use **Open photo folder** to upload finished files directly to that folder (not into nested subfolders). Click **Publish gallery** when ready, then **Copy gallery link**. Empty folders cannot be published.
7. The gallery shows Drive previews and streams the exact original uploaded file for downloads. Clients do not need Google accounts. **Unpublish** disables gallery access again. Anyone holding a published gallery link can view/download it; send it privately.

The client-details link and gallery link are separate random secrets. Completed forms show only a receipt, not the submitted private details. New enquiry records have no public database permissions. Only explicitly allowed studio admins can manage them.

The **Check Drive connection** button verifies that the service account can add children in the configured Shared drive. It does not create a folder.

Online self-service booking remains off. The older Bookings tab, confirmation links, invoices, and existing R2 galleries continue to work independently. New contact enquiries are managed in Galleries, not the older Bookings tab.

### Delivery service deployment

- Database migration: `supabase/migrations/202609300001_delivery_workflow.sql` (additive, private tables only).
- Edge Function: `delivery`; JWT gateway verification is disabled because enquiries and private-link forms are public routes. Every admin action independently verifies the Supabase session and the `delivery_admins` allowlist.
- Secret: `GOOGLE_SERVICE_ACCOUNT_JSON`, held only by Supabase.
- Parent Shared drive: `0AHwV0eI44SAaUk9PVA`; optionally override with `GOOGLE_DRIVE_PARENT_ID`.
- `scripts/setup-delivery.py` applies the migration using the existing Supabase CLI login without printing the token.
- Deploy with `npx --yes supabase@2.118.0 functions deploy delivery --project-ref jrowfpgezkfeyzfyzfps --use-api`.
- Grant another trusted studio admin access by adding their existing `auth.users.id` to `delivery_admins` through an authorized database administrator.
- Album listing currently loads the most recent 500 enquiries. Gallery files are paged from Drive and displayed 24 at a time.

## Bookings (Bookings tab) — the flow

1. Client submits a request on `/book` or `/quick-book` → shows up as **pending**, **you get a "New booking request" email**, and **the client instantly gets a "got your request" acknowledgment**.
2. You click **Accept** → the client gets an email with a private link to finalize (location, add-ons, travel check), and **the session date is automatically blocked** on the availability calendar so nobody else can book it. (Cancelling a booking does *not* auto-unblock — remove the block in the Availability tab if the date frees up.)
3. Client finishes → status becomes **confirmed**, a gallery is auto-created, and both of you get confirmation emails with the invoice link.
4. After you deliver the photos, click **Mark delivered**.
5. **Deleting old bookings:** finished bookings (delivered, cancelled, or the session date has passed) get a red **Delete** button. The **Past** filter shows just those. Clicking Delete asks you to **type the client's name** before the button unlocks — so it can't happen by a stray click. Upcoming bookings never show a Delete button; cancel them first if you really want them gone. Deleting removes the booking record for good (their gallery and photos stay, but their invoice link stops working).

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

*Hidden from the admin while online booking is off — it comes back automatically when you flip the switch.*

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

*Hidden from the admin while online booking is off — it comes back automatically when you flip the switch.*

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
| `ZACHARY_EMAIL` | Environment variables | Where new-booking, contact-form, and confirmation notices go. Comma-separate to notify more than one person, e.g. `zac@zrphotos.net, someone@gmail.com` |
| `SITE_URL` (`https://zrphotos.net`) | Environment variables | Links inside emails |
| `FROM_EMAIL` (verified domain) | Environment variables | Emails **to clients** (needs Resend domain verification) |
| `PHOTOS` → your R2 bucket | Functions → R2 bucket bindings | Photo upload/delete |
| `R2_BASE_URL` | Environment variables | Photo URLs |

If an email seems missing, check in this order: **(1)** it went to the address in `ZACHARY_EMAIL`, not whoever tested; **(2)** the spam folder; **(3)** the **Emails** page in the Resend dashboard, which shows every message and whether it was *Delivered*, *Bounced*, or never sent. After that, check `RESEND_API_KEY` and `ZACHARY_EMAIL` — bookings still save without them, but you won't get notified. For client emails specifically, confirm your domain is verified in Resend and `FROM_EMAIL` uses it.

## Getting found (the stuff the website can't do for you)

- **Google Business Profile** — free, and it's how you show up when parents search "photographer near me." Set one up at google.com/business with the same name, phone (229-300-1006), and site link. This is the single biggest thing on this list.
- **Ask for reviews** — after every happy client, text them your Google review link directly. Reviews compound; five good ones changes how the profile ranks.
- **Instagram** — keep the handle (@zacharyroutsongphotos) matching the business name, keep the site link in bio, and link back to the site when you post galleries. During season, 2–3 posts a week; short video clips of game highlights tend to do the best numbers.
- **Phones first** — most parents will open this site from a link in a group chat. It's built to load fast on mobile; keep it that way by curating the homepage photos (see Uploading).

## If the site ever loses its photos (Supabase pausing)

Every photo, booking, price, and the admin login live in **Supabase**. On the free plan, Supabase pauses a project after about a week of inactivity — the site still loads, but it's empty. That happened in September 2026.

**Two guards are in place now:**

- **Daily keepalive.** A GitHub Action (`Keep Supabase awake`, in the repo's Actions tab) runs one tiny database query every day so the project never looks idle. If the database ever fails to answer, the run fails and **GitHub emails the repo owner** — so it's also your early-warning alarm. It uses two repo secrets, `SUPABASE_URL` and `SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions); if you ever rotate the Supabase keys, update those too.
- **Bookings can't silently vanish.** If the database is down when someone books, the booking still gets emailed to you with a red **"⚠️ NOT SAVED — add manually"** subject and banner. That email is the only record — add it to admin by hand or reply to the client. If the email *also* fails, the client is told it didn't go through and asked to try again or call.

**If it happens anyway:** your photo files are safe in Cloudflare R2 regardless — only the database pauses. Go to **supabase.com/dashboard**, open the project, click **Restore**, and wait a few minutes. Nothing on the site needs changing. Don't sit on it: Supabase only keeps paused projects restorable for a limited time.

**The permanent fix** is Supabase Pro ($25/month) — it never pauses and includes daily backups.

## How the site looks (so future changes stay consistent)

- **Two fonts:** Bodoni Moda for headings and the name, Public Sans for body text and controls. Fonts are served locally.
- **Photo layouts:** the homepage uses cropped previews in a staggered grid; the archive and opened viewer preserve the full photograph. The first few photos load right away; the rest load as you scroll.
- **No decorative motion.** No decorative glows or zooms; captions remain visible below the photographs. Everything works with a keyboard (Tab to a photo, Enter to open, Esc to close).
- Plain wording in Zachary's voice. If a claim isn't true yet (e.g. a type of shoot with no photos to back it up), leave it out.

The header appearance icon offers **System**, **Light**, and **Dark**. System follows the device setting automatically; manual choices are saved.

## Quick troubleshooting

- **Page looks broken/unstyled right after an update** → mid-deploy hiccup; hard-refresh (Cmd+Shift+R).
- **Can't log in** → reset the password via "Forgot password?", or directly in Supabase → Authentication → Users.
- **A date clients shouldn't book is selectable** → mark it Unavailable in the Availability tab.
- **Coupon says invalid** → see the SQL note in the Coupons section above.
- **"The database blocked the delete" when deleting a booking** → the bookings table needs permission for signed-in admins to delete. In Supabase → SQL Editor, run once:
  ```sql
  create policy "admin can delete bookings"
  on bookings for delete to authenticated using (true);
  ```
- **Admin on your phone** → the tabs run across the top; swipe that strip sideways to reach them all.
