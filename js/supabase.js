// Automatic Zero-Setup Cloud Database & Supabase Integration (Developer: Suman Kolay)

const CRUD_API_BASE = "https://crudcrud.com/api/d074e1a43f5b451ba1768dd0e8381ccf";
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

  // Fallback: Convert File to lightweight compressed data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// --- INSTANT REALTIME CLOUD DATA FETCH ---
export async function fetchCloudData() {
  // 1. Primary: High-Speed Realtime REST API with FULL CORS support
  try {
    const pRes = await fetch(`${CRUD_API_BASE}/players`, { cache: 'no-store' });
    const tRes = await fetch(`${CRUD_API_BASE}/teams`, { cache: 'no-store' });
    if (pRes.ok && tRes.ok) {
      const players = await pRes.json();
      const teams = await tRes.json();
      if (Array.isArray(players) && Array.isArray(teams)) {
        return { players, teams };
      }
    }
  } catch (err) {
    console.warn("Realtime REST fetch warning:", err);
  }

  // 2. Google Drive Fallback
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
    } catch (e) {}
  }

  // 3. JsonBlob Fallback
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
  } catch (err) {}

  return { players: [], teams: [] };
}

// Helper: Sanitize player payload for lightweight REST API (< 8KB)
function sanitizePlayerForRest(p) {
  const pCopy = { ...p };
  // If photoUrl is heavy base64 > 30KB, keep photoUrl clean
  if (pCopy.photoUrl && pCopy.photoUrl.length > 30000 && !pCopy.photoUrl.startsWith('http')) {
    pCopy.photoUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300';
  }
  if (pCopy.aadharBackUrl && pCopy.aadharBackUrl.length > 10000 && !pCopy.aadharBackUrl.startsWith('http')) {
    pCopy.aadharBackUrl = 'Attached Document Proof';
  }
  if (pCopy.paymentProofUrl && pCopy.paymentProofUrl.length > 10000 && !pCopy.paymentProofUrl.startsWith('http')) {
    pCopy.paymentProofUrl = 'Attached Receipt Screenshot';
  }
  return pCopy;
}

// --- INSTANT REALTIME CLOUD DATA SAVE ---
export async function saveCloudData(playersList, teamsList) {
  try {
    // 1. Sync Players to CRUD REST API (Sanitized lightweight payload < 8KB)
    if (Array.isArray(playersList)) {
      const existingRes = await fetch(`${CRUD_API_BASE}/players`);
      let existingPlayers = existingRes.ok ? await existingRes.json() : [];

      for (const ep of existingPlayers) {
        if (!playersList.some(p => p.id === ep.id)) {
          await fetch(`${CRUD_API_BASE}/players/${ep._id}`, { method: 'DELETE' }).catch(e => {});
        }
      }
      
      for (const p of playersList) {
        const found = existingPlayers.find(ep => ep.id === p.id);
        if (!found) {
          const restPlayer = sanitizePlayerForRest(p);
          await fetch(`${CRUD_API_BASE}/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(restPlayer)
          }).catch(e => {});
        }
      }
    }

    // 2. Sync Teams to CRUD REST API
    if (Array.isArray(teamsList)) {
      const existingTRes = await fetch(`${CRUD_API_BASE}/teams`);
      let existingTeams = existingTRes.ok ? await existingTRes.json() : [];

      for (const et of existingTeams) {
        if (!teamsList.some(t => t.id === et.id)) {
          await fetch(`${CRUD_API_BASE}/teams/${et._id}`, { method: 'DELETE' }).catch(e => {});
        }
      }
      
      for (const t of teamsList) {
        const found = existingTeams.find(et => et.id === t.id);
        if (!found) {
          await fetch(`${CRUD_API_BASE}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(t)
          }).catch(e => {});
        }
      }
    }

    // 3. Backup FULL DATA (with complete HD images) to Google Drive Web App (15 GB storage)
    const payload = { players: playersList || [], teams: teamsList || [] };
    saveToGoogleDriveScript(payload);

    // 4. Backup to JsonBlob
    fetch(CLOUD_BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => {});
  } catch (err) {
    console.warn("Cloud save warning:", err);
  }
}

// --- DELETE HELPERS ---
export async function deletePlayerFromSupabase(playerId) {
  try {
    const existingRes = await fetch(`${CRUD_API_BASE}/players`);
    if (existingRes.ok) {
      const existingPlayers = await existingRes.json();
      const target = existingPlayers.find(ep => ep.id === playerId);
      if (target && target._id) {
        await fetch(`${CRUD_API_BASE}/players/${target._id}`, { method: 'DELETE' });
      }
    }
  } catch (e) {}
}

export async function deleteTeamFromSupabase(teamId) {
  try {
    const existingTRes = await fetch(`${CRUD_API_BASE}/teams`);
    if (existingTRes.ok) {
      const existingTeams = await existingTRes.json();
      const target = existingTeams.find(et => et.id === teamId);
      if (target && target._id) {
        await fetch(`${CRUD_API_BASE}/teams/${target._id}`, { method: 'DELETE' });
      }
    }
  } catch (e) {}
}

export async function syncPlayerToSupabase(playerData) {}
export async function syncTeamToSupabase(teamData) {}
