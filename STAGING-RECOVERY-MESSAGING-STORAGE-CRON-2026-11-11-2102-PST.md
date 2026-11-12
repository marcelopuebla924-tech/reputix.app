# Reputix — messaging grants, Storage and scheduler checkpoint
**Date:** 2026-11-11  
**Time:** 9:02 p.m. Pacific (Los Angeles)  
**Production project:** `udvsrmfgjfinwbgvhchs`  
**Staging project:** `lzcyulncvjjxsyyivlty`

## Scope and safety
Read-only production metadata verification. No ACL, RLS, Storage, cron, schema, data, Auth, Stripe, or domain changes. No Storage objects or user records copied to staging.

## Messaging column-level grants
### business_conversations
For `authenticated`:
- SELECT: id, business_id, customer_id, subject, status, created_at, updated_at.
- INSERT: business_id, customer_id, subject, status.
- No authenticated table-level INSERT/UPDATE/DELETE grant was observed in the explicit relation ACL snapshot; column-level INSERT is deliberately scoped.
For `service_role`: full service access is retained.

### business_messages
For `authenticated`:
- SELECT: id, conversation_id, sender_id, body, created_at, read_at.
- INSERT: conversation_id, sender_id, body.
- UPDATE: read_at only.
- No authenticated table-level UPDATE/DELETE grant; no UPDATE grant on body, sender_id, conversation_id, or created_at.
For `service_role`: full service access is retained.

These column grants must be recreated together with the existing participant RLS policies. Browser tests already assert the read-receipt PATCH payload contains only `read_at`; real two-user RLS integration still needs isolated staging.

## Storage buckets — exact production metadata
Both buckets are private and limited to 5 MiB:
- `business-photos`: `public=false`, allowed MIME types image/jpeg, image/png, image/webp.
- `business-verification-private`: `public=false`, allowed MIME types image/jpeg, image/png, application/pdf.

## Storage object policies — exact observed behavior
Only two policies were returned for the storage schema:
1. `Allow anonymous uploads for business photo proposals`
   - PERMISSIVE; role anon; INSERT.
   - WITH CHECK requires bucket_id='business-photos', object name prefix `proposals/`, extension jpg/jpeg/png/webp, and metadata size <= 5,242,880 bytes.
2. `Public can sign approved business photos`
   - PERMISSIVE; roles anon and authenticated; SELECT.
   - USING requires bucket_id='business-photos' and a matching `public.business_photos.storage_path` row with status='approved'.

No client-facing policy exists for `business-verification-private`. Preserve the bucket's private state and absence of public object policies.

## Production cron scheduler
One active `cron.job` entry was observed:
- jobid 1
- schedule `*/5 * * * *`
- command `SELECT public.reputix_publish_valid_reviews();`
- database postgres; username postgres; localhost:5432
- active=true

This job publishes qualifying pending reviews older than 24 hours. Do not copy/enable this production schedule in staging by default. A staging-only publication test needs disposable reviews/businesses and a verified cleanup plan.

## Reconciliation and next steps
- Preserve messaging column-level grants and RLS together; do not replace them with broad table grants.
- Preserve both private buckets and exact storage object policies.
- Keep verification documents private and service-side only.
- Record cron separately from schema DDL; do not enable in staging until isolated test data and cleanup are ready.
- The staging project remains empty. No schema baseline or Edge Functions have been deployed there.
