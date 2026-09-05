-- ==============================================================================
-- DATABASE REFACTORING MIGRATION: UNIFY TEAMS STORAGE IN public.teams
-- Target: Supabase / PostgreSQL
-- 1. Add extended columns to public.teams
-- 2. Backfill existing data from format_config.custom_teams into public.teams
-- 3. Remove custom_teams JSON array from tournaments.format_config
-- 4. Create performance indexes for instant tournament team lookups
-- ==============================================================================

BEGIN;

-- 1. ADD EXTENDED COLUMNS TO public.teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS captain_name TEXT,
  ADD COLUMN IF NOT EXISTS co_owner_name TEXT,
  ADD COLUMN IF NOT EXISTS mentor_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS icon_player_id UUID,
  ADD COLUMN IF NOT EXISTS icon_player_name TEXT,
  ADD COLUMN IF NOT EXISTS icon_player_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS max_squad INT DEFAULT 15;

-- 2. BACKFILL EXTENDED DATA FROM format_config.custom_teams INTO public.teams
DO $$
DECLARE
  t_row RECORD;
  team_elem JSONB;
  t_id UUID;
  icon_pid UUID;
  icon_fee NUMERIC;
  rem_purse NUMERIC;
  tot_purse NUMERIC;
BEGIN
  FOR t_row IN 
    SELECT id, format_config 
    FROM public.tournaments 
    WHERE format_config ? 'custom_teams' 
      AND jsonb_typeof(format_config->'custom_teams') = 'array'
  LOOP
    FOR team_elem IN SELECT * FROM jsonb_array_elements(t_row.format_config->'custom_teams')
    LOOP
      -- Check if valid UUID for team
      IF team_elem->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        t_id := (team_elem->>'id')::UUID;
      ELSE
        t_id := gen_random_uuid();
      END IF;

      -- Check icon_player_id UUID
      icon_pid := NULL;
      IF team_elem->>'iconPlayerId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        icon_pid := (team_elem->>'iconPlayerId')::UUID;
      END IF;

      -- Parse numbers
      icon_fee := COALESCE(NULLIF(team_elem->>'iconPlayerFee', '')::NUMERIC, NULLIF(team_elem->>'iconFee', '')::NUMERIC, 0);
      rem_purse := COALESCE(NULLIF(team_elem->>'remainingPurse', '')::NUMERIC, NULLIF(team_elem->>'purse', '')::NUMERIC, 8000);
      tot_purse := COALESCE(NULLIF(team_elem->>'purseBudget', '')::NUMERIC, NULLIF(team_elem->>'purse', '')::NUMERIC, 8000);

      INSERT INTO public.teams (
        id,
        tournament_id,
        name,
        short_name,
        owner_name,
        owner_phone,
        owner_photo_url,
        captain_name,
        co_owner_name,
        mentor_name,
        logo_url,
        group_code,
        budget_total,
        budget_remaining,
        icon_player_id,
        icon_player_name,
        icon_player_fee,
        registration_status,
        payment_status,
        max_squad,
        updated_at
      ) VALUES (
        t_id,
        t_row.id,
        COALESCE(team_elem->>'name', 'Team'),
        COALESCE(team_elem->>'shortCode', substring(COALESCE(team_elem->>'name', 'TM'), 1, 3)),
        team_elem->>'ownerName',
        team_elem->>'ownerPhone',
        COALESCE(team_elem->>'ownerPhotoUrl', team_elem->>'ownerPhoto'),
        COALESCE(team_elem->>'captainName', team_elem->>'ownerName'),
        team_elem->>'coOwnerName',
        team_elem->>'mentorName',
        COALESCE(team_elem->>'logoUrl', team_elem->>'teamLogoUrl', 'assets/jsl_logo.jpg'),
        COALESCE(team_elem->>'groupCode', team_elem->>'group', 'A'),
        tot_purse,
        rem_purse,
        icon_pid,
        COALESCE(team_elem->>'iconPlayerName', team_elem->>'iconName'),
        icon_fee,
        COALESCE(team_elem->>'registrationStatus', 'APPROVED'),
        COALESCE(team_elem->>'paymentStatus', 'APPROVED'),
        COALESCE((team_elem->>'maxSquad')::INT, 15),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        owner_photo_url = COALESCE(EXCLUDED.owner_photo_url, public.teams.owner_photo_url),
        captain_name = COALESCE(EXCLUDED.captain_name, public.teams.captain_name),
        co_owner_name = COALESCE(EXCLUDED.co_owner_name, public.teams.co_owner_name),
        mentor_name = COALESCE(EXCLUDED.mentor_name, public.teams.mentor_name),
        icon_player_id = COALESCE(EXCLUDED.icon_player_id, public.teams.icon_player_id),
        icon_player_name = COALESCE(EXCLUDED.icon_player_name, public.teams.icon_player_name),
        icon_player_fee = COALESCE(EXCLUDED.icon_player_fee, public.teams.icon_player_fee),
        registration_status = COALESCE(EXCLUDED.registration_status, public.teams.registration_status),
        payment_status = COALESCE(EXCLUDED.payment_status, public.teams.payment_status),
        max_squad = COALESCE(EXCLUDED.max_squad, public.teams.max_squad),
        budget_total = COALESCE(EXCLUDED.budget_total, public.teams.budget_total),
        budget_remaining = COALESCE(EXCLUDED.budget_remaining, public.teams.budget_remaining);
    END LOOP;
  END LOOP;
END $$;

-- 3. REMOVE custom_teams FROM tournaments.format_config
UPDATE public.tournaments
SET format_config = format_config - 'custom_teams'
WHERE format_config ? 'custom_teams';

-- 4. PERFORMANCE INDEX FOR INSTANT LOOKUPS
CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON public.teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_icon_player_id ON public.teams(icon_player_id);

COMMIT;
