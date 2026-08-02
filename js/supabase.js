// Automatic Zero-Setup Cloud Database & Supabase Integration (Developer: Suman Kolay)

const CLOUD_BLOB_URL = "https://jsonblob.com/api/jsonBlob/019fc276-8dac-7215-9dea-84b45ba09252";

const SUPABASE_URL = "https://eunwcvdackphjqpyujwn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bndjdmRhY2twaGpxcHl1anduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAwMDAsImV4cCI6MjEwMTI0NjAwMH0.1S3c7bWTOCyREehT6WyOhtoyjQkTKY148ABHPKz2pFM";

export let supabase = null;

if (window.supabase) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client initialized.");
  } catch (err) {
    console.warn("Supabase init error:", err);
  }
}

// --- INSTANT CLOUD DATA FETCH ---
export async function fetchCloudData() {
  try {
    const res = await fetch(CLOUD_BLOB_URL, { cache: 'no-store' });
    if (!res.ok) return { players: [], teams: [] };
    const data = await res.json();
    return {
      players: Array.isArray(data.players) ? data.players : [],
      teams: Array.isArray(data.teams) ? data.teams : []
    };
  } catch (err) {
    console.warn("Cloud blob fetch warning:", err);
    return { players: [], teams: [] };
  }
}

// --- INSTANT CLOUD DATA SAVE ---
export async function saveCloudData(playersList, teamsList) {
  try {
    const payload = {
      players: playersList || [],
      teams: teamsList || []
    };
    await fetch(CLOUD_BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("Cloud Database updated successfully!");
  } catch (err) {
    console.warn("Cloud blob save warning:", err);
  }
}

// --- SUPABASE SYNC HELPERS ---
export async function syncPlayerToSupabase(playerData) {
  if (!supabase) return;
  try {
    await supabase.from('players').upsert([playerData]);
  } catch (err) {
    // fallback active
  }
}

export async function syncTeamToSupabase(teamData) {
  if (!supabase) return;
  try {
    await supabase.from('teams').upsert([teamData]);
  } catch (err) {
    // fallback active
  }
}

export async function deletePlayerFromSupabase(playerId) {
  if (!supabase) return;
  try {
    await supabase.from('players').delete().eq('id', playerId);
  } catch (err) {
    // fallback active
  }
}

export async function deleteTeamFromSupabase(teamId) {
  if (!supabase) return;
  try {
    await supabase.from('teams').delete().eq('id', teamId);
  } catch (err) {
    // fallback active
  }
}
