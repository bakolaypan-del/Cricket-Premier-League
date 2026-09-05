-- ==============================================================================
-- DATABASE NORMALIZATION: PLAYERS & PERSON_PROFILES
-- 1. Add missing personal columns to person_profiles (village, district, state, jersey_size)
--    Note: 'age' is omitted because it is dynamically calculated from 'dob'
-- 2. Ensure RLS policies on public.person_profiles
-- 3. Backfill public.person_profiles with distinct players from public.players
-- 4. Link public.players.person_id to public.person_profiles.id
-- 5. Safely drop redundant personal columns from public.players
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- STEP 1: Add missing columns to person_profiles (if not already present)
-- ------------------------------------------------------------------------------
ALTER TABLE public.person_profiles
  ADD COLUMN IF NOT EXISTS village TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS jersey_size TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE;

-- ------------------------------------------------------------------------------
-- STEP 2: Ensure RLS policies on person_profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.person_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'person_profiles' AND policyname = 'Public can view person profiles'
  ) THEN
    CREATE POLICY "Public can view person profiles" ON public.person_profiles FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'person_profiles' AND policyname = 'Public can insert/upsert person profiles'
  ) THEN
    CREATE POLICY "Public can insert/upsert person profiles" ON public.person_profiles FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'person_profiles' AND policyname = 'Public can update person profiles'
  ) THEN
    CREATE POLICY "Public can update person profiles" ON public.person_profiles FOR UPDATE USING (true);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 3: Backfill unique players into person_profiles
-- ------------------------------------------------------------------------------
INSERT INTO public.person_profiles (
  id,
  phone,
  name,
  photo_url,
  role,
  batting_style,
  bowling_style,
  dob,
  village,
  district,
  state,
  jersey_size,
  created_at,
  updated_at
)
SELECT DISTINCT ON (regexp_replace(phone, '[^0-9]', '', 'g'))
  gen_random_uuid(),
  regexp_replace(phone, '[^0-9]', '', 'g') AS phone,
  name,
  photo_url,
  role,
  'Right Hand Bat',
  'Right Arm Medium',
  dob,
  village,
  district,
  state,
  jersey_size,
  created_at,
  now()
FROM public.players
WHERE phone IS NOT NULL AND length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10
ORDER BY regexp_replace(phone, '[^0-9]', '', 'g'), created_at DESC
ON CONFLICT (phone) DO UPDATE 
SET 
  name = COALESCE(public.person_profiles.name, EXCLUDED.name),
  photo_url = COALESCE(public.person_profiles.photo_url, EXCLUDED.photo_url),
  village = COALESCE(public.person_profiles.village, EXCLUDED.village),
  district = COALESCE(public.person_profiles.district, EXCLUDED.district),
  state = COALESCE(public.person_profiles.state, EXCLUDED.state),
  jersey_size = COALESCE(public.person_profiles.jersey_size, EXCLUDED.jersey_size),
  dob = COALESCE(public.person_profiles.dob, EXCLUDED.dob),
  updated_at = now();

-- ------------------------------------------------------------------------------
-- STEP 4: Link players.person_id -> person_profiles.id
-- ------------------------------------------------------------------------------
UPDATE public.players p
SET person_id = pr.id
FROM public.person_profiles pr
WHERE regexp_replace(p.phone, '[^0-9]', '', 'g') = pr.phone
  AND (p.person_id IS NULL OR p.person_id <> pr.id);

-- ------------------------------------------------------------------------------
-- STEP 5: Drop redundant personal columns from players
-- (name, phone, photo_url, role, village, district, state, dob, age, jersey_size
--  are now cleanly resolved via players.person_id -> person_profiles)
-- ------------------------------------------------------------------------------
ALTER TABLE public.players
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS photo_url,
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS village,
  DROP COLUMN IF EXISTS district,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS dob,
  DROP COLUMN IF EXISTS age,
  DROP COLUMN IF EXISTS jersey_size;

-- ------------------------------------------------------------------------------
-- STEP 6: High-Performance Indexes for lightning-fast queries & minimal row reads
-- ------------------------------------------------------------------------------
-- Index on players.person_id (Foreign Key lookups & JOIN performance)
CREATE INDEX IF NOT EXISTS idx_players_person_id ON public.players(person_id);

-- Composite index on (tournament_id, status) for fast scoped roster reads
CREATE INDEX IF NOT EXISTS idx_players_tourney_status ON public.players(tournament_id, status);

-- Composite index on (tournament_id, person_id) for instant duplicate registration checks
CREATE INDEX IF NOT EXISTS idx_players_tourney_person ON public.players(tournament_id, person_id);

-- Index on person_profiles.phone for fast universal profile lookups
CREATE INDEX IF NOT EXISTS idx_person_profiles_phone ON public.person_profiles(phone);

COMMIT;

