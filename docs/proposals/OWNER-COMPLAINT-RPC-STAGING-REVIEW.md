# Owner complaint RPC hardening — staging review

Review date: 2026-11-12 11:46 a.m. Pacific
Status: candidate only; no Supabase change has been applied.

## Read-only staging facts
- The existing function is public.owner_respond_to_complaint(uuid,text), owned by postgres, SECURITY DEFINER, with search_path=public.
- Current function EXECUTE ACL observed: postgres, authenticated, and service_role. No anon or PUBLIC execute privilege was observed.
- The existing function checks auth.uid(), validates response length (3–3000 characters), and requires a matching business_owner_claims row with status=verified. It updates complaints.business_response and complaints.updated_at.
- The function does not check businesses.status. The existing RLS UPDATE policy for complaints explicitly requires both a verified owner claim and businesses.status='approved'. Because the function is SECURITY DEFINER, it does not safely inherit that caller's RLS boundary; the RPC must enforce the same predicate itself.
- business_owner_claims.status is constrained to pending, activity_verified, responsible_verified, verified, rejected. The candidate accepts only verified, matching the RLS predicate.
- complaints.updated_at is NOT NULL and complaints.business_response exists. businesses.status is text; the public business SELECT policy identifies approved as the publishable state.
- Direct objects referenced by the PL/pgSQL body are auth.uid(), public.complaints, public.business_owner_claims, and public.businesses. PostgreSQL's dependency catalog does not reliably record table references embedded in PL/pgSQL source bodies; these references were checked directly in the function definition.

## Candidate review
- Pins search_path to empty and qualifies auth.uid(), public tables, and pg_catalog built-ins.
- Enforces verified claim and approved business in the UPDATE predicate, matching the existing complaints UPDATE RLS policy.
- Retains SECURITY DEFINER because the existing RPC relies on privileged table access. Owner remains postgres under CREATE OR REPLACE.
- Explicitly revokes PUBLIC and anon, then grants authenticated and service_role, matching the observed intended execution surface. postgres remains the owner.
- Does not modify RLS policies, table grants, table schema, data, or Auth.

## Isolated test suite
- Disposable PostgreSQL 17 fixture; no Supabase connection.
- Positive verified owner on approved business.
- Cross-business owner denied.
- pending, activity_verified, and responsible_verified claims denied.
- verified owner on a non-approved business denied.
- anon and null identity denied.
- Too-short, whitespace-only, and over-3000-character responses denied.
- Execute grants checked: anon=false, authenticated=true, service_role=true.

## Remaining release gates
- Latest expanded test run must complete successfully on the exact candidate head after the additional test cases.
- Review actual owner-claim and business verification workflows to ensure only the intended final state is 'verified' and the approved status remains the publication gate.
- Review function owner/dependencies and migration ordering in a complete staging schema migration before any apply.
- Do not merge or apply this candidate based only on isolated tests. No production or staging writes are authorized by this review.