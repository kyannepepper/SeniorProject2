-- =============================================================================
-- RPC: Tenant signs their own lease
-- Run in Supabase SQL Editor.
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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Verify this lease belongs to this tenant (by user_id)
  SELECT t.tenant_id
    INTO v_tenant_id
  FROM public.tenants t
  WHERE t.user_id = v_user_id
    AND t.lease_id = p_lease_id
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lease_not_found_for_user');
  END IF;

  UPDATE public.leases
  SET signed = true
  WHERE lease_id = p_lease_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_sign_lease(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_sign_lease(uuid) TO authenticated;

