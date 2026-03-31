-- =============================================================================
-- Landlords can read payment rows for tenants on their properties (dashboard
-- tenant detail + payment history).
-- =============================================================================

DROP POLICY IF EXISTS "Landlords read payments for their tenants" ON public.payments;

CREATE POLICY "Landlords read payments for their tenants"
ON public.payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    INNER JOIN public.properties p ON p.property_id = t.property_id
    INNER JOIN public.landlords l ON l.landlord_id = p.landlord_id
    WHERE t.tenant_id = payments.tenant_id
      AND l.user_id = auth.uid()
  )
);
