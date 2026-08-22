// LocalStorage & Cloud Database Reactive Store (Developer: Suman Kolay - Continuous Dynamic Numbering Release)

import { INITIAL_LEAGUES, INITIAL_TEAMS, INITIAL_PLAYERS, INITIAL_FIXTURES } from './data.js?v=10.9.1';
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
  saveTeamToFirebase,
  saveFixtureToFirebase,
  deleteFixtureFromFirebase,
  saveAuctionSettingsToFirebase,
  saveLiveAuctionToFirebase,
  saveLiveMatchToFirebase,
  saveCommunityQueryToFirebase,
  deleteCommunityQueryFromFirebase,
  fetchCommunityQueriesFromFirebase,
  fetchTournamentOwnersFromFirebase,
  fetchUserAccountsFromFirebase
} from './supabase.js?v=11.3.5';

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
  USER_ACCOUNTS: 'cpl_user_accounts_v8'
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
        // DATA LOSS PREVENTION SAFEGUARD: Only restore cloud if NO admin clear action occurred
        if (cloudData.players.length === 0 && localPlayers.length > 0 && !cloudData.clearedAt) {
          console.warn("Cloud data was empty! Restoring cloud database from local players backup...");
          saveCloudData(localPlayers, this.getTeams());
          return;
        }

        // If admin cleared all in cloud, enforce empty local array
        if (cloudData.players.length === 0 && cloudData.clearedAt > 0) {
          if (localPlayers.length > 0) {
            safeSetLocalStorage(STORAGE_KEYS.PLAYERS, []);
            this.notify('players_updated');
          }
          return;
        }

        // MERGE LOCAL & CLOUD PLAYERS: Compare modification timestamps to preserve admin edits/approvals
        const deletedIdsSet = new Set(cloudData.deletedPlayerIds || []);
        const validLocalPlayers = localPlayers.filter(p => p && p.id && !deletedIdsSet.has(p.id));

        const localPlayerMap = new Map(validLocalPlayers.map(p => [p.id, p]));
        const mergedMap = new Map();

        // 1. Process cloud players as canonical Single Source of Truth
        for (const cloudP of cloudData.players) {
          if (!cloudP || !cloudP.id || deletedIdsSet.has(cloudP.id)) continue;
          const localP = localPlayerMap.get(cloudP.id);
          const isPurged = (localP && localP.docsPurged) || cloudP.docsPurged;

          const mergedRecord = { ...(localP || {}), ...cloudP };

          if (isPurged) {
            mergedRecord.aadharPhotoUrl = '';
            mergedRecord.aadhaar_photo_url = '';
            mergedRecord.aadharBackUrl = '';
            mergedRecord.aadhaar_back_url = '';
            mergedRecord.aadhar_photo = '';
            mergedRecord.aadhaar_photo = '';
            mergedRecord.paymentReceiptUrl = '';
            mergedRecord.payment_receipt_url = '';
            mergedRecord.paymentProofUrl = '';
            mergedRecord.payment_proof_url = '';
            mergedRecord.payment_receipt = '';
            mergedRecord.paymentProof = '';
            mergedRecord.docsPurged = true;
          }

          mergedMap.set(cloudP.id, mergedRecord);
        }

        // 2. Also preserve any local newly-registered players that haven't been synced to cloud yet
        for (const localP of validLocalPlayers) {
          if (localP && localP.id && !mergedMap.has(localP.id) && !deletedIdsSet.has(localP.id)) {
            mergedMap.set(localP.id, localP);
            // Push pending local registration to cloud
            syncPlayerToSupabase(localP);
            savePlayerToFirebase(localP);
          }
        }

        let mergedPlayers = Array.from(mergedMap.values());

        // If cloud database is empty, fallback to valid local players
        if (mergedPlayers.length === 0 && validLocalPlayers.length > 0) {
          mergedPlayers = validLocalPlayers;
        }

        // 3. Sort chronologically by registration timestamp
        mergedPlayers.sort((a, b) => {
          const tA = Number(a.created_at || a.timestamp || a.regTimestamp || 0);
          const tB = Number(b.created_at || b.timestamp || b.regTimestamp || 0);
          return tA - tB;
        });

        // CONTINUOUS DYNAMIC RE-INDEXING: Ensure registration IDs (JSL2026-0001, JSL2026-0002...) and display numbers (1, 2, 3...) have no gaps
        const reindexedPlayers = mergedPlayers.map((p, idx) => {
          const displayNo = idx + 1;
          const regId = `JSL2026-${String(displayNo).padStart(4, '0')}`;
          return {
            ...p,
            serialNo: displayNo,
            displayRegistrationNumber: displayNo,
            registrationId: regId,
            regNo: regId
          };
        });

        safeSetLocalStorage(STORAGE_KEYS.PLAYERS, reindexedPlayers);
        this.syncAllIconPlayers();
        this.notify('players_updated');
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
        const deletedTeamIdsSet = new Set(cloudData.deletedTeamIds || []);

        if (cloudData.teams.length === 0 && cloudData.teamsClearedAt > 0) {
          if (localTeams.length > 0) {
            safeSetLocalStorage(STORAGE_KEYS.TEAMS, []);
            this.notify('teams_updated');
          }
          return;
        }

        const validLocalTeams = localTeams.filter(t => t && t.id && !deletedTeamIdsSet.has(t.id));
        const cloudTeamIds = new Set(cloudData.teams.map(t => t.id));
        const missingLocalTeams = validLocalTeams.filter(t => t && t.id && !cloudTeamIds.has(t.id) && !deletedTeamIdsSet.has(t.id));
        let mergedTeams = [...cloudData.teams, ...missingLocalTeams];

        const reindexedTeams = mergedTeams.map((t, idx) => ({
          ...t,
          serialNo: idx + 1
        }));

        const localTeamsStr = localStorage.getItem(STORAGE_KEYS.TEAMS) || '[]';
        const cleanCloudTeamsStr = JSON.stringify(sanitizeForStorage(reindexedTeams));
        
        if (localTeamsStr !== cleanCloudTeamsStr) {
          safeSetLocalStorage(STORAGE_KEYS.TEAMS, reindexedTeams);
          this.syncAllIconPlayers();
          this.notify('teams_updated');
        }
      }

      // 3. Sync Fixtures
      if (Array.isArray(cloudData.fixtures)) {
        const localFixturesStr = localStorage.getItem(STORAGE_KEYS.FIXTURES) || '[]';
        const cloudFixturesStr = JSON.stringify(cloudData.fixtures);
        if (localFixturesStr !== cloudFixturesStr) {
          safeSetLocalStorage(STORAGE_KEYS.FIXTURES, cloudData.fixtures);
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
      } catch (errOwners) {
        console.warn("Owners sync notice:", errOwners);
      }
    } catch (err) {
      console.warn("Cloud sync error:", err);
    }
  }

  startCloudPolling() {
    if (this.cloudPollingInterval) clearInterval(this.cloudPollingInterval);
    // Intelligent 4s Background Cloud Polling (only if not filling modal forms)
    this.cloudPollingInterval = setInterval(() => {
      const isUserFillingForm = document.getElementById('player-reg-modal') || document.getElementById('team-reg-modal') || document.getElementById('edit-player-modal');
      if (!isUserFillingForm) {
        this.syncWithCloud();
      }
    }, 4000);
  }

  setupRealtimeListeners() {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.PLAYERS) this.notify('players_updated');
      if (e.key === STORAGE_KEYS.TEAMS) this.notify('teams_updated');
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
      initRealtimePushListener(() => {
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
    return !!(u && (u.role === 'SUPER_ADMIN' || (u.email && u.email.toLowerCase() === 'bakolaypan@gmail.com')));
  }

  authenticateAdmin(email, password) {
    const validEmail = 'bakolaypan@gmail.com';
    const validPass = 'Suman@2030';

    if (email.trim().toLowerCase() === validEmail && password === validPass) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      this.setUserRole('ADMIN', 'Suman Kolay (Master Admin)');
      this.notify('admin_auth_updated');
      return { success: true };
    } else {
      return { success: false, message: 'Invalid Admin Email ID or Password!' };
    }
  }

  logoutAdmin() {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    this.setUserRole('GUEST', 'Guest Visitor');
    this.notify('admin_auth_updated');
  }

  // --- LEAGUES ---
  getLeagues() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LEAGUES)) || [];
  }

  getLeagueById(id) {
    return this.getLeagues().find(l => l.id === id);
  }

  // --- PLAYERS ---
  getPlayers() {
    const rawPlayers = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS)) || [];
    const rawTeams = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS)) || [];
    rawPlayers.sort((a, b) => (a.createdTime || a.regTimestamp || 0) - (b.createdTime || b.regTimestamp || 0));

    // Deduplicate players by unique ID to preserve all distinct registrations
    const uniqueMap = new Map();
    for (const p of rawPlayers) {
      if (!p || !p.id) continue;
      uniqueMap.set(p.id, p);
    }

    const uniquePlayers = Array.from(uniqueMap.values());
    uniquePlayers.sort((a, b) => (a.createdTime || a.regTimestamp || 0) - (b.createdTime || b.regTimestamp || 0));

    return uniquePlayers.map((p, idx) => {
      const displayNo = idx + 1;
      const regId = `JSL2026-${String(displayNo).padStart(4, '0')}`;

      let validPhoto = p.photoUrl || p.player_photo_url || '';
      if (!validPhoto || validPhoto.includes('[Image Stored In Cloud]') || validPhoto.includes('unsplash.com') || (!validPhoto.startsWith('http') && !validPhoto.startsWith('data:image'))) {
        validPhoto = DEFAULT_AVATAR;
      }

      // Check if this player is chosen as an Icon Player for any team
      const pNameNorm = (p.name || '').trim().toLowerCase();
      const matchingIconTeam = rawTeams.find(t => {
        const iconName = (t.iconPlayerName || t.iconName || '').trim().toLowerCase();
        const iconId = t.iconPlayerId;
        return (iconId && iconId === p.id) || (iconName && iconName === pNameNorm);
      });

      const isIcon = !!matchingIconTeam || !!p.isIcon || !!p.isIconPlayer;
      const effectiveTeamId = matchingIconTeam ? matchingIconTeam.id : p.teamId;
      const effectiveTeamName = matchingIconTeam ? matchingIconTeam.name : (p.teamName || '');
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
    return this.getPlayers().find(p => p.id === id);
  }

  // --- REGISTER NEW PLAYER WITH ATOMIC TIMESTAMP QUEUE & ZERO DUPLICATES ---
  registerPlayer(playerData) {
    let players = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS)) || [];
    
    const inputName = (playerData.name || playerData.playerName || '').trim().toLowerCase();
    const inputPhone = (playerData.phone || playerData.mobile || '').trim();
    const inputFather = (playerData.fatherName || '').trim().toLowerCase();
    
    // Ensure we create/update their lifetime profile
    const profile = this.createOrUpdatePlayerProfile(playerData);
    
    const existingIdx = players.findIndex(p => 
      p && (
        (playerData.id && p.id === playerData.id) ||
        (
          inputName && inputPhone && inputFather &&
          (p.phone || p.mobile || '').trim() === inputPhone && 
          (p.name || '').trim().toLowerCase() === inputName &&
          (p.fatherName || '').trim().toLowerCase() === inputFather
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
      syncPlayerToSupabase(players[existingIdx]);
      this.notify('players_updated');
      return players[existingIdx];
    }
    const createdTime = Date.now() + Math.random();
    const uuid = 'ply-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const newPlayer = {
      id: uuid,
      profileId: profile ? profile.id : null,
      createdTime,
      regTimestamp: createdTime,
      leagueCategory: playerData.leagueCategory || 'JSL',
      name: playerData.name || playerData.playerName,
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
      paymentStatus: 'PENDING',
      registrationStatus: 'PENDING',
      phoneVerified: playerData.phoneVerified !== false,
      remarks: playerData.remarks || playerData.paymentRef || '',
      paymentRef: playerData.paymentRef || '',
      teamId: null,
      soldPrice: 0,
      basePrice: Number(playerData.basePrice) || 300,
      regDate: new Date().toISOString().split('T')[0]
    };

    players.push(newPlayer);

    // ATOMIC RE-INDEXING (Continuous numbering 1, 2, 3... JSL2026-0001, 0002...)
    players.sort((a, b) => (a.createdTime || a.regTimestamp || 0) - (b.createdTime || b.regTimestamp || 0));

    players.forEach((p, idx) => {
      const dNo = idx + 1;
      p.serialNo = dNo;
      p.displayRegistrationNumber = dNo;
      p.registrationId = `JSL2026-${String(dNo).padStart(4, '0')}`;
      p.regNo = p.registrationId;
    });

    const registeredPlayer = players.find(p => p.id === uuid) || newPlayer;

    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
    syncPlayerToSupabase(registeredPlayer);
    this.notify('players_updated');
    return registeredPlayer;
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
      
      // Re-index serials
      players.forEach((p, i) => {
        const dNo = i + 1;
        p.serialNo = dNo;
        p.displayRegistrationNumber = dNo;
        p.registrationId = `JSL2026-${String(dNo).padStart(4, '0')}`;
        p.regNo = p.registrationId;
      });

      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      saveCloudData(players, this.getTeams());
      savePlayerToFirebase(players[idx]);
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
        safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
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
      saveCloudData(players, this.getTeams());
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
      saveCloudData(players, this.getTeams());
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
        }
      }

      player.teamId = teamId;
      player.soldPrice = Number(soldPrice) || player.basePrice || 0;
      
      team.squadCount += 1;
      team.purseSpent += player.soldPrice;

      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
      saveCloudData(players, teams);
      syncPlayerToSupabase(player);
      syncTeamToSupabase(team);
      this.notify('players_updated');
      this.notify('teams_updated');
    }
  }

  unassignPlayerFromTeam(playerId) {
    const players = this.getPlayers();
    const teams = this.getTeams();
    const player = players.find(p => p.id === playerId);
    if (!player) return false;

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

    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
    safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
    saveCloudData(players, teams);
    syncPlayerToSupabase(player);
    this.notify('players_updated');
    this.notify('teams_updated');
    return true;
  }


  resetAuctionData() {
    const players = this.getPlayers();
    players.forEach(p => {
      p.teamId = null;
      p.teamName = null;
      p.soldPrice = 0;
      p.auctionStatus = 'PENDING';
      p.isSold = false;
      p.boughtByTeamId = null;
    });

    const teams = (JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS)) || []).map((t, idx) => {
      const hasIcon = !!(t.iconPlayerName || t.iconName);
      const iconDeduction = hasIcon ? 1000 : 0;
      const budget = Number(t.purseBudget || t.purse || 8000);
      return {
        ...t,
        serialNo: idx + 1,
        purseBudget: budget,
        purseSpent: iconDeduction,
        remainingPurse: Math.max(0, budget - iconDeduction),
        squadCount: hasIcon ? 1 : 0,
        playersCount: hasIcon ? 1 : 0,
        playerIds: []
      };
    });

    this.updateLiveAuctionState({
      status: 'IDLE',
      active_player_id: null,
      current_bid: 0,
      highest_bidder_team_id: null,
      last_sold_player_id: null,
      last_sold_price: 0,
      last_sold_team_id: null
    });

    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
    safeSetLocalStorage(STORAGE_KEYS.TEAMS, teams);
    saveCloudData(players, teams);
    
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
    
    return teams.map((t, idx) => {
      const hasIcon = !!((t.iconPlayerName && t.iconPlayerName.trim()) || (t.iconName && t.iconName.trim()));
      const iconDeduction = hasIcon ? 1000 : 0;
      
      // Calculate total spent on purchased auction players (excluding icon player to avoid double deduction)
      const purchasedNonIconPlayers = allPlayers.filter(p => p.teamId === t.id && !p.isIcon && !p.isIconPlayer && (p.auctionStatus === 'SOLD' || p.paymentStatus === 'APPROVED'));
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
        squadCount: squadCount
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
      saveCloudData(players, this.getTeams());
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
      saveCloudData(players, teams);
      this.notify('players_updated');
    }
  }

  registerTeam(teamData) {
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

    saveCloudData(this.getPlayers(), teams);
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
      saveCloudData(this.getPlayers(), teams);
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
    saveCloudData(players, teams);
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

  // --- LIVE AUCTION STATE ---
  async getLiveAuctionState() {
    try {
      const local = localStorage.getItem('cpl_live_auction_state');
      if (local) {
        this.liveAuctionState = JSON.parse(local);
      }
    } catch(e) {}

    try {
      const res = await fetch(`${FIREBASE_DB_URL}/cpl_master/liveAuction.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        this.liveAuctionState = data;
        if (data && data.active_player_id) {
          safeSetLocalStorage('cpl_live_auction_state', data);
        } else {
          localStorage.removeItem('cpl_live_auction_state');
        }
        return data;
      }
    } catch (e) {
      console.warn("Live auction state fetch error:", e);
    }
    return this.liveAuctionState || null;
  }

  async updateLiveAuctionState(state) {
    this.liveAuctionState = state;
    if (state && state.active_player_id) {
      safeSetLocalStorage('cpl_live_auction_state', state);
    } else {
      localStorage.removeItem('cpl_live_auction_state');
    }
    await saveLiveAuctionToFirebase(state);
    this.notify('live_auction_updated');
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
