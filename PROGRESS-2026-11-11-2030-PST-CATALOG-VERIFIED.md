# Reputix staging recovery checkpoint
Date: 2026-11-11, 8:30 p.m. PST

## Confirmed catalog totals (read-only production inspection)
Project: `udvsrmfgjfinwbgvhchs`.

- Public base tables: 20
- RLS-enabled public base tables: 20
- Public RLS policies: 35 (16 tables)
- Public indexes: 54
- Public constraints by PostgreSQL catalog type:
  - CHECK: 40
  - FOREIGN KEY: 24
  - PRIMARY KEY: 20
  - UNIQUE: 9
  - Total constraints: 93
- Public views: 5
- Public routines: 5
- Active Edge Functions: 4

Correction to earlier working estimates: the exact catalog count is 24 foreign keys and 40 CHECK constraints, not the previously noted 26 and 37. Use these exact numbers in future staging reconciliation.

## Storage buckets (both private)
- `business-photos`: private; max 5,242,880 bytes; MIME allowlist image/jpeg, image/png, image/webp.
- `business-verification-private`: private; max 5,242,880 bytes; MIME allowlist image/jpeg, image/png, application/pdf.

## Exact Storage object policies
Only two policies returned from `pg_policies` for schema storage:
1. `Allow anonymous uploads for business photo proposals`: anon INSERT only; bucket business-photos; object key must begin `proposals/`; extension jpg/jpeg/png/webp; metadata size <= 5 MiB.
2. `Public can sign approved business photos`: anon/authenticated SELECT only for business-photos objects whose name matches a `business_photos.storage_path` row with status approved.

No client-facing storage policy exists for `business-verification-private`. Preserve this private isolation. The bucket itself is not public; approved photos are accessed through the narrowly scoped signed-object policy.

## Active Edge Function inventory
- reputix-ai v22, verify_jwt=true
- tamos-cover-once v10, verify_jwt=false
- create-checkout-session v8, verify_jwt=true
- stripe-webhook v3, verify_jwt=false

Do not copy production secrets or Stripe live configuration to staging. Inspect source and dependencies without echoing credentials into logs/docs. Deploy only separate staging-specific configuration after review.

## Safety
All work in this checkpoint was read-only against production. No DDL, DML, Auth, Storage, domain, or Stripe settings changed. Staging remains empty; no migrations applied.

## Next actions
1. Inspect the four Edge Function source trees and their required environment-variable names, documenting names only (never values).
2. Review missing historical migration SQL recovery and confirm baseline feasibility.
3. Build staging-only schema after dependencies, policies, grants, storage, and function contracts are fully reconciled.
4. Run isolated tests with disposable identities and data. Do not use real customers or production payment mode.
