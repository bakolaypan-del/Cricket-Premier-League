/**
 * Firebase → Supabase Data Migration Script
 *
 * HOW TO USE:
 * 1. First, run supabase_schema.sql in your Supabase SQL Editor to create all tables
 * 2. Open this file in Node.js OR paste the fetch sections into browser console
 * 3. It fetches all data from Firebase RTDB and generates INSERT SQL
 * 4. Copy the output SQL and run it in Supabase SQL Editor
 *
 * OR: Run in browser console on your live site (it has Firebase access)
 */

const FIREBASE_DB_URL = "https://cpl-jsl-2026-default-rtdb.firebaseio.com";

// Escape single quotes for SQL
function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

function escOrNull(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  return esc(val);
}

function numOrDefault(val, def = 0) {
  const n = Number(val);
  return isNaN(n) ? def : n;
}

function boolSql(val) {
  return val === true || val === 'true' || val === 'APPROVED' ? 'true' : 'false';
}

// Generate a deterministic UUID v5-style from a string (for consistent ID mapping)
function makeUUID(input) {
  let hash = 0;
  const str = String(input);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  // Pad to fill a UUID format
  const base = hex.repeat(4).substring(0, 32);
  return `${base.slice(0,8)}-${base.slice(8,12)}-4${base.slice(13,16)}-a${base.slice(17,20)}-${base.slice(20,32)}`;
}

async function fetchFirebase(path) {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master/${path}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(`Failed to fetch ${path}:`, e);
    return null;
  }
}

async function migrate() {
  console.log("🔄 Fetching data from Firebase...");

  const [players, teams, tournaments, universalPlayers, fixtures] = await Promise.all([
    fetchFirebase('players'),
    fetchFirebase('teams'),
    fetchFirebase('tournaments'),
    fetchFirebase('universal_players'),
    fetchFirebase('fixtures')
  ]);

  const sql = [];
  sql.push('-- =============================================');
  sql.push('-- Firebase → Supabase Migration SQL');
  sql.push(`-- Generated: ${new Date().toISOString()}`);
  sql.push('-- =============================================');
  sql.push('BEGIN;');
  sql.push('');

  // Track ID mappings (old Firebase ID → new Supabase UUID)
  const tournamentMap = {};  // leagueId → UUID
  const teamMap = {};        // old team id → UUID
  const playerMap = {};      // old player id → UUID

  // ---- 1. TOURNAMENTS (from leagues/tournaments data) ----
  sql.push('-- === TOURNAMENTS ===');

  // We need to create tournament entries from the league data
  // The INITIAL_LEAGUES from data.js define the known leagues
  const knownLeagues = [
    { id: 'leg-jsl', code: 'JSL', name: 'JHANKRA SUPER LEAGUE 2026', mode: 'registration_auction', fee: 300, budget: 8000, icon_price: 2000, venue: 'JHANKRA SCHOOL GROUND', slug: 'jsl-2026' },
    { id: 'leg-jpl', code: 'JPL', name: 'JPL - Jhankra Premier League 2026', mode: 'registration_auction', fee: 1500, budget: 10000, icon_price: 2000, venue: 'Jhankra Stadium Ground', slug: 'jpl-2026' },
    { id: 'leg-kpl', code: 'KPL', name: 'KPL - Kota Premier League 2026', mode: 'registration_auction', fee: 1000, budget: 10000, icon_price: 2000, venue: 'Kota Sports Ground', slug: 'kpl-2026' }
  ];

  // Also check Firebase custom tournaments
  if (tournaments) {
    for (const [tId, tData] of Object.entries(tournaments)) {
      if (tData && tData.meta) {
        const meta = tData.meta;
        const existing = knownLeagues.find(l => l.id === tId || l.code === meta.category);
        if (!existing) {
          knownLeagues.push({
            id: tId,
            code: meta.category || tId.toUpperCase(),
            name: meta.name || tId,
            mode: meta.mode === 'manual' ? 'manual' : 'registration_auction',
            fee: numOrDefault(meta.entryFee || meta.playerEntryFee, 0),
            budget: numOrDefault(meta.auctionPurse || meta.purse, 10000),
            icon_price: numOrDefault(meta.iconPrice, 2000),
            venue: meta.venue || 'TBD',
            slug: (meta.slug || tId).toLowerCase().replace(/[^a-z0-9-]/g, '-')
          });
        }
      }
    }
  }

  for (const league of knownLeagues) {
    const uuid = makeUUID(league.id);
    tournamentMap[league.id] = uuid;
    // Also map by code (teams/players reference by leagueId which may be the code)
    tournamentMap[league.code] = uuid;
    tournamentMap[league.code.toLowerCase()] = uuid;

    sql.push(`INSERT INTO public.tournaments (id, slug, name, category_code, mode, registration_fee, total_team_budget, icon_price, venue_name, status) VALUES (${esc(uuid)}, ${esc(league.slug)}, ${esc(league.name)}, ${esc(league.code)}, ${esc(league.mode)}, ${league.fee}, ${league.budget}, ${league.icon_price}, ${esc(league.venue)}, 'active') ON CONFLICT (id) DO NOTHING;`);
  }
  sql.push('');

  // ---- 2. TEAMS ----
  sql.push('-- === TEAMS ===');
  if (teams) {
    const teamEntries = Array.isArray(teams) ? teams.filter(Boolean) : Object.values(teams).filter(Boolean);
    for (const t of teamEntries) {
      const uuid = makeUUID(t.id || t.name);
      teamMap[t.id] = uuid;
      if (t.shortCode) teamMap[t.shortCode] = uuid;

      const tourneyId = tournamentMap[t.leagueId] || tournamentMap['leg-jsl'];

      sql.push(`INSERT INTO public.teams (id, tournament_id, name, short_name, owner_name, owner_phone, logo_url, budget_total, budget_remaining) VALUES (${esc(uuid)}, ${esc(tourneyId)}, ${esc(t.name)}, ${escOrNull(t.shortCode)}, ${escOrNull(t.ownerName)}, ${escOrNull(t.ownerPhone)}, ${escOrNull(t.logoUrl || t.teamLogoUrl)}, ${numOrDefault(t.purse, 8000)}, ${numOrDefault(t.remainingPurse, 8000)}) ON CONFLICT (id) DO NOTHING;`);
    }
  }
  sql.push('');

  // ---- 3. UNIVERSAL PLAYER PROFILES (person_profiles) ----
  sql.push('-- === PERSON PROFILES (Universal Players) ===');
  const personMap = {}; // phone → UUID
  if (universalPlayers) {
    for (const [phone, p] of Object.entries(universalPlayers)) {
      if (!p) continue;
      const uuid = makeUUID(`person-${phone}`);
      personMap[phone] = uuid;

      sql.push(`INSERT INTO public.person_profiles (id, phone, name, photo_url, role, batting_style, bowling_style) VALUES (${esc(uuid)}, ${esc(phone)}, ${esc(p.name || 'Unknown')}, ${escOrNull(p.photo_url || p.photoUrl)}, ${escOrNull(p.role || 'All-Rounder')}, ${escOrNull(p.batting_style || p.battingStyle)}, ${escOrNull(p.bowling_style || p.bowlingStyle)}) ON CONFLICT (phone) DO NOTHING;`);
    }
  }
  sql.push('');

  // ---- 4. PLAYERS ----
  sql.push('-- === PLAYERS ===');
  if (players) {
    const playerEntries = Array.isArray(players) ? players.filter(Boolean) : Object.values(players).filter(Boolean);
    let regCounter = 0;
    for (const p of playerEntries) {
      regCounter++;
      const uuid = makeUUID(p.id || `player-${regCounter}`);
      playerMap[p.id] = uuid;

      const phone = (p.phone || p.mobile || '').replace(/[^0-9]/g, '');
      const tourneyId = tournamentMap[p.leagueId] || tournamentMap[p.category] || tournamentMap['leg-jsl'];
      const teamId = p.teamId ? (teamMap[p.teamId] || 'NULL') : 'NULL';
      const personId = phone ? (personMap[phone] || 'NULL') : 'NULL';

      let status = 'available';
      if (p.auctionStatus === 'SOLD' || p.teamId) status = 'sold';
      else if (p.auctionStatus === 'UNSOLD') status = 'unsold';

      sql.push(`INSERT INTO public.players (id, tournament_id, person_id, reg_number, name, phone, photo_url, role, category_name, base_price, is_icon, team_id, status, sold_price, verified, source) VALUES (${esc(uuid)}, ${esc(tourneyId)}, ${personId === 'NULL' ? 'NULL' : esc(personId)}, ${p.serialNo || regCounter}, ${esc(p.name || 'Unknown')}, ${esc(phone || '0000000000')}, ${escOrNull(p.photoUrl || p.photo_url)}, ${escOrNull(p.role || 'All-Rounder')}, ${escOrNull(p.category || 'Category B')}, ${numOrDefault(p.basePrice, 200)}, ${boolSql(p.isIcon)}, ${teamId === 'NULL' ? 'NULL' : esc(teamId)}, ${esc(status)}, ${numOrDefault(p.soldPrice || p.boughtPrice, 0)}, ${boolSql(p.paymentStatus === 'APPROVED' || p.verified)}, ${esc(p.source || 'registered')}) ON CONFLICT (id) DO NOTHING;`);

      // If player has verification docs
      if (p.aadhaarUrl || p.paymentScreenshot || p.payment_screenshot_url) {
        sql.push(`INSERT INTO public.player_verification_docs (player_id, tournament_id, aadhaar_url, payment_screenshot_url, status) VALUES (${esc(uuid)}, ${esc(tourneyId)}, ${escOrNull(p.aadhaarUrl)}, ${escOrNull(p.paymentScreenshot || p.payment_screenshot_url)}, ${p.paymentStatus === 'APPROVED' ? "'verified'" : "'pending'"}) ON CONFLICT DO NOTHING;`);
      }
    }
  }
  sql.push('');

  // ---- 5. FIXTURES / MATCHES ----
  sql.push('-- === MATCHES ===');
  if (fixtures) {
    const fixtureEntries = Array.isArray(fixtures) ? fixtures.filter(Boolean) : Object.values(fixtures).filter(Boolean);
    for (const f of fixtureEntries) {
      const uuid = makeUUID(f.id || `match-${f.matchNo}`);
      const tourneyId = tournamentMap[f.leagueId] || tournamentMap[f.category] || tournamentMap['leg-jsl'];
      const teamAId = f.teamAId ? (teamMap[f.teamAId] || null) : null;
      const teamBId = f.teamBId ? (teamMap[f.teamBId] || null) : null;

      let status = 'SCHEDULED';
      if (f.status === 'COMPLETED' || f.status === 'FINISHED') status = 'COMPLETED';
      else if (f.status === 'LIVE') status = 'LIVE';

      sql.push(`INSERT INTO public.matches (id, tournament_id, match_no, stage, group_code, team_a_id, team_b_id, date, time, venue, overs_limit, status, result) VALUES (${esc(uuid)}, ${esc(tourneyId)}, ${numOrDefault(f.matchNo, 0)}, ${esc(f.stage || 'LEAGUE')}, ${escOrNull(f.group || 'A')}, ${teamAId ? esc(teamAId) : 'NULL'}, ${teamBId ? esc(teamBId) : 'NULL'}, ${escOrNull(f.date)}, ${escOrNull(f.time)}, ${escOrNull(f.venue)}, ${numOrDefault(f.oversLimit || f.overs, 16)}, ${esc(status)}, ${escOrNull(f.result)}) ON CONFLICT (id) DO NOTHING;`);

      // If match has playerStats (scorecard data), migrate those too
      if (f.liveMatchState && f.liveMatchState.playerStats) {
        const stats = f.liveMatchState.playerStats;
        for (const [pid, s] of Object.entries(stats)) {
          if (!s) continue;
          const pUuid = playerMap[pid] || makeUUID(pid);
          const tId = s.teamId ? (teamMap[s.teamId] || null) : null;

          sql.push(`INSERT INTO public.scorecards (tournament_id, match_id, player_id, team_id, runs, balls, fours, sixes, is_out, overs_bowled, balls_bowled, runs_conceded, wickets, maidens, catches, stumpings, run_outs) VALUES (${esc(tourneyId)}, ${esc(uuid)}, ${esc(pUuid)}, ${tId ? esc(tId) : 'NULL'}, ${numOrDefault(s.runs)}, ${numOrDefault(s.balls || s.ballsFaced)}, ${numOrDefault(s.fours)}, ${numOrDefault(s.sixes)}, ${boolSql(s.isOut)}, ${numOrDefault(s.oversBowled)}, ${numOrDefault(s.ballsBowled)}, ${numOrDefault(s.runsConceded)}, ${numOrDefault(s.wickets)}, ${numOrDefault(s.maidens)}, ${numOrDefault(s.catches)}, ${numOrDefault(s.stumpings)}, ${numOrDefault(s.runOuts)}) ON CONFLICT DO NOTHING;`);
        }
      }
    }
  }
  sql.push('');

  // ---- 6. DEFAULT PLAYER CATEGORIES FOR JSL ----
  sql.push('-- === DEFAULT PLAYER CATEGORIES ===');
  const jslId = tournamentMap['leg-jsl'];
  if (jslId) {
    sql.push(`INSERT INTO public.player_categories (tournament_id, name, base_price) VALUES (${esc(jslId)}, 'Icon', 2000) ON CONFLICT DO NOTHING;`);
    sql.push(`INSERT INTO public.player_categories (tournament_id, name, base_price) VALUES (${esc(jslId)}, 'Category A', 500) ON CONFLICT DO NOTHING;`);
    sql.push(`INSERT INTO public.player_categories (tournament_id, name, base_price) VALUES (${esc(jslId)}, 'Category B', 200) ON CONFLICT DO NOTHING;`);
    sql.push(`INSERT INTO public.player_categories (tournament_id, name, base_price) VALUES (${esc(jslId)}, 'Category C', 100) ON CONFLICT DO NOTHING;`);
  }
  sql.push('');

  sql.push('COMMIT;');
  sql.push(`-- Total: ${Object.keys(tournamentMap).length / 3} tournaments, ${Object.keys(teamMap).length} teams, ${Object.keys(playerMap).length} players, ${Object.keys(personMap).length} person profiles`);

  const output = sql.join('\n');
  console.log("✅ Migration SQL generated! Total lines:", sql.length);
  console.log("📋 Copy the output below and paste into Supabase SQL Editor:\n");
  console.log(output);

  // Also try to copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(output);
      console.log("📋 SQL copied to clipboard!");
    } catch (e) {}
  }

  return output;
}

// Auto-run if loaded as a module or in browser console
if (typeof window !== 'undefined') {
  window.runMigration = migrate;
  console.log("🔧 Firebase → Supabase Migration Script loaded.");
  console.log("   Run: window.runMigration() to generate SQL");
} else {
  migrate().then(sql => {
    // Node.js: write to file
    const fs = require('fs');
    fs.writeFileSync('migration_output.sql', sql);
    console.log("📁 Written to migration_output.sql");
  });
}
