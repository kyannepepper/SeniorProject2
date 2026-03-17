-- Add maintenance_worker_id to maintenance_requests (if not already present)
-- Run in Supabase SQL Editor.

ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS maintenance_worker_id uuid
REFERENCES maintenance_workers(maintenance_worker_id) ON DELETE SET NULL;
