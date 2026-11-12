# Reputix Director checkpoint — 2026-11-12 11:45 a.m. Pacific

## Verified work in this continuation
- PR #33 (Stripe webhook atomic RPC candidate) remains draft and unmerged. Latest expanded PostgreSQL 17 isolated workflow run #4 passed. Browser QA run #432 passed. Added coverage: concurrent and sequential duplicates, stale/equal timestamps, deleted-then-stale event ordering, unknown event ignored, legacy NULL-timestamp quarantine, rollback/retry, and function execute grants. Follow-up comment #6834095692 records the result.
- PR #33 now refuses to overwrite an existing subscription row with NULL provider_event_created_at until it has been reconciled from Stripe's authoritative subscription state. This avoids a delayed old event overwriting a newer legacy snapshot. The proposal remains outside supabase/migrations and was not applied to any Supabase project.
- PR #34 (owner complaint RPC hardening) remains draft and unmerged. Latest isolated PostgreSQL owner-authorization workflow run #2 passed. Browser QA run #434 passed. Tests cover verified-owner success, cross-business denial, unverified-owner denial, unapproved-business denial, anonymous/anon denial, response validation, and function execute grants. Follow-up comment #6834143145 records the result.
- PR #34 candidate pins search_path to empty, qualifies objects, and requires both a verified owner claim and approved business, matching the existing complaints UPDATE RLS policy. No staging or production function, grant, RLS policy, or data was changed.
- Main branch checkpoint file DIRECTOR-CHECKPOINT-2026-11-12-1144.md was committed at 11:44 a.m. Pacific as c584710d8e444bc7696d79ffbcb8b4c2c26d68bb.
- PR #14 remains merged. PRs #30, #31, #32 remain draft/unmerged. Do not mark drafts ready or merge automatically.

## Supabase-Staging read-only audit
- Project lzcyulncvjjxsyyivlty (Reputix-Staging) is ACTIVE_HEALTHY, PostgreSQL 17.11.
- Four RLS-enabled backend-only tables have no client policies; read-only privilege checks confirmed anon/authenticated have no SELECT or INSERT, while service_role does. No change needed without an approved client access requirement.
- submit_business_proposal(...) is a public SECURITY DEFINER entry point with empty search_path, qualified references, input validation, duplicate detection, and pending-only insertion. Public access appears intentional for add-business; do not revoke blindly. Server-side abuse/rate limiting remains a launch item.
- owner_respond_to_complaint(uuid,text) has authenticated-only EXECUTE and checks auth.uid(), response length, and verified ownership. It lacks an explicit approved-business predicate despite the RLS policy requiring one; PR #34 prepares a tested candidate fix. Its current search_path is public.
- Performance Advisor: 17 unused-index INFO notices and five multiple-permissive-policy WARN notices; do not remove indexes or rewrite policies based only on staging with low workload.
- Health Advisor: no findings.
- No Supabase schema/data/Auth/Storage/Stripe settings, production records, domain, or DNS were changed.

## Remaining ordered work
1. Keep PR #33 and PR #34 as drafts until a complete staging migration plan, current-schema compatibility review, and explicit release decision are completed.
2. PR #33 still needs actual staging schema diff/advisors, Edge Function integration, raw-body Stripe signature tests, plan/status mapping, invoice.payment_failed mapping, and legacy subscription reconciliation/backfill design.
3. PR #34 still needs dependency/ACL review against the full staging schema before any staging application.
4. Continue launch-readiness work: real Auth, Storage upload, and live RLS integration cannot be certified by mocked browser tests. Staging Storage buckets are currently absent; do not create them without an approved test plan.
5. Keep production messaging grant provenance/migration reconciliation as a blocker; do not roll back or reapply blindly.
6. Preserve all users, accounts, businesses, reviews, photos, complaints, messages, payments, and domain/DNS settings. No live Stripe actions or sensitive Auth changes without explicit approval.

Checkpoint recorded at 11:45:22 a.m. Pacific on November 12, 2026. This is a progress record, not release approval.