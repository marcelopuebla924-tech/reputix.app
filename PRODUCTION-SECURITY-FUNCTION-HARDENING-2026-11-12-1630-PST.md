# Reputix Production Hardening Follow-up — 2026-11-12 4:30 p.m. PST

## Completed
- Browser QA #496 attempt 2 passed in full.
- Pages deployment #647 passed.
- Production owner analytics views were aligned with staging:
  - public.owner_business_dashboard: security_invoker=true
  - public.owner_business_hourly_patterns: security_invoker=true
- Confirmed view SQL definitions were identical across environments.
- Confirmed relevant grants and RLS policy definitions for business_owner_claims, businesses, reviews, and user_subscriptions matched between production and staging.
- No application data was changed by the view hardening.

## SECURITY DEFINER review
Inspected public.owner_respond_to_complaint(uuid,text):
- Its authorization predicate requires auth.uid() and a verified owner claim for the complaint's business.
- It validates response length and only updates the matching complaint.
- All table references are schema-qualified (public.*) and auth.uid() is schema-qualified.
- It previously had search_path=public, which was unnecessary and creates avoidable object-shadowing risk.

Applied the narrow function-level hardening:
```sql
ALTER FUNCTION public.owner_respond_to_complaint(uuid, text) SET search_path = '';
```
Immediate catalog verification confirms proconfig = {search_path=""}. The function body was not rewritten; no ACL was changed; no records were changed.

Inspected public.submit_business_proposal(...):
- It already uses search_path='' and schema-qualified public.businesses plus pg_catalog built-ins.
- It validates required fields, maximum lengths, duplicate pending/approved proposals, and inserts proposals with status='pending'.
- Its anon/authenticated EXECUTE exposure appears intentional for public business proposals; do not revoke without product-flow validation.

## Remaining advisor findings
- Four RLS-enabled tables have no policies: business_monthly_history, business_verification_documents, payment_events, review_ai_moderation. This may be intentional service-role-only isolation; inspect service usage before adding policies.
- Leaked-password protection remains disabled; this is an Auth dashboard setting and was not changed.
- Keep Stripe live mode, pricing, payout settings, webhook destinations, and Auth settings untouched.

## Next verification
- Re-run browser QA after the latest production hardening and documentation commit.
- Verify the owner complaint response workflow in a controlled test (existing browser QA includes a mocked authorized RPC flow; no production complaint was modified).
- Continue the least-privilege review of RLS-free tables and PR #33/#34.
