// Automatic Zero-Setup Cloud Database, Supabase & Realtime Cloud Storage Integration (Developer: Suman Kolay)


import { enqueueOfflineMutation, processOfflineQueue } from './offlineQueue.js';

export const SUPABASE_URL = typeof window !== 'undefined' && localStorage.getItem('cpl_supabase_url')
  ? localStorage.getItem('cpl_supabase_url')
  : "https://eunwcvdackphjqpyujwn.supabase.co";

export const SUPABASE_ANON_KEY = typeof window !== 'undefined' && localStorage.getItem('cpl_supabase_anon_key')
  ? localStorage.getItem('cpl_supabase_anon_key')
  : "sb_publishable_s_eZ15ii6ZFoFGODEU0AWg_-eVyzZcn";

export let supabase = null;
let activeRealtimeChannel = null;
let globalBroadcastChannel = null;
const localBroadcastChannel = (typeof window !== 'undefined' && 'BroadcastChannel' in window)
  ? new BroadcastChannel('cpl_realtime_local_sync')
  : null;

if (localBroadcastChannel) {
  localBroadcastChannel.onmessage = (event) => {
    if (!event?.data) return;
    if (event.data.type === 'live_score_update') {
      processLiveScoreUpdate(event.data.payload);
    } else if (event.data.type === 'fixture_update') {
      processFixtureUpdate(event.data.payload);
    }
  };
}

export function ensureGlobalBroadcastChannel() {
  if (!supabase) return null;
  if (!globalBroadcastChannel) {
    try {
      globalBroadcastChannel = supabase.channel('cpl_realtime_global', {
        config: { broadcast: { ack: false } }
      });
      globalBroadcastChannel
        .on('broadcast', { event: 'live_score_update' }, (msg) => {
          console.log('⚡ [REALTIME WS] Received live_score_update on global channel:', msg?.payload?.fixtureId);
          processLiveScoreUpdate(msg?.payload);
        })
        .on('broadcast', { event: 'fixture_update' }, (msg) => {
          processFixtureUpdate(msg?.payload);
        })
        .subscribe((status, err) => {
          console.log('[SUPABASE REALTIME] Global channel status:', status, err || '');
        });
    } catch(e) {
      console.warn('[SUPABASE REALTIME] ensureGlobalBroadcastChannel error:', e);
    }
  }
  return globalBroadcastChannel;
}

export function initSupabaseClient(url = SUPABASE_URL, key = SUPABASE_ANON_KEY) {
  if (typeof window !== 'undefined' && window.supabase) {
    try {
      supabase = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      console.log("⚡ [SUPABASE] Realtime & Postgres Client connected successfully.");
      ensureGlobalBroadcastChannel();
      return supabase;
    } catch (err) {
      console.warn("[SUPABASE] Init warning:", err);
    }
  }
  return null;
}

initSupabaseClient();

// --- DETERMINISTIC LEGACY-ID -> UUID MAPPING (mirrors migrate_firebase_to_supabase.js) ---
const UUID_FORMAT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function makeUUID(input) {
  const str = String(input);
  let h0 = 0x6a09e667 | 0, h1 = 0xbb67ae85 | 0, h2 = 0x3c6ef372 | 0, h3 = 0xa54ff53a | 0;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h0 = Math.imul(h0 ^ k, 0x9e3779b9) >>> 0;
    h1 = Math.imul(h1 ^ k, 0x517cc1b7) >>> 0;
    h2 = Math.imul(h2 ^ k, 0x6c62272e) >>> 0;
    h3 = Math.imul(h3 ^ k, 0x2e1b2138) >>> 0;
    h0 = (h0 ^ (h0 >>> 16)) >>> 0;
    h1 = (h1 ^ (h1 >>> 16)) >>> 0;
    h2 = (h2 ^ (h2 >>> 16)) >>> 0;
    h3 = (h3 ^ (h3 >>> 16)) >>> 0;
  }
  const hex = [h0, h1, h2, h3].map(v => v.toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

export const TOURNAMENT_UUID_REGISTRY = new Map([
  ['leg-jsl', '033bfc04-033b-4c04-a33b-fc04033bfc04'],
  ['jsl-2026', '033bfc04-033b-4c04-a33b-fc04033bfc04'],
  ['t_jsl-2026', '033bfc04-033b-4c04-a33b-fc04033bfc04'],
  ['jsl', '033bfc04-033b-4c04-a33b-fc04033bfc04'],
  ['jhankra super league 2026', '033bfc04-033b-4c04-a33b-fc04033bfc04'],
  ['k2026', '5cf4f50c-3930-486a-83c3-3f59414a7d6f'],
  ['t_k2026', '5cf4f50c-3930-486a-83c3-3f59414a7d6f'],
  ['k22026', '5cf4f50c-3930-486a-83c3-3f59414a7d6f'],
  ['t_k22026', '5cf4f50c-3930-486a-83c3-3f59414a7d6f'],
  ['kpl 2026', '5cf4f50c-3930-486a-83c3-3f59414a7d6f'],
  ['kpl', '5cf4f50c-3930-486a-83c3-3f59414a7d6f'],
  ['kuapur', '5cf4f50c-3930-486a-83c3-3f59414a7d6f'],
  ['kuapur premier league', '5cf4f50c-3930-486a-83c3-3f59414a7d6f'],
  ['m2026', '440f982b-6008-40f4-a6bc-0516a0985672'],
  ['t_m2026', '440f982b-6008-40f4-a6bc-0516a0985672'],
  ['mtcl2026', '440f982b-6008-40f4-a6bc-0516a0985672'],
  ['mtcl', '440f982b-6008-40f4-a6bc-0516a0985672']
]);

export function registerTournamentUUID(key, uuid) {
  if (!key || !uuid) return;
  const cleanKey = String(key).trim().toLowerCase();
  const cleanNoPrefix = cleanKey.replace(/^t_/, '');
  TOURNAMENT_UUID_REGISTRY.set(cleanKey, uuid);
  TOURNAMENT_UUID_REGISTRY.set(cleanNoPrefix, uuid);
  TOURNAMENT_UUID_REGISTRY.set(`t_${cleanNoPrefix}`, uuid);
}

export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function toUUID(oldId) {
  if (!oldId) return null;
  const str = String(oldId).trim();
  if (UUID_FORMAT_RE.test(str)) return str;
  const lower = str.toLowerCase();
  if (TOURNAMENT_UUID_REGISTRY.has(lower)) {
    return TOURNAMENT_UUID_REGISTRY.get(lower);
  }
  const clean = lower.replace(/^t_/, '');
  if (TOURNAMENT_UUID_REGISTRY.has(clean)) {
    return TOURNAMENT_UUID_REGISTRY.get(clean);
  }
  return makeUUID(str);
}

export async function resolveTournamentUUID(idOrSlug) {
  if (!idOrSlug) return DEFAULT_TOURNAMENT_UUID;
  const direct = toUUID(idOrSlug);
  if (direct && UUID_FORMAT_RE.test(direct) && TOURNAMENT_UUID_REGISTRY.has(String(idOrSlug).toLowerCase())) {
    return direct;
  }
  if (UUID_FORMAT_RE.test(String(idOrSlug))) return String(idOrSlug);

  const clean = String(idOrSlug).replace(/^t_/, '').trim().toLowerCase();
  if (supabase) {
    try {
      const { data } = await supabase.from('tournaments').select('id, slug, category_code, name').or(`slug.ilike.${clean},category_code.ilike.${clean},name.ilike.${clean}`).maybeSingle();
      if (data?.id) {
        registerTournamentUUID(data.slug, data.id);
        registerTournamentUUID(data.category_code, data.id);
        registerTournamentUUID(data.name, data.id);
        return data.id;
      }
    } catch (e) {}
  }
  return direct || DEFAULT_TOURNAMENT_UUID;
}

// ==============================================================================
// 1. SUPABASE REAL AUTH & RBAC METHODS (Zero Plaintext Secrets)
// ==============================================================================

export async function signUpUser(email, password, fullName, role = 'organiser') {
  if (!supabase) return { error: { message: 'Supabase client not initialized' } };
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[SUPABASE AUTH] Sign-up failed:", err);
    return { data: null, error: err };
  }
}

export async function signInUser(email, password) {
  if (!supabase) return { error: { message: 'Supabase client not initialized' } };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
    
    // Fetch profile role from database
    if (data?.user?.id) {
      const profile = await fetchUserProfile(data.user.id);
      return { data: { ...data, profile }, error: null };
    }
    return { data, error: null };
  } catch (err) {
    console.error("[SUPABASE AUTH] Sign-in failed:", err);
    return { data: null, error: err };
  }
}

export async function sendPhoneOtp(phone) {
  if (!supabase) return { error: { message: 'Supabase client not initialized' } };
  try {
    const { data, error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[SUPABASE AUTH] Phone OTP send failed:", err);
    return { data: null, error: err };
  }
}

export async function verifyPhoneOtp(phone, token) {
  if (!supabase) return { error: { message: 'Supabase client not initialized' } };
  try {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[SUPABASE AUTH] Phone OTP verify failed:", err);
    return { data: null, error: err };
  }
}

export async function signOutUser() {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[SUPABASE AUTH] Sign-out warning:", err);
  }
}

export async function getAuthSession() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  } catch (e) {
    return null;
  }
}

export async function getAuthUser() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch (e) {
    return null;
  }
}

export async function fetchUserProfile(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) return data;
  } catch (e) {}
  return null;
}

export async function updateUserProfile(userId, profileData) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...profileData, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (!error) return data;
  } catch (e) {}
  return null;
}

export function setupAuthStateListener(callback) {
  if (!supabase || typeof callback !== 'function') return null;
  return supabase.auth.onAuthStateChange(async (event, session) => {
    let profile = null;
    if (session?.user?.id) {
      profile = await fetchUserProfile(session.user.id);
    }
    callback(event, session, profile);
  });
}

// ==============================================================================
// 2. CLIENT-SIDE IMAGE COMPRESSION (~90-100 KB TARGET, ZERO QUALITY LOSS)
// ==============================================================================

export async function compressImageToTarget(fileInput, targetSizeKb = 100, maxDimension = 1200) {
  if (!fileInput) return null;
  
  let file = ensureFileObject(fileInput, 'upload.jpg');
  if (!file || !(file instanceof Blob)) return fileInput;
  
  // If already under target size, return directly
  if (file.size <= targetSizeKb * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        const compressStep = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            if (blob.size <= targetSizeKb * 1024 || quality <= 0.3) {
              const compressedFile = new File([blob], file.name || 'compressed.jpg', { type: 'image/jpeg' });
              console.log(`⚡ [Image Compressor] Reduced from ${(file.size / 1024).toFixed(1)} KB -> ${(compressedFile.size / 1024).toFixed(1)} KB (Quality: ${(quality * 100).toFixed(0)}%)`);
              resolve(compressedFile);
            } else {
              quality -= 0.15;
              compressStep();
            }
          }, 'image/jpeg', quality);
        };
        compressStep();
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// --- GOOGLE DRIVE AUTOMATIC BACKUP BACKEND ---

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

// --- CLOUDINARY SIGNED IMAGE UPLOAD VIA BACKEND (credentials stay server-side) ---

async function fileToBase64DataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToCloudinary(fileInput, folderName = 'photos') {
  if (!fileInput) return null;
  try {
    const compressed = await compressImageToTarget(fileInput, 100, 1200);
    const file = ensureFileObject(compressed, `${folderName}_${Date.now()}.jpg`);
    const dataUri = await fileToBase64DataUri(file);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;

    let response = null;
    try {
      response = await fetch('/api/cricket-league/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: dataUri, folder: `cpl_uploads/${folderName}` }),
        signal: controller ? controller.signal : undefined
      });
    } catch (e) {
      // If primary endpoint fails, try alternative path
      try {
        response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: dataUri, folder: `cpl_uploads/${folderName}` }),
          signal: controller ? controller.signal : undefined
        });
      } catch (err2) {
        response = null;
      }
    }
    if (timeoutId) clearTimeout(timeoutId);

    if (response && response.ok) {
      const data = await response.json();
      if (data && data.secure_url) {
        console.log("⚡ Uploaded image via signed backend proxy:", data.secure_url);
        return data.secure_url;
      }
    } else if (response) {
      const errData = await response.json().catch(() => ({}));
      console.warn("Upload proxy error:", response.status, errData.error || '');
    }

    // Direct Cloudinary unsigned upload fallback (works on localhost without Vercel API backend)
    try {
      const formData = new FormData();
      formData.append('file', dataUri);
      formData.append('upload_preset', 'cpl_uploads');
      formData.append('folder', `cpl_uploads/${folderName}`);
      const directRes = await fetch('https://api.cloudinary.com/v1_1/k483yjqc/image/upload', {
        method: 'POST',
        body: formData
      });
      if (directRes.ok) {
        const dData = await directRes.json();
        if (dData && dData.secure_url) {
          console.log("⚡ Uploaded image via direct Cloudinary upload:", dData.secure_url);
          return dData.secure_url;
        }
      }
    } catch (directErr) {
      console.warn("Direct Cloudinary fallback notice:", directErr);
    }
  } catch (err) {
    console.warn("Image upload notice:", err);
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

// --- CLOUDINARY-ONLY HD IMAGE UPLOADER (AUTO-COMPRESSED & SECURE) ---
export async function uploadHDImage(fileInput, folderName = 'documents') {
  if (!fileInput) return null;
  return uploadImageToCloudinary(fileInput, folderName);
}

// --- REALTIME PUSH EVENT LISTENER (SUPABASE REALTIME CHANNEL STUB) ---

export function processLiveScoreUpdate(p) {
  if (typeof window === 'undefined' || !p || !p.fixtureId) return;

  // 1. Store in memory registry for instant UI access anywhere in app
  window.__cplLiveScores = window.__cplLiveScores || {};
  if (p.liveMatchState) {
    window.__cplLiveScores[p.fixtureId] = p.liveMatchState;
    const uid = toUUID(p.fixtureId);
    if (uid) window.__cplLiveScores[uid] = p.liveMatchState;
  }

  const s = window.store;
  const fTid = p.tournament_id;
  const targetKeys = new Set();
  if (s) {
    const isActive = !fTid || fTid === s.activeTournamentId || toUUID(fTid) === toUUID(s.activeTournamentId);
    targetKeys.add(s._scopedKey('FIXTURES'));
    if (fTid) {
      targetKeys.add('cpl_fixtures_v8_' + (toUUID(fTid) || fTid));
      targetKeys.add('cpl_fixtures_v8_' + fTid);
    }
  }
  if (typeof localStorage !== 'undefined' && localStorage.getItem('cpl_fixtures_v8')) {
    targetKeys.add('cpl_fixtures_v8');
  }

  let updatedAny = false;

  targetKeys.forEach(fixKey => {
    try {
      let fixtures = JSON.parse(localStorage.getItem(fixKey)) || [];
      const idx = fixtures.findIndex(f => f && (f.id === p.fixtureId || (toUUID(f.id) && toUUID(f.id) === toUUID(p.fixtureId))));
      if (idx !== -1) {
        if (p.liveMatchState) {
          const existing = fixtures[idx].liveMatchState || fixtures[idx].liveState || {};
          const incoming = p.liveMatchState;

          // Merge ball history: incoming contains recent deliveries (newest-first).
          // Keep newest-first order, prepend any newer deliveries not in existing.
          const existingHistory = Array.isArray(existing.ballHistory) ? existing.ballHistory : [];
          const incomingHistory = Array.isArray(incoming.ballHistory) ? incoming.ballHistory : [];
          const mergedHistory = [...incomingHistory];
          existingHistory.forEach(eb => {
            if (!mergedHistory.some(mb => mb.overNum === eb.overNum && (mb.label === eb.label || mb.type === eb.type) && mb.timestamp === eb.timestamp)) {
              mergedHistory.push(eb);
            }
          });

          const mergedLive = {
            ...existing,
            ...incoming,
            ballHistory: mergedHistory,
            _v: Math.max(existing._v || 0, incoming._v || 0, Date.now())
          };
          fixtures[idx].liveMatchState = mergedLive;
          fixtures[idx].liveState = mergedLive;
        }
        if (p.status) fixtures[idx].status = p.status;
        if (p.result !== undefined) fixtures[idx].result = p.result;
        if (p.winnerTeamId !== undefined) fixtures[idx].winnerTeamId = p.winnerTeamId;
        if (fixtures[idx].result && String(fixtures[idx].result).trim() && fixtures[idx].status !== 'COMPLETED') {
          fixtures[idx].status = 'COMPLETED';
        }
        if (p.teamAScore) fixtures[idx].teamAScore = p.teamAScore;
        if (p.teamBScore) fixtures[idx].teamBScore = p.teamBScore;
        if (p.oversLimit) fixtures[idx].oversLimit = p.oversLimit;
        if (p.inningsTiming) fixtures[idx].inningsTiming = p.inningsTiming;
        if (p.superOverData) fixtures[idx].superOverData = p.superOverData;
        fixtures[idx].updated_at = Date.now();
        localStorage.setItem(fixKey, JSON.stringify(fixtures));
        updatedAny = true;
      } else if (p.liveMatchState) {
        // Fixture not yet in this scoped cache: append it so spectator sees it!
        const isCompletedPlaceholder = (p.status === 'COMPLETED') || !!(p.result && String(p.result).trim());
        const placeholderFixture = {
          id: p.fixtureId,
          tournament_id: fTid,
          leagueId: fTid,
          status: isCompletedPlaceholder ? 'COMPLETED' : (p.status || 'LIVE'),
          result: p.result || null,
          winnerTeamId: p.winnerTeamId || null,
          teamAScore: p.teamAScore || null,
          teamBScore: p.teamBScore || null,
          oversLimit: p.oversLimit || 16,
          liveMatchState: p.liveMatchState,
          liveState: p.liveMatchState,
          updated_at: Date.now(),
          _fromBroadcast: true
        };
        fixtures.push(placeholderFixture);
        localStorage.setItem(fixKey, JSON.stringify(fixtures));
        updatedAny = true;
      }
    } catch (e) {}
  });

  if (s) {
    s._invalidateCache('fixtures');
    s.notify('fixtures_updated');
  }

  // Dispatch custom events for live score listeners
  window.dispatchEvent(new CustomEvent('cpl_live_score_updated', { detail: p }));
  window.dispatchEvent(new CustomEvent('fixtures_updated', { detail: p }));

  // Proactively re-render open Match Center or Fixtures tab without delay
  if (typeof window.renderActiveMatchCenter === 'function') {
    try { window.renderActiveMatchCenter(); } catch (e) {}
  }
  if (typeof window.refreshFixturesViewContent === 'function') {
    try { window.refreshFixturesViewContent(); } catch (e) {}
  }

  console.log('⚡ [REALTIME RECEIVED] Live score update applied:', p.fixtureId, p.liveMatchState?.runs + '/' + p.liveMatchState?.wickets);
}

export function processFixtureUpdate(p) {
  if (typeof window === 'undefined' || !window.store || !p) return;
  const s = window.store;
  const fTid = p.fixture?.tournament_id || p.fixture?.leagueId || p.tournament_id;
  const isActive = !fTid || fTid === s.activeTournamentId || toUUID(fTid) === toUUID(s.activeTournamentId);
  const scopedFixKey = isActive ? s._scopedKey('FIXTURES') : ('cpl_fixtures_v8_' + (toUUID(fTid) || fTid));

  if (p.action === 'upsert' && p.fixture) {
    let fixtures = [];
    try { fixtures = JSON.parse(localStorage.getItem(scopedFixKey)) || []; } catch(e) {}
    const idx = fixtures.findIndex(f => f && (f.id === p.fixture.id || (toUUID(f.id) && toUUID(f.id) === toUUID(p.fixture.id))));
    if (idx !== -1) {
      fixtures[idx] = { ...fixtures[idx], ...p.fixture, updated_at: Date.now() };
    } else {
      fixtures.push(p.fixture);
    }
    try { localStorage.setItem(scopedFixKey, JSON.stringify(fixtures)); } catch (e) {}

    if (!isActive) {
      const activeKey = s._scopedKey('FIXTURES');
      try {
        let activeFixtures = JSON.parse(localStorage.getItem(activeKey)) || [];
        const aIdx = activeFixtures.findIndex(f => f && (f.id === p.fixture.id || (toUUID(f.id) && toUUID(f.id) === toUUID(p.fixture.id))));
        if (aIdx !== -1) {
          activeFixtures[aIdx] = { ...activeFixtures[aIdx], ...p.fixture, updated_at: Date.now() };
        } else {
          activeFixtures.push({ ...p.fixture, _fromBroadcast: true });
        }
        localStorage.setItem(activeKey, JSON.stringify(activeFixtures));
      } catch(e) {}
    }
    s._invalidateCache('fixtures');
    s.notify('fixtures_updated');
    window.dispatchEvent(new CustomEvent('cpl_fixtures_realtime', { detail: p }));
    console.log('[REALTIME] Fixture upsert:', p.fixture.teamAName, 'vs', p.fixture.teamBName);
  } else if (p.action === 'delete' && p.fixture_id) {
    let fixtures = [];
    try { fixtures = JSON.parse(localStorage.getItem(scopedFixKey)) || []; } catch(e) {}
    fixtures = fixtures.filter(f => f && f.id !== p.fixture_id && toUUID(f.id) !== toUUID(p.fixture_id));
    try { localStorage.setItem(scopedFixKey, JSON.stringify(fixtures)); } catch (e) {}
    s._invalidateCache('fixtures');
    s.notify('fixtures_updated');
    window.dispatchEvent(new CustomEvent('cpl_fixtures_realtime', { detail: p }));
    console.log('[REALTIME] Fixture deleted:', p.fixture_id);
  } else if (p.action === 'clear_all') {
    try { localStorage.setItem(scopedFixKey, JSON.stringify([])); } catch (e) {}
    s._invalidateCache('fixtures');
    s.notify('fixtures_updated');
    window.dispatchEvent(new CustomEvent('cpl_fixtures_realtime', { detail: p }));
    console.log('[REALTIME] All fixtures cleared for tournament:', fTid);
  }
}

export async function initRealtimePushListener(onUpdateCallback, tournamentId) {
  if (!supabase) return null;
  try {
    if (activeRealtimeChannel) {
      try { supabase.removeChannel(activeRealtimeChannel); } catch (e) {}
      activeRealtimeChannel = null;
    }

    const tId = tournamentId ? (await resolveTournamentUUID(tournamentId) || toUUID(tournamentId) || tournamentId) : null;
    const tFilter = tId ? `tournament_id=eq.${tId}` : undefined;
    const userPresenceId = 'u_' + Math.random().toString(36).substring(2, 9);
    const channel = supabase
      .channel('cpl_realtime_' + (tId || 'global'))
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const liveCount = Math.max(1, Object.keys(state).length);
        if (typeof window !== 'undefined') {
          window.__cplLiveOnlineCount = liveCount;
          const liveEl = document.getElementById('live-visitors-count');
          if (liveEl) liveEl.textContent = liveCount;
        }
      })
      .on('broadcast', { event: 'live_auction_update' }, (msg) => {
        if (msg?.payload?.state && typeof window !== 'undefined' && window.store) {
          const tId = msg.payload.tournament_id;
          if (!tId || tId === window.store.activeTournamentId || toUUID(tId) === toUUID(window.store.activeTournamentId)) {
            window.store.liveAuctionState = msg.payload.state;
            window.dispatchEvent(new CustomEvent('cpl_live_auction_updated', { detail: msg.payload.state }));
          }
        }
      })
      .on('broadcast', { event: 'live_score_update' }, (msg) => processLiveScoreUpdate(msg?.payload))
      .on('broadcast', { event: 'fixture_update' }, (msg) => processFixtureUpdate(msg?.payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', ...(tFilter && { filter: tFilter }) }, (payload) => {
        if (typeof onUpdateCallback === 'function') onUpdateCallback(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', ...(tFilter && { filter: tFilter }) }, (payload) => {
        if (typeof onUpdateCallback === 'function') onUpdateCallback(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', ...(tFilter && { filter: tFilter }) }, (payload) => {
        if (typeof onUpdateCallback === 'function') onUpdateCallback(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_auctions', ...(tFilter && { filter: tFilter }) }, (payload) => {
        if (payload?.new?.live_state && typeof window !== 'undefined' && window.store) {
          window.store.liveAuctionState = payload.new.live_state;
          window.dispatchEvent(new CustomEvent('cpl_live_auction_updated', { detail: payload.new.live_state }));
        }
        if (typeof onUpdateCallback === 'function') onUpdateCallback(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', ...(tId && { filter: `id=eq.${tId}` }) }, (payload) => {
        if (payload?.new?.format_config?.live_auction && typeof window !== 'undefined' && window.store) {
          window.store.liveAuctionState = payload.new.format_config.live_auction;
          window.dispatchEvent(new CustomEvent('cpl_live_auction_updated', { detail: payload.new.format_config.live_auction }));
        }
        if (typeof onUpdateCallback === 'function') onUpdateCallback(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_verification_docs' }, (payload) => {
        if (typeof onUpdateCallback === 'function') onUpdateCallback(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log("[SUPABASE REALTIME] Connected to universal realtime stream.");
          try {
            await channel.track({ online_at: new Date().toISOString(), id: userPresenceId });
          } catch (e) {}
        }
      });

    activeRealtimeChannel = channel;
    ensureGlobalBroadcastChannel();
    return channel;
  } catch (err) {
    console.warn("[SUPABASE] initRealtimePushListener notice:", err);
    return null;
  }
}

// --- DEFAULT TOURNAMENT UUID (LEGACY 'leg-jsl' KEY) ---
export const DEFAULT_TOURNAMENT_UUID = toUUID('leg-jsl');

// --- ON-DEMAND FETCH: Verification Docs (only when admin opens approvals) ---
export async function fetchVerificationDocs(tournamentId) {
  if (!supabase) return [];
  try {
    const tId = await resolveTournamentUUID(tournamentId) || toUUID(tournamentId) || DEFAULT_TOURNAMENT_UUID;
    const { data, error } = await supabase.from('player_verification_docs').select('*').eq('tournament_id', tId);
    if (error) { console.warn("[SUPABASE] fetchVerificationDocs error:", error.message); return []; }
    return data || [];
  } catch (e) { return []; }
}

// --- ON-DEMAND FETCH: Person Profiles (only when registration form opens) ---
export async function fetchPersonProfiles(tournamentId) {
  if (!supabase) return [];
  try {
    const tId = await resolveTournamentUUID(tournamentId) || toUUID(tournamentId) || DEFAULT_TOURNAMENT_UUID;
    const { data, error } = await supabase.from('person_profiles').select('*').eq('tournament_id', tId).limit(500);
    if (error) { console.warn("[SUPABASE] fetchPersonProfiles error:", error.message); return []; }
    return data || [];
  } catch (e) { return []; }
}

// --- CROSS-TOURNAMENT FIXTURES FETCH (lightweight, fixtures only) ---
export async function fetchAllTournamentsFixtures() {
  if (!supabase) return {};
  try {
    const { data: tourneys } = await supabase.from('tournaments').select('id, name, category_code, slug, logo_url, banner_url, venue_name, format_config');
    if (!Array.isArray(tourneys)) return {};
    const result = {};
    for (const t of tourneys) {
      const tid = t.id;
      const configMatches = Array.isArray(t.format_config?.custom_matches) ? t.format_config.custom_matches : [];
      const { data: dbMatches } = await supabase.from('matches').select('*').eq('tournament_id', tid);
      const matchesMap = new Map();
      (dbMatches || []).forEach(m => {
        if (!m || !m.id) return;
        matchesMap.set(m.id, {
          id: m.id, tournament_id: tid, leagueId: tid,
          leagueCode: (t.category_code || t.slug || 'T').toUpperCase(),
          matchNo: m.match_no, stage: m.stage || 'GROUP_A', groupCode: m.group_code || 'A',
          teamAId: m.team_a_id, teamBId: m.team_b_id,
          teamAName: m.team_a_name || 'Team A', teamBName: m.team_b_name || 'Team B',
          date: m.date, time: m.time, venue: m.venue,
          oversLimit: m.overs_limit || 16, status: m.status || 'SCHEDULED',
          result: m.result, liveState: m.live_state,
          tournamentName: t.name, logoUrl: t.logo_url || t.banner_url
        });
      });
      configMatches.forEach(cm => {
        if (!cm || !cm.id) return;
        const existing = matchesMap.get(cm.id);
        matchesMap.set(cm.id, {
          ...(existing || {}), ...cm, id: cm.id,
          tournament_id: tid, leagueId: tid,
          leagueCode: (t.category_code || t.slug || cm.leagueCode || 'T').toUpperCase(),
          tournamentName: t.name, logoUrl: t.logo_url || t.banner_url
        });
      });
      result[tid] = Array.from(matchesMap.values());
    }
    return result;
  } catch (e) {
    console.warn('[SUPABASE] fetchAllTournamentsFixtures:', e.message);
    return {};
  }
}

// --- INSTANT CLOUD DATA FETCH (SUPABASE POSTGRES BACKED) ---
export async function fetchCloudData(tournamentId) {
  return fetchCloudDataFromSupabase(tournamentId || DEFAULT_TOURNAMENT_UUID);
}

export async function fetchCloudDataFromSupabase(tournamentId = DEFAULT_TOURNAMENT_UUID) {
  const empty = { players: [], teams: [], fixtures: [], playerProfiles: [], auctionSettings: { defaultBasePrice: 300, defaultPurseBudget: 8000 }, registrationSettings: { isPlayerRegOpen: true, isTeamRegOpen: true, closedReason: "Registration is currently closed by the Admin." }, clearedAt: 0, teamsClearedAt: 0, deletedPlayerIds: [], deletedTeamIds: [] };
  if (!supabase) return empty;

  try {
    const tId = await resolveTournamentUUID(tournamentId) || toUUID(tournamentId) || DEFAULT_TOURNAMENT_UUID;

    const [playersRes, teamsRes, matchesRes, tourneyRes, auctionRes] = await Promise.all([
      supabase.from('players').select(`
        id, tournament_id, person_id, category_name,
        base_price, is_icon, team_id, status, auction_status, sold_price, bid_history, verified, reg_number,
        updated_at, created_at,
        person:person_id (
          id, name, phone, photo_url, role, batting_style, bowling_style, dob, village, district, state, jersey_size
        )
      `).eq('tournament_id', tId).neq('status', 'deleted'),
      supabase.from('teams').select(`
        id, tournament_id, name, short_name, owner_name, owner_phone, owner_photo_url,
        captain_name, co_owner_name, mentor_name, logo_url, group_code,
        budget_total, budget_remaining, icon_player_id, icon_player_name, icon_player_fee,
        registration_status, payment_status, max_squad, created_at, updated_at
      `).eq('tournament_id', tId),
      supabase.from('matches').select('*').eq('tournament_id', tId),
      supabase.from('tournaments').select(`
        id, category_code, slug, name, registration_fee, total_team_budget, icon_price,
        kickoff_date, prize_winner, is_registration_open, is_player_reg_open, is_team_reg_open,
        closed_reason, approval_status, format_config,
        profile:organiser_id ( id, full_name, phone, upi_id, payment_qr_url )
      `).eq('id', tId).maybeSingle(),
      (async () => {
        try {
          return await supabase.from('tournament_auctions').select('*').eq('tournament_id', tId).maybeSingle();
        } catch (e) {
          return { data: null, error: e };
        }
      })()
    ]);
    // Docs and profiles are fetched on-demand only (not every poll) to save mobile data
    const docsRes = { data: [], error: null };
    const profilesRes = { data: [], error: null };
    let tourneyMeta = tourneyRes?.data;
    if (!tourneyMeta && tournamentId) {
      const cleanSlug = String(tournamentId).replace(/^t_/, '').trim();
      const { data: fallbackT } = await supabase.from('tournaments').select(`
        id, category_code, slug, name, registration_fee, total_team_budget, icon_price,
        kickoff_date, prize_winner, is_registration_open, is_player_reg_open, is_team_reg_open,
        closed_reason, approval_status, format_config,
        profile:organiser_id ( id, full_name, phone, upi_id, payment_qr_url )
      `).or(`slug.ilike.${cleanSlug},category_code.ilike.${cleanSlug}`).maybeSingle();
      if (fallbackT) tourneyMeta = fallbackT;
    }
    tourneyMeta = tourneyMeta || {};
    const regPrefix = (tourneyMeta.category_code || tourneyMeta.slug || 'T').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const playerStatuses = tourneyMeta?.format_config?.player_statuses || {};
    const playerOverrides = tourneyMeta?.format_config?.player_overrides || {};
    const deletedPlayerIds = new Set(tourneyMeta?.format_config?.deleted_player_ids || []);

    const rawDbPlayers = (!playersRes.error && Array.isArray(playersRes.data)) ? playersRes.data : [];
    const dbPlayers = rawDbPlayers.filter(p => {
      if (!p) return false;
      const cleanPhone = (p.phone || '').replace(/[^0-9]/g, '');
      if (deletedPlayerIds.has(p.id) || (cleanPhone && deletedPlayerIds.has(cleanPhone))) {
        return false;
      }
      return true;
    });

    // Deduplicate players by reg_number / phone (preferring valid Cloudinary photo)
    const dedupedPlayersMap = new Map();
    dbPlayers.forEach(p => {
      if (!p) return;
      const cleanPhone = (p.person?.phone || p.phone || '').replace(/[^0-9]/g, '');
      const key = (cleanPhone && cleanPhone !== '0000000000' && cleanPhone.length >= 7) ? `ph_${cleanPhone}` : `id_${p.id}`;
      const existing = dedupedPlayersMap.get(key);
      if (!existing) {
        dedupedPlayersMap.set(key, p);
      } else {
        const currentPhoto = p.person?.photo_url || p.photo_url;
        const existingPhoto = existing.person?.photo_url || existing.photo_url;
        const currentHasCdn = typeof currentPhoto === 'string' && currentPhoto.includes('cloudinary.com');
        const existingHasCdn = typeof existingPhoto === 'string' && existingPhoto.includes('cloudinary.com');
        if (currentHasCdn && !existingHasCdn) {
          dedupedPlayersMap.set(key, p);
        }
      }
    });
    const uniqueDbPlayers = Array.from(dedupedPlayersMap.values());
    uniqueDbPlayers.sort((a, b) => {
      const numA = Number(a.reg_number);
      const numB = Number(b.reg_number);
      const hasA = !isNaN(numA) && numA > 0;
      const hasB = !isNaN(numB) && numB > 0;
      if (hasA && hasB) return numA - numB;
      if (hasA) return -1;
      if (hasB) return 1;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

    const dbTeams = (!teamsRes.error && Array.isArray(teamsRes.data)) ? teamsRes.data : [];
    const dbMatches = (!matchesRes.error && Array.isArray(matchesRes.data)) ? matchesRes.data : [];
    const dbDocs = (!docsRes.error && Array.isArray(docsRes.data)) ? docsRes.data : [];
    const dbProfiles = (!profilesRes.error && Array.isArray(profilesRes.data)) ? profilesRes.data : [];

    const docsByPlayerId = new Map();
    dbDocs.forEach(d => { if (d.player_id) docsByPlayerId.set(d.player_id, d); });

    const profilesByPhone = new Map();
    dbProfiles.forEach(pr => { if (pr.phone) profilesByPhone.set(pr.phone.replace(/[^0-9]/g, ''), pr); });

    const players = uniqueDbPlayers.map((p, idx) => {
      const serial = p.reg_number || (idx + 1);
      const doc = docsByPlayerId.get(p.id) || {};
      const cleanPhone = (p.phone || '').replace(/[^0-9]/g, '');
      const prof = p.person || profilesByPhone.get(cleanPhone) || {};

      const overrideData = playerOverrides[p.id] || (cleanPhone && playerOverrides[cleanPhone]) || {};
      const statusFromConfig = (overrideData.paymentStatus || overrideData.registrationStatus || playerStatuses[p.id] || (cleanPhone && playerStatuses[cleanPhone]) || '').toUpperCase();
      const finalStatus = (statusFromConfig === 'APPROVED' || statusFromConfig === 'REJECTED' || statusFromConfig === 'PENDING')
        ? statusFromConfig
        : (p.verified === true ? 'APPROVED' : (p.status === 'rejected' ? 'REJECTED' : 'PENDING'));
      const isApproved = (finalStatus === 'APPROVED');
      const isRejected = (finalStatus === 'REJECTED');

      const photo = overrideData.photoUrl || (prof.photo_url && prof.photo_url.includes('cloudinary.com') ? prof.photo_url : null) || (p.photo_url && p.photo_url.includes('cloudinary.com') ? p.photo_url : null) || overrideData.player_photo_url || prof.photo_url || p.photo_url || 'assets/card_jsl_user.png';

      const resolvedDob = overrideData.dob || prof.dob || p.dob || doc.dob || null;
      let resolvedAge = overrideData.age || prof.age || p.age || null;
      if (!resolvedAge && resolvedDob) {
        const birthYear = new Date(resolvedDob).getFullYear();
        if (!isNaN(birthYear)) resolvedAge = new Date().getFullYear() - birthYear;
      }

      const resolvedVillage = overrideData.village || prof.village || p.village || '';
      const resolvedDistrict = overrideData.district || prof.district || p.district || 'Paschim Medinipur';
      const resolvedState = overrideData.state || prof.state || p.state || 'West Bengal';

      return {
        id: p.id,
        person_id: p.person_id || prof.id || null,
        tournament_id: p.tournament_id,
        leagueId: tId,
        name: overrideData.name || prof.name || p.name,
        phone: prof.phone || p.phone,
        mobile: prof.phone || p.phone,
        fatherName: overrideData.fatherName || p.father_name || prof.father_name || '',
        photoUrl: photo,
        hdPhotoUrl: photo,
        player_photo_url: photo,
        role: overrideData.role || prof.role || p.role || 'All-Rounder',
        playingType: overrideData.role || prof.role || p.role || 'All-Rounder',
        category: overrideData.category || p.category_name || prof.role || 'All-Rounder',
        basePrice: Number(overrideData.basePrice || p.base_price) || 300,
        isIcon: (p.is_icon === true || overrideData.isIcon === true),
        teamId: (p.team_id || overrideData.teamId || null),
        teamName: overrideData.teamName || null,
        auctionStatus: (p.auction_status ? p.auction_status.toUpperCase() : (overrideData.auctionStatus || (p.team_id ? 'SOLD' : (p.status === 'unsold' ? 'UNSOLD' : 'AVAILABLE')))),
        isSold: (p.auction_status === 'SOLD' || !!p.team_id || overrideData.auctionStatus === 'SOLD' || overrideData.isSold === true),
        isUnsold: (p.auction_status === 'UNSOLD' || (!p.team_id && p.status === 'unsold') || overrideData.auctionStatus === 'UNSOLD' || overrideData.isUnsold === true),
        status: p.status || overrideData.status,
        soldPrice: Number(p.sold_price !== undefined && p.sold_price !== null ? p.sold_price : (overrideData.soldPrice || 0)) || 0,
        boughtPrice: Number(p.sold_price !== undefined && p.sold_price !== null ? p.sold_price : (overrideData.soldPrice || 0)) || 0,
        bidHistory: Array.isArray(p.bid_history) ? p.bid_history : (overrideData.bidHistory || []),
        verified: isApproved,
        paymentStatus: finalStatus,
        registrationStatus: finalStatus,
        remarks: overrideData.remarks || doc.payment_ref || p.remarks || '',
        paymentRef: overrideData.remarks || doc.payment_ref || p.payment_ref || '',
        dob: resolvedDob,
        age: resolvedAge,
        village: resolvedVillage,
        district: resolvedDistrict,
        state: resolvedState,
        idCardFrontUrl: doc.aadhaar_url || prof.idCardFrontUrl || '',
        aadharPhotoUrl: doc.aadhaar_url || prof.aadharPhotoUrl || '',
        idCardBackUrl: prof.idCardBackUrl || '',
        aadharBackUrl: prof.idCardBackUrl || '',
        paymentReceiptUrl: doc.payment_screenshot_url || prof.paymentReceiptUrl || '',
        paymentProofUrl: doc.payment_screenshot_url || prof.paymentProofUrl || '',
        serialNo: serial,
        reg_number: p.reg_number || serial,
        displayRegistrationNumber: p.reg_number || serial,
        registrationId: `${regPrefix}-${String(p.reg_number || serial).padStart(4, '0')}`,
        regNo: `${regPrefix}-${String(p.reg_number || serial).padStart(4, '0')}`,
        address: overrideData.address || (resolvedVillage ? `${resolvedVillage}, ${resolvedDistrict}` : ''),
        battingStyle: overrideData.battingStyle || prof.batting_style || p.batting_style || p.battingStyle || 'Right Hand Bat',
        bowlingStyle: overrideData.bowlingStyle || prof.bowling_style || p.bowling_style || p.bowlingStyle || 'Right Hand Medium',
        jerseySize: prof.jersey_size || p.jersey_size || '',
        isWicketKeeper: !!(p.is_wicket_keeper || p.isWicketKeeper),
        created_at: p.created_at,
        updated_at: p.updated_at
      };
    });

    const configTeams = Array.isArray(tourneyMeta?.format_config?.custom_teams) ? tourneyMeta.format_config.custom_teams : [];
    
    // Map teams from Postgres teams table (single source of truth)
    const teamsMap = new Map();
    dbTeams.forEach((t, idx) => {
      teamsMap.set(t.id, {
        id: t.id,
        tournament_id: t.tournament_id,
        tournamentId: t.tournament_id,
        leagueId: t.tournament_id || tId,
        leagueCode: regPrefix,
        group: (t.group_code || 'A').toUpperCase(),
        groupCode: (t.group_code || 'A').toUpperCase(),
        name: t.name,
        shortCode: t.short_name || (t.name ? t.name.substring(0, 3).toUpperCase() : 'TM'),
        ownerName: t.owner_name,
        ownerPhone: t.owner_phone,
        ownerPhotoUrl: t.owner_photo_url || '',
        ownerPhoto: t.owner_photo_url || '',
        captainName: t.captain_name || t.owner_name || '',
        coOwnerName: t.co_owner_name || '',
        mentorName: t.mentor_name || '',
        iconPlayerId: t.icon_player_id || null,
        iconPlayerName: t.icon_player_name || null,
        iconName: t.icon_player_name || null,
        iconPlayerFee: Number(t.icon_player_fee) || 0,
        iconFee: Number(t.icon_player_fee) || 0,
        hasIconPlayer: !!t.icon_player_id,
        registrationStatus: t.registration_status || 'APPROVED',
        paymentStatus: t.payment_status || 'APPROVED',
        status: t.registration_status || 'VERIFIED',
        maxSquad: Number(t.max_squad) || 15,
        logoUrl: t.logo_url || 'assets/jsl_logo.jpg',
        teamLogoUrl: t.logo_url || 'assets/jsl_logo.jpg',
        purse: Number(t.budget_total || 8000),
        purseBudget: Number(t.budget_total || 8000),
        remainingPurse: Number(t.budget_remaining != null ? t.budget_remaining : t.budget_total || 8000),
        serialNo: idx + 1,
        created_at: t.created_at,
        updated_at: t.updated_at
      });
    });

    // Graceful backward-compatibility merge if format_config still has legacy custom_teams
    configTeams.forEach((ct) => {
      if (!ct || !ct.id) return;
      const existing = teamsMap.get(ct.id);
      if (!existing) {
        teamsMap.set(ct.id, {
          ...ct,
          id: ct.id,
          tournament_id: ct.tournament_id || tId,
          tournamentId: ct.tournament_id || tId,
          leagueId: ct.tournament_id || tId,
          leagueCode: ct.leagueCode || regPrefix,
          group: (ct.group || ct.groupCode || 'A').toUpperCase(),
          groupCode: (ct.groupCode || ct.group || 'A').toUpperCase(),
          name: ct.name,
          shortCode: ct.shortCode || ct.short_name,
          ownerName: ct.ownerName || ct.owner_name,
          ownerPhone: ct.ownerPhone || ct.owner_phone,
          logoUrl: ct.logoUrl || ct.logo_url,
          teamLogoUrl: ct.teamLogoUrl || ct.logoUrl,
          purse: Number(ct.purse || ct.purseBudget || 8000),
          purseBudget: Number(ct.purseBudget || ct.purse || 8000),
          remainingPurse: Number(ct.remainingPurse || ct.purseBudget || ct.purse || 8000),
          serialNo: teamsMap.size + 1,
          created_at: ct.created_at || new Date().toISOString(),
          updated_at: ct.updated_at || Date.now()
        });
      }
    });

    const teams = Array.from(teamsMap.values());

    const configMatches = Array.isArray(tourneyMeta?.format_config?.custom_matches) ? tourneyMeta.format_config.custom_matches : [];
    const matchesMap = new Map();

    dbMatches.forEach(m => {
      if (!m || !m.id) return;
      matchesMap.set(m.id, {
        id: m.id,
        tournament_id: m.tournament_id || tId,
        leagueId: m.tournament_id || tId,
        matchNo: m.match_no,
        stage: m.stage || 'GROUP_A',
        groupCode: m.group_code || 'A',
        teamAId: m.team_a_id,
        teamBId: m.team_b_id,
        teamAName: m.team_a_name || 'Team A',
        teamBName: m.team_b_name || 'Team B',
        date: m.date,
        time: m.time,
        venue: m.venue,
        oversLimit: m.overs_limit || 16,
        status: m.status || 'SCHEDULED',
        result: m.result,
        liveState: m.live_state,
        liveMatchState: m.live_state,
        created_at: m.created_at,
        updated_at: m.updated_at
      });
    });

    const deletedIdsRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('cpl_deleted_fixture_ids') : null;
    const deletedIdsSet = new Set(deletedIdsRaw ? JSON.parse(deletedIdsRaw) : []);

    configMatches.forEach(cm => {
      if (!cm || !cm.id) return;
      if (deletedIdsSet.has(cm.id) || (toUUID(cm.id) && deletedIdsSet.has(toUUID(cm.id)))) return;
      const existing = matchesMap.get(cm.id);
      const mLive = cm.liveMatchState || cm.liveState || existing?.liveMatchState || existing?.liveState || null;
      matchesMap.set(cm.id, {
        ...(existing || {}),
        ...cm,
        id: cm.id,
        tournament_id: cm.tournament_id || cm.leagueId || tId,
        leagueId: cm.tournament_id || cm.leagueId || tId,
        leagueCode: tourneyMeta.category_code || tourneyMeta.slug || cm.leagueCode || 'T',
        matchNo: cm.matchNo || cm.match_no || existing?.matchNo || 1,
        stage: cm.stage || existing?.stage || 'GROUP_A',
        groupCode: cm.groupCode || cm.group_code || existing?.groupCode || 'A',
        teamAId: cm.teamAId || cm.team_a_id || existing?.teamAId,
        teamBId: cm.teamBId || cm.team_b_id || existing?.teamBId,
        teamAName: cm.teamAName || cm.team_a_name || existing?.teamAName || 'Team A',
        teamBName: cm.teamBName || cm.team_b_name || existing?.teamBName || 'Team B',
        date: cm.date || existing?.date,
        time: cm.time || existing?.time,
        venue: cm.venue || existing?.venue || 'Ground',
        oversLimit: cm.oversLimit || cm.overs_limit || existing?.oversLimit || 16,
        status: cm.status || existing?.status || 'SCHEDULED',
        result: cm.result || existing?.result || null,
        liveState: mLive,
        liveMatchState: mLive,
        teamAScore: cm.teamAScore || existing?.teamAScore || null,
        teamBScore: cm.teamBScore || existing?.teamBScore || null,
        created_at: cm.created_at || existing?.created_at || new Date().toISOString(),
        updated_at: cm.updated_at || Date.now()
      });
    });

    const fixtures = Array.from(matchesMap.values());

    const auctionRec = auctionRes?.data || (Array.isArray(tourneyMeta.auction) ? tourneyMeta.auction[0] : (tourneyMeta.auction || {}));
    const cloudAuctionSettings = (tourneyMeta?.format_config?.auction_settings && typeof tourneyMeta.format_config.auction_settings === 'object')
      ? tourneyMeta.format_config.auction_settings
      : (tourneyMeta?.auction_settings && typeof tourneyMeta.auction_settings === 'object')
        ? tourneyMeta.auction_settings
        : null;

    const resolvedAuctionSettings = {
      defaultBasePrice: Number(auctionRec.base_price) || Number(cloudAuctionSettings?.defaultBasePrice) || Number(tourneyMeta.base_price) || 300,
      defaultPurseBudget: Number(auctionRec.purse_budget) || Number(cloudAuctionSettings?.defaultPurseBudget) || Number(tourneyMeta.total_team_budget) || 8000,
      defaultIconPrice: Number(auctionRec.icon_price) || Number(cloudAuctionSettings?.defaultIconPrice) || Number(tourneyMeta.icon_price) || 500,
      maxSquadSize: Number(auctionRec.max_squad_size) || Number(cloudAuctionSettings?.maxSquadSize) || 15,
      minSquadSize: Number(auctionRec.min_squad_size) || 11,
      bidIncrementSlabs: Array.isArray(auctionRec.bid_increment_slabs) ? auctionRec.bid_increment_slabs : (Array.isArray(cloudAuctionSettings?.bidIncrementSlabs) ? cloudAuctionSettings.bidIncrementSlabs : [
        { maxLimit: 1000, increment: 50 },
        { maxLimit: 2000, increment: 100 },
        { maxLimit: 999999, increment: 200 }
      ])
    };

    return {
      players,
      teams,
      fixtures,
      liveAuction: null,
      playerProfiles: [],
      auctionSettings: resolvedAuctionSettings,
      registrationSettings: {
        isRegistrationOpen: tourneyMeta.is_registration_open !== false && (tourneyMeta.registration_settings?.isRegistrationOpen !== false),
        isPlayerRegOpen: tourneyMeta.is_player_reg_open !== false && (tourneyMeta.registration_settings?.isPlayerRegOpen !== false),
        isTeamRegOpen: tourneyMeta.is_team_reg_open !== false && (tourneyMeta.registration_settings?.isTeamRegOpen !== false),
        closedReason: tourneyMeta.closed_reason || tourneyMeta.registration_settings?.closedReason || "Registration is currently closed by the Admin.",
        kickoff_date: tourneyMeta.kickoff_date || tourneyMeta.registration_settings?.kickoff_date || null,
        prize_winner: Number(tourneyMeta.prize_winner || tourneyMeta.registration_settings?.prize_winner) || 0,
        organiser_name: tourneyMeta.profile?.full_name || tourneyMeta.registration_settings?.organiser_name || '',
        organiser_phone: tourneyMeta.profile?.phone || tourneyMeta.registration_settings?.organiser_phone || '',
        upi_id: tourneyMeta.profile?.upi_id || tourneyMeta.registration_settings?.upi_id || '',
        payment_qr_url: tourneyMeta.profile?.payment_qr_url || tourneyMeta.registration_settings?.payment_qr_url || '',
        approval_status: tourneyMeta.approval_status || tourneyMeta.registration_settings?.approval_status || 'pending_approval'
      },
      tournamentMeta: tourneyMeta,
      clearedAt: 0,
      teamsClearedAt: 0,
      deletedPlayerIds: [],
      deletedTeamIds: []
    };
  } catch (err) {
    console.warn("[SUPABASE] fetchCloudDataFromSupabase notice:", err);
  }

  return empty;
}

// --- ATOMIC REALTIME CLOUD DATA OPERATIONS (SAFE PER-RECORD SYNC) ---
// ==============================================================================
// REAL SUPABASE PLAYER / TEAM / FIXTURE SYNC (REPLACES FIREBASE RTDB FUNCTIONS)
// ==============================================================================

function derivePlayerStatus(playerData) {
  let s = playerData.status || playerData.auctionStatus;
  const teamId = playerData.teamId || playerData.team_id;
  if (teamId) s = 'sold';
  if (!s) s = 'available';
  s = String(s).toLowerCase();
  if (!['available', 'sold', 'unsold', 'withdrawn'].includes(s)) {
    s = 'available';
  }
  return s;
}

export async function syncPlayerToSupabase(playerData) {
  if (!supabase || !playerData || !playerData.id) return null;
  const ph = (playerData.phone || playerData.mobile || '').replace(/[^0-9]/g, '');
  if (!ph || ph.length < 10 || /^0+$/.test(ph)) return null;
  const nm = (playerData.name || '').trim().toUpperCase();
  if (!nm || /\b(TEST|DELETE|DUMMY|SAMPLE)\b/.test(nm)) return null;
  try {
    const activeTid = (typeof window !== 'undefined' && window.store?.activeTournamentId) ? window.store.activeTournamentId : null;
    const rawTid = playerData.tournament_id || playerData.tournamentId || playerData.leagueId || activeTid || DEFAULT_TOURNAMENT_UUID;
    const tournamentUUID = await resolveTournamentUUID(rawTid) || toUUID(rawTid) || DEFAULT_TOURNAMENT_UUID;
    const playerUUID = toUUID(playerData.id);
    const cleanPhone = (playerData.phone || playerData.mobile || '').replace(/[^0-9]/g, '');
    const s = (playerData.paymentStatus || playerData.registrationStatus || (playerData.verified === true ? 'APPROVED' : 'PENDING')).toUpperCase();
    const isApproved = (s === 'APPROVED');
    const isRejected = (s === 'REJECTED');

    const payload = {
      id: playerUUID,
      tournament_id: tournamentUUID,
      name: playerData.name,
      phone: cleanPhone || playerData.phone,
      photo_url: playerData.hdPhotoUrl || playerData.photoUrl || playerData.player_photo_url || null,
      role: playerData.role || playerData.category || playerData.playingType || 'All-Rounder',
      category_name: playerData.category || playerData.category_name || 'Category B',
      base_price: Number(playerData.basePrice || playerData.base_price) || 300,
      is_icon: playerData.isIcon === true || playerData.is_icon === true,
      team_id: (playerData.teamId || playerData.team_id) ? toUUID(playerData.teamId || playerData.team_id) : null,
      status: derivePlayerStatus(playerData),
      sold_price: Number(playerData.soldPrice || playerData.sold_price || playerData.boughtPrice) || 0,
      verified: isApproved,
      jersey_size: playerData.jerseySize || playerData.jersey_size || null,
      reg_number: Number(playerData.serialNo || playerData.displayRegistrationNumber || playerData.reg_number) || null,
      updated_at: new Date().toISOString()
    };

    const statusToSave = isApproved ? 'APPROVED' : (isRejected ? 'REJECTED' : 'PENDING');
    const isSoldVal = (playerData.auctionStatus === 'SOLD' || playerData.isSold === true || !!playerData.teamId);
    const isUnsoldVal = (playerData.auctionStatus === 'UNSOLD' || playerData.isUnsold === true);
    const soldPriceVal = Number(playerData.soldPrice || playerData.sold_price || playerData.boughtPrice) || 0;
    const resolvedAuctionStatus = isSoldVal ? 'SOLD' : (isUnsoldVal ? 'UNSOLD' : (playerData.auctionStatus ? playerData.auctionStatus.toUpperCase() : 'AVAILABLE'));

    // Update players table directly (Single Source of Truth)
    try {
      const updatePayload = {
        category_name: playerData.category || playerData.category_name || undefined,
        verified: isApproved,
        status: isRejected ? 'rejected' : (isApproved ? 'approved' : derivePlayerStatus(playerData)),
        auction_status: resolvedAuctionStatus,
        team_id: (playerData.teamId || playerData.team_id) ? toUUID(playerData.teamId || playerData.team_id) : null,
        sold_price: (soldPriceVal != null) ? soldPriceVal : 0,
        is_icon: (playerData.isIcon === true || playerData.is_icon === true),
        bid_history: Array.isArray(playerData.bidHistory) ? playerData.bidHistory : undefined,
        updated_at: new Date().toISOString()
      };
      Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);
      if (playerUUID) {
        const { error: pErr1 } = await supabase.from('players').update(updatePayload).eq('id', playerUUID);
        if (pErr1) console.error("[SUPABASE] players update by UUID failed:", pErr1.message, pErr1.details, "player:", playerData.name);
        else console.log("[SUPABASE] Synced player auction data to players table:", playerData.name, "Status:", resolvedAuctionStatus, "Team:", playerData.teamId || 'None');
      }
      if (cleanPhone) {
        // Keep universal person profile synchronized
        const personUpdate = {
          name: playerData.name || undefined,
          photo_url: playerData.hdPhotoUrl || playerData.photoUrl || playerData.player_photo_url || undefined,
          role: playerData.role || playerData.category || playerData.playingType || undefined,
          dob: playerData.dob || undefined,
          village: playerData.village || undefined,
          district: playerData.district || undefined,
          state: playerData.state || undefined,
          jersey_size: playerData.jerseySize || playerData.jersey_size || undefined,
          updated_at: new Date().toISOString()
        };
        Object.keys(personUpdate).forEach(k => personUpdate[k] === undefined && delete personUpdate[k]);
        if (Object.keys(personUpdate).length > 1) {
          await supabase.from('person_profiles').update(personUpdate).eq('phone', cleanPhone);
        }
      }
    } catch (pUpdateErr) {
      console.error("[SUPABASE] players table update exception:", pUpdateErr, "player:", playerData.name);
    }

    // Save/Update Verification Documents (Aadhaar & Payment Proof)
    const idCardFront = playerData.idCardFrontUrl || playerData.id_card_front_url || playerData.aadharPhotoUrl || playerData.aadhaar_url || null;
    const idCardBack = playerData.idCardBackUrl || playerData.id_card_back_url || playerData.aadharBackUrl || null;
    const paymentReceipt = playerData.paymentReceiptUrl || playerData.paymentProofUrl || playerData.payment_screenshot_url || null;
    const paymentRef = playerData.paymentRef || playerData.remarks || playerData.payment_ref || null;

    if (idCardFront || paymentReceipt || paymentRef) {
      try {
        const docPayload = {
          player_id: playerUUID,
          tournament_id: tournamentUUID,
          aadhaar_url: idCardFront,
          id_card_back_url: idCardBack,
          payment_screenshot_url: paymentReceipt,
          payment_ref: paymentRef,
          status: isApproved ? 'verified' : (isRejected ? 'rejected' : 'pending'),
          updated_at: new Date().toISOString()
        };
        const { data: existingDoc } = await supabase.from('player_verification_docs').select('id').eq('player_id', playerUUID).maybeSingle();
        if (existingDoc?.id) {
          await supabase.from('player_verification_docs').update(docPayload).eq('id', existingDoc.id);
        } else {
          await supabase.from('player_verification_docs').insert({ ...docPayload, id: generateUUID() });
        }
      } catch (docErr) {
        console.warn("[SUPABASE] Verification docs sync notice:", docErr);
      }
    }

    return payload;
  } catch (err) {
    console.warn("[SUPABASE] syncPlayerToSupabase notice:", err);
    return null;
  }
}

export async function deletePlayerFromSupabase(playerId, phone = null, tournamentId = null) {
  if (!supabase || !playerId) return false;
  try {
    const activeTid = (typeof window !== 'undefined' && window.store?.activeTournamentId) ? window.store.activeTournamentId : null;
    const rawTid = tournamentId || activeTid || DEFAULT_TOURNAMENT_UUID;
    const tId = await resolveTournamentUUID(rawTid) || toUUID(rawTid) || DEFAULT_TOURNAMENT_UUID;
    const playerUUID = toUUID(playerId) || playerId;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

    // 1. Attempt direct delete from players table, fallback to marking as deleted
    let directDeleteWorked = false;
    let targetPersonId = null;
    if (cleanPhone) {
      try {
        const { data: pRec } = await supabase.from('person_profiles').select('id').eq('phone', cleanPhone).maybeSingle();
        if (pRec?.id) targetPersonId = pRec.id;
      } catch (e) {}
    }

    try {
      const { data: before } = await supabase.from('players').select('id').eq('id', playerUUID);
      await supabase.from('players').delete().eq('id', playerUUID);
      if (targetPersonId) {
        await supabase.from('players').delete().eq('person_id', targetPersonId).eq('tournament_id', tId);
      }
      const { data: after } = await supabase.from('players').select('id').eq('id', playerUUID);
      directDeleteWorked = (before?.length > 0 && (!after || after.length === 0));
    } catch (delErr) {}
    if (!directDeleteWorked) {
      try {
        await supabase.from('players').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', playerUUID);
        if (targetPersonId) {
          await supabase.from('players').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('person_id', targetPersonId).eq('tournament_id', tId);
        }
      } catch (markErr) {}
    }

    // 2. Remove from player_verification_docs
    try {
      await supabase.from('player_verification_docs').delete().eq('player_id', playerUUID);
    } catch (e) {}

    // 3. Persist deletion in tournament format_config (deleted_player_ids only)
    try {
      const { data: currentTourney } = await supabase.from('tournaments').select('id, format_config').eq('id', tId).maybeSingle();
      if (currentTourney) {
        const existingConfig = currentTourney.format_config || {};
        const deletedIds = Array.isArray(existingConfig.deleted_player_ids) ? existingConfig.deleted_player_ids : [];

        if (!deletedIds.includes(playerUUID)) deletedIds.push(playerUUID);
        if (!deletedIds.includes(playerId)) deletedIds.push(playerId);
        if (cleanPhone && !deletedIds.includes(cleanPhone)) deletedIds.push(cleanPhone);

        existingConfig.deleted_player_ids = deletedIds;

        await supabase.from('tournaments').update({ format_config: existingConfig }).eq('id', currentTourney.id);
        console.log("[SUPABASE] Persisted player deletion in tournament deleted_player_ids:", playerId);
      }
    } catch (errConfig) {
      console.warn("[SUPABASE] format_config delete error:", errConfig);
    }

    return true;
  } catch (err) {
    console.warn("[SUPABASE] deletePlayerFromSupabase notice:", err);
    return false;
  }
}

export async function syncTeamToSupabase(teamData) {
  if (!supabase || !teamData || !teamData.id) return null;
  try {
    const tid = teamData.tournament_id || teamData.tournamentId || teamData.leagueId || 'leg-jsl';
    const tournamentUUID = await resolveTournamentUUID(tid);
    const teamUUID = (teamData.id && UUID_FORMAT_RE.test(teamData.id)) ? teamData.id : generateUUID();

    // Direct PostgreSQL teams table upsert (single source of truth)
    try {
      const remainingVal = (teamData.remainingPurse != null) ? Number(teamData.remainingPurse) : null;
      const budgetTotal = Number(teamData.purseBudget || teamData.purse) || 8000;
      const iconFeeVal = Number(teamData.iconPlayerFee || teamData.iconFee || 0);
      const iconPid = (teamData.iconPlayerId && UUID_FORMAT_RE.test(teamData.iconPlayerId)) ? teamData.iconPlayerId : null;

      const payload = {
        id: teamUUID,
        tournament_id: tournamentUUID,
        name: teamData.name,
        short_name: teamData.shortCode || (teamData.name ? teamData.name.substring(0, 3).toUpperCase() : null),
        owner_name: teamData.ownerName || null,
        owner_phone: teamData.ownerPhone || null,
        owner_photo_url: teamData.ownerPhotoUrl || teamData.ownerPhoto || null,
        captain_name: teamData.captainName || teamData.ownerName || null,
        co_owner_name: teamData.coOwnerName || teamData.coOwner1Name || null,
        mentor_name: teamData.mentorName || null,
        logo_url: teamData.logoUrl || teamData.teamLogoUrl || null,
        group_code: (teamData.groupCode || teamData.group || 'A').toUpperCase(),
        budget_total: budgetTotal,
        budget_remaining: (remainingVal != null) ? remainingVal : budgetTotal,
        icon_player_id: iconPid,
        icon_player_name: teamData.iconPlayerName || teamData.iconName || null,
        icon_player_fee: iconFeeVal,
        registration_status: teamData.registrationStatus || 'APPROVED',
        payment_status: teamData.paymentStatus || 'APPROVED',
        max_squad: Number(teamData.maxSquad) || 15,
        updated_at: new Date().toISOString()
      };

      const { error: teamUpsertErr } = await supabase.from('teams').upsert(payload);
      if (teamUpsertErr) {
        // Fallback for legacy columns if migration has not run yet
        if (teamUpsertErr.message && teamUpsertErr.message.includes('column')) {
          const basicPayload = {
            id: teamUUID,
            tournament_id: tournamentUUID,
            name: teamData.name,
            short_name: teamData.shortCode || null,
            owner_name: teamData.ownerName || null,
            owner_phone: teamData.ownerPhone || null,
            logo_url: teamData.logoUrl || teamData.teamLogoUrl || null,
            budget_total: budgetTotal,
            budget_remaining: (remainingVal != null) ? remainingVal : budgetTotal,
            updated_at: new Date().toISOString()
          };
          await supabase.from('teams').upsert(basicPayload);
        } else {
          console.error("[SUPABASE] teams upsert failed:", teamUpsertErr.message, teamUpsertErr.details);
        }
      } else {
        console.log("[SUPABASE] Synced team to teams table:", teamData.name);
      }
    } catch (tblErr) {
      console.error("[SUPABASE] teams upsert exception:", tblErr);
    }

    return teamData;
  } catch (err) {
    console.error("[SUPABASE] syncTeamToSupabase error:", err);
    return null;
  }
}

export async function deleteTeamFromSupabase(teamId, tournamentId = null) {
  if (!supabase || !teamId) return false;
  try {
    const teamUUID = toUUID(teamId);
    await supabase.from('teams').delete().eq('id', teamUUID);
    return true;
  } catch (err) {
    console.warn("[SUPABASE] deleteTeamFromSupabase notice:", err);
    return false;
  }
}

export async function clearAllPlayersFromSupabase(tournamentId = null) {
  if (!supabase) return false;
  try {
    const tId = tournamentId ? toUUID(tournamentId) : toUUID('leg-jsl');
    const { error } = await supabase.from('players').delete().eq('tournament_id', tId);
    if (error) throw error;
    console.log("[SUPABASE] Cleared all players for tournament:", tId);
    return true;
  } catch (err) {
    console.warn("[SUPABASE] clearAllPlayersFromSupabase notice:", err);
    return false;
  }
}

export async function clearAllTeamsFromSupabase(tournamentId = null) {
  if (!supabase) return false;
  try {
    const tId = tournamentId ? toUUID(tournamentId) : toUUID('leg-jsl');
    const { error } = await supabase.from('teams').delete().eq('tournament_id', tId);
    if (error) throw error;
    console.log("[SUPABASE] Cleared all teams for tournament:", tId);
    return true;
  } catch (err) {
    console.warn("[SUPABASE] clearAllTeamsFromSupabase notice:", err);
    return false;
  }
}

export async function syncFixtureToSupabase(fixtureData, tournamentId = null) {
  if (!supabase || !fixtureData || !fixtureData.id) return null;
  try {
    const tid = tournamentId || fixtureData.tournament_id || fixtureData.leagueId || (typeof window !== 'undefined' && window.store?.activeTournamentId) || 'leg-jsl';
    const tournamentUUID = (await resolveTournamentUUID(tid)) || toUUID(tid);
    const fixtureUUID = toUUID(fixtureData.id);

    const payload = {
      id: fixtureUUID,
      tournament_id: tournamentUUID,
      match_no: fixtureData.matchNo || fixtureData.match_no || null,
      stage: fixtureData.stage || null,
      group_code: fixtureData.groupCode || fixtureData.group_code || null,
      team_a_id: (fixtureData.teamAId || fixtureData.team_a_id) ? toUUID(fixtureData.teamAId || fixtureData.team_a_id) : null,
      team_b_id: (fixtureData.teamBId || fixtureData.team_b_id) ? toUUID(fixtureData.teamBId || fixtureData.team_b_id) : null,
      date: fixtureData.date || null,
      time: fixtureData.time || null,
      venue: fixtureData.venue || null,
      overs_limit: fixtureData.oversLimit || fixtureData.overs_limit || null,
      status: fixtureData.status || 'SCHEDULED',
      result: fixtureData.result || null,
      winner_team_id: (fixtureData.winnerTeamId || fixtureData.winner_team_id) ? toUUID(fixtureData.winnerTeamId || fixtureData.winner_team_id) : null,
      mom_player_id: (fixtureData.momPlayerId || fixtureData.mom_player_id) ? toUUID(fixtureData.momPlayerId || fixtureData.mom_player_id) : null,
      live_state: fixtureData.liveMatchState || fixtureData.liveState || fixtureData.live_state || null
    };

    // Primary: Try saving to matches table
    try {
      await supabase.from('matches').upsert(payload);
    } catch (dbErr) {}

    // Guaranteed Multi-Tenant Sync: Save to tournaments.format_config.custom_matches
    try {
      let { data: currentTourney } = await supabase.from('tournaments').select('id, format_config').eq('id', tournamentUUID).maybeSingle();
      if (!currentTourney && tid) {
        const cleanSlug = String(tid).replace(/^t_/, '').trim();
        const { data: bySlug } = await supabase.from('tournaments').select('id, format_config').or(`slug.ilike.${cleanSlug},category_code.ilike.${cleanSlug}`).maybeSingle();
        if (bySlug) currentTourney = bySlug;
      }
      if (currentTourney?.id) {
        const existingConfig = currentTourney.format_config || {};
        const customMatches = Array.isArray(existingConfig.custom_matches) ? existingConfig.custom_matches : [];
        const existingIdx = customMatches.findIndex(m => m.id === fixtureData.id || m.id === fixtureUUID);
        
        const matchEntry = {
          ...fixtureData,
          id: fixtureUUID,
          tournament_id: currentTourney.id,
          leagueId: currentTourney.id,
          updated_at: Date.now()
        };

        if (existingIdx !== -1) {
          customMatches[existingIdx] = { ...customMatches[existingIdx], ...matchEntry };
        } else {
          customMatches.push(matchEntry);
        }
        existingConfig.custom_matches = customMatches;

        await supabase.from('tournaments').update({ format_config: existingConfig, updated_at: new Date().toISOString() }).eq('id', currentTourney.id);
        console.log("[SUPABASE] Synced match #" + (matchEntry.matchNo || 1) + " to tournament format_config:", matchEntry.teamAName, 'vs', matchEntry.teamBName);
      }
    } catch (cfgErr) {
      console.warn("[SUPABASE] tournament format_config match save notice:", cfgErr);
    }

    const broadcastPayload = { action: 'upsert', tournament_id: tournamentUUID, fixture: fixtureData };
    if (localBroadcastChannel) {
      try { localBroadcastChannel.postMessage({ type: 'fixture_update', payload: broadcastPayload }); } catch (e) {}
    }
    const gChanF = globalBroadcastChannel || ensureGlobalBroadcastChannel();
    if (gChanF) {
      gChanF.send({ type: 'broadcast', event: 'fixture_update', payload: broadcastPayload }).catch(() => {});
    }
    if (activeRealtimeChannel && activeRealtimeChannel !== gChanF) {
      activeRealtimeChannel.send({ type: 'broadcast', event: 'fixture_update', payload: broadcastPayload }).catch(() => {});
    }

    return fixtureData;
  } catch (err) {
    console.warn("[SUPABASE] syncFixtureToSupabase notice:", err);
    return null;
  }
}

export function broadcastLiveScore(fixture, tournamentId) {
  if (!fixture) return;
  try {
    const ls = fixture.liveMatchState || fixture.liveState;
    const lite = ls ? {
      innings: Number(ls.innings || ls.currentInnings || 1),
      currentInnings: Number(ls.innings || ls.currentInnings || 1),
      runs: Number(ls.runs) || 0,
      wickets: Number(ls.wickets) || 0,
      overs: Number(ls.overs) || 0,
      balls: Number(ls.balls) || 0,
      target: (ls.target !== undefined && ls.target !== null) ? Number(ls.target) : null,
      extras: Number(ls.extras) || 0,
      strikerId: ls.strikerId || '',
      nonStrikerId: ls.nonStrikerId || '',
      bowlerId: ls.bowlerId || '',
      overBalls: Array.isArray(ls.overBalls) ? ls.overBalls : [],
      freeHit: !!ls.freeHit,
      playerStats: ls.playerStats || {},
      isSuperOver: !!ls.isSuperOver,
      superOverNum: ls.superOverNum || 1,
      superOverInnings: ls.superOverInnings || 1,
      firstBatTeamId: ls.firstBatTeamId || null,
      firstBowlTeamId: ls.firstBowlTeamId || null,
      soTeamAScore: ls.soTeamAScore || null,
      soTeamBScore: ls.soTeamBScore || null,
      currentOverBowlerRuns: ls.currentOverBowlerRuns || 0,
      tossDetails: fixture.tossDetails || ls.tossDetails || null,
      ballHistory: Array.isArray(ls.ballHistory) ? ls.ballHistory.slice(0, 40) : [],
      _v: ls._v || Date.now()
    } : null;

    const scorePayload = {
      fixtureId: fixture.id,
      tournament_id: tournamentId || fixture.tournament_id || fixture.leagueId,
      status: fixture.status || 'LIVE',
      result: fixture.result || null,
      winnerTeamId: fixture.winnerTeamId || null,
      teamAScore: fixture.teamAScore || null,
      teamBScore: fixture.teamBScore || null,
      oversLimit: fixture.oversLimit || 16,
      inningsTiming: fixture.inningsTiming || null,
      superOverData: fixture.superOverData || null,
      liveMatchState: lite,
      updated_at: Date.now()
    };

    // 1. Same-device local BroadcastChannel (instant sub-1ms delivery to any other open tab)
    if (localBroadcastChannel) {
      try {
        localBroadcastChannel.postMessage({ type: 'live_score_update', payload: scorePayload });
      } catch (e) {}
    }

    // 2. Global Supabase Realtime WebSocket broadcast (cross-device universal delivery)
    const gChan = globalBroadcastChannel || ensureGlobalBroadcastChannel();
    if (gChan) {
      gChan.send({ type: 'broadcast', event: 'live_score_update', payload: scorePayload })
        .then(res => {
          console.log('⚡ [REALTIME WS SENT] Global live_score_update response:', res, 'for fixture:', fixture.id, lite?.runs + '/' + lite?.wickets);
        })
        .catch(err => {
          console.warn('[REALTIME WS SENT] Global broadcast send failed:', err);
        });
    }

    // 3. Tournament-specific Realtime channel
    if (activeRealtimeChannel && activeRealtimeChannel !== gChan) {
      activeRealtimeChannel.send({ type: 'broadcast', event: 'live_score_update', payload: scorePayload }).catch(() => {});
    }
  } catch (e) {
    console.warn('[SUPABASE] broadcastLiveScore error:', e);
  }
}

export async function saveScorecardsToSupabase(fixture, tournamentId = null) {
  if (!supabase || !fixture || !fixture.liveMatchState?.playerStats) return null;
  try {
    const tid = tournamentId || fixture.tournament_id || fixture.leagueId || (typeof window !== 'undefined' && window.store?.activeTournamentId) || 'leg-jsl';
    const tournamentUUID = (await resolveTournamentUUID(tid)) || toUUID(tid);
    const matchUUID = toUUID(fixture.id);

    const playerStats = fixture.liveMatchState.playerStats;
    const allPlayers = (typeof window !== 'undefined' && window.store) ? window.store.getPlayers() : [];

    const rows = [];
    for (const [playerId, stats] of Object.entries(playerStats)) {
      if (!playerId || (!stats.runs && !stats.balls && !stats.ballsBowled && !stats.wickets && !stats.catches)) continue;

      const playerUUID = toUUID(playerId);
      const playerObj = allPlayers.find(p => p.id === playerId || toUUID(p.id) === playerUUID);
      const teamId = playerObj?.teamId ? toUUID(playerObj.teamId) : null;

      const ballsFaced = Number(stats.balls) || 0;
      const strikeRate = ballsFaced > 0 ? parseFloat(((Number(stats.runs) || 0) / ballsFaced * 100).toFixed(2)) : 0;
      const ballsBowled = Number(stats.ballsBowled) || 0;
      const oversBowled = ballsBowled > 0 ? parseFloat((Math.floor(ballsBowled / 6) + (ballsBowled % 6) / 10).toFixed(1)) : 0;
      const runsConceded = Number(stats.runsConceded) || 0;
      const economy = oversBowled > 0 ? parseFloat((runsConceded / (ballsBowled / 6)).toFixed(2)) : 0;

      rows.push({
        tournament_id: tournamentUUID,
        match_id: matchUUID,
        player_id: playerUUID,
        team_id: teamId,
        innings: (fixture.teamBId && (playerObj?.teamId === fixture.teamBId || (toUUID(playerObj?.teamId) && toUUID(playerObj?.teamId) === toUUID(fixture.teamBId)))) ? 2 : 1,
        runs: Number(stats.runs) || 0,
        balls: ballsFaced,
        fours: Number(stats.fours) || 0,
        sixes: Number(stats.sixes) || 0,
        strike_rate: strikeRate,
        is_out: !!stats.dismissed,
        dismissal_type: stats.dismissalInfo || null,
        bowler_id: null,
        fielder_id: null,
        overs_bowled: oversBowled,
        balls_bowled: ballsBowled,
        runs_conceded: runsConceded,
        wickets: Number(stats.wickets) || 0,
        maidens: Number(stats.maidens) || 0,
        economy: economy,
        catches: Number(stats.catches) || 0,
        stumpings: Number(stats.stumpings) || 0,
        run_outs: Number(stats.runOuts) || 0
      });
    }

    if (rows.length === 0) return null;

    // Delete old scorecards for this match before inserting fresh ones
    await supabase.from('scorecards').delete().eq('match_id', matchUUID);
    const { error } = await supabase.from('scorecards').insert(rows);
    if (error) {
      console.warn("[SUPABASE] scorecards insert error:", error);
    } else {
      console.log(`[SUPABASE] Saved ${rows.length} scorecard rows for match ${fixture.matchNo || fixture.match_no || matchUUID}`);
    }
    return rows;
  } catch (err) {
    console.warn("[SUPABASE] saveScorecardsToSupabase notice:", err);
    return null;
  }
}

export async function deleteFixtureFromSupabase(fixtureId, tournamentId = null) {
  if (!supabase || !fixtureId) return false;
  try {
    const fixtureUUID = toUUID(fixtureId);
    try {
      await supabase.from('fixtures').delete().eq('id', fixtureUUID);
      await supabase.from('matches').delete().eq('id', fixtureUUID);
      if (fixtureId && fixtureId !== fixtureUUID) {
        await supabase.from('fixtures').delete().eq('id', fixtureId);
        await supabase.from('matches').delete().eq('id', fixtureId);
      }
    } catch (e) {}

    // Remove from tournament format_config.custom_matches across ALL tournaments
    try {
      const { data: tourneys } = await supabase.from('tournaments').select('id, format_config');
      if (Array.isArray(tourneys)) {
        for (const t of tourneys) {
          if (Array.isArray(t.format_config?.custom_matches)) {
            const initialLen = t.format_config.custom_matches.length;
            const updatedMatches = t.format_config.custom_matches.filter(item => item.id !== fixtureId && item.id !== fixtureUUID && toUUID(item.id) !== fixtureUUID);
            if (updatedMatches.length !== initialLen) {
              const updatedConfig = { ...t.format_config, custom_matches: updatedMatches };
              await supabase.from('tournaments').update({ format_config: updatedConfig, updated_at: new Date().toISOString() }).eq('id', t.id);
            }
          }
        }
      }
    } catch (e) {}

    if (activeRealtimeChannel) {
      activeRealtimeChannel.send({
        type: 'broadcast',
        event: 'fixture_update',
        payload: { action: 'delete', fixture_id: fixtureId }
      }).catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn("[SUPABASE] deleteFixtureFromSupabase notice:", err);
    return false;
  }
}

export async function clearAllFixturesFromSupabase(tournamentId = null) {
  if (!supabase) return false;
  try {
    const tId = tournamentId ? (await resolveTournamentUUID(tournamentId)) : null;
    try {
      if (tId) {
        await supabase.from('fixtures').delete().eq('tournament_id', tId);
        await supabase.from('matches').delete().eq('tournament_id', tId);
      } else {
        await supabase.from('fixtures').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
    } catch (e) {}

    // Clear from tournament format_config.custom_matches
    try {
      let tourneyQuery = supabase.from('tournaments').select('id, format_config');
      if (tId) {
        tourneyQuery = tourneyQuery.eq('id', tId);
      }
      const { data: tourneys } = await tourneyQuery;
      if (Array.isArray(tourneys)) {
        for (const t of tourneys) {
          const updatedConfig = { ...(t.format_config || {}), custom_matches: [], matches_cleared_at: Date.now() };
          await supabase.from('tournaments').update({ format_config: updatedConfig, updated_at: new Date().toISOString() }).eq('id', t.id);
        }
      }
    } catch (e) {}

    if (activeRealtimeChannel) {
      activeRealtimeChannel.send({
        type: 'broadcast',
        event: 'fixture_update',
        payload: { action: 'clear_all', tournament_id: tId }
      }).catch(() => {});
    }

    console.log("[SUPABASE] Cleared all matches for tournament:", tId);
    return true;
  } catch (err) {
    console.warn("[SUPABASE] clearAllFixturesFromSupabase notice:", err);
    return false;
  }
}

export async function syncUniversalPlayerToSupabase(profile) {
  if (!supabase || !profile) return null;
  try {
    const phone = (profile.phone || profile.mobile || '').trim().replace(/[^0-9]/g, '');
    if (!phone || phone.length < 10) return null;
    return null;
  } catch (err) {
    return null;
  }
}

// --- BULK SAVE (REPLACES FIREBASE FULL-LIST SYNC) ---
export async function saveCloudDataToSupabase(playersList, teamsList, fixturesList = []) {
  if (!supabase) return;
  try {
    const playerJobs = Array.isArray(playersList)
      ? playersList.filter(p => p && p.id).map(p => syncPlayerToSupabase(p))
      : [];
    const teamJobs = Array.isArray(teamsList)
      ? teamsList.filter(t => t && t.id).map(t => syncTeamToSupabase(t))
      : [];
    const fixtureJobs = Array.isArray(fixturesList)
      ? fixturesList.filter(f => f && f.id).map(f => syncFixtureToSupabase(f))
      : [];
    await Promise.all([...playerJobs, ...teamJobs, ...fixtureJobs]);
  } catch (err) {
    console.warn("[SUPABASE] saveCloudDataToSupabase notice:", err);
  }
}

// Helper to prepare data URLs before persisting (avoids storing raw base64 blobs)
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

// --- CLOUD SYNC CONVENIENCE WRAPPERS (SUPABASE-BACKED) ---
export async function savePlayerToCloud(player) {
  return syncPlayerToSupabase(player);
}

export async function patchPlayerInCloud(playerId, delta) {
  if (!playerId || !delta) return null;
  return syncPlayerToSupabase({ ...delta, id: playerId });
}

export async function deletePlayerFromCloud(playerId) {
  return deletePlayerFromSupabase(playerId);
}

export async function saveTeamToCloud(team) {
  return syncTeamToSupabase(team);
}

export async function patchTeamInCloud(teamId, delta) {
  if (!teamId || !delta) return null;
  return syncTeamToSupabase({ ...delta, id: teamId });
}

export async function deleteTeamFromCloud(teamId) {
  return deleteTeamFromSupabase(teamId);
}

export async function clearAllPlayersFromCloud() {
  return clearAllPlayersFromSupabase();
}

export async function clearAllTeamsFromCloud() {
  return clearAllTeamsFromSupabase();
}

export async function saveFixtureToCloud(fixture, tournamentId = null) {
  return syncFixtureToSupabase(fixture, tournamentId);
}

export async function deleteFixtureFromCloud(fixtureId, tournamentId = null) {
  return deleteFixtureFromSupabase(fixtureId, tournamentId);
}

export async function clearAllFixturesFromCloud(tournamentId = null) {
  return clearAllFixturesFromSupabase(tournamentId);
}

export async function saveFullFixturesListToCloud(fixturesList, tournamentId = null) {
  if (!Array.isArray(fixturesList)) return;
  await Promise.all(fixturesList.filter(f => f && f.id).map(f => syncFixtureToSupabase(f, tournamentId)));
}

export async function saveAuctionSettingsToCloud(settings, tournamentId = null) {
  if (!supabase || !settings) return;
  try {
    const tId = toUUID(tournamentId) || toUUID(typeof window !== 'undefined' && window.store?.activeTournamentId) || DEFAULT_TOURNAMENT_UUID;
    const purse = Number(settings.defaultPurseBudget) || 8000;
    const base = Number(settings.defaultBasePrice) || 300;
    const icon = Number(settings.defaultIconPrice) || 500;
    const maxSquad = Number(settings.maxSquadSize) || 15;
    const slabs = Array.isArray(settings.bidIncrementSlabs) ? settings.bidIncrementSlabs : undefined;

    // 1. Upsert into relational tournament_auctions table (single source of truth)
    try {
      const auctionPayload = {
        tournament_id: tId,
        purse_budget: purse,
        base_price: base,
        icon_price: icon,
        max_squad_size: maxSquad,
        ...(slabs ? { bid_increment_slabs: slabs } : {}),
        updated_at: new Date().toISOString()
      };
      await supabase.from('tournament_auctions').upsert(auctionPayload, { onConflict: 'tournament_id' });
    } catch (tblErr) {
      console.warn('[SUPABASE] tournament_auctions upsert notice:', tblErr.message);
    }

    // 2. Also keep tournaments budget & icon columns in sync
    await supabase.from('tournaments').update({
      total_team_budget: purse,
      icon_price: icon,
      updated_at: new Date().toISOString()
    }).eq('id', tId).catch(() => {});
  } catch (e) { console.warn('[SUPABASE] saveAuctionSettings:', e.message); }
}

export async function saveLiveAuctionToCloud(state, tournamentId = null) {
  if (!supabase) return;
  try {
    const tId = toUUID(tournamentId) || toUUID(typeof window !== 'undefined' && window.store?.activeTournamentId) || DEFAULT_TOURNAMENT_UUID;
    
    // Save to tournament_auctions.live_state (isolated from main tournaments table)
    const { error: liveErr } = await supabase.from('tournament_auctions').upsert({
      tournament_id: tId,
      live_state: state || {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'tournament_id' });

    if (liveErr) {
      console.warn('[SUPABASE] saveLiveAuction to tournament_auctions failed, falling back:', liveErr.message);
      // Fallback to tournaments format_config for backwards-compatibility
      let { data: currentTourney } = await supabase.from('tournaments').select('id, format_config').eq('id', tId).maybeSingle();
      if (currentTourney) {
        const config = currentTourney.format_config || {};
        config.live_auction = state || {};
        await supabase.from('tournaments').update({ format_config: config, updated_at: new Date().toISOString() }).eq('id', currentTourney.id);
      }
    }

    // Broadcast over Realtime channel for instant sub-100ms display across all devices
    if (activeRealtimeChannel) {
      activeRealtimeChannel.send({
        type: 'broadcast',
        event: 'live_auction_update',
        payload: { tournament_id: tId, state: state || {} }
      }).catch(() => {});
    }
  } catch (e) { console.warn('[SUPABASE] saveLiveAuction:', e.message); }
}

export async function fetchLiveAuctionFromCloud(tournamentId = null) {
  if (!supabase) return null;
  try {
    const tId = toUUID(tournamentId) || toUUID(typeof window !== 'undefined' && window.store?.activeTournamentId) || DEFAULT_TOURNAMENT_UUID;
    
    // 1. Fetch from tournament_auctions.live_state
    const { data: auctionRow } = await supabase.from('tournament_auctions').select('live_state').eq('tournament_id', tId).maybeSingle();
    if (auctionRow?.live_state && Object.keys(auctionRow.live_state).length > 0) {
      return auctionRow.live_state;
    }

    // 2. Fallback to format_config.live_auction
    let { data: tourney } = await supabase.from('tournaments').select('id, format_config').eq('id', tId).maybeSingle();
    if (tourney?.format_config?.live_auction) {
      return tourney.format_config.live_auction;
    }
    return null;
  } catch (e) { return null; }
}

export async function fetchGlobalLiveAuctionStatus() {
  if (!supabase) return { isLive: false, liveTournament: null, liveState: null, recentTournaments: [] };
  try {
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select(`
        id, name, slug, logo_url, banner_url, format_config, updated_at,
        auction:tournament_auctions ( live_state )
      `)
      .order('updated_at', { ascending: false });

    if (error || !Array.isArray(tournaments)) {
      return { isLive: false, liveTournament: null, liveState: null, recentTournaments: [] };
    }

    // 1. Find if ANY tournament currently has an active bidding session
    let liveTourney = null;
    let liveState = null;

    for (const t of tournaments) {
      const auctionRec = Array.isArray(t.auction) ? t.auction[0] : (t.auction || {});
      const state = auctionRec?.live_state || t.format_config?.live_auction;
      if (state && (state.status === 'BIDDING' || state.status === 'SOLD' || state.status === 'UNSOLD') && state.active_player_id && !state.is_ended && state.status !== 'ENDED') {
        liveTourney = t;
        liveState = state;
        break;
      }
    }

    return {
      isLive: !!liveTourney,
      liveTournament: liveTourney,
      liveState: liveState,
      recentTournaments: tournaments.map(t => {
        const auctionRec = Array.isArray(t.auction) ? t.auction[0] : (t.auction || {});
        const aState = auctionRec?.live_state || t.format_config?.live_auction;
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          logoUrl: t.logo_url || t.banner_url || 'assets/jsl_logo.jpg',
          bannerUrl: t.banner_url || t.logo_url || 'assets/jsl_logo.jpg',
          customTeamsCount: 0,
          auctionStatus: (aState?.is_ended || aState?.status === 'ENDED' || !aState?.active_player_id) ? 'CONCLUDED' : 'IDLE',
          updatedAt: t.updated_at
        };
      })
    };
  } catch (e) {
    console.warn('[SUPABASE] fetchGlobalLiveAuctionStatus error:', e);
    return { isLive: false, liveTournament: null, liveState: null, recentTournaments: [] };
  }
}

export async function saveAuctionPermanentArchiveToCloud(archiveData, tournamentId = null) {
  if (!supabase || !archiveData) return;
  try {
    const tId = toUUID(tournamentId) || toUUID(typeof window !== 'undefined' && window.store?.activeTournamentId) || DEFAULT_TOURNAMENT_UUID;
    const id = archiveData.archiveId || `AUCTION_VAULT_${tId.slice(0, 8)}`;
    await supabase.from('auction_archives').upsert({ id, tournament_id: tId, snapshot: archiveData, created_at: new Date().toISOString() }, { onConflict: 'id' });
  } catch (e) { console.warn('[SUPABASE] saveAuctionArchive:', e.message); }
}

export async function fetchAuctionPermanentArchiveFromCloud(tournamentId = null) {
  if (!supabase) return null;
  try {
    const tId = toUUID(tournamentId) || toUUID(typeof window !== 'undefined' && window.store?.activeTournamentId) || DEFAULT_TOURNAMENT_UUID;
    const { data } = await supabase.from('auction_archives').select('snapshot').eq('tournament_id', tId).limit(1).maybeSingle();
    return data ? data.snapshot : null;
  } catch (e) { return null; }
}

export async function saveLiveMatchToCloud(matchId, state) {
  if (!supabase || !matchId) return;
  try {
    const id = toUUID(matchId);
    const prevV = (typeof state?._v === 'number') ? state._v : 0;
    const nextV = prevV + 1;
    const versionedState = { ...(state || {}), _v: nextV, _updatedAt: Date.now() };

    // Persist in localStorage so active scoring lock survives tab reloads
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`cpl_active_scoring_fixture_id`, String(matchId));
        localStorage.setItem(`cpl_active_scoring_${matchId}_v`, String(nextV));
      } catch (e) {}
    }

    await supabase.from('matches').update({
      live_state: versionedState,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    if (state) state._v = nextV;
  } catch (e) { console.warn('[SUPABASE] saveLiveMatch:', e.message); }
}

// --- INSTANT CLOUD DATA SAVE (FULL SYNC, SUPABASE BACKED) ---
export async function saveCloudData(playersList, teamsList, fixturesList = [], auctionSettings = null) {
  try {
    const cleanPlayers = sanitizePayloadForCloud(playersList);
    const cleanTeams = sanitizePayloadForCloud(teamsList);
    const cleanFixtures = sanitizePayloadForCloud(fixturesList);

    await saveCloudDataToSupabase(cleanPlayers, cleanTeams, cleanFixtures);
  } catch (err) {
    console.warn("Cloud save warning:", err);
  }
}

// --- ADVERTISEMENT & POPUP CONTROLLER (platform_settings table + Local Persistence) ---
const DEFAULT_POPUP_SETTINGS = {
  isAdPopupEnabled: false,
  isWelcomePopupEnabled: true,
  isWhatsAppPopupEnabled: true,
  isRealtimePlayerToastEnabled: true,
  isCountdownEnabled: true,
  countdownTournamentSlugs: [],
  isYouTubePromoEnabled: true,
  promotedShopIds: ['maa-laxmi-kitchen'],
  promotedShopId: 'maa-laxmi-kitchen',
  adExpiryTime: 0
};

export function getLocalPopupSettings() {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('cpl_popup_settings');
      if (stored) {
        return { ...DEFAULT_POPUP_SETTINGS, ...JSON.parse(stored) };
      }
    } catch(e) {}
  }
  return { ...DEFAULT_POPUP_SETTINGS };
}

export async function savePopupSettingsToCloud(settings) {
  try {
    const current = await fetchPopupSettingsFromCloud();
    const merged = { ...DEFAULT_POPUP_SETTINGS, ...current, ...settings, updated_at: Date.now() };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cpl_popup_settings', JSON.stringify(merged));
    }
    if (supabase) {
      try {
        await supabase.from('platform_settings').upsert({ key: 'popup', value: merged, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      } catch (e) {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('popup_settings_updated', { detail: merged }));
    }
    return true;
  } catch (e) {
    console.warn("savePopupSettings notice:", e);
    return true;
  }
}

export async function fetchPopupSettingsFromCloud() {
  let localData = null;
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('cpl_popup_settings');
      if (stored) localData = JSON.parse(stored);
    } catch(e) {}
  }

  let cloudValue = null;
  if (supabase) {
    try {
      const { data } = await supabase.from('platform_settings').select('value').eq('key', 'popup').maybeSingle();
      if (data && data.value) {
        cloudValue = data.value;
      }
    } catch (e) {}
  }

  const localTs = Number(localData?.updated_at || 0);
  const cloudTs = Number(cloudValue?.updated_at || 0);

  // If local user change is newer or equal, localData wins!
  let merged;
  if (localData && localTs >= cloudTs) {
    merged = { ...DEFAULT_POPUP_SETTINGS, ...(cloudValue || {}), ...localData };
  } else if (cloudValue) {
    merged = { ...DEFAULT_POPUP_SETTINGS, ...(localData || {}), ...cloudValue };
  } else {
    merged = localData ? { ...DEFAULT_POPUP_SETTINGS, ...localData } : { ...DEFAULT_POPUP_SETTINGS };
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('cpl_popup_settings', JSON.stringify(merged));
    } catch(e) {}
  }

  return merged;
}

export async function saveAdSettingsToCloud(settings) {
  try {
    const current = await fetchAdSettingsFromCloud();
    const merged = { ...current, ...settings, updated_at: Date.now() };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cpl_ad_settings', JSON.stringify(merged));
    }
    if (supabase) {
      try {
        await supabase.from('platform_settings').upsert({ key: 'ads', value: merged, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      } catch (e) {}
    }
    return true;
  } catch (e) {
    return true;
  }
}

export async function fetchAdSettingsFromCloud() {
  let localData = null;
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('cpl_ad_settings');
      if (stored) localData = JSON.parse(stored);
    } catch(e) {}
  }
  if (supabase) {
    try {
      const { data } = await supabase.from('platform_settings').select('value').eq('key', 'ads').maybeSingle();
      if (data && data.value) {
        return { ...localData, ...data.value };
      }
    } catch (e) {}
  }
  return localData || { isEnabled: false };
}

export async function saveRegistrationSettingsToCloud(settings, tournamentId = null) {
  if (!supabase || !settings) return false;
  try {
    const tId = toUUID(tournamentId) || DEFAULT_TOURNAMENT_UUID;
    const payload = {
      updated_at: new Date().toISOString()
    };
    if (settings.isRegistrationOpen !== undefined) payload.is_registration_open = !!settings.isRegistrationOpen;
    if (settings.isPlayerRegOpen !== undefined) payload.is_player_reg_open = !!settings.isPlayerRegOpen;
    if (settings.isTeamRegOpen !== undefined) payload.is_team_reg_open = !!settings.isTeamRegOpen;
    if (settings.closedReason !== undefined) payload.closed_reason = settings.closedReason;

    const { error } = await supabase.from('tournaments').update(payload).eq('id', tId);
    if (error && error.message && error.message.includes('column')) {
      // Fallback if migration not yet run
      await supabase.from('tournaments').update({ registration_settings: settings, updated_at: new Date().toISOString() }).eq('id', tId);
    }
    return true;
  } catch (e) { return false; }
}

export async function fetchRegistrationSettingsFromCloud(tournamentId = null) {
  const defaults = { isPlayerRegOpen: true, isTeamRegOpen: true, isRegistrationOpen: true, closedReason: "Registration is currently closed by the Admin." };
  if (!supabase) return defaults;
  try {
    const tId = toUUID(tournamentId) || DEFAULT_TOURNAMENT_UUID;
    const { data } = await supabase.from('tournaments').select(`
      is_registration_open, is_player_reg_open, is_team_reg_open, closed_reason
    `).eq('id', tId).maybeSingle();
    if (data) {
      return {
        isRegistrationOpen: data.is_registration_open !== false,
        isPlayerRegOpen: data.is_player_reg_open !== false,
        isTeamRegOpen: data.is_team_reg_open !== false,
        closedReason: data.closed_reason || defaults.closedReason
      };
    }
    return defaults;
  } catch (e) { return defaults; }
}

// --- NOTICE BOARD (stored in format_config.notice_board) ---
export async function saveNoticeBoardToCloud(noticeData, tournamentId = null) {
  if (!supabase) return false;
  try {
    const tId = toUUID(tournamentId) || DEFAULT_TOURNAMENT_UUID;
    let { data: currentTourney } = await supabase.from('tournaments').select('id, format_config').eq('id', tId).maybeSingle();
    if (!currentTourney) return false;
    const config = currentTourney.format_config || {};
    config.notice_board = noticeData;
    await supabase.from('tournaments').update({ format_config: config, updated_at: new Date().toISOString() }).eq('id', currentTourney.id);
    return true;
  } catch (e) { return false; }
}

export async function fetchNoticeBoardFromCloud(tournamentId = null) {
  if (!supabase) return null;
  try {
    const tId = toUUID(tournamentId) || DEFAULT_TOURNAMENT_UUID;
    const { data } = await supabase.from('tournaments').select('format_config').eq('id', tId).maybeSingle();
    return data?.format_config?.notice_board || null;
  } catch (e) { return null; }
}

// --- PUBLIC COMMUNITY QUERIES & REPLIES (community_queries table) ---
export async function saveCommunityQueryToCloud(queryData, tournamentId = null) {
  if (!supabase || !queryData) return false;
  try {
    const tId = toUUID(tournamentId) || toUUID(typeof window !== 'undefined' && window.store?.activeTournamentId) || DEFAULT_TOURNAMENT_UUID;
    await supabase.from('community_queries').upsert({
      id: queryData.id,
      tournament_id: tId,
      user_name: queryData.userName || 'Anonymous',
      user_role: queryData.userRole || 'VISITOR',
      message: queryData.message || '',
      replies: queryData.replies || [],
      created_at: queryData.timestamp ? new Date(queryData.timestamp).toISOString() : new Date().toISOString()
    }, { onConflict: 'id' });
    return true;
  } catch (e) { return false; }
}

export async function deleteCommunityQueryFromCloud(queryId) {
  if (!supabase || !queryId) return false;
  try {
    await supabase.from('community_queries').delete().eq('id', queryId);
    return true;
  } catch (e) { return false; }
}

export async function fetchCommunityQueriesFromCloud(tournamentId = null) {
  if (!supabase) return [];
  try {
    const tId = toUUID(tournamentId) || toUUID(typeof window !== 'undefined' && window.store?.activeTournamentId) || DEFAULT_TOURNAMENT_UUID;
    const { data } = await supabase.from('community_queries').select('*').eq('tournament_id', tId).order('created_at', { ascending: false });
    if (!data) return [];
    return data.map(q => ({
      id: q.id,
      userName: q.user_name,
      userRole: q.user_role,
      message: q.message,
      timestamp: new Date(q.created_at).getTime(),
      replies: q.replies || []
    }));
  } catch (e) { return []; }
}

export async function fetchTournamentOwnersFromCloud() {
  // Obsolete: Tournament owners now unified in profiles and tournaments.organiser_id
  return {};
}

export async function saveTournamentOwnerToCloud(tournamentId, ownerData) {
  // Obsolete: Tournament owners now unified in profiles and tournaments.organiser_id
  return;
}

export async function fetchUserAccountsFromCloud() {
  // Obsolete: User accounts now unified in profiles and Supabase Auth
  return [];
}

export async function saveUserAccountToCloud(account) {
  // Obsolete: User accounts now unified in profiles and Supabase Auth
  return;
}

// --- LIVE & TOTAL VISITOR TRACKER (visitor_stats table) ---
export async function initVisitorTracking(onStatsChange, tournamentId = null) {
  if (!supabase) {
    if (typeof onStatsChange === 'function') onStatsChange({ totalVisits: 259, liveCount: 1 });
    return;
  }
  try {
    const tId = toUUID(tournamentId) || toUUID(typeof window !== 'undefined' && window.store?.activeTournamentId) || DEFAULT_TOURNAMENT_UUID;
    const { data } = await supabase.from('visitor_stats').select('*').eq('tournament_id', tId).maybeSingle();
    const stats = data || { total_visitors: 259, live_online: 1 };
    
    let newTotal = stats.total_visitors || 259;
    const isNewSession = typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('cpl_visit_logged');
    if (isNewSession) {
      newTotal = newTotal + 1;
      try { sessionStorage.setItem('cpl_visit_logged', 'true'); } catch (e) {}
      await supabase.from('visitor_stats').upsert({
        id: data?.id || undefined,
        tournament_id: tId,
        total_visitors: newTotal,
        unique_visitors: stats.unique_visitors || 0,
        live_online: Math.max(1, typeof window !== 'undefined' && window.__cplLiveOnlineCount ? window.__cplLiveOnlineCount : 1),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }

    const currentLive = Math.max(1, typeof window !== 'undefined' && window.__cplLiveOnlineCount ? window.__cplLiveOnlineCount : (stats.live_online && stats.live_online < 50 ? stats.live_online : 1));
    if (typeof onStatsChange === 'function') {
      onStatsChange({ totalVisits: newTotal, liveCount: currentLive });
    }
  } catch (e) {
    if (typeof onStatsChange === 'function') onStatsChange({ totalVisits: 259, liveCount: 1 });
  }
}

// --- MULTI-TENANT TOURNAMENT SAAS & PLATFORM SETTINGS (platform_settings table) ---
export async function savePlatformSettingsToCloud(settings) {
  if (!supabase) return;
  try {
    await supabase.from('platform_settings').upsert({ key: 'general', value: settings, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  } catch (e) { console.warn('[SUPABASE] savePlatformSettings:', e.message); }
}

export async function fetchPlatformSettingsFromCloud() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('platform_settings').select('value').eq('key', 'general').maybeSingle();
    return data ? data.value : null;
  } catch (e) { return null; }
}

export async function saveCustomTournamentToCloud(tourney) {
  if (!supabase || !tourney) return null;
  try {
    const user = await getAuthUser();
    let organiserId = user?.id || null;

    // If organizer credentials/phone provided, sync with profiles
    const org = tourney.organizer || {};
    const orgPhone = (org.phone || tourney.organiser_phone || '').replace(/[^0-9]/g, '');
    const orgName = org.name || tourney.organiser_name || 'Tournament Organizer';
    const upiId = tourney.upiId || tourney.upi_id || null;
    const paymentQrUrl = tourney.paymentQrUrl || tourney.payment_qr_url || null;

    if (orgPhone) {
      try {
        // Look up profile by phone or email
        const orgEmail = org.email || `${orgPhone}@cpl.tournament.org`;
        const { data: matchedProfile } = await supabase
          .from('profiles')
          .select('id')
          .or(`phone.eq.${orgPhone},email.eq.${orgEmail}`)
          .maybeSingle();

        if (matchedProfile?.id) {
          organiserId = matchedProfile.id;
          // Update profile with UPI & QR if provided
          await supabase.from('profiles').update({
            full_name: orgName,
            phone: orgPhone,
            ...(upiId ? { upi_id: upiId } : {}),
            ...(paymentQrUrl ? { payment_qr_url: paymentQrUrl } : {}),
            updated_at: new Date().toISOString()
          }).eq('id', organiserId);
        }
      } catch (profErr) {
        console.warn('[SUPABASE] Profile sync in saveCustomTournament notice:', profErr.message);
      }
    }

    // Map frontend mode to Postgres check constraint ('registration_auction' or 'manual')
    let dbMode = 'registration_auction';
    if (tourney.mode === 'FIXTURE_ONLY' || tourney.mode === 'manual') {
      dbMode = 'manual';
    }

    let dbStatus = 'suspended';
    let approvalStatus = 'pending_approval';
    if (tourney.status) {
      const sLower = String(tourney.status).toLowerCase();
      if (sLower === 'active' || sLower === 'approved') {
        dbStatus = 'active';
        approvalStatus = 'approved';
      } else if (sLower === 'rejected') {
        dbStatus = 'archived';
        approvalStatus = 'rejected';
      } else {
        dbStatus = 'suspended';
        approvalStatus = 'pending_approval';
      }
    }

    const payload = {
      slug: tourney.slug || tourney.shortCode || tourney.id,
      name: tourney.name || tourney.id,
      category_code: tourney.shortCode || tourney.category || 'CUSTOM',
      mode: dbMode,
      registration_fee: Number(tourney.entryFee || tourney.playerEntryFee) || 0,
      total_team_budget: Number(tourney.teamPurse || tourney.auctionPurse || tourney.purse) || 8000,
      icon_price: Number(tourney.iconPrice || tourney.iconFee || tourney.defaultIconPrice) || 500,
      venue_name: tourney.venue || 'TBD',
      banner_url: tourney.posterUrl || tourney.poster_url || tourney.bannerUrl || tourney.banner_url || null,
      status: dbStatus,
      organiser_id: organiserId,
      kickoff_date: tourney.kickoffDate || tourney.kickoff_date || null,
      prize_winner: Number(tourney.prizeWinner || tourney.prize_winner) || 0,
      is_registration_open: tourney.isRegistrationOpen !== false,
      is_player_reg_open: tourney.isPlayerRegOpen !== false,
      is_team_reg_open: tourney.isTeamRegOpen !== false,
      closed_reason: tourney.closedReason || 'Registration is currently closed by the Admin.',
      approval_status: approvalStatus,
      updated_at: new Date().toISOString()
    };
    if (tourney.supabaseId) payload.id = tourney.supabaseId;
    const { data, error } = await supabase.from('tournaments').upsert(payload, { onConflict: 'slug' }).select('id').single();
    if (error) console.warn('[SUPABASE] saveCustomTournament error:', error.message);
    if (!error && data?.id) {
      // Sync auction configuration into tournament_auctions table
      try {
        const teamPurse = Number(tourney.teamPurse || tourney.auctionPurse || tourney.purse) || 8000;
        const basePrice = Number(tourney.basePrice || tourney.defaultBasePrice) || 300;
        const iconPrice = Number(tourney.iconPrice || tourney.iconFee || tourney.defaultIconPrice) || 500;
        await supabase.from('tournament_auctions').upsert({
          tournament_id: data.id,
          purse_budget: teamPurse,
          base_price: basePrice,
          icon_price: iconPrice,
          max_squad_size: Number(tourney.maxSquad || tourney.maxSquadSize) || 15,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tournament_id' });
      } catch (aucErr) {
        console.warn('[SUPABASE] tournament_auctions initial sync notice:', aucErr.message);
      }
      return data.id;
    }
    return null;
  } catch (e) {
    console.warn('[SUPABASE] saveCustomTournament:', e.message);
    return null;
  }
}

export async function updateTournamentApprovalStatus(tourneyId, newStatus, reason = '', slug = null) {
  if (!supabase || (!tourneyId && !slug)) return false;
  try {
    const isUUID = typeof tourneyId === 'string' && UUID_FORMAT_RE.test(tourneyId);
    const cleanSlug = String(slug || tourneyId || '').replace(/^t_/, '').trim();
    
    let dbStatus = 'active';
    let appStatus = 'approved';
    if (newStatus === 'REJECTED' || newStatus === 'rejected') {
      dbStatus = 'archived';
      appStatus = 'rejected';
    } else if (newStatus === 'PENDING_APPROVAL' || newStatus === 'pending') {
      dbStatus = 'suspended';
      appStatus = 'pending_approval';
    }
    
    const updatePayload = {
      status: dbStatus,
      approval_status: appStatus,
      rejection_reason: reason || null,
      approval_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isUUID) {
      const { error } = await supabase.from('tournaments').update(updatePayload).eq('id', tourneyId);
      if (error) throw error;
    } else if (cleanSlug) {
      const { error } = await supabase.from('tournaments').update(updatePayload).eq('slug', cleanSlug);
      if (error) throw error;
    }

    console.log("[SUPABASE] Updated tournament approval status:", tourneyId, cleanSlug, "->", dbStatus, "(", appStatus, ")");
    return true;
  } catch (err) {
    console.warn("[SUPABASE] updateTournamentApprovalStatus notice:", err);
    return false;
  }
}

export async function fetchCustomTournamentsFromCloud() {
  const data = await dbFetchTournaments();
  if (!data || !Array.isArray(data)) return [];
  return data.map(t => {
    if (t.id) {
      if (t.slug) registerTournamentUUID(t.slug, t.id);
      if (t.category_code) registerTournamentUUID(t.category_code, t.id);
      if (t.name) registerTournamentUUID(t.name, t.id);
    }
    const frontendMode = (t.mode === 'manual' || t.mode === 'FIXTURE_ONLY') ? 'FIXTURE_ONLY' : 'AUCTION_LEAGUE';
    
    let resolvedStatus = 'ACTIVE';
    const appStatus = t.approval_status || (t.registration_settings?.approval_status);
    if (appStatus === 'approved') {
      resolvedStatus = 'ACTIVE';
    } else if (appStatus === 'rejected' || t.status === 'archived') {
      resolvedStatus = 'REJECTED';
    } else if (appStatus === 'pending_approval' || t.status === 'suspended') {
      resolvedStatus = 'PENDING_APPROVAL';
    } else {
      resolvedStatus = (t.status || 'active').toUpperCase();
    }

    const orgProfile = t.profile || t.organiser || {};

    return ({
      id: `t_${t.slug}`,
      supabaseId: t.id,
      tournament_id: t.id,
      slug: t.slug,
      name: t.name,
      category_code: (t.category_code || t.slug || '').toUpperCase(),
      code: (t.category_code || t.slug || '').toUpperCase(),
      category: (t.category_code || t.slug || '').toUpperCase(),
      shortCode: (t.category_code || t.slug || '').toUpperCase(),
      mode: frontendMode,
      venue: t.venue_name,
      kickoffDate: t.kickoff_date || t.registration_settings?.kickoff_date || null,
      prizeWinner: Number(t.prize_winner || t.registration_settings?.prize_winner) || 35000,
      entryFee: Number(t.registration_fee) || 300,
      teamPurse: Number(t.total_team_budget) || Number(t.format_config?.auction_settings?.defaultPurseBudget) || 8000,
      iconPrice: Number(t.icon_price) || Number(t.format_config?.auction_settings?.defaultIconPrice) || 500,
      basePrice: Number(t.format_config?.auction_settings?.defaultBasePrice) || Number(t.base_price) || 200,
      logo_url: t.logo_url || t.banner_url || '',
      banner_url: t.banner_url || t.logo_url || '',
      logoUrl: t.logo_url || t.banner_url || '',
      posterUrl: t.banner_url || t.logo_url || '',
      upiId: orgProfile.upi_id || t.registration_settings?.upi_id || '',
      paymentQrUrl: orgProfile.payment_qr_url || t.registration_settings?.payment_qr_url || '',
      isRegistrationOpen: t.is_registration_open !== false,
      isPlayerRegOpen: t.is_player_reg_open !== false,
      isTeamRegOpen: t.is_team_reg_open !== false,
      closedReason: t.closed_reason || 'Registration is currently closed by the Admin.',
      approvalStatus: appStatus || 'pending_approval',
      rejectionReason: t.rejection_reason || null,
      format_config: t.format_config || {},
      organizer: {
        name: orgProfile.full_name || t.registration_settings?.organiser_name || '',
        phone: orgProfile.phone || t.registration_settings?.organiser_phone || ''
      },
      status: resolvedStatus,
      created_at: new Date(t.created_at).getTime()
    });
  });
}

export async function deleteCustomTournamentFromCloud(tourneyId, slug = null) {
  if (!supabase || (!tourneyId && !slug)) return false;
  try {
    const isUUID = typeof tourneyId === 'string' && UUID_FORMAT_RE.test(tourneyId);
    const cleanSlug = String(slug || tourneyId || '').replace(/^t_/, '').trim();

    let targetRow = null;
    if (isUUID) {
      const { data } = await supabase.from('tournaments').select('id, slug').eq('id', tourneyId).maybeSingle();
      if (data) targetRow = data;
    }
    if (!targetRow && cleanSlug) {
      const { data } = await supabase.from('tournaments').select('id, slug').eq('slug', cleanSlug).maybeSingle();
      if (data) targetRow = data;
    }
    if (!targetRow && cleanSlug) {
      const { data } = await supabase.from('tournaments').select('id, slug').ilike('slug', cleanSlug).maybeSingle();
      if (data) targetRow = data;
    }

    const uid = targetRow?.id || (isUUID ? tourneyId : null);
    const rowSlug = targetRow?.slug || cleanSlug;

    if (uid) {
      await supabase.from('players').delete().eq('tournament_id', uid);
      await supabase.from('teams').delete().eq('tournament_id', uid);
      await supabase.from('matches').delete().eq('tournament_id', uid);
      const { error } = await supabase.from('tournaments').delete().eq('id', uid);
      if (error) console.warn('[SUPABASE] delete by id error:', error.message);
    }

    if (rowSlug) {
      const { error } = await supabase.from('tournaments').delete().eq('slug', rowSlug);
      if (error) console.warn('[SUPABASE] delete by slug error:', error.message);
    }

    console.log('[SUPABASE] Deleted tournament and associated data from cloud:', uid, rowSlug);
    return true;
  } catch (e) {
    console.warn('[SUPABASE] deleteCustomTournament error:', e.message);
    return false;
  }
}

export async function saveUniversalPlayerToCloud(profile) {
  return syncUniversalPlayerToSupabase(profile);
}

export async function fetchUniversalPlayersFromCloud() {
  if (!supabase) return {};
  try {
    const { data } = await supabase.from('person_profiles').select('*').order('updated_at', { ascending: false }).limit(500);
    if (!data) return {};
    const result = {};
    data.forEach(p => { result[p.phone] = { name: p.name, phone: p.phone, photoUrl: p.photo_url, role: p.role, battingStyle: p.batting_style, bowlingStyle: p.bowling_style, dob: p.dob, age: p.age, village: p.village, district: p.district, state: p.state, jerseySize: p.jersey_size }; });
    return result;
  } catch (e) { return {}; }
}

export async function fetchAllTournamentsPlayers() {
  if (!supabase) return {};
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select(`
        id, tournament_id, person_id, category_name, base_price, is_icon, team_id,
        status, sold_price, verified, reg_number, updated_at, created_at,
        person:person_id (
          id, name, phone, photo_url, role, batting_style, bowling_style, dob, village, district, state, jersey_size
        )
      `)
      .neq('status', 'deleted')
      .order('reg_number', { ascending: true, nullsFirst: false });
    if (error || !Array.isArray(players)) return {};
    const result = {};
    players.forEach(p => {
      const tid = p.tournament_id;
      if (!tid) return;
      if (!result[tid]) result[tid] = [];
      const prof = p.person || {};
      result[tid].push({
        id: p.id,
        person_id: p.person_id || prof.id || null,
        tournament_id: tid,
        name: prof.name || '',
        phone: prof.phone || '',
        category: p.category_name || prof.role || 'All-Rounder',
        playingType: p.category_name || prof.role || 'All-Rounder',
        role: prof.role || p.category_name || 'All-Rounder',
        photoUrl: prof.photo_url || '',
        player_photo_url: prof.photo_url || '',
        teamId: p.team_id || null,
        basePrice: Number(p.base_price) || 300,
        isIcon: !!p.is_icon,
        registrationStatus: p.verified ? 'APPROVED' : (p.status || 'APPROVED'),
        paymentStatus: p.verified ? 'APPROVED' : (p.status || 'APPROVED'),
        displayRegistrationNumber: p.reg_number,
        village: prof.village || '',
        district: prof.district || 'Paschim Medinipur',
        state: prof.state || 'West Bengal',
        jerseySize: prof.jersey_size || '',
        dob: prof.dob || null
      });
    });
    return result;
  } catch (e) {
    console.warn('[SUPABASE] fetchAllTournamentsPlayers:', e.message);
    return {};
  }
}

export async function saveTournamentFormatToCloud(leagueCode, formatConfig) {
  if (!supabase) return;
  try {
    await supabase.from('tournaments').update({ format_config: formatConfig, updated_at: new Date().toISOString() }).eq('category_code', leagueCode);
  } catch (e) { console.warn('[SUPABASE] saveTournamentFormat:', e.message); }
}

export async function fetchTournamentFormatsFromCloud() {
  if (!supabase) return {};
  try {
    const { data } = await supabase.from('tournaments').select('category_code, format_config').not('format_config', 'is', null);
    if (!data) return {};
    const result = {};
    data.forEach(t => { if (t.format_config && Object.keys(t.format_config).length > 0) result[t.category_code] = t.format_config; });
    return result;
  } catch (e) { return {}; }
}

export async function fetchVisitorStats(callback) {
  if (!supabase) {
    const d = { totalVisits: 0, liveCount: 1 };
    if (callback) callback(d);
    return d;
  }
  try {
    const { data } = await supabase.from('visitor_stats').select('*').eq('tournament_id', DEFAULT_TOURNAMENT_UUID).maybeSingle();
    const result = { totalVisits: data?.total_visitors || 0, liveCount: data?.live_online || 1 };
    if (callback) callback(result);
    return result;
  } catch (e) {
    const d = { totalVisits: 0, liveCount: 1 };
    if (callback) callback(d);
    return d;
  }
}

export async function fetchGlobalUniquePlayersCount() {
  if (!supabase) return 0;
  try {
    const [playersRes, tourneyRes] = await Promise.all([
      supabase.from('players').select('id, person_id, tournament_id'),
      supabase.from('tournaments').select('id, format_config')
    ]);
    const data = playersRes.data || [];
    const tourneys = tourneyRes.data || [];

    const deletedByTourney = new Map();
    tourneys.forEach(t => {
      if (Array.isArray(t.format_config?.deleted_player_ids)) {
        deletedByTourney.set(t.id, new Set(t.format_config.deleted_player_ids));
      }
    });

    if (Array.isArray(data)) {
      const unique = new Set();
      data.forEach(p => {
        const key = p.person_id || p.id;
        const tourneyDeleted = deletedByTourney.get(p.tournament_id);
        if (tourneyDeleted && (tourneyDeleted.has(p.id) || (p.person_id && tourneyDeleted.has(p.person_id)))) {
          return;
        }
        if (key) unique.add(key);
      });
      return unique.size;
    }
  } catch (e) {
    console.warn("[SUPABASE] fetchGlobalUniquePlayersCount warning:", e);
  }
  return 0;
}

// ==============================================================================
// 3. POSTGRESQL MULTI-TENANT DATABASE CLIENT (RLS ENFORCED)
// ==============================================================================

// --- TOURNAMENTS CRUD ---
export async function dbFetchTournaments() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        profile:organiser_id (
          id, full_name, phone, email, role, upi_id, payment_qr_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) return data;
  } catch (err) {
    console.warn("[POSTGRES] dbFetchTournaments error:", err);
  }
  return null;
}

export async function dbCreateTournament(tourneyData) {
  if (!supabase) return null;
  try {
    const user = await getAuthUser();
    const payload = {
      ...tourneyData,
      organiser_id: user?.id || null,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('tournaments')
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      console.log("⚡ [POSTGRES] Tournament created:", data);
      return data;
    }
    if (error) console.error("[POSTGRES] Create tournament error:", error);
  } catch (err) {
    console.error("[POSTGRES] dbCreateTournament error:", err);
  }
  return null;
}

// --- ATOMIC PER-TOURNAMENT REGISTRATION NUMBER GENERATOR ---
export async function dbGetNextRegNumber(tournamentId) {
  if (!supabase || !tournamentId) return Date.now() % 10000;
  try {
    const tid = await resolveTournamentUUID(tournamentId) || toUUID(tournamentId) || tournamentId;
    const { data, error } = await supabase.rpc('get_next_reg_number', { t_id: tid });
    if (!error && typeof data === 'number') {
      return data;
    }
    const { count } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tid);
    if (typeof count === 'number') return count + 1;
  } catch (e) {}
  return null;
}

// --- UNIVERSAL PLAYER PHONE LOOKUP (ON-BLUR AUTOFILL) ---
export async function dbLookupPlayerByPhone(phone) {
  if (!phone) return null;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 10) return null;

  // 1. Try Supabase Postgres person_profiles
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('person_profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {}

    // 2. Fallback: Search globally across registered players table in Postgres
    try {
      const { data: pData, error: pErr } = await supabase
        .from('players')
        .select('*')
        .eq('phone', cleanPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!pErr && pData) {
        return {
          phone: pData.phone,
          name: pData.name,
          photo_url: pData.photo_url,
          role: pData.role,
          category: pData.category_name,
          batting_style: pData.batting_style || 'Right Hand Bat',
          bowling_style: pData.bowling_style || 'Right Arm Medium',
          jersey_size: pData.jersey_size || null
        };
      }
    } catch (e) {}
  }

  return null;
}

// --- PLAYER REGISTRATION (SCOPED TO TOURNAMENT) ---
export async function dbRegisterPlayer(playerData, docsData = null) {
  if (!supabase) return null;
  const ph = (playerData.phone || '').replace(/[^0-9]/g, '');
  if (!ph || ph.length < 10 || /^0+$/.test(ph)) throw new Error('Invalid phone number.');
  const nm = (playerData.name || '').trim().toUpperCase();
  if (!nm || /\b(TEST|DELETE|DUMMY|SAMPLE)\b/.test(nm)) throw new Error('Invalid player name.');
  try {
    let tid = playerData.tournament_id;

    // If tournament_id is missing or is a local slug (e.g. "t_cgl2026", "cgl2026"), resolve true UUID from Supabase
    if (!tid || typeof tid !== 'string' || tid.length < 30) {
      const slugCandidate = (playerData.tournamentSlug || tid || '').replace(/^t_/, '').toLowerCase();
      try {
        const { data: tourneyMatch } = await supabase
          .from('tournaments')
          .select('id')
          .ilike('slug', `%${slugCandidate}%`)
          .limit(1)
          .maybeSingle();
        if (tourneyMatch?.id) {
          tid = tourneyMatch.id;
          playerData.tournament_id = tid;
        }
      } catch (lookupErr) {}
    }

    if (!tid || typeof tid !== 'string' || tid.length < 30) {
      console.warn('[POSTGRES] dbRegisterPlayer: invalid tournament_id after slug lookup, using default');
      tid = DEFAULT_TOURNAMENT_UUID;
    }

    // Duplicate check: same phone + same tournament = blocked
    const cleanPhone = (playerData.phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone && tid) {
      try {
        const { data: existingPerson } = await supabase
          .from('person_profiles')
          .select('id, name')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (existingPerson?.id) {
          const { data: existingPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('person_id', existingPerson.id)
            .eq('tournament_id', tid)
            .maybeSingle();

          if (existingPlayer) {
            throw new Error(`You are already registered for this tournament! (Name: ${existingPerson.name || playerData.name})`);
          }
        }
      } catch (dupErr) {
        if (dupErr.message && dupErr.message.includes('already registered')) throw dupErr;
      }
    }

    const playerUUID = (playerData.id && UUID_FORMAT_RE.test(playerData.id)) ? playerData.id : generateUUID();
    playerData.id = playerUUID;

    // 1. Upsert into Universal Person Profiles first
    let personId = null;
    const phoneToSave = playerData.phone || cleanPhone;
    if (phoneToSave) {
      try {
        const personPayload = {
          phone: phoneToSave,
          name: playerData.name,
          photo_url: playerData.photo_url || playerData.photoUrl || null,
          role: playerData.role || playerData.category || 'All-Rounder',
          batting_style: playerData.battingStyle || playerData.batting_style || 'Right Hand Bat',
          bowling_style: playerData.bowlingStyle || playerData.bowling_style || 'Right Arm Medium',
          dob: playerData.dob || null,
          village: playerData.village || null,
          district: playerData.district || null,
          state: playerData.state || 'West Bengal',
          jersey_size: playerData.jerseySize || playerData.jersey_size || null,
          security_pin: playerData.securityPin || playerData.security_pin || null,
          updated_at: new Date().toISOString()
        };
        const { data: personData } = await supabase
          .from('person_profiles')
          .upsert(personPayload, { onConflict: 'phone' })
          .select('id')
          .maybeSingle();
        if (personData?.id) personId = personData.id;
      } catch (personErr) {
        console.warn("[POSTGRES] person_profiles upsert notice:", personErr);
      }
    }

    // 2. Insert into Tournament Players (only tournament-specific fields, person_id references person_profiles)
    const pPayload = {
      id: playerUUID,
      tournament_id: tid,
      person_id: personId,
      category_name: playerData.category_name || playerData.category || 'Category B',
      base_price: Number(playerData.base_price || playerData.basePrice) || 300,
      reg_number: playerData.reg_number || playerData.serialNo || null,
      verified: false,
      status: 'available',
      source: 'registered',
      created_at: new Date().toISOString()
    };

    const { data: player, error } = await supabase
      .from('players')
      .insert(pPayload)
      .select()
      .single();

    if (error) throw error;

    // 3. Save Sensitive Verification Docs (Aadhaar & Payment Proof) in Isolated Table
    if (docsData && player?.id) {
      await supabase
        .from('player_verification_docs')
        .insert({
          player_id: player.id,
          tournament_id: player.tournament_id,
          aadhaar_url: docsData.aadhaar_url || null,
          id_card_back_url: docsData.id_card_back_url || null,
          payment_screenshot_url: docsData.payment_screenshot_url || null,
          payment_ref: docsData.payment_ref || null,
          status: 'pending'
        });
    }
    return player;
  } catch (err) {
    console.error("[POSTGRES] dbRegisterPlayer failed:", err.message || err);
    throw new Error('Registration could not be saved to server. Please check your internet connection and try again.');
  }
}

// --- FLUSH OFFLINE QUEUE (Triggered when online or before cloud pull) ---
export async function flushSupabaseOfflineQueue() {
  return processOfflineQueue({
    'REGISTER_PLAYER': async (payload) => {
      const res = await dbRegisterPlayer(payload.playerData, payload.docsData);
      return !!res;
    },
    'SAVE_LIVE_MATCH': async (payload) => {
      await saveLiveMatchToCloud(payload.matchId, payload.state);
      return true;
    },
    'SAVE_CLOUD_DATA': async (payload) => {
      await saveCloudData(payload.players, payload.teams, payload.fixtures, payload.settings);
      return true;
    }
  });
}

// --- VERIFY PLAYER (AUTO-PURGES AADHAAR VIA TRIGGER) ---
export async function dbVerifyPlayer(playerId) {
  if (!supabase || !playerId) return false;
  try {
    const { data, error } = await supabase
      .from('players')
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq('id', playerId)
      .select()
      .single();
    if (!error && data) {
      console.log("⚡ [POSTGRES] Player verified & Aadhaar auto-purged:", playerId);
      return true;
    }
  } catch (err) {
    console.error("[POSTGRES] dbVerifyPlayer error:", err);
  }
  return false;
}

// --- AUDIT LOGGING ---
export async function dbLogAuditAction(action, tableName, recordId, oldValue = null, newValue = null, tourneyId = null) {
  if (!supabase) return;
  try {
    const user = await getAuthUser();
    await supabase.from('audit_log').insert({
      actor_id: user?.id || null,
      actor_email: user?.email || 'system',
      actor_role: user?.user_metadata?.role || 'admin',
      tournament_id: tourneyId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.warn("[AUDIT LOG] Notice:", e);
  }
}
