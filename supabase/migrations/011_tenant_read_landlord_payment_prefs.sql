-- =============================================================================
-- Allow tenants to read their landlord row (for preferred payment method/details
-- on the tenant dashboard). Scoped to landlords linked via the tenant's property.
-- =============================================================================

DROP POLICY IF EXISTS "Tenants read their landlord payment info" ON public.landlords;

CREATE POLICY "Tenants read their landlord payment info"
ON public.landlords
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    INNER JOIN public.tenants t ON t.property_id = p.property_id
    WHERE p.landlord_id = landlords.landlord_id
      AND t.user_id = auth.uid()
  )
);
