# Reputix — Read-only Security & Auth Review
Date: 2026-11-11
Review window: approximately 17:32–17:36 PDT
Supabase project: `udvsrmfgjfinwbgvhchs`

## Scope and safety
This was a read-only inspection of the existing frontend authentication code, PostgreSQL metadata, function/view definitions, and Supabase Security / Performance / Health Advisors.

No SQL DDL/DML, grants, policies, table changes, account changes, Auth settings, Stripe settings, or production records were changed. No real sign-up, password reset, proposal, complaint response, or billing operation was submitted.

## Frontend authentication fixes made
1. Added a shared in-flight promise around recovery-link OTP verification. The app invokes recovery handling from several page lifecycle events and twice during initialization; without a guard, overlapping calls could consume the same single-use token more than once.
2. Added local-session sign-out that immediately clears this browser's stored session and requests Supabase `/auth/v1/logout?scope=local` with the current access token. This explicitly avoids logging the user out of every device. The UI warns if local sign-out succeeded but remote revocation could not be confirmed.
3. Added isolated Playwright tests for one-time recovery verification, password update using the verified recovery token, local-only session revocation, and sign-up/email-confirmation/sign-in/session restoration. These tests use mocked Auth endpoints and synthetic identities only.

## Supabase Security Advisor findings

### ERROR — two SECURITY DEFINER views
- `public.owner_business_dashboard`
- `public.owner_business_hourly_patterns`

Both views are currently SECURITY DEFINER (view `reloptions` did not include `security_invoker=true`). Their ACLs showed SELECT for `authenticated`, not `anon`. Their definitions explicitly require:
- the current `auth.uid()` to own a `verified` business claim;
- an approved business;
- an active or trialing paid subscription;
- Pro status for hourly patterns.

These predicates are meaningful safeguards, but the views still run with owner privileges and Supabase flags them as an ERROR. Recommended future remediation is a carefully tested Postgres 15+ `security_invoker=true` migration, after verifying all underlying grants and RLS behavior. **Not changed** because database/schema/permission changes are outside current authorization.

### WARN — public SECURITY DEFINER RPC
- `public.submit_business_proposal(...)` is executable by `PUBLIC`, `anon`, and `authenticated`.
- It has an empty search_path, schema-qualified table references, field length validation, duplicate detection, and creates new businesses with `status='pending'`.
- This public access appears intentional for community business proposals. However, the browser honeypot is only checked in frontend JavaScript and is not passed to or validated by the database function. A direct RPC caller can bypass that client-side honeypot. Server-side abuse protection (e.g. CAPTCHA / edge gateway / rate limiting) should be designed before broad public launch. No function, grant, schema, or setting was changed.

### WARN — authenticated SECURITY DEFINER RPC
- `public.owner_respond_to_complaint(uuid,text)` is executable by `authenticated`.
- It checks `auth.uid()`, bounds the response length, and updates only a complaint belonging to a business with a `verified` owner claim for that user.
- Its configured search_path is `public`; neither `anon` nor `authenticated` has CREATE privilege on `public` in the inspected project, which reduces object-shadowing risk. Still worth reviewing whether it can be changed to an empty search_path with all objects schema-qualified during a future approved migration.

### WARN — leaked-password protection disabled
Supabase Security Advisor reports `auth_leaked_password_protection` as disabled. Supabase documentation recommends enabling it so Auth rejects passwords known to have been compromised. This is an Auth setting, so it was **not changed**. It remains a launch-readiness item requiring explicit owner authorization.

### INFO — four RLS-enabled tables have no policies
- `public.business_monthly_history`
- `public.business_verification_documents`
- `public.payment_events`
- `public.review_ai_moderation`

Read-only checks found no policies and no direct table grants to `anon` or `authenticated` for these tables. They therefore appear intentionally restricted to backend/privileged access. Do not add broad policies just to silence the informational advisor.

## Performance Advisor findings
- Five foreign keys lack covering indexes: `business_messages.sender_id`, `business_owner_claims.user_id`, `business_verification_documents.business_id`, and two `user_subscriptions` foreign keys (`plan_code`, `user_id`).
- Twelve indexes were reported as unused in the observed statistics window. Do not drop them based on this alone; low-traffic launch workloads may not have exercised them.
- Five tables have multiple permissive SELECT policies. Review policy overlap and query plans before any consolidation.
- Health Advisor returned no findings.

## Test status at review time
- Recovery flow fix was covered by Browser QA run #93, which passed and reported no page errors.
- New local sign-out and complete mocked sign-up/sign-in/session-restore tests were added after run #93; their newer CI run is pending.
- These browser tests are mocked integration tests, not proof that real Supabase Auth email delivery, SMTP, redirect allowlists, CAPTCHA, or live RLS works end-to-end.

## Required future decisions (not performed)
1. Approve and schedule a separate migration for both SECURITY DEFINER views, after reviewing all dependent grants and owner dashboard behavior.
2. Decide how to add server-side anti-abuse protection to public business proposals without opening public table access.
3. Review the authenticated complaint-response RPC and potentially harden its search_path in an approved migration.
4. Explicitly authorize enabling leaked-password protection in Supabase Auth settings.
5. Run isolated real Auth / RLS tests only when a safe staging project and synthetic test accounts are available.


## Reputix AI Edge Function review and correction

The deployed `reputix-ai` function was inspected read-only (before correction) and then received one narrowly scoped code fix:
- The function is ACTIVE, `verify_jwt=true`, and validates the supplied user token against Supabase Auth before processing.
- Conversational assistant mode checks the user's server-side subscription and requires an active/trialing Pro subscription; the admin exception uses trusted `app_metadata`.
- Admin moderation queue mode requires the trusted `reputix_role=admin` claim.
- Individual moderation mode checks that the requested review belongs to the signed-in user and is still pending. The AI result is explicitly advisory; it does not publish, reject, or alter the review's status.
- Public business context is restricted to approved businesses and published review samples.

**Correction deployed:** the `cleanText` helper contained double-escaped regular expressions. This meant it did not collapse whitespace or replace control characters as intended. Corrected the expressions, ran five local helper checks (control characters, whitespace, literal escape sequences, max length, non-string input), and deployed version 22 with `verify_jwt=true`. The function source, which was previously absent from the repository, is now tracked at `supabase/functions/reputix-ai/index.ts`. Read-after-deploy confirmed version 22 contains the corrected expressions and no longer contains the buggy pattern. No secrets or database settings were changed.

**Remaining cost-abuse risk:** authenticated users can call `translate` with arbitrary text and can request advisory moderation for their own pending reviews. These modes do not currently enforce per-user rate limits or quotas in this function. This could permit excessive OpenAI usage. Rate limiting / abuse controls should be designed and tested before a broad public launch. No new database tables, policies, settings, or quotas were added.

## Supabase documentation consulted
- Password security and leaked-password protection: https://supabase.com/docs/guides/auth/password-security
- Production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Sign-out scopes: https://supabase.com/docs/guides/auth/signout
- Supabase Security Advisor remediation links are included in the live Advisor output.
