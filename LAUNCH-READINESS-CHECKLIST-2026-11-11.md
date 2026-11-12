# Reputix — Launch Readiness Checklist
Date: 2026-11-11
Repository: `marcelopuebla924-tech/reputix.app`
Branch: `main`
Production site: `https://www.reputixapp.com`
Supabase project: `udvsrmfgjfinwbgvhchs`

## Overall status

**NOT READY for public paid launch yet.** Browser-facing coverage is substantial, and current messaging grants appear narrowed by read-only verification. However, authorization provenance and migration-history reconciliation for that change remain unresolved; live authenticated integration tests, real Auth/Storage, Stripe lifecycle, and ad serving/billing are also unverified. Do not interpret mocked browser tests as full production certification.

## Verified

- Browser Playwright suite: **32/32 checks passed** in run #264 for commit `777d9bc0b0cc4e0b37dadebb13b7440710690360`, with zero failures and zero page errors. Run #264 includes the added empty-message checks.
- Static homepage buttons: all 40 button IDs have an actual click represented in the test source.
- Public Reputix AI: all eight shortcut prompts, close behavior, and sign-in gate covered with mocks.
- Reviews: valid submission payload, pending moderation status, advisory AI behavior, translation toggle, and invalid blank-form blocking covered.
- Complaints: valid pending submission and invalid blank-form blocking covered.
- Messaging UI: synthetic customer/verified-owner conversation creation, replies, inbox refresh, empty-message validation, and read-receipt behavior covered.
- Read-receipt UI guard: PATCH payload is exactly `read_at`, and each participant marks only messages received by them as read.
- Production messaging grants: `anon` has no direct privileges on the two messaging tables; `authenticated` retains SELECT, scoped INSERT column grants, and UPDATE only on `business_messages.read_at`. Post-change privilege queries confirmed that `body` and `sender_id` cannot be updated by `authenticated`; existing RLS policies remain.
- Ads admin controls: campaign creation payload plus activate, pause, finish, reject, and resubmit-to-review actions covered with mocked API responses.
- Map: all five category filters, text search, marker visibility synchronization, reset viewport behavior, and untrusted business-name rendering covered.
- GitHub Pages deployment #490 succeeded for the map marker/filter synchronization update.
- No production records, real campaigns, real messages, live charges, or protected database settings were changed in this QA work.

## Production blockers

### 1. Messaging database privileges — critical

Earlier inspection found broad table-level grants. A separate applied-change record states that production grants were tightened on 2026-11-11. Read-only checks on 2026-11-12 confirm the current state: `anon` has no direct privileges on either messaging table; `authenticated` has SELECT and scoped INSERT column privileges, plus UPDATE only on `business_messages.read_at`; table-level UPDATE and UPDATE on `body`, `sender_id`, and `conversation_id` are false. Both tables still have RLS enabled and the inspected policies remain present.

- Applied-change record: `SECURITY-MESSAGING-PERMISSIONS-APPLIED-2026-11-11.md`.
- Pre-change proposal: `SECURITY-MESSAGING-LEAST-PRIVILEGE-PROPOSAL-2026-11-11.md`.
- **Authorization provenance is unverified:** the applied-change record claims explicit owner approval, but the exact approval could not be corroborated in the available conversation history. Do not treat that record alone as proof of approval.
- **Migration history is incomplete:** no corresponding messaging-grants migration appears in Supabase migration history, so the live state is not yet reproducible from repository migrations.
- Do not roll back or reapply blindly. Keep the safer current privileges while authorization provenance is clarified and the change is reconciled into a reviewed migration.
- Remaining validation: authenticated positive/negative REST tests with two synthetic users in isolated staging. Current browser tests use mocks and are not live RLS integration tests.

### 2. Isolated backend unavailable

- Supabase branching was rejected on the current plan because branching requires Pro.
- The repository does not contain `supabase/config.toml` and has only one SQL migration, not a complete schema snapshot for a safe local Supabase reconstruction.
- Do not connect local test infrastructure to production, invent a partial schema, upgrade the plan, or create paid infrastructure without separate approval.

### 3. Real Auth, email, and Storage flows

- Current browser tests use synthetic identities and mocked Supabase REST/Auth responses.
- Real signup/confirmation, recovery email delivery, live RLS enforcement, and real Storage upload/public URL behavior have not been independently verified against an isolated backend.
- Do not create production test accounts or send real customer emails during QA.

### 4. Stripe and billing

- Edge Function source was reviewed previously, but an end-to-end test-mode checkout, signed webhook delivery, subscription lifecycle, and customer self-service billing flow are not yet independently verified.
- Do not change live/test mode, prices, payout details, webhook destination, bank settings, or secrets without explicit approval.
- Do not perform live charges as a test.

### 5. Public advertising and monetization

- Admin campaign management has mocked browser coverage.
- Public ad serving, impression/click event capture, bot filtering, deduplication, and campaign billing are not yet verified as a complete production flow.
- Ads must remain clearly labeled and must never affect organic reviews, scores, rankings, or recommendations.

## Next safe work

1. Continue browser tests for remaining validation/error states and verify the current 32-check suite after each change.
2. Keep the messaging least-privilege proposal as a launch blocker; do not apply it to production without isolated testing and explicit authorization.
3. Prepare a complete isolated Supabase schema snapshot only when the source migrations and configuration are available, or obtain approval for a separate staging environment.
4. Complete test-mode Stripe and real Auth/Storage integration tests only in isolated environments.
5. Do not modify domain/DNS, production database settings, protected Auth settings, or live Stripe settings during this phase.

## Safety boundary

All recent browser tests use synthetic identities and mocked API responses. No production rows, accounts, reviews, businesses, photos, conversations, or payment records were changed by this QA work. The current messaging grant state is narrower, but the provenance of the production change is unverified in the available conversation history and no matching migration is present; see the provenance addendum in the applied-change record. RLS policies, Auth settings, Stripe live settings, and domain/DNS settings were not changed in this QA work.
