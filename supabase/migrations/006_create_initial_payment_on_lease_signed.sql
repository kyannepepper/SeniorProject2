-- =============================================================================
-- Trigger: when lease is signed, create the first rent payment
-- Run in Supabase SQL Editor.
-- =============================================================================

-- Requires: public.first_of_next_month(date) from 005_pay_rent_rpc.sql

CREATE OR REPLACE FUNCTION public.create_initial_payment_for_signed_lease()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due date := public.first_of_next_month(now()::date);
BEGIN
  -- Only run when signed flips from false/null to true
  IF (TG_OP = 'UPDATE') AND (COALESCE(OLD.signed, false) = false) AND (NEW.signed = true) THEN
    -- Create a payment for each tenant linked to this lease
    -- Amount due is the lease rent, late_fee starts at 0
    INSERT INTO public.payments (tenant_id, amount_due, late_fee, date_due, date_paid)
    SELECT t.tenant_id, NEW.rent_amount, 0, v_due, NULL
    FROM public.tenants t
    WHERE t.lease_id = NEW.lease_id
      AND NEW.rent_amount IS NOT NULL
    ON CONFLICT (tenant_id, date_due) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_initial_payment_on_lease_signed ON public.leases;

CREATE TRIGGER trg_create_initial_payment_on_lease_signed
AFTER UPDATE OF signed ON public.leases
FOR EACH ROW
EXECUTE FUNCTION public.create_initial_payment_for_signed_lease();

