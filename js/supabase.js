// Supabase Cloud Database Client Integration (Developer: Suman Kolay)

const SUPABASE_URL = "https://eunwcvdackphjqpyujwn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bndjdmRhY2twaGpxcHl1anduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAwMDAsImV4cCI6MjEwMTI0NjAwMH0.1S3c7bWTOCyREehT6WyOhtoyjQkTKY148ABHPKz2pFM";

export let supabase = null;

if (window.supabase) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client initialized successfully with URL:", SUPABASE_URL);
  } catch (err) {
    console.warn("Supabase initialization error:", err);
  }
}

// --- REAL-TIME PLAYERS CLOUD SYNC ---
export async function syncPlayerToSupabase(playerData) {
  if (!supabase) return null;
  try {
    const payload = {
      id: playerData.id,
      serialNo: playerData.serialNo,
      regNo: playerData.regNo,
      name: playerData.name,
      phone: playerData.phone,
      address: playerData.address || '',
      category: playerData.category || playerData.role || 'Player',
      photoUrl: playerData.photoUrl || '',
      paymentRef: playerData.paymentRef || '',
      paymentStatus: playerData.paymentStatus || 'PENDING',
      regDate: playerData.regDate || new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase.from('players').upsert([payload]);
    if (error) {
      console.warn("Supabase Player Sync Warning:", error.message);
    } else {
      console.log("Player synced to Supabase successfully!", playerData.name);
    }
    return data;
  } catch (err) {
    console.warn("Supabase Player Sync Exception:", err);
    return null;
  }
}

export async function fetchPlayersFromSupabase() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('players').select('*').order('serialNo', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Supabase Fetch Players Error:", err.message);
    return [];
  }
}

export async function deletePlayerFromSupabase(playerId) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase Delete Player Error:", err.message);
    return false;
  }
}

// --- REAL-TIME TEAMS CLOUD SYNC ---
export async function syncTeamToSupabase(teamData) {
  if (!supabase) return null;
  try {
    const payload = {
      id: teamData.id,
      serialNo: teamData.serialNo || 1,
      name: teamData.name,
      ownerName: teamData.ownerName,
      ownerPhone: teamData.ownerPhone,
      coOwnerName: teamData.coOwnerName || '',
      coOwnerPhone: teamData.coOwnerPhone || '',
      logoUrl: teamData.logoUrl || ''
    };

    const { data, error } = await supabase.from('teams').upsert([payload]);
    if (error) {
      console.warn("Supabase Team Sync Warning:", error.message);
    } else {
      console.log("Team synced to Supabase successfully!", teamData.name);
    }
    return data;
  } catch (err) {
    console.warn("Supabase Team Sync Exception:", err);
    return null;
  }
}

export async function fetchTeamsFromSupabase() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('teams').select('*').order('serialNo', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Supabase Fetch Teams Error:", err.message);
    return [];
  }
}

export async function deleteTeamFromSupabase(teamId) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase Delete Team Error:", err.message);
    return false;
  }
}

// --- SUPABASE WEBSOCKET REALTIME SUBSCRIPTION FOR MULTI-DEVICE INSTANT SYNC ---
export function subscribeToSupabaseRealtime(onPlayerUpdate, onTeamUpdate) {
  if (!supabase) return;

  try {
    supabase
      .channel('public:players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload) => {
        console.log("Realtime Player Event Received from Supabase Cloud:", payload);
        if (onPlayerUpdate) onPlayerUpdate(payload);
      })
      .subscribe();

    supabase
      .channel('public:teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
        console.log("Realtime Team Event Received from Supabase Cloud:", payload);
        if (onTeamUpdate) onTeamUpdate(payload);
      })
      .subscribe();
  } catch (err) {
    console.warn("Supabase Realtime subscription fallback:", err);
  }
}
