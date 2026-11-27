-- CANDIDATE ONLY. Do not apply to staging or production until reviewed and tested.
-- Hardens the existing SECURITY DEFINER RPC to match the complaints RLS policy:
-- only a verified owner of an APPROVED business may respond.
-- Pin search_path to empty and qualify all non-system objects.

CREATE OR REPLACE FUNCTION public.owner_respond_to_complaint(
  p_complaint_id uuid,
  p_response text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para responder.';
  END IF;

  IF p_response IS NULL
     OR pg_catalog.char_length(pg_catalog.btrim(p_response)) < 3
     OR pg_catalog.char_length(p_response) > 3000 THEN
    RAISE EXCEPTION 'La respuesta debe tener entre 3 y 3000 caracteres.';
  END IF;

  UPDATE public.complaints c
  SET business_response = pg_catalog.btrim(p_response),
      updated_at = pg_catalog.now()
  WHERE c.id = p_complaint_id
    AND EXISTS (
      SELECT 1
      FROM public.business_owner_claims oc
      JOIN public.businesses b ON b.id = oc.business_id
      WHERE oc.business_id = c.business_id
        AND oc.user_id = v_user_id
        AND oc.status = 'verified'
        AND b.status = 'approved'
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes autorización para responder este reclamo o el negocio no está aprobado.';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.owner_respond_to_complaint(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_respond_to_complaint(uuid, text)
  TO authenticated, service_role;
