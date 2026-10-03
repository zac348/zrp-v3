# ZR Photos — Owner’s guide

The site is at **zrphotos.net**. The Studio manages photographs, enquiries, availability, prices, coupons, and print materials. New requests use one booking workflow; existing website galleries still work alongside Google Drive galleries.

## Login and password reset

Open `/login` to reach `/admin`. **Forgot password?** sends a link to `/reset`. The Supabase Authentication redirect allowlist must include `https://zrphotos.net/reset`.

Manage trusted accounts in Supabase → Authentication → Users. Website-photo administration uses the existing signed-in database permissions. Delivery administration also requires the account’s user ID in `delivery_admins`; an authorized database administrator manages that allowlist. Use **Sign out** when finished on a shared computer.

## How the site looks

The opening is a full-screen public photograph with Zachary’s name. It selects up to four landscape photos, prioritizing Biloxi, Thorncrown, and Sarasota. Visitors change them by buttons, arrow keys, or a swipe; there is no autoplay. Below it are the photography statement, selected work, booking steps, about, and contact.

Bodoni Moda supplies the large type; Public Sans handles body text and controls. Every date field opens the site’s own month calendar and every time field an iPhone-style hour/minute/AM-PM wheel (`src/lib/pickers.js`, loaded on every page by the layout). The browser’s input stays underneath, so form values, required fields, and min/max dates work as before. Licensed WOFF2 fonts are hosted on the site. Light is neutral near-white; dark is neutral charcoal. The appearance control offers **System**, **Light**, and **Dark**. System is the default and follows device changes while the page is open. The same themes cover client galleries and Studio.

Motion is limited to short fades: the opening, loading photographs, filters, viewer, and supported page navigation. Reduced motion turns these off. Captions stay visible. Photographs retain their proportions in collections and are never tinted for dark mode. The opening alone uses a crop and contrast overlay.

## Portfolio (Google Drive)

The public portfolio is a Google Drive folder: [portfolio folder](https://drive.google.com/drive/folders/1EQPwt4TABYTBQp2GxlneR3mBHfN2dupn). The homepage, `/portfolio`, the opening slideshow and the blog cover choices all read from it.

- **Add a photo:** drop the finished JPEG into the folder. **Remove one:** delete it or move it out. The site picks up changes within about five minutes.
- **Categories:** each subfolder is a category and gets its own filter button (`port/Soccer`, `port/Landscape`). Photos loose in the main folder show under "All work" only.
- **Captions:** the file name, without the extension (`Thorncrown Chapel.jpg` → "Thorncrown Chapel"). Camera names like `IMG_4031` or `DSC_0012` get no caption, so rename the ones that should have one. The opening slideshow prefers wide photos whose names mention Biloxi, Thorncrown or Sarasota.
- **Order:** newest first, by when the file was added to Drive.
- **Sizes:** Google makes the 700px and 2200px versions. Cloudflare caches them, so visitors never download full-size files. Only images are shown; videos and documents in the folder are ignored.
- **Privacy:** the site only ever serves files that sit in this folder or one of its direct subfolders. Nothing in client folders is reachable through it. Only put client work in the portfolio with their permission.
- **Access:** the folder must be readable by the Drive service account. Studio → Bookings → **Check Drive connection** reports whether it is, and names the account to share it with if not.

Studio no longer uploads photos. The Photos tab, "Add to portfolio", "Optimize existing photos", and the upload/delete endpoints were removed. If Drive can't be reached, the site falls back to the portfolio stored on the site before the switch.

## Old website galleries

The Galleries tab is gone from Studio. The 5 galleries made with the old upload system still work at their `/gallery?g=...` links (view, individual originals, Download all, watermark), and their photos remain in Cloudflare R2. New client deliveries all go through the Drive workflow below. Once those clients have their photos, the old galleries and the R2 bucket can be retired.

## Requests, acceptance, and Drive delivery

Both `/book` and the home contact form create private draft enquiries in **Bookings**. New enquiries appear above Active bookings. Published and declined requests appear in History. `/admin#enquiries` and `/admin#bookings` open this same tab.

1. **Review.** Open a new request. Package requests include the selected package, add-ons, answers, coupon, estimate, and portfolio permission in their notes. Dates and totals are requests until agreed with Zachary.
2. **Accept or Decline.** Decline asks for confirmation. Accept does not create a folder or email the client. With the updated delivery service deployed, an exact future/today date is blocked automatically.
3. **Confirm details.** Use **Copy client form link** and send it yourself, or **Fill in details** to enter the agreed information. The private form expires 30 days after acceptance. **Replace form link** or renew invalidates the old link and asks for confirmation.
4. **Create the folder.** Saving final details creates one client folder in the configured `cli_delivery` Shared drive parent. Its name includes session date, client name, and session type. The same process works whether Zachary or the client fills in the form. No folder is created just by receiving or accepting an enquiry.
5. **Recover if needed.** If Drive fails, details remain saved and the request says **Folder needs attention**. Fix the reported access problem and use **Retry folder**. The reserved folder ID is reused to avoid duplicates.
6. **Upload and publish.** **Open photo folder** opens Drive. Upload finished files directly into that folder, not nested folders. **Publish gallery** requires at least one supported file. Then **Copy gallery link** and send it yourself. **View gallery** opens the client view. **Unpublish** asks for confirmation and disables client access.

The details link and gallery link are separate private secrets stored in URL fragments (`#...`). Completed client forms show a receipt without exposing submitted details. Clients do not need Google accounts. The gallery uses small Drive preview images and streams the original uploaded file for **Download original**.

**Refresh** reloads requests; returning focus to the window also refreshes. **Check Drive connection** checks whether the service account can create children in the parent, without creating a test folder. Studio loads the latest 500 enquiries; Drive galleries load 24 files per page.

Galleries remain available until the client asks for removal. Clients should still keep their own downloaded copies. Removal is a manual studio action; there is no scheduled expiration job.

Old `/confirm` and `/invoice` links now explain that they belong to the retired system and direct clients to text Zachary or the contact form. Old booking records remain in the database as an archive. No table, gallery, or photograph was deleted by this redesign.

## Pausing online booking

Studio → **Bookings** → **Online booking**. Pick a **Resume bookings on** date and click **Pause bookings**. While paused:

- `/book` (and every "Book a session" button, which leads there) shows “Zachary will be accepting bookings soon.”, the reopening date, and a live countdown instead of the form.
- The booking endpoint refuses new requests too, so the pause can't be skipped by sending the form directly.
- The homepage contact form stays open.
- Booking reopens **by itself at 12:00 AM Eastern** on the chosen date. Visitors already on the page see the form come back when the countdown ends. Nothing has to run on a schedule.

**Update date** moves the reopening date; **Resume now** ends the pause immediately. If the setting can't be read (database outage), booking stays open rather than breaking.

One-time setup: run `supabase/migrations/202610020001_booking_pause.sql` in Supabase → SQL Editor. Until then the panel says "Setup needed" and booking works as before. The setting lives in the `site_settings` table: anyone can read it, and only accounts in `delivery_admins` can change it.

This is separate from `BOOKING_OPEN` in `src/config.js`, which turns online booking off entirely (buttons become "Get in touch").

## Availability

This tab appears while `BOOKING_OPEN` is true. Navigate months, choose a day, then save **Unavailable**, **Partial** (with start/end times), **Available**, or **Clear**, optionally with a note. Bulk selection updates several days. Replacing or removing availability asks for confirmation. The month’s blocks are listed below the calendar.

The client calendar disables past days and full-day unavailable dates. Partial days can be requested, with a limited-availability message; the final time must be agreed. Available days are explicitly marked. Unmarked days remain requestable.

After the new delivery function is deployed:

- Accepting a request with an exact date blocks the full day. Free text such as “October” waits for final details.
- Saving session details blocks the agreed date before Drive work begins. If the date changed, only that enquiry’s old automatic block is removed.
- Declining removes that enquiry’s automatic block. Other bookings or manual entries remain.
- Automatic notes say `Booked (ref XXXXXXXX)`. They contain no client name, email, phone, or address because this calendar is public.
- Zachary can replace a full-day block with Partial or Available. Explicit manual entries win. If he clears a date completely, saving final session details may block it again, as approved.
- Repeated accepts/completions cannot create duplicate blocks for the same enquiry. Past dates are skipped, using the America/New_York calendar date.
- A calendar failure never cancels acceptance or saving details. Studio reports it and tells Zachary to block the date manually.

A block is an availability aid, not a guarantee against two already-submitted requests for the same day. Review the “already blocked or manually marked” message before accepting overlapping work.

## Pricing and coupons

**Pricing:** edit each package’s base price, sale price, On sale setting, and availability, then Save. Available packages appear on `/book`, ordered by base price; the home starting price uses live available pricing. Add-ons are selected on `/book`. Create or delete an add-on, change its availability, or load the eight-item starter pack.

**Coupons:** this tab appears while booking is enabled. Create percent, fixed-dollar, or travel-waiver codes, optionally with an expiry and use limit. The list supports the existing enable/disable, delete, copy-code, and copy-booking-link actions. A `/book?coupon=CODE` link prefills the code. Percent/fixed discounts apply to the package; selected add-ons are listed separately. Travel is quoted separately.

The existing uses counter does not increment on redemption. A code and its effect are recorded with the request. If a valid active code cannot be read by visitors, ask the database administrator to check the existing public read policy on `coupons`; do not change policies casually.

## Print

The **Print** tab generates an envelope PNG. `/coupon-card` generates coupon-card PNGs. Fill the fields, select the design, and Download. Both wait for local fonts before export. No files are uploaded by these tools.

## Blog

Open **Studio → Blog** and choose **New post**. Add a title, post text, and an optional short description. The post link is filled from the title and stays fixed after the first save. A cover photograph can be chosen from Photos; describe it for readers using screen readers. Only choose a photograph you want to publish.

**Save draft** keeps a post private. **Preview** shows your current text without publishing it. **Publish** makes it appear on `/blog` with its own shareable link. For a published post, **Save changes** updates the live post immediately. **Unpublish** hides it and keeps it as a draft. **Delete post** permanently removes the post, but keeps the photograph in Photos. Unsaved changes prompt before switching posts or leaving the page; keep the tab open if a save fails. If another window changed the same post, copy your text before refreshing.

Paragraphs need no formatting. Optional shortcuts: `## Heading`, `**bold**`, `*italics*`, `- list item`, and `[link text](https://example.com)`. HTML and embedded code are displayed as text.

Blog storage was set up in the existing Supabase project on October 2, 2026 using `supabase/migrations/202610010001_blog_posts.sql`. Do not rerun that SQL on this project. It creates only the blog table, its access policies, and helper functions. Published posts are public; drafts and all writing actions are restricted to the existing Studio delivery-admin allowlist. It does not change bookings, photos, or existing delivery policies. A new site build is not needed each time Zac publishes a post.

## Terms and photo permission

The current terms retain the existing 50% deposit, 48-hour notice, 5–7 day delivery, copyright, and personal-use policies. The gallery rule is now availability until requested removal. Zachary should review the unchanged business policies and decide whether the existing effective dates should be updated before merging the legal wording changes.

The package form requires confirmation that the session is in Valdosta, Georgia, or a nearby community, asks for agreement to Terms, and offers optional portfolio permission. The server rejects requests without local-area confirmation and records it in the request. The permission is recorded in the request notes. Only publish client photographs with permission.

## Email and spam protection

The contact and package forms save the enquiry before sending notifications through **Resend**. The owner receives the existing enquiry email; when a valid email was supplied and the owner notification succeeds, the client receives the existing acknowledgment. Acceptance, final details, and publication do not automatically send client links. Send those yourself from Studio.

If email fails after a save, the request is still in Studio. If saving fails, the form reports failure and allows retry; there is no fallback email-only booking record. The hidden `website` field, minimum three-second fill time, and unique submission ID remain in both forms. Retries reuse the same ID to prevent duplicate enquiries.

For missing emails, check the `ZACHARY_EMAIL` destination, spam folder, then Resend’s Emails log. Check `RESEND_API_KEY` and verify the sender domain and `FROM_EMAIL`. Resend’s default sender cannot deliver to arbitrary client addresses. Comma-separated `ZACHARY_EMAIL` recipients remain supported.

## Required settings — keep all of these

| Setting | Where | Purpose |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Cloudflare Pages build/runtime environment | Public database and delivery connection |
| `PUBLIC_SUPABASE_ANON_KEY` | Cloudflare Pages build/runtime environment | Existing public database access |
| `RESEND_API_KEY` | Cloudflare Pages runtime | Enquiry notification and acknowledgment emails |
| `ZACHARY_EMAIL` | Cloudflare Pages runtime | Owner notification destination(s) |
| `SITE_URL` | Cloudflare Pages runtime | Public site links; `https://zrphotos.net` |
| `FROM_EMAIL` | Cloudflare Pages runtime | Verified Resend sender |
| `R2_BASE_URL` | Cloudflare Pages runtime | Uploaded photo URLs |
| `PHOTOS` | Cloudflare Pages R2 binding | Photo upload, original download, and deletion |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Supabase Edge Function secret only | Drive credentials; never commit or expose in the browser |
| `GOOGLE_DRIVE_PARENT_ID` | Supabase Edge Function secret | Optional configured Shared drive parent override |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase function environment | Existing service connection and admin authorization |

The existing default Shared drive parent is `0AHwV0eI44SAaUk9PVA`. Keep the service account’s Editor access on the configured parent. Do not put its JSON key in the repository.

## Site and delivery deployment

The code is at `github.com/zac348/zrp-v3`. A push to **master** automatically deploys Cloudflare Pages. The approved redesign was published from **redesign-v4** to **master** on October 1, 2026. The delivery calendar function is a separate deployment described below. Admin content edits take effect directly without a site deploy.

`src/config.js` retains `BOOKING_OPEN` and `PRIMARY_CTA`. True enables package booking. False changes public actions to Get in touch, redirects `/book` and `/quick-book` to contact, and hides Availability/Coupons in Studio. Existing private details and galleries still work.

The delivery function’s calendar feature is separate from the static site. **The calendar-enabled function was deployed and is active as of October 2, 2026.** No new migration or secret is required. For future delivery-service updates, run from the repository:

```sh
npx --yes supabase@2.118.0 functions deploy delivery --project-ref jrowfpgezkfeyzfyzfps --use-api
```

The October 2 setup ran that command successfully. **The Google Drive portfolio (October 3) needs this deploy once more**: it adds the public `portfolio` and `portfolio-image` actions. Until then the site shows the portfolio stored before the switch. No new secret is needed; the portfolio folder ID is built in (override with a `PORTFOLIO_FOLDER_ID` function secret). The site works with the older function, which omits calendar results; the new function also works with the old site. Do not rerun the existing workflow migration as part of this update.

The function keeps JWT gateway verification disabled for public enquiry/private-link routes. Its admin actions still verify the session and `delivery_admins` allowlist internally. Keep that protection intact.

## Supabase pausing guard

The existing **Keep Supabase awake** GitHub Action makes a small daily query. Failed runs use GitHub’s existing notification settings to alert the repository owner. It needs the repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`; update them if keys are rotated. The workflow was not changed.

If database data disappears, check the Supabase dashboard for a paused project and restore it promptly. Photo files remain in R2/Drive even if the database is paused. Requests cannot save while the database is unavailable; visitors receive a retry message. For a permanent plan change or current restore limits/pricing, check the Supabase dashboard.

## Getting found

Keep the Google Business Profile, Instagram `@zacharyroutsongphotos`, phone `229-300-1006`, and website information consistent. Share the site link in the Instagram bio. Ask willing clients for reviews directly. Add useful photo titles/locations and keep the public Portfolio current. There are no tracking pixels or analytics installed on the website.

## Troubleshooting

- **Unstyled after a deploy:** hard-refresh once the deployment finishes.
- **Cannot log in:** use Forgot password; check the `/reset` redirect allowlist.
- **Delivery action denied:** check the signed-in account and `delivery_admins` allowlist.
- **No photos:** check Supabase status, public Portfolio selections, and missing preview optimization.
- **Wrong calendar availability:** edit the date in Availability. Calendar warnings do not undo accepted requests; correct them manually.
- **Drive folder error:** read the message, check the service account/Shared drive access with Check Drive connection, then Retry folder.
- **Small Drive previews:** expected; Download original returns the original. Increasing preview resolution is outside this redesign.
- **Old confirmation/invoice link:** ask the client to text Zachary or use Contact.
- **Studio on a phone:** swipe the horizontal tab strip to reach every tab.

Known limitations kept unchanged: coupon uses are not incremented; watermarked website downloads fetch the original before watermarking it locally; website-gallery database permissions need a separate privacy review. No redesign can change these without the separate work they require.
