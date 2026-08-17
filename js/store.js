// LocalStorage & Cloud Database Reactive Store (Developer: Suman Kolay - Continuous Dynamic Numbering Release)

import { INITIAL_LEAGUES, INITIAL_TEAMS, INITIAL_PLAYERS, INITIAL_FIXTURES } from './data.js';
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
  saveFixtureToFirebase,
  deleteFixtureFromFirebase,
  saveAuctionSettingsToFirebase,
  saveLiveAuctionToFirebase,
  saveLiveMatchToFirebase
} from './supabase.js';

const FIREBASE_DB_URL = "https://cpl-jsl-2026-default-rtdb.firebaseio.com";

const STORAGE_KEYS = {
  LEAGUES: 'cpl_leagues_v7',
  TEAMS: 'cpl_teams_v7',
  PLAYERS: 'cpl_players_v7',
  FIXTURES: 'cpl_fixtures_v7',
  USER: 'cpl_user_v7',
  ADMIN_AUTH: 'cpl_admin_auth_v7',
  PLAYER_PROFILES: 'cpl_player_profiles_v7',
  AUCTION_SETTINGS: 'cpl_auction_settings_v7'
};

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23059669'/%3E%3Ctext x='50' y='62' font-size='45' text-anchor='middle' fill='white'%3E🏏%3C/text%3E%3C/svg%3E";

// Quota-Safe LocalStorage Helper to prevent QuotaExceededError without corrupting image URLs
function safeSetLocalStorage(key, data) {
  try {
    let cleanData = data;
    if (key === STORAGE_KEYS.PLAYERS && Array.isArray(data)) {
      cleanData = data.map(item => {
        if (!item) return item;
        const itemCopy = { ...item };
        if (itemCopy.photoUrl && itemCopy.photoUrl.startsWith('data:image')) {
          itemCopy.photoUrl = DEFAULT_AVATAR;
        }
        if (itemCopy.player_photo_url && itemCopy.player_photo_url.startsWith('data:image')) {
          itemCopy.player_photo_url = DEFAULT_AVATAR;
        }
        if (itemCopy.aadharPhotoUrl && itemCopy.aadharPhotoUrl.startsWith('data:image')) {
          itemCopy.aadharPhotoUrl = 'Attached Document';
        }
        if (itemCopy.paymentReceiptUrl && itemCopy.paymentReceiptUrl.startsWith('data:image')) {
          itemCopy.paymentReceiptUrl = 'Attached Receipt';
        }
        return itemCopy;
      });
    }
    localStorage.setItem(key, JSON.stringify(cleanData));
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) {
      console.warn(`LocalStorage quota exceeded for ${key}. Using lightweight avatar fallback for local cache...`);
      if (Array.isArray(data)) {
        const lightweightData = data.map(item => {
          const itemCopy = { ...item };
          if (itemCopy.photoUrl && itemCopy.photoUrl.startsWith('data:image')) {
            itemCopy.photoUrl = DEFAULT_AVATAR;
          }
          if (itemCopy.player_photo_url && itemCopy.player_photo_url.startsWith('data:image')) {
            itemCopy.player_photo_url = DEFAULT_AVATAR;
          }
          if (itemCopy.aadharPhotoUrl && itemCopy.aadharPhotoUrl.startsWith('data:image')) {
            itemCopy.aadharPhotoUrl = 'Attached Document';
          }
          if (itemCopy.paymentReceiptUrl && itemCopy.paymentReceiptUrl.startsWith('data:image')) {
            itemCopy.paymentReceiptUrl = 'Attached Receipt';
          }
          return itemCopy;
        });
        try {
          localStorage.setItem(key, JSON.stringify(lightweightData));
          console.log(`Saved lightweight copy to LocalStorage for ${key}.`);
        } catch (e2) {
          console.error("Critical LocalStorage quota notice:", e2);
        }
      }
    } else {
      console.error("LocalStorage setItem error:", err);
    }
  }
}

class Store {
  constructor() {
    this.init();
    this.setupRealtimeListeners();
    this.syncWithCloud();
    this.startCloudPolling();
  }

  init() {
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
      safeSetLocalStorage(STORAGE_KEYS.AUCTION_SETTINGS, { defaultBasePrice: 200, defaultPurseBudget: 8000 });
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

        // MERGE LOCAL & CLOUD PLAYERS: Exclude deleted players permanently
        const deletedIdsSet = new Set(cloudData.deletedPlayerIds || []);
        const validLocalPlayers = localPlayers.filter(p => p && p.id && !deletedIdsSet.has(p.id));

        const cloudPlayerIds = new Set(cloudData.players.map(p => p.id));
        const missingLocalPlayers = validLocalPlayers.filter(p => p && p.id && !cloudPlayerIds.has(p.id) && !deletedIdsSet.has(p.id));

        let mergedPlayers = [...cloudData.players, ...missingLocalPlayers];

        // Deduplicate merged players by unique ID to preserve all distinct player entries
        const uniqueMergedMap = new Map();
        for (const p of mergedPlayers) {
          if (!p || !p.id) continue;
          uniqueMergedMap.set(p.id, p);
        }
        mergedPlayers = Array.from(uniqueMergedMap.values());

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

        const localPlayersStr = localStorage.getItem(STORAGE_KEYS.PLAYERS) || '[]';
        const cloudPlayersStr = JSON.stringify(reindexedPlayers);
        
        if (localPlayersStr !== cloudPlayersStr) {
          safeSetLocalStorage(STORAGE_KEYS.PLAYERS, reindexedPlayers);
          this.notify('players_updated');
        }

        // If local had un-synced players (and not deleted), push merged list back to cloud
        if (missingLocalPlayers.length > 0) {
          saveCloudData(reindexedPlayers, this.getTeams());
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
        const cloudTeamsStr = JSON.stringify(reindexedTeams);
        
        if (localTeamsStr !== cloudTeamsStr) {
          safeSetLocalStorage(STORAGE_KEYS.TEAMS, reindexedTeams);
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
    } catch (err) {
      console.warn("Cloud sync error:", err);
    }
  }

  startCloudPolling() {
    setInterval(() => {
      this.syncWithCloud();
    }, 4000);
  }

  setupRealtimeListeners() {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.PLAYERS) this.notify('players_updated');
      if (e.key === STORAGE_KEYS.TEAMS) this.notify('teams_updated');
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

  // --- ADMIN AUTHENTICATION ---
  isAdminAuthenticated() {
    const val = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH);
    return val === 'true' || val === '"true"';
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

      return {
        ...p,
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
      saveCloudData(players, this.getTeams(), this.getFixtures(), this.getAuctionSettings());
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
      remarks: playerData.remarks || playerData.paymentRef || '',
      paymentRef: playerData.paymentRef || '',
      teamId: null,
      soldPrice: 0,
      basePrice: Number(playerData.basePrice) || 200,
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
    saveCloudData(players, this.getTeams(), this.getFixtures(), this.getAuctionSettings());
    syncPlayerToSupabase(registeredPlayer);
    this.notify('players_updated');
    return registeredPlayer;
  }

  updatePlayer(updatedPlayerData) {
    const players = this.getPlayers();
    const idx = players.findIndex(p => p.id === updatedPlayerData.id);
    if (idx !== -1) {
      players[idx] = { ...players[idx], ...updatedPlayerData };
      
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
    saveCloudData(players, this.getTeams());
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
      player.paymentStatus = paymentStatus.toUpperCase();
      player.registrationStatus = (registrationStatus || paymentStatus).toUpperCase();
      if (remarks) player.remarks = remarks;
      
      safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);
      saveCloudData(players, this.getTeams());
      syncPlayerToSupabase(player);
      this.notify('players_updated');
    }
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

  // --- TEAMS ---
  getTeams() {
    const teams = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS)) || [];
    return teams.map((t, idx) => ({
      ...t,
      serialNo: idx + 1
    }));
  }

  getTeamById(id) {
    return this.getTeams().find(t => t.id === id);
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
    this.notify('teams_updated');
    return newTeam;
  }

  updateTeam(updatedTeamData) {
    const teams = this.getTeams();
    const idx = teams.findIndex(t => t.id === updatedTeamData.id);
    if (idx !== -1) {
      teams[idx] = { ...teams[idx], ...updatedTeamData };
      teams.forEach((t, i) => {
        t.serialNo = i + 1;
      });
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      saveCloudData(this.getPlayers(), teams);
      syncTeamToSupabase(teams[idx]);
      this.notify('teams_updated');
      return teams[idx];
    }
    return null;
  }

  deleteTeam(teamId) {
    let teams = this.getTeams();
    teams = teams.filter(t => t.id !== teamId);
    
    teams.forEach((t, idx) => {
      t.serialNo = idx + 1;
    });

    const players = this.getPlayers();
    players.forEach(p => {
      if (p.teamId === teamId) {
        p.teamId = null;
        p.soldPrice = 0;
      }
    });

    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
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
    const defaultSettings = { defaultBasePrice: 200, defaultPurseBudget: 8000 };
    try {
      const s = localStorage.getItem(STORAGE_KEYS.AUCTION_SETTINGS);
      return s ? { ...defaultSettings, ...JSON.parse(s) } : defaultSettings;
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
      const res = await fetch(`${FIREBASE_DB_URL}/cpl_master/liveAuction.json`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Live auction state fetch error:", e);
    }
    return null;
  }

  async updateLiveAuctionState(state) {
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

  // --- USER AUTH & ROLE ---
  getUser() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || { role: 'GUEST', name: 'Guest Visitor' };
  }

  setUserRole(role, name = 'User', playerDetails = null) {
    const user = { role, name, playerDetails };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    this.notify('user_updated');
    return user;
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
}

export const store = new Store();
