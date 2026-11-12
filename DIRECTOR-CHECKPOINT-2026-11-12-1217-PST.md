# Reputix Director Checkpoint — 2026-11-12 12:17 p.m. PST

## Repository and deployment
- Repository: `marcelopuebla924-tech/reputix.app`, branch `main`.
- Latest main commit at checkpoint: `3ad4e7fc0e9c058c83253166479b298a9c162825`.
- GitHub Pages deployment run #650: **success** for this exact commit.
- Browser QA run #498: **success** for commit `eec1c025459c299645225797349dada037695fc6`.
- Browser QA run #499 for current main commit `3ad4e7fc0e9c058c83253166479b298a9c162825`: **in progress** at checkpoint; browser-smoke job running. Do not report it as passed until it completes.
- Earlier QA run #497 for checkpoint commit `c7dae7cf4e2f73fb79919242a49703d1743ada3e`: success.
- Pages run #649 and #648 were cancelled because newer commits superseded them; latest deployment #650 succeeded.

## Production hardening already applied and verified
- `public.owner_business_dashboard` and `public.owner_business_hourly_patterns` now have `security_invoker=true` in production; immediate catalog verification passed.
- `public.owner_respond_to_complaint(uuid,text)` now has an empty pinned `search_path`; immediate catalog verification passed.
- No business, review, user, photo, subscription, or payment rows were changed by these hardening steps.

## RLS-only tables review
Compared production project `udvsrmfgjfinwbgvhchs` with staging `lzcyulncvjjxsyyivlty` for:
- `business_monthly_history`
- `business_verification_documents`
- `payment_events`
- `review_ai_moderation`

All four match across environments: owner `postgres`, RLS enabled, FORCE RLS false, and table grants limited to `postgres` and `service_role`; no user-facing role grants were present. This supports an intentional service-role-only design, not a reason to add broad policies. Keep this boundary unchanged pending complete function/workflow tracing. In particular, never expose `payment_events` to browser roles.

Repository code-search results include `supabase/functions/reputix-ai/index.ts` for `review_ai_moderation`; other top results were primarily audit/checkpoint docs, so exact live call-path tracing remains open.

## Open candidate pull requests — do not merge automatically
- PR #33, Stripe atomic webhook claim RPC: draft/candidate only. Its own review notes identify a required reconciliation/backfill for legacy subscription rows with NULL provider event timestamps before activation. Keep live Stripe mode, prices, payouts, and webhook destination unchanged. Candidate must pass full isolated tests and be reviewed before any staging/production rollout.
- PR #34, owner complaint RPC authorization hardening: draft/candidate only. Candidate adds the approved-business predicate in addition to verified ownership, aligns SECURITY DEFINER behavior with the complaints RLS intent, and tightens execute grants. Its isolated PostgreSQL workflow run #438 passed on the candidate branch. This is not yet applied to production or staging. Production currently has the empty search_path hardening only; business-approval predicate rollout still needs staging migration/integration review and browser flow verification.

## Safeguards
- Do not delete or modify user data, accounts, reviews, businesses, or photos.
- Do not alter domain/DNS.
- Do not change Stripe live mode, prices, payouts, webhook destination, or sensitive Auth settings without explicit specific approval.
- Do not add RLS policies to the four service-role-only tables without confirming actual application/Edge Function access requirements.
- Preserve existing working features; no destructive changes.

## Next ordered tasks
1. Wait for and inspect Browser QA #499; inspect failing job logs if it fails.
2. Trace actual Edge Function and migration references to the four RLS-only tables, distinguishing service-role server paths from browser access.
3. Review PR #34 against current main and test a staging-only candidate migration before any production authorization change.
4. Continue PR #33's Stripe event-ordering and legacy-row reconciliation gates without touching live Stripe configuration.
5. Run the Supabase security advisor again after any future DDL changes and record the result.
