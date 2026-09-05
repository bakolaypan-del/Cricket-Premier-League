-- ==============================================================================
-- DATABASE MIGRATION: NORMALIZE PLAYER AUCTION DATA IN PUBLIC.PLAYERS
-- 1. Ensure public.players has dedicated auction columns:
--    - auction_status (TEXT: 'AVAILABLE', 'SOLD', 'UNSOLD')
--    - sold_price (NUMERIC DEFAULT 0)
--    - team_id (UUID REFERENCES public.teams(id))
--    - is_icon (BOOLEAN DEFAULT false)
--    - bid_history (JSONB DEFAULT '[]'::jsonb)
-- 2. Backfill existing player statuses, sold prices, and team allocations from:
--    - tournaments.format_config.player_statuses
--    - tournaments.format_config.player_overrides
--    - public.teams.icon_player_id
-- 3. Create high-performance indexes for auction room queries.
-- 4. Clean up redundant player_statuses and player_overrides from format_config.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- STEP 1: Add columns to public.players if they do not exist
-- ------------------------------------------------------------------------------
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS auction_status TEXT DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS sold_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_icon BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bid_history JSONB DEFAULT '[]'::jsonb;

-- Ensure foreign key from players.team_id to teams.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_players_team_id' AND table_name = 'players'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
      ALTER TABLE public.players
        ADD CONSTRAINT fk_players_team_id FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 2: Backfill icon players from public.teams
-- ------------------------------------------------------------------------------
UPDATE public.players p
SET 
  is_icon = true,
  auction_status = 'SOLD',
  team_id = t.id,
  sold_price = COALESCE(t.icon_player_fee, p.sold_price, 0)
FROM public.teams t
WHERE t.icon_player_id = p.id;

-- ------------------------------------------------------------------------------
-- STEP 3: Backfill from tournaments.format_config (player_overrides and player_statuses)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  t_row RECORD;
  player_id_key TEXT;
  override_val JSONB;
  status_val TEXT;
BEGIN
  FOR t_row IN 
    SELECT id, format_config 
    FROM public.tournaments 
    WHERE format_config IS NOT NULL 
      AND (format_config ? 'player_overrides' OR format_config ? 'player_statuses')
  LOOP
    -- A. Process player_overrides
    IF t_row.format_config ? 'player_overrides' THEN
      FOR player_id_key, override_val IN 
        SELECT key, value FROM jsonb_each(t_row.format_config->'player_overrides')
      LOOP
        IF player_id_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          UPDATE public.players
          SET
            auction_status = UPPER(COALESCE(override_val->>'auctionStatus', CASE WHEN (override_val->>'teamId') IS NOT NULL THEN 'SOLD' WHEN (override_val->>'isUnsold')::boolean = true THEN 'UNSOLD' ELSE auction_status END, 'AVAILABLE')),
            sold_price = COALESCE((override_val->>'soldPrice')::numeric, (override_val->>'boughtPrice')::numeric, sold_price, 0),
            team_id = CASE 
              WHEN (override_val->>'teamId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
              THEN (override_val->>'teamId')::uuid 
              ELSE team_id 
            END,
            is_icon = COALESCE((override_val->>'isIcon')::boolean, is_icon, false)
          WHERE id = player_id_key::uuid;
        END IF;
      END LOOP;
    END IF;

    -- B. Process player_statuses
    IF t_row.format_config ? 'player_statuses' THEN
      FOR player_id_key, status_val IN 
        SELECT key, value::text FROM jsonb_each_text(t_row.format_config->'player_statuses')
      LOOP
        IF player_id_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          IF UPPER(status_val) IN ('SOLD', 'UNSOLD') THEN
            UPDATE public.players
            SET auction_status = UPPER(status_val)
            WHERE id = player_id_key::uuid AND auction_status = 'AVAILABLE';
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- C. Clean up player_statuses and player_overrides from format_config
    UPDATE public.tournaments
    SET format_config = format_config - 'player_statuses' - 'player_overrides'
    WHERE id = t_row.id;

  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 4: Standardize legacy values in public.players
-- ------------------------------------------------------------------------------
UPDATE public.players
SET auction_status = 'SOLD'
WHERE (auction_status IS NULL OR auction_status = 'AVAILABLE') AND team_id IS NOT NULL;

UPDATE public.players
SET auction_status = 'SOLD'
WHERE LOWER(status) = 'sold' AND (auction_status IS NULL OR auction_status = 'AVAILABLE');

UPDATE public.players
SET auction_status = 'UNSOLD'
WHERE LOWER(status) = 'unsold' AND (auction_status IS NULL OR auction_status = 'AVAILABLE');

-- ------------------------------------------------------------------------------
-- STEP 5: Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_players_auction_status ON public.players(tournament_id, auction_status);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON public.players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_is_icon ON public.players(tournament_id, is_icon);

COMMIT;
