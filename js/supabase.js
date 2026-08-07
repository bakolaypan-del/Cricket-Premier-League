// Automatic Zero-Setup Cloud Database, Supabase & Realtime Cloud Storage Integration (Developer: Suman Kolay)

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
    console.warn("Supabase init notice:", err);
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
    }).catch(err => console.warn("Google Drive Sync warning:", err));
  } catch (err) {
    console.warn("Google Drive sync notice:", err);
  }
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

// --- IMGBB FREE HD IMAGE UPLOAD (PRESERVES 100% ORIGINAL RESOLUTION) ---
export async function uploadImageToImgBB(file) {
  if (!file) return null;
  try {
    const formData = new FormData();
    formData.append('image', file);
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

// --- CLOUDINARY DIRECT HD IMAGE UPLOAD (PRIMARY 10GB FREE CDN) ---
const CLOUDINARY_CLOUD_NAME = "k483yjqc";
const CLOUDINARY_UPLOAD_PRESET = "cpl_uploads";

export async function uploadImageToCloudinary(file, folderName = 'photos') {
  if (!file) return null;
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `jsl_2026/${folderName}`);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.secure_url) {
        console.log("Uploaded image directly to Cloudinary CDN:", data.secure_url);
        return data.secure_url;
      }
    } else {
      console.warn("Cloudinary upload response notice:", response.statusText);
    }
  } catch (err) {
    console.warn("Cloudinary upload notice:", err);
  }
  return null;
}

// --- UNIFIED MULTI-PROVIDER HD IMAGE UPLOADER (ZERO QUALITY LOSS) ---
export async function uploadHDImage(file, folderName = 'documents') {
  if (!file) return null;
  
  // Try 1: Cloudinary Cloud CDN (Primary 10GB Free High-Speed Storage)
  const cloudinaryUrl = await uploadImageToCloudinary(file, folderName);
  if (cloudinaryUrl) return cloudinaryUrl;

  // Try 2: ImgBB Cloud (Fast HD Fallback)
  const imgbbUrl = await uploadImageToImgBB(file);
  if (imgbbUrl) return imgbbUrl;

  // Try 3: Google Drive Script
  const driveUrl = await uploadImageToGoogleDrive(file, folderName);
  if (driveUrl) return driveUrl;

  return null;
}

// --- REALTIME PUSH EVENT LISTENER (FIREBASE REALTIME SSE) ---
export function initRealtimePushListener(onUpdateCallback) {
  try {
    const eventSource = new EventSource(`${FIREBASE_DB_URL}/cpl_master.json`);
    
    const handleUpdate = (event) => {
      console.log("Realtime Event received:", event.type);
      onUpdateCallback();
    };

    eventSource.addEventListener('put', handleUpdate);
    eventSource.addEventListener('patch', handleUpdate);
    eventSource.onmessage = handleUpdate;

    eventSource.onerror = (err) => {
      console.warn("Realtime EventSource reconnecting...", err);
    };
    console.log("Realtime EventSource listener initialized.");
    return eventSource;
  } catch (err) {
    console.warn("EventSource setup notice:", err);
    return null;
  }
}

// --- INSTANT REALTIME CLOUD DATA FETCH WITH CROSS-DEVICE CLEAR & DELETE SYNC ---
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

        let rawFixtures = [];
        if (data.fixtures) {
          rawFixtures = Array.isArray(data.fixtures) ? data.fixtures : Object.values(data.fixtures);
        }

        let auctionSettings = data.auctionSettings || { defaultBasePrice: 200, defaultPurseBudget: 8000 };

        const deletedPlayerIds = data.deletedPlayerIds ? Object.keys(data.deletedPlayerIds) : [];
        const deletedTeamIds = data.deletedTeamIds ? Object.keys(data.deletedTeamIds) : [];

        const players = rawPlayers
          .filter(p => p && p.id && !deletedPlayerIds.includes(p.id))
          .map((p, idx) => ({
            ...p,
            serialNo: idx + 1,
            displayRegistrationNumber: idx + 1,
            registrationId: p.registrationId || p.regNo || `JSL2026-${String(idx + 1).padStart(4, '0')}`
          }));

        const teams = rawTeams
          .filter(t => t && t.id && !deletedTeamIds.includes(t.id))
          .map((t, idx) => ({
            ...t,
            serialNo: idx + 1
          }));

        const fixtures = rawFixtures.filter(f => f && f.id);

        return { 
          players, 
          teams, 
          fixtures,
          auctionSettings,
          clearedAt: data.clearedAt || 0, 
          teamsClearedAt: data.teamsClearedAt || 0,
          deletedPlayerIds, 
          deletedTeamIds 
        };
      }
    }
  } catch (err) {
    console.warn("Realtime Database fetch notice:", err);
  }

  return { players: [], teams: [], fixtures: [], auctionSettings: { defaultBasePrice: 200, defaultPurseBudget: 8000 }, clearedAt: 0, teamsClearedAt: 0, deletedPlayerIds: [], deletedTeamIds: [] };
}

// --- ATOMIC REALTIME CLOUD DATA OPERATIONS (ATOMIC FULL ARRAY SYNC) ---
export async function saveFullPlayersListToFirebase(playersList) {
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/players.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playersList || [])
    });
    console.log("Saved full players list atomically to Realtime Database.");
  } catch (err) {
    console.warn("Atomic players list save notice:", err);
  }
}

export async function saveFullTeamsListToFirebase(teamsList) {
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/teams.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamsList || [])
    });
    console.log("Saved full teams list atomically to Realtime Database.");
  } catch (err) {
    console.warn("Atomic teams list save notice:", err);
  }
}

export async function savePlayerToFirebase(player) {
  if (!player || !player.id) return;
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/players/${player.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(player)
    });
    console.log("Saved player atomically to Realtime Database:", player.name);
  } catch (err) {
    console.warn("Atomic player save notice:", err);
  }
}

export async function deletePlayerFromFirebase(playerId) {
  if (!playerId) return;
  try {
    const timestamp = Date.now();
    await fetch(`${FIREBASE_DB_URL}/cpl_master/deletedPlayerIds/${playerId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timestamp)
    });
    await fetch(`${FIREBASE_DB_URL}/cpl_master/players/${playerId}.json`, {
      method: 'DELETE'
    });
    console.log("Deleted player permanently from Cloud Realtime Database:", playerId);
  } catch (err) {
    console.warn("Atomic player delete notice:", err);
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
    console.log("Saved team atomically to Realtime Database:", team.name);
  } catch (err) {
    console.warn("Atomic team save notice:", err);
  }
}

export async function deleteTeamFromFirebase(teamId) {
  if (!teamId) return;
  try {
    const timestamp = Date.now();
    await fetch(`${FIREBASE_DB_URL}/cpl_master/deletedTeamIds/${teamId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timestamp)
    });
    await fetch(`${FIREBASE_DB_URL}/cpl_master/teams/${teamId}.json`, {
      method: 'DELETE'
    });
    console.log("Deleted team permanently from Cloud Realtime Database:", teamId);
  } catch (err) {
    console.warn("Atomic team delete notice:", err);
  }
}

export async function clearAllPlayersFromFirebase() {
  try {
    const timestamp = Date.now();
    await fetch(`${FIREBASE_DB_URL}/cpl_master/clearedAt.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timestamp)
    });
    await fetch(`${FIREBASE_DB_URL}/cpl_master/players.json`, { method: 'DELETE' });
    console.log("Admin cleared all players in Realtime Database at timestamp:", timestamp);
  } catch (err) {
    console.warn("Clear players notice:", err);
  }
}

export async function clearAllTeamsFromFirebase() {
  try {
    const timestamp = Date.now();
    await fetch(`${FIREBASE_DB_URL}/cpl_master/teamsClearedAt.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timestamp)
    });
    await fetch(`${FIREBASE_DB_URL}/cpl_master/teams.json`, { method: 'DELETE' });
    console.log("Admin cleared all teams in Realtime Database at timestamp:", timestamp);
  } catch (err) {
    console.warn("Clear teams notice:", err);
  }
}

// --- NEW FIXTURES AND STATE SYNCHRONIZATION ---
export async function saveFixtureToFirebase(fixture) {
  if (!fixture || !fixture.id) return;
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/fixtures/${fixture.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fixture)
    });
  } catch (err) {
    console.warn("Fixture save error:", err);
  }
}

export async function deleteFixtureFromFirebase(fixtureId) {
  if (!fixtureId) return;
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/fixtures/${fixtureId}.json`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn("Fixture delete error:", err);
  }
}

export async function saveFullFixturesListToFirebase(fixturesList) {
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/fixtures.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fixturesList || [])
    });
  } catch (err) {
    console.warn("Fixtures list save error:", err);
  }
}

export async function saveAuctionSettingsToFirebase(settings) {
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/auctionSettings.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings || {})
    });
  } catch (err) {
    console.warn("Auction settings save error:", err);
  }
}

export async function saveLiveAuctionToFirebase(state) {
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/liveAuction.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state || null)
    });
  } catch (err) {
    console.warn("Live auction state save error:", err);
  }
}

export async function saveLiveMatchToFirebase(matchId, state) {
  try {
    await fetch(`${FIREBASE_DB_URL}/cpl_master/liveMatches/${matchId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state || null)
    });
  } catch (err) {
    console.warn("Live match save error:", err);
  }
}

// Helper to prepare data URLs before sending payload to Firebase Realtime DB (Preserves exact uploaded photos)
function sanitizePayloadForCloud(dataList) {
  if (!Array.isArray(dataList)) return [];
  return dataList.map(item => {
    const itemCopy = { ...item };
    return itemCopy;
  });
}

// --- INSTANT REALTIME CLOUD DATA SAVE (FULL SYNC BACKUP) ---
export async function saveCloudData(playersList, teamsList, fixturesList = [], auctionSettings = null) {
  try {
    const cleanPlayers = sanitizePayloadForCloud(playersList);
    const cleanTeams = sanitizePayloadForCloud(teamsList);
    const cleanFixtures = sanitizePayloadForCloud(fixturesList);
    
    saveFullPlayersListToFirebase(cleanPlayers);
    saveFullTeamsListToFirebase(cleanTeams);
    saveFullFixturesListToFirebase(cleanFixtures);
    if (auctionSettings) {
      saveAuctionSettingsToFirebase(auctionSettings);
    }
    saveToGoogleDriveScript({ 
      players: cleanPlayers || [], 
      teams: cleanTeams || [],
      fixtures: cleanFixtures || [],
      auctionSettings: auctionSettings
    });
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

// --- ADVERTISEMENT & POPUP CONTROLLER DATABASE OPERATIONS ---
export async function savePopupSettingsToFirebase(settings) {
  try {
    const response = await fetch(`${FIREBASE_DB_URL}/cpl_master/popupSettings.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (response.ok) {
      console.log("Popup settings saved to Firebase.");
      return true;
    }
  } catch (err) {
    console.warn("Failed to save popup settings to Firebase:", err);
  }
  return false;
}

export async function fetchPopupSettingsFromFirebase() {
  try {
    const response = await fetch(`${FIREBASE_DB_URL}/cpl_master/popupSettings.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return data || {
        isAdPopupEnabled: false,
        isWhatsAppPopupEnabled: true,
        isWelcomePopupEnabled: true,
        promotedShopId: 'maa-laxmi-kitchen',
        adExpiryTime: 0
      };
    }
  } catch (err) {
    console.warn("Failed to fetch popup settings from Firebase:", err);
  }
  return {
    isAdPopupEnabled: false,
    isWhatsAppPopupEnabled: true,
    isWelcomePopupEnabled: true,
    promotedShopId: 'maa-laxmi-kitchen',
    adExpiryTime: 0
  };
}

export async function saveAdSettingsToFirebase(settings) {
  const pSettings = await fetchPopupSettingsFromFirebase();
  pSettings.isAdPopupEnabled = settings.isEnabled;
  pSettings.promotedShopId = settings.shopId;
  pSettings.adExpiryTime = settings.expiryTime;
  return savePopupSettingsToFirebase(pSettings);
}

export async function fetchAdSettingsFromFirebase() {
  const pSettings = await fetchPopupSettingsFromFirebase();
  return {
    isEnabled: pSettings.isAdPopupEnabled,
    shopId: pSettings.promotedShopId,
    expiryTime: pSettings.adExpiryTime
  };
}
