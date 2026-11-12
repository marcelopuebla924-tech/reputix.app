# Reputix Director Checkpoint — 2026-11-12 12:20 p.m. PST

## Completed this step: staging complaint-response authorization hardening
Applied a staging-only Supabase migration to project `lzcyulncvjjxsyyivlty`:
- Function: `public.owner_respond_to_complaint(uuid,text)`
- Requires a signed-in user.
- Requires response length 3–3000 characters after trimming.
- Requires a matching `business_owner_claims.status='verified'`.
- Additionally requires the related business to have `businesses.status='approved'`, matching the complaint update policy intent.
- Pins SECURITY DEFINER `search_path` to empty and schema-qualifies objects/system functions.
- Explicitly revokes EXECUTE from PUBLIC and anon; grants authenticated and service_role.
- Migration call returned success.

Immediate catalog verification on staging confirmed:
- `proconfig = {search_path=""}`
- Owner remains `postgres`, function remains SECURITY DEFINER.
- `anon_execute=false`, `authenticated_execute=true`, `service_role_execute=true`.
- Function definition includes the approved-business predicate.
- No table rows or user data were modified.

Production was NOT changed by this staging migration. Production already has empty search_path, but its current function does not yet enforce the approved-business predicate. Production rollout remains gated on staging behavior tests and review.

## Production function drift found (read-only)
- Production `reputix-ai` is deployed ACTIVE version 22 with wildcard CORS; current GitHub main source has an explicit allowlist for Reputix apex/www and GitHub Pages. Production is behind repository source. Do not deploy until full targeted tests pass.
- Production `stripe-webhook` is ACTIVE version 3 and uses service_role for `payment_events` and `user_subscriptions`; no browser access is needed for `payment_events`.
- Current deployed Stripe webhook performs subscription upsert before event record and has no event-created ordering guard. PR #33's atomic RPC candidate addresses this race but remains draft and requires legacy subscription timestamp reconciliation. No Stripe settings changed.

## RLS-only tables
The four tables `business_monthly_history`, `business_verification_documents`, `payment_events`, and `review_ai_moderation` have matching production/staging grants limited to postgres/service_role and RLS enabled. Keep them service-role-only; no public policies added.
The deployed AI function reads/writes `review_ai_moderation` with service-role credentials, after authenticating the user; admin queue additionally requires `app_metadata.reputix_role='admin'`. The moderation operation is advisory-only and checks the pending review belongs to the user.
The deployed Stripe webhook uses service-role credentials for payment_events.

## Security advisor (staging after migration)
- Four RLS/no-policy INFO findings remain; they are intentional server-only tables pending final usage trace.
- SECURITY DEFINER warnings remain for `submit_business_proposal` and `owner_respond_to_complaint`; the latter is intentionally callable by authenticated owners, with authorization enforced in function. Public proposal RPC remains under review.
- Leaked-password protection remains disabled; no Auth settings changed.

## Prior validated repository state
- Browser QA #499 success on commit `3ad4e7fc0e9c058c83253166479b298a9c162825`.
- GitHub Pages #650 success on same commit.
- Production hardening already completed: two owner dashboard views use `security_invoker=true`; complaint RPC search_path empty.
- Latest audit notes in `DIRECTOR-CHECKPOINT-2026-11-12-1219-PST.md`.

## Next tasks
1. Build/run staging integration tests for complaint RPC: verified owner + approved business succeeds; cross-business, non-final claims, unapproved business, anonymous and invalid response fail; ensure only intended row is affected.
2. Reconcile production vs repository `reputix-ai` source, run CORS/auth/role tests, then deploy tested current source with verify_jwt=true and smoke-test.
3. Review Stripe atomic RPC candidate and legacy subscription timestamp backfill; isolated tests only until complete.
4. Only after staging validation, consider production rollout of complaint RPC approval predicate.

## Safeguards
No production data, accounts, reviews, businesses, photos, subscriptions or payment records changed. No production function deployments, domain/DNS changes, Stripe live settings, payouts, webhook destinations, or Auth settings changed.
