-- Add lease_details column to store the full text of the lease
-- Run in Supabase SQL Editor.

ALTER TABLE leases
ADD COLUMN IF NOT EXISTS lease_details text;
