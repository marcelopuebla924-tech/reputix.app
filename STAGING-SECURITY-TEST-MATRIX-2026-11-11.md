# Staging Security Test Matrix — Reputix

Status: prepared from production catalog and Security Advisor inspection on 2026-11-11. This is a test specification only; no staging or production SQL was changed.

## Test fixture design
Create only synthetic records in the isolated staging project after the reviewed baseline is applied:
- Two independent authenticated users: Owner A and Owner B.
- Two approved businesses: Business A owned/verified by Owner A; Business B owned/verified by Owner B.
- One pending/unapproved business proposal.
- Published and pending reviews for each approved business, with deliberately distinct comments, scores, visit dates, and hours.
- Separate conversations and messages for A and B, plus one attempted cross-business access.
- Synthetic subscription rows for basic/pro active, expired, and absent-plan cases.
- Storage test objects only in staging buckets; use non-sensitive dummy images and documents.
- Use a dedicated synthetic admin claim only in staging; never edit production user metadata or app metadata for tests.

## Required negative/positive tests
| Area | Positive case | Negative case / expected denial |
|---|---|---|
| Public business discovery | anon reads only approved public business data | anon cannot read pending/rejected proposals or private verification data |
| Business proposal RPC | anon submits valid proposal; result status is pending | blank/oversized fields and duplicate pending/approved proposal rejected; rate/abuse behavior measured |
| Reviews | anon/authenticated submission follows intended pending workflow | cannot publish or alter protected review fields directly; pending reviews invisible in public discovery |
| Moderation | service role can process synthetic moderation fixture | anon/authenticated cannot read or mutate moderation internals |
| Owner claims | verified owner can access own claim-scoped functions/views | unverified claim and different owner cannot access another business |
| Owner dashboard view | Owner A sees only Business A; Owner B sees only Business B | Owner A must not see any Business B metrics and vice versa; no rows for unverified/no-subscription users |
| Hourly analytics view | eligible Pro owner sees own aggregate when minimum sample count is met | non-Pro, expired, unverified, and cross-owner queries do not reveal restricted rows |
| Complaints | verified owner responds to complaint for own business | another owner, anon, malformed response, or missing complaint is rejected |
| Messaging | conversation participants read messages; sender creates allowed message fields; recipient updates read_at | non-participant cannot read, insert into, or update messages; sender cannot rewrite body/sender_id after insert |
| Photos | public reads only approved public photos; proposal upload path obeys limits | invalid MIME, oversized files, unapproved photo, and verification-private access denied to clients |
| Subscriptions | synthetic active/trialing test records unlock intended staging views | expired/canceled/no plan does not unlock paid analytics; no live Stripe calls |
| Admin | synthetic app_metadata admin claim passes admin-only check | user_metadata-only claim and ordinary users fail admin check |

## Special owner-view security gate
Production Advisor flags both owner views because they do not set `security_invoker=true`. For staging:
1. Build the views with invoker security as the candidate design only if the required underlying grants and RLS can preserve intended behavior.
2. Test the two-owner fixture with direct view queries as each authenticated identity.
3. Verify no cross-business leakage by querying both business IDs and by broad unfiltered scans.
4. Test with a verified owner but no subscription, expired subscription, active Basic, and active Pro.
5. If invoker security cannot support the intended model without widening base-table grants, do not broaden grants to make the test pass. Re-design the view/API boundary and document the least-privilege alternative.

## Anonymous proposal RPC abuse gate
The production function intentionally appears available to anon for public business submissions. Staging checks must include:
- Repeated identical submissions and near-duplicates.
- Very long strings, whitespace-only values, URL-shaped inputs, and unusual Unicode.
- Automated burst submissions to measure current controls.
- Confirm all proposals remain pending and cannot self-approve.
- Determine whether edge/API rate limiting, CAPTCHA, or moderation queue controls are needed before public launch.
Do not revoke anon EXECUTE until the public add-business flow has an approved replacement.

## Execution evidence to capture
For each test, record actor role/identity, SQL/API action, expected result, actual result, and timestamp. Keep all test data synthetic. Never export production users, reviews, businesses, secrets, storage objects, or Stripe events into staging.

## Release gate
Staging is not ready for launch sign-off until the entire matrix passes, the two owner-view Advisor findings are resolved or explicitly accepted with compensating controls, the anonymous proposal endpoint has an abuse-control decision, and the final baseline matches the reviewed production catalog except for documented staging-only security improvements.
