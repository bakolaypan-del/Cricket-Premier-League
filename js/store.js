// LocalStorage & Supabase Reactive State Store (Developer: Suman Kolay)

import { INITIAL_LEAGUES, INITIAL_TEAMS, INITIAL_PLAYERS, INITIAL_FIXTURES } from './data.js';
import { syncPlayerToSupabase, syncTeamToSupabase } from './supabase.js';

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
    const serialNo = players.length + 1; // Serial 1, Serial 2, etc.
    const regNo = `JSL-2026-${String(serialNo).padStart(3, '0')}`;
    
    const newPlayer = {
      id: `ply-${Date.now()}`,
      serialNo,
      regNo,
      leagueCategory: 'JSL',
      paymentStatus: 'PENDING', // PENDING shows Red Circle 🔴, APPROVED shows Green Circle 🟢
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
      // Fallback: strip heavy data URLs if localStorage quota is tight
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

  updatePlayerStatus(playerId, status, notes = '') {
    const players = this.getPlayers();
    const player = players.find(p => p.id === playerId);
    if (player) {
      player.paymentStatus = status; // APPROVED or REJECTED
      player.adminNotes = notes;
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
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
  }
}

export const store = new Store();
