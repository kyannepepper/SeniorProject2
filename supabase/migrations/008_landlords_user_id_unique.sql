-- =============================================================================
-- Landlords: enforce 1 landlord row per user
-- Run in Supabase SQL Editor.
-- =============================================================================

-- 1) Remove duplicates (keep the oldest row for each user_id)
WITH ranked AS (
  SELECT
    landlord_id,
    user_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
  FROM public.landlords
)
DELETE FROM public.landlords l
USING ranked r
WHERE l.landlord_id = r.landlord_id
  AND r.rn > 1;

-- 2) Enforce uniqueness so duplicates can't happen again
ALTER TABLE public.landlords
  DROP CONSTRAINT IF EXISTS landlords_user_id_unique;

ALTER TABLE public.landlords
  ADD CONSTRAINT landlords_user_id_unique UNIQUE (user_id);

