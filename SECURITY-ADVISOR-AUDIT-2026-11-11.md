# Reputix Supabase Security Audit — 2026-11-11 (read-only)

Project ref: `udvsrmfgjfinwbgvhchs`
Status: findings recorded; **no database changes applied**.

## 1. Messaging permissions — proposed fix saved separately
- `business_conversations` and `business_messages` both have RLS enabled.
- No triggers are installed on these two tables.
- `business_messages` has table-level ALL grants for `anon` and `authenticated`.
- The authenticated UPDATE policy is intended for marking received messages read, but table-level UPDATE currently covers every column.
- Current frontend PATCH sends only `read_at`.
- A least-privilege SQL proposal is saved in `SECURITY-MESSAGING-LEAST-PRIVILEGE-PROPOSAL-2026-11-11.md`; not applied.

## 2. Supabase Security Advisor findings
Read-only Security Advisor returned:
- ERROR: `public.owner_business_dashboard` and `public.owner_business_hourly_patterns` are SECURITY DEFINER views.
- WARN: `public.submit_business_proposal(...)` is SECURITY DEFINER and EXECUTE is granted to PUBLIC/anon/authenticated.
- WARN: `public.owner_respond_to_complaint(uuid,text)` is SECURITY DEFINER and executable by authenticated.
- WARN: leaked-password protection is disabled in Auth.
- INFO: RLS-enabled tables with no policies: `business_monthly_history`, `business_verification_documents`, `payment_events`, `review_ai_moderation`.

## 3. Additional read-only inspection
- Both owner views are granted SELECT to authenticated; their definitions filter by `auth.uid()`, verified owner claim, approved business, and active/trialing subscription. The hourly view also requires Pro and at least three published reviews per hour.
- The views have no `security_invoker=true` reloption; advisor flags them as SECURITY DEFINER.
- `owner_respond_to_complaint` explicitly checks `auth.uid()`, validates response length, and updates only a complaint tied to a verified owner claim. It has `search_path=public`; this should be hardened/qualified before treating as complete.
- `submit_business_proposal` uses an empty search_path and schema-qualified references, validates required fields and lengths, checks duplicates, and inserts proposals as pending. Public execution may be intentional for unauthenticated proposals; confirm before changing grants.
- Four RLS-enabled tables without policies may be intentionally inaccessible. Do not add broad policies just to clear the advisor.

## 4. Change-control restrictions
Do not change:
- RLS policies, grants, views, SECURITY DEFINER functions, Auth leaked-password setting, or production data without explicit approval for each change.
- Stripe live mode, prices, payouts, webhook destination, domain, or DNS.

## 5. Next review sequence
1. Review the owner views against the underlying RLS policies and test the owner-identity filters with synthetic accounts before deciding whether to convert to SECURITY INVOKER.
2. Review all callers of `submit_business_proposal` before narrowing EXECUTE; preserve anonymous proposal submission if it is a product requirement, with safe validation and rate limiting.
3. Harden `owner_respond_to_complaint` search_path and schema qualification after compatibility review.
4. Confirm the four no-policy tables are intentionally inaccessible and inspect their grants before any change.
5. Treat Auth leaked-password protection as an Auth security setting requiring explicit approval.

No schema writes, permission changes, policy changes, data changes, account creation, or billing operations were performed in this audit.
