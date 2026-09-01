-- ==============================================================================
-- CRICKET PREMIER LEAGUE (CPL) MULTI-TENANT SAAS DATABASE SCHEMA
-- Target Database: PostgreSQL / Supabase
-- Architecture: Multi-Tenant with tournament_id Foreign Keys & Row Level Security (RLS)
-- Developer: Suman Kolay
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USER PROFILES & ROLES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'player' CHECK (role IN ('master_admin', 'organiser', 'player')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. TOURNAMENTS TABLE (Core Multi-Tenant Root)
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_code TEXT DEFAULT 'JSL',
  mode TEXT DEFAULT 'registration_auction' CHECK (mode IN ('registration_auction', 'manual', 'AUCTION_LEAGUE', 'FIXTURE_ONLY')),
  logo_url TEXT,
  banner_url TEXT,
  poster_url TEXT,
  registration_fee NUMERIC DEFAULT 0,
  registration_open BOOLEAN DEFAULT true,
  total_team_budget NUMERIC DEFAULT 10000,
  base_price NUMERIC DEFAULT 300,
  icon_price NUMERIC DEFAULT 2000,
  last_reg_number INT DEFAULT 0,
  rules_text TEXT,
  venue_name TEXT DEFAULT 'Jhankra School Ground',
  kickoff_date TEXT,
  prize_winner NUMERIC DEFAULT 35000,
  entry_fee NUMERIC DEFAULT 300,
  organiser_name TEXT,
  organiser_phone TEXT,
  upi_id TEXT,
  payment_qr_url TEXT,
  auction_settings JSONB DEFAULT '{}'::jsonb,
  format_config JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended', 'archived', 'pending_approval', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_organiser ON public.tournaments(organiser_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON public.tournaments(slug);

-- 3. UNIVERSAL PERSON PROFILES (Sync across multiple tournaments by phone)
CREATE TABLE IF NOT EXISTS public.person_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  role TEXT DEFAULT 'All-Rounder',
  batting_style TEXT DEFAULT 'Right Hand Bat',
  bowling_style TEXT DEFAULT 'Right Arm Medium',
  dob DATE,
  age INT,
  village TEXT,
  district TEXT,
  state TEXT,
  jersey_size TEXT,
  aadhaar_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_person_profiles_phone ON public.person_profiles(phone);

-- 4. PLAYER CATEGORIES (Base Price per Category scoped to Tournament)
CREATE TABLE IF NOT EXISTS public.player_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_price NUMERIC NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_categories_tourney ON public.player_categories(tournament_id);

-- 5. FRANCHISE TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  owner_name TEXT,
  owner_phone TEXT,
  logo_url TEXT,
  group_code TEXT DEFAULT 'A',
  budget_total NUMERIC DEFAULT 10000,
  budget_remaining NUMERIC DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_tourney ON public.teams(tournament_id);

-- 6. TOURNAMENT PLAYERS TABLE
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL,
  reg_number INT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  photo_url TEXT,
  role TEXT DEFAULT 'All-Rounder',
  category_name TEXT DEFAULT 'Category B',
  base_price NUMERIC DEFAULT 200,
  is_icon BOOLEAN DEFAULT false,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'unsold', 'withdrawn')),
  sold_price NUMERIC DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  jersey_size TEXT,
  source TEXT DEFAULT 'registered' CHECK (source IN ('registered', 'manual')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_tourney ON public.players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_phone ON public.players(phone);
CREATE INDEX IF NOT EXISTS idx_players_verified ON public.players(verified);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team_id);

-- 7. SENSITIVE VERIFICATION DOCUMENTS TABLE (Aadhaar & Payment Proof)
CREATE TABLE IF NOT EXISTS public.player_verification_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  aadhaar_url TEXT,
  id_card_back_url TEXT,
  payment_screenshot_url TEXT,
  payment_ref TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_docs_player ON public.player_verification_docs(player_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_tourney ON public.player_verification_docs(tournament_id);

-- 8. AUCTION SQUADS TABLE
CREATE TABLE IF NOT EXISTS public.squad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  price_bought NUMERIC DEFAULT 0,
  is_icon BOOLEAN DEFAULT false,
  sold_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_squad_tourney ON public.squad(tournament_id);
CREATE INDEX IF NOT EXISTS idx_squad_team ON public.squad(team_id);

-- 9. MATCH FIXTURES TABLE
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_no INT,
  stage TEXT DEFAULT 'LEAGUE',
  group_code TEXT DEFAULT 'A',
  team_a_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team_b_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  date TEXT,
  time TEXT,
  venue TEXT DEFAULT 'Jhankra School Ground',
  overs_limit INT DEFAULT 16,
  status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'UPCOMING', 'LIVE', 'COMPLETED', 'ABANDONED')),
  toss_details TEXT,
  winner_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  mom_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  result TEXT,
  live_state JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_tourney ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- 10. BALL-BY-BALL SCORECARDS TABLE (Source for Tournament Awards)
CREATE TABLE IF NOT EXISTS public.scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  innings INT DEFAULT 1,
  runs INT DEFAULT 0,
  balls INT DEFAULT 0,
  fours INT DEFAULT 0,
  sixes INT DEFAULT 0,
  strike_rate NUMERIC DEFAULT 0,
  is_out BOOLEAN DEFAULT false,
  dismissal_type TEXT,
  bowler_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  fielder_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  overs_bowled NUMERIC DEFAULT 0,
  balls_bowled INT DEFAULT 0,
  runs_conceded INT DEFAULT 0,
  wickets INT DEFAULT 0,
  maidens INT DEFAULT 0,
  economy NUMERIC DEFAULT 0,
  catches INT DEFAULT 0,
  stumpings INT DEFAULT 0,
  run_outs INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scorecards_tourney ON public.scorecards(tournament_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_match ON public.scorecards(match_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_player ON public.scorecards(player_id);

-- 11. AUDIT LOG TABLE (Track Admin & Master Admin Actions)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tourney ON public.audit_log(tournament_id);

-- 12. PLATFORM SETTINGS TABLE (Key-Value for Admin Settings)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. TOURNAMENT OWNERS TABLE (Phone-based Owner Login)
CREATE TABLE IF NOT EXISTS public.tournament_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  password_hash TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_tournament_owners_tourney ON public.tournament_owners(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_owners_phone ON public.tournament_owners(phone);

-- 14. USER ACCOUNTS TABLE (Player & Owner Accounts)
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  role TEXT DEFAULT 'PLAYER' CHECK (role IN ('PLAYER', 'TOURNAMENT_OWNER', 'SUPER_ADMIN')),
  player_id TEXT,
  is_first_login BOOLEAN DEFAULT true,
  owned_tournaments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_phone ON public.user_accounts(phone);

-- 15. AUCTION ARCHIVES TABLE
CREATE TABLE IF NOT EXISTS public.auction_archives (
  id TEXT PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_archives_tourney ON public.auction_archives(tournament_id);

-- 16. COMMUNITY QUERIES TABLE
CREATE TABLE IF NOT EXISTS public.community_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_queries_tourney ON public.community_queries(tournament_id);

-- 17. VISITOR STATS TABLE
CREATE TABLE IF NOT EXISTS public.visitor_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  total_visitors INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  live_online INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_stats_tourney ON public.visitor_stats(tournament_id);

-- FUNCTIONS & ATOMIC PROCEDURES

-- Atomic Sequential Registration Counter Function
CREATE OR REPLACE FUNCTION public.get_next_reg_number(t_id UUID)
RETURNS INT AS $$
DECLARE
  next_val INT;
BEGIN
  UPDATE public.tournaments
  SET last_reg_number = COALESCE(last_reg_number, 0) + 1
  WHERE id = t_id
  RETURNING last_reg_number INTO next_val;
  RETURN next_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-Aadhaar Cleanup Trigger Function (DPDP Act Compliance)
CREATE OR REPLACE FUNCTION public.handle_player_verification_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified = true AND (OLD.verified = false OR OLD.verified IS NULL) THEN
    UPDATE public.player_verification_docs
    SET aadhaar_url = NULL, status = 'verified', updated_at = now()
    WHERE player_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_player_verification_cleanup ON public.players;
CREATE TRIGGER trigger_player_verification_cleanup
AFTER UPDATE OF verified ON public.players
FOR EACH ROW
WHEN (NEW.verified = true AND (OLD.verified = false OR OLD.verified IS NULL))
EXECUTE FUNCTION public.handle_player_verification_cleanup();

-- User Profile Sync on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_verification_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'master_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Master admin full access on profiles" ON public.profiles FOR ALL USING (public.is_master_admin());

-- TOURNAMENTS
CREATE POLICY "Active tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Public can insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Organiser can manage own tournaments" ON public.tournaments FOR ALL USING (organiser_id = auth.uid() OR organiser_id IS NULL);
CREATE POLICY "Master admin full access on tournaments" ON public.tournaments FOR ALL USING (public.is_master_admin());

-- PLAYERS
CREATE POLICY "Public can view all players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public registration insert" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Organiser can manage own tournament players" ON public.players FOR ALL USING (
  tournament_id IN (SELECT id FROM public.tournaments WHERE organiser_id = auth.uid())
);
CREATE POLICY "Master admin full access on players" ON public.players FOR ALL USING (public.is_master_admin());

-- VERIFICATION DOCS
CREATE POLICY "Organiser can view own tournament verification docs" ON public.player_verification_docs FOR SELECT USING (
  tournament_id IN (SELECT id FROM public.tournaments WHERE organiser_id = auth.uid())
);
CREATE POLICY "Public can upload verification docs on registration" ON public.player_verification_docs FOR INSERT WITH CHECK (true);
CREATE POLICY "Master admin full access on verification docs" ON public.player_verification_docs FOR ALL USING (public.is_master_admin());

-- TEAMS
CREATE POLICY "Teams viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Organiser can manage own tournament teams" ON public.teams FOR ALL USING (
  tournament_id IN (SELECT id FROM public.tournaments WHERE organiser_id = auth.uid())
);
CREATE POLICY "Master admin full access on teams" ON public.teams FOR ALL USING (public.is_master_admin());

-- SQUAD
CREATE POLICY "Squad viewable by everyone" ON public.squad FOR SELECT USING (true);
CREATE POLICY "Organiser can manage own tournament squads" ON public.squad FOR ALL USING (
  tournament_id IN (SELECT id FROM public.tournaments WHERE organiser_id = auth.uid())
);
CREATE POLICY "Master admin full access on squad" ON public.squad FOR ALL USING (public.is_master_admin());

-- MATCHES
CREATE POLICY "Matches viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Organiser can manage own tournament matches" ON public.matches FOR ALL USING (
  tournament_id IN (SELECT id FROM public.tournaments WHERE organiser_id = auth.uid())
);
CREATE POLICY "Master admin full access on matches" ON public.matches FOR ALL USING (public.is_master_admin());

-- SCORECARDS
CREATE POLICY "Scorecards viewable by everyone" ON public.scorecards FOR SELECT USING (true);
CREATE POLICY "Organiser can manage own tournament scorecards" ON public.scorecards FOR ALL USING (
  tournament_id IN (SELECT id FROM public.tournaments WHERE organiser_id = auth.uid())
);
CREATE POLICY "Master admin full access on scorecards" ON public.scorecards FOR ALL USING (public.is_master_admin());

-- AUDIT LOG
CREATE POLICY "Master admin can view audit logs" ON public.audit_log FOR SELECT USING (public.is_master_admin());
CREATE POLICY "System can insert audit logs" ON public.audit_log FOR INSERT WITH CHECK (true);

-- PLATFORM SETTINGS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform settings readable by everyone" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Master admin full access on platform_settings" ON public.platform_settings FOR ALL USING (public.is_master_admin());

-- TOURNAMENT OWNERS
ALTER TABLE public.tournament_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournament owners readable by everyone" ON public.tournament_owners FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tournament owners" ON public.tournament_owners FOR INSERT WITH CHECK (true);
CREATE POLICY "Master admin full access on tournament_owners" ON public.tournament_owners FOR ALL USING (public.is_master_admin());

-- USER ACCOUNTS
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User accounts readable by everyone" ON public.user_accounts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user accounts" ON public.user_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Master admin full access on user_accounts" ON public.user_accounts FOR ALL USING (public.is_master_admin());

-- AUCTION ARCHIVES
ALTER TABLE public.auction_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auction archives readable by everyone" ON public.auction_archives FOR SELECT USING (true);
CREATE POLICY "Anyone can upsert auction archives" ON public.auction_archives FOR INSERT WITH CHECK (true);
CREATE POLICY "Master admin full access on auction_archives" ON public.auction_archives FOR ALL USING (public.is_master_admin());

-- COMMUNITY QUERIES
ALTER TABLE public.community_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Community queries readable by everyone" ON public.community_queries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert community queries" ON public.community_queries FOR INSERT WITH CHECK (true);
CREATE POLICY "Master admin full access on community_queries" ON public.community_queries FOR ALL USING (public.is_master_admin());

-- VISITOR STATS
ALTER TABLE public.visitor_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitor stats readable by everyone" ON public.visitor_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can upsert visitor stats" ON public.visitor_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Master admin full access on visitor_stats" ON public.visitor_stats FOR ALL USING (public.is_master_admin());
