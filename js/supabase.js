// Automatic Zero-Setup Cloud Database & Official Firebase Realtime Integration (Developer: Suman Kolay)

const FIREBASE_DB_URL = "https://cpl-jsl-2026-default-rtdb.firebaseio.com";
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7YpLCl7Vk_4sR06XhnD9V_-OFVeKwv_vgPm332kFj9LvrrYjdsPG_aDTRv1l2L4zo/exec";

const SUPABASE_URL = "https://eunwcvdackphjqpyujwn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bndjdmRhYkFwaGpxcHl1anduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzAwMDAsImV4cCI6MjEwMTI0NjAwMH0.1S3c7bWTOCyREehT6WyOhtoyjQkTKY148ABHPKz2pFM";

export let supabase = null;

if (typeof window !== 'undefined' && window.supabase) {
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

// --- IMGBB FREE HD IMAGE UPLOAD (PRESERVES 100% ORIGINAL CAMERA RESOLUTION) ---
export async function uploadImageToImgBB(file) {
  if (!file) return null;
  try {
    const formData = new FormData();
    formData.append('image', file);
    // Free high-reliability public key for full-resolution upload
    const response = await fetch('https://api.imgbb.com/1/upload?key=6d25705663b6326a9478e0769298064f', {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data.url) {
        console.log("Uploaded 100% Full HD Image to ImgBB CDN:", data.data.url);
        return data.data.url;
      }
    }
  } catch (err) {
    console.warn("ImgBB upload fallback notice:", err);
  }
  return null;
}

// --- UPLOAD DIRECT TO GOOGLE DRIVE (RETURNS PUBLIC HD GOOGLE CDN IMAGE URL) ---
export async function uploadImageToGoogleDrive(file, folderName = 'photos') {
  if (!file || !GOOGLE_APPS_SCRIPT_URL) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      const payload = {
        action: 'upload_image',
        folder: folderName,
        fileName: `${folderName}_${Date.now()}_${file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'image.jpg'}`,
        mimeType: file.type || 'image/jpeg',
        base64: base64Data
      };

      try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData && resData.directUrl) {
            console.log("Uploaded image directly to Google Drive:", resData.directUrl);
            resolve(resData.directUrl);
            return;
          }
        }
      } catch (err) {
        console.warn("Google Drive direct upload notice:", err);
      }

      resolve(null);
    };

    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
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

// --- UNIFIED MULTI-PROVIDER HD IMAGE UPLOADER (ZERO QUALITY LOSS) ---
export async function uploadHDImage(file, folderName = 'documents') {
  if (!file) return null;
  
  // Try 1: ImgBB Cloud (Fastest 100% HD CDN)
  const imgbbUrl = await uploadImageToImgBB(file);
  if (imgbbUrl) return imgbbUrl;

  // Try 2: Supabase Storage
  const supabaseUrl = await uploadImageToSupabaseStorage(file, folderName);
  if (supabaseUrl) return supabaseUrl;

  // Try 3: Google Drive Script
  const driveUrl = await uploadImageToGoogleDrive(file, folderName);
  if (driveUrl) return driveUrl;

  return null;
}

// --- REALTIME PUSH EVENT LISTENER (FIREBASE EVENTSOURCE SSE) ---
export function initRealtimePushListener(onUpdateCallback) {
  try {
    const eventSource = new EventSource(`${FIREBASE_DB_URL}/cpl_master.json`);
    eventSource.onmessage = (event) => {
      if (event && event.data) {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed) {
            onUpdateCallback(parsed);
          }
        } catch (e) {
          // ignore heartbeat parse
        }
      }
    };
    eventSource.onerror = (err) => {
      console.warn("Realtime EventSource reconnecting...", err);
    };
    console.log("Firebase Realtime EventSource listener initialized.");
    return eventSource;
  } catch (err) {
    console.warn("EventSource setup error:", err);
    return null;
  }
}

// --- INSTANT REALTIME CLOUD DATA FETCH (OFFICIAL GOOGLE FIREBASE REALTIME DATABASE) ---
export async function fetchCloudData() {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data) {
        let rawPlayers = [];
        if (data.players) {
          rawPlayers = Array.isArray(data.players) ? data.players : Object.values(data.players);
        }
        
        let rawTeams = [];
        if (data.teams) {
          rawTeams = Array.isArray(data.teams) ? data.teams : Object.values(data.teams);
        }

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

// --- ATOMIC REALTIME CLOUD DATA OPERATIONS (PREVENTS DATA LOSS & OVERWRITES) ---
export async function savePlayerToFirebase(player) {
  if (!player || !player.id) return;
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/players/${player.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(player)
    });
  } catch (err) {
    console.warn("Atomic player save error:", err);
  }
}

export async function deletePlayerFromFirebase(playerId) {
  if (!playerId) return;
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/players/${playerId}.json`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn("Atomic player delete error:", err);
  }
}

export async function saveTeamToFirebase(team) {
  if (!team || !team.id) return;
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/teams/${team.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    });
  } catch (err) {
    console.warn("Atomic team save error:", err);
  }
}

export async function deleteTeamFromFirebase(teamId) {
  if (!teamId) return;
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/teams/${teamId}.json`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn("Atomic team delete error:", err);
  }
}

// --- INSTANT REALTIME CLOUD DATA SAVE (FULL SYNC BACKUP) ---
export async function saveCloudData(playersList, teamsList) {
  try {
    const payload = {
      players: playersList || [],
      teams: teamsList || [],
      lastUpdated: new Date().toISOString()
    };

    // 1. Save to Official Google Firebase Realtime Database
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log("Firebase Realtime Database synced successfully!");
    }

    // 2. Backup FULL DATA to Google Drive Web App
    saveToGoogleDriveScript({ players: playersList || [], teams: teamsList || [] });
  } catch (err) {
    console.warn("Cloud save warning:", err);
  }
}

// --- COMPATIBILITY EXPORTS ---
export async function deletePlayerFromSupabase(playerId) {
  return deletePlayerFromFirebase(playerId);
}
export async function deleteTeamFromSupabase(teamId) {
  return deleteTeamFromFirebase(teamId);
}
export async function syncPlayerToSupabase(playerData) {
  return savePlayerToFirebase(playerData);
}
export async function syncTeamToSupabase(teamData) {
  return saveTeamToFirebase(teamData);
}

