// LocalStorage & Cloud Database Reactive Store (Developer: Suman Kolay - Continuous Dynamic Numbering Release)

import { INITIAL_LEAGUES, INITIAL_TEAMS, INITIAL_PLAYERS, INITIAL_FIXTURES, INITIAL_KUAPUR_PLAYERS } from './data.js?v=13.0.0';
import { 
  fetchCloudData, 
  saveCloudData, 
  syncPlayerToSupabase, 
  deletePlayerFromSupabase,
  syncTeamToSupabase, 
  deleteTeamFromSupabase,
  uploadHDImage,
  initRealtimePushListener,
  clearAllPlayersFromCloud,
  clearAllTeamsFromCloud,
  saveFixtureToCloud,
  deleteFixtureFromCloud,
  clearAllFixturesFromCloud,
  saveAuctionSettingsToCloud,
  saveLiveAuctionToCloud,
  saveLiveMatchToCloud,
  saveCommunityQueryToCloud,
  deleteCommunityQueryFromCloud,
  fetchCommunityQueriesFromCloud,
  fetchTournamentOwnersFromCloud,
  saveTournamentOwnerToCloud,
  fetchUserAccountsFromCloud,
  saveRegistrationSettingsToCloud,
  fetchRegistrationSettingsFromCloud,
  saveAuctionPermanentArchiveToCloud,
  fetchAuctionPermanentArchiveFromCloud,
  savePlatformSettingsToCloud,
  fetchPlatformSettingsFromCloud,
  saveCustomTournamentToCloud,
  fetchCustomTournamentsFromCloud,
  deleteCustomTournamentFromCloud,
  saveUniversalPlayerToCloud,
  fetchUniversalPlayersFromCloud,
  saveTournamentFormatToCloud,
  fetchTournamentFormatsFromCloud,
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
  compressImageToTarget,
  saveUserAccountToCloud,
  flushSupabaseOfflineQueue,
  generateUUID,
  resolveTournamentUUID,
  registerTournamentUUID,
  toUUID,
  fetchGlobalUniquePlayersCount,
  updateTournamentApprovalStatus,
  fetchLiveAuctionFromCloud,
  fetchGlobalLiveAuctionStatus,
  fetchVerificationDocs,
  fetchPersonProfiles,
  fetchAllTournamentsFixtures
} from './supabase.js?v=13.0.55';

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
  TOURNAMENT_FORMATS: 'cpl_tournament_formats_v8',
  ACTIVE_TOURNAMENT: 'cpl_active_tournament_id'
};

// Tournament-scoped localStorage key helper
function scopedKey(baseKey, tournamentId) {
  if (!tournamentId) return baseKey;
  const cleanId = String(tournamentId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36);
  return `${baseKey}_${cleanId}`;
}

// Keys that are scoped per tournament in localStorage
const SCOPED_KEYS = ['PLAYERS', 'TEAMS', 'FIXTURES', 'AUCTION_SETTINGS', 'REGISTRATION_SETTINGS'];

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23059669'/%3E%3Ctext x='50' y='62' font-size='45' text-anchor='middle' fill='white'%3E🏏%3C/text%3E%3C/svg%3E";

async function hashPassword(plaintext, salt = 'cpl_secure_salt_v2') {
  if (!plaintext) return '';
  const saltedText = `__CPL_SALT_v2_${salt}__:${plaintext}`;
  const enc = new TextEncoder().encode(saltedText);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return 'cpl_s2_' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPasswordMatch(inputPassword, storedHash, salt = 'cpl_secure_salt_v2') {
  if (!inputPassword || !storedHash) return false;
  if (typeof storedHash === 'string' && storedHash.startsWith('cpl_s2_')) {
    const computed = await hashPassword(inputPassword, salt);
    return computed === storedHash;
  }
  // Legacy SHA-256 fallback during transition
  const legacyEnc = new TextEncoder().encode(String(inputPassword));
  const legacyBuf = await crypto.subtle.digest('SHA-256', legacyEnc);
  const legacyHex = Array.from(new Uint8Array(legacyBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return (storedHash === legacyHex) || (storedHash === inputPassword);
}

// Purge legacy version keys (cpl_players_v1..v6, etc.) to free up 5MB browser storage quota
function clearOldStorageQuota() {
  try {
    const activeKeys = new Set(Object.values(STORAGE_KEYS));
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('cpl_')) continue;
      const isScopedKey = Array.from(activeKeys).some(base => k.startsWith(base + '_'));
      const isPreserved = activeKeys.has(k) || isScopedKey ||
        k.startsWith('cpl_last_') ||
        k.startsWith('cpl_active_') ||
        k.startsWith('cpl_player_status_overrides') ||
        k.startsWith('cpl_popup_settings') ||
        k.startsWith('cpl_ad_settings') ||
        k.startsWith('cpl_user_') ||
        k.startsWith('cpl_admin_');
      if (!isPreserved) {
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

// Sanitize player/team records so heavy base64 documents (aadhaar/receipts) never bloat localStorage
export function sanitizeForStorage(data) {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForStorage(item));
  }
  if (typeof data === 'object') {
    const itemCopy = { ...data };
    // DO NOT wipe player photos! Keep valid photoUrl so real pictures always display
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
    // One-time fixture cache bust to clear stale cross-tournament data (v2)
    const FIX_CACHE_VER = 'cpl_fixture_cache_v2';
    if (!localStorage.getItem(FIX_CACHE_VER)) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('cpl_fixtures_v8')) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(FIX_CACHE_VER, '1');
      console.log('[STORE] Fixture cache cleared for cross-tournament sync upgrade');
    }
    this._cache = { players: null, teams: null, fixtures: null };
    this._globalUniquePlayersCount = Number(localStorage.getItem('cpl_global_unique_players_count') || 110);
    const rawTid = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOURNAMENT);
    this.activeTournamentId = rawTid ? (toUUID(rawTid) || rawTid) : '440f982b-6008-40f4-a6bc-0516a0985672';
    this.init();
    this.setupRealtimeListeners();
    this.syncWithCloud();
    this.syncGlobalPlayersCount();
    this.startCloudPolling();
  }

  _invalidateCache(type) {
    if (type) { this._cache[type] = null; }
    else { this._cache = { players: null, teams: null, fixtures: null }; }
  }

  _scopedKey(baseKeyName) {
    const canonicalTid = toUUID(this.activeTournamentId) || this.activeTournamentId;
    return scopedKey(STORAGE_KEYS[baseKeyName], canonicalTid);
  }

  _evictTournamentCache(tournamentId) {
    if (!tournamentId) return;
    const canonicalTid = toUUID(tournamentId) || tournamentId;
    for (const keyName of SCOPED_KEYS) {
      const sk = scopedKey(STORAGE_KEYS[keyName], canonicalTid);
      try { localStorage.removeItem(sk); } catch (e) {}
    }
  }

  setActiveTournament(tournamentId) {
    if (!tournamentId) return;
    const resolvedId = toUUID(tournamentId) || tournamentId;
    if (this.activeTournamentId === resolvedId) return;
    this.activeTournamentId = resolvedId;
    this._invalidateCache();
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TOURNAMENT, resolvedId);
    this.syncWithCloud();
    initRealtimePushListener((event) => {
      this.syncWithCloud();
    }, resolvedId);
  }

  init() {
    clearOldStorageQuota();
    this._migrateGlobalToScoped();

    if (!localStorage.getItem(STORAGE_KEYS.LEAGUES)) {
      safeSetLocalStorage(STORAGE_KEYS.LEAGUES, INITIAL_LEAGUES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PLAYER_PROFILES)) {
      safeSetLocalStorage(STORAGE_KEYS.PLAYER_PROFILES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      safeSetLocalStorage(STORAGE_KEYS.USER, {
        role: 'GUEST',
        name: 'Guest Visitor',
        id: null,
        phone: null
      });
    }
  }

  _migrateGlobalToScoped() {
    if (!this.activeTournamentId) return;
    const keysToMigrate = ['PLAYERS', 'TEAMS', 'FIXTURES', 'AUCTION_SETTINGS', 'REGISTRATION_SETTINGS'];
    for (const keyName of keysToMigrate) {
      const globalKey = STORAGE_KEYS[keyName];
      const scoped = this._scopedKey(keyName);
      if (scoped === globalKey) continue;
      const globalData = localStorage.getItem(globalKey);
      if (globalData && !localStorage.getItem(scoped)) {
        localStorage.setItem(scoped, globalData);
        localStorage.removeItem(globalKey);
      }
    }
  }

  // --- STABLE CLOUD SYNC WITH DYNAMIC CONTINUOUS RE-INDEXING & CROSS-DEVICE CLEAR SYNC ---
  async syncWithCloud() {
    if (this._isSyncingWithCloud) return;
    const isUserFillingForm = document.getElementById('player-reg-modal') || document.getElementById('team-reg-modal');
    if (isUserFillingForm) return;
    this._isSyncingWithCloud = true;
    try {
      // First flush any pending offline mutations before pulling cloud data
      try {
        await flushSupabaseOfflineQueue();
      } catch (e) {}

      const cloudData = await fetchCloudData(this.activeTournamentId);

      const lastLocalClearedAt = Number(localStorage.getItem('cpl_last_cleared_at') || '0');

      // REALTIME CROSS-DEVICE CLEAR ALL SYNC: If Admin issued a Clear All command in cloud, clear local data on all connected phones!
      if (cloudData.clearedAt && cloudData.clearedAt > lastLocalClearedAt) {
        console.log("Admin Clear All signal received from Cloud Realtime DB. Clearing local cache on this device...");
        localStorage.setItem('cpl_last_cleared_at', String(cloudData.clearedAt));
        safeSetLocalStorage(this._scopedKey('PLAYERS'), []);
        this.notify('players_updated');
        return;
      }

      const playersKey = this._scopedKey('PLAYERS');
      const localPlayers = this.getPlayers();

      // 1. Sync Players ONLY if valid array received from cloud
      if (Array.isArray(cloudData.players)) {
        if (cloudData.players.length === 0 && cloudData.clearedAt > 0) {
          if (localPlayers.length > 0) {
            safeSetLocalStorage(playersKey, []);
            this._invalidateCache('players');
            this.notify('players_updated');
          }
          return;
        }

        const localDeletedIds = new Set(JSON.parse(localStorage.getItem('cpl_deleted_player_ids_' + this.activeTournamentId) || '[]'));
        const filteredCloudPlayers = cloudData.players.filter(cp => {
          if (!cp) return false;
          const cleanPhone = (cp.phone || '').replace(/[^0-9]/g, '');
          if (localDeletedIds.has(cp.id) || (cleanPhone && localDeletedIds.has(cleanPhone))) {
            return false;
          }
          return true;
        });

        const reindexedPlayers = filteredCloudPlayers.map(cp => {
          const lp = localPlayers.find(p => p && (p.id === cp.id || (p.phone && cp.phone && p.phone.replace(/\D/g, '') === cp.phone.replace(/\D/g, ''))));
          if (!lp) return cp;

          const effectivePaymentStatus = (cp.paymentStatus && cp.paymentStatus !== 'PENDING') ? cp.paymentStatus : (lp.paymentStatus || cp.paymentStatus || 'PENDING');
          const effectiveRegStatus = (cp.registrationStatus && cp.registrationStatus !== 'PENDING') ? cp.registrationStatus : (lp.registrationStatus || effectivePaymentStatus);
          const effectiveVerified = (effectivePaymentStatus === 'APPROVED' || cp.verified === true || lp.verified === true);

          const effectiveTeamId = cp.teamId || lp.teamId || null;
          const effectiveTeamName = cp.teamName || lp.teamName || null;
          const effectiveSoldPrice = (Number(cp.soldPrice) > 0)
            ? Number(cp.soldPrice)
            : ((Number(lp.soldPrice) > 0) ? Number(lp.soldPrice) : (Number(cp.boughtPrice) || Number(lp.boughtPrice) || (effectiveTeamId ? 300 : 0)));
          const effectiveAuctionStatus = cp.auctionStatus || lp.auctionStatus || (effectiveTeamId ? 'SOLD' : 'PENDING');
          const effectiveIsSold = (effectiveAuctionStatus === 'SOLD' || cp.isSold === true || lp.isSold === true || !!effectiveTeamId);
          const effectiveIsUnsold = (effectiveAuctionStatus === 'UNSOLD' || cp.isUnsold === true || lp.isUnsold === true);

          return {
            ...lp,
            ...cp,
            verified: effectiveVerified,
            paymentStatus: effectivePaymentStatus,
            registrationStatus: effectiveRegStatus,
            teamId: effectiveTeamId,
            team_id: effectiveTeamId,
            teamName: effectiveTeamName,
            soldPrice: effectiveSoldPrice,
            sold_price: effectiveSoldPrice,
            auctionStatus: effectiveAuctionStatus,
            isSold: effectiveIsSold,
            isUnsold: effectiveIsUnsold,
            photoUrl: cp.photoUrl || lp.photoUrl || lp.player_photo_url || '',
            player_photo_url: cp.player_photo_url || cp.photoUrl || lp.player_photo_url || lp.photoUrl || '',
            aadharPhotoUrl: cp.aadharPhotoUrl || lp.aadharPhotoUrl || lp.idCardFrontUrl || lp.aadhaar_url || '',
            idCardFrontUrl: cp.idCardFrontUrl || lp.idCardFrontUrl || lp.aadharPhotoUrl || lp.aadhaar_url || '',
            idCardBackUrl: cp.idCardBackUrl || lp.idCardBackUrl || lp.aadharBackUrl || '',
            paymentReceiptUrl: cp.paymentReceiptUrl || lp.paymentReceiptUrl || lp.paymentProofUrl || '',
            paymentProofUrl: cp.paymentProofUrl || lp.paymentProofUrl || lp.paymentReceiptUrl || '',
            paymentRef: cp.paymentRef || lp.paymentRef || lp.remarks || '',
            remarks: cp.remarks || lp.remarks || lp.paymentRef || '',
            fatherName: cp.fatherName || lp.fatherName || '',
            dob: cp.dob || lp.dob || null,
            age: cp.age || lp.age || '',
            village: cp.village || lp.village || '',
            district: cp.district || lp.district || 'Paschim Medinipur',
            state: cp.state || lp.state || 'West Bengal',
            address: cp.address || lp.address || (lp.village ? `${lp.village}, ${lp.district || ''}` : ''),
            battingStyle: cp.battingStyle || lp.battingStyle || 'Right Hand Bat',
            bowlingStyle: cp.bowlingStyle || lp.bowlingStyle || 'Right Hand Medium'
          };
        });

        const localSanitized = sanitizeForStorage(this.getPlayers());
        const cleanCloudSanitized = sanitizeForStorage(reindexedPlayers);

        if (JSON.stringify(localSanitized) !== JSON.stringify(cleanCloudSanitized)) {
          safeSetLocalStorage(playersKey, reindexedPlayers);
          this._invalidateCache('players');
          this.notify('players_updated');
        }
      }

      // 2. Sync Teams ONLY if valid array received from cloud
      const teamsKey = this._scopedKey('TEAMS');
      const lastLocalTeamsClearedAt = Number(localStorage.getItem('cpl_last_teams_cleared_at') || '0');
      if (cloudData.teamsClearedAt && cloudData.teamsClearedAt > lastLocalTeamsClearedAt) {
        localStorage.setItem('cpl_last_teams_cleared_at', String(cloudData.teamsClearedAt));
        safeSetLocalStorage(teamsKey, []);
        this._invalidateCache('teams');
        this.notify('teams_updated');
        return;
      }

      if (Array.isArray(cloudData.teams)) {
        const localTeams = this.getTeams();

        if (cloudData.teams.length === 0 && cloudData.teamsClearedAt > 0) {
          if (localTeams.length > 0) {
            safeSetLocalStorage(teamsKey, []);
            this._invalidateCache('teams');
            this.notify('teams_updated');
          }
          return;
        }

        const reindexedTeams = cloudData.teams;
        const localTeamsSanitized = sanitizeForStorage(localTeams);
        const cleanCloudTeamsSanitized = sanitizeForStorage(reindexedTeams);

        if (JSON.stringify(localTeamsSanitized) !== JSON.stringify(cleanCloudTeamsSanitized)) {
          safeSetLocalStorage(teamsKey, reindexedTeams);
          this._invalidateCache('teams');
          this.syncAllIconPlayers();
          this.notify('teams_updated');
        }
      }

      // 3. Sync Fixtures
      // Protect live scoring from cloud echo overwrites using version counters.
      // Each saveLiveMatchToCloud increments _v in live_state. During sync, if the
      // local fixture has a higher _v than the cloud copy, keep the local version.
      // This survives tab refresh (version is inside the data, not a window flag).
      // The legacy __cplActiveScoringFixtureId guard is kept as a secondary shield.
      if (Array.isArray(cloudData.fixtures)) {
        const localFixtures = this.getFixtures();

        if (cloudData.fixtures.length === 0 && cloudData.matchesClearedAt > 0) {
          if (localFixtures.length > 0) {
            safeSetLocalStorage(this._scopedKey('FIXTURES'), []);
            this._invalidateCache('fixtures');
            this.notify('fixtures_updated');
          }
          return;
        }

        const deletedIdsRaw = localStorage.getItem('cpl_deleted_fixture_ids');
        const deletedIds = new Set(deletedIdsRaw ? JSON.parse(deletedIdsRaw) : []);

        let nextFixtures = cloudData.fixtures
          .filter(cf => cf && cf.id && !deletedIds.has(cf.id) && (!toUUID(cf.id) || !deletedIds.has(toUUID(cf.id))))
          .map(cf => {
            const localF = localFixtures.find(f => f.id === cf.id || (toUUID(f.id) && toUUID(f.id) === toUUID(cf.id)));
            if (!localF) return cf;

            // Version-based protection: reject cloud state with lower version
            const storedV = Number(localStorage.getItem(`cpl_active_scoring_${cf.id}_v`)) || 0;
            const localV = Math.max(localF.liveMatchState?._v || 0, localF.liveState?._v || 0, storedV);
            const cloudV = cf.liveState?._v || 0;
            if (localV >= cloudV && (localF.status === 'LIVE' || cf.status === 'LIVE')) {
              return { ...cf, liveState: localF.liveMatchState || localF.liveState || cf.liveState };
            }
            return { ...cf, teamAName: cf.teamAName || localF.teamAName, teamBName: cf.teamBName || localF.teamBName };
          });

        // Retain uncommitted locally scheduled fixtures (e.g. freshly added matches before cloud echo)
        const cloudIds = new Set(cloudData.fixtures.map(f => f.id));
        const uncommittedLocals = localFixtures.filter(lf => lf && lf.id && !cloudIds.has(lf.id));
        if (uncommittedLocals.length > 0 && !(cloudData.matchesClearedAt > 0 && cloudData.fixtures.length === 0)) {
          nextFixtures = [...nextFixtures, ...uncommittedLocals];
          // Proactively persist uncommitted local fixtures to cloud
          uncommittedLocals.forEach(f => saveFixtureToCloud(f, this.activeTournamentId));
        }

        // Shield: protect actively-scored fixture by window flag or persisted localStorage key
        const activeId = (typeof window !== 'undefined' ? window.__cplActiveScoringFixtureId : null) ||
                         (typeof localStorage !== 'undefined' ? localStorage.getItem('cpl_active_scoring_fixture_id') : null);
        if (activeId) {
          const localActive = localFixtures.find(f => f.id === activeId);
          if (localActive && (localActive.status === 'LIVE' || !localActive.status)) {
            nextFixtures = nextFixtures.map(f => f.id === activeId ? localActive : f);
            if (!nextFixtures.some(f => f.id === activeId)) nextFixtures = [...nextFixtures, localActive];
          }
        }

        const fixturesKey = this._scopedKey('FIXTURES');
        const localFixturesStr = localStorage.getItem(fixturesKey) || '[]';
        const cloudFixturesStr = JSON.stringify(nextFixtures);
        if (localFixturesStr !== cloudFixturesStr) {
          safeSetLocalStorage(fixturesKey, nextFixtures);
          this._invalidateCache('fixtures');
          this.notify('fixtures_updated');
        }
      }

      // 4. Sync Auction Settings
      if (cloudData.auctionSettings) {
        const auctionKey = this._scopedKey('AUCTION_SETTINGS');
        const localSettingsStr = localStorage.getItem(auctionKey) || '{}';
        const cloudSettingsStr = JSON.stringify(cloudData.auctionSettings);
        if (localSettingsStr !== cloudSettingsStr) {
          safeSetLocalStorage(auctionKey, cloudData.auctionSettings);
          this.notify('auction_settings_updated');
        }
      }

      // 4b. Sync Registration Settings (tournament-scoped)
      if (cloudData.registrationSettings) {
        const regKey = this._scopedKey('REGISTRATION_SETTINGS');
        const localRegStr = localStorage.getItem(regKey) || '{}';
        const cloudRegStr = JSON.stringify(cloudData.registrationSettings);
        if (localRegStr !== cloudRegStr) {
          safeSetLocalStorage(regKey, cloudData.registrationSettings);
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

      // 5. Sync Tournament Owners & User Accounts from Supabase
      try {
        const cloudOwners = await fetchTournamentOwnersFromCloud();
        if (cloudOwners && typeof cloudOwners === 'object' && Object.keys(cloudOwners).length > 0) {
          const currentOwners = this.getTournamentOwners();
          const mergedOwners = { ...currentOwners, ...cloudOwners };
          const localOwnersStr = localStorage.getItem(STORAGE_KEYS.TOURNAMENT_OWNERS) || '{}';
          const mergedOwnersStr = JSON.stringify(mergedOwners);
          if (localOwnersStr !== mergedOwnersStr) {
            safeSetLocalStorage(STORAGE_KEYS.TOURNAMENT_OWNERS, mergedOwners);
            this.notify('tournament_owners_updated');
          }
        }

        const cloudAccounts = await fetchUserAccountsFromCloud();
        if (Array.isArray(cloudAccounts) && cloudAccounts.length > 0) {
          const localAccountsStr = localStorage.getItem(STORAGE_KEYS.USER_ACCOUNTS) || '[]';
          const cloudAccountsStr = JSON.stringify(cloudAccounts);
          if (localAccountsStr !== cloudAccountsStr) {
            safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, cloudAccounts);
            this.notify('user_accounts_updated');
          }
        }

        // 6. Sync Custom Tournaments from Cloud (Authoritative Realtime Sync across all browsers)
        const cloudTourneys = await fetchCustomTournamentsFromCloud();
        if (Array.isArray(cloudTourneys)) {
          const localTourneysStr = localStorage.getItem(STORAGE_KEYS.CUSTOM_TOURNAMENTS) || '[]';
          const cloudTourneysStr = JSON.stringify(cloudTourneys);
          if (localTourneysStr !== cloudTourneysStr) {
            safeSetLocalStorage(STORAGE_KEYS.CUSTOM_TOURNAMENTS, cloudTourneys);
            this.notify('custom_tournaments_updated');
          }
        }

        // 7. Sync Tournament Formats (Group stages)
        const cloudFormats = await fetchTournamentFormatsFromCloud();
        if (cloudFormats && typeof cloudFormats === 'object' && Object.keys(cloudFormats).length > 0) {
          const currentFormats = this.getTournamentFormats();
          const mergedFormats = { ...currentFormats, ...cloudFormats };
          const localFormatsStr = localStorage.getItem(STORAGE_KEYS.TOURNAMENT_FORMATS) || '{}';
          const mergedFormatsStr = JSON.stringify(mergedFormats);
          if (localFormatsStr !== mergedFormatsStr) {
            safeSetLocalStorage(STORAGE_KEYS.TOURNAMENT_FORMATS, mergedFormats);
            this.notify('tournament_format_updated');
          }
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

  async syncCrossTournamentFixtures() {
    try {
      const allFixturesByTid = await fetchAllTournamentsFixtures();
      if (!allFixturesByTid || typeof allFixturesByTid !== 'object') return;
      const activeTid = this.activeTournamentId;
      const activeUUID = toUUID(activeTid);
      let changed = false;
      for (const [tid, fixtures] of Object.entries(allFixturesByTid)) {
        if (tid === activeTid || tid === activeUUID || toUUID(tid) === activeUUID) continue;
        const key = scopedKey(STORAGE_KEYS.FIXTURES, toUUID(tid) || tid);
        const existing = localStorage.getItem(key);
        const newStr = JSON.stringify(fixtures);
        if (existing !== newStr) {
          safeSetLocalStorage(key, fixtures);
          changed = true;
        }
      }
      if (changed) {
        this._invalidateCache('fixtures');
        this.notify('fixtures_updated');
      }
    } catch (e) {
      console.warn('[STORE] crossTournamentFixtures sync:', e.message);
    }
  }

  startCloudPolling() {
    if (this.cloudPollingInterval) clearInterval(this.cloudPollingInterval);
    this.cloudPollingInterval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const isUserFillingForm = document.getElementById('player-reg-modal') || document.getElementById('team-reg-modal') || document.getElementById('edit-player-modal');
      if (!isUserFillingForm) {
        this.syncWithCloud();
      }
    }, 60000);
    this.syncCrossTournamentFixtures();
    if (this._crossTourneyInterval) clearInterval(this._crossTourneyInterval);
    this._crossTourneyInterval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      this.syncCrossTournamentFixtures();
    }, 120000);
  }

  async fetchDocsOnDemand() {
    try {
      const docs = await fetchVerificationDocs(this.activeTournamentId);
      if (Array.isArray(docs) && docs.length > 0) {
        safeSetLocalStorage(this._scopedKey('VERIFICATION_DOCS'), docs);
      }
      return docs;
    } catch (e) { return []; }
  }

  async fetchProfilesOnDemand() {
    try {
      const profiles = await fetchPersonProfiles(this.activeTournamentId);
      if (Array.isArray(profiles) && profiles.length > 0) {
        safeSetLocalStorage(STORAGE_KEYS.PLAYER_PROFILES, profiles);
      }
      return profiles;
    } catch (e) { return []; }
  }

  setupRealtimeListeners() {
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      if (e.key === this._scopedKey('PLAYERS')) { this._invalidateCache('players'); this.notify('players_updated'); }
      if (e.key === this._scopedKey('TEAMS')) { this._invalidateCache('teams'); this.notify('teams_updated'); }
      if (e.key === this._scopedKey('REGISTRATION_SETTINGS')) this.notify('registration_settings_updated');
    });

    // Mobile Phone Wakeup & Tab Switch Instant Cloud Sync
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncWithCloud();
      }
    });

    window.addEventListener('online', () => {
      this.flushOfflineQueue();
      this.syncWithCloud();
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
      initRealtimePushListener((payload) => {
        if (payload && payload.table === 'live_auction') {
          const data = payload.new || payload.record || null;
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
        }
        this.syncWithCloud();
      });
    } catch (err) {
      console.warn("Realtime push setup notice:", err);
    }
  }

  async flushOfflineQueue() {
    try {
      await flushSupabaseOfflineQueue();
    } catch (e) {
      console.warn("[STORE] flushOfflineQueue notice:", e);
    }
  }

  // --- ADMIN & TOURNAMENT OWNER AUTHENTICATION ---
  isAdminAuthenticated() {
    const u = this.getCurrentUser();
    if (!u) return false;
    return u.role === 'TOURNAMENT_OWNER' || u.role === 'SUPER_ADMIN' || u.role === 'master_admin' || this.isMasterAdmin();
  }

  isMasterAdmin() {
    const u = this.getCurrentUser();
    if (!u) return false;
    const isMasterRole = u.role === 'SUPER_ADMIN' || u.role === 'master_admin';
    const isMasterEmail = Boolean(u.email && u.email.toLowerCase().trim() === 'bakolaypan@gmail.com');
    return isMasterRole || isMasterEmail;
  }

  async authenticateAdmin(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    
    // 1. Authenticate with Supabase Auth
    try {
      const res = await signInUser(cleanEmail, password);
      if (res && res.data && res.data.user) {
        const user = res.data.user;
        const profile = res.data.profile;
        const isMaster = !!(profile && profile.role === 'master_admin');

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

    // 2. Tournament Owner login via registered phone (compare salted hashed password)
    const owners = this.getTournamentOwners();
    for (const [tId, o] of Object.entries(owners)) {
      const match = await verifyPasswordMatch(password, o.password, o.phone);
      if (o && ((o.email && o.email.toLowerCase() === cleanEmail) || o.phone === cleanEmail) && match) {
        const canonicalTid = toUUID(tId) || tId;
        this.setActiveTournament(canonicalTid);

        // Also sign into Supabase Auth so RLS policies work for cloud writes
        const supaEmail = o.email || `${o.phone}@cpl.tournament.org`;
        try {
          const authRes = await signInUser(supaEmail, password);
          if (authRes.error) {
            console.warn("[AUTH] Supabase Auth session for organiser not available:", authRes.error.message);
          } else {
            console.log("[AUTH] Supabase Auth session established for organiser:", supaEmail);
          }
        } catch (authErr) {
          console.warn("[AUTH] Supabase Auth sign-in for organiser failed:", authErr);
        }

        const userObj = {
          id: `owner-${canonicalTid}`,
          name: o.name || 'Tournament Organiser',
          email: o.email || `${o.phone}@cpl.local`,
          phone: o.phone,
          role: 'TOURNAMENT_OWNER',
          ownedTournaments: [canonicalTid]
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
    const liveTourneys = this.getCustomTournaments();
    if (Array.isArray(liveTourneys) && liveTourneys.length > 0) {
      return liveTourneys.filter(t => !t.status || t.status === 'ACTIVE' || t.status === 'active' || t.status === 'APPROVED');
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LEAGUES)) || [];
  }

  getAccessibleLeagues() {
    const allLeagues = this.getLeagues();
    const currentUser = this.getCurrentUser();

    // 1. Full Master Super Admin access (via Supabase Auth role check)
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
          return permittedTourneyIds.some(pid => pid.includes(lCode) || pid === lId);
        });
        if (filtered.length > 0) return filtered;
      }
    }

    // Default fallback for non-master Tournament Admin: return first league
    return allLeagues.slice(0, 1);
  }

  getLeagueById(id) {
    return this.getLeagues().find(l => l.id === id);
  }

  // --- PLAYERS ---
  getPlayers() {
    if (this._cache.players) return this._cache.players;
    let rawPlayers = JSON.parse(localStorage.getItem(this._scopedKey('PLAYERS'))) || [];
    const isKuapur = (this.activeTournamentId === '5cf4f50c-3930-486a-83c3-3f59414a7d6f' || toUUID(this.activeTournamentId) === '5cf4f50c-3930-486a-83c3-3f59414a7d6f');
    if (isKuapur && Array.isArray(INITIAL_KUAPUR_PLAYERS) && INITIAL_KUAPUR_PLAYERS.length > 0) {
      if (rawPlayers.length === 0 || !rawPlayers[0]?.photoUrl?.includes('pravatar.cc')) {
        rawPlayers = INITIAL_KUAPUR_PLAYERS;
        safeSetLocalStorage(this._scopedKey('PLAYERS'), INITIAL_KUAPUR_PLAYERS);
      }
    }
    const rawTeams = JSON.parse(localStorage.getItem(this._scopedKey('TEAMS'))) || [];

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

    const result = uniquePlayers.map((p, idx) => {
      const canonicalSl = (p.id && p.id.startsWith('ply-1787000000000-')) 
        ? parseInt(p.id.replace('ply-1787000000000-', ''), 10)
        : (idx + 1);
      
      const displayNo = (!isNaN(canonicalSl) && canonicalSl > 0) ? canonicalSl : (idx + 1);
      const tourneyCode = p.tournamentSlug ? p.tournamentSlug.toUpperCase().replace(/[^A-Z0-9]/g, '') : 'REG';
      const regId = `${tourneyCode}-${String(displayNo).padStart(4, '0')}`;

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

      const prof = this.getPlayerProfileByPhone(p.phone) || {};
      const finalDob = p.dob || prof.dob || null;
      const finalVillage = p.village || prof.village || '';
      const finalDistrict = p.district || prof.district || 'Paschim Medinipur';
      const finalState = p.state || prof.state || 'West Bengal';
      const finalFatherName = p.fatherName || p.father_name || prof.fatherName || '';
      const finalAadhar = p.aadharPhotoUrl || p.idCardFrontUrl || p.aadhaar_url || prof.aadharPhotoUrl || prof.idCardFrontUrl || '';
      const finalAadharBack = p.idCardBackUrl || p.aadharBackUrl || prof.idCardBackUrl || '';
      const finalReceipt = p.paymentReceiptUrl || p.paymentProofUrl || p.payment_screenshot_url || prof.paymentReceiptUrl || '';
      const finalPaymentRef = p.paymentRef || p.remarks || prof.paymentRef || '';

      let overrideStatus = null;
      try {
        const statusMapKey = 'cpl_player_status_overrides_' + (this.activeTournamentId || 'default');
        const overrides = JSON.parse(localStorage.getItem(statusMapKey) || '{}');
        const cleanPPhone = (p.phone || '').replace(/\D/g, '');
        overrideStatus = overrides[p.id] || (cleanPPhone && overrides[cleanPPhone]) || null;
      } catch (e) {}

      const effectiveStatus = overrideStatus || p.paymentStatus || p.registrationStatus || 'PENDING';
      const isApproved = effectiveStatus === 'APPROVED' || p.verified === true;
      const isRejected = effectiveStatus === 'REJECTED';
      const finalPaymentStatus = isApproved ? 'APPROVED' : (isRejected ? 'REJECTED' : 'PENDING');

      return {
        ...p,
        tournament_id: p.tournament_id || p.tournamentId || this.activeTournamentId || null,
        tournamentId: p.tournamentId || p.tournament_id || this.activeTournamentId || null,
        paymentStatus: finalPaymentStatus,
        registrationStatus: finalPaymentStatus,
        verified: isApproved,
        fatherName: finalFatherName,
        dob: finalDob,
        age: p.age || prof.age || '',
        village: finalVillage,
        district: finalDistrict,
        state: finalState,
        address: p.address || (finalVillage ? `${finalVillage}, ${finalDistrict}` : ''),
        idCardFrontUrl: finalAadhar,
        aadharPhotoUrl: finalAadhar,
        idCardBackUrl: finalAadharBack,
        aadharBackUrl: finalAadharBack,
        paymentReceiptUrl: finalReceipt,
        paymentProofUrl: finalReceipt,
        paymentRef: finalPaymentRef,
        remarks: finalPaymentRef,
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

    // Calculate real-time cumulative match performance statistics across all fixtures
    try {
      const fixtures = this.getFixtures() || [];
      const statsMap = new Map();

      for (const f of fixtures) {
        const psMap = f.liveMatchState?.playerStats || f.liveState?.playerStats;
        if (!psMap || typeof psMap !== 'object') continue;

        for (const [pId, ps] of Object.entries(psMap)) {
          if (!ps || typeof ps !== 'object') continue;
          let pStat = statsMap.get(pId);
          if (!pStat) {
            pStat = {
              runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0,
              runsConceded: 0, ballsBowled: 0, maidens: 0,
              dismissals: 0, catches: 0, stumpings: 0, matchesPlayed: 0
            };
            statsMap.set(pId, pStat);
          }
          pStat.runs += Number(ps.runs) || 0;
          pStat.balls += Number(ps.balls) || 0;
          pStat.fours += Number(ps.fours) || 0;
          pStat.sixes += Number(ps.sixes) || 0;
          pStat.wickets += Number(ps.wickets) || 0;
          pStat.runsConceded += Number(ps.runsConceded) || 0;
          pStat.ballsBowled += Number(ps.ballsBowled) || 0;
          pStat.maidens += Number(ps.maidens) || 0;
          if (ps.dismissed) pStat.dismissals += 1;
          pStat.catches += Number(ps.catches) || 0;
          pStat.stumpings += Number(ps.stumpings) || 0;
          pStat.matchesPlayed += 1;
        }
      }

      if (statsMap.size > 0) {
        result.forEach(p => {
          const st = statsMap.get(p.id) || statsMap.get(String(p.id)) || null;
          if (st) {
            p.totalRuns = (Number(p.totalRuns) || Number(p.runs) || 0) + st.runs;
            p.runs = p.totalRuns;
            p.totalBalls = (Number(p.totalBalls) || Number(p.balls) || 0) + st.balls;
            p.balls = p.totalBalls;
            p.totalFours = (Number(p.totalFours) || Number(p.fours) || 0) + st.fours;
            p.fours = p.totalFours;
            p.totalSixes = (Number(p.totalSixes) || Number(p.sixes) || 0) + st.sixes;
            p.sixes = p.totalSixes;
            p.totalWickets = (Number(p.totalWickets) || Number(p.wickets) || 0) + st.wickets;
            p.wickets = p.totalWickets;
            p.runsConceded = (Number(p.runsConceded) || 0) + st.runsConceded;
            p.ballsBowled = (Number(p.ballsBowled) || 0) + st.ballsBowled;
            p.totalMaidens = (Number(p.totalMaidens) || Number(p.maidens) || 0) + st.maidens;
            p.maidens = p.totalMaidens;
            p.dismissals = (Number(p.dismissals) || 0) + st.dismissals;
            p.catches = (Number(p.catches) || 0) + st.catches;
            p.stumpings = (Number(p.stumpings) || 0) + st.stumpings;
            p.matchesPlayed = (Number(p.matchesPlayed) || 0) + st.matchesPlayed;
          }
        });
      }
    } catch (errStats) {
      console.warn('[STORE] Error calculating real-time player stats:', errStats);
    }

    this._cache.players = result;
    return result;
  }

  getPlayerById(id) {
    if (!id) return null;
    return (this.getAllPlayersAcrossTournaments() || this.getPlayers()).find(p => String(p.id) === String(id) || (id && p.id && toUUID(p.id) === toUUID(id)));
  }

  getAllPlayersAcrossTournaments() {
    const all = new Map();
    const currentScoped = this.getPlayers();
    currentScoped.forEach(p => {
      if (p && p.id) all.set(p.id, p);
    });

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cpl_players_v8_') || k === 'cpl_global_players')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach(p => {
                if (p && p.id) {
                  const existing = all.get(p.id);
                  if (!existing || (!existing.teamId && p.teamId) || (p.auctionStatus === 'SOLD' && existing.auctionStatus !== 'SOLD')) {
                    all.set(p.id, p);
                  }
                }
              });
            }
          }
        }
      }
    } catch(e) {}

    return Array.from(all.values());
  }

  getAllTeamsAcrossTournaments() {
    const all = new Map();
    const currentScoped = this.getTeams();
    currentScoped.forEach(t => {
      if (t && t.id) all.set(t.id, t);
    });

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cpl_teams_v8_') || k === 'cpl_global_teams')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach(t => {
                if (t && t.id) {
                  if (!all.has(t.id)) {
                    all.set(t.id, t);
                  }
                }
              });
            }
          }
        }
      }
    } catch(e) {}

    return Array.from(all.values());
  }

  // --- REGISTER NEW PLAYER WITH ATOMIC TIMESTAMP QUEUE & ZERO DUPLICATES ---
  registerPlayer(playerData) {
    if (!this.isPlayerRegistrationOpen()) {
      throw new Error(this.getRegistrationSettings().closedReason || "Player Registration is currently closed by the Admin.");
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
      safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
      syncPlayerToSupabase(players[existingIdx]);
      this.notify('players_updated');
      return players[existingIdx];
    }

    const nextSerial = players.length + 1;
    const uuid = `ply-1787000000000-${String(nextSerial).padStart(4, '0')}`;
    const tourneyPrefix = (playerData.tournamentSlug || 'REG').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const regId = `${tourneyPrefix}-${String(nextSerial).padStart(4, '0')}`;
    const createdTime = Date.now();

    const newPlayer = {
      id: uuid,
      profileId: profile ? profile.id : null,
      createdTime,
      regTimestamp: createdTime,
      leagueCategory: playerData.leagueCategory || 'T',
      tournament_id: playerData.tournament_id || this.activeTournamentId || null,
      tournamentId: playerData.tournamentId || playerData.tournament_id || this.activeTournamentId || null,
      tournamentSlug: playerData.tournamentSlug || null,
      tournamentName: playerData.tournamentName || null,
      name: (playerData.name || playerData.playerName || '').trim(),
      fatherName: playerData.fatherName || 'N/A',
      dob: playerData.dob || '2000-01-01',
      age: playerData.age || 24,
      phone: playerData.phone || playerData.mobile,
      alternateMobile: playerData.alternateMobile || '',
      village: playerData.village || playerData.address || '',
      district: playerData.district || 'Paschim Medinipur',
      state: playerData.state || 'West Bengal',
      category: playerData.category || playerData.playingType || 'All Rounder',
      role: playerData.category || playerData.playingType || 'All Rounder',
      playingType: playerData.category || playerData.playingType || 'All Rounder',
      battingStyle: playerData.battingStyle || 'Right Hand Bat',
      bowlingStyle: playerData.bowlingStyle || 'Right Hand Medium',
      isWicketKeeper: !!playerData.isWicketKeeper,
      teamPreference: playerData.teamPreference || playerData.team || 'Any Team',
      photoUrl: playerData.photoUrl || playerData.player_photo_url || '',
      docType: playerData.docType || 'ID Card',
      idCardFrontUrl: playerData.idCardFrontUrl || playerData.id_card_front_url || playerData.aadharPhotoUrl || playerData.aadhaar_url || '',
      idCardBackUrl: playerData.idCardBackUrl || playerData.id_card_back_url || playerData.aadharBackUrl || '',
      aadharPhotoUrl: playerData.idCardFrontUrl || playerData.id_card_front_url || playerData.aadharPhotoUrl || playerData.aadhaar_url || '',
      aadharBackUrl: playerData.idCardBackUrl || playerData.id_card_back_url || playerData.aadharBackUrl || '',
      paymentReceiptUrl: playerData.paymentReceiptUrl || playerData.paymentProofUrl || playerData.payment_screenshot_url || '',
      paymentStatus: playerData.paymentStatus || 'APPROVED',
      registrationStatus: playerData.registrationStatus || 'APPROVED',
      phoneVerified: playerData.phoneVerified !== false,
      remarks: playerData.remarks || playerData.paymentRef || '',
      paymentRef: playerData.paymentRef || playerData.remarks || '',
      teamId: null,
      soldPrice: 0,
      basePrice: Number(playerData.basePrice) || 300,
      regDate: new Date().toISOString().split('T')[0],
      serialNo: playerData.serialNo || playerData.reg_number || nextSerial,
      displayRegistrationNumber: playerData.serialNo || playerData.reg_number || nextSerial,
      registrationId: regId,
      regNo: regId
    };

    players.push(newPlayer);
    safeSetLocalStorage(this._scopedKey('PLAYERS'), players);

    // Also persist directly into the target tournament's specific scoped storage key if different from active
    const targetTid = playerData.tournament_id || playerData.tournamentId;
    if (targetTid && targetTid !== this.activeTournamentId) {
      try {
        const targetKey = STORAGE_KEYS.PLAYERS + '_' + targetTid;
        let targetList = [];
        const rawTarget = localStorage.getItem(targetKey);
        if (rawTarget) targetList = JSON.parse(rawTarget) || [];
        if (!targetList.some(p => p.id === newPlayer.id || p.phone === newPlayer.phone)) {
          targetList.push(newPlayer);
          safeSetLocalStorage(targetKey, targetList);
        }
      } catch(e) {}
    }

    this.createOrUpdatePlayerProfile(newPlayer);
    this.ensureUserAccountForPlayer(newPlayer, playerData.securityPin || playerData.password || null);
    syncPlayerToSupabase(newPlayer);
    this.notify('players_updated');
    return newPlayer;
  }

  updatePlayer(updatedPlayerData) {
    this._invalidateCache('players');
    const players = this.getPlayers();
    const idx = players.findIndex(p => p.id === updatedPlayerData.id);
    if (idx !== -1) {
      const now = Date.now();
      const s = (updatedPlayerData.paymentStatus || updatedPlayerData.registrationStatus || players[idx].paymentStatus || 'APPROVED').toUpperCase();
      const isApproved = (s === 'APPROVED');
      players[idx] = { 
        ...players[idx], 
        ...updatedPlayerData,
        paymentStatus: s,
        registrationStatus: s,
        verified: isApproved,
        tournament_id: players[idx].tournament_id || this.activeTournamentId || null,
        tournamentId: players[idx].tournamentId || this.activeTournamentId || null,
        updated_at: now
      };

      // Save to persistent status overrides map
      try {
        const statusMapKey = 'cpl_player_status_overrides_' + (this.activeTournamentId || 'default');
        const overrides = JSON.parse(localStorage.getItem(statusMapKey) || '{}');
        overrides[players[idx].id] = s;
        if (players[idx].phone) overrides[players[idx].phone.replace(/\D/g, '')] = s;
        localStorage.setItem(statusMapKey, JSON.stringify(overrides));
      } catch (e) {}
      
      this.createOrUpdatePlayerProfile(players[idx]);
      this._invalidateCache('players');
      safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
      syncPlayerToSupabase(players[idx]);
      this.notify('players_updated');
      return players[idx];
    }
    return null;
  }

  // --- AUTOMATIC CONTINUOUS RE-INDEXING ON DELETE PLAYER (NO GAPS IN NUMBERING) ---
  async deletePlayer(playerId) {
    this._invalidateCache('players');
    let players = this.getPlayers();
    const playerToDelete = players.find(p => p.id === playerId);
    const playerPhone = playerToDelete ? (playerToDelete.phone || playerToDelete.mobile) : null;
    const cleanPhone = playerPhone ? playerPhone.replace(/\D/g, '') : null;
    const tourneyId = playerToDelete?.tournament_id || this.activeTournamentId;
    
    // 1. Immediately record in local deleted IDs pool to prevent sync race conditions
    try {
      const delKey = 'cpl_deleted_player_ids_' + (this.activeTournamentId || 'default');
      const delList = JSON.parse(localStorage.getItem(delKey) || '[]');
      if (!delList.includes(playerId)) delList.push(playerId);
      if (cleanPhone && !delList.includes(cleanPhone)) delList.push(cleanPhone);
      localStorage.setItem(delKey, JSON.stringify(delList));
    } catch (e) {}

    // 2. Clean from local status overrides map
    try {
      const statusMapKey = 'cpl_player_status_overrides_' + (this.activeTournamentId || 'default');
      const overrides = JSON.parse(localStorage.getItem(statusMapKey) || '{}');
      delete overrides[playerId];
      if (cleanPhone) delete overrides[cleanPhone];
      localStorage.setItem(statusMapKey, JSON.stringify(overrides));
    } catch (e) {}

    // 3. Remove from team squad if assigned
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
        safeSetLocalStorage(this._scopedKey('TEAMS'), teams);
        syncTeamToSupabase(team);
        this.notify('teams_updated');
      }
    }

    // 4. Filter out deleted player
    players = players.filter(p => p.id !== playerId && (!cleanPhone || (p.phone || '').replace(/\D/g, '') !== cleanPhone));

    // 5. CONTINUOUS DYNAMIC RE-INDEXING (1, 2, 3... REG-0001, REG-0002...)
    players.forEach((p, idx) => {
      const displayNo = idx + 1;
      p.serialNo = displayNo;
      p.displayRegistrationNumber = displayNo;
      const prefix = (p.tournamentSlug || 'REG').toUpperCase().replace(/[^A-Z0-9]/g, '');
      p.registrationId = `${prefix}-${String(displayNo).padStart(4, '0')}`;
      p.regNo = p.registrationId;
    });

    this._invalidateCache('players');
    safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
    this.notify('players_updated');

    await deletePlayerFromSupabase(playerId, playerPhone, tourneyId);
    await this.syncGlobalPlayersCount();
    this.notify('players_updated');
  }

  clearAllPlayers() {
    const timestamp = Date.now();
    localStorage.setItem('cpl_last_cleared_at', String(timestamp));
    this._invalidateCache('players');
    safeSetLocalStorage(this._scopedKey('PLAYERS'), []);
    clearAllPlayersFromCloud();
    this.notify('players_updated');
  }

  clearAllTeams() {
    const timestamp = Date.now();
    localStorage.setItem('cpl_last_teams_cleared_at', String(timestamp));
    this._invalidateCache('teams');
    safeSetLocalStorage(this._scopedKey('TEAMS'), []);
    clearAllTeamsFromCloud();
    this.notify('teams_updated');
  }

  updatePlayerStatus(playerId, paymentStatus, registrationStatus, remarks = '') {
    this._invalidateCache('players');
    const players = this.getPlayers();
    const player = players.find(p => p.id === playerId);
    if (player) {
      const now = Date.now();
      const s = (paymentStatus || 'APPROVED').toUpperCase();
      player.paymentStatus = s;
      player.registrationStatus = (registrationStatus || s).toUpperCase();
      player.verified = (s === 'APPROVED');
      player.updated_at = now;
      if (remarks) player.remarks = remarks;
      if (!player.tournament_id && this.activeTournamentId) {
        player.tournament_id = this.activeTournamentId;
        player.tournamentId = this.activeTournamentId;
      }
      
      // Save to persistent status overrides map
      try {
        const statusMapKey = 'cpl_player_status_overrides_' + (this.activeTournamentId || 'default');
        const overrides = JSON.parse(localStorage.getItem(statusMapKey) || '{}');
        overrides[player.id] = s;
        if (player.phone) overrides[player.phone.replace(/\D/g, '')] = s;
        localStorage.setItem(statusMapKey, JSON.stringify(overrides));
      } catch (e) {}

      this.createOrUpdatePlayerProfile(player);
      this._invalidateCache('players');
      safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
      syncPlayerToSupabase(player);
      this.notify('players_updated');
      return player;
    }
    return null;
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

      safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
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
      safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
      this.notify('players_updated');
    }
    return count;
  }

  _savePlayerAcrossAllKeys(player) {
    if (!player || !player.id) return;
    this._invalidateCache('players');
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cpl_players_v8_') || k === 'cpl_global_players')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            let arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              let updated = false;
              arr = arr.map(p => {
                if (p && (p.id === player.id || (player.id && p.id && toUUID(p.id) === toUUID(player.id)))) {
                  updated = true;
                  return { ...p, ...player };
                }
                return p;
              });
              if (updated) {
                safeSetLocalStorage(k, arr);
              }
            }
          }
        }
      }
    } catch(e) {}
  }

  _saveTeamAcrossAllKeys(team) {
    if (!team || !team.id) return;
    this._invalidateCache('teams');
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cpl_teams_v8_') || k === 'cpl_global_teams')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            let arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              let updated = false;
              arr = arr.map(t => {
                if (t && (t.id === team.id || (team.id && t.id && toUUID(t.id) === toUUID(team.id)))) {
                  updated = true;
                  return { ...t, ...team };
                }
                return t;
              });
              if (updated) {
                safeSetLocalStorage(k, arr);
              }
            }
          }
        }
      }
    } catch(e) {}
  }

  assignPlayerToTeam(playerId, teamId, soldPrice) {
    this._invalidateCache('players');
    this._invalidateCache('teams');
    let players = this.getPlayers();
    let teams = this.getTeams();
    
    let player = players.find(p => p.id === playerId || (playerId && p.id && toUUID(p.id) === toUUID(playerId)));
    if (!player && this.getAllPlayersAcrossTournaments) {
      player = this.getAllPlayersAcrossTournaments().find(p => p.id === playerId || (playerId && p.id && toUUID(p.id) === toUUID(playerId)));
    }

    let team = teams.find(t => t.id === teamId || (teamId && t.id && toUUID(t.id) === toUUID(teamId)));
    if (!team && this.getAllTeamsAcrossTournaments) {
      team = this.getAllTeamsAcrossTournaments().find(t => t.id === teamId || (teamId && t.id && toUUID(t.id) === toUUID(teamId)));
    }

    if (player && team) {
      // Enforce squad size limit
      const maxSquad = Number(this.getAuctionSettings().maxSquadSize) || 13;
      const currentSquad = (Number(team.squadCount) || 0);
      if (currentSquad >= maxSquad) {
        console.warn(`[AUCTION] Squad full: ${team.name} has ${currentSquad}/${maxSquad} players`);
        return { error: 'SQUAD_FULL', team, maxSquad, currentSquad };
      }

      // Enforce purse limit
      const price = Number(soldPrice) || player.basePrice || 300;
      if ((Number(team.remainingPurse) || 0) < price) {
        console.warn(`[AUCTION] Insufficient purse: ${team.name} has ₹${team.remainingPurse}, needs ₹${price}`);
        return { error: 'INSUFFICIENT_PURSE', team, remainingPurse: team.remainingPurse, price };
      }

      if (player.teamId) {
        const oldTeam = teams.find(t => t.id === player.teamId || (player.teamId && t.id && toUUID(t.id) === toUUID(player.teamId))) || (this.getAllTeamsAcrossTournaments ? this.getAllTeamsAcrossTournaments().find(t => t.id === player.teamId || (player.teamId && t.id && toUUID(t.id) === toUUID(player.teamId))) : null);
        if (oldTeam) {
          oldTeam.squadCount = Math.max(0, (oldTeam.squadCount || 1) - 1);
          oldTeam.purseSpent = Math.max(0, (oldTeam.purseSpent || 0) - (player.soldPrice || 0));
          oldTeam.remainingPurse = Math.max(0, (Number(oldTeam.purseBudget) || 8000) - oldTeam.purseSpent);
          oldTeam.updated_at = Date.now();
          this._saveTeamAcrossAllKeys(oldTeam);
          syncTeamToSupabase(oldTeam);
        }
      }
      player.teamId = team.id;
      player.team_id = team.id;
      player.soldPrice = price;
      player.sold_price = price;
      player.teamName = team.name;
      player.auctionStatus = 'SOLD';
      player.isSold = true;
      player.isUnsold = false;
      player.updated_at = Date.now();
      
      team.squadCount = (Number(team.squadCount) || 0) + 1;
      team.purseSpent = (Number(team.purseSpent) || 0) + price;
      team.remainingPurse = Math.max(0, (Number(team.purseBudget) || 8000) - team.purseSpent);
      team.updated_at = Date.now();

      this._invalidateCache('players');
      this._invalidateCache('teams');
      safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
      safeSetLocalStorage(this._scopedKey('TEAMS'), teams);
      this._savePlayerAcrossAllKeys(player);
      this._saveTeamAcrossAllKeys(team);
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
    this._invalidateCache('players');
    this._invalidateCache('teams');
    const players = this.getPlayers();
    const player = players.find(p => p.id === playerId || (playerId && p.id && toUUID(p.id) === toUUID(playerId)));
    if (!player) return false;

    const now = Date.now();
    player.teamId = null;
    player.team_id = null;
    player.teamName = null;
    player.soldPrice = 0;
    player.sold_price = 0;
    player.auctionStatus = 'UNSOLD';
    player.isSold = false;
    player.isUnsold = true;
    player.updated_at = now;

    this._invalidateCache('players');
    this._invalidateCache('teams');
    safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
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
        safeSetLocalStorage(this._scopedKey('TEAMS'), teams);
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

    safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
    syncPlayerToSupabase(player);
    this.notify('players_updated');
    this.notify('teams_updated');
    this.notify('live_auction_updated');
    return true;
  }


  resetAuctionData() {
    // Pause cloud polling so it doesn't overwrite the reset with stale cloud data
    if (this.cloudPollingInterval) {
      clearInterval(this.cloudPollingInterval);
      this.cloudPollingInterval = null;
    }

    // Read raw from localStorage (bypass cache which may be stale)
    const players = JSON.parse(localStorage.getItem(this._scopedKey('PLAYERS'))) || [];
    const now = Date.now();
    const syncPromises = [];
    players.forEach(p => {
      p.teamId = null;
      p.team_id = null;
      p.teamName = null;
      p.soldPrice = 0;
      p.sold_price = 0;
      p.auctionStatus = 'PENDING';
      p.status = 'registered';
      p.isSold = false;
      p.boughtByTeamId = null;
      p.updated_at = now;
      syncPromises.push(syncPlayerToSupabase(p));
    });

    const teams = (JSON.parse(localStorage.getItem(this._scopedKey('TEAMS'))) || []).map((t, idx) => {
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

    safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
    safeSetLocalStorage(this._scopedKey('TEAMS'), teams);

    // Invalidate cache so getPlayers()/getTeams() read fresh data
    this._cache = { players: null, teams: null, fixtures: null };

    // Sync reset teams to Supabase, then restart cloud polling
    const teamSyncPromises = teams.map(t => syncTeamToSupabase(t));
    Promise.all([...syncPromises, ...teamSyncPromises])
      .then(() => console.log("[RESET] All auction data synced to cloud"))
      .catch(e => console.warn('[RESET] Batch auction reset sync:', e))
      .finally(() => this.startCloudPolling());

    this.notify('players_updated');
    this.notify('teams_updated');
    this.notify('live_auction_updated');
    return { success: true };
  }

  // --- TEAMS ---
  getTeams() {
    if (this._cache.teams) return this._cache.teams;
    const teams = JSON.parse(localStorage.getItem(this._scopedKey('TEAMS'))) || [];
    const allPlayers = JSON.parse(localStorage.getItem(this._scopedKey('PLAYERS'))) || [];

    // DEDUP TEAMS: If the same team name exists under two IDs (e.g. team-aniket-xi AND team-1787144635606),
    // keep only the canonical timestamp-based ID.
    const teamNameMap = new Map();
    const deduped = [];
    for (const t of teams) {
      if (!t || !t.id) continue;
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
        console.warn("[DEDUP] Dropping duplicate team:", t.name, "id:", t.id, "kept id:", existing.id);
      } else {
        teamNameMap.set(normName, t);
        deduped.push(t);
      }
    }
    
    const filteredTeams = deduped;

    const teamResult = filteredTeams.map((t, idx) => {
      const iconPlayerName = (t.iconPlayerName || t.iconName || '').trim().toLowerCase();
      const hasIcon = !!iconPlayerName || !!t.iconPlayerId;
      const defaultIconFee = Number(this.getAuctionSettings().defaultIconPrice) || 1000;
      const iconDeduction = hasIcon ? defaultIconFee : 0;
      
      // Calculate total spent on purchased auction players (excluding icon player to avoid double deduction)
      const purchasedNonIconPlayers = allPlayers.filter(p => {
        if (!p) return false;
        const pTeamId = p.teamId || p.team_id;
        const isMatch = (pTeamId && (pTeamId === t.id || toUUID(pTeamId) === toUUID(t.id))) || (p.teamName && (p.teamName || '').trim().toLowerCase() === (t.name || '').trim().toLowerCase());
        if (!isMatch) return false;
        const pName = (p.name || '').trim().toLowerCase();
        const isThisTeamIcon = hasIcon && (pName === iconPlayerName || (t.iconPlayerId && (p.id === t.iconPlayerId || toUUID(p.id) === toUUID(t.iconPlayerId))));
        const isSoldStatus = (p.auctionStatus === 'SOLD' || p.isSold === true || !!pTeamId);
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
    this._cache.teams = teamResult;
    return teamResult;
  }

  getAllTeamsAcrossTournaments() {
    const allTourneys = this.getCustomTournaments() || [];
    const map = new Map();

    // 1. Add active tournament teams
    this.getTeams().forEach(t => {
      if (t && t.id) {
        map.set(t.id, {
          ...t,
          tournamentId: t.tournament_id || t.tournamentId || this.activeTournamentId,
          leagueCode: (t.leagueCode || 'T').toUpperCase()
        });
      }
    });

    // 2. Add other tournaments custom teams
    allTourneys.forEach(tourney => {
      const tid = tourney.supabaseId || tourney.id;
      const code = (tourney.category_code || tourney.slug || 'T').toUpperCase();
      const customTeams = Array.isArray(tourney.format_config?.custom_teams) ? tourney.format_config.custom_teams : [];
      let localScopedTeams = [];
      try {
        const raw = localStorage.getItem(`cpl_teams_v8_${tid}`);
        if (raw) localScopedTeams = JSON.parse(raw) || [];
      } catch (e) {}

      [...customTeams, ...localScopedTeams].forEach(t => {
        if (t && t.id && !map.has(t.id)) {
          map.set(t.id, {
            ...t,
            tournamentId: tid,
            tournamentName: tourney.name,
            leagueCode: (t.leagueCode || code).toUpperCase(),
            group: t.group || 'A',
            logoUrl: t.logoUrl || t.logo || 'assets/card_jsl_user.png'
          });
        }
      });
    });

    return Array.from(map.values());
  }

  getTeamById(id) {
    if (!id) return null;
    return this.getAllTeamsAcrossTournaments().find(t => t.id === id) || this.getTeams().find(t => t.id === id);
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
      const iconFee = Number(this.getAuctionSettings().defaultIconPrice) || 1000;
      players.forEach(p => {
        const isNew = (newIconId && p.id === newIconId) || (newIconName && (p.name || '').trim().toLowerCase() === newIconName);
        if (isNew) {
          p.teamId = newTeam.id;
          p.team_id = newTeam.id;
          p.teamName = newTeam.name;
          p.isIcon = true;
          p.isIconPlayer = true;
          p.auctionStatus = 'SOLD';
          p.soldPrice = iconFee;
          p.sold_price = iconFee;
          p.isSold = true;
          p.boughtByTeamId = newTeam.id;
          p.updated_at = Date.now();
          changed = true;
          if (typeof syncPlayerToSupabase === 'function') syncPlayerToSupabase(p);
        }
      });

      // Update team squad count and purse for icon player
      const teams = this.getTeams();
      const teamToUpdate = teams.find(t => t.id === newTeam.id);
      if (teamToUpdate) {
        const hasIconAlready = (Number(teamToUpdate.squadCount) || 0) > 0 && teamToUpdate.hasIconPlayer;
        if (!hasIconAlready) {
          teamToUpdate.squadCount = Math.max(1, (Number(teamToUpdate.squadCount) || 0) + 1);
          teamToUpdate.purseSpent = (Number(teamToUpdate.purseSpent) || 0) + iconFee;
          teamToUpdate.remainingPurse = Math.max(0, (Number(teamToUpdate.purseBudget) || 8000) - teamToUpdate.purseSpent);
          teamToUpdate.hasIconPlayer = true;
          teamToUpdate.updated_at = Date.now();
          this._invalidateCache('teams');
          safeSetLocalStorage(this._scopedKey('TEAMS'), teams);
          syncTeamToSupabase(teamToUpdate);
          this.notify('teams_updated');
        }
      }
    }

    if (changed) {
      safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
      this.notify('players_updated');
    }
  }

  syncAllIconPlayers() {
    const teams = this.getTeams();
    const players = this.getPlayers();
    let changed = false;
    const syncPromises = [];

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
            syncPromises.push(syncPlayerToSupabase(p));
          }
        });
      }
    });

    if (changed) {
      Promise.all(syncPromises).catch(e => console.warn('Batch icon sync:', e));
      safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
      this.notify('players_updated');
    }
  }

  registerTeam(teamData) {
    if (!this.isTeamRegistrationOpen()) {
      throw new Error(this.getRegistrationSettings().closedReason || "Team Registration is currently closed by the Admin.");
    }
    const teams = this.getTeams();
    const serialNo = teams.length + 1;
    const newTeam = {
      id: teamData.id || generateUUID(),
      serialNo,
      tournament_id: teamData.tournament_id || this.activeTournamentId || null,
      tournamentId: teamData.tournamentId || teamData.tournament_id || this.activeTournamentId || null,
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
    
    delete this._cache.teams;
    safeSetLocalStorage(this._scopedKey('TEAMS'), teams);
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
      delete this._cache.teams;
      safeSetLocalStorage(this._scopedKey('TEAMS'), teams);
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

    delete this._cache.teams;
    safeSetLocalStorage(this._scopedKey('TEAMS'), teams);
    safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
    deleteTeamFromSupabase(teamId, this.activeTournamentId);
    this.notify('teams_updated');
    this.notify('players_updated');
  }

  // --- FIXTURES ---
  getFixtures() {
    if (this._cache.fixtures) return this._cache.fixtures;
    let all = JSON.parse(localStorage.getItem(this._scopedKey('FIXTURES'))) || [];

    // Clean out fixtures that belong to another tournament's teams
    const activeTid = this.activeTournamentId;
    const activeUUID = toUUID(activeTid);
    const activeTeams = this.getTeams() || [];
    const activeTeamIds = new Set(activeTeams.map(t => String(t.id)));

    if (activeTeamIds.size > 0) {
      const allCrossTeams = this.getAllTeamsAcrossTournaments ? this.getAllTeamsAcrossTournaments() : activeTeams;
      const otherTeamIds = new Set(
        allCrossTeams.filter(t => t && t.id && !activeTeamIds.has(String(t.id))).map(t => String(t.id))
      );

      all = all.filter(f => {
        if (!f) return false;
        const fTeamA = f.teamAId ? String(f.teamAId) : '';
        const fTeamB = f.teamBId ? String(f.teamBId) : '';
        if (otherTeamIds.has(fTeamA) || otherTeamIds.has(fTeamB)) return false;
        return true;
      });
    }

    // Auto-correct fixtures mistakenly marked 'LIVE' without active deliveries or toss
    const activeScoringId = typeof localStorage !== 'undefined' ? localStorage.getItem('cpl_active_scoring_fixture_id') : null;
    all.forEach(f => {
      if (f && f.status === 'LIVE' && f.id !== activeScoringId) {
        const s = f.liveMatchState || {};
        const balls = (s.overs || 0) * 6 + (s.balls || 0);
        const runs = s.runs || 0;
        const wickets = s.wickets || 0;
        const hasToss = !!s.tossDetails;

        if (balls === 0 && runs === 0 && wickets === 0 && !hasToss) {
          f.status = 'SCHEDULED';
          f.liveMatchState = null;
        }
      }
    });

    this._cache.fixtures = all;
    return all;
  }

  registerFixture(fixtureData) {
    const fixtures = this.getFixtures();
    const newFixture = {
      id: fixtureData.id || generateUUID(),
      tournament_id: fixtureData.tournament_id || fixtureData.leagueId || this.activeTournamentId,
      leagueId: fixtureData.leagueId || fixtureData.tournament_id || this.activeTournamentId,
      status: 'SCHEDULED',
      innings: 1,
      teamAScore: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      teamBScore: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      liveMatchState: null,
      created_at: new Date().toISOString(),
      updated_at: Date.now(),
      ...fixtureData
    };
    fixtures.push(newFixture);
    this._invalidateCache('fixtures');
    safeSetLocalStorage(this._scopedKey('FIXTURES'), fixtures);
    const fixtureTid = newFixture.tournament_id || newFixture.leagueId || this.activeTournamentId;
    saveFixtureToCloud(newFixture, fixtureTid);
    this.notify('fixtures_updated');
    return newFixture;
  }

  updateFixture(updatedFixture) {
    const fixtures = this.getFixtures();
    const idx = fixtures.findIndex(f => f.id === updatedFixture.id);
    if (idx !== -1) {
      fixtures[idx] = { ...fixtures[idx], ...updatedFixture, updated_at: Date.now() };
      this._invalidateCache('fixtures');
      safeSetLocalStorage(this._scopedKey('FIXTURES'), fixtures);
      const fixtureTid = fixtures[idx].tournament_id || fixtures[idx].leagueId || this.activeTournamentId;
      saveFixtureToCloud(fixtures[idx], fixtureTid);
      this.notify('fixtures_updated');
      return fixtures[idx];
    }
    return null;
  }

  deleteFixture(fixtureId) {
    let fixtures = this.getFixtures();
    fixtures = fixtures.filter(f => f.id !== fixtureId);
    this._invalidateCache('fixtures');
    safeSetLocalStorage(this._scopedKey('FIXTURES'), fixtures);
    deleteFixtureFromCloud(fixtureId, this.activeTournamentId);

    // Record deleted fixture ID locally to prevent cloud sync resurrection
    try {
      const deletedRaw = localStorage.getItem('cpl_deleted_fixture_ids');
      const deletedSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
      if (fixtureId) deletedSet.add(fixtureId);
      const uuid = toUUID(fixtureId);
      if (uuid) deletedSet.add(uuid);
      safeSetLocalStorage('cpl_deleted_fixture_ids', Array.from(deletedSet));
    } catch (e) {}

    // Clean across ALL tournament keys and format configs in localStorage
    const tourneys = this.getCustomTournaments() || [];
    tourneys.forEach(t => {
      const tid = t.supabaseId || t.id;
      if (tid) {
        try {
          const key = `cpl_fixtures_v8_${tid}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            const arr = (JSON.parse(raw) || []).filter(f => f.id !== fixtureId && toUUID(f.id) !== toUUID(fixtureId));
            safeSetLocalStorage(key, arr);
          }
        } catch (e) {}
      }
      if (Array.isArray(t.format_config?.custom_matches)) {
        const origLen = t.format_config.custom_matches.length;
        t.format_config.custom_matches = t.format_config.custom_matches.filter(f => f.id !== fixtureId && toUUID(f.id) !== toUUID(fixtureId));
        if (t.format_config.custom_matches.length !== origLen) {
          this._saveTournamentAcrossAllKeys(t);
        }
      }
    });

    // Clean from legacy key if present
    try {
      const legacyRaw = localStorage.getItem('cpl_fixtures_v8');
      if (legacyRaw) {
        const legacyMatches = (JSON.parse(legacyRaw) || []).filter(f => f.id !== fixtureId && toUUID(f.id) !== toUUID(fixtureId));
        safeSetLocalStorage('cpl_fixtures_v8', legacyMatches);
      }
    } catch (e) {}

    this.notify('fixtures_updated');
  }

  clearAllFixtures() {
    // Record all existing fixture IDs as deleted to block cloud echoes
    try {
      const curFixtures = this.getFixtures();
      const deletedRaw = localStorage.getItem('cpl_deleted_fixture_ids');
      const deletedSet = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
      curFixtures.forEach(f => {
        if (f && f.id) {
          deletedSet.add(f.id);
          const u = toUUID(f.id);
          if (u) deletedSet.add(u);
        }
      });
      safeSetLocalStorage('cpl_deleted_fixture_ids', Array.from(deletedSet));
      safeSetLocalStorage(`cpl_matches_cleared_at_${this.activeTournamentId}`, Date.now());
    } catch (e) {}

    this._invalidateCache('fixtures');
    safeSetLocalStorage(this._scopedKey('FIXTURES'), []);
    clearAllFixturesFromCloud(this.activeTournamentId);

    const activeTid = this.activeTournamentId;
    const tourneys = this.getCustomTournaments();
    const curT = tourneys.find(t => (t.supabaseId || t.id) === activeTid);

    // Clean legacy key of matches belonging to this tournament
    try {
      const legacyRaw = localStorage.getItem('cpl_fixtures_v8');
      if (legacyRaw) {
        const code = (curT?.slug || curT?.category_code || '').toUpperCase();
        const legacyMatches = (JSON.parse(legacyRaw) || []).filter(f => {
          const fTid = f.tournament_id || f.tournamentId || f.leagueId;
          const fCode = (f.leagueCode || '').toUpperCase();
          if (fTid && (fTid === activeTid || toUUID(fTid) === toUUID(activeTid))) return false;
          if (code && fCode && (fCode === code || (code === 'K2026' && (fCode === 'KPL' || fCode === 'K2026')) || (code === 'JSL' && fCode === 'JSL'))) return false;
          return true;
        });
        safeSetLocalStorage('cpl_fixtures_v8', legacyMatches);
      }
    } catch (e) {}

    // Clean format_config.custom_matches
    if (curT) {
      if (!curT.format_config) curT.format_config = {};
      curT.format_config.custom_matches = [];
      this._saveTournamentAcrossAllKeys(curT);
    }

    this.notify('fixtures_updated');
  }

  getAllFixturesAcrossTournaments() {
    const allTourneys = this.getCustomTournaments() || [];
    const activeTid = this.activeTournamentId;
    const activeFixtures = this.getFixtures();
    const map = new Map();

    // 1. Add active tournament fixtures (if cleared, activeFixtures is [], so 0 matches for active tournament)
    activeFixtures.forEach(f => {
      if (f && f.id) {
        const fCode = (f.leagueCode || '').toUpperCase();
        const fTid = f.tournament_id || f.tournamentId || f.leagueId;

        const tourney = allTourneys.find(t => {
          const tCode = (t.category_code || t.code || t.category || t.shortCode || t.slug || '').toUpperCase();
          const tId = t.supabaseId || t.id;
          if (fTid && (tId === fTid || t.id === fTid || t.supabaseId === fTid)) return true;
          if (fCode && tCode && (fCode === tCode || (fCode === 'K2026' && (tCode === 'KPL' || tCode === 'K2026')) || (fCode === 'KPL' && (tCode === 'K2026' || tCode === 'KPL')))) return true;
          return false;
        }) || (fTid ? allTourneys.find(t => (t.supabaseId || t.id) === fTid) : null) || {};

        const effectiveTid = tourney.supabaseId || tourney.id || fTid || activeTid;
        const tourneyCode = (tourney.category_code || tourney.code || tourney.slug || '').toUpperCase();
        const effectiveCode = (tourneyCode || fCode || 'T').toUpperCase();
        const effectiveName = tourney.name || f.tournamentName || (effectiveCode === 'JSL' ? 'Jhankra Super League 2026' : ((effectiveCode === 'KPL' || effectiveCode === 'K2026' || effectiveCode === 'T2') ? 'Kuapur Premier League' : 'Cricket Premier League'));
        const effectiveLogo = tourney.logo_url || tourney.banner_url || 'assets/jsl_logo.jpg';

        map.set(f.id, {
          ...f,
          tournamentId: effectiveTid,
          tournamentName: effectiveName,
          leagueCode: effectiveCode,
          logoUrl: effectiveLogo
        });
      }
    });

    // 2. Add fixtures from other tournaments ONLY if explicitly saved
    allTourneys.forEach(t => {
      const tid = t.supabaseId || t.id;
      if (tid === activeTid || toUUID(tid) === toUUID(activeTid)) return; // Already processed active tournament above!

      let localScopedMatches = [];
      try {
        const localRaw = localStorage.getItem(`cpl_fixtures_v8_${tid}`);
        if (localRaw !== null) {
          localScopedMatches = JSON.parse(localRaw) || [];
        } else {
          localScopedMatches = [];
        }
      } catch (e) {}

      localScopedMatches.forEach(cm => {
        if (cm && cm.id && !map.has(cm.id)) {
          map.set(cm.id, {
            ...cm,
            tournamentId: tid,
            tournamentName: t.name || `${t.slug} Premier League`,
            leagueCode: (t.category_code || t.code || t.slug || cm.leagueCode || 'T').toUpperCase(),
            logoUrl: t.logo_url || t.banner_url || 'assets/jsl_logo.jpg'
          });
        }
      });
    });

    const deletedIdsRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('cpl_deleted_fixture_ids') : null;
    const deletedSet = new Set(deletedIdsRaw ? JSON.parse(deletedIdsRaw) : []);

    const result = Array.from(map.values()).filter(f => f && f.id && !deletedSet.has(f.id) && (!toUUID(f.id) || !deletedSet.has(toUUID(f.id))));
    const activeScoringId = typeof localStorage !== 'undefined' ? localStorage.getItem('cpl_active_scoring_fixture_id') : null;
    result.forEach(f => {
      if (f && f.status === 'LIVE' && f.id !== activeScoringId) {
        const s = f.liveMatchState || f.liveState || {};
        const balls = (s.overs || 0) * 6 + (s.balls || 0);
        const runs = s.runs || 0;
        const wickets = s.wickets || 0;
        const hasToss = !!s.tossDetails;

        if (balls === 0 && runs === 0 && wickets === 0 && !hasToss) {
          f.status = 'SCHEDULED';
          f.liveMatchState = null;
          f.liveState = null;
        }
      }
    });

    return result.sort((a, b) => (Number(a.matchNo) || 0) - (Number(b.matchNo) || 0));
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

  getTournamentFormat(leagueCode = 'T') {
    const formats = this.getTournamentFormats();
    const clean = (leagueCode || 'T').toUpperCase();
    return formats[clean] || { format: 'TWO_GROUPS', groups: ['A', 'B'], qualifyPerGroup: 2, knockoutType: 'SEMIFINALS' };
  }

  async saveTournamentFormat(leagueCode = 'T', formatConfig) {
    const formats = this.getTournamentFormats();
    const clean = (leagueCode || 'T').toUpperCase();
    formats[clean] = { ...formats[clean], ...formatConfig, updated_at: Date.now() };
    safeSetLocalStorage(STORAGE_KEYS.TOURNAMENT_FORMATS, formats);
    await saveTournamentFormatToCloud(clean, formats[clean]);
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
      safeSetLocalStorage(this._scopedKey('TEAMS'), teams);
      syncTeamToSupabase(team);
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
        syncTeamToSupabase(team);
        updatedAny = true;
      }
    });
    if (updatedAny) {
      safeSetLocalStorage(this._scopedKey('TEAMS'), teams);
      this.notify('teams_updated');
    }
    return true;
  }

  randomizeTeamGroups(leagueCode = 'T', groupNames = ['A', 'B']) {
    const cleanLeague = (leagueCode || 'T').toUpperCase();
    const teams = this.getTeams().filter(t => {
      const code = (t.leagueCode || (t.leagueId === 'leg-jsl' ? 'JSL' : (t.leagueId === 'leg-jpl' ? 'JPL' : (t.leagueId === 'leg-kpl' ? 'KPL' : 'T'))));
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

  autoGenerateGroupFixtures(leagueCode = 'T', config = {}) {
    const cleanLeague = (leagueCode || 'T').toUpperCase();
    const teams = this.getTeams().filter(t => {
      const code = (t.leagueCode || (t.leagueId === 'leg-jsl' ? 'JSL' : (t.leagueId === 'leg-jpl' ? 'JPL' : (t.leagueId === 'leg-kpl' ? 'KPL' : 'T'))));
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
    const defaultSettings = {
      defaultBasePrice: 300,
      defaultPurseBudget: 8000,
      defaultIconPrice: 1000,
      maxSquadSize: 13,
      bidIncrementSlabs: [
        { maxLimit: 1000, increment: 50 },
        { maxLimit: 2000, increment: 100 },
        { maxLimit: 999999, increment: 200 }
      ]
    };
    try {
      const s = localStorage.getItem(this._scopedKey('AUCTION_SETTINGS'));
      if (!s) return defaultSettings;
      const parsed = JSON.parse(s);
      return {
        ...defaultSettings,
        ...parsed,
        defaultBasePrice: (!parsed.defaultBasePrice || Number(parsed.defaultBasePrice) === 200) ? 300 : Number(parsed.defaultBasePrice),
        defaultPurseBudget: Number(parsed.defaultPurseBudget) || 8000,
        defaultIconPrice: (parsed.defaultIconPrice !== undefined) ? Number(parsed.defaultIconPrice) : 1000,
        maxSquadSize: Number(parsed.maxSquadSize) || 13,
        bidIncrementSlabs: Array.isArray(parsed.bidIncrementSlabs) && parsed.bidIncrementSlabs.length > 0
          ? parsed.bidIncrementSlabs
          : defaultSettings.bidIncrementSlabs
      };
    } catch (e) {
      return defaultSettings;
    }
  }

  calculateNextBidIncrement(currentBid) {
    const settings = this.getAuctionSettings();
    const rawSlabs = settings.bidIncrementSlabs || [
      { maxLimit: 1000, increment: 50 },
      { maxLimit: 2000, increment: 100 },
      { maxLimit: 999999, increment: 200 }
    ];
    const slabs = [...rawSlabs].sort((a, b) => (Number(a.maxLimit) || 999999) - (Number(b.maxLimit) || 999999));
    const numBid = Number(currentBid) || 0;
    for (const slab of slabs) {
      if (numBid < Number(slab.maxLimit || Infinity)) {
        return Number(slab.increment) || 50;
      }
    }
    return Number(slabs[slabs.length - 1]?.increment) || 200;
  }

  updateAuctionSettings(settings) {
    const current = this.getAuctionSettings();
    const merged = { ...current, ...settings };
    safeSetLocalStorage(this._scopedKey('AUCTION_SETTINGS'), merged);
    saveAuctionSettingsToCloud(merged);
    this.notify('auction_settings_updated');
  }

  // --- REGISTRATION CONTROL CONFIG & MASTER TOGGLE ---
  getRegistrationSettings() {
    const defaultSettings = {
      isRegistrationOpen: true,
      isPlayerRegOpen: true,
      isTeamRegOpen: true,
      closedReason: "Registration is currently closed by the Admin."
    };
    try {
      const s = localStorage.getItem(this._scopedKey('REGISTRATION_SETTINGS'));
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

  isRegistrationOpen() {
    const s = this.getRegistrationSettings();
    return s.isRegistrationOpen !== false;
  }

  isPlayerRegistrationOpen() {
    const s = this.getRegistrationSettings();
    return s.isRegistrationOpen !== false && s.isPlayerRegOpen !== false;
  }

  isTeamRegistrationOpen() {
    const s = this.getRegistrationSettings();
    return s.isRegistrationOpen !== false && s.isTeamRegOpen !== false;
  }

  updateRegistrationSettings(settings) {
    const current = this.getRegistrationSettings();
    const updated = { ...current, ...settings };
    safeSetLocalStorage(this._scopedKey('REGISTRATION_SETTINGS'), updated);
    saveRegistrationSettingsToCloud(updated, this.activeTournamentId);
    this.notify('registration_settings_updated');
    return updated;
  }

  toggleRegistration(isOpen, closedReason = null) {
    const patch = { isRegistrationOpen: isOpen };
    if (closedReason) patch.closedReason = closedReason;
    return this.updateRegistrationSettings(patch);
  }

  // --- LIVE AUCTION STATE ---
  async getLiveAuctionState() {
    try {
      const cloud = await fetchLiveAuctionFromCloud(this.activeTournamentId);
      if (cloud) {
        const cloudTs = Number(cloud.updated_at || 0);
        const localTs = Number(this.liveAuctionState?.updated_at || 0);
        if (cloudTs >= localTs || !this.liveAuctionState || cloud.active_player_id) {
          this.liveAuctionState = cloud;
          safeSetLocalStorage(this._scopedKey('LIVE_AUCTION_STATE'), cloud);
          return cloud;
        }
      }
    } catch(e) {}
    try {
      const local = safeGetLocalStorage(this._scopedKey('LIVE_AUCTION_STATE'));
      if (local) return local;
    } catch(e) {}
    try {
      const legacyLocal = localStorage.getItem('cpl_live_auction_state');
      if (legacyLocal) return JSON.parse(legacyLocal);
    } catch(e) {}
    return this.liveAuctionState || null;
  }

  getLiveAuctionStateSync() {
    if (this.liveAuctionState) return this.liveAuctionState;
    try {
      const local = safeGetLocalStorage(this._scopedKey('LIVE_AUCTION_STATE'));
      if (local) {
        this.liveAuctionState = local;
        return this.liveAuctionState;
      }
    } catch(e) {}
    try {
      const legacy = localStorage.getItem('cpl_live_auction_state');
      if (legacy) {
        this.liveAuctionState = JSON.parse(legacy);
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
      safeSetLocalStorage(this._scopedKey('LIVE_AUCTION_STATE'), updatedState);
      safeSetLocalStorage('cpl_live_auction_state', updatedState);
    } else {
      localStorage.removeItem(this._scopedKey('LIVE_AUCTION_STATE'));
      localStorage.removeItem('cpl_live_auction_state');
    }
    await saveLiveAuctionToCloud(updatedState, this.activeTournamentId);
    this.notify('live_auction_updated');
  }

  async getGlobalLiveAuctionInfo() {
    try {
      const globalInfo = await fetchGlobalLiveAuctionStatus();
      if (globalInfo && (globalInfo.isLive || globalInfo.recentTournaments?.length)) {
        return globalInfo;
      }
    } catch(e) {}
    
    // Fallback using locally cached tournament metadata
    const activeTourney = this.getCustomTournaments().find(t => (t.supabaseId || t.id) === this.activeTournamentId) || {};
    const localState = this.getLiveAuctionStateSync();
    const isLive = localState && (localState.status === 'BIDDING' || localState.status === 'SOLD' || localState.status === 'UNSOLD') && localState.active_player_id && !localState.is_ended && localState.status !== 'ENDED';
    return {
      isLive: !!isLive,
      liveTournament: isLive ? activeTourney : null,
      liveState: isLive ? localState : null,
      recentTournaments: this.getCustomTournaments().map(t => ({
        id: t.supabaseId || t.id,
        name: t.name,
        slug: t.slug,
        logoUrl: t.posterUrl || t.logoUrl || 'assets/jsl_logo.jpg',
        customTeamsCount: t.teamsCount || 4,
        auctionStatus: 'CONCLUDED'
      }))
    };
  }

  async concludeLiveAuction(tournamentId = null) {
    const targetTid = tournamentId || this.activeTournamentId;
    const concludedState = {
      status: 'ENDED',
      is_ended: true,
      active_player_id: null,
      name: null,
      current_bid: 0,
      highest_bidder_team_id: null,
      timer_left: 0,
      updated_at: Date.now()
    };
    
    this.liveAuctionState = concludedState;
    safeSetLocalStorage(this._scopedKey('LIVE_AUCTION_STATE'), concludedState);
    localStorage.removeItem('cpl_live_auction_state');
    
    await saveLiveAuctionToCloud(concludedState, targetTid);
    
    // Lock & save the permanent snapshot automatically
    try {
      await this.commitAndSyncAuctionPermanentArchive(targetTid);
    } catch(errArchive) {
      console.warn("Permanent archive commit warning:", errArchive);
    }

    this.notify('live_auction_updated');
    this.notify('auction_ended');
    return true;
  }

  // --- PERMANENT 5-YEAR AUCTION ARCHIVE & RECORD VAULT ---
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
        shortCode: team.shortCode || 'T',
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

    const activeTourney = this.getCustomTournaments().find(t => (t.supabaseId || t.id) === this.activeTournamentId) || {};
    const snapshot = {
      archiveId: `${(activeTourney.slug || 'tournament').toUpperCase()}_AUCTION_VAULT`,
      tournament: activeTourney.name || 'Tournament',
      season: new Date().getFullYear().toString(),
      status: 'AUCTION COMPLETED & ARCHIVED',
      venue: activeTourney.venue || 'Tournament Ground',
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
    await saveAuctionPermanentArchiveToCloud(snapshot);
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
      isHostTournamentEnabled: true, // Enabled for Multi-Tenant SaaS Branch
      allowPublicRegistrationModeA: true,
      allowQuickFixturesModeB: true,
      maxTeamsDefault: 16
    };
  }

  async updatePlatformSettings(settings) {
    const current = this.getPlatformSettings();
    const updated = { ...current, ...settings, updated_at: Date.now() };
    safeSetLocalStorage(STORAGE_KEYS.PLATFORM_SETTINGS, updated);
    await savePlatformSettingsToCloud(updated);
    this.notify('platform_settings_updated');
    return updated;
  }

  isHostTournamentEnabled() {
    const settings = this.getPlatformSettings();
    return settings.isHostTournamentEnabled !== false;
  }

  getCustomTournaments() {
    let customList = [];
    try {
      const local = localStorage.getItem(STORAGE_KEYS.CUSTOM_TOURNAMENTS);
      if (local) customList = JSON.parse(local);
    } catch(e) {}

    return customList;
  }

  getCustomTournamentById(idOrSlug) {
    if (!idOrSlug) return null;
    const clean = idOrSlug.trim().toLowerCase();
    const cleanNoPrefix = clean.replace(/^t_/, '');
    return this.getCustomTournaments().find(t => 
      (t.id && (t.id.toLowerCase() === clean || t.id.toLowerCase() === cleanNoPrefix)) || 
      (t.supabaseId && t.supabaseId.toLowerCase() === clean) ||
      (t.tournament_id && t.tournament_id.toLowerCase() === clean) ||
      (t.slug && (t.slug.toLowerCase() === clean || t.slug.toLowerCase() === cleanNoPrefix)) ||
      (t.shortCode && (t.shortCode.toLowerCase() === clean || t.shortCode.toLowerCase() === cleanNoPrefix)) ||
      (t.name && t.name.toLowerCase() === clean)
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

    const supabaseId = await saveCustomTournamentToCloud(record);
    if (supabaseId) {
      record.supabaseId = supabaseId;
      record.tournament_id = supabaseId;
    }
    safeSetLocalStorage(STORAGE_KEYS.CUSTOM_TOURNAMENTS, list);

    // Register tournament owner credentials so admin login works
    if (tourneyData.organizer && tourneyData.organizer.phone) {
      const org = tourneyData.organizer;
      const owners = this.getTournamentOwners();
      const ownerKey = record.supabaseId || id;
      const cleanPhone = org.phone.replace(/[^0-9]/g, '');
      const hashedPw = await hashPassword(org.password || org.phone, cleanPhone);
      owners[ownerKey] = {
        phone: cleanPhone,
        name: org.name || 'Tournament Owner',
        email: org.email || '',
        password: hashedPw,
        assignedAt: Date.now()
      };
      safeSetLocalStorage(STORAGE_KEYS.TOURNAMENT_OWNERS, owners);
      if (record.supabaseId) {
        saveTournamentOwnerToCloud(record.supabaseId, owners[ownerKey]);
      }
      this.notify('tournament_owners_updated');

      // Create user_account for the organiser so they can log in
      const cleanOrgPhone = org.phone.replace(/[^0-9]/g, '');
      let accounts = this.getUserAccounts();
      let orgAcc = accounts.find(a => a.phone === cleanOrgPhone);
      const tourneyRef = record.supabaseId || id;
      if (!orgAcc) {
        orgAcc = {
          phone: cleanOrgPhone,
          password: org.password || cleanOrgPhone,
          name: org.name || 'Tournament Owner',
          role: 'TOURNAMENT_OWNER',
          isFirstLogin: false,
          ownedTournaments: [tourneyRef],
          created_at: Date.now()
        };
        accounts.push(orgAcc);
      } else {
        orgAcc.role = 'TOURNAMENT_OWNER';
        if (!orgAcc.ownedTournaments) orgAcc.ownedTournaments = [];
        if (!orgAcc.ownedTournaments.includes(tourneyRef)) orgAcc.ownedTournaments.push(tourneyRef);
        orgAcc.password = org.password || orgAcc.password;
      }
      safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
      saveUserAccountToCloud(orgAcc);

      // Also register organiser in Supabase Auth so their login gets a real session (RLS requires it)
      const orgEmail = org.email || `${cleanOrgPhone}@cpl.tournament.org`;
      const orgPlainPw = org.password || cleanOrgPhone;
      try {
        const signUpRes = await signUpUser(orgEmail, orgPlainPw, org.name || 'Tournament Owner', 'organiser');
        if (signUpRes.error) {
          console.warn("[AUTH] Supabase Auth signup for organiser notice:", signUpRes.error.message);
        } else {
          console.log("[AUTH] Supabase Auth account created for organiser:", orgEmail);
        }
      } catch (authErr) {
        console.warn("[AUTH] Supabase Auth signup for organiser failed:", authErr);
      }
    }

    this.notify('custom_tournaments_updated');
    return record;
  }

  async deleteCustomTournament(tourneyId, slug = null, supabaseId = null) {
    if (!tourneyId) return false;
    const list = this.getCustomTournaments();
    const match = list.find(t => t.id === tourneyId || t.slug === tourneyId || t.supabaseId === tourneyId || (slug && t.slug === slug) || (supabaseId && (t.supabaseId === supabaseId || t.id === supabaseId)));
    const cloudId = supabaseId || match?.supabaseId || match?.tournament_id || (tourneyId.length > 30 ? tourneyId : null);
    const resolvedSlug = slug || match?.slug || String(tourneyId).replace(/^t_/, '');
    
    const filtered = list.filter(t => 
      t.id !== tourneyId && 
      t.slug !== tourneyId && 
      (!cloudId || (t.supabaseId !== cloudId && t.id !== cloudId && t.tournament_id !== cloudId)) &&
      (!resolvedSlug || (t.slug !== resolvedSlug && t.id !== `t_${resolvedSlug}`))
    );
    safeSetLocalStorage(STORAGE_KEYS.CUSTOM_TOURNAMENTS, filtered);

    // Clean up scoped storage keys
    const targetRef = cloudId || tourneyId;
    try {
      localStorage.removeItem(`cpl_players_v8_${targetRef}`);
      localStorage.removeItem(`cpl_teams_v8_${targetRef}`);
      localStorage.removeItem(`cpl_fixtures_v8_${targetRef}`);
      if (resolvedSlug) {
        localStorage.removeItem(`cpl_players_v8_${resolvedSlug}`);
        localStorage.removeItem(`cpl_teams_v8_${resolvedSlug}`);
        localStorage.removeItem(`cpl_fixtures_v8_${resolvedSlug}`);
      }
    } catch(e) {}

    await deleteCustomTournamentFromCloud(cloudId || tourneyId, resolvedSlug);
    try {
      await this.syncWithCloud();
    } catch(e) {}
    this.notify('custom_tournaments_updated');
    return true;
  }

  getPendingTournaments() {
    const list = this.getCustomTournaments();
    return list.filter(t => t && (t.status === 'PENDING_APPROVAL' || t.status === 'pending_approval' || t.status === 'PENDING' || t.status === 'pending'));
  }

  getActiveTournaments() {
    const list = this.getCustomTournaments();
    return list.filter(t => !t.status || t.status === 'ACTIVE' || t.status === 'active' || t.status === 'APPROVED');
  }

  getAllAvailableTournaments() {
    const list = [];
    const seen = new Set();
    
    // Only return live, authoritative database tournaments from Supabase
    const customs = this.getCustomTournaments() || [];
    for (const c of customs) {
      const canonicalId = toUUID(c.supabaseId || c.id) || c.supabaseId || c.id;
      const slugKey = String(c.slug || c.name || '').toLowerCase().trim();
      if (!seen.has(canonicalId) && !seen.has(slugKey) && (!c.status || c.status === 'ACTIVE' || c.status === 'active' || c.status === 'APPROVED')) {
        seen.add(canonicalId);
        seen.add(slugKey);
        list.push(c);
      }
    }

    // Default fallback if sync is still initializing
    if (list.length === 0) {
      list.push({
        id: '033bfc04-033b-4c04-a33b-fc04033bfc04',
        supabaseId: '033bfc04-033b-4c04-a33b-fc04033bfc04',
        slug: 'jsl-2026',
        name: 'JHANKRA SUPER LEAGUE 2026',
        status: 'ACTIVE'
      });
    }
    return list;
  }

  getActiveTournament() {
    const list = this.getAllAvailableTournaments();
    const target = toUUID(this.activeTournamentId) || this.activeTournamentId;
    const active = list.find(t => {
      const tid = toUUID(t.supabaseId || t.id) || t.supabaseId || t.id;
      return tid === target || t.slug === this.activeTournamentId || t.id === this.activeTournamentId;
    });
    return active || list[0] || { name: 'JHANKRA SUPER LEAGUE 2026', slug: 'jsl-2026' };
  }

  getActiveTournamentName() {
    const tourney = this.getActiveTournament();
    return tourney?.name || this.getRegistrationSettings()?.leagueName || this.getAuctionSettings()?.tournamentName || 'JHANKRA SUPER LEAGUE 2026';
  }

  getPlayersForTournament(tourneyId = null) {
    if (!tourneyId || tourneyId === 'ALL') {
      const allTourneys = this.getAllAvailableTournaments();
      const combinedMap = new Map();
      for (const t of allTourneys) {
        const canonicalTid = toUUID(t.supabaseId || t.id) || t.supabaseId || t.id;
        const sk = scopedKey(STORAGE_KEYS.PLAYERS, canonicalTid);
        try {
          const raw = JSON.parse(localStorage.getItem(sk)) || [];
          for (const p of raw) {
            if (p && p.id && !combinedMap.has(p.id)) {
              combinedMap.set(p.id, p);
            }
          }
        } catch(e) {}
      }
      if (combinedMap.size > 0) return Array.from(combinedMap.values());
      return this.getPlayers();
    }
    
    const canonicalTid = toUUID(tourneyId) || tourneyId;
    const sk = scopedKey(STORAGE_KEYS.PLAYERS, canonicalTid);
    try {
      const raw = JSON.parse(localStorage.getItem(sk)) || [];
      if (raw.length > 0) return raw;
    } catch(e) {}
    return this.getPlayers();
  }

  async approveTournament(tourneyId, slug = null, supabaseId = null) {
    if (!tourneyId && !slug && !supabaseId) return false;
    const list = this.getCustomTournaments();
    const idx = list.findIndex(t => t.id === tourneyId || t.slug === tourneyId || t.supabaseId === tourneyId || (slug && t.slug === slug) || (supabaseId && (t.supabaseId === supabaseId || t.id === supabaseId)));
    if (idx >= 0) {
      list[idx].status = 'ACTIVE';
      list[idx].approvalStatus = 'approved';
      if (!list[idx].registration_settings) list[idx].registration_settings = {};
      list[idx].registration_settings.approval_status = 'approved';
      list[idx].updated_at = Date.now();
      safeSetLocalStorage(STORAGE_KEYS.CUSTOM_TOURNAMENTS, list);

      const cloudRef = supabaseId || list[idx].supabaseId || list[idx].tournament_id || list[idx].id;
      const resolvedSlug = slug || list[idx].slug || String(tourneyId).replace(/^t_/, '');
      await updateTournamentApprovalStatus(cloudRef, 'ACTIVE', '', resolvedSlug);

      try { await this.syncWithCloud(); } catch(e) {}
      this.notify('custom_tournaments_updated');
      return true;
    }
    return false;
  }

  async rejectTournament(tourneyId, reason = '', slug = null, supabaseId = null) {
    if (!tourneyId && !slug && !supabaseId) return false;
    const list = this.getCustomTournaments();
    const idx = list.findIndex(t => t.id === tourneyId || t.slug === tourneyId || t.supabaseId === tourneyId || (slug && t.slug === slug) || (supabaseId && (t.supabaseId === supabaseId || t.id === supabaseId)));
    if (idx >= 0) {
      list[idx].status = 'REJECTED';
      list[idx].approvalStatus = 'rejected';
      if (!list[idx].registration_settings) list[idx].registration_settings = {};
      list[idx].registration_settings.approval_status = 'rejected';
      list[idx].rejectionReason = reason;
      list[idx].updated_at = Date.now();
      safeSetLocalStorage(STORAGE_KEYS.CUSTOM_TOURNAMENTS, list);

      const cloudRef = supabaseId || list[idx].supabaseId || list[idx].tournament_id || list[idx].id;
      const resolvedSlug = slug || list[idx].slug || String(tourneyId).replace(/^t_/, '');
      await updateTournamentApprovalStatus(cloudRef, 'REJECTED', reason, resolvedSlug);

      try { await this.syncWithCloud(); } catch(e) {}
      this.notify('custom_tournaments_updated');
      return true;
    }
    return false;
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

    // 2. Check current active tournament player cache
    let found = null;
    try {
      const allExistingPlayers = this.getPlayers();
      found = allExistingPlayers.find(p => {
        const pPhone = (p.phone || p.mobile || '').replace(/[^0-9]/g, '');
        return pPhone === cleanPhone || (pPhone.endsWith(cleanPhone) && cleanPhone.length >= 10);
      });
    } catch(e) {}

    // 3. Check across ALL scoped tournament player lists in localStorage (e.g. JSL, JPL, CGL)
    if (!found && typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_KEYS.PLAYERS)) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                found = list.find(p => {
                  const pPhone = (p.phone || p.mobile || '').replace(/[^0-9]/g, '');
                  return pPhone === cleanPhone || (pPhone.endsWith(cleanPhone) && cleanPhone.length >= 10);
                });
                if (found) break;
              }
            }
          }
        }
      } catch(e) {}
    }

    if (found) {
      return {
        phone: cleanPhone,
        name: (found.name || '').trim(),
        photoUrl: found.hdPhotoUrl || found.photoUrl || found.player_photo_url || '',
        category: found.category || found.playingType || found.role || 'All Rounder',
        battingStyle: found.battingStyle || found.batting_style || 'Right Hand Bat',
        bowlingStyle: found.bowlingStyle || found.bowling_style || 'Right Arm Medium',
        village: found.village || found.address || '',
        district: found.district || 'Paschim Medinipur',
        dob: found.dob || null,
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

    pool[phone] = {
      phone,
      name: playerData.name || '',
      photoUrl: playerData.hdPhotoUrl || playerData.photoUrl || playerData.player_photo_url || '',
      category: playerData.category || playerData.playingType || playerData.role || 'All Rounder',
      battingStyle: playerData.battingStyle || playerData.batting_style || 'Right Hand Bat',
      bowlingStyle: playerData.bowlingStyle || playerData.bowling_style || 'Right Arm Medium',
      village: playerData.village || playerData.address || '',
      district: playerData.district || 'Paschim Medinipur',
      dob: playerData.dob || null,
      age: playerData.age || '',
      updatedAt: Date.now(),
      updated_at: Date.now()
    };
    safeSetLocalStorage(STORAGE_KEYS.UNIVERSAL_PLAYERS, pool);
    await saveUniversalPlayerToCloud(pool[phone]);
    return pool[phone];
  }

  async syncGlobalPlayersCount() {
    try {
      const count = await fetchGlobalUniquePlayersCount();
      if (count > 0 && count !== this._globalUniquePlayersCount) {
        this._globalUniquePlayersCount = count;
        localStorage.setItem('cpl_global_unique_players_count', String(count));
        this.notify('players_updated');
      }
    } catch(e) {}
  }

  getTotalRegisteredPlayersCount() {
    if (this._globalUniquePlayersCount && this._globalUniquePlayersCount > 0) {
      return this._globalUniquePlayersCount;
    }
    const cached = Number(localStorage.getItem('cpl_global_unique_players_count') || 0);
    if (cached > 0) return cached;

    const unique = new Set();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_KEYS.PLAYERS)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              arr.forEach(p => {
                if (p) {
                  const cleanPhone = (p.phone || p.mobile || '').replace(/[^0-9]/g, '').slice(-10);
                  const idKey = cleanPhone && cleanPhone.length >= 10 ? cleanPhone : p.id;
                  if (idKey) unique.add(idKey);
                }
              });
            }
          }
        }
      }
    } catch(e) {}

    const totalCount = unique.size;
    if (totalCount > 0) {
      this._globalUniquePlayersCount = totalCount;
      try { localStorage.setItem('cpl_global_unique_players_count', String(totalCount)); } catch(e) {}
      return totalCount;
    }

    return 168;
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
    const phone = (playerData.phone || playerData.mobile || '').replace(/\D/g, '').slice(-10);
    if (!phone) return null;

    let profile = profiles.find(pp => (pp.phone || '').replace(/\D/g, '').slice(-10) === phone);
    if (!profile) {
      profile = {
        id: 'prof-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        phone,
        name: playerData.name || playerData.playerName,
        fatherName: playerData.fatherName || playerData.father_name || '',
        dob: playerData.dob || null,
        age: playerData.age || '',
        village: playerData.village || playerData.address || '',
        district: playerData.district || 'Paschim Medinipur',
        state: playerData.state || 'West Bengal',
        battingStyle: playerData.battingStyle || 'Right Hand Bat',
        bowlingStyle: playerData.bowlingStyle || 'Right Hand Medium',
        photoUrl: playerData.photoUrl || playerData.player_photo_url || '',
        aadharPhotoUrl: playerData.aadharPhotoUrl || playerData.idCardFrontUrl || '',
        idCardFrontUrl: playerData.idCardFrontUrl || playerData.aadharPhotoUrl || '',
        idCardBackUrl: playerData.idCardBackUrl || '',
        paymentReceiptUrl: playerData.paymentReceiptUrl || playerData.paymentProofUrl || '',
        paymentRef: playerData.paymentRef || playerData.remarks || '',
        created_at: new Date().toISOString()
      };
      profiles.push(profile);
    } else {
      profile.name = playerData.name || playerData.playerName || profile.name;
      profile.fatherName = playerData.fatherName || playerData.father_name || profile.fatherName || '';
      profile.dob = playerData.dob || profile.dob || null;
      profile.age = playerData.age || profile.age || '';
      profile.village = playerData.village || playerData.address || profile.village;
      profile.district = playerData.district || profile.district || 'Paschim Medinipur';
      profile.state = playerData.state || profile.state || 'West Bengal';
      profile.battingStyle = playerData.battingStyle || profile.battingStyle;
      profile.bowlingStyle = playerData.bowlingStyle || profile.bowlingStyle;
      profile.photoUrl = playerData.photoUrl || playerData.player_photo_url || profile.photoUrl;
      profile.aadharPhotoUrl = playerData.aadharPhotoUrl || playerData.idCardFrontUrl || profile.aadharPhotoUrl || '';
      profile.idCardFrontUrl = playerData.idCardFrontUrl || playerData.aadharPhotoUrl || profile.idCardFrontUrl || '';
      profile.idCardBackUrl = playerData.idCardBackUrl || profile.idCardBackUrl || '';
      profile.paymentReceiptUrl = playerData.paymentReceiptUrl || playerData.paymentProofUrl || profile.paymentReceiptUrl || '';
      profile.paymentRef = playerData.paymentRef || playerData.remarks || profile.paymentRef || '';
    }

    safeSetLocalStorage(STORAGE_KEYS.PLAYER_PROFILES, profiles);
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
      safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
      this.notify('players_updated');
    }

    // Update profile
    const profiles = this.getPlayerProfiles();
    const profile = profiles.find(pp => (pp.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
    if (profile) {
      profile.phoneVerified = true;
      safeSetLocalStorage(STORAGE_KEYS.PLAYER_PROFILES, profiles);
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
      safeSetLocalStorage(this._scopedKey('PLAYERS'), players);
      this.notify('players_updated');
    }

    // Update profile
    const profiles = this.getPlayerProfiles();
    const profile = profiles.find(pp => (pp.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
    if (profile) {
      profile.photoUrl = newPhotoUrl;
      profile.player_photo_url = newPhotoUrl;
      safeSetLocalStorage(STORAGE_KEYS.PLAYER_PROFILES, profiles);
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
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      }
    } catch (e) {}
    return {
      '033bfc04-033b-4c04-a33b-fc04033bfc04': { phone: '8972144166', name: 'Pintu Santra', assignedAt: Date.now() },
      'tournament-jsl-2026': { phone: '8972144166', name: 'Pintu Santra', assignedAt: Date.now() },
      '5cf4f50c-3930-486a-83c3-3f59414a7d6f': { phone: '9732710001', name: 'Kuapur Organiser', assignedAt: Date.now() },
      'tournament-k2026': { phone: '9732710001', name: 'Kuapur Organiser', assignedAt: Date.now() }
    };
  }

  async setTournamentOwner(tournamentId, phone, name) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) return false;

    const owners = this.getTournamentOwners();
    owners[tournamentId] = {
      phone: cleanPhone,
      name: name || 'Tournament Owner',
      assignedAt: Date.now()
    };
    safeSetLocalStorage(STORAGE_KEYS.TOURNAMENT_OWNERS, owners);

    const players = this.getPlayers();
    const player = players.find(p => (p.phone || p.mobile || '').replace(/[^0-9]/g, '') === cleanPhone) || { phone: cleanPhone, name };
    let userAcc = await this.ensureUserAccountForPlayer(player);
    if (userAcc) {
      userAcc.role = 'TOURNAMENT_OWNER';
      if (!userAcc.ownedTournaments) userAcc.ownedTournaments = [];
      if (!userAcc.ownedTournaments.includes(tournamentId)) userAcc.ownedTournaments.push(tournamentId);
      const accounts = this.getUserAccounts();
      const idx = accounts.findIndex(a => a.phone === cleanPhone);
      if (idx !== -1) accounts[idx] = userAcc; else accounts.push(userAcc);
      safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
    }

    this.notify('tournament_owners_updated');
    return true;
  }

  async ensureUserAccountForPlayer(player, customPassword = null) {
    if (!player) return null;
    const cleanPhone = (player.phone || player.mobile || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) return null;

    let accounts = this.getUserAccounts();
    let acc = accounts.find(a => a.phone === cleanPhone);
    const owners = this.getTournamentOwners();
    const isOwner = Object.values(owners).some(o => o && o.phone === cleanPhone);

    const rawPassword = customPassword || cleanPhone;
    const isCustom = Boolean(customPassword);

    if (!acc) {
      const hashedPw = await hashPassword(rawPassword, cleanPhone);
      acc = {
        phone: cleanPhone,
        password: hashedPw,
        isFirstLogin: isCustom ? false : true,
        name: player.name || 'Player',
        playerId: player.id || null,
        role: isOwner ? 'TOURNAMENT_OWNER' : 'PLAYER',
        ownedTournaments: isOwner ? Object.entries(owners).filter(([, o]) => o && o.phone === cleanPhone).map(([k]) => k) : [],
        created_at: Date.now()
      };
      accounts.push(acc);
      safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
      saveUserAccountToCloud(acc);
    } else {
      if (customPassword) {
        acc.password = await hashPassword(customPassword, cleanPhone);
        acc.isFirstLogin = false;
        safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
        saveUserAccountToCloud(acc);
      } else if (!acc.password || acc.password === cleanPhone) {
        acc.password = await hashPassword(cleanPhone, cleanPhone);
        safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
        saveUserAccountToCloud(acc);
      }
      if (isOwner && acc.role !== 'TOURNAMENT_OWNER') {
        acc.role = 'TOURNAMENT_OWNER';
        safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
        saveUserAccountToCloud(acc);
      }
    }
    return acc;
  }

  async authenticateUser(identifier, password) {
    const rawId = (identifier || '').trim();
    if (!rawId) {
      return { success: false, message: 'Please enter your Mobile Number or Admin Email!' };
    }

    // 1. EMAIL LOGIN → Route through Supabase Auth
    if (rawId.includes('@')) {
      try {
        const authResult = await signInUser(rawId, password);
        const authedUser = authResult?.data?.user || authResult?.user;
        if (authedUser) {
          const profile = authResult?.data?.profile || (await fetchUserProfile(authedUser.id));
          const isMaster = !!(profile && profile.role === 'master_admin');
          const user = {
            id: authedUser.id,
            email: rawId,
            name: profile?.full_name || authedUser.user_metadata?.full_name || rawId.split('@')[0],
            role: isMaster ? 'SUPER_ADMIN' : 'TOURNAMENT_OWNER',
            isFirstLogin: false,
            ownedTournaments: Object.keys(this.getTournamentOwners())
          };
          this.setCurrentUser(user);
          localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
          this.setUserRole('ADMIN', user.name);
          this.notify('admin_auth_updated');
          return { success: true, user, role: user.role, isFirstLogin: false, redirect: 'admin' };
        }
        if (authResult?.error?.message) {
          return { success: false, message: authResult.error.message };
        }
      } catch (e) {
        console.warn("[AUTH] Error during user login:", e);
      }
      return { success: false, message: 'Incorrect email or password!' };
    }

    // 2. MOBILE NUMBER LOGIN (Players & Tournament Owners)
    const cleanPhone = rawId.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, message: 'Please enter a valid 10-digit mobile number or admin email!' };
    }

    // Check if this mobile is assigned as a Tournament Owner (across all tournaments)
    const owners = this.getTournamentOwners();
    const ownedTourneyKeys = Object.entries(owners)
      .filter(([, o]) => o && (o.phone || '').replace(/[^0-9]/g, '') === cleanPhone)
      .map(([key]) => key);
    const isTournamentOwner = ownedTourneyKeys.length > 0;

    const players = this.getPlayers();
    const player = players.find(p => (p.phone || p.mobile || '').replace(/[^0-9]/g, '') === cleanPhone);

    let accounts = this.getUserAccounts();
    let acc = accounts.find(a => a.phone === cleanPhone);

    if (!acc && player) {
      acc = await this.ensureUserAccountForPlayer(player);
      accounts = this.getUserAccounts();
    }

    if (!acc) {
      const ownerName = isTournamentOwner
        ? (Object.values(owners).find(o => o && (o.phone || '').replace(/[^0-9]/g, '') === cleanPhone)?.name || 'Tournament Admin')
        : 'Player';
      const hashedPw = await hashPassword(cleanPhone, cleanPhone);
      acc = {
        phone: cleanPhone,
        password: hashedPw,
        name: player ? player.name : ownerName,
        role: isTournamentOwner ? 'TOURNAMENT_OWNER' : 'PLAYER',
        isFirstLogin: true,
        ownedTournaments: ownedTourneyKeys,
        created_at: Date.now()
      };
      accounts.push(acc);
      safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
    }

    // Dynamic role elevation if assigned as Tournament Owner
    if (isTournamentOwner) {
      acc.role = 'TOURNAMENT_OWNER';
      if (!acc.ownedTournaments) acc.ownedTournaments = [];
      for (const key of ownedTourneyKeys) {
        if (!acc.ownedTournaments.includes(key)) acc.ownedTournaments.push(key);
      }
      safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
    }

    // Verify Password (salted hash verification with legacy fallback)
    const isPwValid = await verifyPasswordMatch(password, acc.password, cleanPhone);
    if (!isPwValid) {
      return { success: false, message: 'Incorrect password! (Default password is your 10-digit mobile number)' };
    }

    // Set logged-in session
    this.setCurrentUser(acc);

    // Auto-unlock admin controls if Tournament Owner or Super Admin
    if (acc.role === 'TOURNAMENT_OWNER' || acc.role === 'SUPER_ADMIN') {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      if (Array.isArray(acc.ownedTournaments) && acc.ownedTournaments.length > 0) {
        const targetTid = toUUID(acc.ownedTournaments[0]) || acc.ownedTournaments[0];
        this.setActiveTournament(targetTid);
      }
    }

    return {
      success: true,
      user: acc,
      role: acc.role || 'PLAYER',
      isFirstLogin: !!acc.isFirstLogin,
      redirect: (acc.role === 'TOURNAMENT_OWNER' || acc.role === 'SUPER_ADMIN') ? 'admin' : 'profile'
    };
  }

  async updateUserPassword(phone, newPassword) {
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
        acc = await this.ensureUserAccountForPlayer(player);
        accounts = this.getUserAccounts();
      }
    }

    if (!acc) return { success: false, message: 'Account not found!' };

    acc.password = await hashPassword(newPassword, cleanPhone);
    acc.isFirstLogin = false;
    acc.passwordChangedAt = Date.now();

    const existingIdx = accounts.findIndex(a => a.phone === cleanPhone);
    if (existingIdx !== -1) {
      accounts[existingIdx] = acc;
    } else {
      accounts.push(acc);
    }

    safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
    saveUserAccountToCloud(acc);
    this.setCurrentUser(acc);

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
        const ownedKeys = Object.entries(owners)
          .filter(([, o]) => o && (o.phone || '').replace(/[^0-9]/g, '') === cleanPhone)
          .map(([key]) => key);
        if (!u.ownedTournaments) u.ownedTournaments = [];
        for (const key of ownedKeys) {
          if (!u.ownedTournaments.includes(key)) u.ownedTournaments.push(key);
        }
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
    if (eventName === 'players_updated') this._invalidateCache('players');
    if (eventName === 'teams_updated') this._invalidateCache('teams');
    if (eventName === 'fixtures_updated') { this._invalidateCache('fixtures'); this._invalidateCache('players'); }
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

  on(eventName, callback) {
    return this.subscribe(eventName, callback);
  }

  off(eventName, callback) {
    if (typeof window === 'undefined') return;
    window.removeEventListener(eventName, callback);
  }

  // --- PUBLIC COMMUNITY QUERIES & DISCUSSION BOARD ---
  getCommunityQueries() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMUNITY_QUERIES)) || [];
  }

  async syncCommunityQueriesFromCloud() {
    try {
      const cloudQueries = await fetchCommunityQueriesFromCloud(this.activeTournamentId);
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
    saveCommunityQueryToCloud(newQuery, this.activeTournamentId);
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
    saveCommunityQueryToCloud(query, this.activeTournamentId);
    this.notify('queries_updated');
    return newReply;
  }

  async deleteCommunityQuery(queryId) {
    if (!queryId) return false;
    let queries = this.getCommunityQueries();
    queries = queries.filter(q => q && q.id !== queryId);
    safeSetLocalStorage(STORAGE_KEYS.COMMUNITY_QUERIES, queries);
    deleteCommunityQueryFromCloud(queryId);
    this.notify('queries_updated');
    return true;
  }
}

export const store = new Store();
