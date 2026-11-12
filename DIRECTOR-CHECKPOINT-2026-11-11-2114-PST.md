# Reputix — Director Checkpoint
**Date/time:** 11 November 2026, 9:14 p.m. PST (America/Los_Angeles)

## Project / safety baseline
- Repository: `marcelopuebla924-tech/reputix.app`, branch `main`.
- Supabase staging: `lzcyulncvjjxsyyivlty`.
- Supabase production: `udvsrmfgjfinwbgvhchs`.
- Latest previously recorded project commit: `f2b7fac14c2e65b64631b23745ccd591ca85b9f8`.
- This continuation performed read-only staging verification only. No production changes.
- Preserve all production data, accounts, reviews, businesses, photos, domain/DNS, Stripe live configuration, and sensitive Auth settings. Do not change production schema/security without scoped approval and rollback plan.

## Staging verification at 9:14 p.m. PST
Read-only catalog query returned:
- 20 public tables
- 5 public views
- 35 public RLS policies
- 59 public indexes
- 5 public routines
- 0 Storage buckets
- 0 Storage objects

The previous staging baseline remains deployed:
- RLS enabled on all 20 tables.
- Two Storage object policies exist, but there are still no buckets.
- No staging Edge Functions were previously deployed.
- Synthetic QA business/review records were cleaned up in the prior checkpoint.
- Owner cross-business isolation tests and complaint-response authorization tests remain pending.
- Stripe test-mode checkout/subscription flow remains pending.
- Frontend E2E/browser checks remain pending; do not claim all UI buttons are verified.

## Fresh advisor scan
Security Advisor:
- 4 INFO findings: RLS-enabled backend-only tables without client policies (`business_monthly_history`, `business_verification_documents`, `payment_events`, `review_ai_moderation`); expected with current service-only access.
- 1 anon-executable SECURITY DEFINER warning: `submit_business_proposal`; public proposal submission is intentional but needs abuse/rate-limit review before launch.
- 2 authenticated SECURITY DEFINER findings, including `owner_respond_to_complaint` and `submit_business_proposal`; validate verified owner A, owner B, and unverified user before release.

Performance Advisor:
- 17 unused-index INFO findings, expected on staging with little/no workload; do not remove indexes based on this alone.
- 5 multiple-permissive-policy warnings; preserve current OR semantics until equivalent policy redesign is tested.
- Previously added five FK performance indexes remain present; no unindexed-FK warning was reported in the prior verification.

## Blockers / next execution order
1. Create the two private buckets using Supabase Storage Dashboard/API (connector currently exposes no bucket create/update action):
   - `business-photos`: private, max 5 MiB, JPEG/PNG/WebP.
   - `business-verification-private`: private, max 5 MiB, JPEG/PNG/PDF.
   - Do not create public buckets or client-facing policies for verification documents. Do not write to Storage system tables.
2. Test photo proposal uploads, path prefix restrictions, MIME/size limits, and visibility only for approved business photos; test verification documents remain private. Clean synthetic objects after tests.
3. Create two synthetic Auth users through supported Auth Admin/API/UI, then test cross-business owner isolation for dashboard/hourly views and messaging.
4. Test `owner_respond_to_complaint` as verified Owner A, Owner B, and unverified user.
5. Deploy and test staging Edge Functions and frontend E2E/browser flows.
6. Exercise subscription/checkout only in Stripe test mode. Do not change live Stripe settings.

## Important note
Supabase tool discovery during this continuation found no exposed Storage bucket or Auth-user create/update actions. Do not improvise by writing to Supabase internal Storage/Auth tables. If no supported API action becomes available, guide the operator through the Dashboard for bucket creation and synthetic test-user setup.

## Continuity
Resume from this checkpoint without repeating completed baseline catalog, RLS, grant, or proposal/review smoke tests. Work only on the outstanding blockers above, keep a dated audit trail, and preserve the production guardrails.
