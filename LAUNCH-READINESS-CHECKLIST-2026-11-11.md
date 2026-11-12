# Reputix — Launch Readiness Checklist
Date: 2026-11-11
Repository: `marcelopuebla924-tech/reputix.app`
Branch: `main`
Production site: `https://www.reputixapp.com`
Supabase project: `udvsrmfgjfinwbgvhchs`

## Overall status

**NOT READY for public paid launch yet.** The browser-facing experience has a substantial mocked QA suite, but server-side messaging permissions and several real production integrations remain unverified. Do not interpret passing browser tests as production security or billing certification.

## Verified

- Browser Playwright suite: **32/32 checks passed** in run #263, with zero failures and zero page errors.
- Static homepage buttons: all 40 button IDs have an actual click represented in the test source.
- Public Reputix AI: all eight shortcut prompts, close behavior, and sign-in gate covered with mocks.
- Reviews: valid submission payload, pending moderation status, advisory AI behavior, translation toggle, and invalid blank-form blocking covered.
- Complaints: valid pending submission and invalid blank-form blocking covered.
- Messaging UI: synthetic customer/verified-owner conversation creation, replies, inbox refresh, empty-message validation, and read-receipt behavior covered.
- Read-receipt UI guard: PATCH payload is exactly `read_at`, and each participant marks only messages received by them as read.
- Ads admin controls: campaign creation payload plus activate, pause, finish, reject, and resubmit-to-review actions covered with mocked API responses.
- Map: all five category filters, text search, marker visibility synchronization, reset viewport behavior, and untrusted business-name rendering covered.
- GitHub Pages deployment #490 succeeded for the map marker/filter synchronization update.
- No production records, real campaigns, real messages, live charges, or protected database settings were changed in this QA work.

## Production blockers

### 1. Messaging database privileges — critical

Read-only Supabase inspection found that `authenticated` has broad UPDATE privileges on `public.business_messages`, including `body`, `conversation_id`, `sender_id`, and `read_at`. The current RLS UPDATE `WITH CHECK` only enforces `sender_id <> auth.uid()`. A conversation participant may therefore be able to alter a received message beyond the intended read-receipt update.

- Detailed draft: `SECURITY-REVIEW-MESSAGING-UPDATE-2026-11-11.md`.
- Proposed least-privilege direction: revoke table-level UPDATE from `authenticated`; grant UPDATE only on `read_at`; review the row policy and test positive/negative cases with two synthetic users.
- The frontend read-receipt test is only a client-side regression guard. It does not fix direct REST access.
- **No production SQL, grants, or RLS policies have been changed.**
- Remediation requires an approved isolated backend and explicit owner authorization.

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

All recent browser tests use synthetic identities and mocked API responses. Production data, accounts, reviews, businesses, photos, conversations, payment records, grants, RLS policies, Auth settings, Stripe live settings, and domain/DNS settings remain untouched.
