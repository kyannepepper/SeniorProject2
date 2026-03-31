-- =============================================================================
-- Payments: add late_fee + guardrails
-- Run in Supabase SQL Editor.
-- =============================================================================

-- 1) Add late fee column (separate from total amount_due)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS late_fee numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.payments.late_fee IS 'Late fee to be added to this payment. Total due is amount_due.';

-- 2) Basic sanity checks
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_late_fee_nonnegative_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_late_fee_nonnegative_check CHECK (late_fee >= 0);

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_amount_due_nonnegative_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_due_nonnegative_check CHECK (amount_due >= 0);

-- 3) Prevent duplicate month/payment records for the same tenant + due date
-- (This allows history; it just prevents two rows for the same due date.)
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_tenant_id_date_due_unique;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_tenant_id_date_due_unique UNIQUE (tenant_id, date_due);

