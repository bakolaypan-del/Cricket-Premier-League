-- ==============================================================================
-- DATABASE REFACTORING MIGRATION: CLEAN 2-TABLE RELATIONAL MODEL
-- Target: Supabase / PostgreSQL
-- 1. Add payment columns (upi_id, payment_qr_url) to public.profiles
-- 2. Add explicit tournament columns to public.tournaments (unpacking registration_settings)
-- 3. Backfill data from registration_settings JSONB into tournaments & profiles
-- 4. Drop registration_settings column and obsolete tables (tournament_owners, user_accounts)
-- ==============================================================================

BEGIN;

-- 1. ADD ORGANISER PAYMENT COLUMNS TO public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;

-- 2. ADD TYPED COLUMNS TO public.tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS kickoff_date TEXT,
  ADD COLUMN IF NOT EXISTS prize_winner NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_registration_open BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_player_reg_open BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_team_reg_open BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS closed_reason TEXT DEFAULT 'Registration is currently closed by the Admin.',
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending_approval',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approval_updated_at TIMESTAMPTZ;

-- 3. DATA BACKFILL FROM registration_settings (JSONB) INTO tournaments COLUMNS
UPDATE public.tournaments
SET
  kickoff_date = COALESCE(
    kickoff_date,
    registration_settings->>'kickoff_date'
  ),
  prize_winner = COALESCE(
    prize_winner,
    CASE
      WHEN registration_settings->>'prize_winner' ~ '^[0-9]+(\.[0-9]+)?$'
      THEN (registration_settings->>'prize_winner')::NUMERIC
      ELSE 0
    END
  ),
  is_registration_open = COALESCE(
    CASE
      WHEN registration_settings->>'isRegistrationOpen' IS NOT NULL
      THEN (registration_settings->>'isRegistrationOpen')::BOOLEAN
      ELSE NULL
    END,
    true
  ),
  is_player_reg_open = COALESCE(
    CASE
      WHEN registration_settings->>'isPlayerRegOpen' IS NOT NULL
      THEN (registration_settings->>'isPlayerRegOpen')::BOOLEAN
      ELSE NULL
    END,
    true
  ),
  is_team_reg_open = COALESCE(
    CASE
      WHEN registration_settings->>'isTeamRegOpen' IS NOT NULL
      THEN (registration_settings->>'isTeamRegOpen')::BOOLEAN
      ELSE NULL
    END,
    true
  ),
  closed_reason = COALESCE(
    registration_settings->>'closedReason',
    'Registration is currently closed by the Admin.'
  ),
  approval_status = COALESCE(
    registration_settings->>'approval_status',
    CASE
      WHEN status = 'active' THEN 'approved'
      WHEN status = 'archived' THEN 'rejected'
      WHEN status = 'suspended' THEN 'pending_approval'
      ELSE 'approved'
    END
  ),
  rejection_reason = registration_settings->>'rejection_reason',
  approval_updated_at = CASE
    WHEN registration_settings->>'approval_updated_at' IS NOT NULL
    THEN (registration_settings->>'approval_updated_at')::TIMESTAMPTZ
    ELSE updated_at
  END
WHERE registration_settings IS NOT NULL;

-- 4. BACKFILL ORGANISER UPI & QR CODE INTO public.profiles WHERE LINKED
UPDATE public.profiles p
SET
  upi_id = COALESCE(p.upi_id, t.registration_settings->>'upi_id'),
  payment_qr_url = COALESCE(p.payment_qr_url, t.registration_settings->>'payment_qr_url')
FROM public.tournaments t
WHERE t.organiser_id = p.id
  AND t.registration_settings IS NOT NULL
  AND (t.registration_settings->>'upi_id' IS NOT NULL OR t.registration_settings->>'payment_qr_url' IS NOT NULL);

-- Backfill profile phone if null and available in registration_settings
UPDATE public.profiles p
SET
  phone = COALESCE(p.phone, t.registration_settings->>'organiser_phone')
FROM public.tournaments t
WHERE t.organiser_id = p.id
  AND p.phone IS NULL
  AND t.registration_settings->>'organiser_phone' IS NOT NULL;

-- 5. DROP REDUNDANT registration_settings COLUMN FROM tournaments
ALTER TABLE public.tournaments
  DROP COLUMN IF EXISTS registration_settings;

-- 6. DROP OBSOLETE TABLES
DROP TABLE IF EXISTS public.tournament_owners CASCADE;
DROP TABLE IF EXISTS public.user_accounts CASCADE;

COMMIT;
