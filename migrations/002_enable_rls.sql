-- =====================================================================
-- CPL Row Level Security (RLS) Policies
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/eunwcvdackphjqpyujwn/sql
-- =====================================================================
-- Access model:
--   Anonymous (not logged in) = public visitors & players registering
--   Authenticated = admins/organizers logged in via Supabase Auth
-- =====================================================================

-- 1. TOURNAMENTS — everyone reads, only admins write
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournaments"
  ON tournaments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage tournaments"
  ON tournaments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 2. PLAYERS — everyone reads (scores, auction results), anonymous can insert (registration), admins can update/delete
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can register as a player"
  ON players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update players"
  ON players FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete players"
  ON players FOR DELETE
  USING (auth.role() = 'authenticated');


-- 3. TEAMS — everyone reads, only admins write
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teams"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage teams"
  ON teams FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 4. MATCHES — everyone reads (live scores), only admins write
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matches"
  ON matches FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage matches"
  ON matches FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 5. PLAYER_VERIFICATION_DOCS — only admins can read/write (sensitive: Aadhaar, payment proofs)
ALTER TABLE player_verification_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can view verification docs"
  ON player_verification_docs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can submit verification docs during registration"
  ON player_verification_docs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update verification docs"
  ON player_verification_docs FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete verification docs"
  ON player_verification_docs FOR DELETE
  USING (auth.role() = 'authenticated');


-- 6. PERSON_PROFILES — everyone reads (auto-fill on registration), anyone can upsert (created during registration)
ALTER TABLE person_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view person profiles"
  ON person_profiles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can upsert person profiles"
  ON person_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update person profiles"
  ON person_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete person profiles"
  ON person_profiles FOR DELETE
  USING (auth.role() = 'authenticated');


-- 7. PLATFORM_SETTINGS — everyone reads (ads, popups, general config), only admins write
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view platform settings"
  ON platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage platform settings"
  ON platform_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 8. AUCTION_ARCHIVES — everyone reads (past auction results), only admins write
ALTER TABLE auction_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auction archives"
  ON auction_archives FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage auction archives"
  ON auction_archives FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 9. COMMUNITY_QUERIES — everyone reads, anyone can submit, only admins delete
ALTER TABLE community_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view community queries"
  ON community_queries FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit community queries"
  ON community_queries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage community queries"
  ON community_queries FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete community queries"
  ON community_queries FOR DELETE
  USING (auth.role() = 'authenticated');


-- 10. TOURNAMENT_OWNERS — only admins
ALTER TABLE tournament_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tournament owners"
  ON tournament_owners FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage tournament owners"
  ON tournament_owners FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 11. USER_ACCOUNTS — only admins
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view user accounts"
  ON user_accounts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage user accounts"
  ON user_accounts FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 12. VISITOR_STATS — everyone reads, anyone can update (visitor tracking is anonymous)
ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visitor stats"
  ON visitor_stats FOR SELECT
  USING (true);

CREATE POLICY "Anyone can upsert visitor stats"
  ON visitor_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update visitor stats"
  ON visitor_stats FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- 13. AUDIT_LOG — only admins can read, anyone can insert (logging happens from client)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit log"
  ON audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert audit log entries"
  ON audit_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "No one can update audit log"
  ON audit_log FOR UPDATE
  USING (false);

CREATE POLICY "No one can delete audit log"
  ON audit_log FOR DELETE
  USING (false);


-- 14. PROFILES (Supabase Auth profiles) — users see own, admins see all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
