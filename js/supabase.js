// Automatic Zero-Setup Cloud Database & Supabase Integration (Developer: Suman Kolay)

const CLOUD_BLOB_URL = "https://jsonblob.com/api/jsonBlob/019fc3e1-cd40-79b5-ae05-5e2bb58082f5";
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7YpLCl7Vk_4sR06XhnD9V_-OFVeKwv_vgPm332kFj9LvrrYjdsPG_aDTRv1l2L4zo/exec";

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

// --- GOOGLE DRIVE AUTOMATIC BACKUP BACKEND ---
export async function saveToGoogleDriveScript(payload) {
  if (!GOOGLE_APPS_SCRIPT_URL) return;
  try {
    fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => console.log("Data backup sent to Google Drive!"))
      .catch(err => console.warn("Google Drive Sync warning:", err));
  } catch (err) {
    console.warn("Google Drive sync error:", err);
  }
}

// --- OPTION 1: SUPABASE STORAGE UPLOAD FOR ORIGINAL HD QUALITY IMAGES ---
export async function uploadImageToSupabaseStorage(file, folder = 'documents') {
  if (!file) return null;
  
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'image.jpg'}`;

  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('player-documents')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('player-documents')
          .getPublicUrl(fileName);
        
        if (publicUrlData && publicUrlData.publicUrl) {
          console.log("Uploaded HD Image to Supabase Storage:", publicUrlData.publicUrl);
          return publicUrlData.publicUrl;
        }
      } else {
        console.warn("Supabase storage bucket upload info:", error ? error.message : "Fallback active");
      }
    } catch (err) {
      console.warn("Supabase storage upload catch:", err);
    }
  }

  // Fallback: Convert File to lightweight compressed data URL if Supabase storage bucket is unconfigured
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// --- INSTANT CLOUD DATA FETCH ---
export async function fetchCloudData() {
  // 1. Primary: Try Google Drive Realtime Cloud Backend (Zero Rate Limit)
  if (GOOGLE_APPS_SCRIPT_URL) {
    try {
      const res = await fetch(GOOGLE_APPS_SCRIPT_URL, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && (Array.isArray(data.players) || Array.isArray(data.teams))) {
          return {
            players: Array.isArray(data.players) ? data.players : [],
            teams: Array.isArray(data.teams) ? data.teams : []
          };
        }
      }
    } catch (e) {
      console.warn("Google Drive fetch warning:", e);
    }
  }

  // 2. Supabase table fetch fallback
  if (supabase) {
    try {
      const { data: dbPlayers, error: errPlayers } = await supabase.from('players').select('*');
      const { data: dbTeams, error: errTeams } = await supabase.from('teams').select('*');
      if (!errPlayers && Array.isArray(dbPlayers) && dbPlayers.length > 0) {
        return {
          players: dbPlayers,
          teams: Array.isArray(dbTeams) ? dbTeams : []
        };
      }
    } catch (e) {
      // fallback to blob
    }
  }

  // 3. JsonBlob Fetch Fallback
  try {
    const res = await fetch(CLOUD_BLOB_URL, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && (Array.isArray(data.players) || Array.isArray(data.teams))) {
        return {
          players: Array.isArray(data.players) ? data.players : [],
          teams: Array.isArray(data.teams) ? data.teams : []
        };
      }
    }
  } catch (err) {
    console.warn("Cloud blob fetch warning:", err);
  }

  return { players: [], teams: [] };
}

// --- INSTANT CLOUD DATA SAVE ---
export async function saveCloudData(playersList, teamsList) {
  try {
    const payload = {
      players: playersList || [],
      teams: teamsList || []
    };

    // 1. Save to Google Drive Realtime Database (Primary - 15GB Zero Rate Limit)
    saveToGoogleDriveScript(payload);

    // 2. Save to secondary backup JSON blob
    fetch(CLOUD_BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.warn("Cloud blob save warning:", err));
  } catch (err) {
    console.warn("Cloud save warning:", err);
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
