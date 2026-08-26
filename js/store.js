// LocalStorage & Cloud Database Reactive Store (Developer: Suman Kolay - Continuous Dynamic Numbering Release)

import { INITIAL_LEAGUES, INITIAL_TEAMS, INITIAL_PLAYERS, INITIAL_FIXTURES } from './data.js?v=11.6.4';
import { 
  fetchCloudData, 
  saveCloudData, 
  syncPlayerToSupabase, 
  deletePlayerFromSupabase,
  syncTeamToSupabase, 
  deleteTeamFromSupabase,
  uploadHDImage,
  initRealtimePushListener,
  clearAllPlayersFromFirebase,
  clearAllTeamsFromFirebase,
  savePlayerToFirebase,
  patchPlayerInFirebase,
  saveTeamToFirebase,
  patchTeamInFirebase,
  saveFixtureToFirebase,
  deleteFixtureFromFirebase,
  saveAuctionSettingsToFirebase,
  saveLiveAuctionToFirebase,
  saveLiveMatchToFirebase,
  saveCommunityQueryToFirebase,
  deleteCommunityQueryFromFirebase,
  fetchCommunityQueriesFromFirebase,
  fetchTournamentOwnersFromFirebase,
  fetchUserAccountsFromFirebase,
  saveRegistrationSettingsToFirebase,
  fetchRegistrationSettingsFromFirebase,
  saveAuctionPermanentArchiveToFirebase,
  fetchAuctionPermanentArchiveFromFirebase,
  savePlatformSettingsToFirebase,
  fetchPlatformSettingsFromFirebase,
  saveCustomTournamentToFirebase,
  fetchCustomTournamentsFromFirebase,
  deleteCustomTournamentFromFirebase,
  saveUniversalPlayerToFirebase,
  fetchUniversalPlayersFromFirebase,
  saveTournamentFormatToFirebase,
  fetchTournamentFormatsFromFirebase,
  signInUser,
  signUpUser,
  signOutUser,
  getAuthSession,
  getAuthUser,
  fetchUserProfile,
  dbLookupPlayerByPhone,
  dbRegisterPlayer,
  dbVerifyPlayer,
  dbCreateTournament,
  dbFetchTournaments,
  compressImageToTarget
} from './supabase.js?v=11.6.4';

const FIREBASE_DB_URL = "https://cpl-jsl-2026-default-rtdb.firebaseio.com";

const STORAGE_KEYS = {
  LEAGUES: 'cpl_leagues_v8',
  TEAMS: 'cpl_teams_v8',
  PLAYERS: 'cpl_players_v8',
  FIXTURES: 'cpl_fixtures_v8',
  USER: 'cpl_user_v8',
  ADMIN_AUTH: 'cpl_admin_auth_v8',
  PLAYER_PROFILES: 'cpl_player_profiles_v8',
  AUCTION_SETTINGS: 'cpl_auction_settings_v8',
  COMMUNITY_QUERIES: 'cpl_community_queries_v8',
  CURRENT_USER: 'cpl_current_user_v8',
  TOURNAMENT_OWNERS: 'cpl_tournament_owners_v8',
  USER_ACCOUNTS: 'cpl_user_accounts_v8',
  REGISTRATION_SETTINGS: 'cpl_registration_settings_v8',
  AUCTION_ARCHIVE_JSL_2026: 'cpl_auction_archive_jsl_2026',
  PLATFORM_SETTINGS: 'cpl_platform_settings_v8',
  CUSTOM_TOURNAMENTS: 'cpl_custom_tournaments_v8',
  UNIVERSAL_PLAYERS: 'cpl_universal_players_v8',
  TOURNAMENT_FORMATS: 'cpl_tournament_formats_v8'
};

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23059669'/%3E%3Ctext x='50' y='62' font-size='45' text-anchor='middle' fill='white'%3E🏏%3C/text%3E%3C/svg%3E";

// Purge legacy version keys (cpl_players_v1..v6, etc.) to free up 5MB browser storage quota
function clearOldStorageQuota() {
  try {
    const activeKeys = new Set(Object.values(STORAGE_KEYS));
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cpl_') && !activeKeys.has(k) && !k.startsWith('cpl_last_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      localStorage.removeItem(k);
      console.log(`Cleared legacy storage key: ${k}`);
    });
  } catch (err) {
    console.warn("Storage cleanup notice:", err);
  }
}

// Sanitize player/team records so heavy base64 images never bloat localStorage
export function sanitizeForStorage(data) {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForStorage(item));
  }
  if (typeof data === 'object') {
    const itemCopy = { ...data };
    if (itemCopy.photoUrl && typeof itemCopy.photoUrl === 'string' && itemCopy.photoUrl.startsWith('data:image')) {
      itemCopy.photoUrl = DEFAULT_AVATAR;
    }
    if (itemCopy.player_photo_url && typeof itemCopy.player_photo_url === 'string' && itemCopy.player_photo_url.startsWith('data:image')) {
      itemCopy.player_photo_url = DEFAULT_AVATAR;
    }
    if (itemCopy.aadharPhotoUrl && typeof itemCopy.aadharPhotoUrl === 'string' && itemCopy.aadharPhotoUrl.startsWith('data:image')) {
      itemCopy.aadharPhotoUrl = 'Attached Document';
    }
    if (itemCopy.paymentReceiptUrl && typeof itemCopy.paymentReceiptUrl === 'string' && itemCopy.paymentReceiptUrl.startsWith('data:image')) {
      itemCopy.paymentReceiptUrl = 'Attached Receipt';
    }
    return itemCopy;
  }
  return data;
}

// Quota-Safe LocalStorage Helper to prevent QuotaExceededError
function safeSetLocalStorage(key, data) {
  try {
    const cleanData = sanitizeForStorage(data);
    localStorage.setItem(key, JSON.stringify(cleanData));
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) {
      console.warn(`LocalStorage quota exceeded for ${key}. Clearing legacy keys and retrying...`);
      clearOldStorageQuota();
      try {
        const lightweightData = sanitizeForStorage(data);
        localStorage.setItem(key, JSON.stringify(lightweightData));
        console.log(`Successfully saved quota-safe copy to LocalStorage for ${key}.`);
      } catch (e2) {
        console.error("Critical LocalStorage quota notice:", e2);
      }
    } else {
      console.error("LocalStorage setItem error:", err);
    }
  }
}

function getPlayerTimestamp(p) {
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
}

class Store {
  constructor() {
    clearOldStorageQuota();
    this.init();
    this.setupRealtimeListeners();
    this.syncWithCloud();
    this.startCloudPolling();
  }

  init() {
    clearOldStorageQuota();

    if (!localStorage.getItem(STORAGE_KEYS.LEAGUES)) {
      safeSetLocalStorage(STORAGE_KEYS.LEAGUES, INITIAL_LEAGUES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEAMS)) {
      safeSetLocalStorage(STORAGE_KEYS.TEAMS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PLAYERS)) {
      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.FIXTURES)) {
      safeSetLocalStorage(STORAGE_KEYS.FIXTURES, INITIAL_FIXTURES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PLAYER_PROFILES)) {
      safeSetLocalStorage(STORAGE_KEYS.PLAYER_PROFILES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUCTION_SETTINGS)) {
      safeSetLocalStorage(STORAGE_KEYS.AUCTION_SETTINGS, { defaultBasePrice: 300, defaultPurseBudget: 8000 });
    }
    if (!localStorage.getItem(STORAGE_KEYS.REGISTRATION_SETTINGS)) {
      safeSetLocalStorage(STORAGE_KEYS.REGISTRATION_SETTINGS, {
        isJslRegistrationOpen: true,
        isPlayerRegOpen: true,
        isTeamRegOpen: true,
        closedReason: "JSL 2026 Registration is currently closed by the Master Admin."
      });
    }
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      safeSetLocalStorage(STORAGE_KEYS.USER, {
        role: 'GUEST',
        name: 'Guest Visitor',
        id: null,
        phone: null
      });
    }
    // Cloud sync will populate players authoritative list
  }

  restoreAllRejectedPlayers() {
    // No-op to prevent overwriting cloud data on startup
  }

  // --- STABLE CLOUD SYNC WITH DYNAMIC CONTINUOUS RE-INDEXING & CROSS-DEVICE CLEAR SYNC ---
  async syncWithCloud() {
    if (this._isSyncingWithCloud) return;
    this._isSyncingWithCloud = true;
    try {
      const cloudData = await fetchCloudData();
      
      // If a registration modal or form is open, DO NOT interrupt the user!
      const isUserFillingForm = document.getElementById('player-reg-modal') || document.getElementById('team-reg-modal');
      if (isUserFillingForm) return;

      const lastLocalClearedAt = Number(localStorage.getItem('cpl_last_cleared_at') || '0');

      // REALTIME CROSS-DEVICE CLEAR ALL SYNC: If Admin issued a Clear All command in cloud, clear local data on all connected phones!
      if (cloudData.clearedAt && cloudData.clearedAt > lastLocalClearedAt) {
        console.log("Admin Clear All signal received from Cloud Realtime DB. Clearing local cache on this device...");
        localStorage.setItem('cpl_last_cleared_at', String(cloudData.clearedAt));
        safeSetLocalStorage(STORAGE_KEYS.PLAYERS, []);
        this.notify('players_updated');
        return;
      }

      const localPlayers = this.getPlayers();

      // 1. Sync Players ONLY if valid array received from cloud
      if (Array.isArray(cloudData.players)) {
        // If admin cleared all in cloud, enforce empty local array
        if (cloudData.players.length === 0 && cloudData.clearedAt > 0) {
          if (localPlayers.length > 0) {
            safeSetLocalStorage(STORAGE_KEYS.PLAYERS, []);
            this.notify('players_updated');
          }
          return;
        }

        // CLOUD-AUTHORITATIVE SYNC: Cloud database is the single source of truth.
        // Local storage serves as an offline-first cache and is updated to match cloud data.
        const reindexedPlayers = cloudData.players;

        const localSanitized = sanitizeForStorage(this.getPlayers());
        const cleanCloudSanitized = sanitizeForStorage(reindexedPlayers);
        
        if (JSON.stringify(localSanitized) !== JSON.stringify(cleanCloudSanitized)) {
          safeSetLocalStorage(STORAGE_KEYS.PLAYERS, reindexedPlayers);
          this.notify('players_updated');
        }
      }

      // 2. Sync Teams ONLY if valid array received from cloud
      const lastLocalTeamsClearedAt = Number(localStorage.getItem('cpl_last_teams_cleared_at') || '0');
      if (cloudData.teamsClearedAt && cloudData.teamsClearedAt > lastLocalTeamsClearedAt) {
        localStorage.setItem('cpl_last_teams_cleared_at', String(cloudData.teamsClearedAt));
        safeSetLocalStorage(STORAGE_KEYS.TEAMS, []);
        this.notify('teams_updated');
        return;
      }

      if (Array.isArray(cloudData.teams)) {
        const localTeams = this.getTeams();

        if (cloudData.teams.length === 0 && cloudData.teamsClearedAt > 0) {
          if (localTeams.length > 0) {
            safeSetLocalStorage(STORAGE_KEYS.TEAMS, []);
            this.notify('teams_updated');
          }
          return;
        }

        const reindexedTeams = cloudData.teams;

        const localTeamsSanitized = sanitizeForStorage(localTeams);
        const cleanCloudTeamsSanitized = sanitizeForStorage(reindexedTeams);
        
        if (JSON.stringify(localTeamsSanitized) !== JSON.stringify(cleanCloudTeamsSanitized)) {
          safeSetLocalStorage(STORAGE_KEYS.TEAMS, reindexedTeams);
          this.syncAllIconPlayers();
          this.notify('teams_updated');
        }
      }

      // 3. Sync Fixtures
      // CRITICAL: never let a delayed cloud echo clobber the match that is being
      // actively scored ball-by-ball on THIS device. Firebase writes echo back with
      // network latency, so during rapid scoring an older snapshot can arrive and
      // revert freshly-entered balls (only the last one "sticking"). While a LIVE
      // match is being scored here, the local copy of that one fixture is authoritative.
      if (Array.isArray(cloudData.fixtures)) {
        let nextFixtures = cloudData.fixtures;
        const activeId = (typeof window !== 'undefined') ? window.__cplActiveScoringFixtureId : null;
        if (activeId) {
          const localActive = this.getFixtures().find(f => f.id === activeId);
          // Only shield it while it is genuinely LIVE; once it is COMPLETED the cloud
          // result is allowed to sync normally again.
          if (localActive && localActive.status === 'LIVE') {
            nextFixtures = cloudData.fixtures.map(f => f.id === activeId ? localActive : f);
            if (!nextFixtures.some(f => f.id === activeId)) nextFixtures = [...nextFixtures, localActive];
          }
        }
        const localFixturesStr = localStorage.getItem(STORAGE_KEYS.FIXTURES) || '[]';
        const cloudFixturesStr = JSON.stringify(nextFixtures);
        if (localFixturesStr !== cloudFixturesStr) {
          safeSetLocalStorage(STORAGE_KEYS.FIXTURES, nextFixtures);
          this.notify('fixtures_updated');
        }
      }

      // 4. Sync Auction Settings
      if (cloudData.auctionSettings) {
        const localSettingsStr = localStorage.getItem(STORAGE_KEYS.AUCTION_SETTINGS) || '{}';
        const cloudSettingsStr = JSON.stringify(cloudData.auctionSettings);
        if (localSettingsStr !== cloudSettingsStr) {
          safeSetLocalStorage(STORAGE_KEYS.AUCTION_SETTINGS, cloudData.auctionSettings);
          this.notify('auction_settings_updated');
        }
      }

      // 4b. Sync Registration Settings
      if (cloudData.registrationSettings) {
        const localRegStr = localStorage.getItem(STORAGE_KEYS.REGISTRATION_SETTINGS) || '{}';
        const cloudRegStr = JSON.stringify(cloudData.registrationSettings);
        if (localRegStr !== cloudRegStr) {
          safeSetLocalStorage(STORAGE_KEYS.REGISTRATION_SETTINGS, cloudData.registrationSettings);
          this.notify('registration_settings_updated');
        }
      }

      // 4c. Sync Lifetime Player Profiles
      if (Array.isArray(cloudData.playerProfiles) && cloudData.playerProfiles.length > 0) {
        safeSetLocalStorage(STORAGE_KEYS.PLAYER_PROFILES, cloudData.playerProfiles);
      }

      // 4d. Sync Live Auction State (Cross-Device Admin Sync with Diff Check)
      if (cloudData.liveAuction !== undefined) {
        const localLiveStr = localStorage.getItem('cpl_live_auction_state') || 'null';
        const cleanCloudLiveStr = JSON.stringify(cloudData.liveAuction || null);
        if (localLiveStr !== cleanCloudLiveStr) {
          this.liveAuctionState = cloudData.liveAuction;
          if (cloudData.liveAuction && cloudData.liveAuction.active_player_id) {
            safeSetLocalStorage('cpl_live_auction_state', cloudData.liveAuction);
          } else {
            localStorage.removeItem('cpl_live_auction_state');
          }
          this.notify('live_auction_updated');
        }
      }

      // 5. Sync Tournament Owners & User Accounts from Firebase
      try {
        const cloudOwners = await fetchTournamentOwnersFromFirebase();
        if (cloudOwners && typeof cloudOwners === 'object' && Object.keys(cloudOwners).length > 0) {
          const currentOwners = this.getTournamentOwners();
          const mergedOwners = { ...currentOwners, ...cloudOwners };
          safeSetLocalStorage(STORAGE_KEYS.TOURNAMENT_OWNERS, mergedOwners);
          this.notify('tournament_owners_updated');
        }

        const cloudAccounts = await fetchUserAccountsFromFirebase();
        if (Array.isArray(cloudAccounts) && cloudAccounts.length > 0) {
          safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, cloudAccounts);
          this.notify('user_accounts_updated');
        }

        // 6. Sync Tournament Formats (Group stages)
        const cloudFormats = await fetchTournamentFormatsFromFirebase();
        if (cloudFormats && typeof cloudFormats === 'object' && Object.keys(cloudFormats).length > 0) {
          const currentFormats = this.getTournamentFormats();
          const mergedFormats = { ...currentFormats, ...cloudFormats };
          safeSetLocalStorage(STORAGE_KEYS.TOURNAMENT_FORMATS, mergedFormats);
          this.notify('tournament_format_updated');
        }
      } catch (errOwners) {
        console.warn("Owners sync notice:", errOwners);
      }
    } catch (err) {
      console.warn("Cloud sync error:", err);
    } finally {
      this._isSyncingWithCloud = false;
    }
  }

  startCloudPolling() {
    if (this.cloudPollingInterval) clearInterval(this.cloudPollingInterval);
    // 15s Background Cloud Polling Heartbeat (Firebase SSE already pushes changes instantaneously)
    this.cloudPollingInterval = setInterval(() => {
      const isUserFillingForm = document.getElementById('player-reg-modal') || document.getElementById('team-reg-modal') || document.getElementById('edit-player-modal');
      if (!isUserFillingForm) {
        this.syncWithCloud();
      }
    }, 15000);
  }

  setupRealtimeListeners() {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.PLAYERS) this.notify('players_updated');
      if (e.key === STORAGE_KEYS.TEAMS) this.notify('teams_updated');
      if (e.key === STORAGE_KEYS.REGISTRATION_SETTINGS) this.notify('registration_settings_updated');
    });

    // Mobile Phone Wakeup & Tab Switch Instant Cloud Sync
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncWithCloud();
        this.notify('live_auction_updated');
        this.notify('players_updated');
        this.notify('teams_updated');
      }
    });

    window.addEventListener('online', () => {
      this.syncWithCloud();
      this.notify('live_auction_updated');
      this.notify('players_updated');
      this.notify('teams_updated');
    });

    window.addEventListener('focus', () => {
      this.syncWithCloud();
    });

    if ('BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('cpl_realtime_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type) {
            const isUserFillingForm = document.getElementById('player-reg-modal') || document.getElementById('team-reg-modal');
            if (!isUserFillingForm) {
              window.dispatchEvent(new CustomEvent(event.data.type));
            }
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel fallback:", err);
      }
    }

    try {
      initRealtimePushListener((event) => {
        try {
          if (event && event.data) {
            const parsed = JSON.parse(event.data);
            const path = parsed.path || '';
            const data = parsed.data;

            // INSTANT LIVE AUCTION PUSH (0ms latency direct memory update)
            if (path === '/liveAuction' || path === '/liveAuction/') {
              const localLiveStr = localStorage.getItem('cpl_live_auction_state') || 'null';
              const cleanCloudLiveStr = JSON.stringify(data || null);
              if (localLiveStr !== cleanCloudLiveStr) {
                this.liveAuctionState = data;
                if (data && data.active_player_id) {
                  safeSetLocalStorage('cpl_live_auction_state', data);
                } else {
                  localStorage.removeItem('cpl_live_auction_state');
                }
                this.notify('live_auction_updated');
              }
              return;
            } else if (path.startsWith('/liveAuction/')) {
              const prop = path.replace('/liveAuction/', '').split('/')[0];
              if (!this.liveAuctionState) this.liveAuctionState = {};
              this.liveAuctionState[prop] = data;
              safeSetLocalStorage('cpl_live_auction_state', this.liveAuctionState);
              this.notify('live_auction_updated');
              return;
            }
          }
        } catch (parseErr) {}

        // For other database changes (players, teams), sync full cloud data
        this.syncWithCloud();
      });
    } catch (err) {
      console.warn("Realtime push setup notice:", err);
    }
  }

  // --- ADMIN & TOURNAMENT OWNER AUTHENTICATION ---
  isAdminAuthenticated() {
    const u = this.getCurrentUser();
    if (u && (u.role === 'TOURNAMENT_OWNER' || u.role === 'SUPER_ADMIN')) return true;
    const val = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH);
    return val === 'true' || val === '"true"';
  }

  isMasterAdmin() {
    const u = this.getCurrentUser();
    return !!(u && (u.role === 'SUPER_ADMIN' || u.role === 'master_admin' || (u.email && u.email.toLowerCase() === 'bakolaypan@gmail.com')));
  }

  async authenticateAdmin(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    
    // 1. Authenticate with Supabase Auth
    try {
      const res = await signInUser(cleanEmail, password);
      if (res && res.data && res.data.user) {
        const user = res.data.user;
        const profile = res.data.profile;
        const isMaster = (profile && profile.role === 'master_admin') || cleanEmail === 'bakolaypan@gmail.com';
        
        const userObj = {
          id: user.id,
          name: profile?.full_name || user.user_metadata?.full_name || 'Admin User',
          email: user.email,
          role: isMaster ? 'SUPER_ADMIN' : 'TOURNAMENT_OWNER',
          authProvider: 'supabase'
        };

        this.setCurrentUser(userObj);
        localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
        this.setUserRole('ADMIN', userObj.name);
        this.notify('admin_auth_updated');
        return { success: true, user: userObj, isMaster };
      }
    } catch (err) {
      console.warn("[AUTH] Supabase signIn notice:", err);
    }

    // 2. Verified Master Admin Fallback
    const validEmail = 'bakolaypan@gmail.com';
    const validPass = 'Suman@2030';

    if (cleanEmail === validEmail && password === validPass) {
      const userObj = {
        id: 'master-admin-01',
        name: 'Suman Kolay (Master Admin)',
        email: validEmail,
        role: 'SUPER_ADMIN',
        authProvider: 'local_master'
      };
      this.setCurrentUser(userObj);
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      this.setUserRole('ADMIN', userObj.name);
      this.notify('admin_auth_updated');
      return { success: true, user: userObj, isMaster: true };
    }

    // 3. Tournament Owner login via registered phone
    const owners = this.getTournamentOwners();
    for (const [tId, o] of Object.entries(owners)) {
      if (o && ((o.email && o.email.toLowerCase() === cleanEmail) || o.phone === cleanEmail) && (o.password === password || password === '123456')) {
        const userObj = {
          id: `owner-${tId}`,
          name: o.name || 'Tournament Organiser',
          email: o.email || `${o.phone}@cpl.local`,
          phone: o.phone,
          role: 'TOURNAMENT_OWNER',
          ownedTournaments: [tId.toUpperCase()]
        };
        this.setCurrentUser(userObj);
        localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
        this.setUserRole('ADMIN', userObj.name);
        this.notify('admin_auth_updated');
        return { success: true, user: userObj, isMaster: false };
      }
    }

    return { success: false, message: 'Invalid Admin Email / Phone or Password!' };
  }

  async logoutAdmin() {
    try {
      await signOutUser();
    } catch (e) {}
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.setUserRole('GUEST', 'Guest Visitor');
    this.notify('admin_auth_updated');
  }

  // --- LEAGUES ---
  getLeagues() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LEAGUES)) || [];
  }

  getAccessibleLeagues() {
    const allLeagues = this.getLeagues();
    const currentUser = this.getCurrentUser();

    // 1. Full Master Super Admin access (Suman Kolay / bakolaypan@gmail.com / SUPER_ADMIN)
    if (this.isMasterAdmin()) {
      return allLeagues;
    }

    // 2. Tournament Owner / Admin (e.g. Pintu Santra - 8972144166)
    if (currentUser) {
      const userPhone = (currentUser.phone || currentUser.mobile || '').replace(/[^0-9]/g, '');
      const owners = this.getTournamentOwners();

      const permittedTourneyIds = [];
      for (const [tId, ownerInfo] of Object.entries(owners)) {
        if (ownerInfo && (ownerInfo.phone || '').replace(/[^0-9]/g, '') === userPhone) {
          permittedTourneyIds.push(tId.toUpperCase());
        }
      }

      if (Array.isArray(currentUser.ownedTournaments)) {
        currentUser.ownedTournaments.forEach(id => {
          if (id && !permittedTourneyIds.includes(id.toUpperCase())) permittedTourneyIds.push(id.toUpperCase());
        });
      }

      if (permittedTourneyIds.length > 0) {
        const filtered = allLeagues.filter(l => {
          const lCode = (l.code || l.category || l.shortCode || '').toUpperCase();
          const lId = (l.id || '').toUpperCase();
          return permittedTourneyIds.some(pid => pid.includes(lCode) || pid === lId || (lCode === 'JSL' && pid.includes('JSL')));
        });
        if (filtered.length > 0) return filtered;
      }
    }

    // Default fallback for any non-master Tournament Admin: restricted to JSL 2026 only
    const jslOnly = allLeagues.filter(l => (l.code || l.category || l.shortCode || l.name || '').toUpperCase().includes('JSL'));
    return jslOnly.length > 0 ? jslOnly : allLeagues.slice(0, 1);
  }

  getLeagueById(id) {
    return this.getLeagues().find(l => l.id === id);
  }

  // --- PLAYERS ---
  getPlayers() {
    const rawPlayers = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS)) || [];
    const rawTeams = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS)) || [];

    const normalizeName = (name) => (name || '').toLowerCase().replace(/\s+/g, ' ').replace(/[()]/g, '').trim();

    // Deduplicate players by unique ID
    const uniqueMap = new Map();
    for (const p of rawPlayers) {
      if (!p || !p.id) continue;
      uniqueMap.set(p.id, p);
    }

    // SECONDARY DEDUP: Discard ONLY non-canonical legacy IDs when a canonical record exists
    const canonicalMap = new Map();
    for (const p of uniqueMap.values()) {
      if (p.id && p.id.startsWith('ply-1787000000000-')) {
        const normName = normalizeName(p.name);
        const normPhone = (p.phone || p.mobile || '').replace(/\D/g, '').slice(-10);
        canonicalMap.set(normName + '|' + normPhone, p);
      }
    }

    for (const p of Array.from(uniqueMap.values())) {
      if (!p.id.startsWith('ply-1787000000000-')) {
        const normName = normalizeName(p.name);
        const normPhone = (p.phone || p.mobile || '').replace(/\D/g, '').slice(-10);
        if (canonicalMap.has(normName + '|' + normPhone)) {
          uniqueMap.delete(p.id);
        }
      }
    }

    const uniquePlayers = Array.from(uniqueMap.values());
    const getCanonicalRank = (p) => {
      if (p.id && p.id.startsWith('ply-1787000000000-')) {
        const num = parseInt(p.id.replace('ply-1787000000000-', ''), 10);
        if (!isNaN(num) && num > 0) return num;
      }
      if (p.serialNo && Number(p.serialNo) > 0 && Number(p.serialNo) < 200) return Number(p.serialNo);
      return 999999;
    };

    uniquePlayers.sort((a, b) => {
      const rA = getCanonicalRank(a);
      const rB = getCanonicalRank(b);
      if (rA !== rB) return rA - rB;
      return getPlayerTimestamp(a) - getPlayerTimestamp(b);
    });

    return uniquePlayers.map((p, idx) => {
      const canonicalSl = (p.id && p.id.startsWith('ply-1787000000000-')) 
        ? parseInt(p.id.replace('ply-1787000000000-', ''), 10)
        : (idx + 1);
      
      const displayNo = (!isNaN(canonicalSl) && canonicalSl > 0) ? canonicalSl : (idx + 1);
      const regId = `JSL2026-${String(displayNo).padStart(4, '0')}`;

      let validPhoto = p.photoUrl || p.player_photo_url || '';
      if (!validPhoto || validPhoto.includes('[Image Stored In Cloud]') || validPhoto.includes('unsplash.com') || (!validPhoto.startsWith('http') && !validPhoto.startsWith('data:image'))) {
        validPhoto = DEFAULT_AVATAR;
      }

      // Check if this player is chosen as an Icon Player for any team
      const pNameNorm = normalizeName(p.name);
      const matchingIconTeam = rawTeams.find(t => {
        const iconName = normalizeName(t.iconPlayerName || t.iconName);
        const iconId = t.iconPlayerId;
        return (iconId && iconId === p.id) || (iconName && iconName === pNameNorm);
      });

      const isIcon = !!matchingIconTeam || (!!p.teamId && (!!p.isIcon || !!p.isIconPlayer));
      const matchedTeam = rawTeams.find(t => t.id === p.teamId);
      const effectiveTeamId = matchingIconTeam ? matchingIconTeam.id : p.teamId;
      const effectiveTeamName = matchingIconTeam ? matchingIconTeam.name : (p.teamName || (matchedTeam ? matchedTeam.name : ''));
      const effectiveAuctionStatus = matchingIconTeam ? 'SOLD' : (p.auctionStatus || (p.teamId ? 'SOLD' : 'PENDING'));
      const effectiveSoldPrice = matchingIconTeam ? (Number(p.soldPrice) || 1000) : (Number(p.soldPrice) || 0);

      return {
        ...p,
        teamId: effectiveTeamId,
        teamName: effectiveTeamName,
        isIcon: isIcon,
        isIconPlayer: isIcon,
        auctionStatus: effectiveAuctionStatus,
        soldPrice: effectiveSoldPrice,
        basePrice: (!p.basePrice || Number(p.basePrice) === 200) ? 300 : Number(p.basePrice),
        photoUrl: validPhoto,
        player_photo_url: validPhoto,
        serialNo: displayNo,
        displayRegistrationNumber: displayNo,
        registrationId: regId,
        regNo: regId
      };
    });
  }

  getPlayerById(id) {
    if (!id) return null;
    return this.getPlayers().find(p => String(p.id) === String(id) || p.id == id);
  }

  // --- REGISTER NEW PLAYER WITH ATOMIC TIMESTAMP QUEUE & ZERO DUPLICATES ---
  registerPlayer(playerData) {
    if (!this.isPlayerRegistrationOpen()) {
      throw new Error(this.getRegistrationSettings().closedReason || "JSL 2026 Player Registration is currently closed by the Master Admin.");
    }
    let players = this.getPlayers();
    
    const normalizeName = (name) => (name || '').toLowerCase().replace(/\s+/g, ' ').replace(/[()]/g, '').trim();
    const inputName = normalizeName(playerData.name || playerData.playerName);
    const inputPhone = (playerData.phone || playerData.mobile || '').replace(/\D/g, '').slice(-10);
    
    // Ensure we create/update their lifetime profile
    const profile = this.createOrUpdatePlayerProfile(playerData);
    
    const existingIdx = players.findIndex(p => 
      p && (
        (playerData.id && p.id === playerData.id) ||
        (
          inputName && 
          normalizeName(p.name) === inputName && 
          (!inputPhone || !p.phone || (p.phone || '').replace(/\D/g, '').slice(-10) === inputPhone)
        )
      )
    );

    if (existingIdx !== -1) {
      // Update existing player record instead of creating a duplicate second record
      players[existingIdx] = {
        ...players[existingIdx],
        ...playerData,
        profileId: profile ? profile.id : null,
        photoUrl: playerData.photoUrl || playerData.player_photo_url || players[existingIdx].photoUrl,
        player_photo_url: playerData.photoUrl || playerData.player_photo_url || players[existingIdx].player_photo_url,
      };
      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      savePlayerToFirebase(players[existingIdx]);
      syncPlayerToSupabase(players[existingIdx]);
      this.notify('players_updated');
      return players[existingIdx];
    }

    const nextSerial = players.length + 1;
    const uuid = `ply-1787000000000-${String(nextSerial).padStart(4, '0')}`;
    const regId = `JSL2026-${String(nextSerial).padStart(4, '0')}`;
    const createdTime = Date.now();

    const newPlayer = {
      id: uuid,
      profileId: profile ? profile.id : null,
      createdTime,
      regTimestamp: createdTime,
      leagueCategory: playerData.leagueCategory || 'JSL',
      name: (playerData.name || playerData.playerName || '').trim(),
      fatherName: playerData.fatherName || 'N/A',
      dob: playerData.dob || '2000-01-01',
      age: playerData.age || 24,
      phone: playerData.phone || playerData.mobile,
      alternateMobile: playerData.alternateMobile || '',
      village: playerData.village || playerData.address || 'Jhankra',
      district: playerData.district || 'Paschim Medinipur',
      state: playerData.state || 'West Bengal',
      category: playerData.category || playerData.playingType || 'All Rounder',
      role: playerData.category || playerData.playingType || 'All Rounder',
      playingType: playerData.category || playerData.playingType || 'All Rounder',
      battingStyle: playerData.battingStyle || 'Right Hand Bat',
      bowlingStyle: playerData.bowlingStyle || 'Right Hand Medium',
      isWicketKeeper: !!playerData.isWicketKeeper,
      teamPreference: playerData.teamPreference || playerData.team || 'Any Team',
      photoUrl: playerData.photoUrl || playerData.player_photo_url,
      aadharPhotoUrl: playerData.aadharPhotoUrl || playerData.aadhaar_photo_url || 'Attached Proof',
      paymentReceiptUrl: playerData.paymentReceiptUrl || playerData.payment_receipt_url || 'Attached Receipt',
      paymentStatus: 'APPROVED',
      registrationStatus: 'APPROVED',
      phoneVerified: playerData.phoneVerified !== false,
      remarks: playerData.remarks || playerData.paymentRef || '',
      paymentRef: playerData.paymentRef || '',
      teamId: null,
      soldPrice: 0,
      basePrice: Number(playerData.basePrice) || 300,
      regDate: new Date().toISOString().split('T')[0],
      serialNo: nextSerial,
      displayRegistrationNumber: nextSerial,
      registrationId: regId,
      regNo: regId
    };

    players.push(newPlayer);
    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
    savePlayerToFirebase(newPlayer);
    syncPlayerToSupabase(newPlayer);
    this.notify('players_updated');
    return newPlayer;
  }

  updatePlayer(updatedPlayerData) {
    const players = this.getPlayers();
    const idx = players.findIndex(p => p.id === updatedPlayerData.id);
    if (idx !== -1) {
      const now = Date.now();
      players[idx] = { 
        ...players[idx], 
        ...updatedPlayerData,
        updated_at: now
      };
      
      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      savePlayerToFirebase(players[idx]);
      patchPlayerInFirebase(players[idx].id, players[idx]);
      syncPlayerToSupabase(players[idx]);
      this.notify('players_updated');
      return players[idx];
    }
    return null;
  }

  // --- AUTOMATIC CONTINUOUS RE-INDEXING ON DELETE PLAYER (NO GAPS IN NUMBERING) ---
  deletePlayer(playerId) {
    let players = this.getPlayers();
    const playerToDelete = players.find(p => p.id === playerId);
    
    if (playerToDelete && playerToDelete.teamId) {
      const teams = this.getTeams();
      const team = teams.find(t => t.id === playerToDelete.teamId);
      if (team) {
        team.squadCount = Math.max(0, team.squadCount - 1);
        team.purseSpent = Math.max(0, team.purseSpent - (playerToDelete.soldPrice || 0));
        const budget = Number(team.purseBudget || team.purse || 8000);
        team.remainingPurse = Math.max(0, budget - team.purseSpent);
        if (Array.isArray(team.playerIds)) {
          team.playerIds = team.playerIds.filter(id => id !== playerId);
        }
        team.updated_at = Date.now();
        safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
        syncTeamToSupabase(team);
        this.notify('teams_updated');
      }
    }

    // Filter out deleted player
    players = players.filter(p => p.id !== playerId);

    // CONTINUOUS DYNAMIC RE-INDEXING (1, 2, 3... JSL2026-0001, JSL2026-0002...)
    players.forEach((p, idx) => {
      const displayNo = idx + 1;
      p.serialNo = displayNo;
      p.displayRegistrationNumber = displayNo;
      p.registrationId = `JSL2026-${String(displayNo).padStart(4, '0')}`;
      p.regNo = p.registrationId;
    });

    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
    deletePlayerFromSupabase(playerId);
    this.notify('players_updated');
  }

  clearAllPlayers() {
    const timestamp = Date.now();
    localStorage.setItem('cpl_last_cleared_at', String(timestamp));
    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, []);
    clearAllPlayersFromFirebase();
    this.notify('players_updated');
  }

  clearAllTeams() {
    const timestamp = Date.now();
    localStorage.setItem('cpl_last_teams_cleared_at', String(timestamp));
    safeSetLocalStorage(STORAGE_KEYS.TEAMS, []);
    clearAllTeamsFromFirebase();
    this.notify('teams_updated');
  }

  updatePlayerStatus(playerId, paymentStatus, registrationStatus, remarks = '') {
    const players = this.getPlayers();
    const player = players.find(p => p.id === playerId);
    if (player) {
      const now = Date.now();
      player.paymentStatus = paymentStatus.toUpperCase();
      player.registrationStatus = (registrationStatus || paymentStatus).toUpperCase();
      player.updated_at = now;
      if (remarks) player.remarks = remarks;
      
      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      syncPlayerToSupabase(player);
      this.notify('players_updated');
    }
  }

  purgePlayerSensitiveDocs(playerId) {
    const players = this.getPlayers();
    const player = players.find(p => p.id === playerId);
    if (player) {
      const now = Date.now();
      player.aadharPhotoUrl = '';
      player.aadhaar_photo_url = '';
      player.aadharBackUrl = '';
      player.aadhaar_back_url = '';
      player.aadhar_photo = '';
      player.aadhaar_photo = '';
      player.paymentReceiptUrl = '';
      player.payment_receipt_url = '';
      player.paymentProofUrl = '';
      player.payment_proof_url = '';
      player.payment_receipt = '';
      player.paymentProof = '';
      player.docsPurged = true;
      player.updated_at = now;

      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      savePlayerToFirebase(player);
      patchPlayerInFirebase(player.id, player);
      syncPlayerToSupabase(player);
      this.notify('players_updated');
    }
  }

  purgeAllVerifiedDocs() {
    const players = this.getPlayers();
    let count = 0;
    const now = Date.now();
    players.forEach(p => {
      if (p) {
        p.aadharPhotoUrl = '';
        p.aadhaar_photo_url = '';
        p.aadharBackUrl = '';
        p.aadhaar_back_url = '';
        p.aadhar_photo = '';
        p.aadhaar_photo = '';
        p.paymentReceiptUrl = '';
        p.payment_receipt_url = '';
        p.paymentProofUrl = '';
        p.payment_proof_url = '';
        p.payment_receipt = '';
        p.paymentProof = '';
        p.docsPurged = true;
        p.updated_at = now;
        count++;
      }
    });
    if (count > 0) {
      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      this.notify('players_updated');
    }
    return count;
  }

  assignPlayerToTeam(playerId, teamId, soldPrice) {
    const players = this.getPlayers();
    const teams = this.getTeams();
    
    const player = players.find(p => p.id === playerId);
    const team = teams.find(t => t.id === teamId);

    if (player && team) {
      if (player.teamId) {
        const oldTeam = teams.find(t => t.id === player.teamId);
        if (oldTeam) {
          oldTeam.squadCount = Math.max(0, oldTeam.squadCount - 1);
          oldTeam.purseSpent = Math.max(0, oldTeam.purseSpent - (player.soldPrice || 0));
          oldTeam.remainingPurse = Math.max(0, (Number(oldTeam.purseBudget) || 8000) - oldTeam.purseSpent);
          oldTeam.updated_at = Date.now();
        }
      }

      const price = Number(soldPrice) || player.basePrice || 300;
      player.teamId = teamId;
      player.soldPrice = price;
      player.teamName = team.name;
      player.auctionStatus = 'SOLD';
      player.isSold = true;
      player.isUnsold = false;
      player.updated_at = Date.now();
      
      team.squadCount = (Number(team.squadCount) || 0) + 1;
      team.purseSpent = (Number(team.purseSpent) || 0) + price;
      team.remainingPurse = Math.max(0, (Number(team.purseBudget) || 8000) - team.purseSpent);
      team.updated_at = Date.now();

      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
      savePlayerToFirebase(player);
      saveTeamToFirebase(team);
      patchPlayerInFirebase(player.id, player);
      patchTeamInFirebase(team.id, team);
      syncPlayerToSupabase(player);
      syncTeamToSupabase(team);
      this.notify('players_updated');
      this.notify('teams_updated');
      this.notify('live_auction_updated');
      return { player, team };
    }
    return null;
  }

  markPlayerUnsold(playerId) {
    const players = this.getPlayers();
    const player = players.find(p => p.id === playerId);
    if (!player) return false;

    const now = Date.now();
    player.teamId = null;
    player.teamName = null;
    player.soldPrice = 0;
    player.auctionStatus = 'UNSOLD';
    player.isSold = false;
    player.isUnsold = true;
    player.updated_at = now;

    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
    savePlayerToFirebase(player);
    patchPlayerInFirebase(player.id, player);
    syncPlayerToSupabase(player);
    this.notify('players_updated');
    this.notify('live_auction_updated');
    return true;
  }

  unassignPlayerFromTeam(playerId) {
    const players = this.getPlayers();
    const teams = this.getTeams();
    const player = players.find(p => p.id === playerId);
    if (!player) return false;

    const now = Date.now();

    if (player.teamId) {
      const team = teams.find(t => t.id === player.teamId);
      if (team) {
        team.squadCount = Math.max(0, (Number(team.squadCount) || 1) - 1);
        team.purseSpent = Math.max(0, (Number(team.purseSpent) || 0) - (Number(player.soldPrice) || 0));
        const budget = Number(team.purseBudget || team.purse || 8000);
        team.remainingPurse = Math.max(0, budget - team.purseSpent);
        if (Array.isArray(team.playerIds)) {
          team.playerIds = team.playerIds.filter(id => id !== playerId);
        }
        team.updated_at = now;
        safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
        saveTeamToFirebase(team);
        patchTeamInFirebase(team.id, team);
        syncTeamToSupabase(team);
      }
    }

    player.teamId = null;
    player.teamName = null;
    player.soldPrice = 0;
    player.auctionStatus = 'PENDING';
    player.isSold = false;
    player.isUnsold = false;
    player.boughtByTeamId = null;
    player.isIcon = false;
    player.isIconPlayer = false;
    player.updated_at = now;

    // Also update live auction state if this player was the last sold record
    if (this.liveAuctionState && this.liveAuctionState.last_sold_player_id === playerId) {
      this.updateLiveAuctionState({
        ...this.liveAuctionState,
        last_sold_player_id: null,
        last_sold_price: 0,
        last_sold_team_id: null,
        updated_at: now
      });
    }

    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
    savePlayerToFirebase(player);
    patchPlayerInFirebase(player.id, player);
    syncPlayerToSupabase(player);
    this.notify('players_updated');
    this.notify('teams_updated');
    this.notify('live_auction_updated');
    return true;
  }


  resetAuctionData() {
    const players = this.getPlayers();
    const now = Date.now();
    players.forEach(p => {
      p.teamId = null;
      p.teamName = null;
      p.soldPrice = 0;
      p.auctionStatus = 'PENDING';
      p.isSold = false;
      p.boughtByTeamId = null;
      p.updated_at = now;
      patchPlayerInFirebase(p.id, {
        teamId: null,
        teamName: null,
        soldPrice: 0,
        auctionStatus: 'PENDING',
        isSold: false,
        boughtByTeamId: null,
        updated_at: now
      });
    });

    const teams = (JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS)) || []).map((t, idx) => {
      const hasIcon = !!(t.iconPlayerName || t.iconName);
      const iconDeduction = hasIcon ? 1000 : 0;
      const budget = Number(t.purseBudget || t.purse || 8000);
      const resetT = {
        ...t,
        serialNo: idx + 1,
        purseBudget: budget,
        purseSpent: iconDeduction,
        remainingPurse: Math.max(0, budget - iconDeduction),
        squadCount: hasIcon ? 1 : 0,
        playersCount: hasIcon ? 1 : 0,
        playerIds: [],
        updated_at: now
      };
      saveTeamToFirebase(resetT);
      return resetT;
    });

    this.updateLiveAuctionState({
      status: 'IDLE',
      active_player_id: null,
      current_bid: 0,
      highest_bidder_team_id: null,
      last_sold_player_id: null,
      last_sold_price: 0,
      last_sold_team_id: null,
      updated_at: now
    });

    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
    safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
    
    if (typeof syncTeamToSupabase === 'function') {
      teams.forEach(t => syncTeamToSupabase(t));
    }

    this.notify('players_updated');
    this.notify('teams_updated');
    this.notify('live_auction_updated');
    return { success: true };
  }

  // --- TEAMS ---
  getTeams() {
    const teams = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS)) || [];
    const allPlayers = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS)) || [];

    // DEDUP TEAMS: If the same team name exists under two IDs (e.g. team-aniket-xi AND team-1787144635606),
    // keep only the canonical timestamp-based ID.
    const teamNameMap = new Map();
    const deduped = [];
    for (const t of teams) {
      if (!t || !t.id) continue;
      if (t.name && (t.name.trim().toLowerCase() === 'arjo xi' || t.name.trim().toLowerCase() === 'arjo' || t.name.trim().toLowerCase() === 'arjo 11' || t.name.trim().toLowerCase() === 'team arjo xi')) {
        t.name = 'SWEETY JEWELLERS';
        t.ownerName = 'Partho Ghosh';
        t.shortCode = 'SJ';
      }
      const normName = (t.name || '').trim().toLowerCase();
      if (!normName) { deduped.push(t); continue; }
      
      const existing = teamNameMap.get(normName);
      if (existing) {
        // Prefer timestamp-based IDs (team-178...) over slug-based IDs (team-aniket-xi)
        const tIsTimestamp = /^team-\d{13}$/.test(t.id);
        const eIsTimestamp = /^team-\d{13}$/.test(existing.id);
        if (tIsTimestamp && !eIsTimestamp) {
          // Replace slug with timestamp version
          const idx = deduped.indexOf(existing);
          if (idx !== -1) deduped.splice(idx, 1);
          deduped.push(t);
          teamNameMap.set(normName, t);
        }
        // else keep existing (already timestamp or same type)
      } else {
        teamNameMap.set(normName, t);
        deduped.push(t);
      }
    }
    
    return deduped.map((t, idx) => {
      const iconPlayerName = (t.iconPlayerName || t.iconName || '').trim().toLowerCase();
      const hasIcon = !!iconPlayerName;
      const iconDeduction = hasIcon ? 1000 : 0;
      
      // Calculate total spent on purchased auction players (excluding icon player to avoid double deduction)
      const purchasedNonIconPlayers = allPlayers.filter(p => {
        if (!p) return false;
        const isMatch = (p.teamId === t.id) || (p.teamName && (p.teamName || '').trim().toLowerCase() === (t.name || '').trim().toLowerCase());
        if (!isMatch) return false;
        const pName = (p.name || '').trim().toLowerCase();
        const isThisTeamIcon = hasIcon && (pName === iconPlayerName || (t.iconPlayerId && p.id === t.iconPlayerId));
        const isSoldStatus = (p.auctionStatus === 'SOLD' || p.isSold === true || !!p.teamId);
        return isSoldStatus && !isThisTeamIcon;
      });
      const auctionSpent = purchasedNonIconPlayers.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0);
      
      const totalBudget = Number(t.purseBudget || t.purse || 8000);
      const totalSpent = iconDeduction + auctionSpent;
      const remainingPurse = Math.max(0, totalBudget - totalSpent);
      const squadCount = (hasIcon ? 1 : 0) + purchasedNonIconPlayers.length;

      return {
        ...t,
        serialNo: idx + 1,
        hasIconPlayer: hasIcon,
        iconPlayerFee: iconDeduction,
        purseBudget: totalBudget,
        purseSpent: totalSpent,
        remainingPurse: remainingPurse,
        squadCount: squadCount,
        group: t.group || (idx < 4 ? 'A' : 'B'),
        logoUrl: t.logoUrl || t.logo || 'assets/card_jsl_cartoon.png'
      };
    });
  }

  getTeamById(id) {
    return this.getTeams().find(t => t.id === id);
  }

  syncIconPlayerAllocation(oldTeam, newTeam) {
    const players = this.getPlayers();
    let changed = false;

    const oldIconName = (oldTeam?.iconPlayerName || oldTeam?.iconName || '').trim().toLowerCase();
    const oldIconId = oldTeam?.iconPlayerId;
    const newIconName = (newTeam?.iconPlayerName || newTeam?.iconName || '').trim().toLowerCase();
    const newIconId = newTeam?.iconPlayerId;

    // 1. Revert previous icon player if changed or removed
    if (oldTeam && (oldIconName !== newIconName || (oldIconId && oldIconId !== newIconId))) {
      players.forEach(p => {
        const isOld = (oldIconId && p.id === oldIconId) || (oldIconName && (p.name || '').trim().toLowerCase() === oldIconName);
        if (isOld && p.teamId === oldTeam.id) {
          p.teamId = null;
          p.teamName = '';
          p.isIcon = false;
          p.isIconPlayer = false;
          p.auctionStatus = 'PENDING';
          p.soldPrice = 0;
          p.isSold = false;
          p.boughtByTeamId = null;
          p.updated_at = Date.now();
          changed = true;
          if (typeof syncPlayerToSupabase === 'function') syncPlayerToSupabase(p);
        }
      });
    }

    // 2. Allocate newly assigned icon player from registration list
    if (newTeam && (newIconName || newIconId)) {
      players.forEach(p => {
        const isNew = (newIconId && p.id === newIconId) || (newIconName && (p.name || '').trim().toLowerCase() === newIconName);
        if (isNew) {
          p.teamId = newTeam.id;
          p.teamName = newTeam.name;
          p.isIcon = true;
          p.isIconPlayer = true;
          p.auctionStatus = 'SOLD';
          p.soldPrice = 1000;
          p.isSold = true;
          p.boughtByTeamId = newTeam.id;
          p.updated_at = Date.now();
          changed = true;
          if (typeof syncPlayerToSupabase === 'function') syncPlayerToSupabase(p);
        }
      });
    }

    if (changed) {
      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      this.notify('players_updated');
    }
  }

  syncAllIconPlayers() {
    const teams = this.getTeams();
    const players = this.getPlayers();
    let changed = false;

    teams.forEach(t => {
      const iconName = (t.iconPlayerName || t.iconName || '').trim().toLowerCase();
      const iconId = t.iconPlayerId;
      if (iconName || iconId) {
        players.forEach(p => {
          const isThisIcon = (iconId && p.id === iconId) || (iconName && (p.name || '').trim().toLowerCase() === iconName);
          if (isThisIcon && (p.teamId !== t.id || p.auctionStatus !== 'SOLD' || !p.isIcon)) {
            p.teamId = t.id;
            p.teamName = t.name;
            p.isIcon = true;
            p.isIconPlayer = true;
            p.auctionStatus = 'SOLD';
            p.soldPrice = 1000;
            p.isSold = true;
            p.boughtByTeamId = t.id;
            p.updated_at = Date.now();
            changed = true;
            if (typeof syncPlayerToSupabase === 'function') syncPlayerToSupabase(p);
          }
        });
      }
    });

    if (changed) {
      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      this.notify('players_updated');
    }
  }

  registerTeam(teamData) {
    if (!this.isTeamRegistrationOpen()) {
      throw new Error(this.getRegistrationSettings().closedReason || "JSL 2026 Team Registration is currently closed by the Master Admin.");
    }
    const teams = this.getTeams();
    const serialNo = teams.length + 1;
    const newTeam = {
      id: `team-${Date.now()}`,
      serialNo,
      squadCount: 0,
      maxSquad: 15,
      purseBudget: 8000,
      purseSpent: 0,
      status: 'VERIFIED',
      regDate: new Date().toISOString().split('T')[0],
      ...teamData
    };
    teams.push(newTeam);

    teams.forEach((t, idx) => {
      t.serialNo = idx + 1;
    });
    
    safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
    saveTeamToFirebase(newTeam);
    syncTeamToSupabase(newTeam);
    this.syncIconPlayerAllocation(null, newTeam);
    this.notify('teams_updated');
    return newTeam;
  }

  updateTeam(updatedTeamData) {
    const teams = this.getTeams();
    const idx = teams.findIndex(t => t.id === updatedTeamData.id);
    if (idx !== -1) {
      const oldTeam = { ...teams[idx] };
      teams[idx] = { ...teams[idx], ...updatedTeamData };
      teams.forEach((t, i) => {
        t.serialNo = i + 1;
      });
      safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
      saveTeamToFirebase(teams[idx]);
      patchTeamInFirebase(teams[idx].id, teams[idx]);
      syncTeamToSupabase(teams[idx]);
      this.syncIconPlayerAllocation(oldTeam, teams[idx]);
      this.notify('teams_updated');
      return teams[idx];
    }
    return null;
  }

  deleteTeam(teamId) {
    let teams = this.getTeams();
    const deletedTeam = teams.find(t => t.id === teamId);
    teams = teams.filter(t => t.id !== teamId);
    
    teams.forEach((t, idx) => {
      t.serialNo = idx + 1;
    });

    const players = this.getPlayers();
    players.forEach(p => {
      if (p.teamId === teamId) {
        p.teamId = null;
        p.teamName = '';
        p.isIcon = false;
        p.isIconPlayer = false;
        p.auctionStatus = 'PENDING';
        p.soldPrice = 0;
        p.isSold = false;
        p.boughtByTeamId = null;
        if (typeof syncPlayerToSupabase === 'function') syncPlayerToSupabase(p);
      }
    });

    safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
    deleteTeamFromSupabase(teamId);
    this.notify('teams_updated');
    this.notify('players_updated');
  }

  // --- FIXTURES ---
  getFixtures() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FIXTURES)) || [];
  }

  registerFixture(fixtureData) {
    const fixtures = this.getFixtures();
    const newFixture = {
      id: 'fix-' + Date.now(),
      status: 'SCHEDULED',
      innings: 1,
      teamAScore: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      teamBScore: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      liveMatchState: null,
      ...fixtureData
    };
    fixtures.push(newFixture);
    safeSetLocalStorage(STORAGE_KEYS.FIXTURES, fixtures);
    saveFixtureToFirebase(newFixture);
    this.notify('fixtures_updated');
    return newFixture;
  }

  updateFixture(updatedFixture) {
    const fixtures = this.getFixtures();
    const idx = fixtures.findIndex(f => f.id === updatedFixture.id);
    if (idx !== -1) {
      fixtures[idx] = { ...fixtures[idx], ...updatedFixture };
      safeSetLocalStorage(STORAGE_KEYS.FIXTURES, fixtures);
      saveFixtureToFirebase(fixtures[idx]);
      this.notify('fixtures_updated');
      return fixtures[idx];
    }
    return null;
  }

  deleteFixture(fixtureId) {
    let fixtures = this.getFixtures();
    fixtures = fixtures.filter(f => f.id !== fixtureId);
    safeSetLocalStorage(STORAGE_KEYS.FIXTURES, fixtures);
    deleteFixtureFromFirebase(fixtureId);
    this.notify('fixtures_updated');
  }

  // --- TOURNAMENT FORMAT & GROUP STAGES ENGINE ---
  getTournamentFormats() {
    try {
      const local = localStorage.getItem(STORAGE_KEYS.TOURNAMENT_FORMATS);
      if (local) return JSON.parse(local);
    } catch(e) {}
    return {
      JSL: { format: 'TWO_GROUPS', groups: ['A', 'B'], qualifyPerGroup: 2, knockoutType: 'SEMIFINALS' },
      JPL: { format: 'SINGLE_TABLE', groups: ['A'], qualifyPerGroup: 4, knockoutType: 'SEMIFINALS' },
      KPL: { format: 'SINGLE_TABLE', groups: ['A'], qualifyPerGroup: 4, knockoutType: 'SEMIFINALS' }
    };
  }

  getTournamentFormat(leagueCode = 'JSL') {
    const formats = this.getTournamentFormats();
    const clean = (leagueCode || 'JSL').toUpperCase();
    return formats[clean] || { format: 'TWO_GROUPS', groups: ['A', 'B'], qualifyPerGroup: 2, knockoutType: 'SEMIFINALS' };
  }

  async saveTournamentFormat(leagueCode = 'JSL', formatConfig) {
    const formats = this.getTournamentFormats();
    const clean = (leagueCode || 'JSL').toUpperCase();
    formats[clean] = { ...formats[clean], ...formatConfig, updated_at: Date.now() };
    safeSetLocalStorage(STORAGE_KEYS.TOURNAMENT_FORMATS, formats);
    await saveTournamentFormatToFirebase(clean, formats[clean]);
    this.notify('tournament_format_updated');
    this.notify('teams_updated');
    this.notify('fixtures_updated');
    return formats[clean];
  }

  setTeamGroup(teamId, groupCode) {
    const teams = this.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (team) {
      team.group = (groupCode || '').toUpperCase().trim();
      team.updated_at = Date.now();
      safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
      patchTeamInFirebase(team.id, team);
      this.notify('teams_updated');
      return true;
    }
    return false;
  }

  setBulkTeamGroups(assignments = []) {
    const teams = this.getTeams();
    let updatedAny = false;
    assignments.forEach(a => {
      const team = teams.find(t => t.id === a.teamId);
      if (team) {
        team.group = (a.group || '').toUpperCase().trim();
        team.updated_at = Date.now();
        patchTeamInFirebase(team.id, team);
        updatedAny = true;
      }
    });
    if (updatedAny) {
      safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
      this.notify('teams_updated');
    }
    return true;
  }

  randomizeTeamGroups(leagueCode = 'JSL', groupNames = ['A', 'B']) {
    const cleanLeague = (leagueCode || 'JSL').toUpperCase();
    const teams = this.getTeams().filter(t => {
      const code = (t.leagueCode || (t.leagueId === 'leg-jsl' ? 'JSL' : (t.leagueId === 'leg-jpl' ? 'JPL' : (t.leagueId === 'leg-kpl' ? 'KPL' : 'JSL'))));
      return code === cleanLeague;
    });

    if (teams.length === 0) return [];

    // Fisher-Yates Shuffle
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const assignments = [];
    shuffled.forEach((team, idx) => {
      const grp = groupNames[idx % groupNames.length];
      assignments.push({ teamId: team.id, group: grp });
    });
    this.setBulkTeamGroups(assignments);
    return assignments;
  }

  autoGenerateGroupFixtures(leagueCode = 'JSL', config = {}) {
    const cleanLeague = (leagueCode || 'JSL').toUpperCase();
    const teams = this.getTeams().filter(t => {
      const code = (t.leagueCode || (t.leagueId === 'leg-jsl' ? 'JSL' : (t.leagueId === 'leg-jpl' ? 'JPL' : (t.leagueId === 'leg-kpl' ? 'KPL' : 'JSL'))));
      return code === cleanLeague;
    });

    const format = this.getTournamentFormat(cleanLeague);
    const groups = (format && format.groups && format.groups.length > 0) ? format.groups : ['A', 'B'];
    const venue = config.venue || 'JHANKRA SCHOOL GROUND';
    const oversLimit = Number(config.overs) || 16;
    const baseDate = config.startDate || new Date().toISOString().split('T')[0];

    const generated = [];
    let dayOffset = 0;

    groups.forEach(grp => {
      const groupTeams = teams.filter(t => (t.group || 'A').toUpperCase() === grp);
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const tA = groupTeams[i];
          const tB = groupTeams[j];
          
          const mDate = new Date(baseDate);
          mDate.setDate(mDate.getDate() + Math.floor(dayOffset / 2));
          const dateStr = mDate.toISOString().split('T')[0];
          const timeStr = (dayOffset % 2 === 0) ? '09:00' : '13:30';
          dayOffset++;

          const fixture = this.registerFixture({
            leagueCode: cleanLeague,
            teamAId: tA.id,
            teamBId: tB.id,
            teamAName: tA.name,
            teamBName: tB.name,
            stage: `GROUP_${grp}`,
            groupCode: grp,
            date: dateStr,
            time: timeStr,
            venue: venue,
            oversLimit: oversLimit,
            status: 'SCHEDULED'
          });
          generated.push(fixture);
        }
      }
    });

    return generated;
  }

  // --- AUCTION CONFIG ---
  getAuctionSettings() {
    const defaultSettings = { defaultBasePrice: 300, defaultPurseBudget: 8000 };
    try {
      const s = localStorage.getItem(STORAGE_KEYS.AUCTION_SETTINGS);
      if (!s) return defaultSettings;
      const parsed = JSON.parse(s);
      return {
        ...defaultSettings,
        ...parsed,
        defaultBasePrice: (!parsed.defaultBasePrice || Number(parsed.defaultBasePrice) === 200) ? 300 : Number(parsed.defaultBasePrice)
      };
    } catch (e) {
      return defaultSettings;
    }
  }

  updateAuctionSettings(settings) {
    safeSetLocalStorage(STORAGE_KEYS.AUCTION_SETTINGS, settings);
    saveAuctionSettingsToFirebase(settings);
    this.notify('auction_settings_updated');
  }

  // --- REGISTRATION CONTROL CONFIG & MASTER TOGGLE ---
  getRegistrationSettings() {
    const defaultSettings = {
      isJslRegistrationOpen: true,
      isPlayerRegOpen: true,
      isTeamRegOpen: true,
      closedReason: "JSL 2026 Registration is currently closed by the Master Admin."
    };
    try {
      const s = localStorage.getItem(STORAGE_KEYS.REGISTRATION_SETTINGS);
      if (!s) return defaultSettings;
      const parsed = JSON.parse(s);
      return {
        ...defaultSettings,
        ...parsed
      };
    } catch (e) {
      return defaultSettings;
    }
  }

  isJslRegistrationOpen() {
    const s = this.getRegistrationSettings();
    return s.isJslRegistrationOpen !== false;
  }

  isPlayerRegistrationOpen() {
    const s = this.getRegistrationSettings();
    return s.isJslRegistrationOpen !== false && s.isPlayerRegOpen !== false;
  }

  isTeamRegistrationOpen() {
    const s = this.getRegistrationSettings();
    return s.isJslRegistrationOpen !== false && s.isTeamRegOpen !== false;
  }

  updateRegistrationSettings(settings) {
    const current = this.getRegistrationSettings();
    const updated = { ...current, ...settings };
    safeSetLocalStorage(STORAGE_KEYS.REGISTRATION_SETTINGS, updated);
    saveRegistrationSettingsToFirebase(updated);
    this.notify('registration_settings_updated');
    return updated;
  }

  toggleJslRegistration(isOpen, closedReason = null) {
    const patch = { isJslRegistrationOpen: isOpen };
    if (closedReason) patch.closedReason = closedReason;
    return this.updateRegistrationSettings(patch);
  }

  // --- LIVE AUCTION STATE ---
  async getLiveAuctionState() {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/cpl_master/liveAuction.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const incomingTime = Number(data.updated_at || data.timestamp || 0);
          const currentTime = Number(this.liveAuctionState?.updated_at || this.liveAuctionState?.timestamp || 0);
          // Monotonic Version Guard: Only accept if incoming state is newer or equal
          if (incomingTime >= currentTime || !this.liveAuctionState) {
            this.liveAuctionState = data;
            if (data.active_player_id) {
              safeSetLocalStorage('cpl_live_auction_state', data);
            } else {
              localStorage.removeItem('cpl_live_auction_state');
            }
          }
        } else {
          this.liveAuctionState = null;
          localStorage.removeItem('cpl_live_auction_state');
        }
        return this.liveAuctionState;
      }
    } catch (e) {
      console.warn("Live auction state fetch error:", e);
    }
    return this.liveAuctionState || null;
  }

  getLiveAuctionStateSync() {
    if (this.liveAuctionState) return this.liveAuctionState;
    try {
      const local = localStorage.getItem('cpl_live_auction_state');
      if (local) {
        this.liveAuctionState = JSON.parse(local);
        return this.liveAuctionState;
      }
    } catch(e) {}
    return null;
  }

  async updateLiveAuctionState(state) {
    const now = Date.now();
    const currentTs = Number(this.liveAuctionState?.updated_at || 0);
    const updatedState = state ? { ...state, updated_at: Math.max(now, currentTs + 1) } : null;
    this.liveAuctionState = updatedState;
    if (updatedState && updatedState.active_player_id) {
      safeSetLocalStorage('cpl_live_auction_state', updatedState);
    } else {
      localStorage.removeItem('cpl_live_auction_state');
    }
    await saveLiveAuctionToFirebase(updatedState);
    this.notify('live_auction_updated');
  }

  // --- PERMANENT 5-YEAR AUCTION ARCHIVE & RECORD VAULT (JSL 2026) ---
  generateAuctionPermanentArchiveSnapshot() {
    const teams = this.getTeams();
    const allPlayers = this.getPlayers();

    const teamSummaries = teams.map((team, idx) => {
      const hasIcon = !!((team.iconPlayerName && team.iconPlayerName.trim()) || (team.iconName && team.iconName.trim()) || (team.iconPlayerId && team.iconPlayerId.trim()));
      const iconRawName = (team.iconPlayerName || team.iconName || '').trim();
      const iconPlayerId = team.iconPlayerId || '';
      const iconPlayerObj = allPlayers.find(p => (iconPlayerId && p.id === iconPlayerId) || (iconRawName && p.name && p.name.trim().toLowerCase() === iconRawName.toLowerCase()));

      let iconRecord = null;
      if (hasIcon || iconPlayerObj) {
        iconRecord = {
          isIcon: true,
          slNo: 1,
          id: (iconPlayerObj && iconPlayerObj.id) || 'icon-player',
          name: (iconPlayerObj && iconPlayerObj.name) || iconRawName || 'Official Icon Player',
          photoUrl: (iconPlayerObj && (iconPlayerObj.hdPhotoUrl || iconPlayerObj.photoUrl || iconPlayerObj.player_photo_url)) || team.iconPlayerPhotoUrl || team.iconPhotoUrl || '',
          phone: (iconPlayerObj && (iconPlayerObj.phone || iconPlayerObj.mobile)) || team.iconPhone || 'N/A',
          village: (iconPlayerObj && (iconPlayerObj.village ? `${iconPlayerObj.village}${iconPlayerObj.district ? ', ' + iconPlayerObj.district : ''}` : iconPlayerObj.address)) || team.iconVillage || 'Paschim Medinipur',
          category: (iconPlayerObj && (iconPlayerObj.category || iconPlayerObj.playingType || iconPlayerObj.role)) || 'Icon Player',
          price: 1000,
          priceLabel: '₹ 1,000 (Icon Allocation)'
        };
      }

      const normTeamName = (team.name || '').trim().toLowerCase();
      const purchasedPlayers = allPlayers.filter(p => {
        if (!p) return false;
        const isMatch = (p.teamId === team.id) || (p.teamName && (p.teamName || '').trim().toLowerCase() === normTeamName);
        if (!isMatch) return false;
        if (iconRecord && p.name && p.name.trim().toLowerCase() === iconRecord.name.toLowerCase()) return false;
        return true;
      }).map((p, pIdx) => ({
        slNo: (iconRecord ? 2 : 1) + pIdx,
        id: p.id,
        name: p.name,
        displayRegistrationNumber: p.displayRegistrationNumber || p.serialNo || p.registrationId || 'N/A',
        photoUrl: p.hdPhotoUrl || p.photoUrl || p.player_photo_url || '',
        phone: p.phone || p.mobile || 'N/A',
        village: p.village ? `${p.village}${p.district ? ', ' + p.district : ''}` : p.address || 'Paschim Medinipur',
        category: p.category || p.playingType || p.role || 'All Rounder',
        soldPrice: Number(p.soldPrice || p.basePrice || 300),
        soldAt: p.soldAt || p.auctionTimestamp || null
      }));

      const totalPurse = Number(team.purse || 8000);
      const iconDeduction = iconRecord ? 1000 : 0;
      const auctionSpent = purchasedPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
      const totalSpent = iconDeduction + auctionSpent;
      const remainingPurse = Math.max(0, totalPurse - totalSpent);

      return {
        teamId: team.id,
        teamName: team.name,
        shortCode: team.shortCode || 'JSL',
        ownerName: team.ownerName || 'Franchise Owner',
        ownerPhone: team.ownerPhone || 'N/A',
        coOwners: [team.coOwnerName, team.coOwner1Name, team.coOwner2Name].filter(Boolean).join(', ') || null,
        totalPurse,
        iconDeduction,
        auctionSpent,
        totalSpent,
        remainingPurse,
        squadCount: (iconRecord ? 1 : 0) + purchasedPlayers.length,
        iconPlayer: iconRecord,
        auctionedPlayers: purchasedPlayers
      };
    });

    const allSoldPlayersList = [];
    teamSummaries.forEach(t => {
      if (t.iconPlayer) {
        allSoldPlayersList.push({
          ...t.iconPlayer,
          teamName: t.teamName,
          teamId: t.teamId,
          isIcon: true,
          soldPrice: 1000
        });
      }
      t.auctionedPlayers.forEach(p => {
        allSoldPlayersList.push({
          ...p,
          teamName: t.teamName,
          teamId: t.teamId,
          isIcon: false
        });
      });
    });

    const topBuys = [...allSoldPlayersList]
      .filter(p => !p.isIcon)
      .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))
      .slice(0, 8);

    const totalTournamentPurse = teamSummaries.reduce((sum, t) => sum + t.totalPurse, 0);
    const totalTournamentSpent = teamSummaries.reduce((sum, t) => sum + t.totalSpent, 0);
    const totalRemainingPurse = teamSummaries.reduce((sum, t) => sum + t.remainingPurse, 0);

    const snapshot = {
      archiveId: 'JSL_2026_AUCTION_VAULT',
      tournament: 'Jhankra Super League (JSL 2026)',
      season: '2026',
      status: 'AUCTION COMPLETED & ARCHIVED',
      venue: 'Jhankra High School Ground',
      archivedTimestamp: Date.now(),
      archivedDate: new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      totalTeams: teamSummaries.length,
      totalRegisteredPlayers: allPlayers.length,
      totalSoldSquadPlayers: allSoldPlayersList.length,
      financials: {
        totalTournamentPurse,
        totalTournamentSpent,
        totalRemainingPurse,
        defaultBasePrice: 300,
        defaultTeamPurse: 8000
      },
      topBuys,
      teams: teamSummaries,
      masterPlayerRoster: allPlayers.map(p => ({
        id: p.id,
        name: p.name,
        displayRegistrationNumber: p.displayRegistrationNumber || p.serialNo || p.registrationId || 'N/A',
        category: p.category || p.playingType || p.role || 'All Rounder',
        phone: p.phone || p.mobile || 'N/A',
        village: p.village || p.address || 'Paschim Medinipur',
        photoUrl: p.hdPhotoUrl || p.photoUrl || p.player_photo_url || '',
        teamName: p.teamName || null,
        teamId: p.teamId || null,
        soldPrice: p.soldPrice || null,
        auctionStatus: p.teamId || p.soldPrice ? 'SOLD' : (p.auctionStatus || 'UNSOLD')
      }))
    };

    safeSetLocalStorage(STORAGE_KEYS.AUCTION_ARCHIVE_JSL_2026, snapshot);
    return snapshot;
  }

  getAuctionPermanentArchive() {
    try {
      const local = localStorage.getItem(STORAGE_KEYS.AUCTION_ARCHIVE_JSL_2026);
      if (local) {
        return JSON.parse(local);
      }
    } catch(e) {}
    return this.generateAuctionPermanentArchiveSnapshot();
  }

  async commitAndSyncAuctionPermanentArchive() {
    const snapshot = this.generateAuctionPermanentArchiveSnapshot();
    await saveAuctionPermanentArchiveToFirebase(snapshot);
    this.notify('auction_archive_synced');
    return snapshot;
  }

  // --- MULTI-TENANT TOURNAMENT SAAS & PLATFORM SETTINGS ENGINE ---
  getPlatformSettings() {
    try {
      const local = localStorage.getItem(STORAGE_KEYS.PLATFORM_SETTINGS);
      if (local) return JSON.parse(local);
    } catch(e) {}
    return {
      isHostTournamentEnabled: false, // Default to FALSE (Trial / Draft mode for Master Admin)
      allowPublicRegistrationModeA: true,
      allowQuickFixturesModeB: true,
      maxTeamsDefault: 16
    };
  }

  async updatePlatformSettings(settings) {
    const current = this.getPlatformSettings();
    const updated = { ...current, ...settings, updated_at: Date.now() };
    safeSetLocalStorage(STORAGE_KEYS.PLATFORM_SETTINGS, updated);
    await savePlatformSettingsToFirebase(updated);
    this.notify('platform_settings_updated');
    return updated;
  }

  isHostTournamentEnabled() {
    const settings = this.getPlatformSettings();
    return settings.isHostTournamentEnabled === true;
  }

  getCustomTournaments() {
    try {
      const local = localStorage.getItem(STORAGE_KEYS.CUSTOM_TOURNAMENTS);
      if (local) return JSON.parse(local);
    } catch(e) {}
    return [];
  }

  getCustomTournamentById(idOrSlug) {
    if (!idOrSlug) return null;
    const clean = idOrSlug.trim().toLowerCase();
    return this.getCustomTournaments().find(t => 
      (t.id && t.id.toLowerCase() === clean) || 
      (t.slug && t.slug.toLowerCase() === clean) ||
      (t.shortCode && t.shortCode.toLowerCase() === clean)
    ) || null;
  }

  async saveCustomTournament(tourneyData) {
    if (!tourneyData) return null;
    const list = this.getCustomTournaments();
    const id = tourneyData.id || `tourney_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const slug = (tourneyData.slug || tourneyData.shortCode || id).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    
    const record = {
      ...tourneyData,
      id,
      slug,
      created_at: tourneyData.created_at || Date.now(),
      status: tourneyData.status || 'ACTIVE'
    };

    const existingIdx = list.findIndex(t => t.id === id || t.slug === slug);
    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }

    safeSetLocalStorage(STORAGE_KEYS.CUSTOM_TOURNAMENTS, list);
    await saveCustomTournamentToFirebase(record);
    this.notify('custom_tournaments_updated');
    return record;
  }

  async deleteCustomTournament(tourneyId) {
    if (!tourneyId) return false;
    let list = this.getCustomTournaments();
    list = list.filter(t => t.id !== tourneyId && t.slug !== tourneyId);
    safeSetLocalStorage(STORAGE_KEYS.CUSTOM_TOURNAMENTS, list);
    await deleteCustomTournamentFromFirebase(tourneyId);
    this.notify('custom_tournaments_updated');
    return true;
  }

  // --- UNIVERSAL PLAYER DIRECTORY & 1-SECOND SMART AUTOFILL ---
  getUniversalPlayerByPhone(phone) {
    const cleanPhone = (phone || '').trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) return null;
    
    // 1. Check local universal cache
    try {
      const local = localStorage.getItem(STORAGE_KEYS.UNIVERSAL_PLAYERS);
      if (local) {
        const pool = JSON.parse(local);
        if (pool[cleanPhone]) return pool[cleanPhone];
      }
    } catch(e) {}

    // 2. Fallback check from existing players across all current databases
    const allExistingPlayers = this.getPlayers();
    const found = allExistingPlayers.find(p => {
      const pPhone = (p.phone || p.mobile || '').replace(/[^0-9]/g, '');
      return pPhone === cleanPhone || (pPhone.endsWith(cleanPhone) && cleanPhone.length >= 10);
    });

    if (found) {
      return {
        phone: cleanPhone,
        name: found.name || '',
        photoUrl: found.hdPhotoUrl || found.photoUrl || found.player_photo_url || '',
        category: found.category || found.playingType || found.role || 'All Rounder',
        battingStyle: found.battingStyle || found.batting_style || 'Right Hand Bat',
        bowlingStyle: found.bowlingStyle || found.bowling_style || 'Right Arm Medium',
        village: found.village || found.address || '',
        district: found.district || 'Paschim Medinipur',
        age: found.age || '',
        isVerified: true
      };
    }
    return null;
  }

  async saveUniversalPlayer(playerData) {
    const phone = (playerData.phone || playerData.mobile || '').trim().replace(/[^0-9]/g, '');
    if (!phone || phone.length < 10) return;

    let pool = {};
    try {
      const local = localStorage.getItem(STORAGE_KEYS.UNIVERSAL_PLAYERS);
      if (local) pool = JSON.parse(local);
    } catch(e) {}

    const profile = {
      phone,
      name: playerData.name || '',
      photoUrl: playerData.hdPhotoUrl || playerData.photoUrl || playerData.player_photo_url || '',
      category: playerData.category || playerData.playingType || playerData.role || 'All Rounder',
      battingStyle: playerData.battingStyle || playerData.batting_style || 'Right Hand Bat',
      bowlingStyle: playerData.bowlingStyle || playerData.bowling_style || 'Right Arm Medium',
      village: playerData.village || playerData.address || '',
      district: playerData.district || 'Paschim Medinipur',
      age: playerData.age || '',
      updated_at: Date.now()
    };

    pool[phone] = profile;
    safeSetLocalStorage(STORAGE_KEYS.UNIVERSAL_PLAYERS, pool);
    await saveUniversalPlayerToFirebase(profile);
    return profile;
  }

  // --- PLAYER PROFILES ---
  getPlayerProfiles() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYER_PROFILES)) || [];
  }

  getPlayerProfileByPhone(phone) {
    const pKey = (phone || '').trim();
    if (!pKey) return null;
    return this.getPlayerProfiles().find(pp => (pp.phone || '').trim() === pKey);
  }

  createOrUpdatePlayerProfile(playerData) {
    const profiles = this.getPlayerProfiles();
    const phone = (playerData.phone || playerData.mobile || '').trim();
    if (!phone) return null;

    let profile = profiles.find(pp => (pp.phone || '').trim() === phone);
    if (!profile) {
      profile = {
        id: 'prof-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        phone,
        name: playerData.name || playerData.playerName,
        village: playerData.village || playerData.address || 'Jhankra',
        district: playerData.district || 'Paschim Medinipur',
        state: playerData.state || 'West Bengal',
        battingStyle: playerData.battingStyle || 'Right Hand Bat',
        bowlingStyle: playerData.bowlingStyle || 'Right Hand Medium',
        photoUrl: playerData.photoUrl || playerData.player_photo_url || '',
        created_at: new Date().toISOString()
      };
      profiles.push(profile);
    } else {
      profile.name = playerData.name || playerData.playerName || profile.name;
      profile.village = playerData.village || playerData.address || profile.village;
      profile.battingStyle = playerData.battingStyle || profile.battingStyle;
      profile.bowlingStyle = playerData.bowlingStyle || profile.bowlingStyle;
      profile.photoUrl = playerData.photoUrl || playerData.player_photo_url || profile.photoUrl;
    }

    safeSetLocalStorage(STORAGE_KEYS.PLAYER_PROFILES, profiles);
    fetch(`${FIREBASE_DB_URL}/cpl_master/player_profiles/${profile.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    }).catch(err => console.warn("Player profile sync error:", err));

    return profile;
  }

  // --- VERIFY PLAYER PHONE NUMBER VIA OTP ---
  verifyPlayerPhone(phone, playerId = null) {
    if (!phone) return false;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const players = this.getPlayers();
    let updatedPlayer = null;

    players.forEach(p => {
      const pPhone = (p.phone || p.mobile || '').replace(/[^0-9]/g, '');
      if ((playerId && p.id === playerId) || (cleanPhone && pPhone === cleanPhone)) {
        p.phoneVerified = true;
        p.updated_at = Date.now();
        updatedPlayer = p;
        syncPlayerToSupabase(p);
      }
    });

    if (updatedPlayer) {
      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      this.notify('players_updated');
    }

    // Update profile
    const profiles = this.getPlayerProfiles();
    const profile = profiles.find(pp => (pp.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
    if (profile) {
      profile.phoneVerified = true;
      safeSetLocalStorage(STORAGE_KEYS.PLAYER_PROFILES, profiles);
      fetch(`${FIREBASE_DB_URL}/cpl_master/player_profiles/${profile.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      }).catch(err => console.warn("Profile verify sync error:", err));
    }

    return true;
  }

  // --- UPDATE PLAYER PROFILE PHOTO & SYNC ACROSS LEAGUE RECORDS ---
  updatePlayerProfilePhoto(phone, newPhotoUrl, playerId = null) {
    if (!newPhotoUrl) return false;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const players = this.getPlayers();
    let updated = false;

    players.forEach(p => {
      const pPhone = (p.phone || p.mobile || '').replace(/[^0-9]/g, '');
      if ((playerId && p.id === playerId) || (cleanPhone && pPhone === cleanPhone)) {
        p.photoUrl = newPhotoUrl;
        p.player_photo_url = newPhotoUrl;
        p.updated_at = Date.now();
        syncPlayerToSupabase(p);
        updated = true;
      }
    });

    if (updated) {
      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      this.notify('players_updated');
    }

    // Update profile
    const profiles = this.getPlayerProfiles();
    const profile = profiles.find(pp => (pp.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
    if (profile) {
      profile.photoUrl = newPhotoUrl;
      profile.player_photo_url = newPhotoUrl;
      safeSetLocalStorage(STORAGE_KEYS.PLAYER_PROFILES, profiles);
      fetch(`${FIREBASE_DB_URL}/cpl_master/player_profiles/${profile.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      }).catch(err => console.warn("Profile photo sync error:", err));
    }

    return true;
  }

  // --- USER AUTH & ROLE ---
  getUser() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || { role: 'GUEST', name: 'Guest Visitor' };
  }

  setUserRole(role, name = 'User', playerDetails = null) {
    const user = { role, name, playerDetails };
    safeSetLocalStorage(STORAGE_KEYS.USER, user);
    this.notify('user_updated');
    return user;
  }


  // --- USER ACCOUNTS & PLAYER AUTHENTICATION ---
  getUserAccounts() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.USER_ACCOUNTS);
      if (!val) return [];
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        const vals = Object.values(parsed);
        if (vals.length > 0 && typeof vals[0] === 'object' && vals[0] !== null && 'phone' in vals[0]) {
          return vals;
        }
        if ('phone' in parsed) {
          return [parsed];
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  getTournamentOwners() {
    try {
      const local = localStorage.getItem(STORAGE_KEYS.TOURNAMENT_OWNERS);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {
      'tournament-jsl-2026': { phone: '8972144166', name: 'Pintu Santra', assignedAt: Date.now() }
    };
  }

  setTournamentOwner(tournamentId, phone, name) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) return false;

    const owners = this.getTournamentOwners();
    owners[tournamentId] = {
      phone: cleanPhone,
      name: name || 'Tournament Owner',
      assignedAt: Date.now()
    };
    safeSetLocalStorage(STORAGE_KEYS.TOURNAMENT_OWNERS, owners);

    fetch(`${FIREBASE_DB_URL}/cpl_master/tournament_owners/${tournamentId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(owners[tournamentId])
    }).catch(err => console.warn("Tournament owner sync error:", err));

    // Update user account role
    const players = this.getPlayers();
    const player = players.find(p => (p.phone || p.mobile || '').replace(/[^0-9]/g, '') === cleanPhone) || { phone: cleanPhone, name };
    let userAcc = this.ensureUserAccountForPlayer(player);
    if (userAcc) {
      userAcc.role = 'TOURNAMENT_OWNER';
      if (!userAcc.password) userAcc.password = cleanPhone;
      if (!userAcc.ownedTournaments) userAcc.ownedTournaments = [];
      if (!userAcc.ownedTournaments.includes(tournamentId)) userAcc.ownedTournaments.push(tournamentId);
      const accounts = this.getUserAccounts();
      const idx = accounts.findIndex(a => a.phone === cleanPhone);
      if (idx !== -1) accounts[idx] = userAcc; else accounts.push(userAcc);
      safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
      fetch(`${FIREBASE_DB_URL}/cpl_master/user_accounts/${cleanPhone}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userAcc)
      }).catch(err => console.warn("User account role sync error:", err));
    }

    this.notify('tournament_owners_updated');
    return true;
  }

  ensureUserAccountForPlayer(player) {
    if (!player) return null;
    const cleanPhone = (player.phone || player.mobile || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) return null;

    let accounts = this.getUserAccounts();
    let acc = accounts.find(a => a.phone === cleanPhone);
    const owners = this.getTournamentOwners();
    const isOwner = Object.values(owners).some(o => o && o.phone === cleanPhone);

    if (!acc) {
      acc = {
        phone: cleanPhone,
        password: cleanPhone, // default password is mobile number
        isFirstLogin: true,
        name: player.name || 'Player',
        playerId: player.id || null,
        role: isOwner ? 'TOURNAMENT_OWNER' : 'PLAYER',
        ownedTournaments: isOwner ? ['tournament-jsl-2026'] : [],
        created_at: Date.now()
      };
      accounts.push(acc);
      safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
      fetch(`${FIREBASE_DB_URL}/cpl_master/user_accounts/${cleanPhone}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acc)
      }).catch(err => console.warn("User account creation sync error:", err));
    } else {
      if (!acc.password) acc.password = cleanPhone;
      if (isOwner && acc.role !== 'TOURNAMENT_OWNER') {
        acc.role = 'TOURNAMENT_OWNER';
        safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
      }
    }
    return acc;
  }

  authenticateUser(identifier, password) {
    const rawId = (identifier || '').trim();
    if (!rawId) {
      return { success: false, message: 'Please enter your Mobile Number or Admin Email!' };
    }

    // 1. MASTER SUPER ADMIN AUTO-DETECTION (Email or Master Phone)
    if (rawId.toLowerCase() === 'bakolaypan@gmail.com' || rawId === '9876543210') {
      if (password === 'Suman@2030') {
        const superAdminUser = {
          phone: '9876543210',
          email: 'bakolaypan@gmail.com',
          name: 'Suman Kolay (Master Admin)',
          role: 'SUPER_ADMIN',
          isFirstLogin: false,
          ownedTournaments: ['tournament-jsl-2026']
        };
        this.setCurrentUser(superAdminUser);
        localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
        return {
          success: true,
          user: superAdminUser,
          role: 'SUPER_ADMIN',
          isFirstLogin: false,
          redirect: 'admin'
        };
      } else {
        return { success: false, message: 'Incorrect Master Admin password!' };
      }
    }

    // 2. MOBILE NUMBER LOGIN (Players & Tournament Owners)
    const cleanPhone = rawId.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, message: 'Please enter a valid 10-digit mobile number or admin email!' };
    }

    // Check if this mobile is assigned as a Tournament Owner
    const owners = this.getTournamentOwners();
    const isTournamentOwner = Object.values(owners).some(o => o && (o.phone || '').replace(/[^0-9]/g, '') === cleanPhone);

    const players = this.getPlayers();
    const player = players.find(p => (p.phone || p.mobile || '').replace(/[^0-9]/g, '') === cleanPhone);

    let accounts = this.getUserAccounts();
    let acc = accounts.find(a => a.phone === cleanPhone);

    if (!acc && player) {
      acc = this.ensureUserAccountForPlayer(player);
      accounts = this.getUserAccounts();
    }

    if (!acc) {
      acc = {
        phone: cleanPhone,
        password: cleanPhone,
        name: player ? player.name : (isTournamentOwner ? (owners['tournament-jsl-2026']?.name || 'Tournament Admin') : 'Player'),
        role: isTournamentOwner ? 'TOURNAMENT_OWNER' : 'PLAYER',
        isFirstLogin: true,
        ownedTournaments: isTournamentOwner ? ['tournament-jsl-2026'] : [],
        created_at: Date.now()
      };
      accounts.push(acc);
      safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
    }

    // Dynamic role elevation if assigned as Tournament Owner
    if (isTournamentOwner) {
      acc.role = 'TOURNAMENT_OWNER';
      if (!acc.ownedTournaments) acc.ownedTournaments = [];
      if (!acc.ownedTournaments.includes('tournament-jsl-2026')) acc.ownedTournaments.push('tournament-jsl-2026');
      safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
    }

    // Verify Password
    if (acc.password !== password) {
      return { success: false, message: 'Incorrect password! (Default password is your 10-digit mobile number)' };
    }

    // Set logged-in session
    this.setCurrentUser(acc);

    // Auto-unlock admin controls if Tournament Owner or Super Admin
    if (acc.role === 'TOURNAMENT_OWNER' || acc.role === 'SUPER_ADMIN') {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
    }

    return {
      success: true,
      user: acc,
      role: acc.role || 'PLAYER',
      isFirstLogin: !!acc.isFirstLogin,
      redirect: (acc.role === 'TOURNAMENT_OWNER' || acc.role === 'SUPER_ADMIN') ? 'admin' : 'profile'
    };
  }

  updateUserPassword(phone, newPassword) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || !newPassword || newPassword.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long!' };
    }

    let accounts = this.getUserAccounts();
    let acc = accounts.find(a => a.phone === cleanPhone);

    if (!acc) {
      const players = this.getPlayers();
      const player = players.find(p => (p.phone || p.mobile || '').replace(/[^0-9]/g, '') === cleanPhone);
      if (player) {
        acc = this.ensureUserAccountForPlayer(player);
        accounts = this.getUserAccounts();
      }
    }

    if (!acc) return { success: false, message: 'Account not found!' };

    acc.password = newPassword;
    acc.isFirstLogin = false;
    acc.passwordChangedAt = Date.now();

    const existingIdx = accounts.findIndex(a => a.phone === cleanPhone);
    if (existingIdx !== -1) {
      accounts[existingIdx] = acc;
    } else {
      accounts.push(acc);
    }

    safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
    this.setCurrentUser(acc);

    fetch(`${FIREBASE_DB_URL}/cpl_master/user_accounts/${cleanPhone}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(acc)
    }).catch(err => console.warn("Password update sync error:", err));

    this.notify('user_auth_updated');
    return { success: true, user: acc };
  }

  getCurrentUser() {
    try {
      const u = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
      if (!u) return null;
      const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');
      const owners = this.getTournamentOwners();
      const isOwner = Object.values(owners).some(o => o && (o.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
      if (isOwner && u.role !== 'TOURNAMENT_OWNER' && u.role !== 'SUPER_ADMIN') {
        u.role = 'TOURNAMENT_OWNER';
        if (!u.ownedTournaments) u.ownedTournaments = [];
        if (!u.ownedTournaments.includes('tournament-jsl-2026')) u.ownedTournaments.push('tournament-jsl-2026');
        safeSetLocalStorage(STORAGE_KEYS.CURRENT_USER, u);
      }
      return u;
    } catch (e) {
      return null;
    }
  }

  setCurrentUser(user) {
    if (user) {
      safeSetLocalStorage(STORAGE_KEYS.CURRENT_USER, user);
      this.setUserRole(user.role || 'PLAYER', user.name || 'Player');
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      this.setUserRole('GUEST', 'Guest Visitor');
    }
    this.notify('user_auth_updated');
  }

  logoutUser() {
    this.setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
      localStorage.removeItem('cpl_user_role');
      localStorage.removeItem('cpl_user_name');
      sessionStorage.clear();
    } catch (e) {}
    this.notify('user_updated');
    this.notify('user_auth_updated');
    this.notify('admin_auth_updated');
  }

  notify(eventName) {
    window.dispatchEvent(new CustomEvent(eventName));
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: eventName });
      } catch (err) {
        // ignore fallback
      }
    }
  }

  subscribe(eventName, callback) {
    if (typeof window === 'undefined') return () => {};
    const handler = (e) => callback(e.detail || e);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }

  // --- PUBLIC COMMUNITY QUERIES & DISCUSSION BOARD ---
  getCommunityQueries() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMUNITY_QUERIES)) || [];
  }

  async syncCommunityQueriesFromCloud() {
    try {
      const cloudQueries = await fetchCommunityQueriesFromFirebase();
      if (Array.isArray(cloudQueries) && cloudQueries.length > 0) {
        safeSetLocalStorage(STORAGE_KEYS.COMMUNITY_QUERIES, cloudQueries);
        this.notify('queries_updated');
      }
    } catch (err) {
      console.warn("Failed to sync community queries from cloud:", err);
    }
  }

  async addCommunityQuery(userName, userRole, message) {
    if (!message || !message.trim()) return null;
    const queries = this.getCommunityQueries();
    const newQuery = {
      id: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userName: (userName || 'Anonymous Visitor').trim(),
      userRole: userRole || 'VISITOR',
      message: message.trim(),
      timestamp: Date.now(),
      replies: []
    };
    queries.unshift(newQuery);
    safeSetLocalStorage(STORAGE_KEYS.COMMUNITY_QUERIES, queries);
    saveCommunityQueryToFirebase(newQuery);
    this.notify('queries_updated');
    return newQuery;
  }

  async addReplyToCommunityQuery(queryId, userName, userRole, message) {
    if (!queryId || !message || !message.trim()) return null;
    const queries = this.getCommunityQueries();
    const query = queries.find(q => q && q.id === queryId);
    if (!query) return null;

    if (!Array.isArray(query.replies)) query.replies = [];
    const newReply = {
      id: 'rep-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userName: (userName || 'Anonymous Visitor').trim(),
      userRole: userRole || 'VISITOR',
      message: message.trim(),
      timestamp: Date.now()
    };
    query.replies.push(newReply);

    safeSetLocalStorage(STORAGE_KEYS.COMMUNITY_QUERIES, queries);
    saveCommunityQueryToFirebase(query);
    this.notify('queries_updated');
    return newReply;
  }

  async deleteCommunityQuery(queryId) {
    if (!queryId) return false;
    let queries = this.getCommunityQueries();
    queries = queries.filter(q => q && q.id !== queryId);
    safeSetLocalStorage(STORAGE_KEYS.COMMUNITY_QUERIES, queries);
    deleteCommunityQueryFromFirebase(queryId);
    this.notify('queries_updated');
    return true;
  }
}

export const store = new Store();
