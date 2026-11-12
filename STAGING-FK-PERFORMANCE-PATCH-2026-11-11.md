# Reputix staging foreign-key performance patch — 2026-11-11

Applied only to isolated staging as migration `staging_fk_performance_indexes_20261111`.

Five indexes added to cover foreign keys flagged by Supabase Performance Advisor:
- `business_messages(sender_id)`
- `business_owner_claims(user_id)`
- `business_verification_documents(business_id)`
- `user_subscriptions(plan_code)`
- `user_subscriptions(user_id)`

The production-parity baseline remains 54 indexes; staging now has 59 after this separately tracked optimization. No production indexes were changed.

Post-patch Performance Advisor no longer reports unindexed foreign keys. It reports 28 unused indexes because staging has no representative workload; do not remove them based on an empty test database. Five multiple-permissive-policy warnings reflect the existing permissive policy sets and their OR semantics; preserve them unless a behavior-equivalent policy redesign is proven with tests.
