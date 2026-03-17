-- RLS policies for leases table (uses get_my_landlord_id() to avoid recursion)
-- Run in Supabase SQL Editor. Drop existing policies first if you already created them.

DROP POLICY IF EXISTS "Landlords can view own leases" ON leases;
DROP POLICY IF EXISTS "Landlords can insert own leases" ON leases;
DROP POLICY IF EXISTS "Landlords can update own leases" ON leases;

-- Ensure this function exists (from maintenance_worker_landlords RLS script)
CREATE OR REPLACE FUNCTION public.get_my_landlord_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT landlord_id FROM landlords WHERE user_id = auth.uid() LIMIT 1;
$$;

ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

-- Landlords can view their own leases (no subquery = no recursion)
CREATE POLICY "Landlords can view own leases"
ON leases
FOR SELECT
TO authenticated
USING (landlord_id = public.get_my_landlord_id());

-- Landlords can insert leases for their own landlord_id
CREATE POLICY "Landlords can insert own leases"
ON leases
FOR INSERT
TO authenticated
WITH CHECK (landlord_id = public.get_my_landlord_id());

-- Landlords can update their own leases
CREATE POLICY "Landlords can update own leases"
ON leases
FOR UPDATE
TO authenticated
USING (landlord_id = public.get_my_landlord_id());
