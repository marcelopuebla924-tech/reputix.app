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


## Director continuation — 12:30 p.m. PST, Nov 12 2026

### Five-point security and launch-readiness pass

#### 1. Reputix AI cost-abuse controls — design decision completed; implementation remains gated
- Re-read the current main Edge Function source and staging deployment. Both use the approved CORS allowlist; staging deployment is active, version 1, with verify_jwt=true.
- The AI handler authenticates the user, checks Pro entitlement server-side for assistant mode, and keeps moderation advisory-only. It has no visible per-user quota, concurrency cap, or durable rate limiter.
- Safe implementation direction: durable server-side quota keyed to authenticated user and operation, enforced atomically before every billable OpenAI call; global emergency spend/circuit-breaker limit, bounded request sizes, and explicit 429/Retry-After responses. Admin bypass must be explicit and audited. Never trust client-supplied user IDs or IP headers.
- Do not use in-memory Edge Function counters; instances are distributed/ephemeral. Do not add schema or change production secrets until quota window, retention, limits, and staging test identities/budget are agreed and integration-tested.
- Hosted runtime tests remain blocked because connected actions provide no Edge Function invoke action and filtered staging logs had no invocation evidence. No request was sent and no runtime pass is claimed.

#### 2. Owner complaint RPC — staging/production drift verified
- Read-only catalog inspection confirms staging owner_respond_to_complaint(uuid,text) is SECURITY DEFINER, search_path empty, denies anon execution, grants authenticated execution, requires auth.uid(), bounds response to 3–3000 chars, and requires both a verified owner claim and businesses.status='approved'.
- Production has an empty search_path, denies anon and grants authenticated, and checks verified owner claim, but does not require the business to be approved.
- Staging candidate is stronger, but hosted Owner A / Owner B / unverified owner / unapproved business authorization tests are still incomplete. No real user or claim fixture was created; no constraints were weakened.
- Decision: preserve staging candidate; do not change production until hosted authorization tests and rollback review pass.

#### 3. Public business proposal abuse — risk and safe migration path documented
- submit_business_proposal(...) is intentionally callable by anon and authenticated so public business submissions can work. It validates required fields and maximum lengths, detects matching pending/approved businesses, and inserts only pending records.
- The RPC is SECURITY DEFINER with an empty search_path, but its direct public endpoint has no durable rate limit or server-verifiable anti-automation control. Client-side honeypots alone are bypassable.
- Do not revoke anon EXECUTE blindly; that could break public add-business. Recommended path: move submissions behind a server-side Edge Function/API gateway with verified request context, durable IP/device and normalized-content throttles, bot challenge where appropriate, strict payload bounds, duplicate checks, and audit telemetry. Only after frontend cutover and end-to-end tests should direct anon RPC execution be reconsidered.
- No proposal records, ACLs, or production objects were changed.

#### 4. Security Advisor and private-data posture — rechecked on staging
- Current staging Security Advisor reports four INFO rls_enabled_no_policy findings: business_monthly_history, business_verification_documents, payment_events, and review_ai_moderation.
- Read-only information_schema.role_table_grants inspection shows these tables granted only to postgres and service_role; no anon/authenticated table grants appeared. Keep this server-only posture; do not add broad client RLS policies.
- Advisor also reports SECURITY DEFINER warnings: anon and authenticated access to submit_business_proposal, and authenticated access to owner_respond_to_complaint. These require documented trust-boundary review, not blanket revocation.
- The private verification-document bucket remains private; no user-facing upload/download path was established in inspected application/Edge Function sources. Owner-verification workflow remains a design item.
- No database, storage, policy, Auth, payment, or user data changes occurred.

#### 5. Checkpoint and release decision
- This checkpoint records the five-point pass at 12:30 p.m. PST on Nov 12, 2026.
- Completed: source/catalog/ACL/Advisor reinspection, environment comparison, risk identification, and safe implementation decisions.
- Still open: AI durable quota implementation and hosted runtime tests; hosted owner-RPC authorization tests; proposal submission gateway/throttling; private verification-document workflow; AI CORS production release gate; Stripe PR #33 release gates.
- No production deployment, migration, PR merge, Stripe operation, domain/DNS change, sensitive Auth change, or user-data write occurred.
- Production reputix-ai remains v22 unchanged. Staging reputix-ai remains v1. PR #33 and PR #34 remain draft/unmerged.
