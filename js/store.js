// LocalStorage & Supabase Real-Time Cloud State Store (Developer: Suman Kolay)

import { INITIAL_LEAGUES, INITIAL_TEAMS, INITIAL_PLAYERS, INITIAL_FIXTURES } from './data.js';
import { 
  syncPlayerToSupabase, 
  fetchPlayersFromSupabase, 
  deletePlayerFromSupabase,
  syncTeamToSupabase, 
  fetchTeamsFromSupabase, 
  deleteTeamFromSupabase,
  subscribeToSupabaseRealtime 
} from './supabase.js';

const STORAGE_KEYS = {
  LEAGUES: 'cpl_leagues_v6',
  TEAMS: 'cpl_teams_v6',
  PLAYERS: 'cpl_players_v6',
  FIXTURES: 'cpl_fixtures_v6',
  USER: 'cpl_user_v6',
  ADMIN_AUTH: 'cpl_admin_auth_v6'
};

class Store {
  constructor() {
    this.init();
    this.setupRealtimeListeners();
    this.syncWithSupabaseCloud();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.LEAGUES)) {
      localStorage.setItem(STORAGE_KEYS.LEAGUES, JSON.stringify(INITIAL_LEAGUES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEAMS)) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(INITIAL_TEAMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PLAYERS)) {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(INITIAL_PLAYERS));
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

  async syncWithSupabaseCloud() {
    try {
      const cloudPlayers = await fetchPlayersFromSupabase();
      if (cloudPlayers && cloudPlayers.length > 0) {
        const localPlayers = this.getPlayers();
        // Merge cloud players into local store
        const mergedPlayers = [...cloudPlayers];
        localPlayers.forEach(lp => {
          if (!mergedPlayers.some(cp => cp.id === lp.id)) {
            mergedPlayers.push(lp);
          }
        });
        localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(mergedPlayers));
        this.notify('players_updated');
      }

      const cloudTeams = await fetchTeamsFromSupabase();
      if (cloudTeams && cloudTeams.length > 0) {
        const localTeams = this.getTeams();
        const mergedTeams = [...cloudTeams];
        localTeams.forEach(lt => {
          if (!mergedTeams.some(ct => ct.id === lt.id)) {
            mergedTeams.push(lt);
          }
        });
        localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mergedTeams));
        this.notify('teams_updated');
      }
    } catch (err) {
      console.warn("Supabase Cloud Initial Fetch Info:", err);
    }
  }

  setupRealtimeListeners() {
    // 1. Cross-tab storage change listener
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.PLAYERS) this.notify('players_updated');
      if (e.key === STORAGE_KEYS.TEAMS) this.notify('teams_updated');
    });

    // 2. BroadcastChannel cross-window sync
    if ('BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('cpl_realtime_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type) {
            window.dispatchEvent(new CustomEvent(event.data.type));
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel fallback active:", err);
      }
    }

    // 3. Supabase Live WebSockets subscription across devices
    subscribeToSupabaseRealtime(
      async () => {
        await this.syncWithSupabaseCloud();
      },
      async () => {
        await this.syncWithSupabaseCloud();
      }
    );
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
        this.notify('teams_updated');
      }
    }

    players = players.filter(p => p.id !== playerId);
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    deletePlayerFromSupabase(playerId);
    this.notify('players_updated');
  }

  updatePlayerStatus(playerId, status, notes = '') {
    const players = this.getPlayers();
    const player = players.find(p => p.id === playerId);
    if (player) {
      player.paymentStatus = status;
      player.adminNotes = notes;
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
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
