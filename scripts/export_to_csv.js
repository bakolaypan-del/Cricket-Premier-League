const fs = require('fs');
const path = require('path');

const jsonPath = path.join(process.cwd(), 'supabase_data_dump.json');
const outDir = path.join(process.cwd(), 'supabase_csv');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function escapeCsvValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows) {
  if (!rows || rows.length === 0) return '';
  // Collect all unique column keys across rows
  const colSet = new Set();
  rows.forEach(r => Object.keys(r).forEach(k => colSet.add(k)));
  const cols = Array.from(colSet);

  const headerLine = cols.map(escapeCsvValue).join(',');
  const rowLines = rows.map(r => cols.map(c => escapeCsvValue(r[c])).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Generating CSV files from Supabase dump:');
for (const [table, rows] of Object.entries(data)) {
  if (rows && rows.length > 0) {
    const csvContent = toCsv(rows);
    const filePath = path.join(outDir, `${table}.csv`);
    fs.writeFileSync(filePath, csvContent, 'utf8');
    console.log(`✅ ${table}.csv (${rows.length} rows)`);
  }
}

console.log(`\n🎉 All CSV files saved in: ${outDir}`);
