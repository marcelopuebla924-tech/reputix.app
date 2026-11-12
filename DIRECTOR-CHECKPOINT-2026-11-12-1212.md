# Reputix Director checkpoint — 2026-11-12 12:12 p.m. Pacific

## Current verified candidate state
- PR #33 remains open, draft, unmerged. Latest exact-head CI: handler contract #28 SUCCESS (Deno type-check + 17/17 Node tests), PostgreSQL atomicity #42 SUCCESS, local PostgREST integration #13 SUCCESS (2/2), Browser QA #483 SUCCESS.
- PR #34 remains open, draft, unmerged. Isolated PostgreSQL owner authorization #4 and Browser QA #438 passed.
- No candidate SQL or Edge Function code has been applied/deployed to Supabase.

## Production Storage read-only audit
- Production has two private buckets: business-photos (5 MiB; JPEG/PNG/WebP) and business-verification-private (5 MiB; JPEG/PNG/PDF). Both remain private.
- Anonymous upload policy for business-photos is restricted to proposals/ paths, allowed image extensions, and <=5 MiB. Anon/authenticated SELECT is limited to objects with approved business_photos metadata. No client-facing policy exists for the private verification bucket.
- business_photos status CHECK is pending/approved/rejected; storage_path unique.
- Aggregate count: 2 approved photo metadata rows, 3 business-photos objects, 1 verification-private object. Read-only join found 1 business-photos object without a metadata row; 0 metadata rows without an object. No object paths or private document details were inspected, and nothing was deleted.
- app.js uploads the Storage object before inserting the pending metadata row. If metadata insert fails, current client code reports the failure but has no client DELETE policy, so an orphan can remain. Do not add broad client DELETE permission; design narrowly scoped server-side cleanup/reconciliation in an isolated environment.
- Full audit saved as PRODUCTION-STORAGE-READONLY-AUDIT-2026-11-12.md.

## Billing/security status
- Production/staging billing constraints match. Production payment_events has global UNIQUE(provider_event_id); production user_subscriptions and payment_events aggregate counts are currently zero. This does not prove Stripe account inventory is empty.
- Production webhook v3 source reviewed read-only. Candidate atomic RPC + Edge Function tests are green locally; no real Stripe account/event or hosted Supabase RPC test yet.
- Candidate includes incomplete_expired status while app entitlements remain active/trialing only. Invoice failure handling recommendation is to preserve Stripe's retrieved status, not synthesize past_due.
- PR #33/#34 remain drafts; PR #35 temporary test-only PR closed without merge. PR #14 remains merged; PRs #30–#32 remain draft/unmerged.

## Next ordered work
1. Hosted Supabase RPC/Edge gateway integration in an approved isolated environment; local PostgREST does not certify Supabase Auth/RLS/gateway behavior.
2. Verify Stripe-side subscription inventory and signed test-mode event flow through an approved connected Stripe test account.
3. Test actual Storage upload, metadata insertion failure, signed URL access only after approval, MIME/size/path rejection, and private verification denial in an isolated Supabase environment.
4. Design restricted server-side cleanup for orphan photo objects; do not delete the existing orphan or add client DELETE policy.
5. Complete staging schema diff/advisors, migration ordering, real Auth, Storage, live RLS, billing, and ad-serving QA.

## Safety
- No production or staging migration, Edge Function deployment/invocation, real Stripe event, Checkout, charge, refund, secret access/change, Dashboard change, Auth/Storage/RLS policy change, object mutation, domain/DNS change, or production data write.
- Preserve all existing accounts, businesses, reviews, photos, verification documents, complaints, messages, and payment records.
- Keep PR #33 and #34 draft until all release gates pass and explicit approval is recorded.

Checkpoint recorded at 12:12 p.m. Pacific on November 12, 2026. Progress record only; not production release approval.