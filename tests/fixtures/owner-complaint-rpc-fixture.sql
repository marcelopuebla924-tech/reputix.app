-- Disposable PostgreSQL fixture only. Never run against Supabase.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TABLE public.businesses (
  id uuid PRIMARY KEY,
  status text NOT NULL
);
CREATE TABLE public.business_owner_claims (
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','activity_verified','responsible_verified','verified','rejected'))
);
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  business_response text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.businesses(id,status) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','approved'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','approved'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','pending');
INSERT INTO public.business_owner_claims(business_id,user_id,status) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','verified'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','verified'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','pending'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','55555555-5555-4555-8555-555555555555','activity_verified'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','66666666-6666-4666-8666-666666666666','responsible_verified'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','44444444-4444-4444-8444-444444444444','verified');
INSERT INTO public.complaints(id,business_id) VALUES
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','cccccccc-cccc-4ccc-8ccc-cccccccccccc');

GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;
