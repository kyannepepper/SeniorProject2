-- =============================================================================
-- When a tenant signs, insert their name and today's date into lease_details
-- on the "Tenant: ___ Date: ___" line (matches template from add-lease).
-- Uses a unique placeholder in regexp_replace so names with & or \ are safe.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tenant_sign_lease(p_lease_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_details text;
  v_tenant_name text;
  v_date_text text;
  v_marker text;
  v_new_details text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT t.tenant_id
    INTO v_tenant_id
  FROM public.tenants t
  WHERE t.user_id = v_user_id
    AND t.lease_id = p_lease_id
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lease_not_found_for_user');
  END IF;

  SELECT l.lease_details
    INTO v_details
  FROM public.leases l
  WHERE l.lease_id = p_lease_id;

  SELECT COALESCE(
      NULLIF(TRIM(u.name), ''),
      NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
      'Tenant'
    )
    INTO v_tenant_name
  FROM public.tenants t
  JOIN public.users u ON u.user_id = t.user_id
  WHERE t.tenant_id = v_tenant_id
  LIMIT 1;

  IF v_tenant_name IS NULL OR trim(v_tenant_name) = '' THEN
    v_tenant_name := 'Tenant';
  END IF;

  v_date_text := trim(to_char(CURRENT_DATE, 'FMMonth DD, YYYY'));

  IF v_details IS NOT NULL AND length(trim(v_details)) > 0 THEN
    v_marker := '@@TENANT_SIG_' || replace(gen_random_uuid()::text, '-', '') || '@@';
    v_new_details := regexp_replace(
      v_details,
      '(Tenant:\s+)_{3,}(\s+Date:\s+)_{3,}',
      v_marker
    );
    v_new_details := replace(
      v_new_details,
      v_marker,
      'Tenant: ' || v_tenant_name || '   Date: ' || v_date_text
    );
  ELSE
    v_new_details := v_details;
  END IF;

  UPDATE public.leases
  SET signed = true,
      lease_details = COALESCE(v_new_details, lease_details)
  WHERE lease_id = p_lease_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_sign_lease(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_sign_lease(uuid) TO authenticated;
