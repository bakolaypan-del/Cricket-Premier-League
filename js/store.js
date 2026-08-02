// LocalStorage & Cloud Database Reactive Store (Developer: Suman Kolay - Stable Form & No-Blink Release)

import { INITIAL_LEAGUES, INITIAL_TEAMS, INITIAL_PLAYERS, INITIAL_FIXTURES } from './data.js';
import { 
  fetchCloudData, 
  saveCloudData, 
  syncPlayerToSupabase, 
  deletePlayerFromSupabase,
  syncTeamToSupabase, 
  deleteTeamFromSupabase 
} from './supabase.js';

const STORAGE_KEYS = {
  LEAGUES: 'cpl_leagues_v7',
  TEAMS: 'cpl_teams_v7',
  PLAYERS: 'cpl_players_v7',
  FIXTURES: 'cpl_fixtures_v7',
  USER: 'cpl_user_v7',
  ADMIN_AUTH: 'cpl_admin_auth_v7'
};

class Store {
  constructor() {
    this.init();
    this.setupRealtimeListeners();
    this.syncWithCloud();
    this.startCloudPolling();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.LEAGUES)) {
      localStorage.setItem(STORAGE_KEYS.LEAGUES, JSON.stringify(INITIAL_LEAGUES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEAMS)) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PLAYERS)) {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FIXTURES)) {
      localStorage.setItem(STORAGE_KEYS.FIXTURES, JSON.stringify(INITIAL_FIXTURES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({
        role: 'GUEST',
        name: 'Guest Visitor',
        id: null,
        phone: null
      }));
    }
  }

  // --- STABLE CLOUD SYNC (PREVENTS BLINKING & DOES NOT INTERRUPT ACTIVE REGISTRATION FORMS) ---
  async syncWithCloud() {
    try {
      const cloudData = await fetchCloudData();
      
      // If a registration modal or form is open, DO NOT interrupt the user!
      const isUserFillingForm = document.getElementById('player-reg-modal') || document.getElementById('team-reg-modal');
      if (isUserFillingForm) return;

      // 1. Sync Players ONLY if valid array received from cloud
      if (Array.isArray(cloudData.players)) {
        const localPlayersStr = localStorage.getItem(STORAGE_KEYS.PLAYERS) || '[]';
        const cloudPlayersStr = JSON.stringify(cloudData.players);
        
        if (localPlayersStr !== cloudPlayersStr) {
          localStorage.setItem(STORAGE_KEYS.PLAYERS, cloudPlayersStr);
          this.notify('players_updated');
        }
      }

      // 2. Sync Teams ONLY if valid array received from cloud
      if (Array.isArray(cloudData.teams)) {
        const localTeamsStr = localStorage.getItem(STORAGE_KEYS.TEAMS) || '[]';
        const cloudTeamsStr = JSON.stringify(cloudData.teams);
        
        if (localTeamsStr !== cloudTeamsStr) {
          localStorage.setItem(STORAGE_KEYS.TEAMS, cloudTeamsStr);
          this.notify('teams_updated');
        }
      }
    } catch (err) {
      console.warn("Cloud single source sync error:", err);
    }
  }

  startCloudPolling() {
    // Poll Cloud Database every 5 seconds without interrupting active forms
    setInterval(() => {
      this.syncWithCloud();
    }, 5000);
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

  // --- ADMIN STRICT AUTHENTICATION (ID: bakolaypan@gmail.com, Password: Suman@1995) ---
  isAdminAuthenticated() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
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
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS)) || [];
  }

  getPlayerById(id) {
    return this.getPlayers().find(p => p.id === id);
  }

  registerPlayer(playerData) {
    const players = this.getPlayers();
    const serialNo = players.length + 1;
    const regNo = `JSL-2026-${String(serialNo).padStart(3, '0')}`;
    
    const newPlayer = {
      id: `ply-${Date.now()}`,
      serialNo,
      regNo,
      leagueCategory: 'JSL',
      paymentStatus: 'PENDING',
      teamId: null,
      soldPrice: 0,
      regDate: new Date().toISOString().split('T')[0],
      ...playerData
    };

    players.push(newPlayer);
    
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    } catch (err) {
      console.warn("Storage quota limit reached, stripping heavy image buffers:", err);
      const compactPlayers = players.map(p => ({
        ...p,
        photoUrl: p.photoUrl && p.photoUrl.length > 500000 ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300' : p.photoUrl,
        aadharBackUrl: 'Attached Document Proof',
        paymentProofUrl: 'Attached Receipt Screenshot'
      }));
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(compactPlayers));
    }

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
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
      saveCloudData(players, this.getTeams());
      syncPlayerToSupabase(players[idx]);
      this.notify('players_updated');
      return players[idx];
    }
    return null;
  }

  deletePlayer(playerId) {
    let players = this.getPlayers();
    const playerToDelete = players.find(p => p.id === playerId);
    
    if (playerToDelete && playerToDelete.teamId) {
      const teams = this.getTeams();
      const team = teams.find(t => t.id === playerToDelete.teamId);
      if (team) {
        team.squadCount = Math.max(0, team.squadCount - 1);
        team.purseSpent = Math.max(0, team.purseSpent - (playerToDelete.soldPrice || 0));
        localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      }
    }

    players = players.filter(p => p.id !== playerId);
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    saveCloudData(players, this.getTeams());
    deletePlayerFromSupabase(playerId);
    this.notify('players_updated');
  }

  clearAllPlayers() {
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify([]));
    saveCloudData([], this.getTeams());
    this.notify('players_updated');
  }

  clearAllTeams() {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify([]));
    saveCloudData(this.getPlayers(), []);
    this.notify('teams_updated');
  }

  updatePlayerStatus(playerId, status, notes = '') {
    const players = this.getPlayers();
    const player = players.find(p => p.id === playerId);
    if (player) {
      player.paymentStatus = status;
      player.adminNotes = notes;
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
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

      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      saveCloudData(players, teams);
      syncPlayerToSupabase(player);
      syncTeamToSupabase(team);
      this.notify('players_updated');
      this.notify('teams_updated');
    }
  }

  // --- TEAMS ---
  getTeams() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS)) || [];
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
    
    try {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    } catch (err) {
      console.warn("Storage quota limit reached for team logo, using fallback:", err);
      const compactTeams = teams.map(t => ({
        ...t,
        logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300'
      }));
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(compactTeams));
    }

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
