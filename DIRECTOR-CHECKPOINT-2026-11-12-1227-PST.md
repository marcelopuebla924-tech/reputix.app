# Reputix Director checkpoint — 2026-11-12 12:27 p.m. PST

## Objective 3: Stripe webhook ordering and atomicity review

### Candidate PR #33 — exact head reviewed
- PR: https://github.com/marcelopuebla924-tech/reputix.app/pull/33
- Branch: `feat/stripe-webhook-atomic-claim-candidate`
- Head: `75a307362c5bfaa0743f19959386f1d05292a260`
- PR remains OPEN and DRAFT; GitHub reports mergeable=false. No merge performed.
- Candidate code is isolated under proposal/docs and a feature branch; no migration was applied to staging or production.

### Current candidate checks on exact head
All four latest workflow runs completed successfully:
- Stripe webhook handler contract tests — success (Deno type-check and 17/17 Node tests, including Stripe HMAC valid/tampered body cases).
- Stripe webhook atomic RPC candidate tests — success (PostgreSQL 17 concurrency, duplicate, stale/equal timestamp, deleted subscription, legacy NULL timestamp quarantine, rollback/retry, ACL checks).
- Stripe webhook local PostgREST integration — success (2/2 synthetic signed-event tests against disposable local PostgreSQL/PostgREST).
- Reputix Browser QA — success.
These are isolated CI results, not hosted Supabase or real Stripe account validation.

### Read-only schema/inventory observations
- Production and staging payment/subscription constraints were previously compared and found aligned for the candidate's expected columns and current unique constraints.
- Fresh staging aggregate query returned 0 rows in `public.user_subscriptions` and 0 rows in `public.payment_events`.
- Prior production aggregate query also returned 0 rows in both tables.
- This does NOT prove there are no Stripe-side subscriptions; no Stripe Dashboard/API inventory, secrets, test webhook, checkout, or payment was accessed.
- Candidate migration adds `provider_event_created_at` timestamps and extends subscription status CHECK to include `incomplete_expired`. Current app entitlements remain deny-by-default for all statuses except active/trialing.

### Main release blockers
1. Reconcile Stripe-side inventory through an approved test-mode/account workflow before routing any existing subscription events through the new timestamp guard.
2. Complete hosted Supabase integration against an isolated approved Supabase project; local PostgREST is not equivalent to hosted Supabase gateway/Auth/RLS behavior.
3. Review SECURITY DEFINER owner/ACL and post-migration advisors in staging before considering application.
4. Confirm Stripe environment mode and test-mode key/webhook pairing only through an approved test environment.
5. Keep invoice failure behavior aligned to Stripe's authoritative subscription status; candidate removes local synthetic `past_due` when retrieved Stripe status remains active.
6. Resolve GitHub mergeability and complete review before any merge.

### Safety
- No Stripe Dashboard changes, Checkout, charges, webhook delivery, secrets, payout settings, prices, webhook destination, Auth, production/staging migration, Edge Function deployment, or user data writes occurred.
- PR #33 remains draft/unmerged. Do not deploy the candidate or alter live Stripe configuration without the remaining release gates.

## Next objective
Return to the Reputix AI test harness and production drift release gates, then complete staging-equivalent tests for owner complaint RPC without weakening the staging foreign keys or verification constraints.


## Additional read-only work — 12:27 p.m. PST

### Reputix AI CORS source comparison
Read the deployed Edge Function source in production and staging, and compared both against the current GitHub `main` source at `supabase/functions/reputix-ai/index.ts`.

- Production deployed function: `reputix-ai` version 22. Its current source still has `Access-Control-Allow-Origin: *` and a wildcard CORS header object.
- Staging deployed function: `reputix-ai` version 1. Its source uses an explicit allowlist for `https://reputixapp.com`, `https://www.reputixapp.com`, and `https://marcelopuebla924-tech.github.io`, reflects only allowlisted origins, and sets `Vary: Origin`.
- GitHub `main` source matches the staging allowlist implementation (blob SHA `54b4be6602120e021f4436cc64eb0b208e8c0cda`).
- Confirmed production/staging/source drift: hardened CORS source is committed and present in staging, but not yet deployed to production.
- No Edge Function was deployed. Production remains unchanged pending runtime regression checks and a deliberate release step.

### Verification document privacy / call-path review
- Inspected all four currently deployed production Edge Function sources: `reputix-ai`, `tamos-cover-once`, `create-checkout-session`, and `stripe-webhook`.
- None references `business_verification_documents` or the `business-verification-private` bucket.
- `tamos-cover-once` is intentionally closed and returns HTTP 410.
- GitHub search found no application source reference to the verification-documents table/bucket beyond security/storage documentation and tests. Therefore no active client upload/download path is confirmed in the inspected app/Edge Function sources.
- Preserve the current private bucket posture and absence of client-facing policies. A controlled owner/admin verification workflow remains to be designed and tested.
- No table, storage object, policy, user, or business data was changed.

### Verification / limitations
- Read-only source comparison and repository search only.
- No production/staging database writes, Auth changes, Storage changes, Stripe calls, or Edge Function deployments.
- Browser QA and source-contract tests do not substitute for hosted runtime tests.
- Production AI CORS mismatch is an open release gate; verify preflight and allowed/disallowed origin behavior on staging before any production deployment.

### Next safe execution order
1. Add/verify focused staging runtime tests for AI CORS preflight, allowed origin, disallowed origin, authentication, Pro gating, and advisory moderation behavior.
2. If staging runtime checks pass, prepare a controlled production deployment of the exact GitHub `main` AI source and verify its deployed version/hash; do not change secrets.
3. Design the private owner-verification document workflow (server-side upload, review, and signed access only) without relaxing bucket privacy.
4. Continue owner complaint RPC hosted authorization tests and Stripe PR #33 review; do not merge/deploy candidates or alter live payment configuration.
5. Preserve all user data, accounts, reviews, businesses, photos, domain/DNS, and sensitive Auth/payment settings.


## Follow-up investigation — 12:29 p.m. PST

### AI runtime evidence check
- Queried staging unified function logs for `reputix-ai` from Nov 11 12:30 p.m. through Nov 12 12:30 p.m. Pacific.
- The filtered query returned zero matching records. This is not a runtime test and does not prove the function is healthy; it means no matching invocation evidence was available in that log query.
- The connected Supabase actions expose source retrieval and deployment, but no dedicated Edge Function invoke/test action. No unauthenticated or synthetic request was sent to the endpoint.
- Consequently, allowed/disallowed-origin preflight, session validation, Pro gating, and moderation behavior remain unverified at hosted runtime.
- Source review also confirms no visible per-user/IP rate limit or usage quota in the current AI function. This is a launch cost-abuse risk to address with a server-side limit before broad public launch; no behavior changed.

### Current decision
- Keep production `reputix-ai` v22 unchanged.
- Keep staging v1 and GitHub `main` allowlist source as the candidate reference.
- Do not call this a passing runtime test. The next step requires an approved staging request path with a valid synthetic test identity and a controlled OpenAI test budget, or a dedicated automated integration harness.
