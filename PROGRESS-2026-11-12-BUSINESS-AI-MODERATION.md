# Reputix progress — 12 November 2026, 1:02 p.m. Pacific

## Completed
- Approved business listing `New York market y deli` (business ID `166b5222-e3ab-4920-9f07-79acfa084a6f`) after the user's explicit authorization. It remains separate from owner/document verification.
- Added nullable `businesses.cover_image_url` for a public storefront cover asset.
- Added `public.business_ai_moderation` with RLS enabled, admin-only read policy, service-role write access, constrained outcomes (`clear`, `needs_review`, `high_risk`), confidence, reasons, model and assessor metadata.
- Deployed active Supabase Edge Function `reputix-business-moderation` (JWT required). Admin-only `list` and `assess` modes; AI assessment is advisory and never approves or rejects a business automatically.
- Added an admin-only business moderation panel to the site and wired the AI assessment queue.
- Updated business cover rendering to use `cover_image_url` when a public image URL is present, preserving approved photo gallery behavior.
- User rejected the previously generated illustrative storefront image. Do not use it. The user supplied the correct real storefront photo in this conversation (original 768x1024 PNG); this is the only approved image for the business. The photo has not yet been uploaded to Supabase Storage or connected to the public listing.

## GitHub
- Repo: `marcelopuebla924-tech/reputix.app`, branch `main`.
- App code commit: `acd37866f913b3f11800c2891f5e9895243b75a0`.
- Admin panel commit (branch head at checkpoint): `5fda85330c8a98feec569cc1e81994dc8d4ccdfd`.

## Not yet completed / important distinction
- The user's exact storefront photo has **not yet** been uploaded to the private Supabase `business-photos` bucket or published to a public asset URL. Therefore `cover_image_url` remains null and no replacement photo is live yet. Never use the previously generated image. The existing business-photo upload flow can accept the supplied original photo; once uploaded and approved, the existing approved-photo renderer will show it in the cover and gallery/card. For the dedicated cover field, set `businesses.cover_image_url` to the verified public URL after the approved upload.
- No owner claim or address-proof document was approved. Tamos Chelo's pending address document remains untouched.
- Admin AI endpoint/UI requires a signed-in account whose Supabase app metadata contains `reputix_role=admin`; the function is deployed, but an authenticated end-to-end AI assessment was not run in this session.
- Supabase security advisor still reports pre-existing warnings elsewhere; the new moderation table has an admin-only read policy and a service-role-only write path.


## User correction — 12 November 2026, 1:08 p.m. Pacific
- User supplied the actual New York Market & Deli storefront photo and explicitly instructed: use this photo, not the prior generated image. This instruction supersedes the prior illustrative asset. The original uploaded image path in the current working session was `/mnt/data/47723278ed23d0d0cdda5f0a1f97c0ce5ecf31fd59d569bb5f12206da85e98f6.png` (768×1024 PNG). Do not claim it is live until the exact file has been uploaded and the business record/photo status verified.
