-- ==============================================================================
-- DATABASE REFACTORING MIGRATION: CREATE tournament_auctions RELATIONAL TABLE
-- Target: Supabase / PostgreSQL
-- 1. Create public.tournament_auctions table
-- 2. Backfill existing tournament auction rules & budgets from tournaments
-- 3. Remove auction_settings JSONB from public.tournaments and format_config
-- 4. Create performance indexes and enable Row Level Security (RLS)
-- ==============================================================================

BEGIN;

-- 1. CREATE public.tournament_auctions TABLE
CREATE TABLE IF NOT EXISTS public.tournament_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID UNIQUE NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  purse_budget NUMERIC DEFAULT 8000,
  base_price NUMERIC DEFAULT 300,
  icon_price NUMERIC DEFAULT 500,
  max_squad_size INT DEFAULT 15,
  min_squad_size INT DEFAULT 11,
  bid_increment_slabs JSONB DEFAULT '[
    {"maxLimit": 1000, "increment": 50},
    {"maxLimit": 2000, "increment": 100},
    {"maxLimit": 999999, "increment": 200}
  ]'::jsonb,
  status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BACKFILL DATA FROM EXISTING tournaments & auction_settings JSONB
INSERT INTO public.tournament_auctions (
  tournament_id,
  purse_budget,
  base_price,
  icon_price,
  max_squad_size,
  bid_increment_slabs,
  status,
  created_at,
  updated_at
)
SELECT
  t.id,
  COALESCE(
    NULLIF(t.auction_settings->>'defaultPurseBudget', '')::NUMERIC,
    t.total_team_budget,
    8000
  ),
  COALESCE(
    NULLIF(t.auction_settings->>'defaultBasePrice', '')::NUMERIC,
    300
  ),
  COALESCE(
    NULLIF(t.auction_settings->>'defaultIconPrice', '')::NUMERIC,
    t.icon_price,
    500
  ),
  COALESCE(
    NULLIF(t.auction_settings->>'maxSquadSize', '')::INT,
    15
  ),
  COALESCE(
    t.auction_settings->'bidIncrementSlabs',
    '[
      {"maxLimit": 1000, "increment": 50},
      {"maxLimit": 2000, "increment": 100},
      {"maxLimit": 999999, "increment": 200}
    ]'::jsonb
  ),
  'SCHEDULED',
  t.created_at,
  now()
FROM public.tournaments t
ON CONFLICT (tournament_id) DO UPDATE SET
  purse_budget = EXCLUDED.purse_budget,
  base_price = EXCLUDED.base_price,
  icon_price = EXCLUDED.icon_price,
  max_squad_size = EXCLUDED.max_squad_size,
  bid_increment_slabs = EXCLUDED.bid_increment_slabs,
  updated_at = now();

-- 3. REMOVE auction_settings JSONB FROM tournaments TABLE & format_config
ALTER TABLE public.tournaments
  DROP COLUMN IF EXISTS auction_settings;

UPDATE public.tournaments
SET format_config = format_config - 'auction_settings'
WHERE format_config ? 'auction_settings';

-- 4. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_tournament_auctions_tourney ON public.tournament_auctions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_auctions_status ON public.tournament_auctions(status);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.tournament_auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournament auctions"
  ON public.tournament_auctions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can upsert tournament auctions"
  ON public.tournament_auctions FOR ALL
  USING (true)
  WITH CHECK (true);

COMMIT;
