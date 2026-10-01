# ZR Photos v4

Implemented on `redesign-v4`, based on the approved design plan. No master merge/push, database mutation, schema change, or Supabase deployment was performed.

## Design

A full-screen real photograph opens the site. Bodoni Moda and Public Sans, self-hosted as licensed WOFF2, sit on neutral near-white/charcoal themes. Uneven photograph sizes, plain captions, and text category filters replace boxed sections. Quiet fades respect reduced motion. System/Light/Dark applies to public pages, private galleries, and Studio.

## Simplification

Removed the unused notification route, obsolete thank-you page, unused logo assets, unreachable package fallback, and legacy booking acceptance/confirmation handlers. The old confirmation/invoice URLs now share one explanatory page; archived database rows and existing R2 galleries are untouched. Removed old booking queries/cards and the obsolete title/location insert fallback. Admin is a 30-line shell with separate tab components/modules. Shared package features, form fields, viewer, buttons, statuses, theme tokens, and CSS replace repeated markup and overrides.

The source shrank from 5,677 lines / 288,785 bytes to approximately 3,567 lines / 215,005 bytes before the separate factual legal corrections. Combined admin files, including styles and delivery UI, are 1,399 lines; the old single page alone was 1,877.

## Calendar

The optional Calendar service blocks accepted exact dates and agreed session dates before Drive work, reconciles date changes, and removes owned blocks on decline. Stable enquiry UUIDs prevent duplicate retry inserts. Date plus exact anonymous note/status predicates protect manual edits. Explicit Available/Partial entries win; a cleared date may be blocked again when final details save, as approved. Failures do not fail the main action. Only admin responses include calendar results. Old/new deployment order remains compatible.

## Verification

Baseline: 17 pages and 36 tests. Final implementation: 16 pages (obsolete `/thanks` removed), 54 passing tests. Builds pass with booking on/off; protected API, migration, workflow, dependency, and existing non-legacy test files are unchanged. Original-download byte preservation remains covered by the existing tests.

Local mock browser checks covered phone booking submission with the correct payload and discounted estimate, calendar disabled/partial days, query coupon prefill, photo selection/bulk edits, acceptance moving an enquiry into Active with its calendar message, and Drive connection status. Screenshots were captured for home, Portfolio, booking, both client galleries, and Studio in light/dark at 390/1440. Chrome additionally verified Portfolio pagination, category/Back behavior, viewer arrows/Escape, and focus return. Responsive DOM checks found no horizontal overflow across 15 routes, both themes, and all five requested widths (150 combinations). Browser confirmation controls then stalled, preventing completion of the full interaction checklist. The final report distinguishes source inspection from executed browser checks; do not interpret this document as full end-to-end certification.

Lighthouse scores were not measured: the tool is not installed. A complete keyboard-only pass, live OS appearance changes, reduced-motion emulation, all admin writes, and every simulated error state are not fully verified. Real emails, real Drive actions, and production calendar writes were deliberately not exercised. The updated Supabase function is not deployed; the owner command is in HANDOFF.md.

Known issues remain: small Drive previews, coupon uses not incremented, browser watermarking leaves originals reachable, and public-key website-gallery metadata access. No dependency was added. Optional authentication-helper consolidation was left alone because a Cloudflare function bundle was not validated.

## Policies

A separate commit makes only the requested factual Privacy/Terms corrections, including galleries available until the client requests removal. Existing effective dates and deposit/cancellation/business terms are unchanged for Zachary’s review.
