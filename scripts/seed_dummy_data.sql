-- =============================================================================
-- Dummy data seed for local / staging Supabase
-- Landlord: 3a534980-c0b1-43fd-97e1-2278af60cbc2
--
-- HOW TO RUN
-- 1. Open Supabase Dashboard → SQL Editor → New query.
-- 2. Either:
--    A) Run SECTION 0 as-is (creates auth + public.users for the fixed UUIDs
--       below; password: DummySeed123!), or
--    B) Create three users in Authentication, then FIND/REPLACE every occurrence
--       of these IDs in this file with your real auth user UUIDs:
--         b1111111-1111-1111-1111-111111111101  (Jordan — Pine Cottage tenant)
--         b1111111-1111-1111-1111-111111111102  (Alex — Oak Studio tenant)
--         b1111111-1111-1111-1111-111111111103  (Sam — applicant only)
--         b2222222-2222-2222-2222-222222220101  (Chris — maintenance worker)
--         b2222222-2222-2222-2222-222222220102  (Dana — maintenance worker)
--       If you choose B, delete or skip SECTION 0 entirely.
-- 3. Run the whole script once. If something conflicts (duplicate email), fix
--    SECTION 0 or use your own UUIDs.
--
-- AFTER RUNNING
-- - Upload photos for properties in the app (image_url left NULL).
-- - Adjust amounts/dates if your schema differs slightly.
--
-- IDs use only hex digits (0-9, a-f). Letters like "p" or "m" in UUID strings
-- are invalid in PostgreSQL and will error (22P02).
-- =============================================================================

-- UUID placeholders (replace with real auth user ids if you prefer)
-- Jordan = paying tenant on "Pine Cottage" (rich payment history + maintenance)
-- Alex   = tenant on "Oak Studio" (late fees / overdue demo) + second application on Maple
-- Sam    = applicant on vacant "Maple Lofts"
-- Chris & Dana = maintenance workers linked to this landlord

-- Use these literals everywhere (Dashboard SQL Editor: find/replace if you use your own auth users)
-- DUMMY_USER_JORDAN  = 'b1111111-1111-1111-1111-111111111101'
-- DUMMY_USER_ALEX    = 'b1111111-1111-1111-1111-111111111102'
-- DUMMY_USER_SAM     = 'b1111111-1111-1111-1111-111111111103'
-- WORKER_CHRIS       = 'b2222222-2222-2222-2222-222222220101'
-- WORKER_DANA        = 'b2222222-2222-2222-2222-222222220102'

-- ---------------------------------------------------------------------------
-- SECTION 0 (OPTIONAL): Auth users + identities + public.users
-- Skip if you replaced placeholders with existing auth UUIDs.
-- Requires: pgcrypto (usually enabled on Supabase) for crypt().
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT
  v.id,
  COALESCE((SELECT u.instance_id FROM auth.users u LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid),
  'authenticated',
  'authenticated',
  v.email,
  extensions.crypt('DummySeed123!', extensions.gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('full_name', v.full_name, 'role', v.app_role),
  now(),
  now()
FROM (VALUES
  ('b1111111-1111-1111-1111-111111111101'::uuid, 'jordan.dummy.seed@example.com', 'Jordan Lee', 'tenant'),
  ('b1111111-1111-1111-1111-111111111102'::uuid, 'alex.dummy.seed@example.com', 'Alex Klein', 'tenant'),
  ('b1111111-1111-1111-1111-111111111103'::uuid, 'sam.dummy.seed@example.com', 'Sam Rivera', 'tenant'),
  ('b2222222-2222-2222-2222-222222220101'::uuid, 'chris.mw.seed@example.com', 'Chris Mendez', 'maintenance'),
  ('b2222222-2222-2222-2222-222222220102'::uuid, 'dana.mw.seed@example.com', 'Dana Ruiz', 'maintenance')
) AS v(id, email, full_name, app_role)
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v.id);

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.id IN (
  'b1111111-1111-1111-1111-111111111101'::uuid,
  'b1111111-1111-1111-1111-111111111102'::uuid,
  'b1111111-1111-1111-1111-111111111103'::uuid,
  'b2222222-2222-2222-2222-222222220101'::uuid,
  'b2222222-2222-2222-2222-222222220102'::uuid
)
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);

INSERT INTO public.users (user_id, role, name, email, phone)
VALUES
  ('b1111111-1111-1111-1111-111111111101', 'tenant', 'Jordan Lee', 'jordan.dummy.seed@example.com', '555-0101'),
  ('b1111111-1111-1111-1111-111111111102', 'tenant', 'Alex Klein', 'alex.dummy.seed@example.com', '555-0102'),
  ('b1111111-1111-1111-1111-111111111103', 'tenant', 'Sam Rivera', 'sam.dummy.seed@example.com', '555-0103'),
  ('b2222222-2222-2222-2222-222222220101', 'maintenance', 'Chris Mendez', 'chris.mw.seed@example.com', '555-0301'),
  ('b2222222-2222-2222-2222-222222220102', 'maintenance', 'Dana Ruiz', 'dana.mw.seed@example.com', '555-0302')
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role;

-- ---------------------------------------------------------------------------
-- SECTION 0b: Maintenance workers + link to landlord
-- ---------------------------------------------------------------------------

INSERT INTO public.maintenance_workers (maintenance_worker_id, user_id)
VALUES
  ('ad111111-1111-1111-1111-111111119101', 'b2222222-2222-2222-2222-222222220101'),
  ('ad111111-1111-1111-1111-111111119102', 'b2222222-2222-2222-2222-222222220102')
ON CONFLICT (maintenance_worker_id) DO UPDATE SET user_id = EXCLUDED.user_id;

INSERT INTO public.maintenance_worker_landlords (maintenance_worker_id, landlord_id)
VALUES
  ('ad111111-1111-1111-1111-111111119101', '3a534980-c0b1-43fd-97e1-2278af60cbc2'),
  ('ad111111-1111-1111-1111-111111119102', '3a534980-c0b1-43fd-97e1-2278af60cbc2')
ON CONFLICT (maintenance_worker_id, landlord_id) DO NOTHING;

-- If your table has no unique constraint on (maintenance_worker_id, landlord_id), use instead:
-- DELETE FROM public.maintenance_worker_landlords
--   WHERE maintenance_worker_id IN ('ad111111-1111-1111-1111-111111119101','ad111111-1111-1111-1111-111111119102')
--   AND landlord_id = '3a534980-c0b1-43fd-97e1-2278af60cbc2';
-- then run the INSERT above without ON CONFLICT.

-- ---------------------------------------------------------------------------
-- SECTION 1: Properties (2 occupied + 1 vacant for applications)
-- image_url NULL — add photos in the app later
-- ---------------------------------------------------------------------------

INSERT INTO public.properties (
  property_id,
  landlord_id,
  name,
  address,
  occupied,
  rent_amount,
  image_url,
  created_at
) VALUES
  (
    'a1111111-1111-1111-1111-111111111201',
    '3a534980-c0b1-43fd-97e1-2278af60cbc2',
    'Maple Lofts (vacant)',
    '100 Maple Ave, Springfield',
    false,
    1295,
    NULL,
    now() - interval '30 days'
  ),
  (
    'a1111111-1111-1111-1111-111111111202',
    '3a534980-c0b1-43fd-97e1-2278af60cbc2',
    'Pine Cottage',
    '22 Pine Rd, Springfield',
    true,
    1500,
    NULL,
    now() - interval '400 days'
  ),
  (
    'a1111111-1111-1111-1111-111111111203',
    '3a534980-c0b1-43fd-97e1-2278af60cbc2',
    'Oak Studio',
    '5 Oak Ln, Springfield',
    true,
    1100,
    NULL,
    now() - interval '200 days'
  )
ON CONFLICT (property_id) DO UPDATE SET
  landlord_id = EXCLUDED.landlord_id,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  occupied = EXCLUDED.occupied,
  rent_amount = EXCLUDED.rent_amount;

-- ---------------------------------------------------------------------------
-- SECTION 2: Tenants (linked to properties)
-- ---------------------------------------------------------------------------

INSERT INTO public.tenants (tenant_id, user_id, property_id, lease_id)
VALUES
  ('c1111111-1111-1111-1111-111111111301', 'b1111111-1111-1111-1111-111111111101', 'a1111111-1111-1111-1111-111111111202', NULL),
  ('c1111111-1111-1111-1111-111111111302', 'b1111111-1111-1111-1111-111111111102', 'a1111111-1111-1111-1111-111111111203', NULL)
ON CONFLICT (tenant_id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  property_id = EXCLUDED.property_id;

-- ---------------------------------------------------------------------------
-- SECTION 3: Leases + link tenants
-- ---------------------------------------------------------------------------

INSERT INTO public.leases (
  lease_id,
  landlord_id,
  property_id,
  rent_amount,
  start_date,
  end_date,
  signed,
  lease_details
) VALUES
  (
    'd1111111-1111-1111-1111-111111111401',
    '3a534980-c0b1-43fd-97e1-2278af60cbc2',
    'a1111111-1111-1111-1111-111111111202',
    1500,
    '2025-03-01',
    '2026-02-28',
    true,
    'Dummy seed lease — Jordan / Pine Cottage'
  ),
  (
    'd1111111-1111-1111-1111-111111111402',
    '3a534980-c0b1-43fd-97e1-2278af60cbc2',
    'a1111111-1111-1111-1111-111111111203',
    1100,
    '2025-08-01',
    '2026-07-31',
    true,
    'Dummy seed lease — Alex / Oak Studio'
  )
ON CONFLICT (lease_id) DO UPDATE SET
  landlord_id = EXCLUDED.landlord_id,
  property_id = EXCLUDED.property_id,
  rent_amount = EXCLUDED.rent_amount,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  signed = EXCLUDED.signed;

UPDATE public.tenants
SET lease_id = 'd1111111-1111-1111-1111-111111111401'
WHERE tenant_id = 'c1111111-1111-1111-1111-111111111301';

UPDATE public.tenants
SET lease_id = 'd1111111-1111-1111-1111-111111111402'
WHERE tenant_id = 'c1111111-1111-1111-1111-111111111302';

-- ---------------------------------------------------------------------------
-- SECTION 4: Payments
-- Jordan (Pine): history from last year + a few months ago + current; one period unpaid overdue + late fee on next row
-- Alex (Oak): mix on-time, paid late (late_fee on following month), one unpaid overdue with late_fee
-- ---------------------------------------------------------------------------

INSERT INTO public.payments (
  payment_id,
  tenant_id,
  amount_due,
  late_fee,
  date_due,
  date_paid
) VALUES
  -- Jordan — older history (2025)
  ('e1111111-1111-1111-1111-111111111501', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2025-04-01', '2025-04-01'),
  ('e1111111-1111-1111-1111-111111111502', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2025-05-01', '2025-05-02'),
  ('e1111111-1111-1111-1111-111111111503', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2025-06-01', '2025-06-01'),
  ('e1111111-1111-1111-1111-111111111504', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2025-07-01', '2025-07-01'),
  ('e1111111-1111-1111-1111-111111111505', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2025-08-01', '2025-08-01'),
  ('e1111111-1111-1111-1111-111111111506', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2025-09-01', '2025-09-01'),
  ('e1111111-1111-1111-1111-111111111507', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2025-10-01', '2025-10-01'),
  ('e1111111-1111-1111-1111-111111111508', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2025-11-01', '2025-11-01'),
  ('e1111111-1111-1111-1111-111111111509', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2025-12-01', '2025-12-03'),
  -- Jordan — recent (2026)
  ('e1111111-1111-1111-1111-111111111510', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2026-01-01', '2026-01-05'),
  ('e1111111-1111-1111-1111-111111111511', 'c1111111-1111-1111-1111-111111111301', 1500, 75, '2026-02-01', '2026-02-01'),
  ('e1111111-1111-1111-1111-111111111512', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2026-03-01', NULL),
  ('e1111111-1111-1111-1111-111111111513', 'c1111111-1111-1111-1111-111111111301', 1500, 0, '2026-04-01', '2026-04-01'),

  -- Alex — started mid-2025; paid late once → late fee on next row; current row overdue + late fee
  ('e1111111-1111-1111-1111-111111111601', 'c1111111-1111-1111-1111-111111111302', 1100, 0, '2025-08-01', '2025-08-01'),
  ('e1111111-1111-1111-1111-111111111602', 'c1111111-1111-1111-1111-111111111302', 1100, 0, '2025-09-01', '2025-09-01'),
  ('e1111111-1111-1111-1111-111111111603', 'c1111111-1111-1111-1111-111111111302', 1100, 0, '2025-10-01', '2025-10-04'),
  ('e1111111-1111-1111-1111-111111111604', 'c1111111-1111-1111-1111-111111111302', 1100, 50, '2025-11-01', '2025-11-01'),
  ('e1111111-1111-1111-1111-111111111605', 'c1111111-1111-1111-1111-111111111302', 1100, 0, '2025-12-01', '2025-12-01'),
  ('e1111111-1111-1111-1111-111111111606', 'c1111111-1111-1111-1111-111111111302', 1100, 0, '2026-01-01', '2026-01-01'),
  ('e1111111-1111-1111-1111-111111111607', 'c1111111-1111-1111-1111-111111111302', 1100, 0, '2026-02-01', '2026-02-01'),
  ('e1111111-1111-1111-1111-111111111608', 'c1111111-1111-1111-1111-111111111302', 1100, 0, '2026-03-01', NULL),
  ('e1111111-1111-1111-1111-111111111609', 'c1111111-1111-1111-1111-111111111302', 1100, 40, '2026-04-01', NULL)
ON CONFLICT (payment_id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  amount_due = EXCLUDED.amount_due,
  late_fee = EXCLUDED.late_fee,
  date_due = EXCLUDED.date_due,
  date_paid = EXCLUDED.date_paid;

-- ---------------------------------------------------------------------------
-- SECTION 5: Applications (vacant Maple Lofts) + references
-- ---------------------------------------------------------------------------

INSERT INTO public.applications (
  application_id,
  property_id,
  applicant_user_id,
  name,
  email,
  phone,
  move_in_date,
  description,
  created_at
) VALUES
  (
    'f1111111-1111-1111-1111-111111111701',
    'a1111111-1111-1111-1111-111111111201',
    'b1111111-1111-1111-1111-111111111103',
    'Sam Rivera',
    'sam.dummy.seed@example.com',
    '555-0103',
    '2026-05-01',
    'Seed: looking for a quiet 1BR near downtown.',
    now() - interval '5 days'
  ),
  (
    'f1111111-1111-1111-1111-111111111702',
    'a1111111-1111-1111-1111-111111111201',
    'b1111111-1111-1111-1111-111111111102',
    'Alex Klein',
    'alex.dummy.seed@example.com',
    '555-0102',
    '2026-06-15',
    'Seed: second application — already at Oak Studio, interested in Maple Lofts.',
    now() - interval '2 days'
  )
ON CONFLICT (application_id) DO UPDATE SET
  property_id = EXCLUDED.property_id,
  applicant_user_id = EXCLUDED.applicant_user_id,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  move_in_date = EXCLUDED.move_in_date,
  description = EXCLUDED.description;

DELETE FROM public.applicant_references
WHERE application_id IN (
  'f1111111-1111-1111-1111-111111111701',
  'f1111111-1111-1111-1111-111111111702'
);

INSERT INTO public.applicant_references (application_id, name, phone, email, relationship)
VALUES
  ('f1111111-1111-1111-1111-111111111701', 'Pat Ng', '555-2001', 'pat@example.com', 'Former landlord'),
  ('f1111111-1111-1111-1111-111111111701', 'Chris Ortiz', '555-2002', NULL, 'Employer'),
  ('f1111111-1111-1111-1111-111111111702', 'Taylor Kim', '555-2003', 'taylor@example.com', 'Supervisor');

-- ---------------------------------------------------------------------------
-- SECTION 6: Maintenance requests
-- Workers: ad111111-1111-1111-1111-111111119101 (Chris), ...19102 (Dana)
-- Status values: pending | in_progress | completed | cancelled
-- ---------------------------------------------------------------------------

INSERT INTO public.maintenance_requests (
  request_id,
  tenant_id,
  property_id,
  title,
  description,
  status,
  urgency,
  photo_url,
  maintenance_worker_id,
  created_at,
  updated_at
) VALUES
  (
    'de111111-1111-1111-1111-111111111801',
    'c1111111-1111-1111-1111-111111111301',
    'a1111111-1111-1111-1111-111111111202',
    'Kitchen faucet dripping',
    'Drips constantly from the handle base.',
    'in_progress',
    'medium',
    NULL,
    'ad111111-1111-1111-1111-111111119101',
    now() - interval '3 days',
    now() - interval '1 day'
  ),
  (
    'de111111-1111-1111-1111-111111111802',
    'c1111111-1111-1111-1111-111111111301',
    'a1111111-1111-1111-1111-111111111202',
    'Heat not reaching bedroom',
    'Thermostat at 72 but bedroom stays cold.',
    'pending',
    'high',
    NULL,
    NULL,
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  (
    'de111111-1111-1111-1111-111111111803',
    'c1111111-1111-1111-1111-111111111302',
    'a1111111-1111-1111-1111-111111111203',
    'Bathroom exhaust fan noisy',
    'Rattling sound when turned on.',
    'completed',
    'low',
    NULL,
    'ad111111-1111-1111-1111-111111119102',
    now() - interval '14 days',
    now() - interval '2 days'
  ),
  (
    'ee111111-1111-1111-1111-111111118101',
    'c1111111-1111-1111-1111-111111111301',
    'a1111111-1111-1111-1111-111111111202',
    'Hallway light flickering',
    'Ceiling fixture flickers for a few minutes after turn-on.',
    'in_progress',
    'medium',
    NULL,
    'ad111111-1111-1111-1111-111111119102',
    now() - interval '5 days',
    now() - interval '12 hours'
  ),
  (
    'ee111111-1111-1111-1111-111111118102',
    'c1111111-1111-1111-1111-111111111302',
    'a1111111-1111-1111-1111-111111111203',
    'Garbage disposal jammed',
    'Hums but does not spin; reset button did not help.',
    'completed',
    'high',
    NULL,
    'ad111111-1111-1111-1111-111111119101',
    now() - interval '45 days',
    now() - interval '40 days'
  ),
  (
    'ee111111-1111-1111-1111-111111118103',
    'c1111111-1111-1111-1111-111111111302',
    'a1111111-1111-1111-1111-111111111203',
    'Smoke detector chirping',
    'Chirps every minute; likely battery.',
    'completed',
    'medium',
    NULL,
    'ad111111-1111-1111-1111-111111119102',
    now() - interval '120 days',
    now() - interval '115 days'
  ),
  (
    'ee111111-1111-1111-1111-111111118104',
    'c1111111-1111-1111-1111-111111111301',
    'a1111111-1111-1111-1111-111111111202',
    'Loose handrail on stairs',
    'Wobbles when using the basement stairs.',
    'pending',
    'low',
    NULL,
    NULL,
    now() - interval '8 hours',
    now() - interval '8 hours'
  )
ON CONFLICT (request_id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  property_id = EXCLUDED.property_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  urgency = EXCLUDED.urgency,
  maintenance_worker_id = EXCLUDED.maintenance_worker_id,
  updated_at = EXCLUDED.updated_at;

-- =============================================================================
-- NOTES
-- - If INSERT fails (missing columns / NOT NULL): align names with your DB.
-- - If auth.users INSERT fails: skip SECTION 0; sign up three users in the app
--   and replace the three b1111111-... UUIDs everywhere in this file.
-- - Login after SECTION 0: jordan.dummy.seed@example.com / DummySeed123!
--   Maintenance workers: chris.mw.seed@example.com / dana.mw.seed@example.com (same password)
-- - Re-run safe: upserts on main tables; applicant_references deleted first.
-- - Maintenance: 7 requests — mix of pending, in_progress (assigned), completed (with worker).
-- =============================================================================
