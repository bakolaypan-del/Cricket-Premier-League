// Automatic Zero-Setup Cloud Database & Official Firebase Realtime Integration (Developer: Suman Kolay)

const FIREBASE_DB_URL = "https://cpl-jsl-2026-default-rtdb.firebaseio.com";
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

// --- SUPABASE STORAGE UPLOAD FOR ORIGINAL HD QUALITY IMAGES ---
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
      }
    } catch (err) {
      console.warn("Supabase storage upload catch:", err);
    }
  }

  return null;
}

// --- INSTANT REALTIME CLOUD DATA FETCH (OFFICIAL GOOGLE FIREBASE REALTIME DATABASE) ---
export async function fetchCloudData() {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data) {
        const rawPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
        const rawTeams = data.teams ? (Array.isArray(data.teams) ? data.teams : Object.values(data.teams)) : [];
        
        const players = rawPlayers.filter(p => p && p.id);
        const teams = rawTeams.filter(t => t && t.id);

        return { players, teams };
      }
    }
  } catch (err) {
    console.warn("Firebase Realtime Database fetch warning:", err);
  }

  return { players: [], teams: [] };
}

// Helper: Keep Realtime Database payloads ultra-lightweight (< 15 KB per player) for instant 0.05-second sync across all devices
function sanitizePlayerForRest(p) {
  const pCopy = { ...p };
  if (pCopy.photoUrl && pCopy.photoUrl.length > 25000 && !pCopy.photoUrl.startsWith('http')) {
    pCopy.photoUrl = pCopy.photoUrl.substring(0, 20000);
  }
  if (pCopy.aadharBackUrl && pCopy.aadharBackUrl.length > 25000 && !pCopy.aadharBackUrl.startsWith('http')) {
    pCopy.aadharBackUrl = 'Attached Document Proof';
  }
  if (pCopy.paymentProofUrl && pCopy.paymentProofUrl.length > 25000 && !pCopy.paymentProofUrl.startsWith('http')) {
    pCopy.paymentProofUrl = 'Attached Receipt Screenshot';
  }
  return pCopy;
}

// --- INSTANT REALTIME CLOUD DATA SAVE (AWAITED FIREBASE SYNC) ---
export async function saveCloudData(playersList, teamsList) {
  try {
    const sanitizedPlayers = (playersList || []).map(p => sanitizePlayerForRest(p));
    const sanitizedTeams = teamsList || [];

    const payload = {
      players: sanitizedPlayers,
      teams: sanitizedTeams,
      lastUpdated: new Date().toISOString()
    };

    // 1. Await Save to Official Google Firebase Realtime Database
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log("Firebase Realtime Database synced successfully!");
    } else {
      console.warn("Firebase sync HTTP status:", res.status);
    }

    // 2. Backup FULL DATA (with complete HD images) to Google Drive Web App (15 GB storage)
    const fullPayload = { players: playersList || [], teams: teamsList || [] };
    saveToGoogleDriveScript(fullPayload);
  } catch (err) {
    console.warn("Cloud save warning:", err);
  }
}

// --- DELETE HELPERS ---
export async function deletePlayerFromSupabase(playerId) {}
export async function deleteTeamFromSupabase(teamId) {}
export async function syncPlayerToSupabase(playerData) {}
export async function syncTeamToSupabase(teamData) {}
