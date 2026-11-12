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


## Update — 2026-11-11 18:06 PST

- Extended the paid member workspace browser test to submit a community publication using a synthetic account.
- Asserted that the request includes the signed-in user ID, exact test content, and expected `published` state.
- This validates the browser request only; it does not exercise live RLS or a production write.
- Commit: `d020dcaf993365c134fad2aa41b08732fcd8fa27`.
- Await GitHub Actions result before marking this check passed.


## Update — 2026-11-11 18:09 PST

- Extended the existing mocked customer/owner messaging scenario with assertions for the customer complaints quick-navigation button and verified-owner inbox refresh control.
- These assertions test navigation and refresh behavior with synthetic identities and mocked Supabase REST responses.
- Named check count remains 28; two additional assertions were added inside an existing scenario.
- Commit: `8825afc4f939a2a9c9f08981e278dab1c9e76dbe`.
- Latest combined commit status returned no entries. Do not mark the new assertions as passed until an independent CI result is available.


## Update — 2026-11-11 18:09 PST

- Extended the existing customer/verified-owner workspace test for the owner business shortcut (scroll to claim form) and the private reviews refresh action (must issue a user-scoped reviews read).
- Test suite remains at 28 named checks.
- Commit: `a8550aae0186ebd037498c6383f93f0ee2fa33b4`.
- GitHub Actions Browser QA run #136 is running for this exact commit; wait for its final conclusion before marking the new assertions passed.
- This remains mocked browser QA, not live Supabase/Auth/RLS verification.


## Update — 2026-11-11 18:11 PST

- Added a dedicated mocked Playwright test for public review submission, covering signed-in identity, visit date/time, five ratings, language detection, pending status, and optional AI translation/advisory moderation.
- Suite count: 29 named checks.
- Commit: `baeb06b0e0518ddb48b8843eda35964438bb3901`.
- Browser QA run #136 passed for the preceding 28-check suite and quick-action additions.
- Browser QA run #140 is running against the new review test; await its conclusion before calling the new test verified.
- No live Supabase records, accounts, or AI calls were used.


## Update — 2026-11-11 18:12 PST

- Added mocked browser coverage for business photo uploads: unsupported GIF rejected, synthetic PNG accepted by the mocked Storage endpoint, and photo metadata submitted with `status: pending`.
- Assertions cover business ID, original filename, content type, byte size, and generated storage path.
- Suite count: 30 named checks.
- Commit: `babd87600f8471dc1f1dba69e264e7c28a86eb9d`.
- Browser QA run #136 passed for the previous 28-check suite. Newer review and photo tests are still awaiting CI completion.
- No production storage or database writes were performed.


## Update — 2026-11-11 18:13 PST

- Browser QA run #140 executed 29 named checks: 28 passed; the new review test failed only because its success-message matcher did not match the actual bilingual confirmation text.
- Updated the test matcher to the actual "Opinión recibida" / "Review received" confirmation copy.
- Fix commit: `53f3616c2c72e4cb3696d1da4fc37992ac5411b0`.
- Browser QA runs #144 (photo upload) and #148 (corrected review test) are pending completion.
- No application code or production data was changed for this test-only correction.


## Update — 2026-11-11 18:14 PST

- CI confirms the business photo upload test passed in run #144; the run failed only because the separate public review submission test timed out.
- The review test continued to time out in run #148 after the success-message matcher was corrected.
- Updated the test to target the review form by its comment textarea and include the exact form message, request payload, and mocked AI call trace on failure.
- Diagnostic commit: `4ef760b8c089c1a705b43e3cbdb4f7bf1276fad5`.
- Browser QA run #152 is in progress.


## Update — 2026-11-11 18:16 PST

- The diagnostic review test confirmed native browser validation blocked submission: the form message remained blank, no review POST payload was sent, and AI calls were not attempted.
- Root cause: the field labeled "Who served you? (optional)" was accidentally marked required by the shared review form helper.
- Fixed the app helper to support configurable requiredness and explicitly made `staff_name` optional.
- Added a regression assertion that the form is valid without staff name.
- App commit: `b05aba7c7ce3074f8f34471ef18f4ca0b8e297f5`.
- Test commit: `007861f0b49008bee6f7a9d1f3d25a3e0adb6a01`.
- Browser QA runs #156 and #157 are running. No production data or settings were changed.
