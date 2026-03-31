-- =============================================================================
-- RPC: Tenant pays current rent and creates next month's payment
-- Run in Supabase SQL Editor.
-- =============================================================================

-- Helper: first day of next month (date)
CREATE OR REPLACE FUNCTION public.first_of_next_month(p_from date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (date_trunc('month', p_from)::date + INTERVAL '1 month')::date;
$$;

-- Main RPC
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
  v_next_due date;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Find the tenant row for this user
  SELECT t.tenant_id, t.lease_id
    INTO v_tenant_id, v_lease_id
  FROM public.tenants t
  WHERE t.user_id = v_user_id
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
  ORDER BY p.date_due ASC
  LIMIT 1;

  IF v_payment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_unpaid_payment');
  END IF;

  -- Mark it paid
  UPDATE public.payments
  SET date_paid = v_today
  WHERE payment_id = v_payment_id
    AND date_paid IS NULL;

  -- Create next month's payment due on first of next month after the paid payment's due date
  v_next_due := public.first_of_next_month(v_due_date);

  INSERT INTO public.payments (tenant_id, amount_due, late_fee, date_due, date_paid)
  VALUES (v_tenant_id, v_rent, 0, v_next_due, NULL)
  ON CONFLICT (tenant_id, date_due) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'paid_payment_id', v_payment_id,
    'next_due_date', v_next_due
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pay_rent_and_create_next_payment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_rent_and_create_next_payment() TO authenticated;

