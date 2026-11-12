# Reputix Director checkpoint — 2026-11-12 12:22 p.m. PST

## Objective 1: owner complaint RPC staging validation

### Verified in staging (project `lzcyulncvjjxsyyivlty`)
- `public.owner_respond_to_complaint(uuid,text)` is SECURITY DEFINER, owned by postgres, and has pinned `search_path=''`.
- Function definition checks the caller's `auth.uid()`, requires a verified owner claim, and now also requires `businesses.status='approved'` before updating a complaint response.
- Execution privileges verified: anon=false, authenticated=true, service_role=true.
- The staging migration was already applied successfully in the preceding checkpoint. This checkpoint records fresh read-only verification of the function body and ACL.

### Test status
- PR #34 contains a disposable PostgreSQL 17 integration fixture and expanded authorization tests. Its workflow run #4 passed on candidate head `68f3f2b87b97312e4cfc26f1f14f99931c1be62d` (previously recorded).
- Attempted an additional transaction-scoped staging smoke test using synthetic IDs. The staging schema requires business-owner claims to reference a real `auth.users` row and constrains `verification_level` to `activity`, `business_responsible`, or `owner`. The attempted insert was rejected by the constraint before the RPC was invoked; no test record was committed and no existing user/business/complaint was changed.
- Therefore live staging positive/negative RPC integration testing remains NOT completed. Do not describe this as a staging integration pass.

### Safety and next action
- No production database changes, user-data changes, RLS changes, or Auth settings changes were made in this step.
- Do not weaken foreign keys or constraints to force a test. Prefer extending/running the isolated PostgreSQL 17 fixture against the exact staging schema shape, or create a properly disposable test identity only after confirming a safe cleanup path.
- PR #34 remains a candidate; do not merge or promote to production until staging-equivalent tests and owner-verification workflow review are complete.

## Next objective
Compare GitHub main source of `supabase/functions/reputix-ai/index.ts` with deployed production `reputix-ai` version 22, then validate CORS allowlist/preflight and authorization paths before considering any deployment. Production function is currently known to return wildcard CORS while GitHub main has an explicit origin allowlist; no deployment is authorized by this checkpoint.
