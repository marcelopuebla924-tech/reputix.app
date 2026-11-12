-- STAGING ONLY: Storage object policies for Reputix.
-- Buckets must be created separately using Supabase Storage APIs.
-- Do not apply this file to production.
CREATE POLICY "Allow anonymous uploads for business photo proposals"
ON storage.objects AS PERMISSIVE
FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'business-photos'
  AND name LIKE 'proposals/%'
  AND storage.extension(name) = ANY (ARRAY['jpg','jpeg','png','webp'])
  AND COALESCE((metadata ->> 'size')::bigint, 0) <= 5242880
);

CREATE POLICY "Public can sign approved business photos"
ON storage.objects AS PERMISSIVE
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'business-photos'
  AND EXISTS (
    SELECT 1
    FROM public.business_photos bp
    WHERE bp.storage_path = objects.name
      AND bp.status = 'approved'
  )
);
