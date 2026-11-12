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


## Update — 2026-11-11 18:17 PST

- Browser QA run #156 passed for the review form optional-field application fix.
- Browser QA run #157 passed the full 30-check suite: 30/30 checks passed, zero page errors.
- The review submission test passes with staff name left blank and verifies all five ratings, visit details, signed-in user, pending status, and mocked AI advisory calls.
- The photo upload test passes both unsupported-file rejection and synthetic PNG metadata submission.
- App commit: `b05aba7c7ce3074f8f34471ef18f4ca0b8e297f5`.
- Passing test commit: `007861f0b49008bee6f7a9d1f3d25a3e0adb6a01`.
- These are isolated mocked browser tests, not live Supabase/Auth/RLS or production upload certification.


## Update — 2026-11-11 18:18 PST

- Added a dedicated verified-owner complaint response test for the authorized RPC path.
- The test checks the exact synthetic complaint ID and response text, then verifies the updated response is rendered after workspace refresh.
- Suite count: 31 named checks.
- Commit: `f908e00f6ed44c8d37040ec7d6fea0750892ef94`.
- Previous run #157 passed all 30 checks with zero page errors; run #165 is pending for the new complaint-response test.
- Test data and RPC responses are mocked; no production complaint was changed.


## Update — 2026-11-11 18:19 PST

- Browser QA run #165 passed all 31 named checks with zero page errors.
- The verified-owner complaint response scenario passed, including the authorized RPC request and refreshed response display.
- Passing test commit: `f908e00f6ed44c8d37040ec7d6fea0750892ef94`.
- These are mocked browser checks only; live Supabase RLS/RPC integration remains unverified.


## Update — 2026-11-11 18:20 PST

- Expanded admin claim QA to cover both approval and rejection, including confirmation dialogs, correct status/timestamp payloads, and pending-queue refresh.
- Existing suite count remains 31 named checks.
- Commit: `c5415ad9da7b6b0cfd87e21a6ad95dfc2a404d0b`.
- Browser QA run #172 is running for the expanded admin decision test.
- No real claims or production data were changed.


## Update — 2026-11-11 18:22 PST

- Browser QA run #172 passed the expanded admin owner-claim approve/reject test.
- Messaging regression coverage now clicks both the customer's reply button and the verified owner's reply button.
- Test commits: `89034e835576fcb585ef1d85265e41d4a58a0770`, `f8374dfdc89aec2556525bf73988b8364407a3ec`.
- Suite remains at 31 named checks. Run #177 is pending completion for these button-level interactions.
- All records remain synthetic/mocked.


## Update — 2026-11-11 18:23 PST

- Browser QA run #177 passed the actual customer and verified-owner reply button interactions; zero page errors.
- Added explicit clicks for the customer complaint submit button and private reviews refresh button, including the expected user-scoped reviews read.
- Test commit: `e241c7386685e94d3b617c4aebcb193bca30a644`.
- Browser QA run #181 is running for the new button-level assertions.
- All test data remains synthetic/mocked.


## Update — 2026-11-11 18:25 PST

- Browser QA run #181 passed the 31-check suite, including actual customer/owner reply button clicks, zero page errors.
- Added customer complaint submit and private reviews refresh button interactions.
- Added advanced statistics refresh button query assertion.
- Owner claim submission now clicks the actual submit button.
- Test commits: `815268ccb5c4daff7975eb2581c3d7a1ed57da9b`, `2f41253d693f35af0482bc74199f9f09c7595158`.
- Browser QA run #186 is pending for the latest button-level coverage.


## Update — 2026-11-11 18:26 PST

- Browser QA run #186 passed the 31-check suite with zero page errors.
- Added Pro AI assistant coverage: the Pro plan must send a prompt through the mocked assistant endpoint; Basic must not expose the Pro-only assistant panel.
- Test commit: `fb5056416de0551e0db085fb44f95a093c6d5ece`.
- Browser QA run #190 is pending for the Pro AI assistant assertions.
- All AI and database interactions remain mocked.


## Update — 2026-11-11 18:28 PST

- Browser QA run #190 passed all 31 checks with zero page errors, including Pro AI prompt submission and Basic plan gating.
- Added test coverage for the independent service join button and owner claim evidence/relationship selectors.
- Test commit: `fbdc6741d095fa290f440dec9499358053a066ea`.
- Browser QA run #194 is running for the latest form and CTA assertions.
- No production AI, claim, or proposal records were created.


## Update — 2026-11-11 18:30 PST

- Browser QA run #194 passed the 31-check suite with zero page errors.
- Extended advertising form QA to cover budget, destination, placement, start/end dates, and review-only `pending_review` state.
- Test commit: `c097b2ae2c485f0a95fe3e63ab839778dcb93181`.
- Browser QA run #198 is running for the expanded campaign payload assertions.
- No actual campaign or billing operation occurred.


## Update — 2026-11-11 18:29 PST

- Reconfirmed the suite contains 31 named checks.
- Extended the paid member workspace test to click the real profile editor **Save changes** button instead of submitting the form programmatically.
- Added a real **Cancel** button click and verified that the editor closes without submission.
- Commits: `8c7503f6095ccd5bc8b6a63f353653859b7fbfe7`, `3aab841f2d7015098a9633434e37928510c2787e`.
- New assertions are pending independent CI verification. Do not mark as passed until the exact push-triggered Browser QA run is confirmed.
- Synthetic identities and mocked REST responses only; no production profile was read or modified.


## Update — 2026-11-11 18:30 PST

- Browser QA run #198 passed all 31 named checks, zero failures, zero page errors.
- Admin advertising payload validation passed for business, title, budget, destination, placement, start/end timestamps, and pending-review status.
- Static interactive-control scan found every actual static control ID covered by at least one test; remaining unmatched IDs are non-interactive containers/rails/text.
- Passing commit: `c097b2ae2c485f0a95fe3e63ab839778dcb93181`.
- Campaign/checkout/charge behavior remains mocked; no production ad or billing action was executed.


## Update — 2026-11-11 18:31 PST

- Extended the public business/professional proposal scenario to click the actual submit button for all three paths: honeypot rejection, valid proposal, and duplicate proposal handling.
- Commit: `807609bab3d09fb3a84a55f00a1ee1aa572a33b5`.
- The suite remains at 31 named checks; these are additional button-level assertions in an existing scenario.
- Push-triggered CI result is not independently retrievable through the currently available workflow-run connector. Keep the new assertions marked pending.
- Synthetic/mocked only; no production proposal or record was created.


## Update — 2026-11-11 18:32 PST

- Reconciled additional repository QA work.
- Browser QA run #198 passed all 31 named checks with zero failures and zero page errors.
- Admin advertising test verifies the synthetic campaign payload including business, title, budget cents, destination URL, placement, schedule, and pending-review state.
- Static control audit: 62 actual interactive control IDs are covered by tests; remaining four scanned IDs are non-interactive containers/text/rails.
- Claim picker test now searches for and selects an approved synthetic business without submitting a claim (commit `25bc0b647720b06b87d9411d3730dd1746ead72d`).
- The latest proposal form submit-button test (`807609bab3d09fb3a84a55f00a1ee1aa572a33b5`) remains pending independent push-run verification.
- No production campaign, proposal, or billing action occurred.


## Update — 2026-11-11 18:33 PST

- Browser QA run #198 passed the 31-check suite, zero page errors.
- Claim picker now tests searching and selecting a synthetic approved business.
- Admin ad campaign QA now tests the dynamic Activate, Pause, and Finish controls and verifies mocked status transitions.
- Commits: `25bc0b647720b06b87d9411d3730dd1746ead72d`, `f527464afceaf277fdbd42ef82fba8c73be71ac3`.
- Browser QA run #219 is running for these latest dynamic controls.
- No real campaigns, claims, or billing operations occurred.


## Update — 2026-11-11 18:33 PST

- Added a 32nd named Playwright check for the public review translation toggle: synthetic published review, translated text hidden by default, actual reveal-button click, hide-label update, and second click to hide the text again.
- Commit: `c1c66a826802539386dd0d710cb089fbb5e828a5`.
- Browser QA run #198 passed the previous 31-check suite only; run #219 was still in progress at its last recorded checkpoint and does not include this new test.
- The new 32-check suite remains pending independent CI verification.
- No production review or translation was created; REST responses are mocked.


## Update — 2026-11-11 18:34 PST

- Browser QA run #219 passed all 31 named checks with zero failures/page errors.
- Claim picker search/selection passed with a synthetic approved business.
- Admin ad campaign test passed pending-review creation, activation, pause, and completion through mocked API transitions.
- Passing commit: `f527464afceaf277fdbd42ef82fba8c73be71ac3`.
- No production claims, campaigns, or billing operations were performed.


## Update — 2026-11-11 18:35 PST

- Static homepage button comparison found one uncovered control: `claimBusinessClose`.
- Added an actual click and modal-hidden assertion, then reopened the claim picker and continued the approved-business search/selection test.
- Commit: `3614ae73a5a3764bb95b287d227fd1d14d6175e4`.
- All 40 static homepage button IDs now have at least one reference in the Playwright test source. This is not a substitute for passing CI.
- The 32-check suite remains pending independent verification; no real claim was submitted.


## Update — 2026-11-11 18:36 PST

- Browser QA run #231 passed all 32 named checks with zero failures/page errors.
- Admin advertising lifecycle passed activate, pause, finish, and reject transitions using mocked API responses and confirmation dialogs.
- Passing commit: `f17a33b14429655795eddfba6b02428d49989463`.
- No production campaign or billing action was executed.


## Update — 2026-11-11 18:37 PST

- Browser QA run #231 passed all 32 checks, zero failures and zero page errors.
- Investigated local Supabase CLI staging. Repository tree has no `supabase/config.toml` and only one migration SQL file, so it lacks a complete schema snapshot needed to safely reconstruct the backend locally.
- Decision: do not create an incomplete test schema, connect local stack to production, or incur a new project/upgrade cost without approval.
- Continue mocked browser QA until an approved isolated backend can be prepared.


## Update — 2026-11-11 (latest verified browser QA)

- Browser QA #210 passed the 31-check suite after adding assertions that the admin review-moderation refresh and ad-campaign refresh buttons each trigger a new mocked data load (commit `d1bdeb7695d54b925915406589b9651e3d5a9cc5`).
- Browser QA #220 passed 32 checks, including the public published-review translation toggle (commit `c1c66a826802539386dd0d710cb089fbb5e828a5`).
- Browser QA #230 passed 32 checks, including claim-picker close/reopen behavior (commit `3614ae73a5a3764bb95b287d227fd1d14d6175e4`).
- Browser QA #231 passed 32 checks, including campaign activation, pause, finish, and rejection (commit `f17a33b14429655795eddfba6b02428d49989463`).
- Browser QA #235 passed 32 checks, including rejected-campaign resubmission to `pending_review` (commit `f888f4a45f32fe6c7adfcc524938218deaccfe01`).
- Current suite count: 32 named checks. Static homepage control scan found 40 button IDs, all represented in the test source. This is source coverage plus the specific CI passes above, not certification of live backend integrations.
- All interactions used synthetic data and mocked APIs; no production writes, real campaigns, or charges occurred.
- Staging is still unavailable: the repository lacks a complete local Supabase schema snapshot and Supabase branching requires Pro. No upgrade or new paid project was created.
- Continue mocked browser QA; live Auth/RLS/Stripe/Storage remains unverified until isolated staging is approved.


## Update — 2026-11-11 (map and campaign controls)

- Browser QA #235 passed 32 checks, including the rejected-campaign resubmission action to `pending_review` (commit `f888f4a45f32fe6c7adfcc524938218deaccfe01`).
- Browser QA #244 passed 32 checks after adding positive-match assertions for all five standalone map filters (All, Smoke Shops, Restaurants, Shops, Services), using four synthetic businesses (commit `0904ae423c5d2dab0c5f849a3b685c845515e998`).
- Added a map reset assertion that verifies **Ver todos** calls the mocked map's `fitBounds` again after filtering; commit `d839686cee1e6be5dce2e40ec03dc149caa16cd3`, run #245 pending.
- Synthetic businesses and mocked endpoints only; no production writes or billing operations.


## Update — 2026-11-11 (map filter behavior)

- Browser QA #245 passed the map reset assertion for **Ver todos** (`fitBounds` invocation; test commit `d839686cee1e6be5dce2e40ec03dc149caa16cd3`).
- Fixed `mapa.html` so category and text-search filters now synchronize the business list and visible map markers. Non-matching markers are removed from the map and matching markers are re-added (commit `bfc0f676664bb65ebf57c34fc856533dfafdd5d0`).
- Browser QA #249 passed all 32 named checks with marker-visibility assertions across all five category filters, map search, and clearing the search (test commit `b1281cb7bd430ce9b29342cbe1a3e41e96053f2f`).
- Intermediate run #248 failed because the test's mocked Leaflet marker lacked the `remove()` method now used by the app. The mock was corrected in the next test commit; run #249 passed.
- Synthetic businesses and mocked services only; no production data or settings changed.
