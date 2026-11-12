# Reputix — production/staging extension comparison
**Date:** 2026-11-11  
**Time:** 9:07 p.m. Pacific (Los Angeles)

## Read-only comparison
Production project: `udvsrmfgjfinwbgvhchs`  
Staging project: `lzcyulncvjjxsyyivlty`

## Installed extensions observed in production
- plpgsql 1.0 (pg_catalog)
- supabase_vault 0.3.1 (vault)
- pg_cron 1.6.4 (pg_catalog)
- pg_stat_statements 1.11 (extensions)
- pgcrypto 1.3 (extensions)
- uuid-ossp 1.1 (extensions)

## Installed extensions observed in staging
- plpgsql 1.0 (pg_catalog)
- supabase_vault 0.3.1 (vault)
- pg_stat_statements 1.11 (extensions)
- pgcrypto 1.3 (extensions)
- uuid-ossp 1.1 (extensions)

## Difference
- `pg_cron` is installed in production but not staging.
- This is intentional for the current empty staging baseline: do not install or enable a recurring review-publication job there until isolated test data and cleanup are prepared.
- All five other observed installed extensions match by name, version, and schema.

## Safety and next action
- No extension was installed, removed, or updated.
- Staging remains empty (zero public tables, zero migrations, zero Edge Functions).
- Before any staging baseline DDL, verify extension dependencies from the actual table/function definitions. If the baseline does not require pg_cron, keep it absent. If later testing requires it, install only in staging after reviewing its cost/behavior and keep the production scheduler separate.
