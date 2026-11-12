# Reputix Security Change Log — 2026-11-12 4:25 p.m. PST

## Confirmed quality gate
- Browser QA run #496, attempt 2: success.
- GitHub Pages deployment #647: success.
- Browser QA run URL: https://github.com/marcelopuebla924-tech/reputix.app/actions/runs/43297869078
- Pages run URL: https://github.com/marcelopuebla924-tech/reputix.app/actions/runs/43297869704

## Production view hardening applied
Compared production and staging definitions for:
- public.owner_business_dashboard
- public.owner_business_hourly_patterns

The SQL definitions, referenced tables, owner authorization predicates, subscription checks, and output columns were identical. Staging already had security_invoker=true; production did not.

Compared grants and RLS policies on the dependent tables (business_owner_claims, businesses, reviews, user_subscriptions). The policy sets and relevant grants matched between production and staging. Both views were granted SELECT to authenticated; no anon SELECT grant was found for the views.

Applied only this transactional, data-preserving production change:
```sql
BEGIN;
ALTER VIEW public.owner_business_dashboard SET (security_invoker = true);
ALTER VIEW public.owner_business_hourly_patterns SET (security_invoker = true);
COMMIT;
```

Immediate catalog verification confirmed both production views now have reloptions = {security_invoker=true}, matching staging.

## Impact and rollback
- No table rows were inserted, updated, or deleted.
- No users, reviews, businesses, photos, storage objects, or payment records changed.
- This makes the views evaluate using the querying user's permissions and underlying RLS policies instead of relying on the view owner's privileges.
- Rollback, only if an application regression is demonstrated and after review:
```sql
ALTER VIEW public.owner_business_dashboard RESET (security_invoker);
ALTER VIEW public.owner_business_hourly_patterns RESET (security_invoker);
```

## Next
1. Run a focused authenticated owner dashboard / hourly analytics check, especially with verified claims and Basic/Pro plan access.
2. Re-run browser QA after the docs-only checkpoint commit if workflows are triggered.
3. Continue the Supabase security advisor review by validating each SECURITY DEFINER function's search_path, execute grants, and authorization.
4. Do not bulk-disable or rewrite RLS policies. Keep PR #33 and #34 as drafts until separately reviewed.
