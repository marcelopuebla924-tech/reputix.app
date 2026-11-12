-- Restrict owner-only analytics views to read-only access for signed-in users.
-- The app reads these views only after an owner has signed in and has an active plan.
-- The views themselves continue to enforce auth.uid(), verified ownership,
-- approved business status, and active/trialing subscription status.

REVOKE ALL PRIVILEGES ON TABLE
  public.owner_business_dashboard,
  public.owner_business_hourly_patterns
FROM anon;

REVOKE ALL PRIVILEGES ON TABLE
  public.owner_business_dashboard,
  public.owner_business_hourly_patterns
FROM authenticated;

GRANT SELECT ON TABLE
  public.owner_business_dashboard,
  public.owner_business_hourly_patterns
TO authenticated;

-- service_role and postgres owner privileges are intentionally unchanged.

-- Rollback (only if the app's owner dashboard unexpectedly requires old grants):
-- GRANT ALL PRIVILEGES ON TABLE public.owner_business_dashboard,
--   public.owner_business_hourly_patterns TO anon;
-- GRANT ALL PRIVILEGES ON TABLE public.owner_business_dashboard,
--   public.owner_business_hourly_patterns TO authenticated;
