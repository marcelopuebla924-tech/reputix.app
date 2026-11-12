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
- GitHub Actions Browser QA run #368 completed successfully on 12 Nov 2026 (run ID `43272897516`). All 34 Playwright checks passed, including approved deep-link rendering, share payload, and unavailable/unapproved profile privacy. The run reported `pageErrors: []`.
- Earlier run #367 failed; its findings were corrected in commits `e783a74624f342bd7c1c2c1c5324c7ffa5cacd05` and `1c89e8881b6910f2c44c5df2fbcb1d97df5fbf29`.
- The current app is a client-rendered GitHub Pages app. Metadata is populated by JavaScript after the profile record loads. Search engines that render JavaScript may process it, but this is not equivalent to server-side rendered business pages. Social crawlers that do not execute JavaScript may only see the homepage's default share preview.
- A future pre-rendering/SSR solution should generate crawlable HTML per approved business before claiming full search/social preview optimization.

## Data and security
- No production database, Supabase policies, user data, businesses, reviews, photos, Auth, secrets, Storage, Stripe, DNS, or domain settings changed.
- Direct public lookup is limited to approved businesses. No pending proposals, private owner data, private messages, or verification documents are added to public metadata.
- No ratings or review counts are fabricated or embedded in structured data.

## Next steps
1. Review the successful QA run and verify a real approved business deep link in a browser before release.
2. Implement static pre-rendering for approved business pages so search and social crawlers receive profile metadata in the initial HTML.
3. Generate a business-profile sitemap from approved records only, excluding pending, rejected, and private data.
4. Verify the GitHub Pages deployment pipeline without changing the custom domain or DNS configuration.


## Psychology / mental-health professional category
**Date/time:** 12 November 2026, 9:53 a.m. PST (America/Los_Angeles)

- Added the professional category "Psicólogo/a o centro de salud mental" in Spanish and "Psychologist / mental health center" in English.
- Added a category-aware review privacy notice in Spanish and English. It asks users to discuss only general service experience and not publish diagnoses, treatments, medications, patient names, contact details, identifying information, or clinical outcomes.
- The notice explicitly clarifies that Reputix does not replace professional care or emergency services.
- Added Browser QA coverage for the category in both languages and for the privacy notice on a psychology professional profile.
- Existing review database fields and policies were not changed. This is a category and user-guidance update only; it does not imply clinical verification, professional licensing validation, or medical advice.
- Validation is pending the GitHub Actions run triggered by these commits.


---

## Director checkpoint — 12 November 2026, 9:54:46 a.m. PST (America/Los_Angeles)

### Work completed in this session
- Expanded professional categories with psychology / mental-health services in Spanish and English.
- Added a category-specific review privacy notice in both languages. It focuses on general service experience and warns against publishing diagnoses, treatment, medications, patient names, contact details, identifying details, or clinical outcomes. It clarifies that Reputix does not replace professional care or emergency services.
- Added browser QA coverage for both language labels and the psychology privacy notice.
- Corrected the category matcher to recognize the accented Spanish spelling (psicólogo/psicóloga).
- Updated PR #14 title and description to include the new category and safeguards.

### Exact repository state
- Repository: `marcelopuebla924-tech/reputix.app`
- Branch: `feature/organic-public-business-profiles`
- Latest branch commit at checkpoint: `6ef21b4143b5e333a9754d8714db837bbf56a67e`
- Main branch remains at the earlier base commit `2a214bce6bf78b5f85b46f593efe44205831f8cf`; this feature has NOT been merged or published.
- PR #14: https://github.com/marcelopuebla924-tech/reputix.app/pull/14
- PR is open and GitHub reported it mergeable at the last check.
- PR diff: 3 files changed, 282 additions, 7 deletions.
- Latest Browser QA run: #373, run ID `43274223713`, status `in_progress` at checkpoint. The browser-smoke job was installing Playwright; the test step had not started yet.
- Previous run #368 passed 34/34 checks, but that run predates the newly added psychology category tests and does NOT validate this latest commit.
- Combined commit status endpoint returned no status entries at checkpoint; this is not evidence of a pass.

### Release and safety status
- Do not merge or claim production release until run #373 completes successfully and its results are inspected.
- No production Supabase schema/data/policies, users, accounts, reviews, business records, photos, secrets, Storage, Stripe, domain, or DNS settings were changed.
- Category addition does not verify professional licensing or credentials and must not be represented as clinical endorsement.
- Public profile metadata is still client-rendered; full static HTML prerendering and approved-only profile sitemap remain future work.
- Next action: recheck run #373, inspect any failures, fix on this feature branch, rerun QA, then reassess integration readiness. Preserve main and existing user data.
