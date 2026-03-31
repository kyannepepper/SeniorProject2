-- =============================================================================
-- Fix: ensure pay_rent_and_create_next_payment always leaves an unpaid payment
-- even if a conflicting future payment already exists (and is paid), or if
-- the paid payment's due date isn't the latest schedule anchor.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.pay_rent_and_create_next_payment()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_lease_id uuid;
  v_rent numeric;
  v_payment_id uuid;
  v_due_date date;
  v_today date := now()::date;
  v_anchor_due date;
  v_next_due date;
  v_unpaid_count int;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Prefer a tenant row that has a lease (stable if duplicates ever exist)
  SELECT t.tenant_id, t.lease_id
    INTO v_tenant_id, v_lease_id
  FROM public.tenants t
  WHERE t.user_id = v_user_id
  ORDER BY (t.lease_id IS NOT NULL) DESC
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tenant_not_linked');
  END IF;

  IF v_lease_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_lease');
  END IF;

  SELECT l.rent_amount
    INTO v_rent
  FROM public.leases l
  WHERE l.lease_id = v_lease_id;

  IF v_rent IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_rent_amount');
  END IF;

  -- Get earliest unpaid payment (date_paid is null)
  SELECT p.payment_id, p.date_due
    INTO v_payment_id, v_due_date
  FROM public.payments p
  WHERE p.tenant_id = v_tenant_id
    AND p.date_paid IS NULL
  ORDER BY p.date_due ASC NULLS LAST
  LIMIT 1;

  IF v_payment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_unpaid_payment');
  END IF;

  -- Mark it paid
  UPDATE public.payments
  SET date_paid = v_today
  WHERE payment_id = v_payment_id
    AND date_paid IS NULL;

  -- Anchor the next due date off the latest scheduled due date we have,
  -- not just the paid payment's due date. This prevents gaps if payments
  -- were pre-created or paid out of order.
  SELECT COALESCE(MAX(p.date_due), v_due_date)
    INTO v_anchor_due
  FROM public.payments p
  WHERE p.tenant_id = v_tenant_id;

  v_next_due := public.first_of_next_month(v_anchor_due);

  INSERT INTO public.payments (tenant_id, amount_due, late_fee, date_due, date_paid)
  VALUES (v_tenant_id, v_rent, 0, v_next_due, NULL)
  ON CONFLICT (tenant_id, date_due) DO NOTHING;

  -- Guard: if we somehow ended up with no unpaid payment at all, ensure one exists.
  SELECT COUNT(*)
    INTO v_unpaid_count
  FROM public.payments p
  WHERE p.tenant_id = v_tenant_id
    AND p.date_paid IS NULL;

  IF v_unpaid_count = 0 THEN
    v_next_due := public.first_of_next_month(GREATEST(COALESCE(v_anchor_due, v_today), v_today));
    INSERT INTO public.payments (tenant_id, amount_due, late_fee, date_due, date_paid)
    VALUES (v_tenant_id, v_rent, 0, v_next_due, NULL)
    ON CONFLICT (tenant_id, date_due) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'paid_payment_id', v_payment_id,
    'next_due_date', v_next_due
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pay_rent_and_create_next_payment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_rent_and_create_next_payment() TO authenticated;

