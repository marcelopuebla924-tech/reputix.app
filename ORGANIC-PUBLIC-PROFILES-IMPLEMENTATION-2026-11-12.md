# Reputix — Public business profiles implementation
**Date/time:** 12 November 2026, 9:30 a.m. PST (America/Los_Angeles)

## Goal
Allow customers to open and share a direct public link to an approved business profile, creating a practical foundation for organic discovery.

## Implementation on feature branch
- Added stable query-based public links using the business ID: `/?business=<approved-business-id>`.
- Direct-link loading queries only `status=approved`; missing/unapproved profiles are not rendered and receive `noindex,nofollow`.
- Added business-specific document title, description, canonical URL, Open Graph/Twitter metadata, and Schema.org LocalBusiness JSON-LD at runtime.
- Added a bilingual Share button to business cards. It uses the native share sheet when available and falls back to clipboard or a copy prompt.
- Added two Playwright checks: approved direct profile + SEO/share behavior; unavailable/unapproved ID is not rendered and is noindex.

## Validation status
- Source changes are committed to `feature/organic-public-business-profiles`.
- Browser checks are added but have not yet run in GitHub Actions. A pull request will trigger the repository's PR QA workflow.
- The current app is a client-rendered GitHub Pages app. Metadata is populated by JavaScript after the profile record loads. Search engines that render JavaScript may process it, but this is not equivalent to server-side rendered business pages. Social crawlers that do not execute JavaScript may only see the homepage's default share preview.
- A future pre-rendering/SSR solution should generate crawlable HTML per approved business before claiming full search/social preview optimization.

## Data and security
- No production database, Supabase policies, user data, businesses, reviews, photos, Auth, secrets, Storage, Stripe, DNS, or domain settings changed.
- Direct public lookup is limited to approved businesses. No pending proposals, private owner data, private messages, or verification documents are added to public metadata.
- No ratings or review counts are fabricated or embedded in structured data.

## Next steps
1. Run Browser QA on the pull request and fix any failures.
2. Verify GitHub Pages deployment behavior before merging.
3. Confirm a real approved business deep link in a browser and inspect its metadata.
4. Plan static pre-rendering for approved business pages and a business-profile sitemap only after the URL and rendering architecture is finalized.
