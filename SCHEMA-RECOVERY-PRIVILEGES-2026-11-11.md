# Reputix view and routine privilege audit
Date: 2026-11-11 8:30 p.m. PST

## Read-only audit result
Production project `udvsrmfgjfinwbgvhchs` only. No writes or settings changes.

The public schema contains exactly 20 base tables (confirmed by `pg_tables`):
ad_campaigns, ad_clicks, ad_impressions, business_conversations, business_messages, business_monthly_history, business_owner_claims, business_photos, business_promotions, business_subscriptions, business_verification_documents, businesses, complaints, monetization_plans, payment_events, review_ai_moderation, reviews, user_profiles, user_publications, user_subscriptions.

## View privileges
| View | security_invoker | anon SELECT | authenticated SELECT | service_role SELECT |
|---|---|---:|---:|---:|
| business_hourly_patterns | true | yes | yes | yes |
| owner_business_dashboard | not set (owner context) | no | yes | yes |
| owner_business_hourly_patterns | not set (owner context) | no | yes | yes |
| recent_review_highlights | true | yes | yes | yes |
| weekly_business_rankings | true | yes | yes | yes |

Interpretation:
- Three public-facing views explicitly use security_invoker=true, so underlying table privileges/RLS apply to caller.
- Two owner analytics views do not set security_invoker and run with view-owner context; anon has no SELECT, authenticated does. This is consistent with least-privilege migration tracked in GitHub. Preserve this carefully in staging and test cross-business isolation using two disposable owner accounts.
- A grant to authenticated on the owner views does not itself prove safe row filtering; validate view SQL and row-level isolation.

## Routine privileges and security mode
| Routine | SECURITY DEFINER | search_path | anon EXECUTE | authenticated EXECUTE | service_role EXECUTE |
|---|---:|---|---:|---:|---:|
| is_reputix_admin() | no | empty | yes | yes | yes |
| owner_respond_to_complaint(uuid,text) | yes | public | no | yes | yes |
| refresh_business_monthly_history(date) | no | empty | no | no | yes |
| reputix_publish_valid_reviews() | yes | public | no | no | yes |
| submit_business_proposal(11 args) | yes | empty | yes | yes | yes |

Hardening/test notes:
- SECURITY DEFINER routines must be reviewed for fixed search_path and schema-qualified object/function references. owner_respond_to_complaint and reputix_publish_valid_reviews currently set search_path=public; consider hardening in staging only after inspecting dependencies.
- submit_business_proposal has empty search_path and intentionally permits anon/authenticated; stress-test validation, duplicate prevention, and abuse/rate limiting.
- is_reputix_admin is invoker with empty search_path and checks app_metadata; preserve its trust boundary.
- refresh_business_monthly_history is invoker and service_role-only; do not grant client execution.
- Keep production pg_cron scheduler disabled in staging until a disposable fixture-only publication test and cleanup are designed.

## Schema inventory status
- All 20 public base table names confirmed.
- Column/default/nullability/constraint/index extraction has been performed in small batches across these tables. The table-by-table notes are in the two preceding schema recovery documents.
- 35 RLS policies across 16 tables have been captured exactly from pg_policies.
- 5 views and 5 routines have been inventoried.
- Staging remains empty; no migration has been applied.

## Next
1. Verify every extracted index and constraint count against catalog totals (54 indexes, 26 FKs, 37 checks previously measured); reconcile any missing/duplicate counts.
2. Capture effective grants and full view definitions with bounded output.
3. Inspect Storage policies and Edge Function source paths without exposing secrets.
4. Continue seeking original migration source; do not fabricate the missing migration SQL.
5. Prepare a reviewed staging-only baseline only after all dependencies are accounted for.
