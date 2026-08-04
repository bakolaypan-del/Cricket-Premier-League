// LocalStorage & Cloud Database Reactive Store (Developer: Suman Kolay - Continuous Dynamic Numbering Release)

import { INITIAL_LEAGUES, INITIAL_TEAMS, INITIAL_PLAYERS, INITIAL_FIXTURES } from './data.js';
import { 
  fetchCloudData, 
  saveCloudData, 
  syncPlayerToSupabase, 
  deletePlayerFromSupabase,
  syncTeamToSupabase, 
  deleteTeamFromSupabase,
  uploadHDImage
} from './supabase.js';

const STORAGE_KEYS = {
  LEAGUES: 'cpl_leagues_v7',
  TEAMS: 'cpl_teams_v7',
  PLAYERS: 'cpl_players_v7',
  FIXTURES: 'cpl_fixtures_v7',
  USER: 'cpl_user_v7',
  ADMIN_AUTH: 'cpl_admin_auth_v7'
};

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23059669'/%3E%3Ctext x='50' y='62' font-size='45' text-anchor='middle' fill='white'%3E🏏%3C/text%3E%3C/svg%3E";

// Quota-Safe LocalStorage Helper to prevent QuotaExceededError without corrupting image URLs
function safeSetLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
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
            itemCopy.aadharPhotoUrl = 'Attached Aadhaar Document';
          }
          if (itemCopy.paymentReceiptUrl && itemCopy.paymentReceiptUrl.startsWith('data:image')) {
            itemCopy.paymentReceiptUrl = 'Attached Payment Receipt';
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
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      safeSetLocalStorage(STORAGE_KEYS.USER, {
        role: 'GUEST',
        name: 'Guest Visitor',
        id: null,
        phone: null
      });
    }
  }

  // --- STABLE CLOUD SYNC WITH DYNAMIC CONTINUOUS RE-INDEXING & ZERO DATA LOSS ---
  async syncWithCloud() {
    try {
      const cloudData = await fetchCloudData();
      
      // If a registration modal or form is open, DO NOT interrupt the user!
      const isUserFillingForm = document.getElementById('player-reg-modal') || document.getElementById('team-reg-modal');
      if (isUserFillingForm) return;

      const localPlayers = this.getPlayers();

      // 1. Sync Players ONLY if valid array received from cloud
      if (Array.isArray(cloudData.players)) {
        // DATA LOSS PREVENTION SAFEGUARD: If cloud returns 0 players but local storage has players, RE-UPLOAD local players to cloud!
        if (cloudData.players.length === 0 && localPlayers.length > 0) {
          console.warn("Cloud data was empty! Restoring cloud database from local players backup...");
          saveCloudData(localPlayers, this.getTeams());
          return;
        }

        // MERGE LOCAL & CLOUD PLAYERS: Combine any local players that haven't synced yet
        const cloudPlayerIds = new Set(cloudData.players.map(p => p.id));
        const missingLocalPlayers = localPlayers.filter(p => p && p.id && !cloudPlayerIds.has(p.id));

        let mergedPlayers = [...cloudData.players, ...missingLocalPlayers];

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

        // If local had un-synced players, push merged list back to cloud
        if (missingLocalPlayers.length > 0) {
          saveCloudData(reindexedPlayers, this.getTeams());
        }
      }

      // 2. Sync Teams ONLY if valid array received from cloud
      if (Array.isArray(cloudData.teams)) {
        const localTeams = this.getTeams();
        if (cloudData.teams.length === 0 && localTeams.length > 0) {
          saveCloudData(this.getPlayers(), localTeams);
          return;
        }

        const cloudTeamIds = new Set(cloudData.teams.map(t => t.id));
        const missingLocalTeams = localTeams.filter(t => t && t.id && !cloudTeamIds.has(t.id));
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
  }

  // --- ADMIN AUTHENTICATION ---
  isAdminAuthenticated() {
    const val = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH);
    return val === 'true' || val === '"true"';
  }

  authenticateAdmin(email, password) {
    const validEmail = 'bakolaypan@gmail.com';
    const validPass = 'Suman@1995';

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
    const players = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS)) || [];
    // Ensure continuous dynamic registration numbers without gaps & fix corrupted image strings
    return players.map((p, idx) => {
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

  // --- REGISTER NEW PLAYER WITH CLOUDINARY HD STORAGE & FULL FORM FIELDS ---
  registerPlayer(playerData) {
    const players = this.getPlayers();
    const displayNo = players.length + 1;
    const registrationId = `JSL2026-${String(displayNo).padStart(4, '0')}`;
    const uuid = 'ply-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const newPlayer = {
      id: uuid,
      displayRegistrationNumber: displayNo,
      registrationId,
      serialNo: displayNo,
      regNo: registrationId,
      leagueCategory: 'JSL',
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
      basePrice: 200,
      regDate: new Date().toISOString().split('T')[0]
    };

    players.push(newPlayer);

    // Dynamic Re-indexing (Continuous numbering 1, 2, 3...)
    players.forEach((p, idx) => {
      const dNo = idx + 1;
      p.serialNo = dNo;
      p.displayRegistrationNumber = dNo;
      p.registrationId = `JSL2026-${String(dNo).padStart(4, '0')}`;
      p.regNo = p.registrationId;
    });

    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, players);

    saveCloudData(players, this.getTeams());
    syncPlayerToSupabase(newPlayer);
    this.notify('players_updated');
    return newPlayer;
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
    safeSetLocalStorage(STORAGE_KEYS.PLAYERS, []);
    saveCloudData([], this.getTeams());
    this.notify('players_updated');
  }

  clearAllTeams() {
    safeSetLocalStorage(STORAGE_KEYS.TEAMS, []);
    saveCloudData(this.getPlayers(), []);
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
