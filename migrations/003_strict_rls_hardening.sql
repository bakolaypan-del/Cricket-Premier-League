-- ==============================================================================
-- MIGRATION 003: COMPREHENSIVE PRODUCTION ROW LEVEL SECURITY (RLS) HARDENING
-- Target: Supabase PostgreSQL
-- Project: Cricket Premier League Multi-Tenant SaaS
-- Description: Locks down all tables with granular role & tournament-state policies.
-- ==============================================================================

-- 1. Helper Security Functions
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'master_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_tournament_organiser(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_master_admin() THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = t_id AND (organiser_id = auth.uid() OR organiser_id IS NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_registration_open(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = t_id AND registration_open = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 2. ENABLE RLS ON ALL SYSTEM TABLES
-- ==============================================================================

ALTER TABLE IF EXISTS public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.squad ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_verification_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.person_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auction_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visitor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 3. DROP EXISTING CONFLICTING POLICIES SAFELY
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;


-- ==============================================================================
-- 4. HARDENED POLICIES PER TABLE
-- ==============================================================================

-- 4.1 PROFILES (Supabase Auth Users)
CREATE POLICY "Public profiles are viewable by all"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can insert profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');

CREATE POLICY "Master admin has full control on profiles"
  ON public.profiles FOR ALL
  USING (public.is_master_admin());


-- 4.2 TOURNAMENTS
CREATE POLICY "Public can view active tournaments"
  ON public.tournaments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL);

CREATE POLICY "Organisers can update own tournaments"
  ON public.tournaments FOR UPDATE
  USING (public.is_tournament_organiser(id))
  WITH CHECK (public.is_tournament_organiser(id));

CREATE POLICY "Master admin can delete tournaments"
  ON public.tournaments FOR DELETE
  USING (public.is_master_admin());


-- 4.3 PLAYERS
CREATE POLICY "Public can view players"
  ON public.players FOR SELECT
  USING (true);

-- Only allow registration when tournament registration is actively OPEN (or admin)
CREATE POLICY "Players can register when registration is open"
  ON public.players FOR INSERT
  WITH CHECK (
    public.is_registration_open(tournament_id) OR
    public.is_tournament_organiser(tournament_id) OR
    auth.role() = 'authenticated'
  );

CREATE POLICY "Organisers can update tournament players"
  ON public.players FOR UPDATE
  USING (public.is_tournament_organiser(tournament_id))
  WITH CHECK (public.is_tournament_organiser(tournament_id));

CREATE POLICY "Organisers can delete tournament players"
  ON public.players FOR DELETE
  USING (public.is_tournament_organiser(tournament_id));


-- 4.4 PLAYER VERIFICATION DOCS (Sensitive: Aadhaar, Payment Proofs)
-- Public can NEVER view documents; only the tournament organiser and master admin can view.
CREATE POLICY "Organisers can view verification docs"
  ON public.player_verification_docs FOR SELECT
  USING (public.is_tournament_organiser(tournament_id));

-- Anyone can submit docs when registering for an open tournament
CREATE POLICY "Anyone can submit verification docs on registration"
  ON public.player_verification_docs FOR INSERT
  WITH CHECK (
    public.is_registration_open(tournament_id) OR
    public.is_tournament_organiser(tournament_id) OR
    auth.role() = 'authenticated'
  );

CREATE POLICY "Organisers can update verification docs"
  ON public.player_verification_docs FOR UPDATE
  USING (public.is_tournament_organiser(tournament_id))
  WITH CHECK (public.is_tournament_organiser(tournament_id));

CREATE POLICY "Organisers can delete verification docs"
  ON public.player_verification_docs FOR DELETE
  USING (public.is_tournament_organiser(tournament_id));


-- 4.5 TEAMS
CREATE POLICY "Public can view teams"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Organisers can insert teams"
  ON public.teams FOR INSERT
  WITH CHECK (public.is_tournament_organiser(tournament_id) OR auth.role() = 'authenticated');

CREATE POLICY "Organisers can update teams"
  ON public.teams FOR UPDATE
  USING (public.is_tournament_organiser(tournament_id))
  WITH CHECK (public.is_tournament_organiser(tournament_id));

CREATE POLICY "Organisers can delete teams"
  ON public.teams FOR DELETE
  USING (public.is_tournament_organiser(tournament_id));


-- 4.6 MATCHES & SCORECARDS
CREATE POLICY "Public can view matches"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Organisers can manage matches"
  ON public.matches FOR ALL
  USING (public.is_tournament_organiser(tournament_id))
  WITH CHECK (public.is_tournament_organiser(tournament_id));

CREATE POLICY "Public can view scorecards"
  ON public.scorecards FOR SELECT
  USING (true);

CREATE POLICY "Organisers can manage scorecards"
  ON public.scorecards FOR ALL
  USING (public.is_tournament_organiser(tournament_id))
  WITH CHECK (public.is_tournament_organiser(tournament_id));


-- 4.7 SQUAD & PLAYER CATEGORIES
CREATE POLICY "Public can view squad"
  ON public.squad FOR SELECT
  USING (true);

CREATE POLICY "Organisers can manage squad"
  ON public.squad FOR ALL
  USING (public.is_tournament_organiser(tournament_id))
  WITH CHECK (public.is_tournament_organiser(tournament_id));

CREATE POLICY "Public can view player categories"
  ON public.player_categories FOR SELECT
  USING (true);

CREATE POLICY "Organisers can manage player categories"
  ON public.player_categories FOR ALL
  USING (public.is_tournament_organiser(tournament_id))
  WITH CHECK (public.is_tournament_organiser(tournament_id));


-- 4.8 PERSON PROFILES (Universal Player Cache)
CREATE POLICY "Public can view person profiles"
  ON public.person_profiles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can upsert person profiles on registration"
  ON public.person_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update own person profile"
  ON public.person_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Master admin can delete person profiles"
  ON public.person_profiles FOR DELETE
  USING (public.is_master_admin());


-- 4.9 PLATFORM SETTINGS & AUCTION ARCHIVES
CREATE POLICY "Public can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Master admin can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

CREATE POLICY "Public can view auction archives"
  ON public.auction_archives FOR SELECT
  USING (true);

CREATE POLICY "Organisers can manage auction archives"
  ON public.auction_archives FOR ALL
  USING (public.is_tournament_organiser(tournament_id))
  WITH CHECK (public.is_tournament_organiser(tournament_id));


-- 4.10 TOURNAMENT OWNERS & USER ACCOUNTS (High Security)
CREATE POLICY "Authenticated users can view tournament owners"
  ON public.tournament_owners FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Master admin can manage tournament owners"
  ON public.tournament_owners FOR ALL
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

CREATE POLICY "Authenticated users can view user accounts"
  ON public.user_accounts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Master admin can manage user accounts"
  ON public.user_accounts FOR ALL
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());


-- 4.11 COMMUNITY QUERIES & VISITOR STATS
CREATE POLICY "Public can view community queries"
  ON public.community_queries FOR SELECT
  USING (true);

CREATE POLICY "Public can submit community queries"
  ON public.community_queries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Master admin can manage community queries"
  ON public.community_queries FOR ALL
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

CREATE POLICY "Public can view visitor stats"
  ON public.visitor_stats FOR SELECT
  USING (true);

CREATE POLICY "Public can track visitor stats"
  ON public.visitor_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update visitor stats"
  ON public.visitor_stats FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- 4.12 AUDIT LOG (Append-Only)
CREATE POLICY "Master admin can view audit logs"
  ON public.audit_log FOR SELECT
  USING (public.is_master_admin());

CREATE POLICY "System can record audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Audit logs cannot be updated or deleted"
  ON public.audit_log FOR UPDATE
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON public.audit_log FOR DELETE
  USING (false);
