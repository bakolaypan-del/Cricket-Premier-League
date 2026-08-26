-- ==============================================================================
-- MISSING TABLES FOR FULL SUPABASE MIGRATION
-- Run AFTER supabase_schema.sql (which creates the core 11 tables)
-- ==============================================================================

-- 12. COMMUNITY QUERIES & DISCUSSION BOARD
CREATE TABLE IF NOT EXISTS public.community_queries (
  id TEXT PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Anonymous Visitor',
  user_role TEXT DEFAULT 'VISITOR',
  message TEXT NOT NULL,
  replies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_queries_tourney ON public.community_queries(tournament_id);

ALTER TABLE public.community_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Community queries viewable by everyone" ON public.community_queries FOR SELECT USING (true);
CREATE POLICY "Anyone can post a community query" ON public.community_queries FOR INSERT WITH CHECK (true);
CREATE POLICY "Organiser can manage own tournament queries" ON public.community_queries FOR ALL USING (
  tournament_id IN (SELECT id FROM public.tournaments WHERE organiser_id = auth.uid())
);
CREATE POLICY "Master admin full access on community queries" ON public.community_queries FOR ALL USING (public.is_master_admin());

-- 13. PLATFORM SETTINGS (Key-Value Config Store)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform settings viewable by everyone" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Master admin can manage platform settings" ON public.platform_settings FOR ALL USING (public.is_master_admin());

-- Seed default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('general', '{"isHostTournamentEnabled": true, "allowPublicRegistrationModeA": true, "allowQuickFixturesModeB": true, "maxTeamsDefault": 16}'::jsonb),
  ('popup', '{"enabled": false, "title": "", "message": "", "type": "info"}'::jsonb),
  ('ads', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 14. AUCTION ARCHIVES (Permanent Snapshots)
CREATE TABLE IF NOT EXISTS public.auction_archives (
  id TEXT PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_archives_tourney ON public.auction_archives(tournament_id);

ALTER TABLE public.auction_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auction archives viewable by everyone" ON public.auction_archives FOR SELECT USING (true);
CREATE POLICY "Organiser can manage own tournament archives" ON public.auction_archives FOR ALL USING (
  tournament_id IN (SELECT id FROM public.tournaments WHERE organiser_id = auth.uid())
);
CREATE POLICY "Master admin full access on auction archives" ON public.auction_archives FOR ALL USING (public.is_master_admin());

-- 15. USER ACCOUNTS (Phone-Based Player/Owner Auth - Transition Table)
CREATE TABLE IF NOT EXISTS public.user_accounts (
  phone TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  name TEXT DEFAULT 'Player',
  role TEXT DEFAULT 'PLAYER' CHECK (role IN ('PLAYER', 'TOURNAMENT_OWNER', 'SUPER_ADMIN')),
  player_id TEXT,
  is_first_login BOOLEAN DEFAULT true,
  owned_tournaments JSONB DEFAULT '[]'::jsonb,
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own account" ON public.user_accounts FOR SELECT USING (true);
CREATE POLICY "Users can update own account" ON public.user_accounts FOR UPDATE USING (true);
CREATE POLICY "Anyone can create account" ON public.user_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Master admin full access on user accounts" ON public.user_accounts FOR ALL USING (public.is_master_admin());

-- 16. TOURNAMENT OWNERS (Maps phone → tournament access)
CREATE TABLE IF NOT EXISTS public.tournament_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT DEFAULT 'Tournament Owner',
  assigned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_owners_tourney ON public.tournament_owners(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_owners_phone ON public.tournament_owners(phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_owners_unique ON public.tournament_owners(tournament_id, phone);

ALTER TABLE public.tournament_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournament owners viewable by everyone" ON public.tournament_owners FOR SELECT USING (true);
CREATE POLICY "Master admin full access on tournament owners" ON public.tournament_owners FOR ALL USING (public.is_master_admin());

-- 17. VISITOR TRACKING (Analytics)
CREATE TABLE IF NOT EXISTS public.visitor_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  total_visitors INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  live_online INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.visitor_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitor stats viewable by everyone" ON public.visitor_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can update visitor stats" ON public.visitor_stats FOR ALL USING (true);

-- Add missing columns to tournaments table for inline settings
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_settings JSONB DEFAULT '{"isPlayerRegOpen": true, "isTeamRegOpen": true}'::jsonb;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS auction_settings JSONB DEFAULT '{"defaultBasePrice": 300, "defaultPurseBudget": 8000}'::jsonb;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS format_config JSONB DEFAULT '{}'::jsonb;
