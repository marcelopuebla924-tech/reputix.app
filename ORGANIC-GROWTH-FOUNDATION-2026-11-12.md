# Reputix — Organic discovery foundation
**Date/time:** 12 November 2026, 9:30 a.m. PST (America/Los_Angeles)

## Strategic objective
Build Reputix so people discover and return to it because it helps them make better real-world decisions—not because the team must continually promote it.

## Work completed
- Added a canonical homepage URL for the established custom domain.
- Added index/follow robots metadata.
- Added Open Graph and Twitter share-preview metadata.
- Added minimal Schema.org WebSite structured data describing Reputix.
- Added `robots.txt` with a sitemap declaration.
- Added `sitemap.xml` containing the canonical homepage plus five approved static business profile URLs.
- Added stable `/business/<uuid>/` public profile routes with pre-rendered HTML, business-specific title/canonical/Open Graph/Twitter metadata, LocalBusiness structured data, and no-script fallback.
- Added a scheduled/manual approved-only profile publishing workflow using the public publishable key and a strict field allowlist. Generated candidate snapshots are reviewed through a separate PR before publication.
- Synced the accessible Spanish search label to all five generated profile pages and added a bilingual regression test for those routes.

## Why the sitemap is intentionally limited
The sitemap now includes only the canonical homepage and five static profiles generated from records whose database status is `approved`. The export is restricted to public fields: business ID, name, category, address, city, and status. Business descriptions/comments, owner emails, private notes, billing identifiers, reviews, and pending/rejected records are excluded. Do not broaden the field allowlist or include a profile unless its approval state is verified.

## Publication and revocation controls
- The publishing workflow runs on a six-hour schedule and can be manually dispatched.
- It fetches the approved public snapshot with the publishable key, generates static pages and sitemap, runs Node safeguards and the browser regression suite, and pushes a candidate branch.
- A separate reviewed PR must be created and merged to publish the candidate snapshot; the workflow does not write generated business content directly to `main`.
- A revoked/unapproved business remains in the currently published static snapshot until the next candidate is reviewed and merged. Prioritize a removal PR when approval is withdrawn.
- The five currently published profile pages are a snapshot, not a promise that every business is indexed by Google.

## Next organic-growth priorities
1. Verify the live homepage and all five direct profile URLs in a normal browser; check canonical tags, initial HTML metadata, and share previews.
2. Submit `https://www.reputixapp.com/sitemap.xml` in Google Search Console and monitor crawl/index coverage. Do not promise immediate indexing or traffic.
3. Build useful category/city landing pages only when there is enough approved public data to make each page genuinely helpful; avoid thin or duplicate pages.
4. Add review-safe share cards and clear calls to action while preserving the business-specific canonical profile URL.
5. Instrument privacy-conscious acquisition and retention metrics: organic landing visits, searches, useful profile views, review submissions, return visits, and business-owner claims. Avoid collecting sensitive review content for analytics.
6. Preserve review integrity: no paid ranking, purchased ratings, fake reviews, or ads disguised as organic results.

## Safety and scope
- No production database, Supabase policies, Auth settings, secrets, Storage, Stripe, domain/DNS settings, or user data changed.
- No business data or review records were modified.
- This is a technical SEO foundation, not a claim that Google has indexed the site or that organic traffic has increased.
- Browser QA and Pages deployment for the new commit must be checked before calling this release verified.
