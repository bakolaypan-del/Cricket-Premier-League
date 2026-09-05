-- ==============================================================================
-- DATABASE MIGRATION: LIVE AUCTION STATE IN TOURNAMENT_AUCTIONS
-- 1. Add live_state JSONB column to public.tournament_auctions
-- 2. Backfill existing live_auction state from tournaments.format_config
-- 3. Clean up live_auction from tournaments.format_config
-- ==============================================================================

BEGIN;

-- STEP 1: Add live_state column to public.tournament_auctions
ALTER TABLE public.tournament_auctions
  ADD COLUMN IF NOT EXISTS live_state JSONB DEFAULT '{}'::jsonb;

-- STEP 2: Backfill existing live_auction from format_config if present
UPDATE public.tournament_auctions ta
SET 
  live_state = t.format_config->'live_auction',
  updated_at = now()
FROM public.tournaments t
WHERE ta.tournament_id = t.id
  AND t.format_config ? 'live_auction'
  AND (ta.live_state IS NULL OR ta.live_state = '{}'::jsonb);

-- STEP 3: Clean up live_auction from tournaments.format_config
UPDATE public.tournaments
SET format_config = format_config - 'live_auction'
WHERE format_config ? 'live_auction';

COMMIT;
