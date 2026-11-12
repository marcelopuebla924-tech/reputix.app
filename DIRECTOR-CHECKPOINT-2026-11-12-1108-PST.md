# Reputix — Director checkpoint
**Date/time:** 12 November 2026, 11:08 a.m. PST (America/Los_Angeles)
**Repository:** `marcelopuebla924-tech/reputix.app`
**Branch:** `main`
**Latest main commit at checkpoint:** `90617d24a3df6a74bada506139b28302746bc6c6`

## Completed in this continuation
- PR #25 merged: refreshed client delivery-readiness and launch-readiness documentation to reflect the current 40-check browser suite and distinguish mocked QA from live integrations.
- PR #26 merged: updated the organic-discovery foundation to reflect five approved static profile pages, the six-URL sitemap, the scheduled candidate publishing workflow, review-before-publish control, and the next organic growth tasks.
- Both documentation PRs passed GitHub Actions Browser QA: 9 Node unit tests passed, 40 Playwright checks passed, 0 failures, and `pageErrors: []`.
- Static repository audit confirms all 40 homepage button IDs have direct click coverage in the browser test source.
- Read-only check confirms `robots.txt` references the sitemap, `sitemap.xml` contains the homepage plus five approved business profile URLs, and `CNAME` remains `www.reputixapp.com`.
- All five static profile files contain a business-specific title, canonical URL, and bilingual accessible search label. Their SEO descriptions are limited to category and locality; private owner data and review text are not included in the metadata checked.
- Current security advisor was rechecked at approximately 11:04 a.m. PST. It still reports two SECURITY DEFINER view errors, one anonymous-executable proposal RPC warning, one authenticated complaint-response RPC warning, leaked-password protection disabled, and four RLS-enabled tables with no client policies. No database or Auth changes were made.

## Findings and release cautions
- One approved static profile has incomplete/malformed address locality fields. Do not auto-correct or overwrite the underlying business record. Verify the business-provided address with an authorized owner/admin before promoting it in local SEO.
- External HTTP retrieval of the custom domain, sitemap, robots file, and direct profile URL was unavailable in the browsing environment. GitHub repository content is verified, but public-domain delivery and search/social crawler behavior are not independently confirmed here.
- The latest 40-check browser suite uses a local static server, synthetic fixtures, and mocked Supabase/Auth/Storage responses. It is not proof of real production Auth email delivery, RLS, Storage policy enforcement, Stripe transactions/webhooks, or public ad delivery.
- No production business records, accounts, reviews, photos, messages, payments, Supabase schema/data/policies, Auth settings, Stripe settings, domain, DNS, or HTTPS configuration were changed.
- The approved-profile candidate branch `automation/approved-public-profiles` is stale relative to main (one commit ahead, five behind) and contains generated-page diffs. Do not merge it; wait for the publishing workflow to generate a fresh candidate from current main and review the exact diff.
- The security advisor findings remain open. Do not change SECURITY DEFINER views, RPC grants/search_path, leaked-password protection, or backend-only RLS policies without an isolated test environment, reviewed rollback plan, and required owner approval.

## Next director priorities
1. Verify the malformed business location with an authorized source; do not edit the listing without confirmation.
2. Verify the live custom-domain homepage and five profile URLs when an ordinary browser or Search Console is available; submit the sitemap only after public delivery is confirmed.
3. Continue the P0 security design for the two SECURITY DEFINER views and the proposal/AI abuse surfaces. Staging is not currently available; do not connect tests to production or incur new infrastructure costs without approval.
4. Preserve and review the six-hourly approved-profile candidate workflow, prioritizing removals when a business is no longer approved.
5. Continue launch gates for real Auth/Storage, Stripe test mode, public advertising delivery/tracking, legal disclosures, and subscription self-service.
