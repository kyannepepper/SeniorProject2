-- =============================================================================
-- Landlord payment notifications: track when they last opened the payments hub
-- so we only show a badge for (1) payments recorded as paid since then, or
-- (2) unpaid payments that are past due and the landlord has not opened the
-- hub since the due date (calendar day).
-- =============================================================================

ALTER TABLE public.landlords
  ADD COLUMN IF NOT EXISTS last_viewed_payments_at timestamptz DEFAULT now();

-- Existing landlords: treat as "caught up" so old paid rows don't flood badges.
UPDATE public.landlords
SET last_viewed_payments_at = now()
WHERE last_viewed_payments_at IS NULL;

COMMENT ON COLUMN public.landlords.last_viewed_payments_at IS
  'When the landlord last opened the payments list; used to clear payment notification badges.';

-- Landlords can read their own row (needed for badge logic + updates).
DROP POLICY IF EXISTS "Landlords read own row" ON public.landlords;

CREATE POLICY "Landlords read own row"
ON public.landlords
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Landlords can update their own row (e.g. mark payments hub viewed).
DROP POLICY IF EXISTS "Landlords update own row" ON public.landlords;

CREATE POLICY "Landlords update own row"
ON public.landlords
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
