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

// Helper to ensure input is a valid File or Blob object for FormData upload
function ensureFileObject(fileInput, defaultName = 'upload.jpg') {
  if (!fileInput) return null;
  if (typeof fileInput === 'string' && fileInput.startsWith('data:image')) {
    try {
      const arr = fileInput.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], defaultName, { type: mime });
    } catch (e) {
      return fileInput;
    }
  }
  return fileInput;
}

// --- CLOUDINARY DIRECT HD IMAGE UPLOAD (PRIMARY 10GB FREE CDN) ---
const CLOUDINARY_CLOUD_NAME = "k483yjqc";
const CLOUDINARY_UPLOAD_PRESET = "cpl_uploads";

export async function uploadImageToCloudinary(fileInput, folderName = 'photos') {
  if (!fileInput) return null;
  try {
    const file = ensureFileObject(fileInput, `${folderName}_${Date.now()}.jpg`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `jsl_2026/${folderName}`);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null;

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
      signal: controller ? controller.signal : undefined
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.secure_url) {
        console.log("Uploaded image directly to Cloudinary CDN:", data.secure_url);
        return data.secure_url;
      }
    } else {
      const errTxt = await response.text();
      console.warn("Cloudinary upload response notice:", response.status, errTxt);
    }
  } catch (err) {
    console.warn("Cloudinary upload notice:", err);
  }
  return null;
}

// --- CLOUDINARY DYNAMIC AUTO-FORMAT & RESIZE OPTIMIZER (85%+ BANDWIDTH SAVER) ---
export function getOptimizedImageUrl(url, width = 300, height = 300, mode = 'fill') {
  if (!url || typeof url !== 'string') return url || '';
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    if (url.includes('/f_auto,q_auto')) return url;
    const transform = `f_auto,q_auto,w_${width},h_${height},c_${mode}`;
    return url.replace('/upload/', `/upload/${transform}/`);
  }
  return url;
}

// --- UNIFIED MULTI-PROVIDER HD IMAGE UPLOADER (ZERO QUALITY LOSS & BANDWIDTH SAFE) ---
export async function uploadHDImage(fileInput, folderName = 'documents') {
  if (!fileInput) return null;
  
  const file = ensureFileObject(fileInput, `${folderName}_${Date.now()}.jpg`);

  // If uploading sensitive documents/receipts, prioritize Google Drive to protect Cloudinary bandwidth
  if (folderName === 'aadhaar_docs' || folderName === 'payment_receipts' || folderName === 'documents') {
    const driveUrl = await uploadImageToGoogleDrive(file, folderName);
    if (driveUrl) return driveUrl;

    const imgbbUrl = await uploadImageToImgBB(file);
    if (imgbbUrl) return imgbbUrl;

    const cloudinaryUrl = await uploadImageToCloudinary(file, folderName);
    if (cloudinaryUrl) return cloudinaryUrl;
    return null;
  }

  // For Player Photos: Prioritize Cloudinary HD CDN with instant auto-optimization
  const cloudinaryUrl = await uploadImageToCloudinary(file, folderName);
  if (cloudinaryUrl) return cloudinaryUrl;

  const imgbbUrl = await uploadImageToImgBB(file);
  if (imgbbUrl) return imgbbUrl;

  const driveUrl = await uploadImageToGoogleDrive(file, folderName);
  if (driveUrl) return driveUrl;

  return null;
}

// --- REALTIME PUSH EVENT LISTENER (ALWAYS-ON FIREBASE REALTIME SSE) ---
let activeEventSource = null;
let sseReconnectTimer = null;

export function initRealtimePushListener(onUpdateCallback) {
  if (typeof EventSource === 'undefined') return null;

  if (activeEventSource) {
    try { activeEventSource.close(); } catch(e) {}
  }
  if (sseReconnectTimer) clearTimeout(sseReconnectTimer);

  try {
    const eventSource = new EventSource(`${FIREBASE_DB_URL}/cpl_master.json`);
    activeEventSource = eventSource;

    const handleUpdate = (event) => {
      if (typeof onUpdateCallback === 'function') {
        onUpdateCallback(event);
      }
    };

    eventSource.addEventListener('put', handleUpdate);
    eventSource.addEventListener('patch', handleUpdate);
    eventSource.onmessage = handleUpdate;

    eventSource.onerror = () => {
      try { eventSource.close(); } catch(e) {}
      sseReconnectTimer = setTimeout(() => {
        initRealtimePushListener(onUpdateCallback);
      }, 3000);
    };

    console.log("🟢 Always-On Real-Time Live Push (Firebase SSE) connected.");
    return eventSource;
  } catch (err) {
    sseReconnectTimer = setTimeout(() => {
      initRealtimePushListener(onUpdateCallback);
    }, 5000);
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
          const playerValues = Array.isArray(data.players) ? data.players : Object.values(data.players);
          // Deduplicate by player.id to ensure no legacy array vs object key duplicates exist
          const uniquePlayerMap = new Map();
          for (const p of playerValues) {
            if (p && p.id) {
              const existing = uniquePlayerMap.get(p.id);
              if (existing) {
                const pTime = Number(p.updated_at || p.created_at || p.timestamp || p.createdTime || 0);
                const existingTime = Number(existing.updated_at || existing.created_at || existing.timestamp || existing.createdTime || 0);
                if (pTime >= existingTime) {
                  uniquePlayerMap.set(p.id, p);
                }
              } else {
                uniquePlayerMap.set(p.id, p);
              }
            }
          }
          rawPlayers = Array.from(uniquePlayerMap.values());
        }
        
        let rawTeams = [];
        if (data.teams) {
          const teamValues = Array.isArray(data.teams) ? data.teams : Object.values(data.teams);
          const uniqueTeamMap = new Map();
          for (const t of teamValues) {
            if (t && t.id) uniqueTeamMap.set(t.id, t);
          }
          rawTeams = Array.from(uniqueTeamMap.values());
        }

        let rawFixtures = [];
        if (data.fixtures) {
          rawFixtures = Array.isArray(data.fixtures) ? data.fixtures : Object.values(data.fixtures);
        }

        let auctionSettings = data.auctionSettings || { defaultBasePrice: 300, defaultPurseBudget: 8000 };
        let registrationSettings = data.registrationSettings || {
          isJslRegistrationOpen: true,
          isPlayerRegOpen: true,
          isTeamRegOpen: true,
          closedReason: "JSL 2026 Registration is currently closed by the Master Admin."
        };

        const deletedPlayerIds = data.deletedPlayerIds ? Object.keys(data.deletedPlayerIds) : [];
        const deletedTeamIds = data.deletedTeamIds ? Object.keys(data.deletedTeamIds) : [];

        const getPlayerTimestamp = (p) => {
          if (!p) return 0;
          if (typeof p.createdTime === 'number' && p.createdTime > 0) return p.createdTime;
          if (typeof p.regTimestamp === 'number' && p.regTimestamp > 0) return p.regTimestamp;
          if (p.created_at) {
            const t = new Date(p.created_at).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          if (p.id && typeof p.id === 'string' && p.id.startsWith('ply-')) {
            const parts = p.id.split('-');
            if (parts.length >= 2) {
              const t = parseInt(parts[1], 10);
              if (!isNaN(t) && t > 0) return t;
            }
          }
          if (typeof p.serialNo === 'number' && p.serialNo > 0) return p.serialNo;
          return 0;
        };



        let rawProfiles = [];
        if (data.player_profiles) {
          rawProfiles = Array.isArray(data.player_profiles) ? data.player_profiles : Object.values(data.player_profiles);
        }

        // SECONDARY DEDUP: Discard ONLY non-canonical legacy IDs when a canonical record exists
        const normalizeName = (name) => (name || '').toLowerCase().replace(/\s+/g, ' ').replace(/[()]/g, '').trim();
        const canonicalMap = new Map();
        for (const p of rawPlayers) {
          if (p && p.id && p.id.startsWith('ply-1787000000000-')) {
            const normName = normalizeName(p.name);
            const normPhone = (p.phone || p.mobile || '').replace(/\D/g, '').slice(-10);
            canonicalMap.set(normName + '|' + normPhone, p);
          }
        }

        const dedupedPlayerIds = new Set();
        for (const p of rawPlayers) {
          if (!p || !p.id) continue;
          if (p.id.startsWith('ply-1787000000000-')) {
            dedupedPlayerIds.add(p.id);
          } else {
            const normName = normalizeName(p.name);
            const normPhone = (p.phone || p.mobile || '').replace(/\D/g, '').slice(-10);
            if (!canonicalMap.has(normName + '|' + normPhone)) {
              dedupedPlayerIds.add(p.id);
            }
          }
        }
        
        const getCanonicalRank = (p) => {
          if (p.id && p.id.startsWith('ply-1787000000000-')) {
            const num = parseInt(p.id.replace('ply-1787000000000-', ''), 10);
            if (!isNaN(num) && num > 0) return num;
          }
          if (p.serialNo && Number(p.serialNo) > 0 && Number(p.serialNo) < 200) return Number(p.serialNo);
          return 999999;
        };

        const players = rawPlayers
          .filter(p => p && p.id && !deletedPlayerIds.includes(p.id) && dedupedPlayerIds.has(p.id))
          .sort((a, b) => {
            const rA = getCanonicalRank(a);
            const rB = getCanonicalRank(b);
            if (rA !== rB) return rA - rB;
            return getPlayerTimestamp(a) - getPlayerTimestamp(b);
          })
          .map((p, idx) => {
            const canonicalSl = (p.id && p.id.startsWith('ply-1787000000000-')) 
              ? parseInt(p.id.replace('ply-1787000000000-', ''), 10)
              : (idx + 1);
            const serial = (!isNaN(canonicalSl) && canonicalSl > 0) ? canonicalSl : (idx + 1);
            return {
              ...p,
              serialNo: serial,
              displayRegistrationNumber: serial,
              registrationId: `JSL2026-${String(serial).padStart(4, '0')}`,
              regNo: `JSL2026-${String(serial).padStart(4, '0')}`
            };
          });

        // DEDUP TEAMS by name: prefer timestamp-based IDs over slug-based IDs
        const teamNameDedup = new Map();
        for (const t of rawTeams) {
          if (!t || !t.id) continue;
          const normName = (t.name || '').trim().toLowerCase();
          if (!normName) continue;
          const existing = teamNameDedup.get(normName);
          if (existing) {
            const tIsTimestamp = /^team-\d{13}$/.test(t.id);
            const eIsTimestamp = /^team-\d{13}$/.test(existing.id);
            if (tIsTimestamp && !eIsTimestamp) teamNameDedup.set(normName, t);
          } else {
            teamNameDedup.set(normName, t);
          }
        }
        const dedupedTeamIds = new Set(Array.from(teamNameDedup.values()).map(t => t.id));

        const teams = rawTeams
          .filter(t => t && t.id && !deletedTeamIds.includes(t.id) && dedupedTeamIds.has(t.id))
          .sort((a, b) => (Number(a.serialNo) || 9999) - (Number(b.serialNo) || 9999))
          .map((t, idx) => ({
            ...t,
            serialNo: t.serialNo ? Number(t.serialNo) : (idx + 1)
          }));

        const fixtures = rawFixtures.filter(f => f && f.id);

        return { 
          players, 
          teams, 
          fixtures,
          liveAuction: data.liveAuction || null,
          playerProfiles: rawProfiles,
          auctionSettings,
          registrationSettings,
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

  return { players: [], teams: [], fixtures: [], playerProfiles: [], auctionSettings: { defaultBasePrice: 300, defaultPurseBudget: 8000 }, registrationSettings: { isJslRegistrationOpen: true, isPlayerRegOpen: true, isTeamRegOpen: true, closedReason: "JSL 2026 Registration is currently closed by the Master Admin." }, clearedAt: 0, teamsClearedAt: 0, deletedPlayerIds: [], deletedTeamIds: [] };
}

// --- ATOMIC REALTIME CLOUD DATA OPERATIONS (SAFE PER-RECORD SYNC) ---
export async function saveFullPlayersListToFirebase(playersList) {
  try {
    if (!Array.isArray(playersList)) return;
    for (const p of playersList) {
      if (p && p.id) {
        savePlayerToFirebase(p);
      }
    }
  } catch (err) {
    console.warn("Atomic players list save notice:", err);
  }
}

export async function saveFullTeamsListToFirebase(teamsList) {
  try {
    if (!Array.isArray(teamsList)) return;
    for (const t of teamsList) {
      if (t && t.id) {
        saveTeamToFirebase(t);
      }
    }
  } catch (err) {
    console.warn("Atomic teams list save notice:", err);
  }
}

export async function savePlayerToFirebase(player) {
  if (!player || !player.id) return;
  try {
    const pData = { ...player, updated_at: player.updated_at || Date.now() };
    await fetch(`${FIREBASE_DB_URL}/cpl_master/players/${player.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pData)
    });
    console.log("Saved player atomically to Realtime Database:", player.name);
  } catch (err) {
    console.warn("Atomic player save notice:", err);
  }
}

export async function patchPlayerInFirebase(playerId, delta) {
  if (!playerId || !delta) return;
  try {
    const payload = { ...delta, updated_at: delta.updated_at || Date.now() };
    await fetch(`${FIREBASE_DB_URL}/cpl_master/players/${playerId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("Patched player atomically in Realtime Database:", playerId);
  } catch (err) {
    console.warn("Atomic player patch notice:", err);
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
    const tData = { ...team, updated_at: team.updated_at || Date.now() };
    await fetch(`${FIREBASE_DB_URL}/cpl_master/teams/${team.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tData)
    });
    console.log("Saved team atomically to Realtime Database:", team.name);
  } catch (err) {
    console.warn("Atomic team save notice:", err);
  }
}

export async function patchTeamInFirebase(teamId, delta) {
  if (!teamId || !delta) return;
  try {
    const payload = { ...delta, updated_at: delta.updated_at || Date.now() };
    await fetch(`${FIREBASE_DB_URL}/cpl_master/teams/${teamId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("Patched team atomically in Realtime Database:", teamId);
  } catch (err) {
    console.warn("Atomic team patch notice:", err);
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
    const payload = state ? { ...state, updated_at: state.updated_at || Date.now() } : null;
    await fetch(`${FIREBASE_DB_URL}/cpl_master/liveAuction.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("Live auction state save error:", err);
  }
}

export async function saveAuctionPermanentArchiveToFirebase(archiveData) {
  try {
    const payload = archiveData ? { ...archiveData, lastArchivedAt: Date.now() } : null;
    await fetch(`${FIREBASE_DB_URL}/cpl_master/auction_archive_jsl_2026.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("Auction permanent archive cloud save error:", err);
  }
}

export async function fetchAuctionPermanentArchiveFromFirebase() {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master/auction_archive_jsl_2026.json`, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Auction permanent archive fetch fallback:", err);
  }
  return null;
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

// Helper to prepare data URLs before sending payload to Firebase Realtime DB (Preserves player photos, sanitizes document proofs)
function sanitizePayloadForCloud(dataList) {
  if (!Array.isArray(dataList)) return [];
  return dataList.map(item => {
    if (!item) return item;
    const itemCopy = { ...item };
    if (itemCopy.aadharPhotoUrl && itemCopy.aadharPhotoUrl.startsWith('data:image')) {
      itemCopy.aadharPhotoUrl = 'Attached Document';
    }
    if (itemCopy.paymentReceiptUrl && itemCopy.paymentReceiptUrl.startsWith('data:image')) {
      itemCopy.paymentReceiptUrl = 'Attached Receipt';
    }
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
      return {
        isAdPopupEnabled: false,
        isWhatsAppPopupEnabled: true,
        isWelcomePopupEnabled: true,
        isRealtimePlayerToastEnabled: true,
        promotedShopId: 'maa-laxmi-kitchen',
        adExpiryTime: 0,
        ...(data || {})
      };
    }
  } catch (err) {
    console.warn("Failed to fetch popup settings from Firebase:", err);
  }
  return {
    isAdPopupEnabled: false,
    isWhatsAppPopupEnabled: true,
    isWelcomePopupEnabled: true,
    isRealtimePlayerToastEnabled: true,
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

export async function saveRegistrationSettingsToFirebase(settings) {
  try {
    const response = await fetch(`${FIREBASE_DB_URL}/cpl_master/registrationSettings.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (response.ok) {
      console.log("Registration settings saved to Firebase.");
      return true;
    }
  } catch (err) {
    console.warn("Failed to save registration settings to Firebase:", err);
  }
  return false;
}

export async function fetchRegistrationSettingsFromFirebase() {
  try {
    const response = await fetch(`${FIREBASE_DB_URL}/cpl_master/registrationSettings.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return {
        isJslRegistrationOpen: true,
        isPlayerRegOpen: true,
        isTeamRegOpen: true,
        closedReason: "JSL 2026 Registration is currently closed by the Master Admin.",
        ...(data || {})
      };
    }
  } catch (err) {
    console.warn("Failed to fetch registration settings from Firebase:", err);
  }
  return {
    isJslRegistrationOpen: true,
    isPlayerRegOpen: true,
    isTeamRegOpen: true,
    closedReason: "JSL 2026 Registration is currently closed by the Master Admin."
  };
}

// --- PUBLIC COMMUNITY QUERIES & REPLIES REALTIME DATABASE OPERATIONS ---
export async function saveCommunityQueryToFirebase(queryData) {
  if (!queryData || !queryData.id) return false;
  try {
    const response = await fetch(`${FIREBASE_DB_URL}/cpl_master/communityQueries/${queryData.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryData)
    });
    return response.ok;
  } catch (err) {
    console.warn("Failed to save community query to Firebase:", err);
    return false;
  }
}

export async function deleteCommunityQueryFromFirebase(queryId) {
  if (!queryId) return false;
  try {
    const response = await fetch(`${FIREBASE_DB_URL}/cpl_master/communityQueries/${queryId}.json`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (err) {
    console.warn("Failed to delete community query from Firebase:", err);
    return false;
  }
}

export async function fetchCommunityQueriesFromFirebase() {
  try {
    const response = await fetch(`${FIREBASE_DB_URL}/cpl_master/communityQueries.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data) {
        const list = Array.isArray(data) ? data : Object.values(data);
        return list.filter(q => q && q.id);
      }
    }
  } catch (err) {
    console.warn("Failed to fetch community queries from Firebase:", err);
  }
  return [];
}



export async function fetchTournamentOwnersFromFirebase() {
  try {
    const response = await fetch(`${FIREBASE_DB_URL}/cpl_master/tournament_owners.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return data || {};
    }
  } catch (err) {
    console.warn("Failed to fetch tournament owners from Firebase:", err);
  }
  return {};
}

export async function fetchUserAccountsFromFirebase() {
  try {
    const response = await fetch(`${FIREBASE_DB_URL}/cpl_master/user_accounts.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data) {
        return Array.isArray(data) ? data : Object.values(data);
      }
    }
  } catch (err) {
    console.warn("Failed to fetch user accounts from Firebase:", err);
  }
  return [];
}


// --- REALTIME LIVE & TOTAL VISITOR TRACKER ---
let visitorHeartbeatTimer = null;

export async function initVisitorTracking(onStatsChange) {
  try {
    // Permanent Device / Unique User ID
    let deviceUid = localStorage.getItem('cpl_device_uid');
    if (!deviceUid) {
      deviceUid = 'uid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('cpl_device_uid', deviceUid);
    }

    // Session ID for Live Online Presence Heartbeats
    let sessionId = sessionStorage.getItem('cpl_visitor_sid');
    if (!sessionId) {
      sessionId = 'sid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem('cpl_visitor_sid', sessionId);
    }

    // 1. Strictly Unique Visitor Count: counted once per device/person forever
    if (!localStorage.getItem('cpl_unique_visitor_counted')) {
      localStorage.setItem('cpl_unique_visitor_counted', 'true');
      fetch(`${FIREBASE_DB_URL}/cpl_master/site_stats/total_visits.json?_t=${Date.now()}`)
        .then(r => r.json())
        .then(currentTotal => {
          const newTotal = (Number(currentTotal) || 286) + 1;
          fetch(`${FIREBASE_DB_URL}/cpl_master/site_stats/total_visits.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTotal)
          }).catch(() => {});
        }).catch(() => {});
    }

    // 2. Send live presence heartbeat
    const sendHeartbeat = () => {
      fetch(`${FIREBASE_DB_URL}/cpl_master/presence/${sessionId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_active: Date.now() })
      }).catch(() => {});
    };

    sendHeartbeat();
    if (visitorHeartbeatTimer) clearInterval(visitorHeartbeatTimer);
    visitorHeartbeatTimer = setInterval(sendHeartbeat, 15000);

    // 3. Remove presence on window unload
    window.addEventListener('beforeunload', () => {
      try {
        navigator.sendBeacon(`${FIREBASE_DB_URL}/cpl_master/presence/${sessionId}.json`, JSON.stringify(null));
      } catch (e) {}
    });

    // 4. Initial fetch and periodic refresh
    fetchVisitorStats(onStatsChange);
    setInterval(() => {
      fetchVisitorStats(onStatsChange);
    }, 10000);
  } catch (err) {
    console.warn("Visitor tracking notice:", err);
  }
}

// --- MULTI-TENANT TOURNAMENT SAAS & PLATFORM SETTINGS ENGINE ---
export async function savePlatformSettingsToFirebase(settings) {
  try {
    const payload = { ...settings, updated_at: Date.now() };
    await fetch(`${FIREBASE_DB_URL}/cpl_master/platform_settings.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("Platform settings save error:", err);
  }
}

export async function fetchPlatformSettingsFromFirebase() {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master/platform_settings.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Platform settings fetch notice:", err);
  }
  return null;
}

export async function saveCustomTournamentToFirebase(tourney) {
  try {
    if (!tourney || !tourney.id) return;
    const payload = { ...tourney, updated_at: Date.now() };
    await fetch(`${FIREBASE_DB_URL}/cpl_master/tournaments/${tourney.id}/meta.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("Custom tournament save error:", err);
  }
}

export async function fetchCustomTournamentsFromFirebase() {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master/tournaments.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (!data) return [];
      const list = [];
      Object.keys(data).forEach(key => {
        const item = data[key];
        if (item) {
          list.push(item.meta || item);
        }
      });
      return list;
    }
  } catch (err) {
    console.warn("Custom tournaments fetch notice:", err);
  }
  return [];
}

export async function deleteCustomTournamentFromFirebase(tourneyId) {
  try {
    if (!tourneyId) return;
    await fetch(`${FIREBASE_DB_URL}/cpl_master/tournaments/${tourneyId}.json`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn("Custom tournament delete error:", err);
  }
}

export async function saveUniversalPlayerToFirebase(profile) {
  try {
    const phone = (profile.phone || profile.mobile || '').trim().replace(/[^0-9]/g, '');
    if (!phone || phone.length < 10) return;
    const payload = { ...profile, updated_at: Date.now() };
    await fetch(`${FIREBASE_DB_URL}/cpl_master/universal_players/${phone}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("Universal player save error:", err);
  }
}

export async function fetchUniversalPlayersFromFirebase() {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master/universal_players.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data || {};
    }
  } catch (err) {
    console.warn("Universal players fetch notice:", err);
  }
  return {};
}

export async function saveTournamentFormatToFirebase(leagueCode, formatConfig) {
  try {
    if (!leagueCode) return;
    const cleanCode = leagueCode.toUpperCase();
    const payload = { ...formatConfig, updated_at: Date.now() };
    await fetch(`${FIREBASE_DB_URL}/cpl_master/tournament_formats/${cleanCode}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("Tournament format save error:", err);
  }
}

export async function fetchTournamentFormatsFromFirebase() {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master/tournament_formats.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      return await res.json() || {};
    }
  } catch (err) {
    console.warn("Tournament formats fetch notice:", err);
  }
  return {};
}

export async function fetchVisitorStats(callback) {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/cpl_master.json?_t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    const totalVisits = Number(data?.site_stats?.total_visits) || 286;
    
    let liveCount = 1;
    if (data?.presence && typeof data.presence === 'object') {
      const now = Date.now();
      const cutoff = now - 45000; // active in last 45 seconds
      const activeSessions = Object.values(data.presence).filter(sess => sess && Number(sess.last_active) > cutoff);
      liveCount = Math.max(1, activeSessions.length);
    }

    if (callback) {
      callback({ totalVisits, liveCount });
    }
    return { totalVisits, liveCount };
  } catch (e) {
    if (callback) callback({ totalVisits: 286, liveCount: 1 });
    return { totalVisits: 286, liveCount: 1 };
  }
}

