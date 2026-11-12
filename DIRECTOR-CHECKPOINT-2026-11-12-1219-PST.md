# Reputix Director Checkpoint — 2026-11-12 12:19 p.m. PST

## Production-vs-repository function audit

Read-only inspection of the deployed Supabase Edge Functions in production project `udvsrmfgjfinwbgvhchs`:

### `reputix-ai`
- Deployed version: **22**, ACTIVE, JWT verification enabled.
- Deployed source has wildcard CORS (`Access-Control-Allow-Origin: *`).
- Current GitHub `main` source at `supabase/functions/reputix-ai/index.ts` uses an explicit origin allowlist for `reputixapp.com`, `www.reputixapp.com`, and GitHub Pages, plus request-origin-aware CORS.
- Therefore production Edge Function source is **not synchronized with the current repository source**. The GitHub version includes a stricter CORS policy not yet reflected in deployed version 22.
- Deployed code also accesses `review_ai_moderation` only from server-side requests authenticated with the service-role key, after validating a user's JWT and restricting the admin queue to `app_metadata.reputix_role === 'admin'`. The moderation write path verifies that the pending review belongs to the authenticated user. This supports keeping that table service-role-only; no browser policy should be added.
- Do not deploy a replacement blindly. First validate the complete current GitHub source, compare it to the deployed source, test CORS/preflight and auth/role boundaries, then deploy with `verify_jwt=true` and immediately smoke-test. No function changes were deployed in this audit.

### `stripe-webhook`
- Deployed version: **3**, ACTIVE, gateway JWT verification disabled as expected for a signed webhook; function verifies Stripe-Signature internally.
- Deployed source writes `payment_events` using the service-role key and updates `user_subscriptions` server-side. This supports keeping `payment_events` service-role-only.
- Important observed limitation in deployed v3: subscription upserts are not guarded by Stripe event-created ordering, and event rows are written after subscription mutation rather than atomically claiming the event first. This can allow duplicate/out-of-order webhook deliveries to race. The draft PR #33 is designed to address this with an atomic RPC and isolated tests, but is not yet merged or deployed.
- Do not touch live Stripe configuration or deploy the candidate until the full migration, legacy timestamp reconciliation, and end-to-end test gates are satisfied.

## Current QA / Pages
- Browser QA #499: **success** on commit `3ad4e7fc0e9c058c83253166479b298a9c162825`.
- GitHub Pages deployment #650: **success** on the same commit.
- Prior QA #498 and #497 also succeeded on their respective commits.

## Security advisor — production
Latest security advisor returned:
- INFO: four RLS-enabled/no-policy tables (`business_monthly_history`, `business_verification_documents`, `payment_events`, `review_ai_moderation`). These have RLS on and grants limited to postgres/service_role in both production and staging. Do not add broad policies merely to silence this lint.
- WARN: `submit_business_proposal(...)` is SECURITY DEFINER and callable by anon/authenticated. Prior source inspection found validation, pending-only insert, duplicate checks, pinned empty search_path and schema-qualified references; this appears to be an intentional public proposal endpoint. Keep it available unless the proposal flow is redesigned and tested.
- WARN: `owner_respond_to_complaint(uuid,text)` is SECURITY DEFINER and callable by authenticated. The current production function has empty pinned search_path, but does not yet include the approved-business predicate from PR #34. Continue staging-only candidate review before applying that additional restriction.
- WARN: leaked-password protection is disabled. Do not change Auth settings without explicit specific approval.
- Advisor remediation references: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy ; https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable ; https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable ; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Ordered next steps
1. Compare the complete current GitHub `reputix-ai` source with deployed version 22; run targeted tests for CORS allowlist, preflight, JWT validation, admin metadata role, owner-only moderation and advisory-only behavior.
2. If tests pass, deploy the current GitHub source to production with JWT verification enabled, then smoke-test the live endpoint. Record version/hash and QA.
3. Review and stage-test PR #34 with approved-business authorization predicate. Do not change production until staging verification passes.
4. Complete PR #33 atomic webhook candidate, including legacy subscription timestamp reconciliation; then test only in isolated/test-mode environment before any rollout.

## Safeguards remain
No user data, accounts, reviews, businesses, photos, subscriptions or payment records changed. No domain/DNS, Stripe live settings, payouts, webhook destinations, or Auth settings changed.
