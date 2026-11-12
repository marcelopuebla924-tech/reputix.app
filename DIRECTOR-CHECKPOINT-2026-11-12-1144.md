# Reputix Director checkpoint — 2026-11-12 11:44 a.m. Pacific

## Repository and product state
- Repository: marcelopuebla924-tech/reputix.app
- Main branch checkpoint commit: 8ed464886580f224470d179f5186e0582cb82011 (saved Director checkpoint at 11:38 a.m. Pacific).
- PR #14 remains merged. Its Browser QA run #374 passed.
- Latest approved-profile/address changes are on main; Browser QA run #429 passed.
- PR #33 remains draft/candidate only. Latest head: c81fd0b1b4b858a62f88f090eacae124ac8b1931.
- PR #33 expanded isolated PostgreSQL workflow run #4 passed, including concurrent duplicate claim, sequential duplicate, stale/equal timestamp handling, deleted-then-stale protection, unknown-event ignore, legacy NULL-timestamp quarantine, rollback/retry, and execute grants. Browser QA run #432 passed.
- PR #33 review follow-up comment ID 6834095692 records that the expanded test run passed. No Supabase migration or Stripe/Edge Function integration was applied.
- PR #34 is a new draft candidate for owner complaint RPC hardening. Latest head: b88d73bc7467bc20103787756896bfb742b6e035. Its isolated PostgreSQL workflow run #2 was still in progress at 11:44 a.m. Pacific; Browser QA run #434 was also in progress.
- PRs #30, #31, and #32 remain draft and unmerged. Their Browser QA runs #423, #424, and #425 passed. Do not mark ready or merge automatically.

## Supabase-Staging read-only audit
Project lzcyulncvjjxsyyivlty (Reputix-Staging) reports ACTIVE_HEALTHY, PostgreSQL 17.11. No database writes were made.
- Security Advisor: four INFO findings for RLS-enabled backend-only tables with no client policies (business_monthly_history, business_verification_documents, payment_events, review_ai_moderation). Direct anon/authenticated SELECT/INSERT privileges were verified false; service_role privileges true. Treat as intentional backend-only until a separate access design is approved.
- submit_business_proposal(...) is SECURITY DEFINER with empty search_path, fully qualified references, input validation, duplicate detection, and inserts only pending businesses. Public/anon access appears intentional for the add-business flow; do not revoke blindly. Rate-limit/abuse protection remains a launch gate.
- owner_respond_to_complaint(uuid,text) is SECURITY DEFINER and authenticated-only; it checks auth.uid(), response length, and verified ownership, but its search_path is public. Its body does not check business status approved, while the matching complaints UPDATE RLS policy does. Because SECURITY DEFINER bypasses RLS, PR #34 proposes adding the approved-business condition and empty search_path. Do not apply until isolated tests and review pass.
- Performance Advisor: 17 unused-index INFO notices and five multiple-permissive-policy WARN notices. Do not remove indexes or rewrite policies based only on low-traffic staging.
- Health Advisor: no findings.
- No Auth settings, RLS policies, grants, functions, Storage buckets, Stripe settings, production data, domain, or DNS were changed.

## Safety and next actions
1. Wait for PR #34 isolated PostgreSQL and Browser QA runs; fix any test failures on the branch and rerun.
2. Keep PR #34 draft until tests pass and function ACL/dependency review is complete.
3. Keep PR #33 draft until current candidate is integrated with a tested Edge Function, raw-body Stripe signature tests, actual staging schema/advisor review, Stripe plan/status mapping, and a safe reconciliation path for legacy subscriptions.
4. Do not apply candidate SQL to staging/production; do not deploy Stripe webhook changes or alter live payment settings.
5. Continue launch QA for registration/login, owner verification, photo upload (Storage buckets still require configuration), review/business flows, and visible controls, using browser evidence rather than assumptions.
6. Preserve existing accounts, businesses, reviews, photos, and user data. Do not modify domain/DNS or sensitive Auth/payment settings without explicit approval.

Checkpoint recorded at 11:44 a.m. Pacific on November 12, 2026. This is a progress record, not a release approval.