# Reputix staging Storage setup — 2026-11-11

## Current staging state
- The two Storage object policies below have been applied in staging migration `staging_storage_object_policies_20261111`.
- Staging currently has **zero buckets**. The connected Supabase actions available in this workflow do not expose bucket create/update operations, so bucket creation/configuration remains a separate Storage API/Dashboard step.
- No production objects or files were copied.

## Buckets to create in staging
| Bucket | Public | Max file size | Allowed MIME types |
|---|---:|---:|---|
| `business-photos` | false | 5 MiB | image/jpeg, image/png, image/webp |
| `business-verification-private` | false | 5 MiB | image/jpeg, image/png, application/pdf |

Do not make either bucket public. Verification documents must remain private and must not have client-facing object policies.

## Policies already applied
1. `Allow anonymous uploads for business photo proposals`: anon INSERT only into `business-photos`, object path must begin `proposals/`, extension jpg/jpeg/png/webp, metadata size <= 5,242,880 bytes.
2. `Public can sign approved business photos`: anon/authenticated SELECT only from `business-photos` when matching `public.business_photos.storage_path` has `status='approved'`.

Exact SQL is in `STAGING-STORAGE-POLICIES-2026-11-11.sql`.

## Validation still required after buckets are created
- Upload a small synthetic JPEG/PNG/WebP to `business-photos/proposals/` as anon; confirm upload succeeds.
- Attempt upload to another prefix and invalid extension; both must fail.
- Attempt an object larger than 5 MiB; it must fail at bucket limit.
- Confirm anon/authenticated cannot read a pending photo.
- Mark a synthetic photo approved in staging and confirm read access works only for its exact storage path.
- Confirm `business-verification-private` remains private and anon/authenticated cannot list, upload, or download documents.
- Delete all synthetic objects after testing.

## Production boundary
No production bucket settings, Storage policies, or objects were changed. Do not copy the cron job or enable pg_cron in staging as part of Storage setup.
