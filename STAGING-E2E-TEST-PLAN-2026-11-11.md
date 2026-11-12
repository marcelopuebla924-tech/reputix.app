# Reputix — Safe Staging End-to-End Test Plan
Date: 2026-11-11
Prepared: 17:55 PST (America/Los_Angeles, UTC-8)
Repository: `marcelopuebla924-tech/reputix.app`

## Purpose
Move beyond mocked browser tests without risking real customer accounts, messages, reviews, business records, or billing. This is a test plan only; no staging environment or production configuration was changed while preparing it.

## Current verified baseline
- Browser QA #106: SUCCESS.
- Browser QA #107: SUCCESS.
- Browser QA #108: SUCCESS.
- GitHub Pages deployment #349: SUCCESS.
- Existing Playwright suite runs against a local static server and mocks Supabase REST/Auth-adjacent responses. It verifies UI behavior but is not a live Supabase Auth or live messaging integration test.
- The current workflow installs Playwright and Chromium on GitHub Actions, serves the repository locally, and runs `tests/smoke.spec.cjs`.

## Required isolation before live integration tests
1. Use a dedicated Supabase staging project, not the production Reputix project.
2. Use a separate test-only site origin and environment variables; never point staging tests at the production project URL.
3. Create synthetic identities with reserved `.invalid` email addresses or a controlled test mail sink. Do not use owner/customer personal email addresses.
4. Seed only synthetic businesses, claims, subscriptions, and messages with unmistakable QA labels and IDs.
5. Use Stripe test mode and test Price IDs only. No live-mode checkout, real card, real charge, payout, or production webhook.
6. Keep service-role keys and Stripe secrets in the CI secret store; never print, commit, or expose their values. Tests should only assert that required variables are present.
7. Ensure test cleanup is scoped by a unique run ID and can delete only records created by that run in the staging project.
8. Confirm that staging has no production user data, customer uploads, or production integrations before running the suite.

## Test matrix
| Area | Safe scenario | Required assertions |
|---|---|---|
| Auth registration | Synthetic user signs up | Confirmation behavior, no duplicate user, correct redirect |
| Auth sign-in | Synthetic confirmed user signs in | Session stored and restored after reload |
| Password recovery | Test mail sink receives recovery link | One-time token accepted once; duplicate event does not race |
| Sign-out | User signs out on one browser | Current session revoked; other test session remains valid |
| Customer messages | Synthetic customer sends a message to a seeded QA business | Message belongs to sender/business and appears in owner inbox |
| Owner reply | Synthetic verified owner replies | Reply is stored once and visible to customer |
| Owner authorization | Unverified synthetic user tries owner inbox | No business messages disclosed |
| Review workflow | Synthetic user submits pending review | Review remains pending until approved workflow |
| AI moderation | Synthetic pending review is evaluated | Advisory output only; no status mutation |
| AI rate limits | Repeat controlled test calls | Predictable 429/quota response without unbounded provider calls |
| Stripe checkout | Test-mode synthetic customer starts Basic/Pro checkout | Correct test Price ID and user/plan metadata |
| Stripe webhook | Send signed test events | Signature verified, idempotent event handling, entitlement lifecycle correct |
| Subscription lifecycle | Test subscription update/failure/cancel | Entitlement reflects server-side subscription status |
| Advertising | QA campaign with no billing | Only approved, date-valid sponsored placements render; clear Sponsored label; impression/click events are server-side and deduplicated |

## Release gates
- No test may use production user identities, production review/business records, production uploads, or real payment methods.
- A test failure must stop the release; do not weaken assertions merely to obtain a green build.
- Do not add public INSERT grants or public write policies for analytics tables. Impression/click recording must be mediated by a server-side endpoint with validation and abuse controls.
- Ads must remain visibly labeled and must never alter organic review order, rating, or recommendations.
- Any database migration, RLS/grant change, Auth security setting, Stripe live configuration, payout change, or domain/DNS change requires explicit owner approval.
- Promote code only after the staging suite passes and a separate production-readiness review is complete.

## Current blockers
- No confirmed dedicated staging Supabase project/origin is documented in the repository.
- No confirmed test-mode Stripe Dashboard endpoint, test Price mapping, or signed event delivery is documented.
- Live Auth/messaging end-to-end behavior is therefore not yet certified. Existing mocked QA remains useful but must not be described as production integration verification.

## Next implementation sequence
1. Establish a separate staging project and isolated site environment.
2. Add a CI workflow that runs only when all staging secrets are present; otherwise skip with an explicit message.
3. Add Auth and messaging integration tests with synthetic users and run-scoped cleanup.
4. Add Stripe test-mode lifecycle tests only after test configuration is verified.
5. Add rate-limit/anti-abuse tests for proposal and AI endpoints.
6. Add public ad-serving tests only after server-side tracking and approval flow are implemented.


## Update — 2026-11-11 18:01 PST

### Staging branch attempt
- The owner explicitly authorized the previously quoted branch compute cost of $0.01344/hour.
- Supabase returned: branching is supported only on the Pro plan or above.
- No branch was created; no staging database was provisioned; no production project settings or data were changed.
- No branch compute started, so the quoted hourly branch compute charge was not incurred.
- Decision: do not upgrade the Supabase plan just for staging at this stage. Continue with isolated local/static browser tests and synthetic mocked responses; revisit live integration only when an affordable isolated environment is available.

### Additional privacy hardening committed
- Commit `943e94eaab9d548326230842bdcedcf7f82b3bfd`: added explicit user scoping to private publications, owner-claim reads, and customer conversation reads.
- Commit `0b2c33035b063423ff2c3ff0f67c34d17487acb1`: added a Playwright regression test asserting that private publications, profiles, reviews, complaints, owner claims, and customer conversations include the signed-in user's identifier.
- These tests still use synthetic sessions and mocked REST responses. They do not certify live RLS or Supabase integration.
- CI results for these two new commits have not yet been independently verified; do not treat them as passing until GitHub Actions reports success.

### Next safe steps
1. Verify the new Browser QA run after GitHub Actions completes.
2. If it passes, continue reviewing remaining private-data reads and the member/owner control flows.
3. Keep production DB, Auth, Stripe, domain, and DNS unchanged.


## Update — 2026-11-11 18:05 PST

### Expanded browser regression coverage
- Public AI: all eight suggestion shortcuts must populate the prompt; submitting while signed out must preserve the question, direct the visitor to sign-in, and make no unauthenticated AI function request.
- Admin claims: owner verification must show a confirmation dialog and submit the expected status update; test data and REST responses are synthetic/mocked.
- These are browser tests only. They do not certify live Supabase RLS, Auth, database writes, or production integration.
- Commits: `eebb436f50bdb5c0f8cfb74520109ff1c499769a`, `66ce065665161086a1869646b3b78ef7526f7875`.
- Await GitHub Actions before marking these tests passed.
