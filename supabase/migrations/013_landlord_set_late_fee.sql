-- =============================================================================
-- Landlord sets late_fee on a payment for their tenant (validated by ownership).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.landlord_set_late_fee(
  p_tenant_id uuid,
  p_payment_id uuid,
  p_late_fee numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ok boolean;
  v_updated int;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_late_fee IS NULL OR p_late_fee < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.tenants t
    INNER JOIN public.properties p ON p.property_id = t.property_id
    INNER JOIN public.landlords l ON l.landlord_id = p.landlord_id
    WHERE t.tenant_id = p_tenant_id
      AND l.user_id = v_uid
  )
  INTO v_ok;

  IF NOT v_ok THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;

  UPDATE public.payments
  SET late_fee = p_late_fee
  WHERE payment_id = p_payment_id
    AND tenant_id = p_tenant_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'payment_not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.landlord_set_late_fee(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.landlord_set_late_fee(uuid, uuid, numeric) TO authenticated;
