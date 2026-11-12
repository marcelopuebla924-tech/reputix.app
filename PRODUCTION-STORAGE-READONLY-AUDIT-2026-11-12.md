# Reputix Production Storage — Read-only audit

Date/time: 2026-11-12, 12:10 p.m. Pacific
Project: production Supabase `udvsrmfgjfinwbgvhchs`
Scope: catalog, policy, and aggregate-count queries only. No Storage object names, file contents, user IDs, or private document metadata were selected.

## Buckets
- `business-photos`: private (`public=false`), 5 MiB limit, MIME allowlist image/jpeg, image/png, image/webp.
- `business-verification-private`: private (`public=false`), 5 MiB limit, MIME allowlist image/jpeg, image/png, application/pdf.

## Storage object policies
- Anonymous INSERT to `business-photos` is restricted to `proposals/`, allowed extensions jpg/jpeg/png/webp, and metadata size <= 5 MiB.
- SELECT for anon/authenticated is limited to `business-photos` objects with a matching `public.business_photos.storage_path` row whose status is approved. The bucket itself remains private; the app obtains signed URLs.
- No client-facing storage policy exists for `business-verification-private`. Preserve that isolation; do not add anonymous upload or public read.
- `storage.objects` has RLS enabled. The role-level INSERT/SELECT grants are constrained by these policies; no client DELETE policy was observed.

## Business photo metadata and aggregate counts
- `public.business_photos.status` CHECK allows pending, approved, rejected; `storage_path` is unique.
- Current production aggregate: 2 approved business_photos metadata rows.
- Storage object counts: 3 objects in `business-photos`; 1 object in `business-verification-private`.
- Join integrity aggregate: 1 object in `business-photos` has no matching `business_photos` metadata row; 0 metadata rows lack a matching object.
- No object path, business identity, or private verification document details were inspected. Do not delete the orphan object automatically; determine its origin and retention requirement first.

## Application flow review
- `app.js` validates JPEG/PNG/WebP and 5 MiB client-side, uploads under `business-photos/proposals/<businessId>/<uuid>.<ext>`, then inserts a pending `business_photos` metadata row.
- Approved-photo rendering queries only approved metadata and requests a signed URL for the private object.
- If the object upload succeeds but metadata insertion fails, the current client flow reports an error but has no client DELETE policy to remove the uploaded object. This can leave an orphan object. Do not add a broad client DELETE policy; design a restricted server-side cleanup/reconciliation workflow in an isolated environment.
- Current browser QA uses mocked Storage responses; it does not verify real Storage upload/signing against production.

## Safety and next work
- No bucket, policy, grant, Storage object, metadata row, or private verification document was changed.
- Do not test uploads against production. Verify the end-to-end flow only in an approved isolated Supabase environment with synthetic objects.
- Preserve the private verification bucket and all existing objects. Investigate the single orphan without exposing its path or deleting it.
- Candidate next work: test successful proposal upload, metadata insert failure, MIME/size/path rejections, signed URL access only after approval, and denial for private verification objects; implement cleanup only through a narrowly authorized server-side process.