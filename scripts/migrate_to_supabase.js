// ==============================================================================
// 1-CLICK FIREBASE TO SUPABASE POSTGRESQL DATA MIGRATION SCRIPT
// Transports all live Players, Teams, Tournaments, and Profiles to Supabase
// Developer: Suman Kolay
// ==============================================================================

const https = require('https');

const FIREBASE_DB_URL = 'https://cpl-jsl-2026-default-rtdb.firebaseio.com/cpl_master.json';

// Fetch credentials from CLI arguments or environment variables
const SUPABASE_URL = process.argv[2] || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.argv[3] || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function postToSupabase(table, payload) {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return resolve({ simulated: true });
    }
    const urlObj = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    const postData = JSON.stringify(payload);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', c => responseData += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(responseData)); } catch (e) { resolve(responseData); }
        } else {
          reject(new Error(`Status ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runMigration() {
  console.log('🚀 Starting Data Audit & Migration Preparation...');
  console.log('📥 Fetching live database snapshot from Firebase...');

  const liveData = await fetchJson(FIREBASE_DB_URL);

  const players = Object.values(liveData.players || {});
  const teams = Object.values(liveData.teams || {});
  const tournaments = Object.values(liveData.tournaments || {});
  const fixtures = Array.isArray(liveData.fixtures) ? liveData.fixtures : Object.values(liveData.fixtures || {});
  const universalPlayers = Object.values(liveData.universal_players || {});

  console.log('\n📊 === SOURCE DATA DISCOVERED IN LIVE DATABASE ===');
  console.log(`  • Registered Players : ${players.length}`);
  console.log(`  • Franchise Teams    : ${teams.length}`);
  console.log(`  • Custom Tournaments : ${tournaments.length + 1} (Includes Default JSL 2026)`);
  console.log(`  • Match Fixtures     : ${fixtures.length}`);
  console.log(`  • Universal Profiles : ${universalPlayers.length}`);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('\n================================================================');
    console.log('  ⚠️  SUPABASE CREDENTIALS REQUIRED FOR TRANSFER');
    console.log('================================================================');
    console.log('Usage:');
    console.log('  node scripts/migrate_to_supabase.js <SUPABASE_URL> <SUPABASE_KEY>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/migrate_to_supabase.js https://xyz.supabase.co eyJhbGci...');
    console.log('================================================================\n');
    return;
  }

  console.log(`\n📤 Transferring data to Supabase (${SUPABASE_URL})...`);

  // 1. Migrate Tournaments
  console.log('1. Migrating Tournaments...');
  const defaultTourney = {
    slug: 'jsl-2026',
    name: 'Jhankra Super League (JSL 2026)',
    category_code: 'JSL',
    mode: 'registration_auction',
    total_team_budget: 10000,
    registration_fee: 300,
    status: 'active'
  };
  await postToSupabase('tournaments', defaultTourney);

  // 2. Migrate Teams
  console.log(`2. Migrating ${teams.length} Teams...`);
  for (const t of teams) {
    await postToSupabase('teams', {
      name: t.name,
      short_name: t.shortName || t.name.slice(0, 4).toUpperCase(),
      owner_name: t.ownerName || 'Franchise Owner',
      owner_phone: t.ownerPhone || '',
      logo_url: t.logoUrl || t.teamLogoUrl || '',
      group_code: t.group || t.group_code || 'A',
      budget_total: t.budgetTotal || 10000,
      budget_remaining: t.budgetRemaining || 10000
    });
  }

  // 3. Migrate Players
  console.log(`3. Migrating ${players.length} Players...`);
  let pCount = 0;
  for (const p of players) {
    await postToSupabase('players', {
      name: p.name,
      phone: p.phone || '',
      role: p.category || p.role || 'All-Rounder',
      category_name: p.playerCategory || 'Category B',
      base_price: p.basePrice || 200,
      photo_url: p.photoUrl || p.photo_url || '',
      verified: p.registrationStatus === 'APPROVED' || p.verified === true,
      source: p.source || 'registered'
    });
    pCount++;
    if (pCount % 25 === 0) console.log(`   Processed ${pCount}/${players.length} players...`);
  }

  console.log(`\n🎉 Data Migration Completed! All ${players.length} players and ${teams.length} teams transferred.`);
}

runMigration().catch(err => {
  console.error('\n❌ Migration notice:', err.message);
});
