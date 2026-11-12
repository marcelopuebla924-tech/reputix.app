# Reputix production routines — exact catalog snapshot
Date: 2026-11-11 (PST)
Read-only source: pg_proc / pg_namespace / pg_get_functiondef on production project udvsrmfgjfinwbgvhchs.
All five public routines owned by postgres. No production changes.

## is_reputix_admin()
- Returns boolean; SQL; STABLE; SECURITY INVOKER.
- search_path is empty.
- Definition:
```sql
CREATE OR REPLACE FUNCTION public.is_reputix_admin()
RETURNS boolean LANGUAGE sql STABLE SET search_path TO ''
AS $function$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'reputix_role') = 'admin', false);
$function$;
```

## owner_respond_to_complaint(p_complaint_id uuid, p_response text)
- Returns void; PL/pgSQL; SECURITY DEFINER; search_path=public.
- Checks auth.uid() exists; response is 3–3000 chars; updates only a complaint whose business has a verified owner claim for auth.uid(); raises if unauthorized/not found.
- Security hardening candidate for staging: empty search_path and fully qualified auth.uid() references. Do not alter production without explicit review/approval.
- Definition:
```sql
CREATE OR REPLACE FUNCTION public.owner_respond_to_complaint(p_complaint_id uuid, p_response text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión para responder.'; end if;
  if p_response is null or char_length(btrim(p_response)) < 3 or char_length(p_response) > 3000 then
    raise exception 'La respuesta debe tener entre 3 y 3000 caracteres.';
  end if;
  update public.complaints c
  set business_response = btrim(p_response), updated_at = now()
  where c.id = p_complaint_id and exists (
    select 1 from public.business_owner_claims oc
    where oc.business_id = c.business_id and oc.user_id = auth.uid() and oc.status = 'verified'
  );
  if not found then raise exception 'No tienes autorización para responder este reclamo o no existe.'; end if;
end;
$function$;
```

## refresh_business_monthly_history(p_month date DEFAULT current month)
- Returns void; PL/pgSQL; SECURITY INVOKER; empty search_path.
- Aggregates published reviews in the month into public.business_monthly_history; upserts by (business_id, month_start), updating count, five category averages and calculated_at.
- EXECUTE is restricted to postgres/service_role per earlier privilege extraction.
- Preserve the exact month window and ON CONFLICT behavior.

## reputix_publish_valid_reviews()
- Returns integer; PL/pgSQL; SECURITY DEFINER; search_path=public.
- Publishes pending reviews older than 24 hours only if business approved, at least one comment/score present, and each supplied score lies 1–5; returns row count.
- EXECUTE restricted to postgres/service_role.
- Production cron calls this every five minutes. Do not create/enable that cron in staging until disposable fixtures and cleanup are ready.
- Security hardening candidate for staging: empty search_path and fully qualified built-ins.
- Preserve exact behavior and test that invalid or pending fixture rows do not publish.

## submit_business_proposal(p_name text, p_category text, p_address text, p_city text, p_zip text, p_phone text, p_hours text, p_description text, p_instagram_url text, p_facebook_url text, p_tiktok_url text)
- Returns uuid; PL/pgSQL; SECURITY DEFINER; empty search_path.
- Validates required name/category/city and field lengths; checks for matching pending/approved proposal by normalized name/category/city/address; inserts new business with status pending; returns UUID.
- EXECUTE includes PUBLIC, anon, authenticated, service_role, postgres per prior privilege extraction.
- Preserve empty search_path and schema-qualified built-ins. Stress test public invocation, field limits, and concurrent duplicate submission race.

## Routine metadata and staging gates
| Routine | SECURITY DEFINER | search_path | Owner |
|---|---:|---|---|
| is_reputix_admin | no | empty | postgres |
| owner_respond_to_complaint | yes | public | postgres |
| refresh_business_monthly_history | no | empty | postgres |
| reputix_publish_valid_reviews | yes | public | postgres |
| submit_business_proposal | yes | empty | postgres |

- Preserve EXECUTE grants exactly, including PUBLIC where present.
- Do not copy secrets or production cron.
- Review SECURITY DEFINER functions with an empty search_path or explicit safe path and fully qualified object references.
- Verify view and routine dependencies before staging application.
