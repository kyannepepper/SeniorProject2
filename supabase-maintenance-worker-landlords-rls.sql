-- RLS policies for maintenance_worker_landlords
-- Run in Supabase SQL Editor. First drop the old policies that caused recursion:
DROP POLICY IF EXISTS "Landlords can view their linked maintenance workers" ON maintenance_worker_landlords;
DROP POLICY IF EXISTS "Maintenance workers can link to landlord during signup" ON maintenance_worker_landlords;

-- Allow landlords to read their linked workers (uses security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_my_landlord_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT landlord_id FROM landlords WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "Landlords can view their linked maintenance workers"
ON maintenance_worker_landlords
FOR SELECT
TO authenticated
USING (landlord_id = public.get_my_landlord_id());

-- Allow maintenance workers to link themselves (uses security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.my_maintenance_worker_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT maintenance_worker_id FROM maintenance_workers WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "Maintenance workers can link to landlord during signup"
ON maintenance_worker_landlords
FOR INSERT
TO authenticated
WITH CHECK (maintenance_worker_id = public.my_maintenance_worker_id());
