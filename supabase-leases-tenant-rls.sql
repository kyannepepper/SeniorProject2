-- Tenant-focused RLS policies for leases
-- Run in Supabase SQL Editor after leases RLS is enabled for landlords.

-- Tenants can view their own lease
CREATE POLICY "Tenants can view own lease"
ON leases
FOR SELECT
TO authenticated
USING (
  lease_id IN (
    SELECT lease_id
    FROM tenants
    WHERE tenants.lease_id = leases.lease_id
      AND tenants.user_id = auth.uid()
  )
);

-- Tenants can mark their own lease as signed
CREATE POLICY "Tenants can sign own lease"
ON leases
FOR UPDATE
TO authenticated
USING (
  lease_id IN (
    SELECT lease_id
    FROM tenants
    WHERE tenants.lease_id = leases.lease_id
      AND tenants.user_id = auth.uid()
  )
)
WITH CHECK (
  lease_id IN (
    SELECT lease_id
    FROM tenants
    WHERE tenants.lease_id = leases.lease_id
      AND tenants.user_id = auth.uid()
  )
);

