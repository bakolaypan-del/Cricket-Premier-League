const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://eunwcvdackphjqpyujwn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_s_eZ15ii6ZFoFGODEU0AWg_-eVyzZcn";

const TABLES = [
  'tournaments',
  'profiles',
  'person_profiles',
  'player_categories',
  'teams',
  'players',
  'player_verification_docs',
  'squad',
  'matches',
  'scorecards',
  'audit_log',
  'platform_settings',
  'tournament_owners',
  'user_accounts',
  'auction_archives',
  'community_queries',
  'visitor_stats'
];

function fetchTable(table) {
  return new Promise((resolve) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}?select=*`);
    const req = https.get(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ table, status: 'ok', data: JSON.parse(body) });
          } catch (err) {
            resolve({ table, status: 'parse_error', error: err.message, data: [] });
          }
        } else {
          resolve({ table, status: 'error', statusCode: res.statusCode, error: body, data: [] });
        }
      });
    });
    req.on('error', (err) => resolve({ table, status: 'req_error', error: err.message, data: [] }));
  });
}

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function run() {
  console.log(`📡 Connecting to ${SUPABASE_URL}...`);
  const results = {};
  const outputSql = [];

  outputSql.push(`-- ==============================================================================`);
  outputSql.push(`-- SUPABASE LOCAL BACKUP / DATA DUMP`);
  outputSql.push(`-- Project URL: ${SUPABASE_URL}`);
  outputSql.push(`-- Exported At: ${new Date().toISOString()}`);
  outputSql.push(`-- ==============================================================================\n`);
  outputSql.push(`BEGIN;\n`);

  for (const table of TABLES) {
    process.stdout.write(`Fetching ${table.padEnd(26)}... `);
    const res = await fetchTable(table);
    if (res.status === 'ok') {
      const rows = res.data;
      results[table] = rows;
      console.log(`✅ ${rows.length} rows`);

      if (rows.length > 0) {
        outputSql.push(`-- ------------------------------------------------------------------------------`);
        outputSql.push(`-- Table: public.${table} (${rows.length} rows)`);
        outputSql.push(`-- ------------------------------------------------------------------------------`);

        for (const row of rows) {
          const cols = Object.keys(row);
          const colList = cols.map(c => `"${c}"`).join(', ');
          const valList = cols.map(c => escapeSqlValue(row[c])).join(', ');
          outputSql.push(`INSERT INTO public.${table} (${colList}) VALUES (${valList}) ON CONFLICT DO NOTHING;`);
        }
        outputSql.push('');
      }
    } else {
      console.log(`⚠️ Status ${res.statusCode || res.status}`);
    }
  }

  outputSql.push(`COMMIT;\n`);

  const sqlFilePath = path.join(process.cwd(), 'supabase_backup_local.sql');
  fs.writeFileSync(sqlFilePath, outputSql.join('\n'), 'utf8');
  console.log(`\n🎉 Saved complete SQL dump to: ${sqlFilePath}`);

  const jsonFilePath = path.join(process.cwd(), 'supabase_data_dump.json');
  fs.writeFileSync(jsonFilePath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`🎉 Saved JSON dataset to: ${jsonFilePath}`);
}

run();
