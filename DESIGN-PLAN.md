# ZR Photos v4 — design and simplification plan

Phase 1 only. Prepared October 1, 2026 from `ASTRA_REDESIGN_PROMPT.md` and the current source at `d14963b`. Work is on `redesign-v4`. No website implementation, production data change, deployment, or push to master is part of this phase.

## 1. Purpose

This site is for parents, coaches, couples, and local businesses in and around Valdosta who want to see Zachary's photographs and request a session. Its job is to make the work easy to judge, explain the actual booking process, and keep requesting and receiving photographs straightforward. The photographs should be the first thing visitors notice.

## 2. Baseline and audit

- Clean starting revision: `d14963b`, the charcoal adjustment approved in this conversation.
- Created `redesign-v4`; master remains untouched.
- `npm ci`: passed. The available Node runtime had no npm executable, so npm 10.9.4 was unpacked from its official registry into ignored `work/` and invoked through Node. No project dependency was added, upgraded, or changed.
- `npm run build`: **17 pages**, passed.
- `npm test`: **36 passed**, zero failures.
- Read in full: HANDOFF, REDESIGN, config, Layout, every source file in pages/lib/styles/components, every API function, the delivery function and migration/config, and all five test files.
- No applicable AGENTS.md found in the repository or parent chain.
- Measured source: **31 files, 5,677 lines, 288,785 bytes**. Admin: **1,877 lines, 91,040 bytes**. There are **130 inline style attributes**, **12 page-global style blocks**, and **59 admin onclick attributes**.
- The existing CSS overrides earlier CSS repeatedly. Removing only the visible design would leave the old system underneath; v4 replaces those blocks at their owners.

Line counts use `len(text.splitlines())`; byte counts use actual file sizes, including UTF-8 characters. Dependencies, generated output, assets, and tests are outside the `src/` total.

### References

Opened [Jakobsen Copenhagen](https://jakobsencopenhagen.com/en/), [Union](https://unionboulangerie.com/), [Town](https://www.town.com/), and [Core-A](https://www.coreastudios.com/). Their pages are accessible; this phase used their page content and the visual descriptions in the brief, not a claim of a full visual browser audit of each reference.

Borrow the photograph filling the opening, the quiet navigation, the sentence interrupted by a real image, and the sparse captions. Borrow no assets or copy. Skip video, moving typography, gamification, decorative transitions, and a list/grid toggle: Zachary's photographs benefit more from a single well-composed archive.

## 3. Visual system

Keep the recently selected **neutral charcoal #202020**. The site should not return to black, olive, cream, or colored accents. Light mode is a separate near-white composition; its footer, viewer controls, forms, and admin also use light tokens.

### Six neutral tokens

| Role / token | Dark | Light | Use |
|---|---|---|---|
| Canvas / `--canvas` | `#202020` | `#F8F8F8` | Page background, ordinary sections |
| Surface / `--surface` | `#282828` | `#FFFFFF` | Fields, menus, estimate, admin editing areas |
| Ink / `--ink` | `#EDEDED` | `#191919` | Text, primary buttons, focus ring |
| Muted / `--muted` | `#B8B8B8` | `#5E5E5E` | Captions, explanatory text, placeholders |
| Rule / `--rule` | `#505050` | `#D4D4D4` | Decorative separators only |
| Control / `--control` | `#888888` | `#777777` | Input boundaries, outlined controls |

Primary buttons use ink as their fill and canvas as their text. Secondary buttons use the control border and ink text. Focus uses a 2px ink outline with a 3px offset. Selection is immediate, with a visible check/label or underline, not color alone. No opacity reduction on enabled controls or required text.

### Semantic colors

| Meaning | Dark text / border | Light text / border |
|---|---|---|
| Success | `#A3C9AD` | `#2F6746` |
| Warning | `#E3C188` | `#765514` |
| Error | `#E9A7A7` | `#983B3B` |

Status messages use plain text, a label, and an optional left rule on the normal surface. These colors appear only where they convey state. Retire `--purple` and decorative color names after all consumers migrate. “Awaiting details” can be neutral; it does not need a fourth semantic color. The calendar distinguishes open, limited, and unavailable through labels/marks and strikethrough, as well as color.

Computed contrast against the least favorable canvas/surface in each theme:

| Pair | Dark | Light |
|---|---:|---:|
| Ink | 12.59:1 | 16.56:1 |
| Muted text | 7.43:1 | 6.11:1 |
| Control boundary | 4.16:1 | 4.22:1 |
| Success text | 8.08:1 | 6.28:1 |
| Warning text | 8.60:1 | 6.42:1 |
| Error text | 7.41:1 | 6.54:1 |

These are token calculations, not a claim of finished-page accessibility. Decorative rules are not used to identify input boundaries. Hero text is soft white in both themes. Local, even neutral scrims behind text regions must meet contrast against the brightest photo pixels; no photo filter, gradient wash, tint, or dark-mode dimming. If a crop cannot support legible text, strengthen that text region's solid scrim rather than add a shadow.

### Type

Keep **Bodoni Moda regular 400** for the large name, statement, page titles, and print headings. Keep **Public Sans 400/500/600** for body, controls, captions, forms, and admin. Bodoni gives the few large moments character without a new family or a new download source; Public Sans keeps operational screens readable.

Remove Bodoni italic and 500. No automatically italicized final word, no italic surnames, no oversized serif headings in admin rows. Convert retained TTFs to self-hosted WOFF2, retaining both license files; remove the replaced TTFs only after verifying all references and print exports. Preload only Public Sans 400 and Bodoni 400. If conversion tooling is unavailable, stop at that tooling issue rather than add a project dependency or external font request.

| Role | Mobile | Desktop | Treatment |
|---|---|---|---|
| Name over photograph | 38–64px | 76–128px | Bodoni, upright, restrained spacing; two lines on small screens |
| Statement | 32–42px | 58–88px | Bodoni, natural wrapping, no animated letters |
| Page title | 36px | 56px | Bodoni |
| Section title | 28px | 36px | Bodoni |
| Admin title | 26px | 30px | Public Sans 500 |
| Body / input | 16px | 16px | Public Sans 400, line-height 1.6 |
| Caption / utility | 13–14px | 13–14px | Public Sans; visible in both themes |

Spacing scale: **4, 8, 12, 16, 24, 32, 48, 64, 96px**. Public maximum content width 1440px; text measures 60–68 characters. Public gutters 16px at 320px, 24px at 390px, 40px at tablet, 64px on large screens. Section space 64px mobile / 96px desktop. Admin uses 16–24px space; it must not inherit portfolio-sized gaps. Square fields/buttons, no shadows; rounded native controls only where the platform supplies them.

### Motion

One easing: `cubic-bezier(.2, 0, .2, 1)`.

- Opening photo and name: one shared **400ms opacity fade**, no stagger, delay, slide, or zoom. Network loading is separate from animation time.
- Photo load: **180ms opacity** only. Photos already complete do not replay a reveal.
- Category change and page navigation: **180ms crossfade**, feature-detected; ordinary immediate swap/navigation elsewhere.
- Viewer open/close and featured change: **180ms fade**; closing restores focus promptly even if animation events fail.
- Hover: immediate color/underline/border change; no lift or scale. Admin has no decorative animation.
- Booking success may fade once for 180ms; estimate numbers update immediately.
- Reduced motion: all of the above disabled, including smooth scrolling and view transitions. Nothing depends on animation completion to exist or remain visible.

## 4. Home opening, step by step

1. The existing pre-paint script applies System/Light/Dark before first paint. Its storage key and live system/storage listeners remain. The photo opening has the same treatment in both themes.
2. A `100svh` opening occupies the screen, including on phones. Navigation is overlaid at the top. On 320px it uses a short `zr.` mark and one compact row: Work, About, the configured CTA, appearance. No hamburger. If text enlargement needs wrapping, use a second quiet row instead of clipping.
3. Render the name and small line “Photography in Valdosta, Georgia” immediately. Links remain available while photos load or fail; no blank loading screen and no disabled navigation.
4. Fetch public portfolio rows only. Retain the exact featured-selection order: landscape dimensions, Biloxi first, Thorncrown second, Sarasota third, remaining wide photos, distinct results capped at four. Do not add stock images or request originals.
5. Render the first image with known dimensions, responsive `srcset`/`sizes`, and high fetch priority. The page cannot promise a network-independent LCP because photo URLs are resolved in the browser. The name fades once on initial paint; the first image fades once when decoded, both 400ms with no stagger. A cached image and name fade together. A slow image never delays the name or controls.
6. Desktop uses the whole frame as far as possible; the opening is the one intentional crop. Use source-specific focal positions chosen by inspecting the actual selected images at 390px. Biloxi initially favors its horizon; Thorncrown and Sarasota positions remain to be verified, not guessed. All subsequent portfolio images preserve their actual ratios.
7. Bottom edge: small outlined “See the work” and `PRIMARY_CTA`, with the location/counter and previous/next controls separate. Controls are 44px even when the visible labels are small. On narrow screens put the counter on its own row.
8. Swipe, arrows while the feature has focus, and previous/next change the photograph with a crossfade; no autoplay or document-wide arrow interception. A separate, labeled open-photo control avoids nesting links in a giant image button.
9. Past the opening, the same header takes the current theme's opaque background. No blurred glass. An intersection observer controls this enhancement; normal navigation remains usable if it does not run. A compact mobile CTA bar appears after the opening and does not cover the contact form, footer links, focus targets, or consent notice.
10. Empty/error/broken-image states retain readable copy and the Instagram fallback. A failed featured image keeps its next control; the rest of the site and forms stay independent.

After the opening, the large sentence is: **“Portraits, families, events and sports in Valdosta, Georgia.”** One real public image sits between “sports” and “in Valdosta.” It links to that image's actual category; a sports image must not be presented as a family session. On mobile it becomes a small full-ratio image between two sentence lines. Omit it cleanly if the photo service is unavailable. Below: “Edited photographs, delivered through a private gallery.” and the configured CTA.

## 5. Wireframes

### Home — desktop, dark annotated

```text
+------------------------------------------------------------------+
| zr.        Work       About       Book a session       Appearance  | white on photo
|                                                                  |
|                     [ full-screen photograph ]                   | 100svh
|                                                                  |
|                       Zachary Routsong                           | upright Bodoni
|                   Photography in Valdosta, Georgia                |
|                                                                  |
| [See the work] [Book a session]       Biloxi       01 / 04   <  >  |
+------------------------------------------------------------------+
| Portraits, families, events and sports                            | #202020 canvas
|                         [real photo] in Valdosta, Georgia.        | #EDEDED ink
| Edited photographs, delivered through a private gallery. [Book]  |
|                                                                  |
| Selected photographs         All 11   Landscape 6   Soccer 5      | counts live
| [       large full-ratio image       ]                            |
| location / category                         [smaller image]      | #B8B8B8 captions
|             [smaller image]      [       larger image       ]     |
| [       larger image       ]                 [smaller image]      |
|                                           Complete portfolio     |
|                                                                  |
| Booking      1 Request a session                                  | plain ordered rows
|              2 Confirm details after Zachary accepts               | not three cards
|              3 Receive your private gallery, typically 5–7 days   |
|                                                                  |
| [portrait, actual ratio]       About Zachary                       |
|                               Valdosta / facts / live From $X     |
|                               [Book a session]   Equipment +      |
|                                                                  |
| Contact / text fastest          Name          Email or phone      |
| [Instagram] [Text] [Email]       Details / preferred date           |
|                                 Same two checkboxes / Send         |
|                                                                  |
| Zachary Routsong   phone   email   Instagram   Privacy Terms Login |
+------------------------------------------------------------------+
```

### Home — phone

```text
+--------------------------------+
| zr. Work About Book a session ◐ | 44px controls, no menu
|                                |
|    [full-height photograph]    |
|         Zachary                |
|         Routsong               |
| Photography in Valdosta, GA    |
|                                |
| [See work] [Book a session]     |
| Biloxi              01/04 < >  |
+--------------------------------+
| Portraits, families, events    |
| and sports [one real image]    |
| in Valdosta, Georgia.          |
| Short factual line / Book      |
|                                |
| Selected photographs           |
| All 11 Landscape 6 Soccer 5    | wrapping text filters
| [large, real ratio]            |
| caption                        |
|       [inset, real ratio]      | alternating widths, no crop
|       caption                  |
| ... up to six / Full portfolio |
| Booking: 1 ... 2 ... 3 ...      |
| [portrait]                     |
| About / facts / From $X        |
| Equipment +                    |
| Contact icons / same form      |
| Plain contact footer           |
+--------------------------------+
| Text Zachary     Book a session| appears only after opening
+--------------------------------+
```

Mobile uses one column so photographs are large enough to judge; alternating modest insets supply rhythm. At 320px do not shrink captions to preserve the inset.

### Portfolio

```text
Desktop                                   Mobile
+-----------------------------------+     +--------------------------+
| normal themed nav                 |     | normal themed nav        |
| Photographs               11      |     | Photographs          11  |
| All 11  Landscape 6  Soccer 5     |     | All 11 Landscape 6 ...  |
| [large landscape]   [portrait]     |     | [photo, original ratio] |
| caption             caption       |     | caption                  |
|                     [landscape]   |     | [photo, original ratio] |
| [portrait]          caption       |     | caption                  |
| caption                           |     | ...                      |
| 24 of 60        [Show more]        |     | 24 of 60   [Show more]  |
| Book a session / Text Zachary      |     | Book / Text              |
+-----------------------------------+     +--------------------------+
```

Use a DOM-ordered grid with varied column spans, not CSS columns that make keyboard order zigzag unpredictably. Preserve active `?cat=`, pushState, Back, counts, 24-photo batches, and error/empty states. No list/grid switch or its extra state.

### Book

```text
Desktop                                   Mobile
+-----------------------------------+     +--------------------------+
| Request a session                 |     | Request a session        |
| 1 Package                         |     | 1 Package: flat rows     |
| [Basic    live price / features]   |     | 2 Your details           |
| [Standard live price / Popular]   |     | first / last/email/phone |
| [Premium  live price / features]  |     | 3 Date and session       |
| 2 Your details       +-----------+|     | full-width calendar      |
| first/last           | Estimate  ||     | start time / type / Qs   |
| email/phone          | package   ||     | 4 Add-ons / promo code   |
| 3 Date and session   | add-ons    ||     | itemized estimate        |
| calendar/time/type   | discount  ||     | Notes                    |
| type follow-ups      | total     ||     | Terms / portfolio choice |
| 4 Add-ons / promo    +-----------+|     | Send booking request     |
| Notes                             |     +--------------------------+
| Terms + optional portfolio        |     | Estimate $X              |
| [Send booking request]            |     | sticky only while useful |
+-----------------------------------+     +--------------------------+
```

This is one continuous form, not a wizard. No added decisions, required fields, navigation gates, or invented prices. The estimate is supplemental; the actual summary remains in form order. Keep first/last as separate fields and all TYPE_QUESTIONS. Inline errors replace alerts with the same messages; values survive retry. The time field remains keyboard-operable instead of keeping the current `onkeydown="return false"`.

At 320px, seven 44px calendar cells require 308px: the calendar temporarily uses 6px outer margins with no column gap, while other content retains normal gutters. This solves the touch-target constraint without horizontal page overflow. Consent and sticky estimate must stack without hiding the submit button; prefer temporarily hiding the sticky estimate when the notice is open.

### Admin

```text
Desktop
+----------------+-------------------------------------------------+
| Studio       ◐ | Bookings               Refresh / Check Drive    |
| Overview       | status message (calendar result when available) |
| Photos         |                                                 |
| Galleries      | New enquiries                                  3 |
| Bookings       | Name / date / package summary                    |
| Availability*  | [Accept] [Decline]                                |
| Pricing        |                                                 |
| Coupons*       | Active bookings                                5 |
| Print          | Name / awaiting details / session details +      |
|                | [Copy form] [Fill in details] [Replace link]      |
| View site      | ...ready jobs: folder / publish controls         |
| Sign out       | Completed & declined                           8 |
+----------------+-------------------------------------------------+

Phone
+--------------------------------------+
| Studio            Appearance Sign out|
| Overview Photos Galleries Bookings > | horizontally scrollable nav
| Bookings                             |
| Refresh       Check Drive connection |
| Calendar result / errors             |
| New enquiries                    3  |
| name / details / actions wrapping    |
| Active bookings                  5  |
| name / details / actions wrapping    |
| Completed & declined             8  |
+--------------------------------------+
```

`*` Availability and Coupons appear only with BOOKING_OPEN true. Overview shows recent enquiries from the same delivery store, not a legacy-card fallback. Native buttons, labels, calendar days, file picker, and selection controls must work without a mouse. Phone navigation scrolls within its own strip, never the page.

## 6. Simplification and dependency evidence

The accompanying `DESIGN-AUDIT.md` records the exact searches and their matching locations, plus the file/function inventory. Searches are scoped to tracked source/docs/assets where appropriate, excluding work, build output, dependencies, and environment files. A route's existence is not proof of callers: routes with external clients are retained as old-link pages even when internal references disappear.

### Remove whole files or replace their implementation

| File / route | Decision | Search run and result |
|---|---|---|
| `functions/api/notify-booking.js` | Delete its handler and email helpers | `rg -n 'notify-booking' src functions tests supabase HANDOFF.md REDESIGN.md`: only three self-references in that file; no callers |
| `src/pages/thanks.astro` | Delete route, CSS, reference display script | `rg -n '(/thanks|zrp_booking_num)' ...`: only its storage read and an old REDESIGN test note; no writer or live link |
| `public/zr-logo.png`, `public/zr-logo.svg` | Delete both; neither will be used | `rg -n 'zr-logo\.(png|svg)' ...` and repository-wide search: no references. Header remains type; favicon/apple icons/og image retained |
| `functions/api/accept-booking.js` | Delete handler and acceptEmail | `rg -n '/api/accept-booking' src functions tests`: only admin's legacy accept action plus self-description; retire together |
| `functions/api/confirm-booking.js` | Delete handler, confirmEmail, zachEmail | `rg -n '/api/confirm-booking' src functions tests`: only confirm page submit plus self-description; retire together |
| `/confirm` and `/invoice` | Retain URL files; replace all old UI, queries and scripts with the same small OldBookingLink component | `rg -n '/confirm|/invoice' ...`: config comment, Layout noindex, legacy emails/admin, docs, robots. Preserve noindex/robots; update comments/docs; remove old producers |
| `src/lib/delivery-admin.js` | Move retained delivery actions into `src/lib/admin/bookings.js`; delete old file after updating importer | `rg -n 'setupDeliveryAdmin|delivery-admin' src tests`: only admin imports/calls it; internal action handlers stay semantically equivalent |
| `src/lib/gallery.js` | Split viewer behavior and tile construction into shared modules; migrate both importing modules before deleting old file | `rg -n 'gallery.js|makeTile|bindLightbox|openPhoto|photoAlt' src`: home/archive are its public callers; gallery page currently implements its own viewer |
| `src/styles/site.css` | Delete layered global styling and route overrides after scoped replacements land | Search `site.css` resolves only Layout import; affected consumers are inventoried below, not assumed unused |
| `src/styles/delivery.css` | Delete after moving form/gallery styles to their components and bookings styles to its admin component | Import search resolves admin, client-details and client-gallery; keep all three covered |
| Four retained TTFs | Replace by same-family WOFF2 | `rg -n 'fonts/|Bodoni Moda|Public Sans' src` identifies font-face/preload/canvas/watermark uses; update all URLs before deletion |
| Bodoni italic 400 and normal 500 TTFs | Delete rather than convert | Consumers are current heading/em and global font-face styling; new design deliberately uses only upright 400 |

### Remove legacy functions, state, and features

The exact symbol search in the audit covers every occurrence. None is exported to another module; current uses are inside admin or the legacy route itself. Where a generic function name occurs in another page, only the listed owner's implementation is removed.

- **Admin old booking system:** remove `allBookings`, `loadBookings`, `renderBookings`, `renderOvBookings`, `bookingCard`, `isPastBooking`, `todayStr`, `pendingDelete`, `deleteTrigger`, `openDeleteModal`, `closeDeleteModal`, `deletePhraseMatches`, `confirmDeleteBooking`, `acceptBooking`, `setStatus`, and `mailTo`, their window assignments and listeners. Remove legacy record count additions, gallery-load callbacks, and `getLegacy`/`legacyCard`/`refreshLegacy` options. Replace recent bookings with recent enquiries, sourced from the retained workflow. Search: `rg -n '\b(isPastBooking|todayStr|bookingCard|loadBookings|renderBookings|renderOvBookings|openDeleteModal|closeDeleteModal|deletePhraseMatches|confirmDeleteBooking|acceptBooking|setStatus|mailTo)\b' src functions tests`.
- Remove the typed-name delete-booking modal and all legacy accept/cancel/reset/confirmed/delivered buttons, mail link, invoice link, ZTN/reference and deposit fields. These are not part of the Drive status machine. Search: `rg -n 'del-modal|del-summary|del-phrase|booking-num|ztn_number|booking_number|deposit|mailTo' src`.
- **Confirm route:** remove `init`, `loadAddons`, DEFAULT_ADDONS, `chQty`, `togAddon`, `showLine`, `updateCost`, `checkTravel`, show/hide/esc helpers, state/constants, and submit listener. Retire its quantity extras, travel calculation, `next_booking_number`, gallery auto-create, booking mutation and email request as one connected unit. `rg -n 'next_booking_number|checkTravel|chQty|togAddon|DEFAULT_ADDONS|nominatim|project-osrm' src functions tests` proves this path is isolated to that route apart from policy copy being corrected.
- **Invoice route:** remove `loadInvoice`, `showNotFound`, invoice query/render/totals and print button; preserve the route as an old-link notice. `rg -n 'loadInvoice|inv-content|inv-line-items|inv-totals' src` confines the implementation to invoice.
- **Booking grouping:** remove the legacy argument/source loop and delivered/cancelled statuses from `groupBookings`; keep new statuses unchanged. Its consumers are delivery-admin and its three tests. Update only legacy portions of those tests, not expected behavior of retained statuses.
- **Package fallback:** remove DEFAULT_PKGS numeric prices and the unreachable `: DEFAULT_PKGS` branch. Keep its actual features in `package-features.js`, read by home and book. The early return already handles missing/empty data. No hardcoded available packages or prices replace the live catalog.
- **Metadata fallback:** remove admin's second insert and `fallbackErr` branch; on failure report the real save error and retain accurate progress. Remove the title/location SQL-specific branch from `metaColError`; preserve a normal error message for failed edits. Remove the corresponding HANDOFF SQL note. Do not remove original-saving behavior when image resizing fails.
- Remove all admin `window.*` function exports and inline `onclick/onchange/oninput` handlers. The existing shared theme bridge is a different concern: retain its behavior/key, and eliminate only unnecessary UI globals. Do not remove `window` event listeners or native APIs by a text sweep.
- **Optional auth-helper consolidation is declined.** Leave verifySupabaseUser copies and the protected API files byte-for-byte unchanged; the benefit does not justify extra deployment/bundle risk in this redesign.
- **Unused admin leftovers:** delete `fmtBytes` and the unused `calBlocks` state binding. The exact word-boundary search returns only their declarations, so no replacement is needed.

### CSS removal/merge ledger

Each entire current page-global block will be removed, with retained behavior restyled at its new owner. `rg -n '<style is:global>' src/pages` returns exactly these 12 owners:

| Owner | Current block lines | Replacement / deletion scope |
|---|---:|---|
| admin | 358 | Layout/sidebar/tabs → AdminShell; stats → Overview; upload/grid/bulk → Photos; galleries → Galleries; calendar/editor/blocks → Availability; pricing/add-ons → Pricing; coupons → Coupons; canvas → Print. Delete booking-card/badge/number/details/actions and delete-modal families with legacy UI |
| book | 207 | Packages, fields, calendar, estimate, submit and success → Book page/components. Delete entrance animation, check-stroke animation, duplicate package-grid rules and floated Popular badge styling |
| confirm | 127 | Delete summary/quantity/toggle/form/cost/deposit/travel/state/ztn styles; shared old-link notice replaces them |
| invoice | 134 | Delete all inv-* rules and invoice print media block; shared old-link notice replaces them |
| thanks | 66 | Delete entire block with route |
| gallery | 125 | Grid/captions/download/watermark notice → ClientGallery; viewer → shared PhotoViewer. Remove old hover zoom, overlay-only download and competing lightbox rules |
| coupon-card | 16 | Print controls/canvas scoped in page/shared Print component |
| login | 31 | AuthPanel scoped styles; keep login and reset request behavior |
| reset | 18 | Same AuthPanel; keep recovery states and validation |
| privacy | 57 | Shared legal document styles; wording edits isolated later |
| terms | 49 | Same legal document styles |
| 404 | 25 | Scoped empty-state component/page |

For each row, the audit records the complete selector inventory and searches for its class names outside the owning style declaration. Shared class names such as `.page`, `.field`, `.cal-*`, `.no-data`, `.btn` and `.lightbox` are **not** falsely classified as dead; their other owners migrate in the same commit or retain a temporary compatibility rule until migrated.

Global stylesheet ledger:

- `global.css`: move colors/type/space/motion to `tokens.css`; retain a small reset, accessible base elements, hidden/skip-link rules, and reduced-motion reset. Move buttons, form fields, section headings, toast, consent, viewer to their component owners/shared UI rules. Remove nav-logo-img after reference check. Delete old page-in/fade-in/rise-in/scale-in/draw-check keyframes after booking styles migrate.
- `site.css`: replace header/wordmark/theme-picker/footer with Layout components; masthead and cover with Opening; selection/captions/filter/archive with public photo components; about/equipment/contact with scoped home sections; viewer with shared PhotoViewer. Delete **every `.zr-site ...` secondary-route override**, including auth/package/badge/calendar/404/private-viewer overrides, after their owning components provide the final style. Replace all 1800/1100/760/540/360 media blocks with the relevant component's responsive rules.
- Confirmed unreferenced remnants: `.introduction`, `.intro-copy`, `.about-lede`, `.nav-logo-img`, `.legend-dot` markup, `.cal-dot` markup, and page-in/fade-in animation uses. Exact searches are in the audit; `page-in` substring matches `.page-inset`, which is not proof of an animation use and is not deleted as dead.
- `delivery.css`: bookings controls/row/state/message/actions/status/section/history → Bookings/StatusMessage; details-page/grid → ClientDetails; delivery-grid/file → ClientGallery. Remove `.booking-section .booking-card` and `.booking-name` compatibility rules with legacy cards, and `.delivery-section` after its no-consumer check.
- `fonts.css`: retain as the only font-face owner, four WOFF2 declarations with swap. Delete italic and 500 Bodoni faces.
- All 130 authored inline style attributes, including styles embedded in JS-generated HTML, become meaningful classes or native hidden/progress states. Replace `style.cssText`, visibility/color mutations and watermark positioning with class/state rules where practical; native canvas drawing and browser scroll locking are behavior, not an excuse for more inline presentation markup.

### Retained functions move, not disappear

The audit inventories every named function with current file/line and search hits. The following groups remain behind tab-specific event listeners:

| Destination | Existing behavior/functions preserved |
|---|---|
| admin shell/store | auth/session, doLogout, switchTab, loadAll, updateStats, toast, apiAuthHeader; event-driven store updates instead of cross-tab globals |
| photos | loadPhotos, renderPhotos, renderPhotoPager, setPhotoPage, togglePhotoSelect, photoCardClick, editPhotoMeta, bulkSetLocation, toggleSelectAll, updateBulkBar, populateGalDropdowns, photoKeys, delPhoto, bulkChangeSport, bulkAddToGallery, bulkSetPortfolio, bulkDelete, handleFiles, makeVariant, uploadBlob, syncOptimizeButton, optimizeExisting |
| galleries | loadGalleries, renderGalleries, toggleWatermark, createGallery, deleteGallery, copyLink; photo counts/dropdowns refreshed from shared photo/gallery data |
| bookings | setupDeliveryAdmin's session/act/show/load/render, all button actions, focus refresh and grouping; no legacy adapters |
| availability | toggleBulkMode, updateCalBulkBar, applyBulk, loadBlocks, renderCalendar, shiftMonth, openEditor, setBlockType, saveBlock, deleteBlock, closeEditor |
| pricing | loadPricing, renderPricing, STARTER_ADDONS, addAddon, seedAddons, deleteAddon, toggleSale, savePkg, toggleAvail |
| coupons | loadCoupons, onCouponTypeChange, createCoupon, renderCoupons, toggleCoupon, deleteCoupon, copyCouponLink |
| print | renderEnv, downloadEnv; shared canvas/font readiness utilities with coupon-card |

Use one Supabase client and one simple shared store for admin; no generic framework, dependency-injection library, custom event bus hierarchy, or new persistence. Native DOM events and explicit module callbacks are enough. Reuse pure date/format helpers only when both callers need the exact same rules; keep booking calendar and editable admin calendar controllers separate.

## 7. Proposed source structure and size budget

```text
src/
  config.js                         existing switch and CTA contract
  layouts/Layout.astro              document, metadata, theme bootstrap
  components/
    SiteHeader.astro  SiteFooter.astro  Appearance.astro
    Button.astro  FormField.astro  SectionHeading.astro  StatusMessage.astro
    PhotoTile.astro  PhotoViewer.astro  ClientGallery.astro
    Opening.astro  BookingForm.astro  AuthPanel.astro  OldBookingLink.astro
    admin/
      AdminShell.astro  Overview.astro  Photos.astro  Galleries.astro
      Bookings.astro  Availability.astro  Pricing.astro  Coupons.astro  Print.astro
  lib/
    home.js  archive.js  portfolio.js
    photo-tile.js  photo-viewer.js     shared DOM construction/modal behavior
    book.js  package-features.js       existing decisions/math + shared features
    client-details.js  client-gallery.js  website-gallery.js
    delivery-api.js                    unchanged
    booking-groups.js                  retained, delivery statuses only
    print.js                          only genuinely shared canvas helpers
    admin/
      index.js  store.js
      overview.js  photos.js  galleries.js  bookings.js
      availability.js  pricing.js  coupons.js  print.js
  styles/
    tokens.css  fonts.css  global.css  ui.css
  pages/
    index  portfolio  book  quick-book  admin
    client-details  client-gallery  gallery
    confirm  invoice                   thin wrappers for same old-link component
    login  reset  coupon-card  privacy  terms  404
```

Component extraction is selective: no wrapper whose only purpose is moving five lines. PhotoTile's browser-created elements and Astro markup share class/DOM contracts so the shared styling works for dynamically loaded content. Scoped rules must intentionally cover those created descendants; do not rely on Astro scope attributes magically appearing on JS-created nodes.

| Metric | Actual before | Actual after Phase 1 | Implementation target, not yet measured |
|---|---:|---:|---:|
| admin.astro | 1,877 lines | 1,877 lines | 60–100 lines |
| Total src | 5,677 lines | 5,677 lines | 4,300–4,500 lines |
| Total src bytes | 288,785 | 288,785 | at most 235,000 |
| Admin onclick attributes | 59 | 59 | 0 |
| Inline style attributes | 130 | 130 | 0 |
| Page-global style blocks | 12 | 12 | 0 |
| Built pages | 17 | 17 | 16 after deleting thanks; confirm/invoice remain |

The final report must measure actual source and all admin modules together, not celebrate a tiny shell hiding a larger application. Do not compress readable code or omit error handling to hit a line-count target.

## 8. Calendar feature: boundary and unresolved edge

Only core.js and index.ts gain backend behavior, through optional `calendar` injection. Keep the existing migration, environment names, Store and Drive behavior, request validation, tokens, locks, retry responses, and publication rules unchanged. Existing tests without a calendar must still pass unmodified.

Proposed hooks:

1. Accept: inspect the actual returned conditional-patch rows; only a successful state change may block a strict real preferred_date. Resolve today in America/New_York. Free-text dates return no_date; past dates skipped.
2. Finalize: after details/processing are durably claimed and before generateId/ensureFolder, sync the agreed date. A Drive error cannot bypass calendar work. Repeated calls must not add another block.
3. Decline: after the successful conditional patch, remove only this enquiry's own block, never arbitrary rows on that day.
4. Every calendar operation is independently caught and logged without private details. Admin responses may include `{calendar:{status,date}}`; public completion response shape remains exactly unchanged. Old frontend/new backend and new frontend/old backend both work.
5. Only `Booked (ref XXXXXXXX)` goes in the public note. Deletion filters include **both date and exact note**, preferably id too; never delete all rows on a date. Changing dates removes only the verified former own row. Existing full-day blocks from Zachary are preserved and reported.
6. Admin feedback uses the brief's exact patterns, with month/day formatted consistently. Missing calendar field keeps the current success message. “Fill in details” gets the same admin-only calendar result; client receipts do not expose it.

**One requirement cannot be promised from the current data contract:** after Zachary clears a day, an empty availability table is indistinguishable from “never blocked” or “calendar write failed.” There is no owner-override history to tell a later completion that his clear must win forever. Likewise, a plain check-then-insert cannot guarantee uniqueness across independent workers. Sequential retry tests alone would not prove that guarantee.

Before implementing this portion, confirm the existing availability primary-key type from an authorized schema description or fixture. If its existing id accepts a deterministic per-enquiry/date value, use that existing primary key for retry idempotency without a migration; do not assume it does. Exercise interleaved accept/finalize, not only two identical sequential calls. If the constraints cannot support strict guarantees, stop this feature and present the exact remaining limitation rather than silently alter schema or other delivery behavior.

Suggested decision for Jaxson: explicit available/partial rows can express an override; decide whether a completely cleared day may be blocked again when final details are saved. The brief currently says manual changes always win, so **no relaxation is assumed**. The visual redesign can be approved independently while that edge is resolved.

## 9. Contract and questions to preserve

- Keep all protected API files and delivery-api.js unchanged. Only the three approved legacy API deletions are planned in functions; no optional auth-helper extraction.
- No schema/policy/RPC/table edits or data cleanup. Website photos, all three R2 variants, ordinary client galleries and watermark behavior remain. A user-requested photo deletion removes variants and row; gallery deletion unlinks photos and keeps files.
- Public home/portfolio only query portfolio rows with on_portfolio=true and the specified columns. **Source conflict:** gallery.js currently falls back to `url`, which is the original, while section 5 forbids loading originals on public pages. Plan follows the stricter prohibition: use web/thumb alternatives or a clear preview-unavailable state, never original. Client downloads are unchanged. This needs explicit visibility in review because it changes old unoptimized-photo fallback behavior.
- `/gallery` keeps its existing slug-based client_galleries/portfolio lookup. The “public pages read only…” list is interpreted as the public portfolio/booking surface, not an instruction to break this explicitly preserved client route.
- Drive preview/file `<a>` and `<img>` URLs currently use same-origin GET endpoints with the token for those media requests. Preserve those endpoints; the **page link** stays hash-based. Never copy a gallery token into the page's query string or logs.
- Drive file metadata currently contains no image dimensions. Reserve a compact preview frame and contain the image without upscaling its intrinsic pixels; use explicit display dimensions for the frame, not invented original dimensions. Keep the existing preview link and original download behavior. Do not change the Drive backend to obtain larger thumbnails or extra metadata.
- Keep all listed payload fields, timeouts, honeypots, elapsed checks, UUID lifecycle, booking success wording, coupon rules, order of decisions, and live price/add-on catalog behavior. Shared package features include no fallback prices.
- BOOKING_OPEN true and false are build/test gates. Get in touch and redirects remain correct when false; process copy adapts, while accepted client links remain accessible.
- Three booking steps describe requests and acceptance, not instant confirmation. Delivery copy says “typically within 5–7 days of your session.”
- Keep existing metadata, noindex, no-referrer, anchors, URL query/hash contracts, robots, storage keys, reset flow, consent and footer links. Remove confirm only from consent-bar matching.
- No new libraries, third-party page requests, analytics, tracking or persistence keys. Retain self-hosted licensed fonts. Native cross-document transitions only, no ClientRouter.
- No claim of “functionally perfect” from a build. Verification distinguishes mocked coverage from real credentials/services.

### Privacy / Terms proposals — not edits or new business policies

| Existing wording | Proposed narrow factual correction |
|---|---|
| “Package and add-on selections — to put together your invoice” | “Package and add-on selections — to prepare your session estimate.” |
| “four small things” | “three small things”; remove the unused booking-number storage item only |
| Nominatim & OSRM travel-check entry | Remove with retired confirm calculator |
| “You'll get an email once it's accepted, with a link to finalize the details.” | “If I accept your request, I'll contact you and share a private link to confirm the session details, or enter the details we've agreed on.” |
| “The price you see at booking ... plus any add-ons or travel fee you choose at confirmation.” | “The booking form shows an estimate for your package and selected add-ons, including any promo code. Travel is quoted separately. I'll confirm the final price with you.” |

The existing 50% deposit and cancellation terms are business policies. Retiring deposit calculations/UI does **not** authorize changing these clauses; section 7's limited corrections take priority over a blanket text deletion of “deposit.” Flag this for Zachary's review, leave the policies intact unless he explicitly changes them.

For both 90-day gallery statements, let Zachary select a policy before changing them:

1. “Your gallery stays available until you ask me to remove it. Download a copy of your photographs for your own records.”
2. “Your gallery has no scheduled removal date. Please download a copy; contact me if you would like the gallery removed.”
3. “I'll tell you before taking your gallery offline. Please download a copy of your photographs.”

These are alternatives to approve, not facts asserted by this plan. Current effective dates are **Privacy: July 30, 2026; Terms: July 2026**. Leave them unchanged during the work and ask Zachary what effective dates he wants before merge. The factual-copy commit must include an exact before/after report.

## 10. Implementation commits and verification plan

After approval, preserve the requested eight commits, each building and passing the applicable tests:

1. Approved removals and legacy retirement. Put the minimal shared old-link notice in place now so old URLs never break; visual refinement comes in commit 4. Keep package features and metadata saves working.
2. Foundation: tokens, fonts, Layout, components. Migrate shared roles with narrow temporary compatibility rules where necessary; remove each as its owner migrates. Final state has no compatibility stylesheet.
3. Public pages: opening, statement, selection, portfolio, same booking decisions/form behavior.
4. Client pages, viewer presentation, old-link notice refinement, small operational pages/print-card style as applicable.
5. Admin rebuild: one module per tab, no legacy queries/globals/inline handlers.
6. Calendar feature and new tests, only after the constraints above are resolved; admin messages included.
7. Owner's guide and short verified redesign summary.
8. Only the approved Privacy/Terms factual corrections and chosen retention wording, separately reviewable.

All commits/pushes remain on redesign-v4. Do not merge or push master. Do not deploy Supabase in this task; document the existing deploy command and need to redeploy for calendar behavior to begin.

Testing will use synthetic fixtures and intercepted/local test responses, with no real email, booking, Drive folder, upload or delete mutations. Keep production credentials out of fixtures and reports. A browser-capability limitation is a reported limitation, not permission to test destructive paths against production.

Acceptance checks:

- Build with BOOKING_OPEN true and false; restore its original true setting afterward. Remaining baseline tests stay unchanged except the permitted legacy grouping assertions. Add calendar coverage, including no-calendar compatibility and public-response privacy. Report actual final count; do not predetermine it.
- Test 320, 390, 768, 1024, 1440, both themes and reduced motion. Test live OS theme changes, manual override, storage unavailable, no wrong-theme flash, and 44px targets. A full keyboard pass includes hero/viewer/focus return, filters, calendar, forms, admin navigation and file selection.
- Public: loading/empty/service error/broken image, >24 photos, filters/history, contact success/error/retry, each coupon type/expired/invalid/max-use, coupon prefill, partial/unavailable dates, booking success/server error and unchanged request payloads.
- Clients: token/id mode, expired/unavailable states, details completion and calendar admin feedback, Drive files/empty/error, original download, R2 gallery photos/watermark/empty/not found/download all, old confirm/invoice links.
- Admin: exercise every retained function group in section 6 against simulated responses, assert request bodies, all three upload variants and resize failure, paging/selection/bulk actions, original-file deletion set, gallery unlinking, every delivery action, calendar day/bulk edits, pricing/starter add-ons, coupon actions, envelope/card export and fonts. Check false-success/error states and confirmations, particularly on a 390px screen.
- Capture and inspect 24 screenshots: home, portfolio, book, client-gallery, gallery, admin × 390/1440 × light/dark. Record zero uncaught errors only for actually exercised scenarios.
- Lighthouse on mocked home/portfolio: target mobile P90+/A100/BP100/SEO100. No new repo dependencies to obtain a score; if the available browser/tooling cannot run Lighthouse, report “not measured” and ask about tooling rather than invent results or silently install a project package.
- Diff protected paths against d14963b. Search for legacy queries/endpoints, inline style attributes/page-global blocks, handler globals, extra storage keys, third-party resource requests, and accidental original URL usage. Recalculate file/line/byte counts in the final report.

## 11. Self-review: remove the template defaults

| Tempting default | Decision |
|---|---|
| Huge text above a rectangular photo | Photo fills the first screen; name belongs to the photograph |
| Overlaid slogan/subheadline/button stack | Only name and real location; small controls sit at the bottom edge |
| Italic final word in every heading | Upright headings throughout |
| All-caps section eyebrows and 01/02/03 | Remove them; numbers remain only for actual booking steps and photo position |
| Three equal service cards | One plain ordered booking list; no icons or cards |
| Artificial portrait crops for a masonry effect | Actual image proportions; purposeful unequal widths |
| Generic dark mode with neon accent | Existing neutral charcoal, soft text; only meaningful state colors |
| Sticky CTA floating over everything | One compact bar with measured exclusions for notice/form/footer/focus |
| A dramatic scroll reveal | One short initial fade; content is never hidden waiting for scroll |
| A “premium” client page stretching tiny previews | Small honest previews and plainly labeled original downloads |
| Admin redesigned as a gallery of cards | Compact navigation, rows, native forms, counts and direct actions |
| A new component for every div | Extract only shared behavior or a real tab/section owner |
| “Less code” measured only in admin.astro | Measure all src and the combined admin implementation, keep readable formatting |

## 12. What this phase has and has not verified

Verified: baseline install/build/test, full source read, dependency/reference searches, actual source size, proposed token contrast math. Only planning documents were added.

Not yet implemented or verified: v4 rendering, responsive/accessibility coverage, real Lighthouse scores, all mocked UI actions, font conversion, calendar writes/idempotency, production email/Drive/calendar, and policy decisions. The four known issues stay out of scope: small Drive previews; coupon usage not incrementing; browser-side watermarking leaves originals reachable; R2 gallery metadata access needs a separate database/security change. Do not delete data or change schema to address them here.

**Approval gate:** the supplied brief says, “Then stop and wait for my go-ahead. Don't build until I reply.” This document and its audit are the reviewable Phase 1 result. Await that go-ahead before implementation. Calendar override/uniqueness and gallery-retention choices remain explicit decisions, not silently assumed approvals.
