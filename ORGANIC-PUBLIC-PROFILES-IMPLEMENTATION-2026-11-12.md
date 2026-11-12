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


---

## Director checkpoint — 12 November 2026, 9:56:57 a.m. PST (America/Los_Angeles)

### Integration completed
- Browser QA run #373 (run ID `43274223713`) completed successfully. The `browser-smoke` job and all its steps finished with conclusion `success`, including the Playwright test step.
- PR #14 was merged successfully into `main` using squash merge.
- PR: https://github.com/marcelopuebla924-tech/reputix.app/pull/14
- Merge commit: `8a84afebfdadaf7fe57a80a5acb9ff1c2ee08e15`
- GitHub reports PR #14 as closed and merged.
- The main-branch `app.js` was fetched after merge and verified to contain both `loadPublicBusinessFromUrl` and the bilingual psychology category strings.
- The repository's `CNAME` file still contains `www.reputixapp.com`; it was not changed.

### Release verification
- The code is integrated into `main`.
- A fresh GitHub Pages deployment for this merge commit has NOT yet been independently verified. Do not claim the public site is updated until the deployment run and live behavior are checked.
- The existing client-rendered metadata limitation remains: social crawlers that do not execute JavaScript may not receive business-specific previews from the initial HTML.

### Safety
- No production Supabase schema, policies, user accounts, reviews, business records, photos, secrets, Storage, Stripe settings, custom domain, or DNS settings were changed.
- Approved-only direct business lookup and the psychology review privacy notice are now in the main-branch source.
- No professional license verification or clinical endorsement is implied.

### Next director actions
1. Verify the Pages deployment associated with merge commit `8a84afebfdadaf7fe57a80a5acb9ff1c2ee08e15`.
2. Verify the live homepage and a real approved business profile link without exposing unapproved records.
3. Plan static pre-rendering and an approved-only profile sitemap so crawlers receive business-specific HTML.
4. Continue regression QA for the rest of the user-facing flows; preserve existing data and the protected production settings.


---

## Director checkpoint — 12 November 2026, 10:11:31 a.m. PST (America/Los_Angeles)

### Verified integration and deployment
- PR #15 (https://github.com/marcelopuebla924-tech/reputix.app/pull/15) was merged via squash into main. Merge commit: `5ee6ea60c3cc8f1e5fc3fc3ecff5dedbf3daca0f`.
- Fixed public business profile metadata whitespace normalization from a literal backslash regex to `/\\s+/g`, with a browser regression assertion for repeated spaces.
- PR Browser QA run #377 (ID `43276040845`) passed, including the new regression.
- Main branch Browser QA run #378 (ID `43276375970`) completed successfully. The browser-smoke job and all steps passed; log output reports `pageErrors: []`. Mocked account, owner, moderation, business-profile, and map checks are not proof of live production backend behavior.
- GitHub Pages run #610 (ID `43276375716`) successfully completed build and deployment jobs for commit `5ee6ea60c3cc8f1e5fc3fc3ecff5dedbf3daca0f`.
- The custom domain in CNAME remains `www.reputixapp.com`. The actual public domain and a real approved business profile have not yet been independently browser-verified in this session.

### Search indexing architecture and constraints
- The current deployment uses GitHub Pages with Jekyll build; `sitemap.xml` lists the homepage only.
- Current `/?business=<id>` business pages are rendered client-side. The initial HTML does not include business-specific metadata; this limits social previews and crawling.
- Do not put pending/rejected businesses or private owner/patient/review information in a static build or sitemap. A generated approved-only sitemap needs a verified public-data source, schema and publication policy, safe escaping, and a repeatable build process before deployment.
- No automated database export or privileged key should be added to public GitHub Actions without a separately reviewed security design.

### Safety and next actions
- No production Supabase schema/data/policies, accounts, reviews, businesses, photos, secrets, Stripe, DNS or custom-domain settings changed.
- Next: verify public homepage and approved profile externally, then design and test an approved-only static profile publishing pipeline before exposing any live records in generated HTML.

---

## Director checkpoint — 12 November 2026, 10:37:42 a.m. PST (America/Los_Angeles)

### Static approved-profile publishing delivered
- PR #16 merged the approved-only static profile generator, /business/<uuid>/ app route support, and synthetic privacy/escaping tests.
- PR #17 merged the public Supabase export and publishing workflow. It reads only `id,name,category,address,city,status` from `businesses`, filtered by `status=approved`, using the app's `sb_publishable_` key in the `apikey` header only. It does not use a service-role key, privileged token, or new secret.
- PR #18 removed `businesses.description` from SEO metadata, static LocalBusiness JSON-LD, and no-script fallback because the live values' provenance was not verified as official business copy. Metadata now uses category and city only.
- PR #18 also removed unnecessary `pull-requests: write` workflow permission. The repository setting that allows GitHub Actions to create PRs remains unchanged. The scheduled workflow pushes a tested candidate branch; the Director creates a separate review PR before publication.
- The publishing workflow runs every six hours and supports manual dispatch. It runs 9 Node unit tests and the 37-check Playwright browser suite before updating the candidate branch.

### First live approved snapshot published
- The public Supabase export returned 5 approved businesses. The generator created exactly 5 static profile pages and a sitemap containing the homepage plus those 5 profile URLs.
- All 5 generated files were inspected. They contain public business name, category, address/city, canonical URL, Open Graph/Twitter metadata, LocalBusiness JSON-LD, and a no-script fallback. No owner email, internal notes, billing identifiers, review/comment text, or non-allowlisted fields were found.
- PR #19 (https://github.com/marcelopuebla924-tech/reputix.app/pull/19) merged successfully into main.
- Merge commit: `49b6a12d9a58cc56bf40fca380da793e879799c2`.
- Main-branch browser QA run `43281566967` passed: all 9 Node unit tests, all 37 Playwright checks, and `pageErrors: []`.
- GitHub Pages run `43281565636` completed its build and deploy jobs successfully for the profile-page commit.
- Main now contains 5 `business/<uuid>/index.html` profile pages. `sitemap.xml` lists the homepage and all 5 pages. `robots.txt` still points to that sitemap.
- `CNAME` remains `www.reputixapp.com`.

### Publication and revocation controls
- New approvals and revocations are detected by the six-hour workflow. The workflow updates the candidate branch only after successful fetch, generation, unit tests, and browser QA.
- A Director review PR must still be created and merged to publish each candidate snapshot. The repository setting allowing Actions to create PRs was not enabled.
- Because static files are snapshots, a revoked business page remains in the current published snapshot until the next candidate update is reviewed and merged. Prioritize removal PRs when an approval is withdrawn.

### Release verification and remaining caution
- GitHub Pages reports successful build and deployment for the merged profile snapshot.
- Direct retrieval of the custom domain through the external browsing tool was unavailable in this session; therefore the public HTTP response and social preview cache were not independently confirmed. Do not claim those external checks passed.
- No production Supabase schema/data/policies, user accounts, reviews, photos, service-role secrets, Stripe settings, custom domain, or DNS records were changed.
- No business descriptions, ratings, review counts, or unverified professional credentials are fabricated or promoted in static metadata.

### Next director actions
1. Verify the public homepage and all five direct profile URLs from a normal browser or Google Search Console when available.
2. Submit `https://www.reputixapp.com/sitemap.xml` in Google Search Console and monitor indexing; do not promise immediate indexing.
3. On each scheduled candidate update, inspect the generated branch and create a review PR; prioritize removals for any newly unapproved business.
4. Continue broader regression and accessibility checks without changing protected production settings.

## Director checkpoint — 12 Nov 2026, 10:52:50 a.m. PST

### PR #20 — public-control accessibility audit and search-field fix
- PR #20 (https://github.com/marcelopuebla924-tech/reputix.app/pull/20) merged successfully by squash.
- Merge commit: `bdcfa05ae9724b7b4d54aa5756713786c7199560`.
- Added two browser checks auditing accessible names and form labels on visible controls in the homepage and standalone map.
- The new audit identified the homepage business-search input as missing an explicit accessible name. Added a Spanish `aria-label` in the HTML and language-aware Spanish/English updates in `app.js`.
- Extended the language-selector regression test to assert both accessible-name variants.
- Initial CI correctly failed on the missing label; after the fix, workflow run `43283910347` passed.
- Final browser results: 39 Playwright checks passed, 0 failed, and `pageErrors: []`.
- Node safeguards: all 9 tests passed, 0 failed.
- The map accessible-name audit passed on the first run; the homepage search accessible-name audit passed after the fix.
- Change is limited to accessibility metadata and test coverage. No search behavior, production data, user accounts, reviews, photos, Supabase schema/policies, Stripe settings, custom domain, or DNS settings changed.

### Approved-profile candidate branch review
- Compared `automation/approved-public-profiles` with the newly updated `main` after PR #20.
- The branch is currently diverged and behind main by 3 commits; its diff includes the old generated profile snapshot.
- Do not merge that stale candidate snapshot. Wait for the next scheduled publishing workflow to rebuild the candidate from current main, then inspect the diff before creating a review PR.
- The scheduled workflow's six-hour cadence remains unchanged. Actions PR creation permissions were not changed.

### Remaining release cautions
- The successful PR-triggered browser QA is confirmed; a separate main-branch Pages deployment after PR #20 was not independently confirmed in this checkpoint.
- Direct public HTTP response and social preview cache for the custom domain remain unverified from this environment.
- Continue to preserve all protected production settings and data.


## Director checkpoint — 12 Nov 2026, 10:58:51 a.m. PST

### PR #21 — sync accessible search labels to generated profiles
- PR #21 (https://github.com/marcelopuebla924-tech/reputix.app/pull/21) merged successfully by squash.
- Merge commit: `7e4675b821186df33828509ec6af67ea46a87a63`.
- The scheduled approved-profile candidate branch had refreshed from the latest app source. Its only five-file difference was the same expected Spanish accessible-name attribute on the search input in each generated profile.
- Independently compared all five generated profile files; each had exactly one expected added `aria-label` and no other line changes.
- Confirmed `sitemap.xml` was byte-for-byte identical between main and candidate. No profile content, business records, reviews, or customer data changed.

### PR #22 — regression coverage for generated profiles
- PR #22 (https://github.com/marcelopuebla924-tech/reputix.app/pull/22) merged successfully by squash.
- Merge commit: `092aadd6fd1cd3ac8656e647eaae8a7317955656`.
- Added one browser regression check that visits all five approved static profile routes and verifies the search field's Spanish accessible name on load and English accessible name after switching languages.
- Workflow run `43285107229` completed successfully: all 40 Playwright browser checks passed, 0 failed; all 9 Node unit tests passed, 0 failed; `pageErrors: []`.
- The new generated-profile bilingual search-label regression check passed for all five routes.
- Review threads were empty. The change was test-only; no production application code, Supabase settings, billing, domain configuration, or user data changed.

### Deployment and remaining checks
- The connector returned no PR-triggered workflow runs for the PR #21 merge commit; therefore a main-branch GitHub Pages deployment after PR #21 remains unverified.
- The custom-domain public HTTP response and social preview cache remain unverified.
- Continue broader form/button/keyboard accessibility and product-readiness QA without changing protected production settings.
- Keep the approved-profile candidate branch under review; never merge a stale snapshot or bypass the review PR process.
