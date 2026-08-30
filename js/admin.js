// Admin Master Data & Payment Verification Panel with Single Source Cloud Control (Developer: Suman Kolay)

import { store } from './store.js?v=13.0.24';
import { exportPlayersToCSV, exportTeamsToCSV, exportPlayersToPDF, exportTeamsToPDF, exportTeamFinalSquadToPDF, exportAllTeamsFinalSquadsToPDF, exportMatchScorecardPDF, exportAuctionSummaryPDF, exportPlayerSocialCard, openUserGuidePDF } from './export.js?v=13.0.24';
import { saveAdSettingsToCloud, fetchAdSettingsFromCloud, fetchPopupSettingsFromCloud, savePopupSettingsToCloud, uploadHDImage, getOptimizedImageUrl, syncTeamToSupabase, generateUUID, resolveTournamentUUID, registerTournamentUUID, toUUID } from './supabase.js?v=13.0.24';
import { shops } from './shopsData.js?v=12.0.2';

let activeAdminTab = (() => { try { return sessionStorage.getItem('cpl_admin_tab') || (store.isMasterAdmin() ? 'payments' : 'overview'); } catch(e) { return 'payments'; } })();
let adminAuctionSubTab = 'sold';
const todayStr = new Date().toISOString().split('T')[0];

export function renderAdminDashboard(containerEl) {
  // STRICT ADMIN AUTHENTICATION LOCK (Supabase Auth)
  if (!store.isAdminAuthenticated()) {
    renderAdminLoginScreen(containerEl);
    return;
  }

  const leagues = store.getAccessibleLeagues();
  const players = store.getPlayers();
  const teams = store.getTeams();

  const approvedPlayers = players.filter(p => p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED');
  const rejectedPlayers = players.filter(p => p.registrationStatus === 'REJECTED' || p.paymentStatus === 'REJECTED');
  const pendingPlayers = players.filter(p => !approvedPlayers.includes(p) && !rejectedPlayers.includes(p));
  const todayPlayers = players.filter(p => p.regDate === todayStr || (p.created_at && p.created_at.startsWith(todayStr)));

  const soldPlayers = players.filter(p => p.teamId || p.auctionStatus === 'SOLD');
  const unsoldPlayers = players.filter(p => p.auctionStatus === 'UNSOLD' && !p.teamId);
  const queuePlayers = players.filter(p => (p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED') && !p.teamId && p.auctionStatus !== 'SOLD' && p.auctionStatus !== 'UNSOLD');

  const isMaster = store.isMasterAdmin();
  const currentUser = store.getCurrentUser();
  const regSettings = store.getRegistrationSettings();
  const isRegOpen = store.isRegistrationOpen();
  
  const initialLeagueCode = (leagues[0]?.code || leagues[0]?.category || 'T').toUpperCase();
  const initialFormat = store.getTournamentFormat(initialLeagueCode);
  const initialFmt = initialFormat.format || 'TWO_GROUPS';
  let initialStageOptionsHtml = '';
  if (initialFmt === 'TWO_GROUPS') {
    initialStageOptionsHtml = `
      <option value="GROUP_A">🟢 Group A Match</option>
      <option value="GROUP_B">🔵 Group B Match</option>
      <option value="SEMI_FINAL_1">🏆 Semi-Final 1 (1st Group A vs 2nd Group B)</option>
      <option value="SEMI_FINAL_2">🏆 Semi-Final 2 (1st Group B vs 2nd Group A)</option>
      <option value="FINAL">👑 Grand Final</option>
    `;
  } else if (initialFmt === 'FOUR_GROUPS') {
    initialStageOptionsHtml = `
      <option value="GROUP_A">🟢 Group A Match</option>
      <option value="GROUP_B">🔵 Group B Match</option>
      <option value="GROUP_C">🟡 Group C Match</option>
      <option value="GROUP_D">🟣 Group D Match</option>
      <option value="SEMI_FINAL_1">🏆 Semi-Final 1</option>
      <option value="SEMI_FINAL_2">🏆 Semi-Final 2</option>
      <option value="FINAL">👑 Grand Final</option>
    `;
  } else {
    initialStageOptionsHtml = `
      <option value="LEAGUE">⚔️ Regular League Match</option>
      <option value="SEMI_FINAL_1">🏆 Semi-Final 1 (1st vs 4th)</option>
      <option value="SEMI_FINAL_2">🏆 Semi-Final 2 (2nd vs 3rd)</option>
      <option value="FINAL">👑 Grand Final</option>
    `;
  }

  // Build tournament list for selector (Scoped strictly to owned tournaments for non-master admins)
  const customTournaments = store.getCustomTournaments ? store.getCustomTournaments() : [];
  let allTournaments = customTournaments.map(t => ({ id: t.supabaseId || t.id, name: t.name, slug: t.slug, status: t.status || 'ACTIVE' }));
  
  if (!isMaster && currentUser) {
    const userPhone = (currentUser.phone || currentUser.mobile || '').replace(/[^0-9]/g, '');
    const owners = store.getTournamentOwners ? store.getTournamentOwners() : {};
    const ownedIds = [];
    
    for (const [tId, ownerInfo] of Object.entries(owners)) {
      if (ownerInfo && (ownerInfo.phone || '').replace(/[^0-9]/g, '') === userPhone) {
        ownedIds.push(tId.toLowerCase());
      }
    }
    if (Array.isArray(currentUser.ownedTournaments)) {
      currentUser.ownedTournaments.forEach(id => {
        if (id && !ownedIds.includes(id.toLowerCase())) ownedIds.push(id.toLowerCase());
      });
    }

    if (ownedIds.length > 0) {
      allTournaments = allTournaments.filter(t => {
        const tId = (t.id || '').toLowerCase();
        const tSlug = (t.slug || '').toLowerCase();
        return ownedIds.some(oid => oid.includes(tId) || tId.includes(oid) || oid.includes(tSlug) || tSlug.includes(oid));
      });
    }
  }

  if (allTournaments.length === 0) allTournaments.push({ id: store.activeTournamentId || '440f982b-6008-40f4-a6bc-0516a0985672', name: 'My Tournament', slug: 'm2026', status: 'ACTIVE' });
  const activeTid = (allTournaments.some(t => t.id === store.activeTournamentId) ? store.activeTournamentId : allTournaments[0]?.id) || allTournaments[0]?.id;
  if (activeTid && store.activeTournamentId !== activeTid) {
    store.activeTournamentId = activeTid;
  }

  const activeTourneyName = allTournaments.find(t => t.id === activeTid)?.name || 'Tournament';
  const panelTitle = isMaster ? 'Master Admin Control Panel' : `${activeTourneyName} Control Console`;
  const panelSubtitle = isMaster 
    ? `Log ID: <strong class="text-amber-400">${currentUser?.email || 'Master Admin'}</strong> • Single Source Supabase & Realtime Cloud Database`
    : `Logged in as: <strong class="text-amber-400">${currentUser?.name || 'Tournament Owner'}</strong> • Tournament Operations Only`;

  // Sidebar nav items config
  const sidebarItems = [
    ...(!isMaster ? [{ tab: 'overview', icon: 'layout-dashboard', label: 'Overview' }] : []),
    { tab: 'payments', icon: 'badge-indian-rupee', label: 'Approvals', badge: pendingPlayers.length, badgeColor: 'red' },
    { tab: 'all-players', icon: 'users', label: 'Players', badge: players.length, badgeColor: 'slate' },
    { tab: 'teams', icon: 'shield', label: 'Teams', badge: teams.length, badgeColor: 'slate' },
    { tab: 'auction', icon: 'gavel', label: 'Auction', masterOnly: false },
    { tab: 'fixtures', icon: 'calendar', label: 'Scheduler', masterOnly: false },
    { tab: 'scorer', icon: 'gamepad-2', label: 'Live Scorer', masterOnly: false },
    ...(!isMaster ? [{ tab: 'reg-settings', icon: 'power', label: 'Reg. Control' }] : []),
    ...(isMaster ? [
      { tab: 'reg-settings', icon: 'power', label: 'Reg. Control' },
      { tab: 'shop-ads', icon: 'megaphone', label: 'Shop Ads' },
      { tab: 'owners', icon: 'crown', label: 'Owners' },
      { tab: 'saas-tournaments', icon: 'trophy', label: 'Tournaments', badge: (store.getPendingTournaments ? store.getPendingTournaments().length : 0) || undefined, badgeColor: 'red' },
    ] : [])
  ];

  containerEl.innerHTML = `
    <div class="animate-fade-in">
      <!-- Top Header Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl mb-4 shadow-lg">
        <div class="flex items-center gap-3 min-w-0">
          <span class="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
            <i data-lucide="shield-check" class="w-5 h-5"></i>
          </span>
          <div class="min-w-0">
            <h1 class="text-sm sm:text-base font-black text-white truncate">${panelTitle}</h1>
            <p class="text-[11px] text-slate-400 truncate">${panelSubtitle}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <!-- Tournament Selector -->
          <div class="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 flex-1 sm:flex-none min-w-0">
            <i data-lucide="trophy" class="w-3.5 h-3.5 text-amber-400 shrink-0"></i>
            <select id="admin-tournament-selector" class="bg-transparent text-xs text-white font-bold border-none outline-none cursor-pointer min-w-0 flex-1 appearance-none" style="-webkit-appearance:none">
              ${allTournaments.map(t => `<option value="${t.id}" ${t.id === activeTid ? 'selected' : ''} class="bg-slate-900 text-white">${t.name}</option>`).join('')}
            </select>
          </div>

          ${isMaster ? `
            <button id="admin-create-new-tourney-btn" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black rounded-xl flex items-center gap-1 transition-all cursor-pointer shrink-0">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> New
            </button>
          ` : ''}

          <button id="admin-logout-btn" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-xl border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer shrink-0">
            <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Logout
          </button>
        </div>
      </div>

      <!-- Stats Cards Row -->
      <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
        <div class="p-2.5 bg-white border border-slate-200 rounded-xl text-center shadow-2xs">
          <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Total</div>
          <div class="text-lg font-black text-slate-900 cpl-countup" data-target="${players.length}">0</div>
        </div>
        <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center shadow-2xs">
          <div class="text-[9px] font-bold text-amber-700 uppercase tracking-wide">Pending</div>
          <div class="text-lg font-black text-amber-600 cpl-countup" data-target="${pendingPlayers.length}">0</div>
        </div>
        <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center shadow-2xs">
          <div class="text-[9px] font-bold text-emerald-700 uppercase tracking-wide">Approved</div>
          <div class="text-lg font-black text-emerald-600 cpl-countup" data-target="${approvedPlayers.length}">0</div>
        </div>
        <div class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center shadow-2xs">
          <div class="text-[9px] font-bold text-rose-700 uppercase tracking-wide">Rejected</div>
          <div class="text-lg font-black text-rose-600 cpl-countup" data-target="${rejectedPlayers.length}">0</div>
        </div>
        <div class="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-center shadow-2xs">
          <div class="text-[9px] font-bold text-sky-700 uppercase tracking-wide">Today</div>
          <div class="text-lg font-black text-sky-600 cpl-countup" data-target="${todayPlayers.length}">0</div>
        </div>
      </div>

      <!-- Sidebar + Content Layout -->
      <div class="flex gap-4">
        <!-- Vertical Sidebar (hidden on mobile, shown md+) -->
        <nav class="hidden md:flex flex-col w-48 shrink-0 bg-white border border-slate-200 rounded-2xl p-2 gap-0.5 shadow-sm self-start sticky top-4" id="admin-sidebar-nav">
          ${sidebarItems.map(item => `
            <button data-tab="${item.tab}" class="admin-tab-btn flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all w-full text-left ${activeAdminTab === item.tab ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}">
              <i data-lucide="${item.icon}" class="w-4 h-4 shrink-0"></i>
              <span class="truncate flex-1">${item.label}</span>
              ${item.badge ? `<span class="px-1.5 py-0.5 text-[9px] font-black rounded-full ${activeAdminTab === item.tab ? 'bg-white/20 text-white' : (item.badgeColor === 'red' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600')}">${item.badge}</span>` : ''}
            </button>
          `).join('')}

          ${isMaster ? `
            <div class="border-t border-slate-100 mt-2 pt-2 space-y-1">
              <div class="px-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">Quick Actions</div>
              <button id="export-master-csv-btn" class="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer">
                <i data-lucide="download" class="w-3 h-3 text-emerald-600"></i> Export CSV
              </button>
              <button id="export-master-pdf-btn" class="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer">
                <i data-lucide="file-text" class="w-3 h-3 text-red-600"></i> Export PDF
              </button>
              <button id="export-team-squads-pdf-btn" class="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer">
                <i data-lucide="trophy" class="w-3 h-3 text-amber-600"></i> Squads PDF
              </button>
              <button id="purge-verified-docs-btn" class="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer">
                <i data-lucide="shield-check" class="w-3 h-3 text-sky-600"></i> Purge Docs
              </button>
            </div>
          ` : ''}
        </nav>

        <!-- Main Content Area -->
        <div class="flex-1 min-w-0">
          <!-- Mobile Horizontal Pills (shown below md only) -->
          <div class="md:hidden flex overflow-x-auto gap-1.5 pb-3 scrollbar-hide" id="admin-mobile-nav">
            ${sidebarItems.map(item => `
              <button data-tab="${item.tab}" class="admin-tab-btn shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeAdminTab === item.tab ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'}">
                <i data-lucide="${item.icon}" class="w-3 h-3"></i>
                ${item.label}
                ${item.badge ? `<span class="px-1 py-0.5 text-[8px] font-black rounded-full ${activeAdminTab === item.tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}">${item.badge}</span>` : ''}
              </button>
            `).join('')}
          </div>

          <div id="admin-tab-content">

        <!-- 0. Organiser Overview Tab -->
        ${!isMaster ? `
        <div id="tab-overview-view" class="${activeAdminTab === 'overview' ? '' : 'hidden'} space-y-4 animate-fade-in">

          <!-- Welcome & Tournament Info -->
          <div class="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-3xl shadow-sm space-y-3">
            <div class="flex items-center gap-3">
              <span class="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-300">
                <i data-lucide="trophy" class="w-6 h-6"></i>
              </span>
              <div>
                <h2 class="text-lg font-black text-slate-900">${activeTourneyName}</h2>
                <p class="text-xs text-slate-600">Welcome back, <strong>${currentUser?.name || 'Organiser'}</strong></p>
              </div>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-white border-2 border-slate-200 rounded-2xl p-3 text-center shadow-xs">
              <div class="text-2xl font-black text-emerald-700">${players.length}</div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Players</div>
            </div>
            <div class="bg-white border-2 border-slate-200 rounded-2xl p-3 text-center shadow-xs">
              <div class="text-2xl font-black text-sky-700">${teams.length}</div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Teams</div>
            </div>
            <div class="bg-white border-2 border-slate-200 rounded-2xl p-3 text-center shadow-xs">
              <div class="text-2xl font-black text-amber-700">${pendingPlayers.length}</div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending</div>
            </div>
            <div class="bg-white border-2 border-slate-200 rounded-2xl p-3 text-center shadow-xs">
              <div class="text-2xl font-black text-purple-700">${approvedPlayers.length}</div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approved</div>
            </div>
          </div>

          <!-- Registration Status -->
          <div class="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i data-lucide="radio" class="w-4 h-4 ${isRegOpen ? 'text-emerald-600' : 'text-red-500'}"></i>
                <span class="text-sm font-black text-slate-900">Registration Status</span>
              </div>
              <span class="px-3 py-1 text-[10px] font-black rounded-full ${isRegOpen ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}">
                ${isRegOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <button id="overview-toggle-reg-btn" class="w-full py-2.5 ${isRegOpen ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer">
              ${isRegOpen ? 'Close Registration' : 'Open Registration'}
            </button>
          </div>

          <!-- Quick Actions -->
          <div class="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-xs space-y-3">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <i data-lucide="zap" class="w-4 h-4 text-amber-600"></i> Quick Actions
            </h3>
            <div class="grid grid-cols-2 gap-2">
              <button id="overview-share-link-btn" class="py-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <i data-lucide="share-2" class="w-3.5 h-3.5"></i> Share Registration Link
              </button>
              <button id="overview-view-public-btn" class="py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <i data-lucide="eye" class="w-3.5 h-3.5"></i> View Public Page
              </button>
              <button data-tab="payments" class="admin-tab-btn py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <i data-lucide="badge-indian-rupee" class="w-3.5 h-3.5"></i> Approve Players (${pendingPlayers.length})
              </button>
              <button data-tab="auction" class="admin-tab-btn py-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <i data-lucide="gavel" class="w-3.5 h-3.5"></i> Auction Control
              </button>
            </div>
          </div>

          <!-- Recent Registrations -->
          <div class="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-xs space-y-3">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <i data-lucide="clock" class="w-4 h-4 text-slate-600"></i> Today's Registrations (${todayPlayers.length})
            </h3>
            ${todayPlayers.length === 0 ? `
              <p class="text-xs text-slate-500 text-center py-4">No registrations today yet.</p>
            ` : `
              <div class="space-y-2 max-h-60 overflow-y-auto">
                ${todayPlayers.slice(0, 10).map(p => `
                  <div class="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <div class="flex items-center gap-2 min-w-0">
                      <img src="${p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png'}" class="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-slate-900 truncate">${p.name}</div>
                        <div class="text-[9px] text-slate-500">${p.phone || p.mobile || 'N/A'} • ${p.category || 'All Rounder'}</div>
                      </div>
                    </div>
                    <span class="px-2 py-0.5 text-[9px] font-black rounded-full ${p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : (p.registrationStatus === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800')}">
                      ${p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED' ? 'APPROVED' : (p.registrationStatus === 'REJECTED' ? 'REJECTED' : 'PENDING')}
                    </span>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Revenue Summary -->
          <div class="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-xs space-y-3">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <i data-lucide="indian-rupee" class="w-4 h-4 text-emerald-600"></i> Revenue Summary
            </h3>
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                <div class="text-lg font-black text-emerald-700">${approvedPlayers.length}</div>
                <div class="text-[9px] font-bold text-emerald-600">Paid Players</div>
              </div>
              <div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
                <div class="text-lg font-black text-amber-700">${pendingPlayers.length}</div>
                <div class="text-[9px] font-bold text-amber-600">Payment Pending</div>
              </div>
              <div class="bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-center">
                <div class="text-lg font-black text-sky-700">${teams.length}</div>
                <div class="text-[9px] font-bold text-sky-600">Team Entries</div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- 1. Pending Payment Verification Tab -->
        <div id="tab-payments-view" class="${activeAdminTab === 'payments' ? '' : 'hidden'} space-y-4">
          <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm">
            <div class="flex justify-between items-center mb-3">
              <div>
                <h3 class="text-base sm:text-lg font-black text-slate-900">Pending Player Approvals (${pendingPlayers.length})</h3>
                <p class="text-xs text-slate-500">Approve or Edit/Delete player registration entries in real-time.</p>
              </div>
            </div>

            ${pendingPlayers.length === 0 ? `
              <div class="text-center py-10 border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/40">
                <i data-lucide="check-circle-2" class="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-80"></i>
                <p class="text-slate-900 font-bold text-sm">All Payments Verified!</p>
                <p class="text-xs text-slate-500 mt-0.5">There are no pending player registrations requiring approval right now.</p>
              </div>
            ` : `
              <div class="space-y-2 sm:hidden">
                ${pendingPlayers.map(p => `
                  <div class="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div class="flex items-center gap-2.5">
                      <img src="${p.photoUrl || p.player_photo_url}" loading="lazy" decoding="async" class="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs" onerror="this.src='assets/card_jsl_user.png'"/>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-slate-900 text-xs truncate">${p.name}</div>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          <span class="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[8px] font-black rounded border border-slate-200">${p.registrationId || p.regNo || 'REG-0001'}</span>
                          <span class="text-[9px] text-sky-700 font-bold">${p.category || p.playingType || 'All Rounder'}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center justify-between text-[9px] text-slate-500">
                      <span>📞 ${p.phone || 'N/A'}</span>
                      <span class="font-mono font-bold text-amber-800">UPI: ${p.paymentRef || 'N/A'}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <button data-approve-id="${p.id}" class="approve-player-btn flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg shadow-xs text-center">Approve</button>
                      <button data-reject-id="${p.id}" class="reject-player-btn flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[10px] rounded-lg border border-rose-300 text-center">Reject</button>
                      ${isMaster ? `<button data-edit-id="${p.id}" class="edit-player-btn p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button><button data-delete-id="${p.id}" class="delete-player-btn p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-300"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="hidden sm:block overflow-x-auto border border-slate-200 rounded-2xl">
                <table class="w-full text-left text-xs sm:text-sm text-slate-800">
                  <thead class="bg-slate-100 text-[10px] sm:text-xs uppercase text-slate-700 font-black border-b border-slate-200">
                    <tr>
                      <th class="py-3 px-3">Serial & Reg ID</th>
                      <th class="py-3 px-3">Player Details</th>
                      <th class="py-3 px-3">Category & Phone</th>
                      <th class="py-3 px-3 font-mono font-black text-amber-700">UPI Ref</th>
                      <th class="py-3 px-3 text-right flex justify-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${pendingPlayers.map(p => `
                      <tr class="hover:bg-slate-50 transition-colors">
                        <td class="py-3 px-3">
                          <div class="flex items-center gap-2.5">
                            <img src="${p.photoUrl || p.player_photo_url}" loading="lazy" decoding="async" class="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs" onerror="this.src='assets/card_jsl_user.png'"/>
                            <div>
                              <div class="font-bold text-slate-900 text-xs sm:text-sm">${p.name}</div>
                              <span class="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-mono text-[9px] font-black rounded border border-slate-300">${p.registrationId || p.regNo || 'REG-0001'} (#${p.displayRegistrationNumber || p.serialNo})</span>
                            </div>
                          </div>
                        </td>
                        <td class="py-3 px-3 text-xs">
                          <div class="font-semibold text-slate-800">Father: ${p.fatherName || 'N/A'}</div>
                          <div class="text-slate-500 text-[10px]">📍 ${p.village || ''}, ${p.district || 'Paschim Medinipur'}</div>
                        </td>
                        <td class="py-3 px-3 text-xs">
                          <span class="px-2 py-0.5 bg-sky-100 text-sky-800 font-extrabold text-[10px] rounded border border-sky-300 inline-block mb-0.5">
                            ${p.category || p.playingType || 'All Rounder'}
                          </span>
                          <div class="text-slate-600 font-mono text-[10px]">📞 ${p.phone || 'N/A'}</div>
                        </td>
                        <td class="py-3 px-3 font-mono font-bold text-amber-800 text-xs">
                          ${p.paymentRef || 'N/A'}
                        </td>
                        <td class="py-3 px-3 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <button data-approve-id="${p.id}" class="approve-player-btn px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg shadow-xs flex items-center gap-1">
                              <i data-lucide="check" class="w-3 h-3"></i> Approve
                            </button>
                            <button data-reject-id="${p.id}" class="reject-player-btn px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[10px] rounded-lg border border-rose-300 shadow-2xs">
                              Reject
                            </button>
                            <button data-edit-id="${p.id}" class="edit-player-btn p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300" style="${isMaster ? '' : 'display:none'}">
                              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                            </button>
                            <button data-delete-id="${p.id}" class="delete-player-btn p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-300" style="${isMaster ? '' : 'display:none'}">
                              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>

        <!-- 2. All Registered Players Tab -->
        <div id="tab-all-players-view" class="${activeAdminTab === 'all-players' ? '' : 'hidden'} space-y-4">
          <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-3">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 class="text-base sm:text-lg font-black text-slate-900">Registered Players Master Table (${players.length})</h3>
                <p class="text-xs text-slate-500">Search, filter, edit details, or remove players with automatic continuous serial re-indexing.</p>
              </div>

              <div class="relative w-full sm:w-64">
                <input type="text" id="admin-player-search" placeholder="🔍 Search by name, reg ID, phone..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 pl-3 focus:outline-none focus:border-emerald-500 placeholder-slate-400 font-medium" />
              </div>
            </div>

            <div class="overflow-x-auto border border-slate-200 rounded-2xl">
              <table class="w-full text-left text-xs sm:text-sm text-slate-800">
                <thead class="hidden sm:table-header-group bg-slate-100 text-[10px] sm:text-xs uppercase text-slate-700 font-black border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-3">Serial & Reg ID</th>
                    <th class="py-3 px-3">Player Name</th>
                    <th class="py-3 px-3">Father & Address</th>
                    <th class="py-3 px-3">Category & Style</th>
                    <th class="py-3 px-3">Phone</th>
                    <th class="py-3 px-3">Status</th>
                    <th class="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody id="admin-all-players-table-body" class="divide-y divide-slate-100">
                  ${renderAdminPlayersRows(players)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 3. Registered Teams Tab -->
        <div id="tab-teams-view" class="${activeAdminTab === 'teams' ? '' : 'hidden'} space-y-4">
          <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 class="text-base sm:text-lg font-black text-slate-900">Registered Teams (${teams.length})</h3>
                <p class="text-xs text-slate-500">Manage franchise teams, squad allocations & print official auction rosters.</p>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <button id="download-all-teams-squad-pdf-btn" class="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all">
                  <i data-lucide="file-down" class="w-4 h-4 text-slate-950"></i> 📄 Download All Squads PDF
                </button>
                <button id="export-teams-csv-btn" class="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer">
                  <i data-lucide="download" class="w-3.5 h-3.5 text-emerald-600"></i> Teams CSV
                </button>
              </div>
            </div>

            ${teams.length === 0 ? `
              <div class="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <i data-lucide="shield-off" class="w-10 h-10 text-slate-400 mx-auto mb-2"></i>
                <p class="text-slate-800 font-bold text-xs">No teams registered yet!</p>
              </div>
            ` : `
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                ${teams.map(t => {
                  const maxPurse = Number(t.purse || t.purseBudget || 8000);
                  const spent = Number(t.purseSpent || 0);
                  const remPurse = (t.remainingPurse !== undefined) ? Number(t.remainingPurse) : (maxPurse - spent);
                  return `
                  <div class="p-3.5 flex flex-col justify-between border-2 border-slate-200 bg-white rounded-2xl hover:border-amber-500 transition-all shadow-xs">
                    <div class="flex items-start gap-3 mb-2.5">
                      <img src="${t.logoUrl || t.teamLogoUrl || 'assets/jsl_logo.jpg'}" class="w-12 h-12 rounded-xl object-cover border-2 border-amber-500/60 shadow-xs shrink-0" onerror="this.src='assets/jsl_logo.jpg'" />
                      <div class="flex-1 min-w-0">
                        <div class="font-black text-slate-900 text-sm truncate">${t.name}</div>
                        <div class="text-[11px] text-sky-700 font-bold">Owner: ${t.ownerName || 'N/A'} <span class="text-slate-500">(${t.ownerPhone || 'N/A'})</span></div>
                        ${t.iconPlayerName || t.iconName ? `<div class="text-[10px] text-amber-700 font-black truncate">⭐ Icon: ${t.iconPlayerName || t.iconName}</div>` : ''}
                        <div class="text-[10px] text-slate-700 font-bold mt-0.5">Purse: <span class="text-emerald-700 font-extrabold">₹${remPurse}</span> / ₹${maxPurse}</div>
                      </div>
                    </div>
                    <div class="flex items-center pt-2.5 border-t border-slate-100 gap-1.5">
                      <button data-download-team-squad-pdf-id="${t.id}" class="download-team-squad-pdf-btn flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer" title="Download Official Final Auction Squad PDF for ${t.name}">
                        <i data-lucide="file-down" class="w-3.5 h-3.5"></i> Squad PDF
                      </button>
                      <button data-edit-team-id="${t.id}" class="edit-team-btn py-1.5 px-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit
                      </button>
                      <button data-delete-team-id="${t.id}" class="delete-team-btn py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-300 transition-all flex items-center gap-1 cursor-pointer" title="Delete Team">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>
                `;}).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- 5. Tournament Owner Delegation Tab -->
        <div id="tab-owners-view" class="${activeAdminTab === 'owners' ? '' : 'hidden'} space-y-4 animate-fade-in">
          <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-4">
            <div class="flex items-center gap-3 border-b border-slate-200 pb-3">
              <span class="p-2 bg-amber-100 text-amber-800 rounded-2xl border border-amber-300">
                <i data-lucide="crown" class="w-5 h-5"></i>
              </span>
              <div>
                <h3 class="text-base font-black text-slate-900">Appoint Tournament Owner & Admin</h3>
                <p class="text-xs text-slate-500">Delegate full tournament operational controls to any registered player/user.</p>
              </div>
            </div>

            <!-- Current Appointed Owner Banner -->
            <div class="p-3.5 bg-amber-50 rounded-2xl border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center font-black text-lg">
                  👑
                </div>
                <div>
                  <span class="text-[10px] font-bold text-amber-800 uppercase">Appointed Tournament Owner</span>
                  <div class="font-black text-slate-900 text-sm">
                    ${store.getTournamentOwners()[activeTid] ? store.getTournamentOwners()[activeTid].name : 'Not Appointed'}
                  </div>
                  <div class="text-xs text-slate-500 font-mono">
                    Phone: ${store.getTournamentOwners()[activeTid] ? store.getTournamentOwners()[activeTid].phone : 'N/A'}
                  </div>
                </div>
              </div>
              <span class="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-xs rounded-xl border border-emerald-300">
                Active Permissions
              </span>
            </div>

            <!-- Assign Owner Form -->
            <form id="assign-tournament-owner-form" class="space-y-3 pt-1">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 mb-1">SELECT TOURNAMENT *</label>
                  <select id="assign-owner-tournament-id" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none">
                    ${allTournaments.map(t => `<option value="${t.id}" ${t.id === activeTid ? 'selected' : ''}>${t.name}</option>`).join('')}
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-600 mb-1">SELECT REGISTERED PLAYER AS OWNER *</label>
                  <select id="assign-owner-player-select" required class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none">
                    <option value="">-- Choose Player to Appoint as Owner --</option>
                    ${players.map(p => `
                      <option value="${p.phone || p.mobile}" data-name="${p.name}">${p.name} (${p.phone || p.mobile} • ${p.village || 'N/A'}${p.displayRegistrationNumber ? ' • #' + p.displayRegistrationNumber : ''})</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <button type="submit" class="py-2.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer">
                <i data-lucide="check-circle-2" class="w-4 h-4"></i> Save & Grant Tournament Owner Authority
              </button>
            </form>
          </div>
        </div>

        <!-- 4. Auction Controls Tab -->
        <div id="tab-auction-view" class="${activeAdminTab === 'auction' ? '' : 'hidden'} space-y-4 animate-fade-in">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Setup & Settings -->
            <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-3.5">
              <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="settings" class="w-5 h-5 text-amber-600"></i> Auction Parameters
              </h3>
              <form id="admin-auction-settings-form" class="space-y-3">
                <div>
                  <label class="block text-xs font-bold text-slate-600 mb-1">DEFAULT PLAYER BASE PRICE (INR)</label>
                  <input type="number" id="auction-setting-base-price" value="${store.getAuctionSettings().defaultBasePrice}" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 mb-1">DEFAULT TEAM PURSE BUDGET</label>
                  <input type="number" id="auction-setting-purse-budget" value="${store.getAuctionSettings().defaultPurseBudget}" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold" />
                </div>
                <button type="submit" class="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl border border-amber-400 shadow-xs cursor-pointer">
                  Update Settings
                </button>
              </form>

              <!-- Auction Reset Danger Zone -->
              <div class="border-t border-slate-100 pt-2.5 space-y-2">
                <button type="button" id="admin-seed-100-players-btn" class="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <span>⚡</span> Generate 100+ Test Players with HD Photos
                </button>
                <button type="button" id="admin-seed-mock-auction-btn" class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <span>🔨</span> Run Mock Auction & Draft into Squads
                </button>
                <button type="button" id="admin-reset-auction-btn" class="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-300 flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer">
                  <i data-lucide="rotate-ccw" class="w-3.5 h-3.5 text-rose-600"></i> Revert Sold Players & Reset Purses
                </button>
              </div>

              <!-- Put Player on Block Form -->
              <div class="border-t border-slate-100 pt-3 space-y-3">
                <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider">Start Auction for a Player</h4>
                <div>
                  <label class="block text-xs font-bold text-slate-600 mb-1">SELECT APPROVED PLAYER</label>
                  <select id="auction-select-player" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-medium">
                    <option value="">-- Choose Player --</option>
                    ${players.filter(p => (p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED') && !p.teamId && p.auctionStatus !== 'SOLD').map(p => {
                      const sNo = p.displayRegistrationNumber || p.serialNo || '';
                      const sNoPrefix = sNo ? `[#${String(sNo).padStart(2, '0')}] ` : '';
                      return `<option value="${p.id}">${sNoPrefix}${p.name} (${p.category || 'All Rounder'}) - Base: ₹${p.basePrice || 300}</option>`;
                    }).join('')}
                  </select>
                </div>
                <button id="auction-start-bid-btn" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer">
                  Put Player on Auction Block
                </button>
              </div>
            </div>

            <!-- Active Auctioneer Controls -->
            <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-3.5">
              <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="gavel" class="w-5 h-5 text-amber-600"></i> Active Auction Console
              </h3>
              <div id="admin-active-auction-block" class="space-y-3"></div>
            </div>
          </div>

          <!-- 🏆 Final Auction Squads PDF Export Banner -->
          <div class="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center font-black text-lg shadow-2xs shrink-0">
                🏆
              </div>
              <div>
                <div class="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>Final Auction Squads & Printable PDFs</span>
                  <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-md border border-emerald-300">AUCTION COMPLETE</span>
                </div>
                <div class="text-[11px] text-slate-600 font-medium">Download individual team or all 13-player squad rosters with real HD photos & balance sheets.</div>
              </div>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <button type="button" id="admin-sync-permanent-archive-btn" class="flex-1 sm:flex-none px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow-xs border border-amber-400/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all" title="Sync & Lock Permanent 5-Year Auction Record in Cloud">
                <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i> Sync 5-Year Vault
              </button>
              <button type="button" id="auction-tab-download-all-pdf-btn" class="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                <i data-lucide="file-down" class="w-4 h-4 text-slate-950"></i> Download All Teams PDFs
              </button>
            </div>
          </div>

          <!-- 🔨 Sold Players & Unsold Pool Tabs Section -->
          <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 space-y-3.5 rounded-3xl shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div class="flex items-center gap-2 flex-wrap">
                <button type="button" id="admin-auction-tab-sold" class="px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${adminAuctionSubTab === 'sold' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'}">
                  <span>✅ Sold & Allocated</span>
                  <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ${adminAuctionSubTab === 'sold' ? 'bg-white text-blue-900 font-black' : 'bg-slate-200 text-slate-800'}">${soldPlayers.length}</span>
                </button>
                <button type="button" id="admin-auction-tab-unsold" class="px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${adminAuctionSubTab === 'unsold' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'}">
                  <span>❌ Unsold Pool (Round 1)</span>
                  <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ${adminAuctionSubTab === 'unsold' ? 'bg-white text-rose-900 font-black' : 'bg-slate-200 text-slate-800'}">${unsoldPlayers.length}</span>
                </button>
              </div>

              ${adminAuctionSubTab === 'unsold' && unsoldPlayers.length > 0 ? `
                <button type="button" id="admin-reset-all-unsold-btn" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs">
                  🔄 Revert All to Queue (Round 2)
                </button>
              ` : ''}
            </div>

            <!-- TAB 1: Sold Players & Squad Allocations -->
            <div id="admin-auction-sold-container" class="${adminAuctionSubTab === 'sold' ? '' : 'hidden'}">
              ${soldPlayers.length === 0 ? `
                <div class="py-8 text-center text-slate-500 italic border border-slate-200 rounded-2xl">No players sold or allocated yet.</div>
              ` : `
              <!-- Mobile Cards -->
              <div class="sm:hidden space-y-2">
                ${soldPlayers.map(p => {
                    const assignedTeam = teams.find(t => t.id === p.teamId) || { name: 'Unknown Team' };
                    return `
                    <div class="p-3 border border-slate-200 rounded-xl space-y-1.5">
                      <div class="flex items-center gap-2.5">
                        <img src="${p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png'}" class="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                        <div class="flex-1 min-w-0">
                          <div class="font-black text-slate-900 text-xs flex items-center gap-1.5 truncate">
                            ${p.name} ${(p.isIcon || p.isIconPlayer) ? `<span class="px-1 bg-amber-400 text-slate-950 font-black text-[7px] rounded">⭐ ICON</span>` : ''}
                          </div>
                          <div class="text-[9px] text-slate-500">${p.category || 'All Rounder'}</div>
                        </div>
                        <div class="text-right shrink-0">
                          <div class="font-mono font-black text-emerald-700 text-xs">${(p.isIcon || p.isIconPlayer) ? '⭐ Icon' : `₹${(Number(p.soldPrice) || 0).toLocaleString('en-IN')}`}</div>
                          <div class="text-[9px] text-sky-700 font-bold truncate">🛡️ ${assignedTeam.name}</div>
                        </div>
                      </div>
                      ${!(p.isIcon || p.isIconPlayer) ? `<button class="admin-unsell-player-btn w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-[9px] font-black cursor-pointer" data-player-id="${p.id}" data-player-name="${p.name}" data-team-name="${assignedTeam.name}" data-price="${p.soldPrice || 0}">❌ Remove & Refund</button>` : ''}
                    </div>`;
                }).join('')}
              </div>
              <!-- Desktop Table -->
              <div class="hidden sm:block overflow-x-auto border border-slate-200 rounded-2xl">
                <table class="w-full text-left text-xs text-slate-800">
                  <thead class="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-200">
                    <tr>
                      <th class="py-2.5 px-3">PLAYER</th>
                      <th class="py-2.5 px-3">ROLE</th>
                      <th class="py-2.5 px-3">BOUGHT BY TEAM</th>
                      <th class="py-2.5 px-3 text-center text-amber-800">SOLD PRICE</th>
                      <th class="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-semibold">
                    ${soldPlayers.map(p => {
                      const assignedTeam = teams.find(t => t.id === p.teamId) || { name: 'Unknown Team' };
                      return `
                        <tr class="hover:bg-slate-50 transition-colors">
                          <td class="py-2.5 px-3">
                            <div class="flex items-center gap-2.5">
                              <img src="${p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png'}" class="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                              <div>
                                <div class="font-black text-slate-900 text-xs flex items-center gap-1.5">
                                  <span>${p.name}</span>
                                  ${(p.isIcon || p.isIconPlayer) ? `<span class="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[8px] rounded uppercase tracking-wider">⭐ ICON</span>` : ''}
                                </div>
                                <div class="text-[9px] text-slate-500">${p.village || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-200">${p.category || 'All Rounder'}</span></td>
                          <td class="py-2.5 px-3 font-bold text-sky-800">🛡️ ${assignedTeam.name}</td>
                          <td class="py-2.5 px-3 text-center font-mono font-black text-emerald-700">${(p.isIcon || p.isIconPlayer) ? '⭐ ₹ 1,000 (Icon)' : `₹ ${(Number(p.soldPrice) || Number(p.basePrice) || 0).toLocaleString('en-IN')}`}</td>
                          <td class="py-2.5 px-3 text-right">${(p.isIcon || p.isIconPlayer) ? `<span class="text-[10px] text-amber-700 font-bold italic">Franchise Icon</span>` : `<button class="admin-unsell-player-btn px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-[10px] font-black transition-all shadow-2xs cursor-pointer" data-player-id="${p.id}" data-player-name="${p.name}" data-team-name="${assignedTeam.name}" data-price="${p.soldPrice || 0}">❌ Remove & Refund</button>`}</td>
                        </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
              `}
            </div>

            <!-- TAB 2: Unsold Players Pool & Re-Bid Controls -->
            <div id="admin-auction-unsold-container" class="${adminAuctionSubTab === 'unsold' ? '' : 'hidden'}">
              ${unsoldPlayers.length === 0 ? `
                <div class="py-8 text-center text-slate-500 italic border border-slate-200 rounded-2xl">No unsold players in this round.</div>
              ` : `
              <!-- Mobile Cards -->
              <div class="sm:hidden space-y-2">
                ${unsoldPlayers.map(p => `
                  <div class="p-3 border border-slate-200 rounded-xl space-y-1.5">
                    <div class="flex items-center gap-2.5">
                      <img src="${p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png'}" class="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                      <div class="flex-1 min-w-0">
                        <div class="font-black text-slate-900 text-xs truncate">${p.name}</div>
                        <div class="text-[9px] text-slate-500">${p.category || 'All Rounder'} • ❌ UNSOLD</div>
                      </div>
                      <div class="font-mono font-black text-emerald-700 text-xs shrink-0">₹${(Number(p.basePrice) || 300).toLocaleString('en-IN')}</div>
                    </div>
                    <button class="admin-rebid-unsold-player-btn w-full py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] rounded-lg cursor-pointer" data-player-id="${p.id}">🔨 Re-Bid / Put on Block</button>
                  </div>
                `).join('')}
              </div>
              <!-- Desktop Table -->
              <div class="hidden sm:block overflow-x-auto border border-slate-200 rounded-2xl">
                <table class="w-full text-left text-xs text-slate-800">
                  <thead class="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-200">
                    <tr>
                      <th class="py-2.5 px-3">UNSOLD PLAYER</th>
                      <th class="py-2.5 px-3">ROLE</th>
                      <th class="py-2.5 px-3">STATUS</th>
                      <th class="py-2.5 px-3 text-center text-amber-800">BASE PRICE</th>
                      <th class="py-2.5 px-3 text-right">RE-AUCTION ACTION</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-semibold">
                    ${unsoldPlayers.map(p => `
                      <tr class="hover:bg-slate-50 transition-colors">
                        <td class="py-2.5 px-3">
                          <div class="flex items-center gap-2.5">
                            <img src="${p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png'}" class="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                            <div>
                              <div class="font-black text-slate-900 text-xs">${p.name}</div>
                              <div class="text-[9px] text-slate-500">${p.village || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-200">${p.category || 'All Rounder'}</span></td>
                        <td class="py-2.5 px-3 font-bold text-rose-600">❌ UNSOLD (Round 1)</td>
                        <td class="py-2.5 px-3 text-center font-mono font-black text-emerald-700">₹ ${(Number(p.basePrice) || 300).toLocaleString('en-IN')}</td>
                        <td class="py-2.5 px-3 text-right">
                          <button class="admin-rebid-unsold-player-btn px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5" data-player-id="${p.id}">🔨 Re-Bid / Put on Block</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              `}
            </div>
          </div>
        </div>

        <!-- 5. Match Scheduler Tab -->
        <div id="tab-fixtures-view" class="${activeAdminTab === 'fixtures' ? '' : 'hidden'} space-y-4 animate-fade-in">
          
          <!-- 5a. TOURNAMENT FORMAT & GROUP STAGE MANAGER CARD -->
          <div class="p-4 sm:p-5 bg-white border-2 border-emerald-300 rounded-3xl shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <span class="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
                  <i data-lucide="trophy" class="w-5 h-5"></i>
                </span>
                <div>
                  <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                    Tournament Format & Group Stages Manager
                    <span class="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase">Live Config</span>
                  </h3>
                  <p class="text-xs text-slate-500">Configure 2 Groups (Group A & B), 4 Groups (A, B, C, D), or Single League. Conduct live lottery & auto-generate fixtures.</p>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap items-center gap-2">
                <button id="admin-randomize-groups-btn" class="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all border border-amber-300" title="Randomize and split teams evenly into groups">
                  🎲 Live Lottery / Random Draw
                </button>
                <button id="admin-auto-fixtures-btn" class="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all border border-sky-400" title="Automatically generate intra-group round-robin fixtures">
                  ⚡ 1-Click Auto Fixtures
                </button>
              </div>
            </div>

            <!-- Format Settings Form Bar -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div>
                <label class="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">Target Tournament</label>
                <select id="group-mgr-league-select" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2 font-bold cursor-pointer">
                  ${leagues.map(l => `<option value="${(l.code || l.category || 'T').toUpperCase()}">${l.name || l.code}</option>`).join('')}
                </select>
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">Tournament Format</label>
                <select id="group-mgr-format-select" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2 font-bold cursor-pointer">
                  <option value="TWO_GROUPS">2 Groups (Group A & Group B)</option>
                  <option value="THREE_GROUPS">3 Groups (Group A, Group B & Group C)</option>
                  <option value="FOUR_GROUPS">4 Groups (Groups A, B, C & D)</option>
                  <option value="SINGLE_TABLE">Single League Table (1 Group - All Teams)</option>
                </select>
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">Qualification Rule</label>
                <select id="group-mgr-knockout-select" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2 font-bold cursor-pointer">
                  <option value="SEMIFINALS">Top 2 of Each Group ➔ Semifinals (1st A vs 2nd B, 1st B vs 2nd A)</option>
                  <option value="QUARTERFINALS">Top 2 of Each Group ➔ Quarterfinals ➔ SF ➔ Final</option>
                  <option value="FINAL_ONLY">Top 1 of Each Group ➔ Direct Grand Final</option>
                </select>
              </div>
            </div>

            <!-- Visual Group Breakdown Arena Container -->
            <div id="admin-group-breakdown-arena"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Create Fixture Form -->
            <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-3.5 md:col-span-1">
              <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-5 h-5 text-sky-600"></i> Schedule Match
              </h3>
              <form id="admin-create-fixture-form" class="space-y-3">
                <div>
                  <label class="block text-[10px] font-bold text-slate-600 mb-1">TOURNAMENT LEAGUE</label>
                  <select id="fixture-league-category" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold">
                    ${leagues.map(l => `<option value="${(l.code || l.category || 'T').toUpperCase()}">${l.name || l.code}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-600 mb-1">MATCH STAGE / GROUP</label>
                  <select id="fixture-stage-select" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold">
                    ${initialStageOptionsHtml}
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-600 mb-1">TEAM A</label>
                  <select id="fixture-team-a" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5" required>
                    <option value="">-- Select Team --</option>
                    ${teams.map(t => `<option value="${t.id}">[Group ${t.group || 'A'}] ${t.name}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-600 mb-1">TEAM B</label>
                  <select id="fixture-team-b" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5" required>
                    <option value="">-- Select Team --</option>
                    ${teams.map(t => `<option value="${t.id}">[Group ${t.group || 'A'}] ${t.name}</option>`).join('')}
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-600 mb-1">MATCH DATE</label>
                    <input type="date" id="fixture-date" value="${new Date().toISOString().split('T')[0]}" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold" required />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-600 mb-1">START TIME</label>
                    <input type="time" id="fixture-time" value="09:00" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold" required />
                  </div>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-600 mb-1">VENUE</label>
                  <input type="text" id="fixture-venue" value="JHANKRA SCHOOL GROUND" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-medium" required />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-600 mb-1">MATCH NO. (e.g. 1, 2, 3)</label>
                    <input type="number" id="fixture-match-no" placeholder="Auto (#)" min="1" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-600 mb-1">TOTAL OVERS</label>
                    <input type="number" id="fixture-overs" value="16" min="1" max="50" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold" required />
                  </div>
                </div>
                <button type="submit" class="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer">
                  Schedule Fixture
                </button>
              </form>
            </div>

            <!-- List Scheduled Fixtures -->
            <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-3.5 md:col-span-2">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                  <i data-lucide="calendar" class="w-5 h-5 text-sky-600"></i> Scheduled Matches
                </h3>
                <button type="button" id="admin-clear-all-fixtures-btn" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs rounded-xl border border-rose-300 shadow-2xs flex items-center gap-1 cursor-pointer transition-all">
                  🗑️ Clear All Matches
                </button>
              </div>
              <div class="overflow-x-auto border border-slate-200 rounded-2xl">
                <table class="w-full text-left text-xs sm:text-sm text-slate-800">
                  <thead class="hidden sm:table-header-group bg-slate-100 text-[10px] uppercase text-slate-700 font-black border-b border-slate-200">
                    <tr>
                      <th class="py-3 px-3">Teams</th>
                      <th class="py-3 px-3">Stage / Group</th>
                      <th class="py-3 px-3">Date / Venue</th>
                      <th class="py-3 px-3">Overs</th>
                      <th class="py-3 px-3">Status</th>
                      <th class="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody id="admin-fixtures-list" class="divide-y divide-slate-100"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Live Match Scorer Tab -->
        <div id="tab-scorer-view" class="${activeAdminTab === 'scorer' ? '' : 'hidden'} space-y-4 animate-fade-in">
          
          <!-- STEP 1: CHOOSE MATCH & TOSS DETAILS -->
          <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-3.5">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
              <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                <span class="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono font-black text-xs shadow-2xs">1</span>
                <span>Select Match to Score</span>
              </h3>
              <span class="text-[10px] text-slate-400 font-bold uppercase">Step 1 of 3</span>
            </div>

            <div>
              <label class="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">CHOOSE FIXTURE</label>
              <select id="scorer-select-match" class="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs sm:text-sm rounded-2xl p-3 font-bold cursor-pointer hover:border-emerald-500 transition-colors">
                <option value="">-- Choose Match --</option>
              </select>
            </div>

            <!-- Selected Match Info Banner (Shown after match selected) -->
            <div id="scorer-selected-match-card" class="hidden bg-emerald-50/70 border-2 border-emerald-300 p-3.5 rounded-2xl text-slate-900 space-y-2"></div>
          </div>

          <!-- STEP 2: SELECT STRIKER, NON-STRIKER & OPENING BOWLER -->
          <div id="scorer-lineup-step-block" class="hidden p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-4 animate-fade-in">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
              <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                <span class="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-mono font-black text-xs shadow-2xs">2</span>
                <span>Select Opening Batsmen & Bowler</span>
              </h3>
              <span class="text-[10px] text-slate-400 font-bold uppercase">Step 2 of 3</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <!-- Striker -->
              <div class="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-1.5">
                <label class="block text-[11px] font-black text-emerald-950 uppercase tracking-wider flex items-center justify-between">
                  <span>🏏 Batsman 1 (Strike)</span>
                  <span class="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black">Facing</span>
                </label>
                <select id="scorer-select-striker" class="w-full bg-white border-2 border-emerald-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold cursor-pointer shadow-2xs"></select>
                <span class="text-[10px] text-slate-500 block">Will face the first delivery of the over.</span>
              </div>

              <!-- Non-Striker -->
              <div class="p-3 bg-teal-50/50 border border-teal-200 rounded-2xl space-y-1.5">
                <label class="block text-[11px] font-black text-teal-950 uppercase tracking-wider flex items-center justify-between">
                  <span>🏏 Batsman 2 (Non-Strike)</span>
                  <span class="text-[9px] bg-teal-600 text-white px-1.5 py-0.2 rounded font-black">Runner</span>
                </label>
                <select id="scorer-select-non-striker" class="w-full bg-white border-2 border-teal-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold cursor-pointer shadow-2xs"></select>
                <span class="text-[10px] text-slate-500 block">Opening partner at bowler's end.</span>
              </div>

              <!-- Bowler -->
              <div class="p-3 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-1.5">
                <label class="block text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center justify-between">
                  <span>⚾ Opening Bowler</span>
                  <span class="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-black">Over 1</span>
                </label>
                <select id="scorer-select-bowler" class="w-full bg-white border-2 border-indigo-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold cursor-pointer shadow-2xs"></select>
                <span class="text-[10px] text-slate-500 block">Delivering Over #1 of the innings.</span>
              </div>
            </div>

            <!-- Big Start Match Action Button -->
            <button type="button" id="scorer-start-match-action-btn" class="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-md cursor-pointer transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2">
              <span class="text-lg">🚀</span>
              <span id="scorer-start-match-btn-txt">START MATCH & OPEN LIVE SCORING PANEL</span>
            </button>
          </div>

          <!-- STEP 3: LIVE BALL-BY-BALL SCORING PANEL -->
          <div id="scorer-active-panel" class="hidden p-4 sm:p-5 bg-white border-2 border-emerald-500 rounded-3xl shadow-lg space-y-4 animate-fade-in">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
              <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                <span class="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-mono font-black text-xs">3</span>
                <span class="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                <span>Live Ball-by-Ball Scoring Engine</span>
              </h3>
              <span class="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">🔴 LIVE MATCH RUNNING</span>
            </div>

            <!-- Active match status summary card -->
            <div id="scorer-match-status-summary"></div>
            
            <!-- In-Play Batsmen & Bowler Quick Switcher -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <label class="block text-[10px] font-black text-slate-600 mb-1 uppercase tracking-wider">Current Striker 🏏</label>
                <select id="scorer-active-striker-sel" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2 font-bold"></select>
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-600 mb-1 uppercase tracking-wider">Current Non-Striker 🏏</label>
                <select id="scorer-active-non-striker-sel" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2 font-bold"></select>
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-600 mb-1 uppercase tracking-wider">Current Bowler ⚾</label>
                <select id="scorer-active-bowler-sel" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2 font-bold"></select>
              </div>
            </div>

            <!-- Ball Scoring Inputs -->
            <div class="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 space-y-3">
              <div class="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>⚡ Scoring Actions (Click ball outcome)</span>
                <span class="text-[10px] text-emerald-700 font-bold">Auto-syncs live to Match Corner</span>
              </div>
              
              <!-- Runs & Wicket Buttons Grid -->
              <div class="grid grid-cols-3 sm:grid-cols-7 gap-2">
                <button type="button" data-runs="0" onclick="window.processScorerBall(0)" class="scorer-ball-act-btn py-3 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-black text-sm rounded-2xl shadow-2xs cursor-pointer active:scale-95 transition-all">0 Runs</button>
                <button type="button" data-runs="1" onclick="window.processScorerBall(1)" class="scorer-ball-act-btn py-3 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-black text-sm rounded-2xl shadow-2xs cursor-pointer active:scale-95 transition-all">1 Run</button>
                <button type="button" data-runs="2" onclick="window.processScorerBall(2)" class="scorer-ball-act-btn py-3 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-black text-sm rounded-2xl shadow-2xs cursor-pointer active:scale-95 transition-all">2 Runs</button>
                <button type="button" data-runs="3" onclick="window.processScorerBall(3)" class="scorer-ball-act-btn py-3 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-black text-sm rounded-2xl shadow-2xs cursor-pointer active:scale-95 transition-all">3 Runs</button>
                <button type="button" data-runs="4" onclick="window.processScorerBall(4)" class="scorer-ball-act-btn py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-2xl shadow-2xs cursor-pointer active:scale-95 transition-all">4 (FOUR)</button>
                <button type="button" data-runs="6" onclick="window.processScorerBall(6)" class="scorer-ball-act-btn py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-2xs cursor-pointer active:scale-95 transition-all">6 (SIX)</button>
                <button type="button" id="scorer-wicket-btn" onclick="window.openScorerWicketModal()" class="py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-2xl shadow-2xs cursor-pointer active:scale-95 transition-all">WICKET</button>
              </div>

              <!-- Extras & Dismissal details -->
              <div class="flex flex-wrap gap-4 text-xs font-bold pt-2 border-t border-slate-200 text-slate-700">
                <div class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" id="scorer-extra-wide" class="w-4 h-4 accent-amber-500 cursor-pointer" />
                  <label for="scorer-extra-wide" class="cursor-pointer">Wide Ball (WD)</label>
                </div>
                <div class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" id="scorer-extra-noball" class="w-4 h-4 accent-amber-500 cursor-pointer" />
                  <label for="scorer-extra-noball" class="cursor-pointer">No Ball (NB)</label>
                </div>
                <div class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" id="scorer-extra-bye" class="w-4 h-4 accent-amber-500 cursor-pointer" />
                  <label for="scorer-extra-bye" class="cursor-pointer">Byes (B)</label>
                </div>
                <div class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" id="scorer-extra-legbye" class="w-4 h-4 accent-amber-500 cursor-pointer" />
                  <label for="scorer-extra-legbye" class="cursor-pointer">Leg Byes (LB)</label>
                </div>
              </div>

              <!-- Current Over Logs -->
              <div class="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <span class="text-slate-500 font-bold">This Over Deliveries:</span>
                <div id="scorer-this-over-balls" class="flex gap-1.5 flex-wrap"></div>
              </div>

              <!-- Submit and Innings controls -->
              <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <button type="button" id="scorer-swap-strike-btn" onclick="window.swapStrikeManually()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 cursor-pointer transition-all">
                  🔄 Swap Strike manually
                </button>
                <div class="flex items-center gap-2">
                  <button type="button" id="scorer-end-innings-btn" onclick="window.closeInningsManually()" class="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 font-black text-xs rounded-xl border border-purple-300 cursor-pointer transition-all">
                    🌓 Close Innings
                  </button>
                  <button type="button" id="scorer-finish-match-btn" onclick="window.finishMatchManually()" class="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 font-black text-xs rounded-xl border border-rose-300 cursor-pointer transition-all">
                    🏆 Finish Match & Set Winner
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 6b. Registration Link & Public Access Controller Tab -->
        <div id="tab-reg-settings-view" class="${activeAdminTab === 'reg-settings' ? '' : 'hidden'} space-y-4 animate-fade-in">
          <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
              <div class="flex items-center gap-3">
                <span class="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                  <i data-lucide="power" class="w-5 h-5"></i>
                </span>
                <div>
                  <h3 class="text-base font-black text-slate-900">${activeTourneyName} Registration Link Controller</h3>
                  <p class="text-xs text-slate-500">Activate or deactivate the public registration link with 1-click cloud sync.</p>
                </div>
              </div>

              <!-- Real-time Status Badge -->
              <div id="reg-status-badge-container" class="flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isRegOpen ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'}">
                <span class="w-2.5 h-2.5 rounded-full ${isRegOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}"></span>
                <span class="text-xs font-black uppercase tracking-wider">${isRegOpen ? '🟢 Registration Active (Open)' : '🔴 Registration Deactivated (Closed)'}</span>
              </div>
            </div>

            <!-- MASTER ON / OFF CARD -->
            <div class="p-4 sm:p-5 rounded-2xl border-2 ${isRegOpen ? 'border-emerald-300 bg-emerald-50/40' : 'border-red-300 bg-red-50/40'} space-y-3.5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm sm:text-base font-black text-slate-900">Master Registration Switch</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${isRegOpen ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-red-600 text-white shadow-2xs'}">
                      ${isRegOpen ? 'ENABLED' : 'DEACTIVATED'}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500">When deactivated, visitors cannot register new players or teams. The "Register Now" button will display as "Registration Closed".</p>
                </div>

                <div class="flex items-center gap-3">
                  <button id="toggle-master-reg-switch-btn" class="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-sm flex items-center gap-2 transition-all cursor-pointer ${isRegOpen ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}">
                    <i data-lucide="${isRegOpen ? 'power-off' : 'power'}" class="w-4 h-4"></i>
                    ${isRegOpen ? 'Deactivate Registration Link' : 'Activate Registration Link'}
                  </button>
                </div>
              </div>

              <!-- DETAILED GRANULAR CONTROLS -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <!-- Player Registration Sub-Toggle -->
                <div class="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                  <div>
                    <div class="text-xs font-black text-slate-900">Player Registration Form</div>
                    <div class="text-[10px] text-slate-500">Public Player Entry Form (₹ 200/₹ 300)</div>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="reg-player-sub-toggle" class="sr-only peer" ${regSettings.isPlayerRegOpen !== false ? 'checked' : ''} ${!isRegOpen ? 'disabled' : ''}>
                    <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-50"></div>
                  </label>
                </div>

                <!-- Team Registration Sub-Toggle -->
                <div class="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                  <div>
                    <div class="text-xs font-black text-slate-900">Franchise Team Registration</div>
                    <div class="text-[10px] text-slate-500">Public Team Entry Form (15K Entry)</div>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="reg-team-sub-toggle" class="sr-only peer" ${regSettings.isTeamRegOpen !== false ? 'checked' : ''} ${!isRegOpen ? 'disabled' : ''}>
                    <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-50"></div>
                  </label>
                </div>
              </div>
            </div>

            <!-- CLOSURE NOTICE MESSAGE EDITOR -->
            <div class="space-y-2 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <label class="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Custom Deactivation / Closed Banner Message
              </label>
              <p class="text-[11px] text-slate-500">This message is shown to users when they click the registration button while deactivated.</p>
              <textarea id="reg-closed-message-input" rows="2" class="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500" placeholder="Registration is currently closed by the Admin.">${regSettings.closedReason || 'Registration is currently closed by the Admin.'}</textarea>
              <div class="flex justify-end pt-1">
                <button id="save-reg-message-btn" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer">
                  <i data-lucide="save" class="w-3.5 h-3.5 text-amber-400"></i> Update Closure Message
                </button>
              </div>
            </div>

            <!-- LIVE PREVIEW WIDGET -->
            <div class="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <div class="text-xs font-black text-slate-800 uppercase tracking-wide">Public UI Button Preview</div>
                <span class="text-[10px] text-slate-500">What visitors currently see on the website</span>
              </div>
              <div class="p-6 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
                ${isRegOpen ? `
                  <button class="btn-blink-always px-8 py-3 bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 border border-red-400 pointer-events-none">
                    <i data-lucide="edit-3" class="w-4 h-4 text-amber-300"></i> Register Now (ACTIVE)
                  </button>
                ` : `
                  <button class="px-8 py-3 bg-slate-200 text-slate-600 font-black text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 border border-slate-300 pointer-events-none">
                    <i data-lucide="lock" class="w-4 h-4 text-slate-500"></i> Registration Closed (DEACTIVATED)
                  </button>
                `}
              </div>
            </div>

          </div>
        </div>

        <!-- 7. Partner Shop Advertisement Tab -->
        <div id="tab-shop-ads-view" class="${activeAdminTab === 'shop-ads' ? '' : 'hidden'} space-y-4 animate-fade-in">
          <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-4">
            <div class="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span class="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
                <i data-lucide="megaphone" class="w-5 h-5"></i>
              </span>
              <div>
                <h3 class="text-base font-black text-slate-900">Site-Wide Popup & Ad Controller</h3>
                <p class="text-xs text-slate-500">Configure whether advertisement, welcome, or WhatsApp join popups show up on the website.</p>
              </div>
            </div>

            <div id="admin-ads-panel-container" class="space-y-3">
              <div class="text-center py-6 text-slate-500 text-xs">
                <i data-lucide="loader" class="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600"></i>
                Loading Advertisement Settings...
              </div>
            </div>
          </div>
        </div>

        <!-- 10. Multi-Tournament SaaS & Platform Controls Tab -->
        <div id="tab-saas-tournaments-view" class="${activeAdminTab === 'saas-tournaments' ? '' : 'hidden'} space-y-4 animate-fade-in">
          <div class="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-4">
            <div class="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
              <div class="flex items-center gap-3">
                <span class="p-2.5 bg-amber-100 text-amber-900 rounded-2xl border border-amber-300 shadow-2xs text-lg font-black">
                  🏆
                </span>
                <div>
                  <h3 class="text-base font-black text-slate-900">Multi-Tournament SaaS & Host Controls</h3>
                  <p class="text-xs text-slate-500 font-bold">Create new custom tournaments and control public visibility on the homepage.</p>
                </div>
              </div>

              <!-- Create Tournament Button -->
              <button type="button" id="admin-launch-create-tourney-wizard-btn" class="px-4 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-xs border border-amber-300 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105">
                <span>+ Create New Tournament</span>
              </button>
            </div>

            <!-- Master Feature Flag Toggle Card -->
            <div class="p-4 bg-gradient-to-r from-slate-900 to-slate-950 rounded-2xl text-white border border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div class="space-y-1 max-w-md">
                <div class="flex items-center gap-2">
                  <span id="admin-host-tourney-status-badge" class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${store.isHostTournamentEnabled() ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950'}">
                    ${store.isHostTournamentEnabled() ? '🟢 PUBLICLY ACTIVE' : '🔒 DRAFT MODE (ADMIN ONLY)'}
                  </span>
                  <h4 class="text-sm font-black text-white">Public "Create Tournament" Banner on Homepage</h4>
                </div>
                <p class="text-[11px] text-slate-400">Toggle whether visitors can create tournaments on the homepage, or keep it exclusive to the Admin Dashboard.</p>
              </div>

              <div class="flex items-center gap-3">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="admin-host-tourney-feature-toggle" class="sr-only peer" ${store.isHostTournamentEnabled() ? 'checked' : ''}>
                  <div class="w-12 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            <!-- Created Tournaments Directory List -->
            <div class="space-y-3 pt-2">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Directory of Created Tournaments</span>
                  <span id="admin-custom-tourneys-count-badge" class="px-2 py-0.2 bg-slate-100 text-slate-700 text-[10px] rounded-full font-mono font-bold">0</span>
                </h4>
              </div>

              <div id="admin-custom-tourneys-table-container" class="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-slate-50/50">
                <!-- Populated by JS -->
              </div>
            </div>

          </div>
        </div>

          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Count-up animation for stat cards
  containerEl.querySelectorAll('.cpl-countup').forEach(el => {
    const target = parseInt(el.dataset.target) || 0;
    if (target === 0) { el.textContent = '0'; return; }
    const duration = 600;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  // Tournament selector change
  document.getElementById('admin-tournament-selector')?.addEventListener('change', (e) => {
    const newTid = e.target.value;
    if (store.setActiveTournament) store.setActiveTournament(newTid);
    else store.activeTournamentId = newTid;
    renderAdminDashboard(containerEl);
  });

  // --- TAB SWITCHING LISTENERS ---
  const tabBtns = containerEl.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeAdminTab = e.currentTarget.getAttribute('data-tab');
      try { sessionStorage.setItem('cpl_admin_tab', activeAdminTab); } catch(e) {}

      tabBtns.forEach(b => {
        b.classList.remove('bg-emerald-600', 'text-white', 'shadow-sm');
        b.classList.add('text-slate-600');
        if (b.closest('#admin-sidebar-nav')) {
          b.classList.remove('shadow-sm');
          b.classList.add('hover:bg-slate-50', 'hover:text-slate-900');
        } else {
          b.classList.add('bg-white', 'border', 'border-slate-200', 'hover:bg-slate-50');
          b.classList.remove('shadow-sm');
        }
      });
      e.currentTarget.classList.add('bg-emerald-600', 'text-white', 'shadow-sm');
      e.currentTarget.classList.remove('text-slate-600', 'bg-white', 'hover:bg-slate-50', 'hover:text-slate-900', 'border', 'border-slate-200');

      document.getElementById('tab-overview-view')?.classList.add('hidden');
      document.getElementById('tab-payments-view').classList.add('hidden');
      document.getElementById('tab-all-players-view').classList.add('hidden');
      document.getElementById('tab-teams-view').classList.add('hidden');
      document.getElementById('tab-auction-view')?.classList.add('hidden');
      document.getElementById('tab-fixtures-view')?.classList.add('hidden');
      document.getElementById('tab-scorer-view')?.classList.add('hidden');
      document.getElementById('tab-reg-settings-view')?.classList.add('hidden');
      document.getElementById('tab-shop-ads-view')?.classList.add('hidden');
      document.getElementById('tab-owners-view')?.classList.add('hidden');
      document.getElementById('tab-saas-tournaments-view')?.classList.add('hidden');

      if (activeAdminTab === 'overview') document.getElementById('tab-overview-view')?.classList.remove('hidden');
      if (activeAdminTab === 'payments') document.getElementById('tab-payments-view').classList.remove('hidden');
      if (activeAdminTab === 'all-players') document.getElementById('tab-all-players-view').classList.remove('hidden');
      if (activeAdminTab === 'teams') document.getElementById('tab-teams-view').classList.remove('hidden');

      if (activeAdminTab === 'auction') {
        document.getElementById('tab-auction-view')?.classList.remove('hidden');
        renderActiveAuctionBlock();
      }
      if (activeAdminTab === 'fixtures') {
        document.getElementById('tab-fixtures-view')?.classList.remove('hidden');
        renderAdminGroupArena();
        renderAdminFixturesList();
      }
      if (activeAdminTab === 'scorer') {
        document.getElementById('tab-scorer-view')?.classList.remove('hidden');
        renderScorerMatchesList();
      }
      if (activeAdminTab === 'reg-settings') {
        document.getElementById('tab-reg-settings-view')?.classList.remove('hidden');
      }
      if (activeAdminTab === 'shop-ads') {
        document.getElementById('tab-shop-ads-view')?.classList.remove('hidden');
        renderAdminShopAdsPanel();
      }
      if (activeAdminTab === 'owners') {
        document.getElementById('tab-owners-view')?.classList.remove('hidden');
      }
      if (activeAdminTab === 'saas-tournaments') {
        document.getElementById('tab-saas-tournaments-view')?.classList.remove('hidden');
        renderAdminSaasTournamentsPanel();
      }
    });
  });

  // --- OVERVIEW TAB LISTENERS ---
  document.getElementById('overview-toggle-reg-btn')?.addEventListener('click', () => {
    const currentOpen = store.isRegistrationOpen();
    const newStatus = !currentOpen;
    store.toggleRegistration(newStatus);
    alert(newStatus ? '✅ Registration is now OPEN!' : '🚫 Registration is now CLOSED!');
    renderAdminDashboard(containerEl);
  });

  document.getElementById('overview-share-link-btn')?.addEventListener('click', () => {
    const tourney = allTournaments.find(t => t.id === activeTid);
    const slug = tourney?.slug || 'default';
    const link = `${window.location.origin}${window.location.pathname}#reg-${slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => alert('✅ Registration link copied to clipboard!\\n\\n' + link));
    } else {
      prompt('Copy this registration link:', link);
    }
  });

  document.getElementById('overview-view-public-btn')?.addEventListener('click', () => {
    const tourney = allTournaments.find(t => t.id === activeTid);
    const slug = tourney?.slug || 'default';
    window.open(`${window.location.origin}${window.location.pathname}#t/${slug}`, '_blank');
  });

  // --- REGISTRATION SETTINGS LISTENERS ---
  document.getElementById('quick-toggle-reg-btn')?.addEventListener('click', () => {
    const currentOpen = store.isRegistrationOpen();
    const newStatus = !currentOpen;
    store.toggleRegistration(newStatus);
    alert(newStatus ? '✅ Registration link is now ACTIVATED (Open for all players & teams)!' : '🚫 Registration link is now DEACTIVATED (Closed for all public entries)!');
    renderAdminDashboard(containerEl);
  });

  document.getElementById('toggle-master-reg-switch-btn')?.addEventListener('click', () => {
    const currentOpen = store.isRegistrationOpen();
    const newStatus = !currentOpen;
    store.toggleRegistration(newStatus);
    alert(newStatus ? '✅ Registration link is now ACTIVATED!' : '🚫 Registration link is now DEACTIVATED!');
    activeAdminTab = 'reg-settings';
    renderAdminDashboard(containerEl);
  });

  document.getElementById('reg-player-sub-toggle')?.addEventListener('change', (e) => {
    store.updateRegistrationSettings({ isPlayerRegOpen: e.target.checked });
  });

  document.getElementById('reg-team-sub-toggle')?.addEventListener('change', (e) => {
    store.updateRegistrationSettings({ isTeamRegOpen: e.target.checked });
  });

  document.getElementById('save-reg-message-btn')?.addEventListener('click', () => {
    const msg = document.getElementById('reg-closed-message-input')?.value.trim();
    if (msg) {
      store.updateRegistrationSettings({ closedReason: msg });
      alert('✅ Closure notice message updated successfully!');
    }
  });

  // Bind Assign Tournament Owner Form Submit
  document.getElementById('assign-tournament-owner-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tId = document.getElementById('assign-owner-tournament-id').value;
    const sel = document.getElementById('assign-owner-player-select');
    const phone = sel ? sel.value : '';
    const opt = sel ? sel.options[sel.selectedIndex] : null;
    const name = opt ? (opt.getAttribute('data-name') || opt.textContent.split('(')[0].trim()) : 'Tournament Owner';

    if (!phone) return alert('Please select a player from the dropdown to appoint as Tournament Owner!');

    await store.setTournamentOwner(tId, phone, name);
    alert(`👑 Authority Granted!\n\n"${name}" (${phone}) is now the official Tournament Owner.`);
    activeAdminTab = 'owners';
    renderAdminDashboard(containerEl);
  });

  // Bind Reset Auction Button
  document.getElementById('admin-reset-auction-btn')?.addEventListener('click', () => {
    if (confirm("⚠️ CAUTION: Are you sure you want to revert all sold players and reset team purses?\n\nThis will clear all team squads and reset purses to original budgets.")) {
      store.resetAuctionData();
      alert("✅ Auction data reverted successfully!");
      renderAdminDashboard(containerEl, 'auction');
    }
  });

  // Bind Individual Unsell / Remove Player Button in Auction Tab
  document.querySelectorAll('.admin-unsell-player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pId = e.currentTarget.getAttribute('data-player-id');
      const pName = e.currentTarget.getAttribute('data-player-name');
      const tName = e.currentTarget.getAttribute('data-team-name');
      const price = Number(e.currentTarget.getAttribute('data-price')) || 0;

      if (confirm(`Are you sure you want to remove "${pName}" from "${tName}"?\n\n• Player will be removed from ${tName}'s squad (-1 player).\n• ₹${price.toLocaleString('en-IN')} will be refunded to ${tName}'s purse/wallet.\n• Player will return to the available auction pool.`)) {
        store.unassignPlayerFromTeam(pId);
        alert(`✅ "${pName}" removed from ${tName} and ₹${price.toLocaleString('en-IN')} refunded!`);
        renderAdminDashboard(containerEl);
      }
    });
  });

  // Bind Auction Subtab Switching (Sold vs Unsold)
  document.getElementById('admin-auction-tab-sold')?.addEventListener('click', () => {
    adminAuctionSubTab = 'sold';
    document.getElementById('admin-auction-sold-container')?.classList.remove('hidden');
    document.getElementById('admin-auction-unsold-container')?.classList.add('hidden');
    document.getElementById('admin-auction-tab-sold')?.classList.add('bg-blue-600', 'text-white', 'shadow-md');
    document.getElementById('admin-auction-tab-sold')?.classList.remove('bg-slate-800', 'text-slate-300');
    document.getElementById('admin-auction-tab-unsold')?.classList.remove('bg-rose-600', 'text-white', 'shadow-md');
    document.getElementById('admin-auction-tab-unsold')?.classList.add('bg-slate-800', 'text-slate-300');
    document.getElementById('admin-reset-all-unsold-btn')?.classList.add('hidden');
  });

  document.getElementById('admin-auction-tab-unsold')?.addEventListener('click', () => {
    adminAuctionSubTab = 'unsold';
    document.getElementById('admin-auction-sold-container')?.classList.add('hidden');
    document.getElementById('admin-auction-unsold-container')?.classList.remove('hidden');
    document.getElementById('admin-auction-tab-unsold')?.classList.add('bg-rose-600', 'text-white', 'shadow-md');
    document.getElementById('admin-auction-tab-unsold')?.classList.remove('bg-slate-800', 'text-slate-300');
    document.getElementById('admin-auction-tab-sold')?.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
    document.getElementById('admin-auction-tab-sold')?.classList.add('bg-slate-800', 'text-slate-300');
    document.getElementById('admin-reset-all-unsold-btn')?.classList.remove('hidden');
  });

  // Bind Re-Bid Unsold Player Button (Instantly puts player on active block)
  document.querySelectorAll('.admin-rebid-unsold-player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pId = e.currentTarget.getAttribute('data-player-id');
      const p = store.getPlayerById(pId);
      if (p) {
        startAuctionForPlayerDirectly(p);
        window.scrollTo({ top: 300, behavior: 'smooth' });
        alert(`🔨 Re-Auctioning "${p.name}"! Placed directly on the live bidding block.`);
      }
    });
  });

  // Bind Reset All Unsold to Queue (Round 2)
  document.getElementById('admin-reset-all-unsold-btn')?.addEventListener('click', () => {
    const unsoldPlayers = store.getPlayers().filter(p => p.auctionStatus === 'UNSOLD' && !p.teamId);
    if (unsoldPlayers.length === 0) return;
    if (confirm(`Reset all ${unsoldPlayers.length} unsold players back to the active auction Queue for Round 2?`)) {
      unsoldPlayers.forEach(p => {
        p.auctionStatus = 'PENDING';
        store.updatePlayer(p);
      });
      alert(`✅ ${unsoldPlayers.length} unsold players moved back to the Queue for Round 2!`);
      renderAdminDashboard(containerEl);
    }
  });

  // Bind Auction Settings Form Submit
  document.getElementById('admin-auction-settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const defaultBasePrice = Number(document.getElementById('auction-setting-base-price').value) || 300;
    const defaultPurseBudget = Number(document.getElementById('auction-setting-purse-budget').value) || 8000;
    store.updateAuctionSettings({ defaultBasePrice, defaultPurseBudget });
    alert("Auction parameters updated successfully!");
    renderAdminDashboard(containerEl);
  });

  // Bind Put Player on block btn
  document.getElementById('auction-start-bid-btn')?.addEventListener('click', () => {
    const pId = document.getElementById('auction-select-player')?.value;
    if (!pId) return alert("Please select an approved player from the dropdown first!");
    const p = store.getPlayerById(pId);
    if (p) {
      startAuctionForPlayerDirectly(p);
    }
  });

  // --- GROUP STAGES & FORMAT MANAGER LISTENERS ---
  const groupLeagueSel = document.getElementById('group-mgr-league-select');
  const groupFormatSel = document.getElementById('group-mgr-format-select');
  const groupKnockoutSel = document.getElementById('group-mgr-knockout-select');

  groupLeagueSel?.addEventListener('change', () => {
    const selectedLeague = groupLeagueSel.value;
    const fixtureLeagueSel = document.getElementById('fixture-league-category');
    if (fixtureLeagueSel) fixtureLeagueSel.value = selectedLeague;
    renderAdminGroupArena();
    updateFixtureStageOptions();
  });

  groupFormatSel?.addEventListener('change', async () => {
    const leagueCode = groupLeagueSel ? groupLeagueSel.value : 'T';
    const fmt = groupFormatSel.value;
    let groups = ['A', 'B'];
    if (fmt === 'FOUR_GROUPS') groups = ['A', 'B', 'C', 'D'];
    if (fmt === 'SINGLE_TABLE') groups = ['ALL'];

    await store.saveTournamentFormat(leagueCode, { format: fmt, groups });
    renderAdminGroupArena();
    updateFixtureStageOptions();
  });

  groupKnockoutSel?.addEventListener('change', async () => {
    const leagueCode = groupLeagueSel ? groupLeagueSel.value : 'T';
    await store.saveTournamentFormat(leagueCode, { knockoutType: groupKnockoutSel.value });
    updateFixtureStageOptions();
  });

  // Randomize / Lottery Draw Button
  document.getElementById('admin-randomize-groups-btn')?.addEventListener('click', () => {
    const leagueCode = groupLeagueSel ? groupLeagueSel.value : 'T';
    const fmt = groupFormatSel ? groupFormatSel.value : 'TWO_GROUPS';
    let groupNames = ['A', 'B'];
    if (fmt === 'FOUR_GROUPS') groupNames = ['A', 'B', 'C', 'D'];

    if (confirm(`🎲 Run Live Tournament Lottery Draw for ${leagueCode}?\n\nThis will randomly shuffle all confirmed teams into ${groupNames.length} balanced groups (Groups ${groupNames.join(', ')}) live!`)) {
      const assignments = store.randomizeTeamGroups(leagueCode, groupNames);
      alert(`🎉 Live Lottery Draw Completed!\n\n${assignments.length} teams have been randomly split into Groups ${groupNames.join(', ')} and synced to the cloud!`);
      renderAdminGroupArena();
      updateFixtureStageOptions();
    }
  });

  // Auto-generate Group Fixtures Button
  document.getElementById('admin-auto-fixtures-btn')?.addEventListener('click', () => {
    const leagueCode = groupLeagueSel ? groupLeagueSel.value : 'T';
    const overs = prompt(`⚡ Auto-Generate All Intra-Group Matches for ${leagueCode}?\n\nEnter Total Overs per match:`, "16");
    if (overs !== null) {
      const venue = prompt("Enter Match Venue:", "JHANKRA SCHOOL GROUND") || "JHANKRA SCHOOL GROUND";
      const startDate = prompt("Enter Start Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];
      const generated = store.autoGenerateGroupFixtures(leagueCode, { overs: Number(overs) || 16, venue, startDate });
      alert(`✅ Success! Generated ${generated.length} group stage matches for ${leagueCode}!`);
      renderAdminFixturesList();
      renderAdminDashboard(containerEl);
    }
  });

  function updateFixtureStageOptions() {
    const stageSelect = document.getElementById('fixture-stage-select');
    if (!stageSelect) return;

    const leagueCode = (document.getElementById('fixture-league-category')?.value || 'T').toUpperCase();
    const format = store.getTournamentFormat(leagueCode);
    const fmt = format.format || 'TWO_GROUPS';
    const currentVal = stageSelect.value;

    let stageOptions = [];
    if (fmt === 'TWO_GROUPS') {
      stageOptions = [
        { value: 'GROUP_A', label: '🟢 Group A Match' },
        { value: 'GROUP_B', label: '🔵 Group B Match' },
        { value: 'SEMI_FINAL_1', label: '🏆 Semi-Final 1 (1st Group A vs 2nd Group B)' },
        { value: 'SEMI_FINAL_2', label: '🏆 Semi-Final 2 (1st Group B vs 2nd Group A)' },
        { value: 'FINAL', label: '👑 Grand Final' }
      ];
    } else if (fmt === 'FOUR_GROUPS') {
      stageOptions = [
        { value: 'GROUP_A', label: '🟢 Group A Match' },
        { value: 'GROUP_B', label: '🔵 Group B Match' },
        { value: 'GROUP_C', label: '🟡 Group C Match' },
        { value: 'GROUP_D', label: '🟣 Group D Match' },
        { value: 'SEMI_FINAL_1', label: '🏆 Semi-Final 1' },
        { value: 'SEMI_FINAL_2', label: '🏆 Semi-Final 2' },
        { value: 'FINAL', label: '👑 Grand Final' }
      ];
    } else { // SINGLE_TABLE
      stageOptions = [
        { value: 'LEAGUE', label: '⚔️ Regular League Match' },
        { value: 'SEMI_FINAL_1', label: '🏆 Semi-Final 1 (1st vs 4th)' },
        { value: 'SEMI_FINAL_2', label: '🏆 Semi-Final 2 (2nd vs 3rd)' },
        { value: 'FINAL', label: '👑 Grand Final' }
      ];
    }

    stageSelect.innerHTML = stageOptions.map(opt => `
      <option value="${opt.value}" ${currentVal === opt.value ? 'selected' : ''}>${opt.label}</option>
    `).join('');

    if (!stageOptions.some(opt => opt.value === stageSelect.value)) {
      stageSelect.value = stageOptions[0].value;
    }

    updateFixtureTeamDropdowns();
  }

  function updateFixtureTeamDropdowns() {
    const leagueCode = (document.getElementById('fixture-league-category')?.value || 'T').toUpperCase();
    const stage = document.getElementById('fixture-stage-select')?.value || 'GROUP_A';
    const allLeagueTeams = store.getTeams().filter(t => {
      const code = (t.leagueCode || (t.leagueId === 'leg-jsl' ? 'JSL' : (t.leagueId === 'leg-jpl' ? 'JPL' : (t.leagueId === 'leg-kpl' ? 'KPL' : 'T'))));
      return code === leagueCode;
    });

    let filteredTeams = allLeagueTeams;
    if (stage === 'GROUP_A') filteredTeams = allLeagueTeams.filter(t => (t.group || 'A').toUpperCase() === 'A');
    else if (stage === 'GROUP_B') filteredTeams = allLeagueTeams.filter(t => (t.group || 'B').toUpperCase() === 'B');
    else if (stage === 'GROUP_C') filteredTeams = allLeagueTeams.filter(t => (t.group || 'C').toUpperCase() === 'C');
    else if (stage === 'GROUP_D') filteredTeams = allLeagueTeams.filter(t => (t.group || 'D').toUpperCase() === 'D');
    
    if (filteredTeams.length === 0) filteredTeams = allLeagueTeams;

    const teamASel = document.getElementById('fixture-team-a');
    const teamBSel = document.getElementById('fixture-team-b');
    if (teamASel && teamBSel) {
      const optionsHtml = `<option value="">-- Select Team --</option>` + filteredTeams.map(t => `<option value="${t.id}">[Group ${t.group || 'A'}] ${t.name}</option>`).join('');
      teamASel.innerHTML = optionsHtml;
      teamBSel.innerHTML = optionsHtml;
    }
  }

  document.getElementById('fixture-stage-select')?.addEventListener('change', updateFixtureTeamDropdowns);
  document.getElementById('fixture-league-category')?.addEventListener('change', () => {
    const fLeague = document.getElementById('fixture-league-category').value;
    if (groupLeagueSel) groupLeagueSel.value = fLeague;
    renderAdminGroupArena();
    updateFixtureStageOptions();
  });

  updateFixtureStageOptions();

  // Bind Create Fixture Form Submit
  document.getElementById('admin-create-fixture-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const teamAId = document.getElementById('fixture-team-a').value;
    const teamBId = document.getElementById('fixture-team-b').value;
    if (teamAId === teamBId) return alert("Team A and Team B cannot be the same!");
    const teamA = store.getTeamById(teamAId);
    const teamB = store.getTeamById(teamBId);
    const stageVal = document.getElementById('fixture-stage-select')?.value || 'GROUP_A';
    let grpCode = null;
    if (stageVal === 'GROUP_A') grpCode = 'A';
    else if (stageVal === 'GROUP_B') grpCode = 'B';
    else if (stageVal === 'GROUP_C') grpCode = 'C';
    else if (stageVal === 'GROUP_D') grpCode = 'D';

    const lCode = document.getElementById('fixture-league-category').value;
    const matchNoInput = document.getElementById('fixture-match-no')?.value;
    const existingLeagueFix = store.getFixtures().filter(f => (f.leagueCode || 'T').toUpperCase() === lCode.toUpperCase());
    const matchNo = matchNoInput ? Number(matchNoInput) : (existingLeagueFix.length + 1);

    store.registerFixture({
      leagueCode: lCode,
      matchNo: matchNo,
      stage: stageVal,
      groupCode: grpCode,
      teamAId,
      teamBId,
      teamAName: teamA ? teamA.name : 'Team A',
      teamBName: teamB ? teamB.name : 'Team B',
      date: document.getElementById('fixture-date').value,
      time: document.getElementById('fixture-time').value,
      venue: document.getElementById('fixture-venue').value,
      oversLimit: Number(document.getElementById('fixture-overs').value) || 16,
      status: 'SCHEDULED'
    });
    alert(`Match #${matchNo} scheduled successfully!`);
    renderAdminDashboard(containerEl);
  });


  // Generate 100+ Test Players with Random HD Photos
  document.getElementById('admin-seed-100-players-btn')?.addEventListener('click', () => {
    const firstNames = ['Sourav', 'Rahul', 'Rohit', 'Virat', 'Subha', 'Arijit', 'Pintu', 'Rohan', 'Dipankar', 'Supratim', 'Shaibal', 'Tushar', 'Surya', 'Aniket', 'Sayantan', 'Bikram', 'Debashis', 'Sandip', 'Tanmay', 'Arpan', 'Kaushik', 'Prasenjit', 'Suman', 'Gourav', 'Abhishek', 'Rajesh', 'Manoj', 'Kalyan', 'Sanjay', 'Biplab'];
    const lastNames = ['Roy', 'Ghosh', 'Adikary', 'Singh', 'Dolai', 'Halder', 'Dutta', 'Dikpati', 'Santra', 'Kolay', 'Banerjee', 'Chatterjee', 'Mondal', 'Pramanik', 'Samanta', 'Kundu', 'Khan', 'Maji', 'Mallick', 'De'];
    const villages = ['Jhanka', 'Khirpai', 'Chandrakona', 'Ramjibanpur', 'Ghatal', 'Keshpur', 'Garhbeta', 'Medinipur', 'Salboni', 'Daspur'];
    const categories = ['Batsman', 'Bowler', 'All Rounder', 'Wicket Keeper'];
    const battingStyles = ['Right Hand Bat', 'Left Hand Bat'];
    const bowlingStyles = ['Right Hand Fast', 'Right Hand Medium', 'Right Arm Off Break', 'Left Arm Orthodox', 'Left Arm Fast'];

    const targetTid = activeTid || 'leg-jsl';
    const existingPlayers = store.getPlayers();
    const startSerial = existingPlayers.length + 1;

    let addedCount = 0;
    for (let i = 0; i < 110; i++) {
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fullName = `${fn} ${ln}`;
      const village = villages[Math.floor(Math.random() * villages.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const sNo = startSerial + i;
      const regId = `REG-${String(sNo).padStart(4, '0')}`;
      const phone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const randomGender = Math.random() > 0.1 ? 'men' : 'men';
      const randomImgId = Math.floor(1 + Math.random() * 95);
      const photoUrl = `https://randomuser.me/api/portraits/${randomGender}/${randomImgId}.jpg`;

      const pData = {
        id: generateUUID(),
        tournament_id: targetTid,
        tournamentId: targetTid,
        serialNo: sNo,
        displayRegistrationNumber: sNo,
        registrationId: regId,
        regNo: regId,
        name: fullName,
        fatherName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${ln}`,
        phone: phone,
        mobile: phone,
        category: category,
        role: category,
        playingType: category,
        battingStyle: battingStyles[Math.floor(Math.random() * battingStyles.length)],
        bowlingStyle: bowlingStyles[Math.floor(Math.random() * bowlingStyles.length)],
        village: village,
        district: 'Paschim Medinipur',
        state: 'West Bengal',
        age: 18 + Math.floor(Math.random() * 16),
        dob: `${1995 + Math.floor(Math.random() * 12)}-0${1 + Math.floor(Math.random() * 9)}-15`,
        basePrice: 300,
        registrationStatus: 'APPROVED',
        paymentStatus: 'APPROVED',
        paymentRef: `UPI-TEST-${Math.floor(100000 + Math.random() * 900000)}`,
        photoUrl: photoUrl,
        player_photo_url: photoUrl,
        auctionStatus: 'PENDING',
        isSold: false,
        isUnsold: false,
        created_at: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 5)).toISOString()
      };

      existingPlayers.push(pData);
      addedCount++;
    }

    localStorage.setItem('cpl_players_v8', JSON.stringify(existingPlayers));
    store.notify('players_updated');
    alert(`🎉 Success! Generated ${addedCount} registered players with photos and auto-indexed serial numbers (#${startSerial} to #${startSerial + addedCount - 1}).`);
    renderAdminDashboard(containerEl);
  });

  // Run Mock Auction & Draft Players into Squads
  document.getElementById('admin-seed-mock-auction-btn')?.addEventListener('click', () => {
    const allTeams = store.getTeams();
    if (allTeams.length === 0) {
      alert("⚠️ No teams found! Please create or import teams first before running mock auction.");
      return;
    }

    const allPlayers = store.getPlayers();
    const availablePlayers = allPlayers.filter(p => !p.teamId);

    if (availablePlayers.length === 0) {
      alert("⚠️ All players are already allocated to teams.");
      return;
    }

    if (!confirm(`🔨 Mock Auction Simulation:\n\nDraft available players across all ${allTeams.length} franchise teams with realistic bid prices (₹300 - ₹2,500) and update team remaining purse balances?`)) {
      return;
    }

    let draftedCount = 0;
    const teamBudgets = {};
    allTeams.forEach(t => {
      teamBudgets[t.id] = Number(t.purseBudget || t.purse || 8000);
      t.purseSpent = 0;
    });

    availablePlayers.forEach((p, idx) => {
      // Pick team cyclically or randomly
      const targetTeam = allTeams[idx % allTeams.length];
      const remaining = teamBudgets[targetTeam.id];

      // Stop drafting if team purse is low or squad is full
      if (remaining > 500 && Math.random() > 0.08) {
        const bidPrice = Math.min(remaining - 200, 300 + Math.floor(Math.random() * 18) * 100);
        p.teamId = targetTeam.id;
        p.teamName = targetTeam.name;
        p.soldPrice = bidPrice;
        p.auctionStatus = 'SOLD';
        p.isSold = true;
        p.isUnsold = false;

        teamBudgets[targetTeam.id] -= bidPrice;
        targetTeam.purseSpent = (targetTeam.purseSpent || 0) + bidPrice;
        targetTeam.remainingPurse = teamBudgets[targetTeam.id];
        draftedCount++;
      } else {
        p.auctionStatus = 'UNSOLD';
        p.isUnsold = true;
      }
    });

    localStorage.setItem('cpl_players_v8', JSON.stringify(allPlayers));
    localStorage.setItem('cpl_teams_v8', JSON.stringify(allTeams));
    store.notify('players_updated');
    store.notify('teams_updated');
    alert(`🏆 Mock Auction Complete!\n\nDrafted ${draftedCount} players across ${allTeams.length} teams. Squad rosters and team purses updated!`);
    renderAdminDashboard(containerEl);
  });

  // Export & Action Listeners
  document.getElementById('export-master-csv-btn')?.addEventListener('click', () => exportPlayersToCSV(store.getPlayers()));
  document.getElementById('export-master-pdf-btn')?.addEventListener('click', () => openPDFExportFilterModal());
  document.getElementById('export-team-squads-pdf-btn')?.addEventListener('click', () => openTeamFinalSquadPDFModal());
  document.getElementById('download-all-teams-squad-pdf-btn')?.addEventListener('click', () => exportAllTeamsFinalSquadsToPDF(store.getTeams(), store.getPlayers()));
  document.getElementById('export-teams-csv-btn')?.addEventListener('click', () => exportTeamsToCSV(store.getTeams()));
  document.getElementById('auction-tab-download-all-pdf-btn')?.addEventListener('click', () => exportAllTeamsFinalSquadsToPDF(store.getTeams(), store.getPlayers()));
  document.getElementById('admin-sync-permanent-archive-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('admin-sync-permanent-archive-btn');
    if (btn) btn.innerHTML = '<span>⏳ Syncing...</span>';
    try {
      await store.commitAndSyncAuctionPermanentArchive();
      alert("✅ Final Auction Record Vault Synced!\n\nAll team squads, player bids, icon fees, and financial balances have been permanently locked and archived in Supabase Cloud and Local Storage.");
    } catch(e) {
      alert("Archive sync notice: " + (e.message || e));
    }
    if (btn) btn.innerHTML = '<i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i> Vault Synced';
  });

  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    store.logoutAdmin();
    renderAdminDashboard(containerEl);
  });

  document.getElementById('purge-verified-docs-btn')?.addEventListener('click', () => {
    if (confirm("🧹 Clean Storage: Delete Aadhaar & Payment Receipts for all Verified/Approved players to save cloud memory?\n\n(Player Photos, Reg IDs, and Profiles will remain 100% SAFE for future leagues).")) {
      const purgedCount = store.purgeAllVerifiedDocs();
      alert(`✅ Memory Cleaned! Successfully purged document proofs for ${purgedCount} approved player(s). Player photos and profiles are preserved.`);
      renderAdminDashboard(containerEl);
    }
  });

  // Realtime Search Listener for Admin Players Table
  const adminSearchInput = document.getElementById('admin-player-search');
  if (adminSearchInput) {
    const filterAdminPlayers = () => {
      const query = adminSearchInput.value.toLowerCase().trim();
      const cleanQPhone = query.replace(/[^0-9]/g, '');
      const allP = store.getPlayers();
      const filtered = query ? allP.filter(p => {
        const pCleanPhone = (p.phone || p.mobile || '').replace(/[^0-9]/g, '');
        return (p.name || '').toLowerCase().includes(query) ||
               (p.registrationId || p.regNo || '').toLowerCase().includes(query) ||
               String(p.displayRegistrationNumber || p.serialNo || '').includes(query) ||
               (p.fatherName || '').toLowerCase().includes(query) ||
               (p.phone || p.mobile || '').toLowerCase().includes(query) ||
               (cleanQPhone && pCleanPhone.includes(cleanQPhone)) ||
               (p.category || p.playingType || '').toLowerCase().includes(query) ||
               (p.village || p.district || '').toLowerCase().includes(query) ||
               (p.paymentRef || p.remarks || '').toLowerCase().includes(query);
      }) : allP;

      const tbody = document.getElementById('admin-all-players-table-body');
      if (tbody) tbody.innerHTML = renderAdminPlayersRows(filtered);
    };

    ['input', 'keyup', 'change', 'paste'].forEach(evt => {
      adminSearchInput.addEventListener(evt, filterAdminPlayers);
    });
  }

  // --- TEAM SQUAD PDF DOWNLOAD LISTENERS ---
  containerEl.querySelectorAll('.download-team-squad-pdf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-download-team-squad-pdf-id');
      const team = store.getTeamById(teamId);
      if (team) {
        exportTeamFinalSquadToPDF(team, store.getPlayers());
      } else {
        alert("Team not found!");
      }
    });
  });

  // --- TEAM EDIT & DELETE LISTENERS ---
  containerEl.querySelectorAll('.edit-team-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-edit-team-id');
      const team = store.getTeamById(teamId);
      if (team) {
        openEditTeamModal(team, () => renderAdminDashboard(containerEl));
      } else {
        alert("Team not found!");
      }
    });
  });

  containerEl.querySelectorAll('.delete-team-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-delete-team-id');
      const team = store.getTeamById(teamId);
      if (team && confirm(`Are you sure you want to delete "${team.name}"?`)) {
        store.deleteTeam(teamId);
        alert(`Team "${team.name}" deleted successfully!`);
        renderAdminDashboard(containerEl);
      }
    });
  });

  // Action Listeners on Tables
  document.getElementById('admin-create-new-tourney-btn')?.addEventListener('click', () => {
    if (window.openTournamentCreationWizard) {
      window.openTournamentCreationWizard(false);
    }
  });

  bindAdminTableActions(containerEl);
}

function renderAdminPlayersRows(playersList) {
  const isMaster = store.isMasterAdmin();
  if (playersList.length === 0) {
    return `<tr><td colspan="7" class="py-8 text-center text-xs text-slate-500 font-medium">No players found</td></tr>`;
  }

  return playersList.map(p => {
    const isApproved = (p.registrationStatus || p.paymentStatus) === 'APPROVED';
    const isRejected = (p.registrationStatus || p.paymentStatus) === 'REJECTED';
    const statusBadge = `<span class="px-2 py-0.5 text-[9px] font-black rounded-full border ${isApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : isRejected ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300'}">${isApproved ? '🟢 APPROVED' : isRejected ? '⚪ REJECTED' : '🔴 PENDING'}</span>`;

    const actionBtns = `${isApproved ? `<button data-whatsapp-notify-id="${p.id}" title="Send Official Approval on WhatsApp" class="whatsapp-notify-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"><span>💬 WhatsApp</span></button>` : ''}${p.aadharPhotoUrl || p.paymentReceiptUrl ? `<button data-purge-docs-id="${p.id}" title="Purge Docs" class="purge-player-docs-btn px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[9px] rounded-lg border border-amber-300 shadow-2xs">🧹 Purge</button>` : p.docsPurged ? `<span class="text-[9px] text-emerald-700 font-bold">✅ Purged</span>` : ''}${isRejected ? `<button data-approve-id="${p.id}" class="approve-player-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] rounded-lg shadow-2xs">Approve</button><button data-restore-id="${p.id}" class="restore-player-btn px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white font-black text-[9px] rounded-lg shadow-2xs">Reset</button>` : !isApproved ? `<button data-approve-id="${p.id}" class="approve-player-btn px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] rounded-lg shadow-2xs">Approve</button><button data-reject-id="${p.id}" class="reject-player-btn px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-[9px] rounded-lg border border-rose-300 shadow-2xs">Reject</button>` : `<button data-restore-id="${p.id}" class="restore-player-btn px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[9px] rounded-lg border border-amber-300 shadow-2xs">Reset</button>`}${isMaster ? `<button data-edit-id="${p.id}" class="edit-player-btn p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300"><i data-lucide="edit-2" class="w-3.5 h-3.5 pointer-events-none"></i></button><button data-delete-id="${p.id}" class="delete-player-btn p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-300"><i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i></button>` : ''}`;

    return `
      <!-- MOBILE CARD (visible below sm) -->
      <tr class="sm:hidden">
        <td colspan="7" class="p-0">
          <div class="p-3 border-b border-slate-100 space-y-2">
            <div class="flex items-center gap-2.5">
              <img src="${getOptimizedImageUrl(p.photoUrl || p.player_photo_url, 80, 80)}" loading="lazy" decoding="async" class="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs" onerror="this.src='assets/card_jsl_user.png'"/>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <span class="font-bold text-slate-900 text-xs truncate">${p.name}</span>
                  ${statusBadge}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[8px] font-black rounded border border-slate-200">${p.registrationId || p.regNo || 'REG-0001'} (#${p.displayRegistrationNumber || p.serialNo})</span>
                  <span class="text-[9px] text-indigo-700 font-bold">${p.category || p.playingType || 'All Rounder'}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between text-[9px] text-slate-500">
              <span>📞 ${p.phone || 'N/A'} • Age: ${p.age || 24}</span>
              <span>📍 ${p.village || ''}, ${p.district || ''}</span>
            </div>
            <div class="flex items-center gap-1 flex-wrap">${actionBtns}</div>
          </div>
        </td>
      </tr>
      <!-- DESKTOP ROW (visible sm+) -->
      <tr class="hidden sm:table-row hover:bg-slate-50 transition-colors">
        <td class="py-3 px-3">
          <span class="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-mono text-[9px] font-black rounded border border-slate-300">
            ${p.registrationId || p.regNo || 'REG-0001'} (#${p.displayRegistrationNumber || p.serialNo})
          </span>
        </td>
        <td class="py-3 px-3 font-bold text-slate-900 text-xs">
          <div class="flex items-center gap-2">
            <img src="${getOptimizedImageUrl(p.photoUrl || p.player_photo_url, 80, 80)}" loading="lazy" decoding="async" class="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs" onerror="this.src='assets/card_jsl_user.png'"/>
            <div>
              <div class="font-bold text-slate-900">${p.name}</div>
              <div class="text-[9px] text-slate-500 font-normal">Age: ${p.age || 24} Yrs</div>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 text-xs">
          <div class="text-slate-800 font-semibold">Father: ${p.fatherName || 'N/A'}</div>
          <div class="text-[9px] text-slate-500">📍 ${p.village || ''}, ${p.district || 'Paschim Medinipur'}</div>
        </td>
        <td class="py-3 px-3 text-xs">
          <div class="font-bold text-indigo-700 text-[10px]">${p.category || p.playingType || 'All Rounder'}</div>
          <div class="text-[9px] text-slate-500">${p.battingStyle || 'Right Hand Bat'}</div>
        </td>
        <td class="py-3 px-3 font-mono text-xs text-slate-700 font-bold">📞 ${p.phone || 'N/A'}</td>
        <td class="py-3 px-3 font-mono font-bold text-xs">${statusBadge}</td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-1">${actionBtns}</div>
        </td>
      </tr>
    `;
  }).join('');
}

// --- AUTOMATED WHATSAPP NOTIFICATION ENGINE ---
export function sendWhatsAppPlayerApproval(player) {
  if (!player || !player.phone) {
    alert("Player phone number not found!");
    return;
  }
  const cleanPhone = String(player.phone).replace(/\D/g, '').slice(-10);
  if (cleanPhone.length < 10) {
    alert("Invalid phone number: " + player.phone);
    return;
  }

  const activeTourney = store.getCustomTournaments().find(t => (t.supabaseId || t.id) === store.activeTournamentId) || {};
  const tName = activeTourney.name || 'Tournament';
  const tVenue = activeTourney.venue || '';
  const tDate = activeTourney.kickoffDate || '';
  const messageText =
`🎉 *${tName.toUpperCase()}* 🎉

নমস্কার *${player.name}*,
আপনার টুর্নামেন্টের প্লেয়ার রেজিস্ট্রেশন সফলভাবে *APPROVED* (অনুমোদিত) হয়েছে! ✅

🆔 *Registration ID:* ${player.registrationId || player.regNo || 'REG-0001'}
🏏 *Category:* ${player.category || 'All Rounder'}
📍 *Location:* ${player.village || ''}, ${player.district || ''}
💰 *Base Price:* ₹${player.basePrice || 300}
${tDate ? `\n🏆 *Tournament Starts:* ${tDate}` : ''}
${tVenue ? `📍 *Venue:* ${tVenue}` : ''}

🌐 *Live Portal:* ${window.location.origin}${window.location.pathname}#t/${activeTourney.slug || ''}

ধন্যবাদ ও শুভকামনা,
*${tName} Management Committee*`;

  const encodedMsg = encodeURIComponent(messageText);
  const waUrl = `https://wa.me/91${cleanPhone}?text=${encodedMsg}`;
  window.open(waUrl, '_blank');
}

function bindAdminTableActions(containerEl) {
  // Event Delegation so Delete, Edit, Approve, Reject, Restore & WhatsApp buttons work 100% reliably
  containerEl.onclick = async (e) => {
    // 0. WhatsApp Notify
    const waBtn = e.target.closest('.whatsapp-notify-btn');
    if (waBtn) {
      const pId = waBtn.getAttribute('data-whatsapp-notify-id');
      const p = store.getPlayerById(pId);
      if (p) sendWhatsAppPlayerApproval(p);
      return;
    }

    // 1. Delete Player
    const deleteBtn = e.target.closest('.delete-player-btn');
    if (deleteBtn) {
      const pId = deleteBtn.getAttribute('data-delete-id');
      if (pId && confirm("⚠️ Are you sure you want to delete this player registration? Remaining numbers will re-index continuously.")) {
        await store.deletePlayer(pId);
        renderAdminDashboard(containerEl);
      }
      return;
    }

    // 2. Approve Player
    const approveBtn = e.target.closest('.approve-player-btn');
    if (approveBtn) {
      const pId = approveBtn.getAttribute('data-approve-id');
      if (pId) {
        store.updatePlayerStatus(pId, 'APPROVED', 'APPROVED');
        renderAdminDashboard(containerEl);
      }
      return;
    }

    // 3. Reject Player
    const rejectBtn = e.target.closest('.reject-player-btn');
    if (rejectBtn) {
      const pId = rejectBtn.getAttribute('data-reject-id');
      if (pId) {
        store.updatePlayerStatus(pId, 'REJECTED', 'REJECTED');
        renderAdminDashboard(containerEl);
      }
      return;
    }

    // 4. Restore / Reset Player Status to Pending
    const restoreBtn = e.target.closest('.restore-player-btn');
    if (restoreBtn) {
      const pId = restoreBtn.getAttribute('data-restore-id');
      if (pId) {
        store.updatePlayerStatus(pId, 'PENDING', 'PENDING');
        renderAdminDashboard(containerEl);
      }
      return;
    }

    // 5. Purge Player Heavy Document Proofs (Aadhaar & Payment Receipt)
    const purgeDocsBtn = e.target.closest('.purge-player-docs-btn');
    if (purgeDocsBtn) {
      const pId = purgeDocsBtn.getAttribute('data-purge-docs-id');
      if (pId && confirm("🧹 Clean Memory: Delete Aadhaar & Payment receipt screenshots for this player?\n\n(Player Photo & profile will remain 100% preserved for future leagues).")) {
        store.purgePlayerSensitiveDocs(pId);
        renderAdminDashboard(containerEl);
      }
      return;
    }

    // 4. Edit Player
    const editBtn = e.target.closest('.edit-player-btn');
    if (editBtn) {
      const pId = editBtn.getAttribute('data-edit-id');
      if (pId) {
        const player = store.getPlayerById(pId);
        openAdminEditPlayerModal(player, containerEl);
      }
      return;
    }

    // 5. Delete Team
    const deleteTeamBtn = e.target.closest('.delete-team-btn');
    if (deleteTeamBtn) {
      const tId = deleteTeamBtn.getAttribute('data-delete-team-id');
      if (tId && confirm("⚠️ Are you sure you want to delete this team?")) {
        store.deleteTeam(tId);
        renderAdminDashboard(containerEl);
      }
      return;
    }
  };

  // Search filter in Admin Table
  const adminSearchInput = document.getElementById('admin-player-search');
  if (adminSearchInput) {
    const filterAdminPlayers = () => {
      const query = adminSearchInput.value.toLowerCase().trim();
      const allP = store.getPlayers();
      const filtered = query ? allP.filter(p => 
        (p.name || '').toLowerCase().includes(query) ||
        (p.registrationId || p.regNo || '').toLowerCase().includes(query) ||
        String(p.displayRegistrationNumber || p.serialNo || '').includes(query) ||
        (p.fatherName || '').toLowerCase().includes(query) ||
        (p.phone || '').toLowerCase().includes(query) ||
        (p.category || p.playingType || '').toLowerCase().includes(query) ||
        (p.village || p.district || '').toLowerCase().includes(query)
      ) : allP;

      const tbody = document.getElementById('admin-all-players-table-body');
      if (tbody) tbody.innerHTML = renderAdminPlayersRows(filtered);
      if (window.lucide) window.lucide.createIcons();
    };

    ['input', 'keyup', 'change', 'paste'].forEach(evt => {
      adminSearchInput.addEventListener(evt, filterAdminPlayers);
    });
  }

  // --- AUTOMATIC ACTIVE TAB RENDERING ON DASHBOARD LOAD ---
  if (activeAdminTab === 'auction') {
    renderActiveAuctionBlock();
  } else if (activeAdminTab === 'fixtures') {
    renderAdminGroupArena();
    renderAdminFixturesList();
  } else if (activeAdminTab === 'scorer') {
    renderScorerMatchesList();
  } else if (activeAdminTab === 'shop-ads') {
    renderAdminShopAdsPanel();
  } else if (activeAdminTab === 'saas-tournaments') {
    renderAdminSaasTournamentsPanel();
  }

  // Realtime custom tournaments update listener
  const listenTourneyUpdates = store.on ? store.on.bind(store) : (store.subscribe ? store.subscribe.bind(store) : null);
  if (listenTourneyUpdates) {
    listenTourneyUpdates('custom_tournaments_updated', () => {
      if (activeAdminTab === 'saas-tournaments') {
        renderAdminSaasTournamentsPanel();
      }
      const selector = document.getElementById('admin-tournament-selector');
      if (selector && store.getAllAvailableTournaments) {
        const allTourneys = store.getAllAvailableTournaments();
        selector.innerHTML = allTourneys.map(t => `<option value="${t.id}" ${t.id === store.activeTournamentId ? 'selected' : ''} class="bg-slate-900 text-white">${t.name}</option>`).join('');
      }
    });
  }
}

// --- ADMIN & TOURNAMENT OWNER LOGIN SCREEN ---
function renderAdminLoginScreen(containerEl) {
  containerEl.innerHTML = `
    <div class="max-w-md mx-auto my-8 p-6 bg-white border-2 border-emerald-500/30 rounded-3xl shadow-lg space-y-4 animate-fade-in text-center relative">
      
      <!-- TOP RIGHT 'X' CROSS BUTTON FOR BACK / CLOSE -->
      <button id="close-admin-login-btn" class="absolute top-3.5 right-3.5 text-slate-500 hover:text-slate-900 p-1.5 rounded-xl bg-slate-100 border border-slate-300 transition-colors shadow-2xs">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>

      <div class="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto text-white font-black text-2xl shadow-xs">
        🔐
      </div>

      <div>
        <h2 class="text-xl font-black text-slate-900">Tournament & Admin Portal</h2>
        <p class="text-xs text-slate-500 mt-0.5">Super Admin Email OR Tournament Owner Mobile Number</p>
      </div>

      <form id="admin-login-form" class="space-y-3 text-left">
        <div>
          <label class="block text-[10px] font-black text-slate-700 uppercase mb-1">Email ID OR 10-Digit Mobile Number *</label>
          <input type="text" id="admin-identifier" required placeholder="e.g. admin@example.com OR 9876543210" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500 font-mono" />
        </div>

        <div>
          <label class="block text-[10px] font-black text-slate-700 uppercase mb-1">Password *</label>
          <input type="password" id="admin-password" required placeholder="Enter Password" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500 font-mono" />
        </div>

        <button type="submit" class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer">
          Unlock Tournament Control Dashboard
        </button>
      </form>

      <div class="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
        Default password for registered players is their 10-digit mobile number.
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('close-admin-login-btn')?.addEventListener('click', () => {
    window.location.hash = 'landing';
    window.dispatchEvent(new CustomEvent('popstate'));
  });

  document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('admin-identifier').value.trim();
    const pass = document.getElementById('admin-password').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Verifying Credentials...';
    }

    try {
      // 1. Try unified authentication (Supabase Auth + fallback)
      const res = await store.authenticateAdmin(identifier, pass);
      if (res.success) {
        renderAdminDashboard(containerEl);
        return;
      }

      // 2. Try regular user auth for player profiles
      const userRes = await store.authenticateUser(identifier, pass);
      if (userRes.success) {
        if (userRes.user.role === 'TOURNAMENT_OWNER' || userRes.user.role === 'SUPER_ADMIN') {
          renderAdminDashboard(containerEl);
        } else {
          alert(`Logged in as player "${userRes.user.name}". Navigating to your Player Profile.`);
          window.location.hash = 'profile';
          window.dispatchEvent(new CustomEvent('popstate'));
        }
        return;
      }

      alert(res.message || "Invalid Credentials. Please check your Email / Phone and Password.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Unlock Tournament Control Dashboard';
      }
    }
  });
}

// --- ADMIN EDIT PLAYER MODAL (COMPLETE FIELDS & STYLISH WHITE BACKGROUND) ---
function openAdminEditPlayerModal(player, containerEl) {
  if (!player) return;

  document.getElementById('admin-edit-player-modal')?.remove();

  const teams = store.getTeams() || [];
  const currentCategory = player.category || player.playingType || player.role || 'All-rounder';
  const currentBatting = player.battingStyle || 'Right Hand Bat';
  const currentBowling = player.bowlingStyle || 'Right Hand Fast';
  const currentStatus = (player.registrationStatus || player.paymentStatus || 'PENDING').toUpperCase();

  const modalHtml = `
    <div id="admin-edit-player-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div class="relative w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl border-2 border-emerald-500/30 p-4 sm:p-6 max-h-[92vh] overflow-y-auto modal-content-container space-y-4">
        
        <!-- Header -->
        <div class="flex justify-between items-center pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-base shadow-xs">
              🏏
            </span>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-md border border-emerald-300 uppercase tracking-wider">MASTER ADMIN EDIT</span>
                <span class="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[9px] font-black rounded-md border border-slate-300">#${player.displayRegistrationNumber || player.serialNo || 'N/A'}</span>
              </div>
              <h2 class="text-base sm:text-lg font-black text-slate-900 mt-0.5">Edit Player: ${player.name}</h2>
            </div>
          </div>
          <button id="close-edit-player-modal" class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer" title="Close">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- 1. HD DOCUMENT VERIFICATION PREVIEWS (ZOOMABLE) -->
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <span>🔍</span> HD Document Verification Proofs
            </span>
            <span class="text-[9px] text-slate-500 font-bold">Click any photo to Zoom HD</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            
            <!-- 1. PLAYER PHOTO -->
            <div class="space-y-1">
              <span class="text-[9px] font-bold text-slate-600 block uppercase">Player Photo</span>
              <img src="${player.photoUrl || player.player_photo_url || 'assets/card_jsl_user.png'}" class="doc-zoomable-img w-full h-20 rounded-xl object-cover border-2 border-emerald-300 hover:border-emerald-500 shadow-2xs cursor-pointer transition-all bg-white" title="Click to view full HD player photo" data-zoom-title="${player.name} - Player Photo" onerror="this.onerror=null; this.src='assets/card_jsl_user.png';" />
              <span class="text-[9px] text-emerald-700 block font-bold cursor-pointer hover:underline">🔍 Zoom Photo</span>
            </div>

            <!-- 2. ID CARD FRONT -->
            <div class="space-y-1">
              <span class="text-[9px] font-bold text-slate-600 block uppercase truncate">${player.docType || 'ID'} Front</span>
              <div id="admin-preview-id-front-wrap" class="relative">
                <img id="admin-preview-id-front-img" src="${player.idCardFrontUrl || player.id_card_front_url || player.aadharPhotoUrl || player.aadhaar_url || 'assets/jsl_logo.jpg'}" class="doc-zoomable-img w-full h-20 rounded-xl object-cover border-2 border-sky-300 hover:border-sky-500 shadow-2xs cursor-pointer transition-all bg-white ${!(player.idCardFrontUrl || player.id_card_front_url || player.aadharPhotoUrl || player.aadhaar_url) ? 'hidden' : ''}" title="Click to view ID Card Front" data-zoom-title="${player.name} - ID Card Front (${player.docType || 'Identity Card'})" onerror="this.src='assets/jsl_logo.jpg'" />
                <div id="admin-no-id-front-placeholder" class="h-20 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-bold ${(player.idCardFrontUrl || player.id_card_front_url || player.aadharPhotoUrl || player.aadhaar_url) ? 'hidden' : ''}">No ID Front</div>
              </div>
              <label class="text-[9px] text-sky-700 block font-bold cursor-pointer hover:underline">
                <span>📁 Upload Front</span>
                <input type="file" id="admin-edit-id-front-input" accept="image/*" class="hidden" />
              </label>
            </div>

            <!-- 3. ID CARD BACK -->
            <div class="space-y-1">
              <span class="text-[9px] font-bold text-slate-600 block uppercase truncate">${player.docType || 'ID'} Back</span>
              <div id="admin-preview-id-back-wrap" class="relative">
                <img id="admin-preview-id-back-img" src="${player.idCardBackUrl || player.id_card_back_url || player.aadharBackUrl || 'assets/jsl_logo.jpg'}" class="doc-zoomable-img w-full h-20 rounded-xl object-cover border-2 border-sky-300 hover:border-sky-500 shadow-2xs cursor-pointer transition-all bg-white ${!(player.idCardBackUrl || player.id_card_back_url || player.aadharBackUrl) ? 'hidden' : ''}" title="Click to view ID Card Back" data-zoom-title="${player.name} - ID Card Back (${player.docType || 'Identity Card'})" onerror="this.src='assets/jsl_logo.jpg'" />
                <div id="admin-no-id-back-placeholder" class="h-20 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-bold ${(player.idCardBackUrl || player.id_card_back_url || player.aadharBackUrl) ? 'hidden' : ''}">No ID Back</div>
              </div>
              <label class="text-[9px] text-sky-700 block font-bold cursor-pointer hover:underline">
                <span>📁 Upload Back</span>
                <input type="file" id="admin-edit-id-back-input" accept="image/*" class="hidden" />
              </label>
            </div>

            <!-- 4. PAYMENT RECEIPT -->
            <div class="space-y-1">
              <span class="text-[9px] font-bold text-slate-600 block uppercase">Payment Receipt</span>
              <div id="admin-preview-receipt-wrap" class="relative">
                <img id="admin-preview-receipt-img" src="${player.paymentReceiptUrl || player.paymentProofUrl || player.payment_screenshot_url || 'assets/jsl_logo.jpg'}" class="doc-zoomable-img w-full h-20 rounded-xl object-cover border-2 border-amber-300 hover:border-amber-500 shadow-2xs cursor-pointer transition-all bg-white ${!(player.paymentReceiptUrl || player.paymentProofUrl || player.payment_screenshot_url) ? 'hidden' : ''}" title="Click to view full HD payment receipt" data-zoom-title="${player.name} - Payment Receipt" onerror="this.src='assets/jsl_logo.jpg'" />
                <div id="admin-no-receipt-placeholder" class="h-20 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-bold ${(player.paymentReceiptUrl || player.paymentProofUrl || player.payment_screenshot_url) ? 'hidden' : ''}">No Receipt</div>
              </div>
              <label class="text-[9px] text-amber-700 block font-bold cursor-pointer hover:underline">
                <span>📁 Upload Receipt</span>
                <input type="file" id="admin-edit-receipt-input" accept="image/*" class="hidden" />
              </label>
            </div>

          </div>
        </div>

        <!-- 2. ADMIN PHOTO REPLACEMENT & CROP CONTROLS (SQUARE 1:1) -->
        <div class="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200 space-y-2">
          <div class="flex items-center justify-between">
            <label class="block text-[10px] font-black text-emerald-900 uppercase">Admin Photo Control (Square 1:1)</label>
            <span class="text-[9px] text-emerald-700 font-bold">Replace or Re-crop</span>
          </div>

          <div class="flex items-center gap-3">
            <img id="admin-edit-photo-preview" src="${player.photoUrl || player.player_photo_url || 'assets/card_jsl_user.png'}" class="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs bg-white shrink-0" onerror="this.onerror=null; this.src='assets/card_jsl_user.png';" />
            
            <div class="flex items-center gap-1.5 flex-1 flex-wrap">
              <label class="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-[10px] rounded-xl border border-slate-300 cursor-pointer flex items-center gap-1 shadow-2xs transition-all">
                <i data-lucide="image" class="w-3.5 h-3.5 text-emerald-600"></i> Gallery
                <input type="file" id="admin-photo-gallery-input" accept="image/*" class="hidden" />
              </label>
              <label class="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-[10px] rounded-xl border border-slate-300 cursor-pointer flex items-center gap-1 shadow-2xs transition-all">
                <i data-lucide="camera" class="w-3.5 h-3.5 text-amber-600"></i> Camera
                <input type="file" id="admin-photo-camera-input" accept="image/*" capture="user" class="hidden" />
              </label>
              <button type="button" id="admin-crop-photo-btn" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] rounded-xl border border-amber-400 flex items-center gap-1 shadow-2xs cursor-pointer transition-all">
                <i data-lucide="crop" class="w-3.5 h-3.5"></i> Crop 1:1
              </button>
            </div>
          </div>
        </div>

        <!-- 3. COMPREHENSIVE FORM (EXACT REGISTRATION FIELDS) -->
        <form id="admin-edit-player-form" class="space-y-3.5 text-xs">

          <!-- Section A: Personal & Contact Information -->
          <div class="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
            <span class="text-[10px] font-black text-slate-800 uppercase tracking-wider block flex items-center gap-1">
              <span>👤</span> Personal & Contact Details
            </span>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Player Name *</label>
                <input type="text" id="edit-ply-name" value="${player.name || ''}" required class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none shadow-2xs" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Phone Number *</label>
                <input type="tel" id="edit-ply-phone" value="${player.phone || player.mobile || ''}" required class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-mono font-bold rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none shadow-2xs" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Father's Name</label>
                <input type="text" id="edit-ply-father-name" value="${player.fatherName || player.father_name || ''}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none shadow-2xs" placeholder="Father / Guardian Name" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">DOB</label>
                  <input type="date" id="edit-ply-dob" value="${player.dob || ''}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none shadow-2xs" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Age</label>
                  <input type="text" id="edit-ply-age" value="${player.age || ''}" class="w-full bg-slate-100 border border-slate-300 text-slate-900 text-xs font-mono font-bold rounded-xl p-2.5 focus:outline-none shadow-2xs" placeholder="Age" />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Village / Town *</label>
                <input type="text" id="edit-ply-village" value="${player.village || player.address || ''}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none shadow-2xs" placeholder="Village / Area" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">District</label>
                <input type="text" id="edit-ply-district" value="${player.district || 'Paschim Medinipur'}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none shadow-2xs" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">State</label>
                <input type="text" id="edit-ply-state" value="${player.state || 'West Bengal'}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none shadow-2xs" />
              </div>
            </div>
          </div>

          <!-- Section B: Cricket Playing Profile & Styles -->
          <div class="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2.5">
            <span class="text-[10px] font-black text-blue-900 uppercase tracking-wider block flex items-center gap-1">
              <span>⚡</span> Cricket Profile & Playing Styles
            </span>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Playing Category / Role *</label>
                <select id="edit-ply-category" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:border-blue-500 focus:outline-none shadow-2xs">
                  <option value="All-Rounder" ${currentCategory.toLowerCase().includes('all') ? 'selected' : ''}>All-Rounder</option>
                  <option value="Batsman" ${currentCategory.toLowerCase() === 'batsman' ? 'selected' : ''}>Batsman</option>
                  <option value="Bowler" ${currentCategory.toLowerCase() === 'bowler' ? 'selected' : ''}>Bowler</option>
                  <option value="Wicket Keeper" ${currentCategory.toLowerCase().includes('keeper') ? 'selected' : ''}>Wicket Keeper</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Batting Style</label>
                <select id="edit-ply-batting" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:border-blue-500 focus:outline-none shadow-2xs">
                  <option value="Right Hand Bat" ${currentBatting.includes('Right') ? 'selected' : ''}>Right Hand Bat</option>
                  <option value="Left Hand Bat" ${currentBatting.includes('Left') ? 'selected' : ''}>Left Hand Bat</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Bowling Style</label>
                <select id="edit-ply-bowling" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:border-blue-500 focus:outline-none shadow-2xs">
                  <option value="Right Hand Medium" ${currentBowling.includes('Medium') ? 'selected' : ''}>Right Hand Medium</option>
                  <option value="Right Hand Fast" ${currentBowling.includes('Fast') && currentBowling.includes('Right') ? 'selected' : ''}>Right Hand Fast</option>
                  <option value="Right Hand Spin" ${currentBowling.includes('Spin') && currentBowling.includes('Right') ? 'selected' : ''}>Right Hand Spin</option>
                  <option value="Left Hand Fast" ${currentBowling.includes('Fast') && currentBowling.includes('Left') ? 'selected' : ''}>Left Hand Fast</option>
                  <option value="Left Hand Spin" ${currentBowling.includes('Spin') && currentBowling.includes('Left') ? 'selected' : ''}>Left Hand Spin</option>
                  <option value="None / Part-Time" ${currentBowling.includes('None') || currentBowling.includes('Part') ? 'selected' : ''}>None / Part-Time</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Base Price (INR ₹)</label>
                <input type="number" id="edit-ply-base-price" value="${player.basePrice || 300}" min="100" step="50" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold font-mono rounded-xl p-2.5 focus:border-blue-500 focus:outline-none shadow-2xs" />
              </div>
            </div>
          </div>

          <!-- Section C: Payment Verification & Registration Status -->
          <div class="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2.5">
            <span class="text-[10px] font-black text-amber-900 uppercase tracking-wider block flex items-center gap-1">
              <span>💳</span> Payment Verification & Registration Status
            </span>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Registration & Payment Status</label>
                <select id="edit-ply-status" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:border-amber-500 focus:outline-none shadow-2xs">
                  <option value="APPROVED" ${currentStatus === 'APPROVED' ? 'selected' : ''}>APPROVED (🟢 Green)</option>
                  <option value="PENDING" ${currentStatus === 'PENDING' ? 'selected' : ''}>PENDING (🔴 Red)</option>
                  <option value="REJECTED" ${currentStatus === 'REJECTED' ? 'selected' : ''}>REJECTED (⚪ Gray)</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">UPI Reference / UTR / Txn ID</label>
                <input type="text" id="edit-ply-upiref" value="${player.paymentRef || player.remarks || player.payment_ref || ''}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-mono font-bold rounded-xl p-2.5 focus:border-amber-500 focus:outline-none shadow-2xs" placeholder="e.g. UPI_211492297161" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Serial Number (#)</label>
                <input type="number" id="edit-ply-serial" value="${player.displayRegistrationNumber || player.serialNo || 1}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-mono font-bold rounded-xl p-2.5 focus:border-amber-500 focus:outline-none shadow-2xs" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Registration ID</label>
                <input type="text" id="edit-ply-reg-id" value="${player.registrationId || player.regNo || 'REG-0001'}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs font-mono font-bold rounded-xl p-2.5 focus:border-amber-500 focus:outline-none shadow-2xs" />
              </div>
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="flex flex-col sm:flex-row gap-2 pt-1">
            <button type="button" id="modal-quick-approve-btn" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
              <i data-lucide="check-circle" class="w-4 h-4"></i> Approve & Verify
            </button>
            <button type="button" id="modal-quick-reject-btn" class="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
              <i data-lucide="x-circle" class="w-4 h-4"></i> Reject
            </button>
            <button type="submit" id="modal-save-changes-btn" class="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
              <i data-lucide="save" class="w-4 h-4"></i> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const modalContainer = document.getElementById('admin-edit-player-modal');
  modalContainer?.querySelectorAll('.doc-zoomable-img').forEach(img => {
    img.addEventListener('click', (e) => {
      const src = e.currentTarget.getAttribute('src');
      const title = e.currentTarget.getAttribute('data-zoom-title') || 'Document Verification';
      if (src) openFullDocumentViewer(src, title);
    });
  });

  const removeModal = () => document.getElementById('admin-edit-player-modal')?.remove();
  document.getElementById('close-edit-player-modal')?.addEventListener('click', removeModal);

  let updatedPhotoUrl = player.photoUrl || player.player_photo_url || '';
  let updatedIdFrontUrl = player.idCardFrontUrl || player.id_card_front_url || player.aadharPhotoUrl || player.aadhaar_url || '';
  let updatedIdBackUrl = player.idCardBackUrl || player.id_card_back_url || player.aadharBackUrl || '';
  let updatedReceiptUrl = player.paymentReceiptUrl || player.paymentProofUrl || player.payment_screenshot_url || '';

  // Helper for quick image compression
  const compressImage = (file, maxWidth = 900, maxHeight = 900, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (e) => resolve(event.target.result);
      };
      reader.onerror = (e) => reject(e);
    });
  };

  // ID Front Upload Listener
  document.getElementById('admin-edit-id-front-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await compressImage(file, 900, 900, 0.8);
    updatedIdFrontUrl = dataUrl;
    const img = document.getElementById('admin-preview-id-front-img');
    const ph = document.getElementById('admin-no-id-front-placeholder');
    if (img) { img.src = dataUrl; img.classList.remove('hidden'); }
    if (ph) ph.classList.add('hidden');
  });

  // ID Back Upload Listener
  document.getElementById('admin-edit-id-back-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await compressImage(file, 900, 900, 0.8);
    updatedIdBackUrl = dataUrl;
    const img = document.getElementById('admin-preview-id-back-img');
    const ph = document.getElementById('admin-no-id-back-placeholder');
    if (img) { img.src = dataUrl; img.classList.remove('hidden'); }
    if (ph) ph.classList.add('hidden');
  });

  // Receipt Upload Listener
  document.getElementById('admin-edit-receipt-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await compressImage(file, 900, 900, 0.8);
    updatedReceiptUrl = dataUrl;
    const img = document.getElementById('admin-preview-receipt-img');
    const ph = document.getElementById('admin-no-receipt-placeholder');
    if (img) { img.src = dataUrl; img.classList.remove('hidden'); }
    if (ph) ph.classList.add('hidden');
  });

  const processAdminPhotoSelection = (file) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    (window.openSquareImageCropModal || openSquareImageCropModal)(objectUrl, (croppedUrl) => {
      updatedPhotoUrl = croppedUrl;
      const previewImg = document.getElementById('admin-edit-photo-preview');
      if (previewImg) previewImg.src = croppedUrl;
    }, `Crop ${player.name}'s Photo (Square 1:1)`);
  };

  document.getElementById('admin-photo-gallery-input')?.addEventListener('change', (e) => processAdminPhotoSelection(e.target.files[0]));
  document.getElementById('admin-photo-camera-input')?.addEventListener('change', (e) => processAdminPhotoSelection(e.target.files[0]));

  document.getElementById('admin-crop-photo-btn')?.addEventListener('click', () => {
    const currentSrc = updatedPhotoUrl || document.getElementById('admin-edit-photo-preview')?.src;
    if (currentSrc) {
      (window.openSquareImageCropModal || openSquareImageCropModal)(currentSrc, (croppedUrl) => {
        updatedPhotoUrl = croppedUrl;
        const previewImg = document.getElementById('admin-edit-photo-preview');
        if (previewImg) previewImg.src = croppedUrl;
      }, `Re-Crop ${player.name}'s Photo (Square 1:1)`);
    }
  });

  // Real-time auto-age calculation from DOB
  document.getElementById('edit-ply-dob')?.addEventListener('change', (e) => {
    const dobVal = e.target.value;
    if (dobVal) {
      const birthDate = new Date(dobVal);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      const ageInput = document.getElementById('edit-ply-age');
      if (ageInput) ageInput.value = `${calculatedAge} Years`;
    }
  });

  // Quick Approve Button Handler inside Modal
  document.getElementById('modal-quick-approve-btn')?.addEventListener('click', () => {
    const statusSelect = document.getElementById('edit-ply-status');
    if (statusSelect) statusSelect.value = 'APPROVED';
    store.updatePlayerStatus(player.id, 'APPROVED', 'APPROVED', document.getElementById('edit-ply-upiref')?.value || '');
    removeModal();
    renderAdminDashboard(containerEl);
  });

  // Quick Reject Button Handler inside Modal
  document.getElementById('modal-quick-reject-btn')?.addEventListener('click', () => {
    if (confirm(`⚠️ Reject registration for "${player.name}"?`)) {
      const statusSelect = document.getElementById('edit-ply-status');
      if (statusSelect) statusSelect.value = 'REJECTED';
      store.updatePlayerStatus(player.id, 'REJECTED', 'REJECTED', document.getElementById('edit-ply-upiref')?.value || '');
      removeModal();
      renderAdminDashboard(containerEl);
    }
  });

  document.getElementById('admin-edit-player-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('modal-save-changes-btn');
    const originalText = saveBtn ? saveBtn.innerHTML : "Save Changes";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <div class="flex items-center justify-center gap-2">
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Saving...</span>
        </div>
      `;
    }

    try {
      let finalPhotoUrl = updatedPhotoUrl;

      if (updatedPhotoUrl && updatedPhotoUrl.startsWith('data:image')) {
        const timeoutPromise = new Promise(res => setTimeout(() => res(null), 12000));
        const uploadedUrl = await Promise.race([
          uploadHDImage(updatedPhotoUrl, 'player_photos'),
          timeoutPromise
        ]);

        if (uploadedUrl && (uploadedUrl.startsWith('http://') || uploadedUrl.startsWith('https://'))) {
          finalPhotoUrl = uploadedUrl;
        } else {
          finalPhotoUrl = updatedPhotoUrl;
        }
      }

      const newStatus = document.getElementById('edit-ply-status').value;
      const serialNum = parseInt(document.getElementById('edit-ply-serial').value, 10) || player.serialNo || 1;
      const regIdVal = document.getElementById('edit-ply-reg-id').value.trim() || player.registrationId || `REG-${String(serialNum).padStart(4, '0')}`;

      store.updatePlayer({
        id: player.id,
        name: document.getElementById('edit-ply-name').value.trim(),
        phone: document.getElementById('edit-ply-phone').value.trim(),
        mobile: document.getElementById('edit-ply-phone').value.trim(),
        fatherName: document.getElementById('edit-ply-father-name')?.value.trim() || player.fatherName || '',
        dob: document.getElementById('edit-ply-dob')?.value || player.dob || null,
        age: document.getElementById('edit-ply-age')?.value || player.age || '',
        village: document.getElementById('edit-ply-village').value.trim(),
        district: document.getElementById('edit-ply-district').value.trim(),
        state: document.getElementById('edit-ply-state')?.value.trim() || 'West Bengal',
        address: `${document.getElementById('edit-ply-village').value.trim()}, ${document.getElementById('edit-ply-district').value.trim()}`,
        category: document.getElementById('edit-ply-category').value,
        role: document.getElementById('edit-ply-category').value,
        playingType: document.getElementById('edit-ply-category').value,
        battingStyle: document.getElementById('edit-ply-batting').value,
        bowlingStyle: document.getElementById('edit-ply-bowling').value,
        basePrice: parseInt(document.getElementById('edit-ply-base-price').value, 10) || 300,
        paymentStatus: newStatus,
        registrationStatus: newStatus,
        paymentRef: document.getElementById('edit-ply-upiref').value.trim(),
        remarks: document.getElementById('edit-ply-upiref').value.trim(),
        serialNo: serialNum,
        displayRegistrationNumber: serialNum,
        registrationId: regIdVal,
        regNo: regIdVal,
        teamId: player.teamId || null,
        photoUrl: finalPhotoUrl,
        player_photo_url: finalPhotoUrl,
        idCardFrontUrl: updatedIdFrontUrl,
        aadharPhotoUrl: updatedIdFrontUrl,
        idCardBackUrl: updatedIdBackUrl,
        aadharBackUrl: updatedIdBackUrl,
        paymentReceiptUrl: updatedReceiptUrl,
        paymentProofUrl: updatedReceiptUrl
      });

      removeModal();
      renderAdminDashboard(containerEl);
    } catch (err) {
      console.error("Admin player update error:", err);
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
      alert("⚠️ Update error: " + err.message);
    }
  });
}

function openFullDocumentViewer(imgSrc, title = 'Document Proof Viewer') {
  const modalHtml = `
    <div id="full-doc-zoom-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div class="max-w-4xl w-full p-4 sm:p-5 relative space-y-3 animate-fade-in text-center bg-white border-2 border-slate-200 rounded-3xl shadow-2xl">
        <button id="close-doc-zoom-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-900 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
        <div class="text-left border-b border-slate-100 pb-2">
          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[9px] font-black rounded border border-emerald-300 uppercase">HD DOCUMENT VERIFICATION</span>
          <h3 class="text-slate-900 font-black text-base mt-0.5">${title}</h3>
        </div>
        <div class="max-h-[75vh] overflow-auto flex justify-center p-2 bg-slate-50 rounded-2xl border border-slate-200">
          <img src="${imgSrc}" class="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md" />
        </div>
        <button id="close-doc-zoom-bottom-btn" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer">
          Close Verification Viewer
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeZoomModal = () => document.getElementById('full-doc-zoom-modal')?.remove();
  document.getElementById('close-doc-zoom-btn')?.addEventListener('click', removeZoomModal);
  document.getElementById('close-doc-zoom-bottom-btn')?.addEventListener('click', removeZoomModal);
}

// --- MASTER ADMIN CONFIGURATIONS, SCORING & AUCTION ENGINE ---
let activeScoringMatchId = null;
let currentScoringState = null;



function renderAdminGroupArena() {
  const container = document.getElementById('admin-group-breakdown-arena');
  if (!container) return;

  const leagueSelect = document.getElementById('group-mgr-league-select');
  const leagueCode = (leagueSelect ? leagueSelect.value : 'T').toUpperCase();

  const format = store.getTournamentFormat(leagueCode);
  const formatSelect = document.getElementById('group-mgr-format-select');
  if (formatSelect && format.format) {
    formatSelect.value = format.format;
  }

  const knockoutSelect = document.getElementById('group-mgr-knockout-select');
  if (knockoutSelect && format.knockoutType) {
    knockoutSelect.value = format.knockoutType;
  }

  const allTeams = store.getTeams().filter(t => {
    const code = (t.leagueCode || (t.leagueId === 'leg-jsl' ? 'JSL' : (t.leagueId === 'leg-jpl' ? 'JPL' : (t.leagueId === 'leg-kpl' ? 'KPL' : 'T'))));
    return code === leagueCode;
  });

  const activeFormat = formatSelect ? formatSelect.value : (format.format || 'TWO_GROUPS');
  let groups = ['A', 'B'];
  if (activeFormat === 'THREE_GROUPS') groups = ['A', 'B', 'C'];
  if (activeFormat === 'FOUR_GROUPS') groups = ['A', 'B', 'C', 'D'];
  if (activeFormat === 'SINGLE_TABLE') groups = ['ALL'];

  if (activeFormat === 'SINGLE_TABLE') {
    container.innerHTML = `
      <div class="col-span-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
        <div class="font-black text-slate-800 text-sm">🌟 Single Unified League Table Active</div>
        <p class="text-xs text-slate-500">All ${allTeams.length} teams compete together in one combined Points Table.</p>
      </div>
    `;
    return;
  }

  const groupColors = {
    A: { border: 'border-emerald-300', bg: 'bg-emerald-50/50', badge: 'bg-emerald-600 text-white', text: 'text-emerald-950', title: '🟢 GROUP A' },
    B: { border: 'border-sky-300', bg: 'bg-sky-50/50', badge: 'bg-sky-600 text-white', text: 'text-sky-950', title: '🔵 GROUP B' },
    C: { border: 'border-amber-300', bg: 'bg-amber-50/50', badge: 'bg-amber-600 text-white', text: 'text-amber-950', title: '🟡 GROUP C' },
    D: { border: 'border-purple-300', bg: 'bg-purple-50/50', badge: 'bg-purple-600 text-white', text: 'text-purple-950', title: '🟣 GROUP D' }
  };

  container.className = `grid grid-cols-1 ${groups.length > 2 ? 'sm:grid-cols-2 md:grid-cols-4' : 'sm:grid-cols-2'} gap-3.5`;

  container.innerHTML = groups.map(grp => {
    const styling = groupColors[grp] || groupColors.A;
    const groupTeams = allTeams.filter(t => (t.group || 'A').toUpperCase() === grp);

    return `
      <div class="p-3.5 sm:p-4 rounded-2xl border-2 ${styling.border} ${styling.bg} space-y-2.5 shadow-2xs">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <div class="flex items-center gap-2">
            <span class="text-xs sm:text-sm font-black ${styling.text}">${styling.title}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${styling.badge}">
              ${groupTeams.length} Teams
            </span>
          </div>
          <span class="text-[10px] font-bold text-slate-500">Top 2 ➔ Semifinals</span>
        </div>

        <div class="space-y-2">
          ${groupTeams.length === 0 ? `
            <div class="py-4 text-center text-xs text-slate-400 font-semibold italic">No teams assigned to Group ${grp} yet.</div>
          ` : groupTeams.map((t, idx) => `
            <div class="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-6 h-6 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center font-mono font-black text-xs text-slate-700 shrink-0">
                  ${idx + 1}
                </span>
                <div class="min-w-0">
                  <div class="text-xs font-black text-slate-900 truncate">${t.name}</div>
                  <div class="text-[10px] text-slate-500 truncate">${t.ownerName ? `Owner: ${t.ownerName}` : (t.captainName ? `Cap: ${t.captainName}` : '')}</div>
                </div>
              </div>

              <!-- Group Switcher Dropdown -->
              <div class="shrink-0 flex items-center gap-1">
                <span class="text-[10px] font-bold text-slate-400">Move:</span>
                <select class="admin-team-group-switch-select bg-slate-50 border border-slate-300 text-slate-900 text-[11px] font-bold rounded-lg p-1 cursor-pointer" data-team-id="${t.id}">
                  ${groups.map(g => `<option value="${g}" ${grp === g ? 'selected' : ''}>Group ${g}</option>`).join('')}
                </select>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Bind change listeners on group switches
  container.querySelectorAll('.admin-team-group-switch-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const teamId = e.target.getAttribute('data-team-id');
      const newGroup = e.target.value;
      store.setTeamGroup(teamId, newGroup);
      renderAdminGroupArena();
    });
  });
}

function renderAdminFixturesList() {
  const tbody = document.getElementById('admin-fixtures-list');
  if (!tbody) return;

  const accessibleLeagues = store.getAccessibleLeagues();
  const accessibleCodes = accessibleLeagues.map(l => (l.code || l.category || 'T').toUpperCase());
  const fixtures = store.getFixtures().filter(f => store.isMasterAdmin() || accessibleCodes.includes((f.leagueCode || 'T').toUpperCase()));
  if (fixtures.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-500">No matches scheduled yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = fixtures.map(f => {
    let stageBadge = '<span class="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[9px] font-bold rounded border border-slate-300">League</span>';
    if (f.stage === 'GROUP_A' || f.groupCode === 'A') {
      stageBadge = '<span class="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[9px] font-black rounded border border-emerald-300">🟢 Group A</span>';
    } else if (f.stage === 'GROUP_B' || f.groupCode === 'B') {
      stageBadge = '<span class="px-1.5 py-0.5 bg-sky-100 text-sky-800 font-mono text-[9px] font-black rounded border border-sky-300">🔵 Group B</span>';
    } else if (f.stage === 'GROUP_C' || f.groupCode === 'C') {
      stageBadge = '<span class="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-mono text-[9px] font-black rounded border border-amber-300">🟡 Group C</span>';
    } else if (f.stage === 'GROUP_D' || f.groupCode === 'D') {
      stageBadge = '<span class="px-1.5 py-0.5 bg-purple-100 text-purple-800 font-mono text-[9px] font-black rounded border border-purple-300">🟣 Group D</span>';
    } else if (f.stage === 'SEMI_FINAL_1' || f.stage === 'SEMI_FINAL_2') {
      stageBadge = '<span class="px-1.5 py-0.5 bg-amber-100 text-amber-900 font-mono text-[9px] font-black rounded border border-amber-400 shadow-2xs">🏆 Semi-Final</span>';
    } else if (f.stage === 'FINAL') {
      stageBadge = '<span class="px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-mono text-[9px] font-black rounded border border-amber-300 shadow-xs">👑 Final</span>';
    }

    const statusBadge = f.status === 'LIVE' ? `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[9px] border border-emerald-300 animate-pulse uppercase">LIVE</span>` : f.status === 'COMPLETED' ? `<span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-black text-[9px] border border-slate-300 uppercase">COMPLETED</span>` : `<span class="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full font-black text-[9px] border border-sky-300 uppercase">SCHEDULED</span>`;

    return `
    <!-- Mobile Card -->
    <tr class="sm:hidden">
      <td colspan="6" class="p-0">
        <div class="p-3 border-b border-slate-100 space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <div class="font-bold text-slate-900 text-xs flex items-center gap-1.5 min-w-0">
              <span class="px-1 py-0.5 bg-slate-100 text-slate-700 font-mono text-[8px] font-black rounded border border-slate-200 shrink-0">${f.leagueCode || 'T'}</span>
              <span class="truncate">${f.teamAName} vs ${f.teamBName}</span>
            </div>
            ${statusBadge}
          </div>
          <div class="flex items-center justify-between text-[9px] text-slate-500">
            <span>${f.date} ${f.time} • ${f.oversLimit || 16} Overs</span>
            ${stageBadge}
          </div>
          <div class="flex items-center gap-1.5">
            <button data-edit-fixture-id="${f.id}" class="admin-edit-fixture-btn flex-1 py-1.5 bg-sky-50 text-sky-700 font-black text-[10px] rounded-lg border border-sky-300 text-center cursor-pointer">✏️ Edit</button>
            <button data-delete-fixture-id="${f.id}" class="admin-delete-fixture-btn flex-1 py-1.5 bg-rose-50 text-rose-700 font-black text-[10px] rounded-lg border border-rose-300 text-center cursor-pointer">🗑️ Delete</button>
          </div>
        </div>
      </td>
    </tr>
    <!-- Desktop Row -->
    <tr class="hidden sm:table-row hover:bg-slate-50">
      <td class="py-3 px-3">
        <div class="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
          <span class="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[9px] font-black rounded border border-slate-200">${f.leagueCode || 'T'}</span>
          <span>${f.teamAName} <span class="text-slate-400 font-semibold">vs</span> ${f.teamBName}</span>
        </div>
      </td>
      <td class="py-3 px-3 text-xs">${stageBadge}</td>
      <td class="py-3 px-3 text-xs">
        <div class="text-slate-800 font-bold">${f.date} at ${f.time}</div>
        <div class="text-slate-500 text-[10px]">📍 ${f.venue}</div>
      </td>
      <td class="py-3 px-3 text-xs text-slate-700 font-bold">${f.oversLimit || 16} Overs</td>
      <td class="py-3 px-3 text-xs">${statusBadge}</td>
      <td class="py-3 px-3 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button data-edit-fixture-id="${f.id}" class="admin-edit-fixture-btn px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-black text-xs rounded-xl border border-sky-300 shadow-2xs flex items-center gap-1 cursor-pointer transition-all">✏️ Edit</button>
          <button data-delete-fixture-id="${f.id}" class="admin-delete-fixture-btn px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs rounded-xl border border-rose-300 shadow-2xs flex items-center gap-1 cursor-pointer transition-all">🗑️ Delete</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  tbody.querySelectorAll('.admin-edit-fixture-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const fId = e.currentTarget.getAttribute('data-edit-fixture-id');
      const allFixtures = store.getFixtures();
      const f = allFixtures.find(x => x.id === fId);
      if (f) {
        openEditMatchModal(f, () => {
          renderAdminFixturesList();
          renderScorerMatchesList();
        });
      }
    });
  });

  tbody.querySelectorAll('.admin-delete-fixture-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const fId = e.currentTarget.getAttribute('data-delete-fixture-id');
      const allFixtures = store.getFixtures();
      const f = allFixtures.find(x => x.id === fId);
      const matchLabel = f ? `[${f.leagueCode || 'T'}] ${f.teamAName} vs ${f.teamBName}` : 'this match';
      
      if (confirm(`🗑️ Delete Match Confirmation:\n\nAre you sure you want to permanently delete "${matchLabel}"?\n\nThis will completely remove the match from scheduled fixtures, scoring console, and cloud storage.`)) {
        store.deleteFixture(fId);
        renderAdminFixturesList();
        renderScorerMatchesList();
        alert("✅ Match has been deleted successfully!");
      }
    });
  });

  // Clear all matches button listener
  document.getElementById('admin-clear-all-fixtures-btn')?.addEventListener('click', () => {
    const fixtures = store.getFixtures();
    if (fixtures.length === 0) {
      alert("ℹ️ There are no scheduled matches to delete.");
      return;
    }

    if (confirm(`⚠️ DANGER: Delete ALL Matches Confirmation\n\nAre you sure you want to permanently delete ALL ${fixtures.length} scheduled and completed matches?\n\nThis will clear the entire match schedule from the system.`)) {
      fixtures.forEach(f => store.deleteFixture(f.id));
      renderAdminFixturesList();
      renderScorerMatchesList();
      alert(`✅ All ${fixtures.length} matches have been cleared successfully!`);
    }
  });
}

function renderScorerMatchesList() {
  const selectEl = document.getElementById('scorer-select-match');
  if (!selectEl) return;

  const accessibleLeagues = store.getAccessibleLeagues();
  const accessibleCodes = accessibleLeagues.map(l => (l.code || l.category || 'T').toUpperCase());
  const fixtures = store.getFixtures().filter(f => store.isMasterAdmin() || accessibleCodes.includes((f.leagueCode || 'T').toUpperCase()));
  const selectables = fixtures.filter(f => f.status !== 'COMPLETED');

  selectEl.innerHTML = `
    <option value="">-- Choose Match to Score --</option>
    ${selectables.map(f => `
      <option value="${f.id}" ${activeScoringMatchId === f.id ? 'selected' : ''}>
        [${f.leagueCode || 'T'}] ${f.teamAName} vs ${f.teamBName} (${f.date} ${f.time}) • Status: ${f.status}
      </option>
    `).join('')}
  `;

  const setupStepBlock = document.getElementById('scorer-lineup-step-block');
  const matchCardEl = document.getElementById('scorer-selected-match-card');
  const activePanelEl = document.getElementById('scorer-active-panel');

  const onMatchSelected = (matchId) => {
    if (!matchId) {
      if (setupStepBlock) setupStepBlock.classList.add('hidden');
      if (matchCardEl) matchCardEl.classList.add('hidden');
      if (activePanelEl) activePanelEl.classList.add('hidden');
      return;
    }

    activeScoringMatchId = matchId;
    const fixture = store.getFixtures().find(f => f.id === matchId);
    if (!fixture) {
      // Match no longer exists (e.g. just deleted) — clear the whole scorer view
      activeScoringMatchId = null;
      if (selectEl) selectEl.value = '';
      if (setupStepBlock) setupStepBlock.classList.add('hidden');
      if (matchCardEl) matchCardEl.classList.add('hidden');
      if (activePanelEl) activePanelEl.classList.add('hidden');
      return;
    }

    // Show Match Preview Card in Step 1
    if (matchCardEl) {
      matchCardEl.classList.remove('hidden');
      matchCardEl.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-2">
          <div class="font-black text-slate-900 text-sm flex items-center gap-2">
            <span>🛡️ ${fixture.teamAName}</span>
            <span class="text-xs text-slate-500 font-semibold">vs</span>
            <span>🛡️ ${fixture.teamBName}</span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${fixture.status === 'LIVE' ? 'bg-rose-600 text-white animate-pulse' : 'bg-sky-100 text-sky-800 border border-sky-300'}">
            ${fixture.status}
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-slate-700 pt-1">
          <div><span class="text-[9px] text-slate-400 block uppercase">Format / Overs</span>⏱️ T${fixture.oversLimit || 16} (${fixture.oversLimit || 16} Overs)</div>
          <div><span class="text-[9px] text-slate-400 block uppercase">Stage</span>🏆 ${fixture.stage || 'League Match'}</div>
          <div><span class="text-[9px] text-slate-400 block uppercase">Schedule</span>🗓️ ${fixture.date} (${fixture.time || '09:00 AM'})</div>
          <div><span class="text-[9px] text-slate-400 block uppercase">Toss Decision</span>🪙 ${fixture.tossDetails || 'Toss not updated'}</div>
        </div>
        <div class="pt-2 mt-1 border-t border-emerald-100 flex flex-wrap items-center gap-2">
          <button type="button" id="scorer-set-toss-pxi-btn" class="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-xl shadow-2xs cursor-pointer flex items-center gap-1" title="Set toss winner + bat/bowl decision, then each team's Playing XI and 12th man">
            🪙 Set Toss &amp; Playing XI ${fixture.tossDetails ? '<span class="text-[9px] font-bold text-emerald-800">(update)</span>' : '<span class="text-[9px] font-bold text-rose-700">(required)</span>'}
          </button>
          <span class="text-[10px] font-bold text-slate-500">Sets batting order + squads — shown live in Match Corner.</span>
        </div>
      `;

      document.getElementById('scorer-set-toss-pxi-btn')?.addEventListener('click', () => {
        // Toss modal sets winner/decision, reorders the batting side, then chains into
        // the Playing XI + 12th man modal. All of it saves to the fixture (and cloud),
        // which the public Match Corner already reads and displays.
        const s = fixture.liveMatchState;
        const hasProgress = s && (Number(s.runs) > 0 || Number(s.overs) > 0 ||
          (Array.isArray(s.overBalls) && s.overBalls.length > 0) ||
          (Array.isArray(s.ballHistory) && s.ballHistory.length > 0));
        if (hasProgress && !confirm("⚠️ This match already has scoring in progress. Re-setting the toss will RESET the live score to 0/0. Continue?")) return;
        openTossSelectionModal(fixture, () => {
          onMatchSelected(fixture.id);
        });
      });
    }

    // Reveal Step 2 Lineup Block
    if (setupStepBlock) {
      setupStepBlock.classList.remove('hidden');
    }

    // Populate Opening Batsmen and Bowler Dropdowns
    const battingTeamId = fixture.liveMatchState?.innings === 2 ? fixture.teamBId : fixture.teamAId;
    const bowlingTeamId = fixture.liveMatchState?.innings === 2 ? fixture.teamAId : fixture.teamBId;
    const battingTeamName = battingTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;
    const bowlingTeamName = bowlingTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;

    const allBatPlayers = store.getPlayers().filter(p => p.teamId === battingTeamId);
    const allBowlPlayers = store.getPlayers().filter(p => p.teamId === bowlingTeamId);

    const batPXI = fixture.playingXI?.[battingTeamId]?.playing11Ids;
    const bowlPXI = fixture.playingXI?.[bowlingTeamId]?.playing11Ids;

    let batPlayers = (batPXI && batPXI.length > 0) ? allBatPlayers.filter(p => batPXI.includes(p.id)) : allBatPlayers;
    let bowlPlayers = (bowlPXI && bowlPXI.length > 0) ? allBowlPlayers.filter(p => bowlPXI.includes(p.id)) : allBowlPlayers;

    if (batPlayers.length === 0) {
      batPlayers = Array.from({ length: 11 }, (_, i) => ({
        id: `${battingTeamId}-ply-${i+1}`,
        name: `${battingTeamName} Player ${i+1}`,
        teamId: battingTeamId
      }));
    }
    if (bowlPlayers.length === 0) {
      bowlPlayers = Array.from({ length: 11 }, (_, i) => ({
        id: `${bowlingTeamId}-ply-${i+1}`,
        name: `${bowlingTeamName} Bowler ${i+1}`,
        teamId: bowlingTeamId
      }));
    }

    const state = fixture.liveMatchState || {};
    const strikerId = state.strikerId || batPlayers[0]?.id;
    const nonStrikerId = state.nonStrikerId || (batPlayers[1]?.id || batPlayers[0]?.id);
    const bowlerId = state.bowlerId || bowlPlayers[0]?.id;

    const strikerSel = document.getElementById('scorer-select-striker');
    const nonStrikerSel = document.getElementById('scorer-select-non-striker');
    const bowlerSel = document.getElementById('scorer-select-bowler');

    if (strikerSel) {
      strikerSel.innerHTML = batPlayers.map(p => `<option value="${p.id}" ${strikerId === p.id ? 'selected' : ''}>🏏 ${p.name}</option>`).join('');
    }
    if (nonStrikerSel) {
      nonStrikerSel.innerHTML = batPlayers.map(p => `<option value="${p.id}" ${nonStrikerId === p.id ? 'selected' : ''}>🏏 ${p.name}</option>`).join('');
    }
    if (bowlerSel) {
      bowlerSel.innerHTML = bowlPlayers.map(p => `<option value="${p.id}" ${bowlerId === p.id ? 'selected' : ''}>⚾ ${p.name}</option>`).join('');
    }

    const isMatchLive = fixture.status === 'LIVE' || (fixture.liveMatchState && (fixture.liveMatchState.runs > 0 || fixture.liveMatchState.overs > 0 || (fixture.liveMatchState.ballHistory && fixture.liveMatchState.ballHistory.length > 0)));

    const startBtnTxt = document.getElementById('scorer-start-match-btn-txt');
    if (startBtnTxt) {
      startBtnTxt.textContent = isMatchLive ? "✅ MATCH IS LIVE (SCORING PANEL ACTIVE)" : "🚀 START MATCH & OPEN LIVE SCORING PANEL";
    }

    if (isMatchLive) {
      if (activePanelEl) activePanelEl.classList.remove('hidden');
      renderScorerActivePanel();
    } else {
      if (activePanelEl) activePanelEl.classList.add('hidden');
    }
  };

  selectEl.onchange = (e) => {
    onMatchSelected(e.target.value);
  };

  // Auto-restore the scorer view: keep the last-scored match open, or if none is
  // active, auto-attach to any LIVE match so returning to this tab reopens it with
  // the latest state — no manual reselect/reopen needed. An in-progress match stays
  // open until the admin closes the innings or finishes/deletes the match.
  const fixturesNow = store.getFixtures();
  let restoreId = (activeScoringMatchId && fixturesNow.some(f => f.id === activeScoringMatchId))
    ? activeScoringMatchId
    : null;
  if (!restoreId) {
    const liveMatch = fixturesNow.find(f => f.status === 'LIVE' &&
      (store.isMasterAdmin() || accessibleCodes.includes((f.leagueCode || 'T').toUpperCase())));
    if (liveMatch) restoreId = liveMatch.id;
  }
  if (restoreId) {
    activeScoringMatchId = restoreId;
    selectEl.value = restoreId;
    onMatchSelected(restoreId);
  } else {
    onMatchSelected('');
  }

  // Bind Start Match Button (Step 2 -> Step 3)
  const startActionBtn = document.getElementById('scorer-start-match-action-btn');
  if (startActionBtn) {
    startActionBtn.onclick = () => {
      const matchId = document.getElementById('scorer-select-match')?.value || activeScoringMatchId;
      if (!matchId) return alert("⚠️ Please select a match in Step 1 first!");

      const fixture = store.getFixtures().find(f => f.id === matchId);
      if (!fixture) return;

      // Require the toss (which also chains Playing XI) before scoring can begin
      if (!fixture.tossDetails) {
        alert("🪙 Please complete the Toss & Playing XI selection first (use the amber button above).");
        openTossSelectionModal(fixture, () => { onMatchSelected(fixture.id); });
        return;
      }

      const strikerId = document.getElementById('scorer-select-striker')?.value;
      const nonStrikerId = document.getElementById('scorer-select-non-striker')?.value;
      const bowlerId = document.getElementById('scorer-select-bowler')?.value;

      if (!strikerId || !nonStrikerId || !bowlerId) {
        return alert("⚠️ Please choose Batsman 1, Batsman 2, and Opening Bowler first!");
      }

      if (strikerId === nonStrikerId) {
        return alert("⚠️ Striker and Non-Striker cannot be the same player!");
      }

      fixture.status = 'LIVE';
      if (!fixture.startedAtTimestamp) fixture.startedAtTimestamp = Date.now();
      if (!fixture.startedAt) fixture.startedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (!fixture.liveMatchState) {
        fixture.liveMatchState = {
          innings: 1,
          runs: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          overBalls: [],
          ballHistory: [],
          playerStats: {}
        };
      }

      fixture.liveMatchState.strikerId = strikerId;
      fixture.liveMatchState.nonStrikerId = nonStrikerId;
      fixture.liveMatchState.bowlerId = bowlerId;

      if (!fixture.liveMatchState.playerStats) fixture.liveMatchState.playerStats = {};
      [strikerId, nonStrikerId, bowlerId].forEach(pId => {
        if (pId && !fixture.liveMatchState.playerStats[pId]) {
          fixture.liveMatchState.playerStats[pId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
        }
      });

      store.updateFixture(fixture);

      document.getElementById('scorer-active-panel')?.classList.remove('hidden');
      renderScorerActivePanel();

      const startBtnTxt = document.getElementById('scorer-start-match-btn-txt');
      if (startBtnTxt) startBtnTxt.textContent = "✅ MATCH IS LIVE (SCORING PANEL ACTIVE)";

      // Scroll to Step 3 smoothly
      document.getElementById('scorer-active-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (window.renderActiveMatchCenter) window.renderActiveMatchCenter();
      if (window.refreshFixturesViewContent) window.refreshFixturesViewContent();

      alert(`🚀 Match Started!\n\n${fixture.teamAName} vs ${fixture.teamBName} is now LIVE!\nBall-by-ball scoring actions are active below.`);
    };
  }
}

function renderScorerActivePanel() {
  const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
  if (!fixture) return;

  // Shield this match's live state from cloud-echo overwrites while it's on-screen.
  window.__cplActiveScoringFixtureId = fixture.id;

  const state = fixture.liveMatchState || {};
  
  const battingTeamId = state.innings === 2 ? fixture.teamBId : fixture.teamAId;
  const bowlingTeamId = state.innings === 2 ? fixture.teamAId : fixture.teamBId;
  
  const battingTeamName = battingTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;
  const bowlingTeamName = bowlingTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;

  const allBatPlayers = store.getPlayers().filter(p => p.teamId === battingTeamId);
  const allBowlPlayers = store.getPlayers().filter(p => p.teamId === bowlingTeamId);

  const batPXI = fixture.playingXI?.[battingTeamId]?.playing11Ids;
  const bowlPXI = fixture.playingXI?.[bowlingTeamId]?.playing11Ids;

  let batPlayers = (batPXI && batPXI.length > 0) ? allBatPlayers.filter(p => batPXI.includes(p.id)) : allBatPlayers;
  let bowlPlayers = (bowlPXI && bowlPXI.length > 0) ? allBowlPlayers.filter(p => bowlPXI.includes(p.id)) : allBowlPlayers;

  if (batPlayers.length === 0) {
    batPlayers = Array.from({ length: 11 }, (_, i) => ({
      id: `${battingTeamId}-ply-${i+1}`,
      name: `${battingTeamName} Player ${i+1}`,
      teamId: battingTeamId
    }));
  }
  if (bowlPlayers.length === 0) {
    bowlPlayers = Array.from({ length: 11 }, (_, i) => ({
      id: `${bowlingTeamId}-ply-${i+1}`,
      name: `${bowlingTeamName} Bowler ${i+1}`,
      teamId: bowlingTeamId
    }));
  }

  // Auto-assign default striker, non-striker and bowler if unset
  if (!state.strikerId || !batPlayers.some(p => p.id === state.strikerId)) {
    state.strikerId = batPlayers[0]?.id || '';
  }
  if (!state.nonStrikerId || state.nonStrikerId === state.strikerId || !batPlayers.some(p => p.id === state.nonStrikerId)) {
    const nonStriker = batPlayers.find(p => p.id !== state.strikerId) || batPlayers[1] || batPlayers[0];
    state.nonStrikerId = nonStriker?.id || '';
  }
  if (!state.bowlerId || !bowlPlayers.some(p => p.id === state.bowlerId)) {
    state.bowlerId = bowlPlayers[0]?.id || '';
  }

  if (!state.playerStats) state.playerStats = {};
  [state.strikerId, state.nonStrikerId, state.bowlerId].forEach(pId => {
    if (pId && !state.playerStats[pId]) {
      state.playerStats[pId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
    }
  });

  fixture.liveMatchState = state;
  store.updateFixture(fixture);

  // Sync in-play dropdowns in Step 3
  const activeStrikerSel = document.getElementById('scorer-active-striker-sel');
  const activeNonStrikerSel = document.getElementById('scorer-active-non-striker-sel');
  const activeBowlerSel = document.getElementById('scorer-active-bowler-sel');

  if (activeStrikerSel && activeNonStrikerSel && activeBowlerSel) {
    const isOut = (id) => !!(state.playerStats && state.playerStats[id] && state.playerStats[id].dismissed === true);
    // Striker list: exclude out batters and the current non-striker (but always keep the current striker visible)
    const strikerOpts = batPlayers.filter(p => p.id === state.strikerId || (!isOut(p.id) && p.id !== state.nonStrikerId));
    // Non-striker list: exclude out batters and the current striker (but always keep the current non-striker visible)
    const nonStrikerOpts = batPlayers.filter(p => p.id === state.nonStrikerId || (!isOut(p.id) && p.id !== state.strikerId));

    activeStrikerSel.innerHTML = strikerOpts.map(p => `
      <option value="${p.id}" ${state.strikerId === p.id ? 'selected' : ''}>🏏 ${p.name}</option>
    `).join('');

    activeNonStrikerSel.innerHTML = nonStrikerOpts.map(p => `
      <option value="${p.id}" ${state.nonStrikerId === p.id ? 'selected' : ''}>🏏 ${p.name}</option>
    `).join('');

    activeBowlerSel.innerHTML = bowlPlayers.map(p => `
      <option value="${p.id}" ${state.bowlerId === p.id ? 'selected' : ''}>⚾ ${p.name}</option>
    `).join('');

    activeStrikerSel.onchange = (e) => {
      const val = e.target.value;
      if (val && val === state.nonStrikerId) {
        alert("⚠️ Striker and Non-Striker cannot be the same player!");
        e.target.value = state.strikerId || '';
        return;
      }
      state.strikerId = val;
      if (!state.playerStats[val]) {
        state.playerStats[val] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
      }
      fixture.liveMatchState = state;
      store.updateFixture(fixture);
      if (window.renderActiveMatchCenter) window.renderActiveMatchCenter();
      if (window.refreshFixturesViewContent) window.refreshFixturesViewContent();
    };

    activeNonStrikerSel.onchange = (e) => {
      const val = e.target.value;
      if (val && val === state.strikerId) {
        alert("⚠️ Striker and Non-Striker cannot be the same player!");
        e.target.value = state.nonStrikerId || '';
        return;
      }
      state.nonStrikerId = val;
      if (!state.playerStats[val]) {
        state.playerStats[val] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
      }
      fixture.liveMatchState = state;
      store.updateFixture(fixture);
      if (window.renderActiveMatchCenter) window.renderActiveMatchCenter();
      if (window.refreshFixturesViewContent) window.refreshFixturesViewContent();
    };

    activeBowlerSel.onchange = (e) => {
      const val = e.target.value;
      state.bowlerId = val;
      if (!state.playerStats[val]) {
        state.playerStats[val] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
      }
      fixture.liveMatchState = state;
      store.updateFixture(fixture);
      if (window.renderActiveMatchCenter) window.renderActiveMatchCenter();
      if (window.refreshFixturesViewContent) window.refreshFixturesViewContent();
    };
  }

  // Summary card render
  const summaryContainer = document.getElementById('scorer-match-status-summary');
  if (summaryContainer) {
    const totalBalls = (state.overs * 6) + state.balls;
    const runRate = totalBalls > 0 ? ((state.runs / totalBalls) * 6).toFixed(2) : '0.00';
    let targetTxt = '';
    if (state.innings === 2 && state.target) {
      const runsNeeded = state.target - state.runs;
      const totalOversBalls = fixture.oversLimit * 6;
      const remainingBalls = totalOversBalls - totalBalls;
      targetTxt = `
        <div class="text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 p-2 rounded-xl mt-1.5 shadow-2xs">
          🎯 Target: ${state.target} | Need ${runsNeeded} runs in ${remainingBalls} balls remaining
        </div>
      `;
    }

    summaryContainer.innerHTML = `
      <div class="bg-white p-4 sm:p-5 rounded-3xl border-2 border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md text-slate-900">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Innings ${state.innings} Batting: <strong class="text-emerald-700 font-black">${battingTeamName}</strong>
            </span>
            ${state.tossDetails ? `<span class="text-[9px] bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">🪙 ${state.tossDetails}</span>` : ''}
            ${state.freeHit ? `<span class="text-[9px] bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-black animate-pulse">🎯 FREE HIT</span>` : ''}
          </div>
          <div class="text-3xl font-black text-slate-900 font-mono mt-1">
            <span class="text-emerald-700">${state.runs}</span><span class="text-slate-400 text-xl font-bold">/${state.wickets}</span>
            <span class="text-xs text-slate-500 font-sans font-bold">(${state.overs}.${state.balls} / ${fixture.oversLimit} Overs)</span>
          </div>
          ${targetTxt}
        </div>
        <div class="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
          <div class="text-right">
            <div class="text-xs font-bold text-slate-600">Run Rate: <span class="text-emerald-700 font-black">${runRate}</span></div>
            <div class="text-[11px] text-slate-700 font-bold mt-0.5">Bowling: <strong class="text-sky-700 font-black">${bowlingTeamName}</strong></div>
          </div>
          <!-- Emergency Match Actions (Delete / Reset / Edit Playing 11 / Edit Match / Match Centre) -->
          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <button id="scorer-preview-mc-btn" class="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-[10px] rounded-xl shadow-2xs cursor-pointer transition-all flex items-center gap-1" title="Open Live Match Centre Modal">
              📊 Match Centre
            </button>
            <button id="scorer-edit-match-btn" class="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-black text-[10px] rounded-xl shadow-2xs cursor-pointer transition-all flex items-center gap-1" title="Edit Overs, Match Info, or In-Play Substitutions">
              ✏️ Edit Match / Overs
            </button>
            <button id="scorer-edit-pxi-btn" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[10px] rounded-xl shadow-2xs cursor-pointer transition-all flex items-center gap-1" title="Set or Modify Playing 11 & 12th Man">
              📋 Playing 11
            </button>
            <button id="scorer-reset-match-btn" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-black text-[10px] rounded-xl shadow-2xs cursor-pointer transition-all" title="Reset score to 0/0 and return to Scheduled">
              🔄 Reset Score
            </button>
            <button id="scorer-delete-match-btn" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-black text-[10px] rounded-xl shadow-2xs cursor-pointer transition-all" title="Permanently delete this match">
              🗑️ Delete Match
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('scorer-preview-mc-btn')?.addEventListener('click', () => {
      if (window.openMatchCenterModal) {
        window.openMatchCenterModal(fixture.id);
      }
    });

    document.getElementById('scorer-edit-match-btn')?.addEventListener('click', () => {
      openEditMatchModal(fixture, () => renderScorerActivePanel());
    });

    document.getElementById('scorer-edit-pxi-btn')?.addEventListener('click', () => {
      openPlayingXIModal(fixture, () => renderScorerActivePanel());
    });

    document.getElementById('scorer-reset-match-btn')?.addEventListener('click', () => {
      if (confirm("🔄 Reset Match Confirmation:\n\nClear all recorded balls, runs, and wickets and return this match to SCHEDULED status?")) {
        // Must set to null, not delete: store.updateFixture shallow-merges
        // {...old, ...new}, so a deleted key keeps the old value. null overrides.
        fixture.liveMatchState = null;
        fixture.status = 'SCHEDULED';
        fixture.teamAScore = { runs: 0, wickets: 0, overs: 0, balls: 0 };
        fixture.teamBScore = { runs: 0, wickets: 0, overs: 0, balls: 0 };
        fixture.result = null;
        fixture.winnerTeamId = null;
        fixture.startedAt = null;
        fixture.startedAtTimestamp = null;
        store.updateFixture(fixture);
        document.getElementById('scorer-active-panel')?.classList.add('hidden');
        renderScorerMatchesList();
        renderAdminFixturesList();
        alert("✅ Match has been reset to SCHEDULED status!");
      }
    });

    document.getElementById('scorer-delete-match-btn')?.addEventListener('click', () => {
      if (confirm(`🗑️ Delete Wrong Match Confirmation:\n\nAre you sure you want to permanently delete this match (${fixture.teamAName} vs ${fixture.teamBName})?`)) {
        store.deleteFixture(fixture.id);
        // Fully clear the scorer view so no stale card / lineup / panel remains
        if (activeScoringMatchId === fixture.id) activeScoringMatchId = null;
        if (window.__cplActiveScoringFixtureId === fixture.id) window.__cplActiveScoringFixtureId = null;
        document.getElementById('scorer-active-panel')?.classList.add('hidden');
        document.getElementById('scorer-selected-match-card')?.classList.add('hidden');
        document.getElementById('scorer-lineup-step-block')?.classList.add('hidden');
        const selEl = document.getElementById('scorer-select-match');
        if (selEl) selEl.value = '';
        renderScorerMatchesList();
        renderAdminFixturesList();
        alert("✅ Match deleted successfully!");
      }
    });
  }

  // Render current over balls ticker
  const overBallsTicker = document.getElementById('scorer-this-over-balls');
  if (overBallsTicker) {
    const list = state.overBalls || [];
    overBallsTicker.innerHTML = list.length === 0 ? `<span class="text-slate-400 italic">No balls in this over yet</span>` : list.map(b => {
      let colorClass = 'bg-slate-100 text-slate-800 border border-slate-300';
      if (b.type === 'four') colorClass = 'bg-blue-600 text-white font-bold';
      if (b.type === 'six') colorClass = 'bg-amber-400 text-slate-950 font-bold';
      if (b.type === 'wicket') colorClass = 'bg-rose-600 text-white font-bold';
      if (b.type === 'wide' || b.type === 'noball') colorClass = 'bg-amber-100 text-amber-900 border border-amber-400 font-semibold';
      return `<span class="px-2 py-0.5 text-xs rounded-lg ${colorClass} shadow-2xs font-mono font-black">${b.label}</span>`;
    }).join('');
  }

  // Bind All Scoring Action Buttons directly to ensure 100% responsiveness
  document.querySelectorAll('.scorer-ball-act-btn').forEach(btn => {
    btn.onclick = (e) => {
      const runs = Number(e.currentTarget.getAttribute('data-runs')) || 0;
      processScorerBall(runs);
    };
  });

  const wicketBtn = document.getElementById('scorer-wicket-btn');
  if (wicketBtn) {
    wicketBtn.onclick = () => openScorerWicketModal();
  }

  const swapStrikeBtn = document.getElementById('scorer-swap-strike-btn');
  if (swapStrikeBtn) {
    swapStrikeBtn.onclick = () => {
      if (fixture && fixture.liveMatchState) {
        const temp = fixture.liveMatchState.strikerId;
        fixture.liveMatchState.strikerId = fixture.liveMatchState.nonStrikerId;
        fixture.liveMatchState.nonStrikerId = temp;
        store.updateFixture(fixture);
        renderScorerActivePanel();
      }
    };
  }

  const endInningsBtn = document.getElementById('scorer-end-innings-btn');
  if (endInningsBtn) {
    endInningsBtn.onclick = () => {
      if (fixture && fixture.liveMatchState) {
        if (fixture.liveMatchState.innings === 2) {
          return alert("Innings 2 is already in progress or completed!");
        }
        if (confirm(`Confirm Close Innings 1?\n\n${battingTeamName} scored ${state.runs}/${state.wickets} in ${state.overs}.${state.balls} overs.\nTarget for ${bowlingTeamName} will be ${state.runs + 1} runs.`)) {
          fixture.liveMatchState.innings = 2;
          fixture.liveMatchState.target = fixture.liveMatchState.runs + 1;
          fixture.liveMatchState.strikerId = '';
          fixture.liveMatchState.nonStrikerId = '';
          fixture.liveMatchState.bowlerId = '';
          fixture.liveMatchState.runs = 0;
          fixture.liveMatchState.wickets = 0;
          fixture.liveMatchState.overs = 0;
          fixture.liveMatchState.balls = 0;
          fixture.liveMatchState.overBalls = [];
          fixture.liveMatchState.currentOverBowlerRuns = 0;
          store.updateFixture(fixture);
          renderScorerActivePanel();
          alert(`✅ Innings 1 Closed! Target set to ${fixture.liveMatchState.target}. Now select new opening batsmen and bowler for Innings 2.`);
        }
      }
    };
  }

  const finishMatchBtn = document.getElementById('scorer-finish-match-btn');
  if (finishMatchBtn) {
    finishMatchBtn.onclick = () => {
      if (confirm("🏆 Are you sure you want to finalize this match and record the official result?")) {
        let winnerId = null;
        let resultTxt = 'Match Tied';

        const teamAScore = fixture.teamAScore || { runs: 0, wickets: 0 };
        const teamBScore = fixture.teamBScore || { runs: 0, wickets: 0 };

        if (teamAScore.runs > teamBScore.runs) {
          winnerId = fixture.teamAId;
          resultTxt = `${fixture.teamAName} won by ${teamAScore.runs - teamBScore.runs} runs`;
        } else if (teamBScore.runs > teamAScore.runs) {
          winnerId = fixture.teamBId;
          resultTxt = `${fixture.teamBName} won by ${10 - teamBScore.wickets} wickets`;
        }

        fixture.status = 'COMPLETED';
        fixture.endedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        fixture.result = resultTxt;
        fixture.winnerTeamId = winnerId;
        
        store.updateFixture(fixture);
        document.getElementById('scorer-active-panel')?.classList.add('hidden');
        renderScorerMatchesList();
        renderAdminFixturesList();
        alert(`🎉 Match Completed!\n\nResult: ${resultTxt}`);
      }
    };
  }
}

// Full-screen celebratory flash for key scoring events (four / six / wicket / wide / no-ball).
function showScoringAnimation(kind) {
  try {
    const map = {
      four:   { text: 'FOUR!',   emoji: '4️⃣', bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#ffffff' },
      six:    { text: 'SIX!',    emoji: '6️⃣', bg: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#1e293b' },
      wicket: { text: 'OUT!',    emoji: '🎯', bg: 'linear-gradient(135deg,#e11d48,#9f1239)', color: '#ffffff' },
      wide:   { text: 'WIDE',    emoji: '↔️', bg: 'linear-gradient(135deg,#f59e0b,#b45309)', color: '#ffffff' },
      noball: { text: 'NO BALL', emoji: '🚫', bg: 'linear-gradient(135deg,#f43f5e,#9f1239)', color: '#ffffff' },
      innings:{ text: 'INNINGS BREAK', emoji: '🌓', bg: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#ffffff', hold: 2200 },
      match:  { text: 'MATCH OVER',    emoji: '🏆', bg: 'linear-gradient(135deg,#059669,#047857)', color: '#ffffff', hold: 2200 }
    };
    const cfg = map[kind];
    if (!cfg || typeof document === 'undefined') return;
    if (!document.getElementById('scoring-anim-style')) {
      const st = document.createElement('style');
      st.id = 'scoring-anim-style';
      st.textContent = '@keyframes scorepop{0%{transform:scale(.3) rotate(-8deg);opacity:0}25%{transform:scale(1.15) rotate(3deg);opacity:1}70%{transform:scale(1) rotate(0);opacity:1}100%{transform:scale(1.45);opacity:0}}'
        + '@keyframes scorehold{0%{transform:scale(.3);opacity:0}12%{transform:scale(1.12);opacity:1}85%{transform:scale(1);opacity:1}100%{transform:scale(1.25);opacity:0}}';
      document.head.appendChild(st);
    }
    document.getElementById('scoring-anim-overlay')?.remove();
    // Innings-break / match-over banners hold longer and dim the screen so the admin
    // can't miss the transition; the quick ball events stay as a fast pass-through flash.
    const hold = cfg.hold || 0;
    const anim = hold ? `scorehold ${hold}ms` : 'scorepop 1.4s';
    const overlayBg = hold ? 'background:rgba(15,23,42,.55);backdrop-filter:blur(2px);' : '';
    const fontSize = hold ? 'clamp(1.8rem,8vw,5rem)' : 'clamp(2.6rem,13vw,8.5rem)';
    const el = document.createElement('div');
    el.id = 'scoring-anim-overlay';
    el.style.cssText = `position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;pointer-events:none;${overlayBg}`;
    el.innerHTML = `<div style="font-weight:900;font-size:${fontSize};padding:.35em .65em;border-radius:1.4rem;background:${cfg.bg};color:${cfg.color};box-shadow:0 22px 60px rgba(0,0,0,.4);animation:${anim} cubic-bezier(.2,.8,.2,1) forwards;display:flex;align-items:center;gap:.2em;white-space:nowrap;text-align:center;">${cfg.emoji} ${cfg.text}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), (hold || 1450) + 50);
  } catch (e) { /* animation is non-critical */ }
}
window.showScoringAnimation = showScoringAnimation;

// Auto-close innings 1 (set target, start innings 2) or finish the match after innings 2.
function endInningsOrFinishMatch(fixture) {
  const s = fixture.liveMatchState;
  if (!s) return;

  if (s.innings === 1) {
    const target = (s.runs || 0) + 1;
    // Innings-1 final total is already stored in teamAScore by the caller.
    s.innings = 2;
    s.target = target;
    s.strikerId = '';
    s.nonStrikerId = '';
    s.bowlerId = '';
    s.runs = 0;
    s.wickets = 0;
    s.overs = 0;
    s.balls = 0;
    s.extras = 0;
    s.freeHit = false;
    s.overBalls = [];
    s.currentOverBowlerRuns = 0;
    if (!Array.isArray(s.ballHistory)) s.ballHistory = [];
    fixture.liveMatchState = s;
    fixture.status = 'LIVE';
    store.updateFixture(fixture);
    renderScorerActivePanel();
    if (window.renderActiveMatchCenter) window.renderActiveMatchCenter();
    if (window.refreshFixturesViewContent) window.refreshFixturesViewContent();
    showScoringAnimation('innings');
    setTimeout(() => alert(`🏁 Innings 1 complete!\n\nTarget for the chasing team: ${target} runs.\nNow select the opening batters & bowler for Innings 2.`), 2300);
    return;
  }

  // Innings 2 over -> decide the result
  const teamAScore = fixture.teamAScore || { runs: 0, wickets: 0 };
  const teamBScore = fixture.teamBScore || { runs: 0, wickets: 0 };
  let winnerId = null, resultTxt = 'Match Tied';
  if (teamAScore.runs > teamBScore.runs) {
    winnerId = fixture.teamAId;
    resultTxt = `${fixture.teamAName} won by ${teamAScore.runs - teamBScore.runs} runs`;
  } else if (teamBScore.runs > teamAScore.runs) {
    winnerId = fixture.teamBId;
    resultTxt = `${fixture.teamBName} won by ${10 - (teamBScore.wickets || 0)} wickets`;
  }
  fixture.status = 'COMPLETED';
  fixture.endedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  fixture.result = resultTxt;
  fixture.winnerTeamId = winnerId;
  // Match is over -> release the live-scoring cloud shield so the final result syncs.
  if (window.__cplActiveScoringFixtureId === fixture.id) window.__cplActiveScoringFixtureId = null;
  store.updateFixture(fixture);
  renderScorerActivePanel();
  if (window.renderActiveMatchCenter) window.renderActiveMatchCenter();
  if (window.refreshFixturesViewContent) window.refreshFixturesViewContent();
  showScoringAnimation('match');
  setTimeout(() => alert(`🎉 Match Completed!\n\nResult: ${resultTxt}`), 2300);
}

function processScorerBall(runsScored) {
  console.log('[SCORER DEBUG] processScorerBall CALLED with runsScored:', runsScored);
  console.log('[SCORER DEBUG] activeScoringMatchId:', activeScoringMatchId);
  if (!activeScoringMatchId) {
    activeScoringMatchId = document.getElementById('scorer-select-match')?.value;
    console.log('[SCORER DEBUG] Fallback activeScoringMatchId from dropdown:', activeScoringMatchId);
  }
  let fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
  console.log('[SCORER DEBUG] fixture found:', !!fixture, fixture?.teamAName, 'vs', fixture?.teamBName, 'status:', fixture?.status);
  if (!fixture) {
    const allLive = store.getFixtures().filter(f => f.status === 'LIVE' || f.status === 'SCHEDULED');
    console.log('[SCORER DEBUG] Fallback allLive fixtures count:', allLive.length);
    if (allLive.length > 0) {
      fixture = allLive[0];
      activeScoringMatchId = fixture.id;
    }
  }
  if (!fixture) {
    console.log('[SCORER DEBUG] NO FIXTURE FOUND - aborting');
    return alert("⚠️ Please select a match in Step 1 and click 'Start Match' first!");
  }
  console.log('[SCORER DEBUG] liveMatchState exists:', !!fixture.liveMatchState);


  if (!fixture.liveMatchState) {
    fixture.status = 'LIVE';
    fixture.liveMatchState = {
      innings: 1,
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      overBalls: [],
      ballHistory: [],
      playerStats: {}
    };
  }

  // Tell the store which fixture is being actively scored so cloud echoes can't
  // clobber the local ball-by-ball state mid-over (see syncWithCloud fixture guard).
  window.__cplActiveScoringFixtureId = fixture.id;

  const state = fixture.liveMatchState;

  // Cloud DB may strip empty arrays/objects, so a resumed/synced match
  // can come back missing these. Re-initialize defensively before any .push()/writes.
  if (!Array.isArray(state.overBalls)) state.overBalls = [];
  if (!Array.isArray(state.ballHistory)) state.ballHistory = [];
  if (!state.playerStats || typeof state.playerStats !== 'object') state.playerStats = {};

  // Capture Real-time Match Start Timestamp on first delivery
  if (!fixture.startedAtTimestamp) {
    fixture.startedAtTimestamp = Date.now();
  }
  if (!fixture.startedAt) {
    fixture.startedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const battingTeamId = state.innings === 2 ? fixture.teamBId : fixture.teamAId;
  const bowlingTeamId = state.innings === 2 ? fixture.teamAId : fixture.teamBId;
  const allBatPlayers = store.getPlayers().filter(p => p.teamId === battingTeamId);
  const allBowlPlayers = store.getPlayers().filter(p => p.teamId === bowlingTeamId);

  const battingTeamName = battingTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;
  const bowlingTeamName = bowlingTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;

  let batPlayers = allBatPlayers.length > 0 ? allBatPlayers : Array.from({ length: 11 }, (_, i) => ({
    id: `${battingTeamId}-ply-${i+1}`,
    name: `${battingTeamName} Player ${i+1}`
  }));
  let bowlPlayers = allBowlPlayers.length > 0 ? allBowlPlayers : Array.from({ length: 11 }, (_, i) => ({
    id: `${bowlingTeamId}-ply-${i+1}`,
    name: `${bowlingTeamName} Bowler ${i+1}`
  }));

  let strikerId = document.getElementById('scorer-active-striker-sel')?.value || document.getElementById('scorer-select-striker')?.value || state.strikerId || batPlayers[0]?.id;
  let nonStrikerId = document.getElementById('scorer-active-non-striker-sel')?.value || document.getElementById('scorer-select-non-striker')?.value || state.nonStrikerId || batPlayers[1]?.id;
  let bowlerId = document.getElementById('scorer-active-bowler-sel')?.value || document.getElementById('scorer-select-bowler')?.value || state.bowlerId || bowlPlayers[0]?.id;

  if (!strikerId || !nonStrikerId || !bowlerId) {
    strikerId = batPlayers[0]?.id || `${battingTeamId}-ply-1`;
    nonStrikerId = batPlayers[1]?.id || `${battingTeamId}-ply-2`;
    bowlerId = bowlPlayers[0]?.id || `${bowlingTeamId}-ply-1`;
  }

  if (strikerId === nonStrikerId && batPlayers.length > 1) {
    const alt = batPlayers.find(p => p.id !== strikerId);
    if (alt) nonStrikerId = alt.id;
  }

  state.strikerId = strikerId;
  state.nonStrikerId = nonStrikerId;
  state.bowlerId = bowlerId;

  if (!state.playerStats) state.playerStats = {};
  if (!state.playerStats[strikerId]) {
    state.playerStats[strikerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
  }
  if (!state.playerStats[nonStrikerId]) {
    state.playerStats[nonStrikerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
  }
  if (!state.playerStats[bowlerId]) {
    state.playerStats[bowlerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
  }

  const isWide = document.getElementById('scorer-extra-wide')?.checked;
  const isNoBall = document.getElementById('scorer-extra-noball')?.checked;
  const isBye = document.getElementById('scorer-extra-bye')?.checked;
  const isLegBye = document.getElementById('scorer-extra-legbye')?.checked;

  let ballLabel = runsScored.toString();
  let ballType = 'ball';
  let totalBallRuns = runsScored;

  if (isWide) {
    ballType = 'wide';
    totalBallRuns += 1;
    // Wide + runs run between the wickets shows as "WD+1", "WD+2"; plain wide is "WD"
    ballLabel = runsScored > 0 ? `WD+${runsScored}` : 'WD';
  } else if (isNoBall) {
    ballType = 'noball';
    totalBallRuns += 1;
    // No-ball + runs off the bat shows as "NB+1", "NB+6"; plain no-ball is "NB"
    ballLabel = runsScored > 0 ? `NB+${runsScored}` : 'NB';
  } else if (isBye) {
    ballType = 'bye';
    ballLabel = `B+${runsScored}`;
  } else if (isLegBye) {
    ballType = 'legbye';
    ballLabel = `LB+${runsScored}`;
  } else if (runsScored === 4) {
    ballLabel = '4';
    ballType = 'four';
  } else if (runsScored === 6) {
    ballLabel = '6';
    ballType = 'six';
  }

  // Update striker details
  if (!isWide && !isBye && !isLegBye) {
    state.playerStats[strikerId].runs += runsScored;
    if (runsScored === 4) state.playerStats[strikerId].fours = (state.playerStats[strikerId].fours || 0) + 1;
    if (runsScored === 6) state.playerStats[strikerId].sixes = (state.playerStats[strikerId].sixes || 0) + 1;
  }
  if (!isWide) {
    state.playerStats[strikerId].balls += 1;
  }

  // Update bowler details
  if (!isWide && !isNoBall) {
    state.playerStats[bowlerId].ballsBowled += 1;
  }
  if (!isBye && !isLegBye) {
    state.playerStats[bowlerId].runsConceded += totalBallRuns;
  }

  // Per-over maiden tracking: accumulate the runs CHARGED TO THE BOWLER this over.
  // Byes/leg-byes are not charged to the bowler so they don't break a maiden (per the
  // laws); wides/no-balls are charged, so they do. Checked at over completion below.
  if (typeof state.currentOverBowlerRuns !== 'number') state.currentOverBowlerRuns = 0;
  state.currentOverBowlerRuns += (!isBye && !isLegBye) ? totalBallRuns : 0;

  state.runs += totalBallRuns;

  // Track team EXTRAS (wides + no-ball penalty + byes + leg-byes). Runs off the bat are NOT extras.
  if (typeof state.extras !== 'number') state.extras = 0;
  if (isWide) state.extras += totalBallRuns;       // whole wide (penalty + any runs run) is an extra
  else if (isNoBall) state.extras += 1;            // only the no-ball penalty is an extra
  else if (isBye || isLegBye) state.extras += runsScored;

  // FREE HIT: a no-ball grants a free hit on the next delivery (only run out possible).
  // A wide does not consume it; the next legal ball clears it.
  if (isNoBall) state.freeHit = true;
  else if (!isWide) state.freeHit = false;

  const isValidBall = !isWide && !isNoBall;
  let overJustCompleted = false;

  // Record this delivery in the current-over ticker FIRST, then decide whether the
  // over just completed. If it did, we clear the ticker AFTER pushing so the new over
  // starts empty (the completing ball is still preserved in ballHistory). Pushing
  // before the reset is what the wicket path already does — keep them consistent.
  state.overBalls.push({
    label: ballLabel,
    type: ballType
  });

  if (isValidBall) {
    state.balls += 1;
    if (state.balls >= 6) {
      // Maiden over? The bowler conceded nothing this over -> credit a maiden.
      if ((state.currentOverBowlerRuns || 0) === 0 && state.bowlerId && state.playerStats[state.bowlerId]) {
        state.playerStats[state.bowlerId].maidens = (state.playerStats[state.bowlerId].maidens || 0) + 1;
      }
      state.currentOverBowlerRuns = 0;   // reset the per-over bowler tally for the next over
      state.overs += 1;
      state.balls = 0;
      state.overBalls = [];   // fresh over -> empty "This Over Deliveries" ticker
      overJustCompleted = true;

      const temp = state.strikerId;   // batsmen cross at the end of the over
      state.strikerId = state.nonStrikerId;
      state.nonStrikerId = temp;
    } else if (runsScored === 1 || runsScored === 3) {
      const temp = state.strikerId;
      state.strikerId = state.nonStrikerId;
      state.nonStrikerId = temp;
    }
  } else if (runsScored === 1 || runsScored === 3) {
    // Wide / no-ball: the ball is re-bowled, but odd runs physically run between the
    // wickets still cross the batsmen, so strike rotates (e.g. WD+1 -> strike changes).
    const temp = state.strikerId;
    state.strikerId = state.nonStrikerId;
    state.nonStrikerId = temp;
  }

  // Track Rich Ball Commentary in ballHistory
  if (!state.ballHistory) state.ballHistory = [];

  const strikerName = store.getPlayerById(strikerId)?.name || 'Striker';
  const bowlerName = store.getPlayerById(bowlerId)?.name || 'Bowler';

  let commentaryDesc = `${totalBallRuns} runs scored.`;
  if (isWide) commentaryDesc = `Wide delivery from ${bowlerName}. 1 extra run conceded.`;
  else if (isNoBall) commentaryDesc = `No ball delivery from ${bowlerName}! Free hit upcoming.`;
  else if (isBye) commentaryDesc = `Byes! ${runsScored} extra run${runsScored !== 1 ? 's' : ''} taken.`;
  else if (isLegBye) commentaryDesc = `Leg bye! Deflected off the pad for ${runsScored} run${runsScored !== 1 ? 's' : ''}.`;
  else if (runsScored === 0) commentaryDesc = `Dot ball. Tight delivery on good length by ${bowlerName}.`;
  else if (runsScored === 1) commentaryDesc = `Single run. ${strikerName} pushes into the gap and rotates strike.`;
  else if (runsScored === 2) commentaryDesc = `Two runs! Nicely placed, quick running between the wickets.`;
  else if (runsScored === 3) commentaryDesc = `Three runs! Deep into the outfield, batsmen run well.`;
  else if (runsScored === 4) commentaryDesc = `FOUR! Beautifully timed boundary by ${strikerName}!`;
  else if (runsScored === 6) commentaryDesc = `SIX! Huge maximum! ${strikerName} sends it soaring into the stands!`;

  state.ballHistory.unshift({
    innings: state.innings || 1,
    overNum: `${state.overs}.${state.balls}`,
    label: ballLabel,
    type: ballType,
    runs: totalBallRuns,
    bowlerName: bowlerName,
    batterName: strikerName,
    commentary: `${bowlerName} to ${strikerName} — ${commentaryDesc}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // Reset checkboxes
  if (document.getElementById('scorer-extra-wide')) document.getElementById('scorer-extra-wide').checked = false;
  if (document.getElementById('scorer-extra-noball')) document.getElementById('scorer-extra-noball').checked = false;
  if (document.getElementById('scorer-extra-bye')) document.getElementById('scorer-extra-bye').checked = false;
  if (document.getElementById('scorer-extra-legbye')) document.getElementById('scorer-extra-legbye').checked = false;

  fixture.liveMatchState = state;
  
  const currentBattingScore = { runs: state.runs, wickets: state.wickets, overs: state.overs, balls: state.balls, extras: state.extras || 0 };
  if (state.innings === 2) {
    fixture.teamBScore = currentBattingScore;
  } else {
    fixture.teamAScore = currentBattingScore;
  }

  store.updateFixture(fixture);
  renderScorerActivePanel();

  if (window.renderActiveMatchCenter) window.renderActiveMatchCenter();
  if (window.refreshFixturesViewContent) window.refreshFixturesViewContent();

  // Celebratory flash for the key events (six shown even off a no-ball)
  let animKind = null;
  if (runsScored === 6) animKind = 'six';
  else if (runsScored === 4) animKind = 'four';
  else if (isWide) animKind = 'wide';
  else if (isNoBall) animKind = 'noball';
  if (animKind) showScoringAnimation(animKind);

  // Auto-close the innings the moment the overs limit is reached
  const oversLimit = Number(fixture.oversLimit) || 16;
  if (state.overs >= oversLimit) {
    endInningsOrFinishMatch(fixture);
    return;
  }

  // 2nd innings target chased -> finish the match immediately
  if (state.innings === 2 && state.target && state.runs >= state.target) {
    endInningsOrFinishMatch(fixture);
    return;
  }

  // After an over completes (innings continues), prompt for the next bowler
  if (overJustCompleted) {
    openSelectNextBowlerModal(fixture);
  }
}

function openScorerWicketModal() {
  const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
  if (!fixture) return;

  const state = fixture.liveMatchState;
  // Cloud DB may strip empty arrays/objects; re-init defensively before wicket writes.
  if (!Array.isArray(state.overBalls)) state.overBalls = [];
  if (!Array.isArray(state.ballHistory)) state.ballHistory = [];
  if (!state.playerStats || typeof state.playerStats !== 'object') state.playerStats = {};
  const battingTeamId = state.innings === 2 ? fixture.teamBId : fixture.teamAId;
  const bowlingTeamId = state.innings === 2 ? fixture.teamAId : fixture.teamBId;

  const batPlayers = store.getPlayers().filter(p => p.teamId === battingTeamId);
  const bowlPlayers = store.getPlayers().filter(p => p.teamId === bowlingTeamId);

  // A wicket may fall on a wide / no-ball / bye / leg-bye — read the extra checkboxes
  // so the penalty, ball-count and allowed dismissal types are applied correctly.
  const wIsWide = document.getElementById('scorer-extra-wide')?.checked || false;
  const wIsNoBall = document.getElementById('scorer-extra-noball')?.checked || false;
  const wIsBye = document.getElementById('scorer-extra-bye')?.checked || false;
  const wIsLegBye = document.getElementById('scorer-extra-legbye')?.checked || false;
  const wDelivery = wIsNoBall ? 'NO_BALL' : (wIsWide ? 'WIDE' : (wIsBye ? 'BYE' : (wIsLegBye ? 'LEG_BYE' : 'LEGAL')));
  const ALL_DISMISSALS = [
    { v: 'BOWLED', t: 'Bowled' }, { v: 'CAUGHT', t: 'Caught Out' }, { v: 'LBW', t: 'L.B.W.' },
    { v: 'RUN_OUT', t: 'Run Out' }, { v: 'STUMPED', t: 'Stumped' }, { v: 'HIT_WICKET', t: 'Hit Wicket' }
  ];
  const allowedByDelivery = {
    LEGAL: ['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET'],
    WIDE: ['RUN_OUT', 'STUMPED', 'HIT_WICKET'],
    NO_BALL: ['RUN_OUT'],
    BYE: ['RUN_OUT', 'HIT_WICKET'],
    LEG_BYE: ['RUN_OUT', 'HIT_WICKET']
  };
  const wFreeHit = !!state.freeHit;
  // On a free hit the batsman can only be run out, whatever the delivery is
  const allowedTypes = wFreeHit ? ['RUN_OUT'] : (allowedByDelivery[wDelivery] || allowedByDelivery.LEGAL);
  const dismissalOptions = ALL_DISMISSALS.filter(d => allowedTypes.includes(d.v));
  const freeHitBanner = wFreeHit ? `
    <div class="text-[11px] font-black px-3 py-2 rounded-xl border bg-rose-50 text-rose-900 border-rose-300">
      🎯 FREE HIT — the batsman can only be <strong>Run Out</strong> on this delivery.
    </div>` : '';
  const deliveryBanner = freeHitBanner + (wDelivery === 'LEGAL' ? '' : `
    <div class="text-[11px] font-black px-3 py-2 rounded-xl border ${(wDelivery === 'NO_BALL' || wDelivery === 'WIDE') ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-slate-50 text-slate-700 border-slate-200'}">
      ⚠️ Wicket on a <strong>${wDelivery.replace('_', '-').toLowerCase()}</strong> — allowed: ${allowedTypes.map(t => t.replace('_', ' ')).join(' / ')}.${(wDelivery === 'WIDE' || wDelivery === 'NO_BALL') ? ' +1 penalty run counts and the ball is re-bowled (over does not advance).' : ''}
    </div>`);

  document.getElementById('scorer-wicket-modal')?.remove();

  const modalHtml = `
    <div id="scorer-wicket-modal" class="fixed inset-0 z-[70] modal-overlay flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div class="bg-white border-2 border-rose-500 max-w-md w-full p-5 sm:p-6 relative space-y-4 animate-fade-in rounded-3xl shadow-2xl text-slate-900 text-left">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="p-2 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 text-base shadow-2xs font-black">☝️</span>
            <div>
              <span class="px-2 py-0.5 bg-rose-50 text-rose-800 font-mono text-[9px] font-black rounded border border-rose-200 uppercase">WICKET DISMISSAL</span>
              <h3 class="text-base font-black text-slate-900 leading-tight mt-0.5">Record Wicket Out</h3>
            </div>
          </div>
          <button id="cancel-wicket-top-btn" class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
        
        <div>
          <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">1. Dismissed Batter</label>
          <select id="wicket-select-dismissed" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs">
            <option value="${state.strikerId}">Striker: ${store.getPlayerById(state.strikerId)?.name || 'Striker'}</option>
            <option value="${state.nonStrikerId}">Non-Striker: ${store.getPlayerById(state.nonStrikerId)?.name || 'Non-Striker'}</option>
          </select>
        </div>

        ${deliveryBanner}

        <div>
          <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">2. Dismissal Type</label>
          <select id="wicket-select-type" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs">
            ${dismissalOptions.map(d => `<option value="${d.v}">${d.t}</option>`).join('')}
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Runs completed before dismissal (run out)</label>
          <select id="wicket-runs-completed" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs">
            <option value="0">0 runs</option>
            <option value="1">1 run</option>
            <option value="2">2 runs</option>
            <option value="3">3 runs</option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">3. Fielder / Catcher (Optional)</label>
          <select id="wicket-select-fielder" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs">
            <option value="">-- Direct Bowler / No Fielder --</option>
            ${bowlPlayers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button id="cancel-wicket-btn" type="button" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
            Cancel
          </button>
          <button id="confirm-wicket-btn" type="button" class="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer">
            Confirm Out!
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('scorer-wicket-modal')?.remove();
  document.getElementById('cancel-wicket-btn')?.addEventListener('click', removeModal);
  document.getElementById('cancel-wicket-top-btn')?.addEventListener('click', removeModal);

  document.getElementById('confirm-wicket-btn')?.addEventListener('click', () => {
    const dismissedId = document.getElementById('wicket-select-dismissed').value;
    const type = document.getElementById('wicket-select-type').value;
    const fielderId = document.getElementById('wicket-select-fielder').value;
    const runsCompleted = Number(document.getElementById('wicket-runs-completed')?.value) || 0;
    const wIsLegalDelivery = !wIsWide && !wIsNoBall;
    const wPenalty = (wIsWide || wIsNoBall) ? 1 : 0;

    state.wickets += 1;

    // Runs on this delivery = extra penalty (wide/no-ball) + runs physically completed
    const teamRunsToAdd = wPenalty + runsCompleted;
    state.runs += teamRunsToAdd;

    // Track team EXTRAS for a wicket that fell on an extra delivery
    if (typeof state.extras !== 'number') state.extras = 0;
    if (wIsWide) state.extras += teamRunsToAdd;        // whole wide counts as extras
    else if (wIsNoBall) state.extras += 1;             // no-ball penalty only
    else if (wIsBye || wIsLegBye) state.extras += runsCompleted;

    // Credit completed runs to the striker only on a legal, off-the-bat delivery
    const wStrikerId = state.strikerId;
    if (wStrikerId && !state.playerStats[wStrikerId]) {
      state.playerStats[wStrikerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
    }
    if (wIsLegalDelivery && !wIsBye && !wIsLegBye && runsCompleted > 0 && wStrikerId) {
      state.playerStats[wStrikerId].runs += runsCompleted;
    }
    // Striker faces a ball unless it is a wide
    if (!wIsWide && wStrikerId) state.playerStats[wStrikerId].balls += 1;

    if (!state.playerStats) state.playerStats = {};
    if (!state.playerStats[dismissedId]) {
      state.playerStats[dismissedId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
    }
    state.playerStats[dismissedId].dismissed = true;
    state.playerStats[dismissedId].dismissalInfo = type;

    const bowlerId = state.bowlerId;
    if (bowlerId) {
      if (!state.playerStats[bowlerId]) {
        state.playerStats[bowlerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
      }
      // Bowler gets the wicket for everything except a run out (stumped/hit-wicket off a wide still count)
      if (type !== 'RUN_OUT') {
        state.playerStats[bowlerId].wickets = (state.playerStats[bowlerId].wickets || 0) + 1;
      }
      // Runs charged to the bowler: wide -> penalty + runs; no-ball -> penalty; legal off-bat -> runs; byes -> 0
      let bowlerCharge = 0;
      if (wIsWide) bowlerCharge = 1 + runsCompleted;
      else if (wIsNoBall) bowlerCharge = 1;
      else if (!wIsBye && !wIsLegBye) bowlerCharge = runsCompleted;
      state.playerStats[bowlerId].runsConceded += bowlerCharge;
      if (wIsLegalDelivery) state.playerStats[bowlerId].ballsBowled += 1;
      // Per-over maiden tally (see processScorerBall) — a wicket ball still adds its charge.
      if (typeof state.currentOverBowlerRuns !== 'number') state.currentOverBowlerRuns = 0;
      state.currentOverBowlerRuns += bowlerCharge;
    }

    // Credit the fielder so tournament awards (Best Fielder / Best Wicketkeeper) can aggregate.
    // Caught -> catch, Stumped -> stumping (the keeper), Run Out -> run-out.
    if (fielderId) {
      if (!state.playerStats[fielderId]) {
        state.playerStats[fielderId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
      }
      const fs = state.playerStats[fielderId];
      if (type === 'CAUGHT') fs.catches = (fs.catches || 0) + 1;
      else if (type === 'STUMPED') fs.stumpings = (fs.stumpings || 0) + 1;
      else if (type === 'RUN_OUT') fs.runOuts = (fs.runOuts || 0) + 1;
    }

    let wktLabel = 'W';
    if (wIsWide) wktLabel = 'W+wd';
    else if (wIsNoBall) wktLabel = 'W+nb';
    else if (wIsBye) wktLabel = runsCompleted > 0 ? `W+${runsCompleted}b` : 'W+b';
    else if (wIsLegBye) wktLabel = runsCompleted > 0 ? `W+${runsCompleted}lb` : 'W+lb';

    state.overBalls.push({
      label: wktLabel,
      type: 'wicket'
    });

    if (!state.ballHistory) state.ballHistory = [];
    const dismissedName = store.getPlayerById(dismissedId)?.name || 'Batter';
    const bowlerName = store.getPlayerById(bowlerId)?.name || 'Bowler';
    const fielderName = fielderId ? store.getPlayerById(fielderId)?.name : '';
    
    let wktCommentary = `OUT! ${dismissedName} dismissed (${type.replace('_', ' ').toLowerCase()}).`;
    if (fielderName) wktCommentary = `OUT! ${dismissedName} caught by ${fielderName} off ${bowlerName}.`;

    state.ballHistory.unshift({
      innings: state.innings || 1,
      overNum: `${state.overs}.${state.balls}`,
      label: wktLabel,
      type: 'wicket',
      runs: teamRunsToAdd,
      bowlerName: bowlerName,
      batterName: dismissedName,
      commentary: `${bowlerName} to ${dismissedName} — ${wktCommentary}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    let overCompletedNow = false;
    // Wide / no-ball are re-bowled — the over does not advance on them. A wicket on a
    // legal delivery (incl. bye/leg-bye) uses up one ball of the over.
    if (wIsLegalDelivery) {
      state.balls += 1;
      if (state.balls >= 6) {
        // Maiden over? (bowler conceded nothing across the whole over)
        if ((state.currentOverBowlerRuns || 0) === 0 && bowlerId && state.playerStats[bowlerId]) {
          state.playerStats[bowlerId].maidens = (state.playerStats[bowlerId].maidens || 0) + 1;
        }
        state.currentOverBowlerRuns = 0;
        state.overs += 1;
        state.balls = 0;
        state.overBalls = [];
        overCompletedNow = true;
      }
    }

    // Remember which crease slot the dismissed batter vacated
    const vacantRole = (dismissedId === state.strikerId) ? 'striker' : 'nonStriker';
    if (vacantRole === 'striker') {
      state.strikerId = '';
    } else {
      state.nonStrikerId = '';
    }

    fixture.liveMatchState = state;
    if (state.innings === 2) {
      fixture.teamBScore = { runs: state.runs, wickets: state.wickets, overs: state.overs, balls: state.balls, extras: state.extras || 0 };
    } else {
      fixture.teamAScore = { runs: state.runs, wickets: state.wickets, overs: state.overs, balls: state.balls, extras: state.extras || 0 };
    }

    // Clear the extra checkboxes so the next delivery starts clean
    ['scorer-extra-wide', 'scorer-extra-noball', 'scorer-extra-bye', 'scorer-extra-legbye'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });

    store.updateFixture(fixture);
    removeModal();
    renderScorerActivePanel();
    showScoringAnimation('wicket');

    // All out, or overs limit reached on this ball -> auto-close the innings/match.
    const oversLimit = Number(fixture.oversLimit) || 16;
    if (state.wickets >= 10 || state.overs >= oversLimit) {
      endInningsOrFinishMatch(fixture);
      return;
    }

    // Prompt for the new incoming batter; if the over also ended, chain the bowler prompt.
    openSelectNextBatterModal(fixture, vacantRole, () => {
      if (overCompletedNow) openSelectNextBowlerModal(fixture);
    });
  });
}

// --- SELECT NEXT INCOMING BATTER (after a wicket) ---
function openSelectNextBatterModal(fixture, vacantRole, onDone) {
  const state = fixture.liveMatchState;
  if (!state) { if (onDone) onDone(); return; }
  if (!state.playerStats || typeof state.playerStats !== 'object') state.playerStats = {};

  const battingTeamId = state.innings === 2 ? fixture.teamBId : fixture.teamAId;
  const batPlayers = store.getPlayers().filter(p => p.teamId === battingTeamId);

  // The batter still at the crease occupies the other slot
  const stillInId = vacantRole === 'striker' ? state.nonStrikerId : state.strikerId;
  const available = batPlayers.filter(p =>
    p.id !== stillInId && !(state.playerStats[p.id] && state.playerStats[p.id].dismissed)
  );

  if (available.length === 0) {
    alert("ℹ️ No remaining batters available to come in. Close the innings if needed.");
    if (onDone) onDone();
    return;
  }

  document.getElementById('scorer-next-batter-modal')?.remove();
  const roleLabel = vacantRole === 'striker' ? 'Striker' : 'Non-Striker';
  const modalHtml = `
    <div id="scorer-next-batter-modal" class="fixed inset-0 z-[75] modal-overlay flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div class="bg-white border-2 border-emerald-500 max-w-md w-full p-5 sm:p-6 relative space-y-4 rounded-3xl shadow-2xl text-slate-900 text-left">
        <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <span class="p-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200 text-base font-black">🏏</span>
          <div>
            <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-mono text-[9px] font-black rounded border border-emerald-200 uppercase">NEW BATTER IN</span>
            <h3 class="text-base font-black text-slate-900 leading-tight mt-0.5">Select Incoming Batter (${roleLabel})</h3>
          </div>
        </div>
        <div>
          <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Choose Next Batter</label>
          <select id="next-batter-select" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs">
            ${available.map(p => `<option value="${p.id}">🏏 ${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button id="next-batter-confirm-btn" type="button" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer">Send to Crease</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('next-batter-confirm-btn')?.addEventListener('click', () => {
    const newId = document.getElementById('next-batter-select').value;
    if (!newId) return;
    if (vacantRole === 'striker') state.strikerId = newId; else state.nonStrikerId = newId;
    if (!state.playerStats[newId]) {
      state.playerStats[newId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
    }
    fixture.liveMatchState = state;
    store.updateFixture(fixture);
    document.getElementById('scorer-next-batter-modal')?.remove();
    renderScorerActivePanel();
    if (onDone) onDone();
  });
}

// --- SELECT NEXT BOWLER (after an over completes) ---
function openSelectNextBowlerModal(fixture, onDone) {
  const state = fixture.liveMatchState;
  if (!state) { if (onDone) onDone(); return; }
  if (!state.playerStats || typeof state.playerStats !== 'object') state.playerStats = {};

  const bowlingTeamId = state.innings === 2 ? fixture.teamAId : fixture.teamBId;
  const bowlPlayers = store.getPlayers().filter(p => p.teamId === bowlingTeamId);

  const lastBowlerId = state.bowlerId;
  // A bowler cannot bowl two overs back to back; exclude the previous bowler
  let available = bowlPlayers.filter(p => p.id !== lastBowlerId);
  if (available.length === 0) available = bowlPlayers; // single-bowler safety fallback

  if (available.length === 0) { if (onDone) onDone(); return; }

  document.getElementById('scorer-next-bowler-modal')?.remove();
  const modalHtml = `
    <div id="scorer-next-bowler-modal" class="fixed inset-0 z-[75] modal-overlay flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div class="bg-white border-2 border-sky-500 max-w-md w-full p-5 sm:p-6 relative space-y-4 rounded-3xl shadow-2xl text-slate-900 text-left">
        <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <span class="p-2 bg-sky-50 text-sky-600 rounded-2xl border border-sky-200 text-base font-black">⚾</span>
          <div>
            <span class="px-2 py-0.5 bg-sky-50 text-sky-800 font-mono text-[9px] font-black rounded border border-sky-200 uppercase">END OF OVER</span>
            <h3 class="text-base font-black text-slate-900 leading-tight mt-0.5">Select Next Over's Bowler</h3>
          </div>
        </div>
        <div>
          <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Choose Bowler</label>
          <select id="next-bowler-select" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs">
            ${available.map(p => `<option value="${p.id}">⚾ ${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button id="next-bowler-confirm-btn" type="button" class="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer">Start New Over</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('next-bowler-confirm-btn')?.addEventListener('click', () => {
    const newId = document.getElementById('next-bowler-select').value;
    if (!newId) return;
    state.bowlerId = newId;
    if (!state.playerStats[newId]) {
      state.playerStats[newId] = { runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
    }
    fixture.liveMatchState = state;
    store.updateFixture(fixture);
    document.getElementById('scorer-next-bowler-modal')?.remove();
    renderScorerActivePanel();
    if (onDone) onDone();
  });
}

function openTossSelectionModal(fixture, onComplete) {
  document.getElementById('toss-select-modal')?.remove();

  let selectedDecision = 'BAT'; // 'BAT' or 'BOWL'
  const originalTeamAId = fixture.teamAId;
  const originalTeamAName = fixture.teamAName;
  const originalTeamBId = fixture.teamBId;
  const originalTeamBName = fixture.teamBName;

  const modalHtml = `
    <div id="toss-select-modal" class="fixed inset-0 z-[70] modal-overlay flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div class="bg-white border-2 border-amber-400 max-w-md w-full p-5 sm:p-6 relative space-y-4 animate-fade-in rounded-3xl shadow-2xl text-slate-900 text-left">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="p-2.5 bg-amber-400 text-slate-950 rounded-2xl font-black text-base shadow-2xs">🪙</span>
            <div>
              <span class="px-2 py-0.5 bg-amber-50 text-amber-900 font-mono text-[9px] font-black rounded border border-amber-300 uppercase">MATCH DAY TOSS</span>
              <h3 class="text-base font-black text-slate-900 leading-tight mt-0.5">Official Toss Decision</h3>
            </div>
          </div>
          <span class="text-xs font-mono text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">${fixture.leagueCode || 'T'}</span>
        </div>

        <!-- Match Teams Banner -->
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-black">
          <div class="text-emerald-700 truncate w-5/12 text-left">${originalTeamAName}</div>
          <span class="text-[10px] text-amber-800 px-2.5 py-0.5 bg-amber-100 rounded-full border border-amber-300 font-mono font-black">VS</span>
          <div class="text-sky-700 truncate w-5/12 text-right">${originalTeamBName}</div>
        </div>

        <!-- Step 1: Who won the toss? -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider">1. Toss Winner Team</label>
          <select id="toss-winner-select" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 font-bold focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs">
            <option value="${originalTeamAId}">${originalTeamAName}</option>
            <option value="${originalTeamBId}">${originalTeamBName}</option>
          </select>
        </div>

        <!-- Step 2: Elected to Bat or Bowl? -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-black text-slate-700 uppercase tracking-wider">2. Toss Decision (Elected To)</label>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" id="toss-opt-bat" class="toss-decision-btn py-2.5 px-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all" data-decision="BAT">
              🏏 Elect to BAT First
            </button>
            <button type="button" id="toss-opt-bowl" class="toss-decision-btn py-2.5 px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-900 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all" data-decision="BOWL">
              ⚾ Elect to BOWL First
            </button>
          </div>
        </div>

        <!-- Live Dynamic Outcome Summary Box -->
        <div id="toss-summary-preview" class="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs space-y-1.5 shadow-inner">
          <div class="font-black text-amber-950 flex items-center gap-1.5">
            <span>📢</span> <span id="toss-announcement-text">${originalTeamAName} won the toss and elected to BAT first</span>
          </div>
          <div class="text-[10px] text-slate-600 flex justify-between pt-1.5 border-t border-amber-200/80">
            <span>1st Batting: <strong id="toss-batting-first-name" class="text-emerald-700 font-black">${originalTeamAName}</strong></span>
            <span>1st Bowling: <strong id="toss-bowling-first-name" class="text-sky-700 font-black">${originalTeamBName}</strong></span>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button id="cancel-toss-btn" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
            Cancel
          </button>
          <button id="confirm-toss-btn" class="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl border border-amber-400 shadow-xs cursor-pointer transition-all">
            ⚡ Confirm Toss & Start Match
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const removeModal = () => document.getElementById('toss-select-modal')?.remove();
  document.getElementById('cancel-toss-btn')?.addEventListener('click', removeModal);

  const tossWinnerSel = document.getElementById('toss-winner-select');
  const batBtn = document.getElementById('toss-opt-bat');
  const bowlBtn = document.getElementById('toss-opt-bowl');
  const announceText = document.getElementById('toss-announcement-text');
  const batNameEl = document.getElementById('toss-batting-first-name');
  const bowlNameEl = document.getElementById('toss-bowling-first-name');

  function updateTossPreview() {
    const winnerId = tossWinnerSel.value;
    const isTeamA = winnerId === originalTeamAId;
    const winnerName = isTeamA ? originalTeamAName : originalTeamBName;
    const loserName = isTeamA ? originalTeamBName : originalTeamAName;

    const firstBatName = selectedDecision === 'BAT' ? winnerName : loserName;
    const firstBowlName = selectedDecision === 'BAT' ? loserName : winnerName;

    if (announceText) {
      announceText.textContent = `${winnerName} won the toss and elected to ${selectedDecision === 'BAT' ? 'BAT' : 'BOWL'} first`;
    }
    if (batNameEl) batNameEl.textContent = firstBatName;
    if (bowlNameEl) bowlNameEl.textContent = firstBowlName;

    if (selectedDecision === 'BAT') {
      batBtn.className = "toss-decision-btn py-2.5 px-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all";
      bowlBtn.className = "toss-decision-btn py-2.5 px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-900 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all";
    } else {
      bowlBtn.className = "toss-decision-btn py-2.5 px-3 rounded-xl border-2 border-sky-500 bg-sky-50 text-sky-900 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all";
      batBtn.className = "toss-decision-btn py-2.5 px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-900 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all";
    }
  }

  tossWinnerSel?.addEventListener('change', updateTossPreview);
  batBtn?.addEventListener('click', () => {
    selectedDecision = 'BAT';
    updateTossPreview();
  });
  bowlBtn?.addEventListener('click', () => {
    selectedDecision = 'BOWL';
    updateTossPreview();
  });

  document.getElementById('confirm-toss-btn')?.addEventListener('click', () => {
    const tossWinnerId = tossWinnerSel.value;
    const isTeamA = tossWinnerId === originalTeamAId;
    const tossWinnerName = isTeamA ? originalTeamAName : originalTeamBName;
    const otherTeamId = isTeamA ? originalTeamBId : originalTeamAId;
    const otherTeamName = isTeamA ? originalTeamBName : originalTeamAName;

    let firstBattingId, firstBattingName, firstBowlingId, firstBowlingName;
    if (selectedDecision === 'BAT') {
      firstBattingId = tossWinnerId;
      firstBattingName = tossWinnerName;
      firstBowlingId = otherTeamId;
      firstBowlingName = otherTeamName;
    } else {
      firstBattingId = otherTeamId;
      firstBattingName = otherTeamName;
      firstBowlingId = tossWinnerId;
      firstBowlingName = tossWinnerName;
    }

    const tossSummary = `${tossWinnerName} won the toss and elected to ${selectedDecision.toLowerCase()} first`;

    fixture.tossWinnerId = tossWinnerId;
    fixture.tossWinnerName = tossWinnerName;
    fixture.tossDecision = selectedDecision;
    fixture.tossDetails = tossSummary;

    fixture.teamAId = firstBattingId;
    fixture.teamAName = firstBattingName;
    fixture.teamBId = firstBowlingId;
    fixture.teamBName = firstBowlingName;

    fixture.liveMatchState = {
      strikerId: '',
      nonStrikerId: '',
      bowlerId: '',
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      innings: 1,
      target: null,
      tossDetails: tossSummary,
      overBalls: [],
      recentBalls: [],
      playerStats: {}
    };
    fixture.status = 'LIVE';
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    if (!fixture.startedAt) fixture.startedAt = nowTimeStr;
    if (!fixture.startedAtISO) fixture.startedAtISO = new Date().toISOString();
    
    store.updateFixture(fixture);
    removeModal();
    openPlayingXIModal(fixture, onComplete);
  });
}

export function openPlayingXIModal(fixture, onComplete) {
  document.getElementById('playing-xi-modal')?.remove();

  const teamAPlayers = store.getPlayers().filter(p => p.teamId === fixture.teamAId);
  const teamBPlayers = store.getPlayers().filter(p => p.teamId === fixture.teamBId);

  if (!fixture.playingXI) fixture.playingXI = {};
  if (!fixture.playingXI[fixture.teamAId]) {
    fixture.playingXI[fixture.teamAId] = {
      playing11Ids: teamAPlayers.slice(0, 11).map(p => p.id),
      twelfthManId: teamAPlayers[11] ? teamAPlayers[11].id : ''
    };
  }
  if (!fixture.playingXI[fixture.teamBId]) {
    fixture.playingXI[fixture.teamBId] = {
      playing11Ids: teamBPlayers.slice(0, 11).map(p => p.id),
      twelfthManId: teamBPlayers[11] ? teamBPlayers[11].id : ''
    };
  }

  let activeTab = 'teamA'; // 'teamA' or 'teamB'

  const modalHtml = `
    <div id="playing-xi-modal" class="fixed inset-0 z-[80] modal-overlay flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div class="bg-white border-2 border-emerald-500 max-w-2xl w-full p-4 sm:p-6 relative space-y-4 animate-fade-in rounded-3xl shadow-2xl text-slate-900 text-left max-h-[92vh] flex flex-col justify-between">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div class="flex items-center gap-3">
            <span class="p-2.5 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-2xl font-black text-base shadow-2xs">📋</span>
            <div>
              <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-mono text-[9px] font-black rounded border border-emerald-200 uppercase">OFFICIAL MATCH LINEUPS</span>
              <h3 class="text-base font-black text-slate-900 leading-tight mt-0.5">Select Playing 11 & 12th Man</h3>
            </div>
          </div>
          <button id="close-pxi-btn" class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer transition-all">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Team Selector Tabs -->
        <div class="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
          <button id="pxi-tab-teama" class="py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 text-white shadow-xs">
            🏏 ${fixture.teamAName} (<span id="teama-selected-count">0</span>/11)
          </button>
          <button id="pxi-tab-teamb" class="py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer bg-white text-slate-700 border border-slate-200 hover:bg-slate-50">
            🏏 ${fixture.teamBName} (<span id="teamb-selected-count">0</span>/11)
          </button>
        </div>

        <!-- Quick 1-Click Auto Select & 12th Man bar -->
        <div class="flex flex-wrap items-center justify-between gap-2 px-1 text-xs shrink-0 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
          <div class="flex items-center gap-2">
            <label class="text-[11px] font-black text-slate-700">🛡️ 12th Man / Sub:</label>
            <select id="pxi-12th-man-select" class="bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"></select>
          </div>
          <button id="pxi-autoselect-btn" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs rounded-xl border border-emerald-300 cursor-pointer shadow-2xs flex items-center gap-1 transition-all">
            ⚡ Auto-Select Top 11
          </button>
        </div>

        <!-- Scrollable Squad Roster Grid -->
        <div id="pxi-squad-list" class="space-y-2 overflow-y-auto max-h-[46vh] pr-1 scrollbar-thin"></div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <span class="text-[11px] text-slate-500 font-bold hidden sm:inline">Select exactly 11 players per team</span>
          <div class="flex items-center gap-2">
            <button id="cancel-pxi-btn" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
              Cancel
            </button>
            <button id="save-pxi-btn" class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow cursor-pointer transition-all">
              💾 Confirm Lineups & Start Scoring
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('playing-xi-modal')?.remove();
  document.getElementById('close-pxi-btn')?.addEventListener('click', removeModal);
  document.getElementById('cancel-pxi-btn')?.addEventListener('click', removeModal);

  const tabA = document.getElementById('pxi-tab-teama');
  const tabB = document.getElementById('pxi-tab-teamb');
  const squadListEl = document.getElementById('pxi-squad-list');
  const twelfthSel = document.getElementById('pxi-12th-man-select');
  const autoSelectBtn = document.getElementById('pxi-autoselect-btn');
  const countAEl = document.getElementById('teama-selected-count');
  const countBEl = document.getElementById('teamb-selected-count');

  let selectedA = new Set(fixture.playingXI[fixture.teamAId]?.playing11Ids || []);
  let selectedB = new Set(fixture.playingXI[fixture.teamBId]?.playing11Ids || []);
  let twelfthA = fixture.playingXI[fixture.teamAId]?.twelfthManId || '';
  let twelfthB = fixture.playingXI[fixture.teamBId]?.twelfthManId || '';

  // Clean initial duplicate if twelfth is in selected
  if (selectedA.has(twelfthA)) twelfthA = '';
  if (selectedB.has(twelfthB)) twelfthB = '';

  function renderSquadList() {
    const isTeamA = activeTab === 'teamA';
    const players = isTeamA ? teamAPlayers : teamBPlayers;
    const currentSelected = isTeamA ? selectedA : selectedB;
    let currentTwelfth = isTeamA ? twelfthA : twelfthB;

    if (currentSelected.has(currentTwelfth)) {
      if (isTeamA) twelfthA = '';
      else twelfthB = '';
      currentTwelfth = '';
    }

    if (countAEl) countAEl.textContent = selectedA.size;
    if (countBEl) countBEl.textContent = selectedB.size;

    // Filter ONLY bench players for the 12th man selector!
    const benchPlayers = players.filter(p => !currentSelected.has(p.id));

    if (twelfthSel) {
      twelfthSel.innerHTML = `<option value="">-- Choose 12th Man (from Bench) --</option>` + benchPlayers.map(p => `
        <option value="${p.id}" ${currentTwelfth === p.id ? 'selected' : ''}>${p.name} (${p.category || 'Player'})</option>
      `).join('');
    }

    if (players.length === 0) {
      squadListEl.innerHTML = `
        <div class="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
          No registered players assigned to this team yet.
        </div>
      `;
      return;
    }

    squadListEl.innerHTML = players.map((p) => {
      const isSelected = currentSelected.has(p.id);
      const isTwelfth = currentTwelfth === p.id;
      const photo = p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png';

      return `
        <div class="flex items-center justify-between p-2.5 rounded-2xl border ${isSelected ? 'bg-emerald-50/80 border-emerald-500 shadow-2xs' : (isTwelfth ? 'bg-amber-50/80 border-amber-400 shadow-2xs' : 'bg-white border-slate-200 hover:border-slate-300')} transition-all cursor-pointer pxi-player-row" data-player-id="${p.id}">
          <div class="flex items-center gap-3">
            <input type="checkbox" class="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer pxi-player-check" data-player-id="${p.id}" ${isSelected ? 'checked' : ''} />
            <img src="${photo}" class="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
            <div>
              <div class="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>${p.name}</span>
                ${isTwelfth ? `<span class="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-mono text-[9px] font-black rounded-md uppercase">12th Man</span>` : ''}
              </div>
              <div class="text-[10px] text-slate-500 font-bold">
                ${p.category || 'All Rounder'} • ${p.village || 'N/A'}
              </div>
            </div>
          </div>
          <span class="text-[10px] font-black ${isSelected ? 'text-emerald-700' : (isTwelfth ? 'text-amber-700' : 'text-slate-400')}">
            ${isSelected ? '✓ In XI' : (isTwelfth ? '🛡️ 12th Man' : 'Bench')}
          </span>
        </div>
      `;
    }).join('');

    squadListEl.querySelectorAll('.pxi-player-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const pId = row.getAttribute('data-player-id');
        togglePlayerInXI(pId);
      });
    });

    squadListEl.querySelectorAll('.pxi-player-check').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const pId = chk.getAttribute('data-player-id');
        togglePlayerInXI(pId);
      });
    });
  }

  function togglePlayerInXI(pId) {
    const currentSelected = activeTab === 'teamA' ? selectedA : selectedB;
    if (currentSelected.has(pId)) {
      currentSelected.delete(pId);
    } else {
      if (currentSelected.size >= 11) {
        alert("⚠️ Maximum 11 players can be in the Playing XI. Please uncheck another player first.");
        return;
      }
      currentSelected.add(pId);
      if (activeTab === 'teamA' && twelfthA === pId) twelfthA = '';
      if (activeTab === 'teamB' && twelfthB === pId) twelfthB = '';
    }
    renderSquadList();
  }

  tabA?.addEventListener('click', () => {
    activeTab = 'teamA';
    tabA.className = "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 text-white shadow-xs";
    tabB.className = "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer bg-white text-slate-700 border border-slate-200 hover:bg-slate-50";
    renderSquadList();
  });

  tabB?.addEventListener('click', () => {
    activeTab = 'teamB';
    tabB.className = "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer bg-sky-600 text-white shadow-xs";
    tabA.className = "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer bg-white text-slate-700 border border-slate-200 hover:bg-slate-50";
    renderSquadList();
  });

  twelfthSel?.addEventListener('change', () => {
    if (activeTab === 'teamA') twelfthA = twelfthSel.value;
    else twelfthB = twelfthSel.value;
    renderSquadList();
  });

  autoSelectBtn?.addEventListener('click', () => {
    const isTeamA = activeTab === 'teamA';
    const players = isTeamA ? teamAPlayers : teamBPlayers;
    const currentSelected = isTeamA ? selectedA : selectedB;
    currentSelected.clear();
    players.slice(0, 11).forEach(p => currentSelected.add(p.id));
    if (isTeamA) twelfthA = players[11] ? players[11].id : '';
    if (!isTeamA) twelfthB = players[11] ? players[11].id : '';
    renderSquadList();
  });

  renderSquadList();

  document.getElementById('save-pxi-btn')?.addEventListener('click', () => {
    fixture.playingXI = {
      [fixture.teamAId]: {
        playing11Ids: Array.from(selectedA),
        twelfthManId: twelfthA
      },
      [fixture.teamBId]: {
        playing11Ids: Array.from(selectedB),
        twelfthManId: twelfthB
      }
    };

    store.updateFixture(fixture);
    removeModal();
    if (typeof onComplete === 'function') onComplete();
  });
}

export function openEditMatchModal(fixture, onComplete) {
  document.getElementById('edit-match-modal')?.remove();

  const teamAPlayers = store.getPlayers().filter(p => p.teamId === fixture.teamAId);
  const teamBPlayers = store.getPlayers().filter(p => p.teamId === fixture.teamBId);

  if (!fixture.playingXI) fixture.playingXI = {};
  if (!fixture.playingXI[fixture.teamAId]) {
    fixture.playingXI[fixture.teamAId] = {
      playing11Ids: teamAPlayers.slice(0, 11).map(p => p.id),
      twelfthManId: teamAPlayers[11] ? teamAPlayers[11].id : ''
    };
  }
  if (!fixture.playingXI[fixture.teamBId]) {
    fixture.playingXI[fixture.teamBId] = {
      playing11Ids: teamBPlayers.slice(0, 11).map(p => p.id),
      twelfthManId: teamBPlayers[11] ? teamBPlayers[11].id : ''
    };
  }

  const pxiAIds = fixture.playingXI[fixture.teamAId]?.playing11Ids || [];
  const pxiBIds = fixture.playingXI[fixture.teamBId]?.playing11Ids || [];
  const benchA = teamAPlayers.filter(p => !pxiAIds.includes(p.id));
  const benchB = teamBPlayers.filter(p => !pxiBIds.includes(p.id));

  const modalHtml = `
    <div id="edit-match-modal" class="fixed inset-0 z-[80] modal-overlay flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div class="bg-white border-2 border-sky-500 max-w-xl w-full p-5 sm:p-6 relative space-y-4 animate-fade-in rounded-3xl shadow-2xl text-slate-900 max-h-[92vh] flex flex-col justify-between">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="p-2 bg-sky-50 text-sky-600 rounded-2xl border border-sky-200 text-base shadow-2xs font-black">✏️</span>
            <div>
              <span class="px-2 py-0.5 bg-sky-50 text-sky-800 font-mono text-[9px] font-black rounded border border-sky-200 uppercase">MATCH MANAGEMENT</span>
              <h3 class="text-base font-black text-slate-900 leading-tight mt-0.5">Edit Match, Overs & In-Play Substitutes</h3>
            </div>
          </div>
          <button id="close-edit-match-btn" class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Scrollable Form Body -->
        <div class="space-y-3.5 overflow-y-auto max-h-[62vh] pr-1 scrollbar-thin">
          
          <!-- Match Teams Banner -->
          <div class="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between font-black text-xs">
            <span class="text-emerald-700 font-black">${fixture.teamAName}</span>
            <span class="text-slate-400">VS</span>
            <span class="text-sky-700 font-black">${fixture.teamBName}</span>
          </div>

          <!-- Overs Reduction / Modification Tool -->
          <div class="p-3.5 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <span>⚡</span> Match Total Overs (Reduce for Rain / Short Match)
              </label>
              <span class="text-xs font-mono font-black text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg">
                Current: ${fixture.oversLimit || 16} Overs
              </span>
            </div>
            <div class="grid grid-cols-5 gap-1.5">
              <button type="button" class="preset-overs-btn py-1.5 px-2 bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 font-black text-xs rounded-xl shadow-2xs cursor-pointer" data-overs="6">6 Overs</button>
              <button type="button" class="preset-overs-btn py-1.5 px-2 bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 font-black text-xs rounded-xl shadow-2xs cursor-pointer" data-overs="8">8 Overs</button>
              <button type="button" class="preset-overs-btn py-1.5 px-2 bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 font-black text-xs rounded-xl shadow-2xs cursor-pointer" data-overs="10">10 Overs</button>
              <button type="button" class="preset-overs-btn py-1.5 px-2 bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 font-black text-xs rounded-xl shadow-2xs cursor-pointer" data-overs="12">12 Overs</button>
              <button type="button" class="preset-overs-btn py-1.5 px-2 bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 font-black text-xs rounded-xl shadow-2xs cursor-pointer" data-overs="16">16 Overs</button>
            </div>
            <div class="flex items-center gap-2 pt-1">
              <label class="text-[11px] text-amber-900 font-bold">Custom Overs:</label>
              <input type="number" id="edit-match-overs" min="1" max="50" value="${fixture.oversLimit || 16}" class="w-24 bg-white border border-amber-300 text-slate-900 text-xs rounded-xl p-2 font-black shadow-inner" />
            </div>
          </div>

          <!-- Match No & Stage -->
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Match Number</label>
              <input type="number" id="edit-match-no" min="1" value="${fixture.matchNo || 1}" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs" />
            </div>
            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Stage / Group</label>
              <select id="edit-match-stage" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs">
                <option value="GROUP_A" ${fixture.stage === 'GROUP_A' ? 'selected' : ''}>🟢 Group A</option>
                <option value="GROUP_B" ${fixture.stage === 'GROUP_B' ? 'selected' : ''}>🔵 Group B</option>
                <option value="GROUP_C" ${fixture.stage === 'GROUP_C' ? 'selected' : ''}>🟡 Group C</option>
                <option value="GROUP_D" ${fixture.stage === 'GROUP_D' ? 'selected' : ''}>🟣 Group D</option>
                <option value="SEMI_FINAL_1" ${fixture.stage === 'SEMI_FINAL_1' ? 'selected' : ''}>🏆 Semi-Final 1</option>
                <option value="SEMI_FINAL_2" ${fixture.stage === 'SEMI_FINAL_2' ? 'selected' : ''}>🏆 Semi-Final 2</option>
                <option value="FINAL" ${fixture.stage === 'FINAL' ? 'selected' : ''}>👑 Grand Final</option>
              </select>
            </div>
          </div>

          <!-- Date, Time & Venue -->
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Match Date</label>
              <input type="date" id="edit-match-date" value="${fixture.date || ''}" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs" />
            </div>
            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Start Time</label>
              <input type="time" id="edit-match-time" value="${fixture.time || '09:00'}" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-black text-slate-700 mb-1">Match Venue</label>
            <input type="text" id="edit-match-venue" value="${fixture.venue || 'JHANKRA SCHOOL GROUND'}" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 font-bold shadow-2xs" />
          </div>

          <!-- 12th Man & Mid-Game Injury Switch Section -->
          <div class="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-2xl space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <span>🛡️</span> 12th Man & In-Play Substitute / Injury Switch
              </label>
              <button type="button" id="edit-open-full-pxi-btn" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-2xs cursor-pointer">
                📋 Full Lineup Roster
              </button>
            </div>
            
            <!-- Team A 12th Man & Switch (Bench Players only) -->
            <div class="p-2.5 bg-white border border-emerald-200 rounded-xl space-y-1.5 shadow-2xs">
              <div class="flex items-center justify-between text-[11px] font-black text-emerald-900">
                <span>${fixture.teamAName} 12th Man:</span>
                <select id="edit-12th-man-a" class="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg p-1.5">
                  <option value="">-- Choose 12th Man (from Bench) --</option>
                  ${benchA.map(p => `<option value="${p.id}" ${fixture.playingXI[fixture.teamAId]?.twelfthManId === p.id ? 'selected' : ''}>${p.name} (${p.category || 'Player'})</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Team B 12th Man & Switch (Bench Players only) -->
            <div class="p-2.5 bg-white border border-sky-200 rounded-xl space-y-1.5 shadow-2xs">
              <div class="flex items-center justify-between text-[11px] font-black text-sky-900">
                <span>${fixture.teamBName} 12th Man:</span>
                <select id="edit-12th-man-b" class="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg p-1.5">
                  <option value="">-- Choose 12th Man (from Bench) --</option>
                  ${benchB.map(p => `<option value="${p.id}" ${fixture.playingXI[fixture.teamBId]?.twelfthManId === p.id ? 'selected' : ''}>${p.name} (${p.category || 'Player'})</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button id="cancel-edit-match-btn" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">
            Cancel
          </button>
          <button id="save-edit-match-btn" class="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all">
            💾 Save Match Changes
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('edit-match-modal')?.remove();
  document.getElementById('close-edit-match-btn')?.addEventListener('click', removeModal);
  document.getElementById('cancel-edit-match-btn')?.addEventListener('click', removeModal);

  // Preset overs buttons
  document.querySelectorAll('.preset-overs-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ov = e.currentTarget.getAttribute('data-overs');
      const input = document.getElementById('edit-match-overs');
      if (input) input.value = ov;
    });
  });

  // Reopen full Playing 11 roster
  document.getElementById('edit-open-full-pxi-btn')?.addEventListener('click', () => {
    removeModal();
    openPlayingXIModal(fixture, () => openEditMatchModal(fixture, onComplete));
  });

  // Save changes
  document.getElementById('save-edit-match-btn')?.addEventListener('click', () => {
    const oversVal = Number(document.getElementById('edit-match-overs')?.value) || 16;
    const matchNoVal = Number(document.getElementById('edit-match-no')?.value) || 1;
    const stageVal = document.getElementById('edit-match-stage')?.value || 'GROUP_A';
    const dateVal = document.getElementById('edit-match-date')?.value || fixture.date;
    const timeVal = document.getElementById('edit-match-time')?.value || fixture.time;
    const venueVal = document.getElementById('edit-match-venue')?.value || fixture.venue;
    const twelfthA = document.getElementById('edit-12th-man-a')?.value || '';
    const twelfthB = document.getElementById('edit-12th-man-b')?.value || '';

    fixture.oversLimit = oversVal;
    fixture.matchNo = matchNoVal;
    fixture.stage = stageVal;
    if (stageVal === 'GROUP_A') fixture.groupCode = 'A';
    else if (stageVal === 'GROUP_B') fixture.groupCode = 'B';
    else if (stageVal === 'GROUP_C') fixture.groupCode = 'C';
    else if (stageVal === 'GROUP_D') fixture.groupCode = 'D';

    fixture.date = dateVal;
    fixture.time = timeVal;
    fixture.venue = venueVal;

    if (!fixture.playingXI) fixture.playingXI = {};
    if (!fixture.playingXI[fixture.teamAId]) fixture.playingXI[fixture.teamAId] = {};
    if (!fixture.playingXI[fixture.teamBId]) fixture.playingXI[fixture.teamBId] = {};

    fixture.playingXI[fixture.teamAId].twelfthManId = twelfthA;
    fixture.playingXI[fixture.teamBId].twelfthManId = twelfthB;

    store.updateFixture(fixture);
    removeModal();
    if (typeof onComplete === 'function') onComplete();
    alert("✅ Match settings, overs and lineups updated successfully!");
  });
}
window.openEditMatchModal = openEditMatchModal;

// ============================================================================
// --- 🔨 LIVE AUCTION ARENA, PROJECTOR FULLSCREEN MODE & AUDIO SYNTHESIZER ---
// ============================================================================

// 1. Web Audio Immersion Synthesizer
export function playAuctionAudio(type) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'unsold') {
      // Descending Buzzer Tone for Unsold
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.45);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      return;
    }

    if (type === 'bid') {
      // Ascending Chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'tick') {
      // Wood Clock Tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(1100, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'sold') {
      // Resonant Wooden Gavel Strike
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'triangle';
      const now = ctx.currentTime;
      osc1.frequency.setValueAtTime(180, now);
      osc1.frequency.exponentialRampToValueAtTime(35, now + 0.35);
      gain1.gain.setValueAtTime(0.7, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc1.start(now);
      osc1.stop(now + 0.45);

      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'triangle';
          const t = ctx.currentTime;
          osc2.frequency.setValueAtTime(160, t);
          osc2.frequency.exponentialRampToValueAtTime(30, t + 0.3);
          gain2.gain.setValueAtTime(0.5, t);
          gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
          osc2.start(t);
          osc2.stop(t + 0.35);
        } catch (e) {}
      }, 180);
    }
  } catch (e) {
    console.warn('Audio synthesis fallback:', e);
  }
}

let activeAuction = {
  player: null,
  currentBid: 0,
  leadingTeam: null,
  timerSecs: 30,
  timerInterval: null,
  isSold: false,
  isUnsold: false,
  bidHistory: []
};

export function openNextPlayerAuctionModal(remainingPlayers) {
  document.getElementById('next-player-modal')?.remove();

  const validPlayers = (remainingPlayers || []).filter(p => (p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED') && !p.teamId && p.auctionStatus !== 'SOLD');

  const modalHtml = `
    <div id="next-player-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div class="relative w-full max-w-xl bg-slate-900 text-white rounded-3xl shadow-2xl border border-amber-500/40 p-5 sm:p-6 max-h-[85vh] flex flex-col">
        <div class="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span class="p-1.5 bg-amber-500/20 text-amber-400 rounded-xl">🔨</span> Select Next Player for Auction
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">${validPlayers.length} Approved Players Remaining</p>
          </div>
          <button id="close-next-player-modal-btn" class="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="my-3">
          <input type="text" id="next-player-search" placeholder="🔍 Search player by sl no (e.g. #01), name, category, or village..." class="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:border-amber-400 focus:outline-none" />
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 pr-1" id="next-player-list">
          ${validPlayers.map(p => {
            const sNo = p.displayRegistrationNumber || p.serialNo || '';
            const sNoDisplay = sNo ? `#${String(sNo).padStart(2, '0')}` : '';
            const regId = p.registrationId || p.regNo || ('REG-' + String(sNo || 1).padStart(4, '0'));
            return `
            <div class="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 hover:border-amber-400/60 transition-all next-player-row" data-name="${p.name.toLowerCase()}" data-cat="${(p.category || '').toLowerCase()}" data-serial="${String(sNo)}" data-reg="${regId.toLowerCase()}">
              <div class="flex items-center gap-3 min-w-0">
                <div class="relative shrink-0">
                  <img src="${getOptimizedImageUrl(p.photoUrl || p.player_photo_url, 80, 80)}" class="w-11 h-11 rounded-xl object-cover border border-slate-700" onerror="this.src='assets/card_jsl_user.png'" />
                  ${sNoDisplay ? `
                    <span class="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 bg-red-600 text-white font-mono font-black text-[9px] rounded-md shadow border border-red-400">
                      ${sNoDisplay}
                    </span>
                  ` : ''}
                </div>
                <div class="min-w-0">
                  <div class="font-black text-sm text-white truncate flex items-center gap-1.5">
                    ${sNoDisplay ? `<span class="text-amber-400 font-mono font-bold">${sNoDisplay}</span>` : ''}
                    <span>${p.name}</span>
                  </div>
                  <div class="text-[11px] text-amber-400 font-bold flex items-center gap-1.5 flex-wrap">
                    <span>🏏 ${p.category || 'All Rounder'}</span>
                    <span>•</span>
                    <span class="text-slate-400">📍 ${p.village || 'Paschim Medinipur'}</span>
                    <span>•</span>
                    <span class="text-emerald-400 font-mono font-black">Base: ₹${p.basePrice || 300}</span>
                  </div>
                </div>
              </div>
              <button data-launch-player-id="${p.id}" class="launch-next-auction-btn px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer shrink-0 transition-transform active:scale-95">
                🔨 Start Bid
              </button>
            </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('next-player-modal')?.remove();
  document.getElementById('close-next-player-modal-btn')?.addEventListener('click', removeModal);

  // Search filter
  document.getElementById('next-player-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.next-player-row').forEach(row => {
      const name = row.getAttribute('data-name') || '';
      const cat = row.getAttribute('data-cat') || '';
      const serial = row.getAttribute('data-serial') || '';
      const reg = row.getAttribute('data-reg') || '';
      if (name.includes(q) || cat.includes(q) || serial.includes(q) || reg.includes(q)) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  });

  // Launch auction on click
  document.querySelectorAll('.launch-next-auction-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pId = e.currentTarget.getAttribute('data-launch-player-id');
      const p = store.getPlayerById(pId);
      if (p) {
        removeModal();
        startAuctionForPlayerDirectly(p);
      }
    });
  });
}

export function startAuctionForPlayerDirectly(p) {
  if (activeAuction.timerInterval) clearInterval(activeAuction.timerInterval);

  activeAuction = {
    player: p,
    currentBid: Number(p.basePrice) || 300,
    leadingTeam: null,
    timerSecs: 30,
    timerInterval: null,
    isSold: false,
    isUnsold: false,
    bidHistory: []
  };

  store.updateLiveAuctionState({
    active_player_id: p.id,
    name: p.name,
    photoUrl: p.photoUrl || p.player_photo_url,
    category: p.category || p.playingType || 'All Rounder',
    basePrice: Number(p.basePrice) || 300,
    current_bid: Number(p.basePrice) || 300,
    highest_bidder_team_id: null,
    timer_left: 30,
    status: 'BIDDING',
    registrationId: p.registrationId || p.regNo,
    village: p.village,
    battingStyle: p.battingStyle,
    bowlingStyle: p.bowlingStyle
  });

  // Start 1-second countdown
  activeAuction.timerInterval = setInterval(() => {
    if (activeAuction.timerSecs > 0) {
      activeAuction.timerSecs--;
      if (activeAuction.timerSecs <= 5 && activeAuction.timerSecs > 0) {
        playAuctionAudio('tick');
      }
      updateProjectorModalView();
      const timerBox = document.querySelector('#admin-active-auction-block .text-center .border');
      if (timerBox) {
        timerBox.textContent = `⏱️ ${String(activeAuction.timerSecs).padStart(2, '0')}s`;
        if (activeAuction.timerSecs <= 5) {
          timerBox.className = 'px-3 py-1.5 rounded-xl border font-mono font-black text-lg text-rose-400 animate-pulse border-rose-500 bg-rose-950/50';
        } else if (activeAuction.timerSecs <= 10) {
          timerBox.className = 'px-3 py-1.5 rounded-xl border font-mono font-black text-lg text-amber-400 border-amber-500 bg-amber-950/50';
        }
      }
    }
  }, 1000);

  renderActiveAuctionBlock();
  updateProjectorModalView();
}

export function renderActiveAuctionBlock() {
  const container = document.getElementById('admin-active-auction-block');
  if (!container) return;

  const allTeams = store.getTeams();

  // Restore from store.liveAuctionState if bidding is in progress
  if (!activeAuction.player) {
    const liveState = store.getLiveAuctionStateSync();
    if (liveState && liveState.active_player_id && (liveState.status === 'BIDDING' || liveState.status === 'OPEN' || !liveState.status || liveState.status === 'LIVE')) {
      const p = store.getPlayerById(liveState.active_player_id);
      if (p) {
        activeAuction.player = p;
        activeAuction.currentBid = Number(liveState.current_bid) || Number(p.basePrice) || 300;
        activeAuction.leadingTeam = liveState.highest_bidder_team_id ? store.getTeamById(liveState.highest_bidder_team_id) : null;
        activeAuction.timerSecs = Number(liveState.timer_left) || 30;
      }
    }
  }

  // Asynchronously fetch from cloud if idle to ensure cross-device / refresh recovery
  if (!activeAuction.player && !window._adminLiveAuctionFetched) {
    window._adminLiveAuctionFetched = true;
    store.getLiveAuctionState().then(cloudLive => {
      if (cloudLive && cloudLive.active_player_id && (cloudLive.status === 'BIDDING' || cloudLive.status === 'OPEN' || !cloudLive.status || cloudLive.status === 'LIVE')) {
        const p = store.getPlayerById(cloudLive.active_player_id);
        if (p) {
          activeAuction.player = p;
          activeAuction.currentBid = Number(cloudLive.current_bid) || Number(p.basePrice) || 300;
          activeAuction.leadingTeam = cloudLive.highest_bidder_team_id ? store.getTeamById(cloudLive.highest_bidder_team_id) : null;
          activeAuction.timerSecs = Number(cloudLive.timer_left) || 30;
          renderActiveAuctionBlock();
          updateProjectorModalView();
        }
      }
    }).catch(err => console.warn('Admin live auction cloud sync:', err));
  }

  if (!activeAuction.player) {
    container.innerHTML = `
      <div class="p-6 bg-slate-950/70 rounded-2xl border border-slate-800 text-center space-y-3">
        <div class="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
          <i data-lucide="gavel" class="w-6 h-6"></i>
        </div>
        <div>
          <h4 class="text-sm font-bold text-white">Auction Block is Idle</h4>
          <p class="text-xs text-slate-400">Select an approved player from the left panel or click below to launch bidding.</p>
        </div>
        <button id="quick-open-next-player-btn" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-1.5">
          <i data-lucide="user-plus" class="w-4 h-4"></i> Pick Next Player from Queue
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    document.getElementById('quick-open-next-player-btn')?.addEventListener('click', () => {
      const remainingUnsold = store.getPlayers().filter(pl => (pl.registrationStatus === 'APPROVED' || pl.paymentStatus === 'APPROVED') && !pl.teamId && pl.auctionStatus !== 'SOLD');
      openNextPlayerAuctionModal(remainingUnsold);
    });
    return;
  }

  const p = activeAuction.player;
  const timerClass = activeAuction.timerSecs <= 5 ? 'text-rose-400 animate-pulse border-rose-500 bg-rose-950/50' : activeAuction.timerSecs <= 10 ? 'text-amber-400 border-amber-500 bg-amber-950/50' : 'text-emerald-400 border-emerald-500 bg-emerald-950/50';

  // Calculate Next Increment (If no team has bid yet, next bid is the Base Price; otherwise +50 under 1000, +100 at/above 1000)
  const isOpeningBid = !activeAuction.leadingTeam;
  const inc = activeAuction.currentBid < 1000 ? 50 : 100;
  const nextInc = isOpeningBid ? 0 : inc;
  const nextBidAmount = isOpeningBid ? activeAuction.currentBid : (activeAuction.currentBid + inc);

  container.innerHTML = `
    <div class="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
      
      <!-- Top Badges Row: Clear Bid Button & Serial Box -->
      <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <button type="button" id="auction-quick-cancel-btn" class="px-3 py-1.5 bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-600 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow transition-all active:scale-95">
          <i data-lucide="ban" class="w-3.5 h-3.5"></i> 🚫 Clear Bid
        </button>

        <span class="px-3.5 py-1.5 bg-red-600 text-white font-black font-mono text-xs sm:text-sm rounded-xl border-2 border-red-400 shadow-md">
          ${p.registrationId || p.regNo || ('REG-' + String(p.displayRegistrationNumber || p.serialNo || 1).padStart(4, '0'))}
        </span>
      </div>

      <!-- Player Info & Big Timer -->
      <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div class="flex items-center gap-3">
          <img src="${getOptimizedImageUrl(p.photoUrl || p.player_photo_url, 120, 120)}" class="w-12 h-12 rounded-xl object-cover border border-amber-500/50 shadow" onerror="this.src='assets/card_jsl_user.png'" />
          <div>
            <h4 class="text-sm sm:text-base font-black text-white">${p.name}</h4>
            <div class="text-[10px] text-amber-400 font-bold flex items-center gap-1.5">
              <span>🏏 ${p.category || 'All Rounder'}</span>
              <span>•</span>
              <span>📍 ${p.village || 'Paschim Medinipur'}</span>
              <span>•</span>
              <span>Base: ₹${p.basePrice || 300}</span>
            </div>
          </div>
        </div>

        <div class="text-center">
          <div class="px-3 py-1.5 rounded-xl border font-mono font-black text-lg ${timerClass}">
            ⏱️ ${String(activeAuction.timerSecs).padStart(2, '0')}s
          </div>
        </div>
      </div>

      <!-- Current Bid & Leading Team (High-Impact Red Display & LEADER BIDDER 🔥) -->
      <div class="grid grid-cols-2 gap-3">
        <div class="p-3.5 bg-slate-900/95 rounded-2xl border-2 sm:border-3 border-amber-400 text-center shadow-lg">
          <span class="text-[10px] sm:text-xs font-black text-amber-300 uppercase tracking-widest block">CURRENT LIVE BID</span>
          <div class="text-3xl sm:text-5xl font-black text-red-500 font-mono mt-1 drop-shadow-[0_4px_18px_rgba(239,68,68,0.85)] live-bid-ambient-blink">
            ₹ ${activeAuction.currentBid.toLocaleString('en-IN')}
          </div>
          <span class="text-[10px] sm:text-xs text-amber-300/90 font-mono font-bold block mt-0.5">${isOpeningBid ? 'Opening: ₹' + activeAuction.currentBid : 'Next Bid: +₹' + nextInc + ' (₹' + nextBidAmount + ')'}</span>
        </div>
        <div class="p-3.5 bg-slate-900/95 rounded-2xl border-2 sm:border-3 border-slate-700 text-center shadow-lg flex flex-col justify-center">
          <span class="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1">
            LEADER BIDDER 🔥
          </span>
          <div class="text-lg sm:text-2xl font-black text-white truncate mt-1 tracking-wide">
            ${activeAuction.leadingTeam ? `🛡️ ${activeAuction.leadingTeam.name}` : '<span class="text-slate-500 italic text-sm sm:text-base">Opening Bid (₹' + (p.basePrice || 300) + ')</span>'}
          </div>
        </div>
      </div>

      <!-- 1-CLICK TEAM BID BUTTONS (Auto Increment +50 / +100) -->
      <div>
        <div class="flex justify-between items-center mb-1.5">
          <label class="block text-[10px] font-black text-slate-300 uppercase tracking-wider">⚡ 1-Click Team Bidding (${isOpeningBid ? 'Base Price Opening' : '+₹' + nextInc + ' rule'})</label>
          <span class="text-[10px] text-amber-400 font-mono font-bold">${isOpeningBid ? 'Open Bid: ₹' + activeAuction.currentBid : 'Next: ₹' + nextBidAmount}</span>
        </div>
        
        <div class="grid grid-cols-2 gap-2">
          ${allTeams.map(t => {
            const rem = t.remainingPurse !== undefined ? t.remainingPurse : (t.purseBudget || 8000);
            const isLeading = activeAuction.leadingTeam && activeAuction.leadingTeam.id === t.id;
            const canAfford = rem >= nextBidAmount;
            const isFull = (t.squadCount || 0) >= 13;
            const isDisabled = (!canAfford || isFull || isLeading);

            return `
              <button 
                data-bid-team-id="${t.id}" 
                ${isDisabled ? 'disabled' : ''} 
                class="auction-team-bid-btn p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isLeading 
                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/80 shadow-lg' 
                    : isDisabled 
                      ? 'bg-slate-900/40 border-slate-800/80 opacity-50 cursor-not-allowed' 
                      : 'bg-slate-900 hover:bg-slate-800 hover:border-amber-400 border-slate-700 active:scale-95 shadow-md'
                }">
                <div class="flex items-center justify-between gap-1 mb-1">
                  <span class="font-black text-xs text-white truncate" title="${t.name}">🛡️ ${t.name}</span>
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isLeading ? 'bg-amber-400 text-slate-950 animate-pulse font-black' : 'bg-slate-800 text-slate-300'}">
                    ${isLeading ? '👑 LEADING' : `${t.squadCount || 0}/13`}
                  </span>
                </div>
                <div class="flex items-center justify-between text-[11px] mt-0.5 pt-1 border-t border-slate-800/80">
                  <span class="text-slate-400 font-semibold">Purse: ₹${rem}</span>
                  <span class="font-black ${isLeading ? 'text-amber-300' : isDisabled ? 'text-slate-500' : 'text-emerald-400'}">
                    ${isLeading ? 'Top Offer' : isDisabled ? (isFull ? 'Roster Full' : 'Low Purse') : (isOpeningBid ? '⚡ Open (₹' + nextBidAmount + ')' : `+₹${nextInc} (₹${nextBidAmount})`)}
                  </span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Auctioneer Action Controls -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800">
        <button id="auction-cancel-active-btn" class="py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/80 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95">
          <i data-lucide="ban" class="w-4 h-4"></i> 🚫 Clear Bid
        </button>
        <button id="auction-undo-bid-btn" ${(activeAuction.bidHistory && activeAuction.bidHistory.length > 0) ? '' : 'disabled'} class="py-2.5 ${(activeAuction.bidHistory && activeAuction.bidHistory.length > 0) ? 'bg-amber-950 hover:bg-amber-900 text-amber-300 border-amber-700 cursor-pointer shadow-md' : 'bg-slate-900/50 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'} font-black text-xs rounded-xl border flex items-center justify-center gap-1.5 transition-all">
          <i data-lucide="undo-2" class="w-4 h-4"></i> ↩️ Undo Bid
        </button>
        <button id="auction-mark-sold-btn" class="py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer">
          <i data-lucide="check-circle-2" class="w-4 h-4"></i> 🔨 Mark SOLD
        </button>
        <button id="auction-mark-unsold-btn" class="py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-400 font-black text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer">
          <i data-lucide="x-circle" class="w-4 h-4"></i> ❌ UNSOLD
        </button>
        <button id="auction-open-projector-btn" onclick="window.openLiveAuctionProjectorView ? window.openLiveAuctionProjectorView() : (typeof openAuctionProjectorModal === 'function' ? openAuctionProjectorModal() : null)" class="py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer col-span-2 sm:col-span-1">
          <i data-lucide="tv" class="w-4 h-4"></i> 📽️ Projector
        </button>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Attach 1-Click Team Bidding
  container.querySelectorAll('.auction-team-bid-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-bid-team-id');
      const team = store.getTeamById(teamId);
      if (!team) return;

      const isOpening = !activeAuction.leadingTeam;
      const inc = activeAuction.currentBid < 1000 ? 50 : 100;
      const newBid = isOpening ? activeAuction.currentBid : (activeAuction.currentBid + inc);

      if (team.remainingPurse < newBid) {
        alert(`Franchise ${team.name} has only ₹${team.remainingPurse} remaining and cannot place a bid of ₹${newBid}!`);
        return;
      }
      if ((team.squadCount || 0) >= 13) {
        alert(`Franchise ${team.name} already has a full squad of 13 players!`);
        return;
      }

      if (!activeAuction.bidHistory) activeAuction.bidHistory = [];
      activeAuction.bidHistory.push({
        currentBid: activeAuction.currentBid,
        leadingTeam: activeAuction.leadingTeam,
        timerSecs: activeAuction.timerSecs
      });

      activeAuction.currentBid = newBid;
      activeAuction.leadingTeam = team;
      activeAuction.timerSecs = 30; // Reset timer on bid

      if (activeAuction.player) {
        store.updateLiveAuctionState({
          active_player_id: activeAuction.player.id,
          name: activeAuction.player.name,
          photoUrl: activeAuction.player.photoUrl || activeAuction.player.player_photo_url,
          category: activeAuction.player.category || activeAuction.player.playingType || 'All Rounder',
          basePrice: Number(activeAuction.player.basePrice) || 300,
          current_bid: activeAuction.currentBid,
          highest_bidder_team_id: team.id,
          timer_left: 30,
          status: 'BIDDING',
          registrationId: activeAuction.player.registrationId || activeAuction.player.regNo,
          village: activeAuction.player.village,
          battingStyle: activeAuction.player.battingStyle,
          bowlingStyle: activeAuction.player.bowlingStyle
        });
      }

      playAuctionAudio('bid');
      renderActiveAuctionBlock();
      updateProjectorModalView();
    });
  });

  // Attach Cancel / Clear Active Bid Player
  const cancelActiveAuctionHandler = () => {
    if (!activeAuction.player) return;
    const playerToCancel = activeAuction.player;

    const confirmed = confirm(`🚫 Cancel & Clear Active Bidding:\n\nAre you sure you want to clear the active bidding for "${playerToCancel.name}"?\n\n• Player will return to the auction queue.\n• The active auction block will be cleared for all devices.\n• Any current bids on this player will be reset.\n\nClick OK to clear or Cancel to keep bidding.`);
    if (!confirmed) return;

    if (activeAuction.timerInterval) clearInterval(activeAuction.timerInterval);

    // Reset local auction state
    activeAuction = { player: null, currentBid: 0, leadingTeam: null, timerSecs: 30, timerInterval: null, isSold: false, isUnsold: false, bidHistory: [] };

    // Reset cloud live auction state so all phones clear the block immediately
    store.updateLiveAuctionState({
      status: 'IDLE',
      active_player_id: null,
      name: null,
      current_bid: 0,
      highest_bidder_team_id: null,
      timer_left: 0,
      updated_at: Date.now()
    });

    alert(`✅ Active bidding cleared for "${playerToCancel.name}". Player returned to the available queue.`);
    renderActiveAuctionBlock();
    updateProjectorModalView();
  };

  document.getElementById('auction-cancel-active-btn')?.addEventListener('click', cancelActiveAuctionHandler);
  document.getElementById('auction-quick-cancel-btn')?.addEventListener('click', cancelActiveAuctionHandler);

  // Attach Undo Bid
  document.getElementById('auction-undo-bid-btn')?.addEventListener('click', () => {
    if (!activeAuction.bidHistory || activeAuction.bidHistory.length === 0) return;
    const prev = activeAuction.bidHistory.pop();
    activeAuction.currentBid = prev.currentBid;
    activeAuction.leadingTeam = prev.leadingTeam;
    activeAuction.timerSecs = 30;

    if (activeAuction.player) {
      store.updateLiveAuctionState({
        active_player_id: activeAuction.player.id,
        name: activeAuction.player.name,
        photoUrl: activeAuction.player.photoUrl || activeAuction.player.player_photo_url,
        category: activeAuction.player.category || activeAuction.player.playingType || 'All Rounder',
        basePrice: Number(activeAuction.player.basePrice) || 300,
        current_bid: activeAuction.currentBid,
        highest_bidder_team_id: activeAuction.leadingTeam ? activeAuction.leadingTeam.id : null,
        timer_left: 30,
        status: activeAuction.leadingTeam ? 'BIDDING' : 'OPEN',
        registrationId: activeAuction.player.registrationId || activeAuction.player.regNo,
        village: activeAuction.player.village,
        battingStyle: activeAuction.player.battingStyle,
        bowlingStyle: activeAuction.player.bowlingStyle
      });
    }

    renderActiveAuctionBlock();
    updateProjectorModalView();
  });

  // Attach Mark SOLD (With Safety Confirmation)
  document.getElementById('auction-mark-sold-btn')?.addEventListener('click', async () => {
    if (!activeAuction.leadingTeam) {
      alert("No team has placed a bid yet! Mark as Unsold or place a bid.");
      return;
    }
    const team = activeAuction.leadingTeam;
    const price = activeAuction.currentBid;

    const confirmed = confirm(`🔨 Confirm Player Sale:\n\nAre you sure you want to mark "${p.name}" as SOLD to "${team.name}" for ₹${price.toLocaleString('en-IN')}?\n\nClick OK to confirm or Cancel to revert.`);
    if (!confirmed) return;

    // Stop timer
    if (activeAuction.timerInterval) clearInterval(activeAuction.timerInterval);

    playAuctionAudio('sold');

    // 1. Broadcast SOLD stamp IMMEDIATELY to all spectator phones, projector and admin screen
    await store.updateLiveAuctionState({
      status: 'SOLD',
      is_sold: true,
      active_player_id: p.id,
      name: p.name,
      photoUrl: p.photoUrl || p.player_photo_url,
      current_bid: price,
      sold_price: price,
      highest_bidder_team_id: team.id,
      highest_bidder_team_name: team.name,
      last_sold_player_id: p.id,
      last_sold_price: price,
      last_sold_team_id: team.id,
      updated_at: Date.now()
    });

    activeAuction.isSold = true;
    renderActiveAuctionBlock();
    updateProjectorModalView();

    // 2. Update player and team database records atomically via store.assignPlayerToTeam
    store.assignPlayerToTeam(p.id, team.id, price);

    // 3. Keep SOLD stamp visible continuously on screen until admin selects the next player
    setTimeout(() => {
      // Check remaining players and auto-open selector modal for admin convenience
      const remainingUnsold = store.getPlayers().filter(pl => (pl.registrationStatus === 'APPROVED' || pl.paymentStatus === 'APPROVED') && !pl.teamId && pl.auctionStatus !== 'SOLD' && pl.auctionStatus !== 'UNSOLD');
      if (remainingUnsold.length > 0) {
        openNextPlayerAuctionModal(remainingUnsold);
      } else {
        alert("🏆 ALL APPROVED PLAYERS AUCTIONED! Auction is now complete.");
      }
    }, 2000);
  });

  // Attach Mark UNSOLD
  document.getElementById('auction-mark-unsold-btn')?.addEventListener('click', async () => {
    if (confirm(`Mark "${p.name}" as UNSOLD for this round?`)) {
      if (activeAuction.timerInterval) clearInterval(activeAuction.timerInterval);

      // 1. FIRST Broadcast UNSOLD stamp IMMEDIATELY to all spectator phones, projector and admin screen
      await store.updateLiveAuctionState({
        status: 'UNSOLD',
        is_unsold: true,
        active_player_id: p.id,
        name: p.name,
        photoUrl: p.photoUrl || p.player_photo_url,
        current_bid: 0,
        highest_bidder_team_id: null,
        last_unsold_player_id: p.id,
        updated_at: Date.now()
      });

      activeAuction.isUnsold = true;
      renderActiveAuctionBlock();
      updateProjectorModalView();

      // 2. Then update player database record via store.markPlayerUnsold
      store.markPlayerUnsold(p.id);

      // 3. Keep UNSOLD stamp visible continuously on screen until admin selects the next player
      setTimeout(() => {
        const remainingUnsold = store.getPlayers().filter(pl => (pl.registrationStatus === 'APPROVED' || pl.paymentStatus === 'APPROVED') && !pl.teamId && pl.auctionStatus !== 'SOLD' && pl.auctionStatus !== 'UNSOLD');
        if (remainingUnsold.length > 0) {
          openNextPlayerAuctionModal(remainingUnsold);
        }
      }, 2000);
    }
  });

  // Attach Projector View Button
  document.getElementById('auction-open-projector-btn')?.addEventListener('click', () => {
    if (window.openLiveAuctionProjectorView) {
      window.openLiveAuctionProjectorView();
    } else {
      openAuctionProjectorModal();
    }
  });
}

export function openAuctionProjectorModal() {
  document.getElementById('auction-projector-modal')?.remove();

  const p = activeAuction.player;
  const pName = p ? p.name : 'Waiting for Player...';
  const pPhoto = p ? getOptimizedImageUrl(p.photoUrl || p.player_photo_url, 400, 400) : 'assets/card_jsl_user.png';
  const activeTourney = store.getCustomTournaments().find(t => (t.supabaseId || t.id) === store.activeTournamentId) || {};
  const projTourneyName = activeTourney.name || 'Tournament';
  const projTourneyLogo = activeTourney.posterUrl || 'assets/jsl_logo.jpg';
  const pCat = p ? (p.category || 'All Rounder') : projTourneyName;
  const pVillage = p ? (p.village || 'Paschim Medinipur') : 'Cricket Ground';
  const pBase = p ? (p.basePrice || 300) : 300;

  const modalHtml = `
    <div id="auction-projector-modal" class="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 animate-fade-in select-none">
      
      <!-- Top Broadcast Header -->
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div class="flex items-center gap-3">
          <img src="${projTourneyLogo}" class="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow" onerror="this.src='assets/jsl_logo.jpg'" />
          <div>
            <span class="text-[10px] sm:text-xs font-black tracking-widest text-amber-400 uppercase">${projTourneyName.toUpperCase()}</span>
            <h2 class="text-base sm:text-2xl font-black text-white uppercase tracking-wide">GRAND PLAYER AUCTION ARENA</h2>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button id="projector-cancel-bid-btn" class="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-xs rounded-xl border border-rose-700 flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="ban" class="w-4 h-4"></i> <span>🚫 Clear Bid</span>
          </button>
          <button id="projector-fullscreen-toggle-btn" class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="maximize" class="w-4 h-4"></i> <span>Fullscreen (F11)</span>
          </button>
          <button id="projector-close-btn" class="p-2 bg-red-950 hover:bg-red-900 text-red-400 rounded-xl border border-red-800 cursor-pointer">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
      </div>

      <!-- Main Stage -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 my-auto items-center">
        
        <!-- Left: Player HD Portrait Card (5 Cols) -->
        <div class="md:col-span-5 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 rounded-3xl border-2 border-emerald-500/50 shadow-2xl relative overflow-hidden">
          <div class="w-full flex items-center justify-end mb-2">
            <span class="px-3.5 py-1.5 bg-red-600 text-white font-black font-mono text-xs sm:text-sm rounded-xl border-2 border-red-400 shadow-lg">
              ${p ? (p.registrationId || p.regNo || ('REG-' + String(p.displayRegistrationNumber || p.serialNo || 1).padStart(4, '0'))) : 'READY'}
            </span>
          </div>
          <img id="proj-player-img" src="${pPhoto}" class="w-48 h-48 sm:w-64 sm:h-64 object-cover rounded-3xl border-4 border-white shadow-2xl my-3" onerror="this.src='assets/card_jsl_user.png'" />
          <h1 id="proj-player-name" class="text-2xl sm:text-4xl font-black text-white tracking-wide">${pName}</h1>
          <div class="flex items-center justify-center gap-2 mt-2">
            <span id="proj-player-cat" class="px-3 py-1 bg-sky-500/20 text-sky-400 font-bold text-xs sm:text-sm rounded-xl border border-sky-500/40">🏏 ${pCat}</span>
            <span id="proj-player-village" class="px-3 py-1 bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm rounded-xl border border-slate-700">📍 ${pVillage}</span>
          </div>
          <div class="mt-3 text-xs text-amber-400 font-bold">
            Base Price: ₹<span id="proj-player-base">${pBase}</span>
          </div>
        </div>

        <!-- Right: Live Bid & Countdown Timer Stage (7 Cols) -->
        <div class="md:col-span-7 flex flex-col justify-center space-y-6">
          
          <!-- Massive Live Bid Display -->
          <div class="p-6 sm:p-8 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-3xl border-2 border-amber-400/80 shadow-2xl text-center backdrop-blur-md">
            <span class="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-widest">CURRENT HIGHEST BID</span>
            <div id="proj-current-bid" class="text-4xl sm:text-7xl font-black text-amber-400 font-mono tracking-tight my-2 drop-shadow-md">
              ₹ ${activeAuction.currentBid.toLocaleString('en-IN')}
            </div>
            
            <!-- Leading Team Pill -->
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-slate-950/80 rounded-2xl border border-amber-400/50 shadow mt-1">
              <span class="text-xs text-slate-400 font-bold uppercase">Leading Franchise:</span>
              <span id="proj-leading-team" class="text-sm sm:text-base font-black text-white">
                ${activeAuction.leadingTeam ? `🛡️ ${activeAuction.leadingTeam.name}` : 'Waiting for Opening Bid...'}
              </span>
            </div>
          </div>

          <!-- Bottom: 30s Big Clock -->
          <div class="flex items-center justify-between p-4 sm:p-6 bg-slate-900/80 rounded-3xl border border-slate-800">
            <div>
              <span class="text-xs font-black text-slate-400 uppercase tracking-wider block">AUCTION COUNTDOWN</span>
              <p class="text-[11px] text-slate-500">Hammer falls at 0 seconds</p>
            </div>
            <div id="proj-timer-box" class="px-6 py-2 bg-black/80 rounded-2xl border-2 border-emerald-400 text-3xl sm:text-5xl font-mono font-black text-emerald-400 shadow-inner">
              ${String(activeAuction.timerSecs).padStart(2, '0')}s
            </div>
          </div>

        </div>

      </div>

      <!-- Footer Info -->
      <div class="text-center text-xs text-slate-500 border-t border-slate-900 pt-3">
        Official Tournament Ground: ${activeTourney.venue || 'TBD'} • Live Stream Powered by ${projTourneyName}
      </div>

    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeProjModal = () => document.getElementById('auction-projector-modal')?.remove();
  document.getElementById('projector-close-btn')?.addEventListener('click', removeProjModal);

  document.getElementById('projector-cancel-bid-btn')?.addEventListener('click', () => {
    if (!activeAuction.player) return;
    const playerToCancel = activeAuction.player;

    const confirmed = confirm(`🚫 Cancel & Clear Active Bidding:\n\nAre you sure you want to clear the active bidding for "${playerToCancel.name}"?\n\n• Player will return to the auction queue.\n• The active auction block will be cleared for all devices.\n• Any current bids on this player will be reset.`);
    if (!confirmed) return;

    if (activeAuction.timerInterval) clearInterval(activeAuction.timerInterval);

    activeAuction = { player: null, currentBid: 0, leadingTeam: null, timerSecs: 30, timerInterval: null, isSold: false, isUnsold: false, bidHistory: [] };

    store.updateLiveAuctionState({
      status: 'IDLE',
      active_player_id: null,
      name: null,
      current_bid: 0,
      highest_bidder_team_id: null,
      timer_left: 0,
      updated_at: Date.now()
    });

    alert(`✅ Active bidding cleared for "${playerToCancel.name}".`);
    removeProjModal();
    renderActiveAuctionBlock();
  });

  document.getElementById('projector-fullscreen-toggle-btn')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  });
}

function updateProjectorModalView() {
  const modal = document.getElementById('auction-projector-modal');
  if (!modal) return;

  const p = activeAuction.player;
  const bidEl = document.getElementById('proj-current-bid');
  const teamEl = document.getElementById('proj-leading-team');
  const timerEl = document.getElementById('proj-timer-box');

  if (bidEl) bidEl.textContent = `₹ ${activeAuction.currentBid.toLocaleString('en-IN')}`;
  if (teamEl) teamEl.textContent = activeAuction.leadingTeam ? `🛡️ ${activeAuction.leadingTeam.name}` : 'Waiting for Opening Bid...';
  if (timerEl) {
    timerEl.textContent = `${String(activeAuction.timerSecs).padStart(2, '0')}s`;
    if (activeAuction.timerSecs <= 5) {
      timerEl.className = 'px-6 py-2 bg-rose-950/80 rounded-2xl border-2 border-rose-500 text-3xl sm:text-5xl font-mono font-black text-rose-400 shadow-inner animate-pulse';
    } else if (activeAuction.timerSecs <= 10) {
      timerEl.className = 'px-6 py-2 bg-amber-950/80 rounded-2xl border-2 border-amber-500 text-3xl sm:text-5xl font-mono font-black text-amber-400 shadow-inner';
    } else {
      timerEl.className = 'px-6 py-2 bg-black/80 rounded-2xl border-2 border-emerald-400 text-3xl sm:text-5xl font-mono font-black text-emerald-400 shadow-inner';
    }
  }
}

// Attach Put Player on Block Listener in Dashboard Setup
export function initAuctionStartListener() {
  document.getElementById('auction-start-bid-btn')?.addEventListener('click', () => {
    const selectEl = document.getElementById('auction-select-player');
    const pId = selectEl?.value;
    if (!pId) {
      alert("Please select an approved player from the dropdown first!");
      return;
    }
    const player = store.getPlayerById(pId);
    if (!player) return;

    if (activeAuction.timerInterval) clearInterval(activeAuction.timerInterval);

    activeAuction = {
      player: player,
      currentBid: Number(player.basePrice) || 300,
      leadingTeam: null,
      timerSecs: 30,
      timerInterval: null,
      isSold: false,
      isUnsold: false
    };
    store.updateLiveAuctionState({
      active_player_id: player.id,
      name: player.name,
      photoUrl: player.photoUrl || player.player_photo_url,
      category: player.category || player.playingType || 'All Rounder',
      basePrice: Number(player.basePrice) || 300,
      current_bid: Number(player.basePrice) || 300,
      highest_bidder_team_id: null,
      timer_left: 30,
      status: 'BIDDING',
      registrationId: player.registrationId || player.regNo,
      village: player.village,
      battingStyle: player.battingStyle,
      bowlingStyle: player.bowlingStyle
    });

    // Start 1-second countdown
    activeAuction.timerInterval = setInterval(() => {
      if (activeAuction.timerSecs > 0) {
        activeAuction.timerSecs--;
        if (activeAuction.timerSecs <= 5 && activeAuction.timerSecs > 0) {
          playAuctionAudio('tick');
        }
        updateProjectorModalView();
        const timerBox = document.querySelector('#admin-active-auction-block .text-center .border');
        if (timerBox) {
          timerBox.textContent = `⏱️ ${String(activeAuction.timerSecs).padStart(2, '0')}s`;
          if (activeAuction.timerSecs <= 5) {
            timerBox.className = 'px-3 py-1.5 rounded-xl border font-mono font-black text-lg text-rose-400 animate-pulse border-rose-500 bg-rose-950/50';
          } else if (activeAuction.timerSecs <= 10) {
            timerBox.className = 'px-3 py-1.5 rounded-xl border font-mono font-black text-lg text-amber-400 border-amber-500 bg-amber-950/50';
          }
        }
      }
    }, 1000);

    renderActiveAuctionBlock();
  });
}

// --- DYNAMIC PARTNER ADVERTISEMENT ADMIN CONTROLLER PANEL ---
export async function renderAdminShopAdsPanel() {
  const container = document.getElementById('admin-ads-panel-container');
  if (!container) return;

  // 1. Fetch current settings from database
  container.innerHTML = `
    <div class="text-center py-6 text-slate-400 text-xs">
      <i data-lucide="loader" class="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500"></i>
      Loading Popup Settings from Cloud...
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  const settings = await fetchPopupSettingsFromCloud();

  // 2. Render control options
  const isSnoozed = settings.adExpiryTime && Date.now() < settings.adExpiryTime;
  const statusBadge = settings.isAdPopupEnabled 
    ? (isSnoozed 
        ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">Paused (Snoozed)</span>` 
        : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 Active (Showing)</span>`)
    : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700/50">🔴 Inactive (Off)</span>`;

  let snoozeStatusInfo = '';
  if (isSnoozed) {
    const expiryDate = new Date(settings.adExpiryTime).toLocaleString();
    snoozeStatusInfo = `<p class="text-[11px] text-amber-400 font-semibold mt-1">Snoozed until: ${expiryDate}</p>`;
  }

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- Current Status Card -->
      <div class="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
        <div>
          <p class="text-xs text-slate-500 uppercase tracking-wider font-bold">Ad Status</p>
          <div class="flex items-center gap-2 mt-1">
            <h4 class="text-base font-bold text-slate-900">Homepage Shop Ad Popup</h4>
            ${statusBadge}
          </div>
          ${snoozeStatusInfo}
        </div>
      </div>

      <div class="space-y-6">
        
        <!-- SECTION 1: GLOBAL POPUP SWITCHES -->
        <div class="bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-sm space-y-4">
          <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">🌐 Site-Wide Popup Toggles</h4>
          
          <!-- Welcome Popup Toggle -->
          <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p class="text-xs font-bold text-slate-900">🏠 First-Visit Welcome & App Install Modal</p>
              <p class="text-[10px] text-slate-500 mt-0.5">Show a registration welcome & app install instruction prompt to first-time visitors.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="admin-welcome-popup-toggle" class="sr-only peer" ${settings.isWelcomePopupEnabled === true ? 'checked' : ''}>
              <div class="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <!-- WhatsApp Popup Toggle -->
          <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p class="text-xs font-bold text-slate-900">💬 WhatsApp Group Join Invitation</p>
              <p class="text-[10px] text-slate-500 mt-0.5">Prompt users to join the official WhatsApp group when they open the Tournament Hub page.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="admin-whatsapp-popup-toggle" class="sr-only peer" ${settings.isWhatsAppPopupEnabled === true ? 'checked' : ''}>
              <div class="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <!-- Real-time Registered Player Toast Toggle -->
          <div class="flex items-center justify-between p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200">
            <div>
              <p class="text-xs font-bold text-slate-900 flex items-center gap-1.5">⚡ Real-Time Registered Player Toast Pop-Up <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[9px] rounded-full border border-emerald-300">NEW</span></p>
              <p class="text-[10px] text-slate-500 mt-0.5">SHOW or HOLD/PAUSE the live floating popup displaying the last 5 registered players on the website.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="admin-realtime-toast-toggle" class="sr-only peer" ${settings.isRealtimePlayerToastEnabled === true ? 'checked' : ''}>
              <div class="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <!-- Live Tournament Countdown Banner Toggle -->
          <div class="flex items-center justify-between p-3.5 bg-amber-50/50 rounded-xl border border-amber-200">
            <div>
              <p class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span class="p-1 rounded bg-amber-500 text-slate-950"><i data-lucide="clock" class="w-3.5 h-3.5"></i></span>
                <span>Live Tournament Countdown Banner (Homepage Top)</span>
                <span class="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono text-[9px] rounded-full border border-amber-300">TOP BANNER</span>
              </p>
              <p class="text-[10px] text-slate-500 mt-0.5">SHOW or HIDE the 31 August 2026 Tournament Countdown Clock at the top of the homepage.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="admin-countdown-banner-toggle" class="sr-only peer" ${settings.isCountdownEnabled === true ? 'checked' : ''}>
              <div class="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <!-- YouTube Digital Class Channel Promo Popup Controller -->
          <div class="flex items-center justify-between p-3.5 bg-red-50/50 rounded-xl border border-red-200">
            <div>
              <p class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span class="p-1 rounded bg-red-600 text-white"><i data-lucide="youtube" class="w-3.5 h-3.5"></i></span>
                <span>YouTube Digital Class Channel Promotional Pop-Up</span>
                <span class="px-2 py-0.5 bg-red-100 text-red-800 font-mono text-[9px] rounded-full border border-red-300">POPUP BANNER</span>
              </p>
              <p class="text-[10px] text-slate-500 mt-0.5">Toggle auto-popup for competitive exams coaching channel on visitor page load.</p>
              <div class="mt-2.5">
                <button type="button" id="admin-preview-youtube-promo-btn" class="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                  <i data-lucide="eye" class="w-3.5 h-3.5"></i> Preview / Test YouTube Popup Now
                </button>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="admin-youtube-popup-toggle" class="sr-only peer" ${settings.isYouTubePromoEnabled === true ? 'checked' : ''}>
              <div class="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>

        <!-- SECTION 2: ADVERTISEMENT POPUP CONFIGURATION -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-sm">
          
          <div class="space-y-4">
            <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">📢 Shop Ad Configuration</h4>
            
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Select Partner Shops to Promote (Select multiple to show in carousel)</label>
              <div class="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                ${shops.map(shop => {
                  const isChecked = (settings.promotedShopIds && settings.promotedShopIds.includes(shop.id)) 
                    || (!settings.promotedShopIds && settings.promotedShopId === shop.id);
                  return `
                    <label class="flex items-center space-x-3 text-slate-900 text-xs font-bold cursor-pointer hover:text-emerald-700 transition-colors py-1">
                      <input type="checkbox" name="promoted-shop-checkbox" value="${shop.id}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 focus:ring-offset-white border-slate-300 bg-white">
                      <span>${shop.name} (${shop.type === 'restaurant' ? 'Food/Kitchen' : shop.type === 'rice' ? 'Rice Bhandar' : 'Hardware & Sanitation'})</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>

            <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p class="text-xs font-bold text-slate-900">Enable Ad Auto-Popup on Load</p>
                <p class="text-[10px] text-slate-500 mt-0.5">Toggle whether users landing on your site see this ad popup.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="admin-ad-toggle" class="sr-only peer" ${settings.isAdPopupEnabled === true && !isSnoozed ? 'checked' : ''}>
                <div class="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          <div class="space-y-3 justify-center flex flex-col">
            <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">Quick Ad Actions</h4>
            <div class="grid grid-cols-1 gap-2">
              <button id="admin-ad-turn-on-btn" class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 border border-amber-400 cursor-pointer">
                <i data-lucide="play-circle" class="w-4 h-4 text-white"></i> Save & Turn Ad On Now
              </button>
              <button id="admin-ad-turn-off-btn" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <i data-lucide="stop-circle" class="w-4 h-4"></i> Turn Ad Off Completely
              </button>
              <button id="admin-ad-pause-month-btn" class="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-xs rounded-xl border border-red-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <i data-lucide="clock" class="w-4 h-4"></i> Pause Ad for 1 Month
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  const getCheckedShopIds = () => {
    const checked = document.querySelectorAll('input[name="promoted-shop-checkbox"]:checked');
    return Array.from(checked).map(cb => cb.value);
  };

  const updatePopupSettingField = async (field, value) => {
    const current = await fetchPopupSettingsFromCloud();
    const shopIds = getCheckedShopIds();
    const payload = {
      ...current,
      [field]: value,
      promotedShopIds: shopIds.length > 0 ? shopIds : current.promotedShopIds,
      updated_at: Date.now()
    };
    await savePopupSettingsToCloud(payload);
    
    // Smooth status badge refresh without full panel rebuild
    const isSnoozed = payload.adExpiryTime && Date.now() < payload.adExpiryTime;
    const badgeContainer = container.querySelector('h4.text-base.font-bold + *');
    if (badgeContainer) {
      badgeContainer.outerHTML = payload.isAdPopupEnabled 
        ? (isSnoozed 
            ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">Paused (Snoozed)</span>` 
            : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 Active (Showing)</span>`)
        : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700/50">🔴 Inactive (Off)</span>`;
    }
  };

  // BIND BUTTON LISTENERS
  document.getElementById('admin-ad-turn-on-btn')?.addEventListener('click', async () => {
    const shopIds = getCheckedShopIds();
    if (shopIds.length === 0) {
      alert("⚠️ Please select at least one shop to promote.");
      return;
    }
    const toggleEl = document.getElementById('admin-ad-toggle');
    if (toggleEl) toggleEl.checked = true;
    await updatePopupSettingField('isAdPopupEnabled', true);
    alert("✅ Advertisement popup turned ON!");
  });

  document.getElementById('admin-ad-turn-off-btn')?.addEventListener('click', async () => {
    const toggleEl = document.getElementById('admin-ad-toggle');
    if (toggleEl) toggleEl.checked = false;
    await updatePopupSettingField('isAdPopupEnabled', false);
    alert("✅ Advertisement popup turned OFF completely!");
  });

  document.getElementById('admin-ad-pause-month-btn')?.addEventListener('click', async () => {
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    const current = await fetchPopupSettingsFromCloud();
    await savePopupSettingsToCloud({
      ...current,
      isAdPopupEnabled: true,
      adExpiryTime: Date.now() + ONE_MONTH_MS,
      updated_at: Date.now()
    });
    alert("✅ Advertisements paused for 30 days!");
    renderAdminShopAdsPanel();
  });

  // BIND ALL 5 TOGGLE SWITCHES (Smooth in-place state)
  document.getElementById('admin-ad-toggle')?.addEventListener('change', (e) => {
    updatePopupSettingField('isAdPopupEnabled', e.target.checked);
  });

  document.getElementById('admin-welcome-popup-toggle')?.addEventListener('change', (e) => {
    updatePopupSettingField('isWelcomePopupEnabled', e.target.checked);
  });

  document.getElementById('admin-whatsapp-popup-toggle')?.addEventListener('change', (e) => {
    updatePopupSettingField('isWhatsAppPopupEnabled', e.target.checked);
  });

  document.getElementById('admin-realtime-toast-toggle')?.addEventListener('change', (e) => {
    updatePopupSettingField('isRealtimePlayerToastEnabled', e.target.checked);
  });

  document.getElementById('admin-countdown-banner-toggle')?.addEventListener('change', (e) => {
    updatePopupSettingField('isCountdownEnabled', e.target.checked);
  });

  document.getElementById('admin-youtube-popup-toggle')?.addEventListener('change', (e) => {
    updatePopupSettingField('isYouTubePromoEnabled', e.target.checked);
  });

  // BIND YOUTUBE PREVIEW BUTTON
  document.getElementById('admin-preview-youtube-promo-btn')?.addEventListener('click', () => {
    if (typeof window !== 'undefined' && typeof window.openYouTubePromoModal === 'function') {
      window.openYouTubePromoModal(true);
    } else {
      alert("YouTube preview banner is active! Open the home page to see it.");
    }
  });
}

// --- INTERACTIVE PDF EXPORT & CATEGORY FILTER MODAL ---
function openPDFExportFilterModal() {
  if (document.getElementById('admin-pdf-export-modal')) return;

  const allPlayers = store.getPlayers();

  const modalHtml = `
    <div id="admin-pdf-export-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div class="bg-slate-900 border-2 border-red-500 max-w-sm sm:max-w-md w-full p-4 sm:p-5 relative space-y-4 rounded-2xl shadow-2xl text-white modal-content-container">
        
        <button id="close-pdf-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <div class="p-2.5 bg-red-950/80 rounded-xl border border-red-800 text-red-400">
            <i data-lucide="file-text" class="w-6 h-6"></i>
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-black text-white">Export Registered Players PDF</h3>
            <p class="text-xs text-slate-400">Apply category filters & include Download Timestamp</p>
          </div>
        </div>

        <form id="admin-pdf-filter-form" class="space-y-3">
          <!-- 1. CATEGORY FILTER -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-amber-400 uppercase tracking-wide">Select Player Category</label>
            <select id="pdf-category-select" class="w-full bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm rounded-xl p-2.5 focus:outline-none focus:border-red-500 font-bold">
              <option value="ALL">🏏 All Categories (All Players)</option>
              <option value="BATSMAN">🏏 Batsman Only</option>
              <option value="BOWLER">⚾ Bowler Only</option>
              <option value="ALL ROUNDER">⭐ All Rounder Only</option>
              <option value="WICKET KEEPER">🧤 Wicket Keeper Only</option>
            </select>
          </div>

          <!-- 2. PAYMENT / REGISTRATION STATUS FILTER -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-amber-400 uppercase tracking-wide">Select Registration Status</label>
            <select id="pdf-status-select" class="w-full bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm rounded-xl p-2.5 focus:outline-none focus:border-red-500 font-bold">
              <option value="ALL">🌐 All Statuses (Approved, Pending & Rejected)</option>
              <option value="APPROVED">🟢 Approved Players Only</option>
              <option value="PENDING">🔴 Pending Players Only</option>
            </select>
          </div>

          <!-- LIVE MATCHING COUNT DISPLAY -->
          <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span class="text-slate-400 font-medium">Matching Players To Export:</span>
            <span id="pdf-matching-count" class="font-mono font-black text-emerald-400 text-sm">0 Players</span>
          </div>

          <!-- GENERATE BUTTON -->
          <button type="submit" class="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 border border-red-500 transition-all">
            <i data-lucide="printer" class="w-4 h-4"></i> Generate & Download PDF
          </button>
        </form>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('admin-pdf-export-modal')?.remove();
  document.getElementById('close-pdf-modal-btn')?.addEventListener('click', removeModal);

  const categorySelect = document.getElementById('pdf-category-select');
  const statusSelect = document.getElementById('pdf-status-select');
  const countEl = document.getElementById('pdf-matching-count');

  const getFilteredList = () => {
    const catVal = categorySelect ? categorySelect.value : 'ALL';
    const statusVal = statusSelect ? statusSelect.value : 'ALL';

    return allPlayers.filter(p => {
      // Category Check
      const rawCat = (p.category || p.role || p.playingType || 'All Rounder').toUpperCase();
      const cleanCat = rawCat.replace(/[^A-Z0-9]/g, '');

      if (catVal !== 'ALL') {
        const cleanTarget = catVal.replace(/[^A-Z0-9]/g, '');
        if (cleanTarget.includes('ROUNDER') || cleanTarget.includes('ALLROUND')) {
          if (!cleanCat.includes('ROUNDER') && !cleanCat.includes('ALLROUND')) return false;
        } else if (cleanTarget.includes('BAT')) {
          if (!cleanCat.includes('BAT')) return false;
        } else if (cleanTarget.includes('BOWL')) {
          if (!cleanCat.includes('BOWL') && !cleanCat.includes('FAST') && !cleanCat.includes('SPIN')) return false;
        } else if (cleanTarget.includes('KEEPER') || cleanTarget.includes('WK')) {
          if (!cleanCat.includes('KEEPER') && !cleanCat.includes('WK')) return false;
        } else if (!cleanCat.includes(cleanTarget)) {
          return false;
        }
      }

      // Status Check
      if (statusVal !== 'ALL') {
        const pStatus = p.registrationStatus || p.paymentStatus || 'PENDING';
        if (pStatus !== statusVal) return false;
      }

      return true;
    });
  };

  const updateCountDisplay = () => {
    const list = getFilteredList();
    if (countEl) countEl.innerText = `${list.length} Player(s)`;
  };

  categorySelect?.addEventListener('change', updateCountDisplay);
  statusSelect?.addEventListener('change', updateCountDisplay);
  updateCountDisplay();

  document.getElementById('admin-pdf-filter-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const filteredList = getFilteredList();
    if (filteredList.length === 0) {
      alert("No players match the selected filters.");
      return;
    }

    const catText = categorySelect.options[categorySelect.selectedIndex].text.replace(/^[^\w\s]+/, '').trim();
    const statusText = statusSelect.value === 'ALL' ? '' : ` [${statusSelect.value}]`;
    const label = `${catText}${statusText}`;

    removeModal();
    exportPlayersToPDF(filteredList, label);
  });
}

// --- INTERACTIVE TEAM FINAL AUCTION SQUAD PDF SELECTOR MODAL ---
export function openTeamFinalSquadPDFModal() {
  if (document.getElementById('admin-team-squad-pdf-modal')) return;

  const teams = store.getTeams();
  const allPlayers = store.getPlayers();

  const modalHtml = `
    <div id="admin-team-squad-pdf-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div class="bg-slate-900 border-2 border-amber-500 max-w-sm sm:max-w-md w-full p-4 sm:p-5 relative space-y-4 rounded-2xl shadow-2xl text-white modal-content-container">
        
        <button id="close-team-squad-pdf-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1 cursor-pointer">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <div class="p-2.5 bg-amber-950/80 rounded-xl border border-amber-700 text-amber-400">
            <i data-lucide="trophy" class="w-6 h-6"></i>
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-black text-white">Final Auction Squad PDF</h3>
            <p class="text-xs text-slate-400">Download official 13-member squad with real HD photos & balances</p>
          </div>
        </div>

        <form id="team-squad-pdf-form" class="space-y-3.5">
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-amber-400 uppercase tracking-wide">Select Franchise Team</label>
            <select id="team-squad-pdf-select" class="w-full bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm rounded-xl p-2.5 focus:outline-none focus:border-amber-500 font-bold">
              <option value="__ALL__">🏆 All Teams (Complete Multi-Page Tournament PDF)</option>
              ${teams.map((t, idx) => `
                <option value="${t.id}">🛡️ Team #${idx + 1}: ${t.name} (${t.ownerName || 'Owner'})</option>
              `).join('')}
            </select>
          </div>

          <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300">
            <div class="font-bold text-amber-400">📄 PDF Document Structure:</div>
            <ul class="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
              <li>Header with Team Name, Short Code & Team Logo</li>
              <li>Owner Name, Phone Number & Co-Owners</li>
              <li>13 Squad Slots: #1 Icon Player (⭐ highlighted) + Auctioned Players</li>
              <li>Real HD Photos, Player Phone Numbers & Addresses</li>
              <li>Sold Prices, Purse Budget, Total Spent & Balance Left</li>
            </ul>
          </div>

          <button type="submit" class="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 border border-amber-400 transition-all cursor-pointer">
            <i data-lucide="file-down" class="w-4 h-4"></i> Download Final Squad PDF
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('admin-team-squad-pdf-modal')?.remove();
  document.getElementById('close-team-squad-pdf-modal-btn')?.addEventListener('click', removeModal);

  document.getElementById('team-squad-pdf-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedVal = document.getElementById('team-squad-pdf-select')?.value;
    removeModal();

    if (selectedVal === '__ALL__') {
      exportAllTeamsFinalSquadsToPDF(teams, allPlayers);
    } else {
      const team = teams.find(t => t.id === selectedVal);
      if (team) {
        exportTeamFinalSquadToPDF(team, allPlayers);
      } else {
        alert("Team not found.");
      }
    }
  });
}

// --- EDIT TEAM MODAL WITH WHITE BACKGROUND & INSTANT CDN UPLOAD ---
export function openEditTeamModal(team, onSaved) {
  document.getElementById('edit-team-modal')?.remove();

  const maxPurse = Number(team.purse || team.purseBudget || 8000);
  const spent = Number(team.purseSpent || 0);
  const remPurse = (team.remainingPurse !== undefined) ? Number(team.remainingPurse) : (maxPurse - spent);

  let ownerPhotoData = team.ownerPhotoUrl || team.ownerPhoto || '';
  let iconPhotoData = team.iconPlayerPhotoUrl || team.iconPhotoUrl || team.iconPhoto || '';
  let teamLogoData = team.logoUrl || team.teamLogoUrl || '';
  let coOwnerPhotoData = team.coOwnerPhotoUrl || team.coOwner1PhotoUrl || '';
  let mentorPhotoData = team.mentorPhotoUrl || '';

  let isUploadingImage = false;

  const modalHtml = `
    <div id="edit-team-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div class="relative w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-6 max-h-[92vh] overflow-y-auto modal-content-container">
        
        <!-- Header -->
        <div class="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
          <div class="flex items-center gap-3">
            <span class="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200">
              <i data-lucide="shield-check" class="w-5 h-5"></i>
            </span>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900">Edit Team: ${team.name}</h3>
              <p class="text-xs text-slate-500 font-medium">Update franchise details, icon player, logos & purse budget</p>
            </div>
          </div>
          <button id="close-edit-team-modal-btn" class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Form -->
        <form id="edit-team-form" class="space-y-4 text-xs">
          
          <!-- 1. Team Basics -->
          <div class="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <span class="text-[11px] font-black text-blue-700 uppercase tracking-wider block">🛡️ Team Identity</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Team Name *</label>
                <input type="text" id="edit-team-name" required value="${team.name || ''}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:border-blue-500 focus:outline-none shadow-sm" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Short Code (e.g. KH)</label>
                <input type="text" id="edit-team-code" value="${team.shortCode || team.name.substring(0, 3).toUpperCase()}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:border-blue-500 focus:outline-none shadow-sm" />
              </div>
            </div>

            <!-- Team Logo (Optional, Auto-Compressed < 100KB & Instant CDN Upload) -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[10px] font-bold text-blue-800 uppercase">Team Logo (Optional • Compressed &lt; 100KB)</label>
                <div id="logo-upload-status" class="text-[10px] font-bold"></div>
              </div>
              <div class="flex items-center gap-2.5">
                <img id="edit-logo-preview" src="${teamLogoData || 'assets/jsl_logo.jpg'}" class="w-12 h-12 rounded-xl object-cover border-2 border-blue-300 shadow shrink-0 bg-white" onerror="this.src='assets/jsl_logo.jpg'" />
                <input type="file" id="edit-logo-file" accept="image/*" class="w-full bg-white border border-slate-300 text-slate-700 text-[11px] rounded-xl p-2 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-600 file:text-white cursor-pointer shadow-sm" />
                <button type="button" id="remove-logo-btn" class="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0 transition-colors shadow-xs" title="Remove current logo">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remove
                </button>
              </div>
            </div>
          </div>

          <!-- 2. Owner Details -->
          <div class="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-3">
            <span class="text-[11px] font-black text-amber-800 uppercase tracking-wider block">👑 Team Owner Details</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Owner Name *</label>
                <input type="text" id="edit-owner-name" required value="${team.ownerName || ''}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:border-amber-500 focus:outline-none shadow-sm" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Owner Phone *</label>
                <input type="tel" id="edit-owner-phone" required value="${team.ownerPhone || ''}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:border-amber-500 focus:outline-none shadow-sm" />
              </div>
            </div>

            <!-- Owner Photo (Auto-Compressed < 100KB & Instant CDN Upload) -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[10px] font-bold text-amber-800 uppercase">Owner HD Photo (Compressed &lt; 100KB)</label>
                <div id="owner-photo-upload-status" class="text-[10px] font-bold"></div>
              </div>
              <div class="flex items-center gap-2.5">
                <img id="edit-owner-photo-preview" src="${ownerPhotoData || 'assets/card_jsl_user.png'}" class="w-12 h-12 rounded-xl object-cover border-2 border-amber-400 shadow shrink-0 bg-white" onerror="this.src='assets/card_jsl_user.png'" />
                <input type="file" id="edit-owner-photo-file" accept="image/*" class="w-full bg-white border border-slate-300 text-slate-700 text-[11px] rounded-xl p-2 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-amber-600 file:text-white cursor-pointer shadow-sm" />
                <button type="button" id="remove-owner-photo-btn" class="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0 transition-colors shadow-xs" title="Remove owner photo">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remove
                </button>
              </div>
            </div>
          </div>

          <!-- 3. Icon Player Details (Dropdown from Approved Players) -->
          <div class="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">🌟 Icon Player (₹1,000 Fee)</span>
              <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Auto-deducts ₹1,000 & Roster 1/13</span>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Select Icon Player from Approved Registry *</label>
              <select id="edit-icon-select" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none shadow-sm">
                <option value="">-- No Icon Player Assigned --</option>
                <option value="__CUSTOM__" ${team.iconPlayerName && !store.getPlayers().some(p => p.name === team.iconPlayerName) ? 'selected' : ''}>✍️ Custom Name / Outside Registry</option>
                ${store.getPlayers().filter(p => (p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED')).map(p => {
                  const isSelected = (team.iconPlayerName === p.name || team.iconName === p.name || team.iconPlayerId === p.id);
                  return `<option value="${p.id}" data-name="${p.name}" data-photo="${p.photoUrl || p.player_photo_url || ''}" ${isSelected ? 'selected' : ''}>${p.name} (${p.category || 'All Rounder'} • ${p.village || 'N/A'}${p.displayRegistrationNumber ? ' • #' + p.displayRegistrationNumber : ''})</option>`;
                }).join('')}
              </select>
            </div>

            <div id="custom-icon-name-wrapper" class="${team.iconPlayerName && !store.getPlayers().some(p => p.name === team.iconPlayerName) ? '' : 'hidden'}">
              <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Custom Icon Player Name</label>
              <input type="text" id="edit-icon-name" value="${team.iconPlayerName || team.iconName || ''}" placeholder="e.g. Bijay Haldar" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:border-emerald-500 focus:outline-none shadow-sm" />
            </div>

            <!-- Icon Photo (Auto-Compressed < 100KB & Instant CDN Upload) -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[10px] font-bold text-emerald-800 uppercase">Icon Player Photo (Auto-populated or Upload)</label>
                <div id="icon-photo-upload-status" class="text-[10px] font-bold"></div>
              </div>
              <div class="flex items-center gap-2.5">
                <img id="edit-icon-photo-preview" src="${iconPhotoData || 'assets/player_jsl_hd.jpg'}" class="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400 shadow shrink-0 bg-white" onerror="this.src='assets/player_jsl_hd.jpg'" />
                <input type="file" id="edit-icon-photo-file" accept="image/*" class="w-full bg-white border border-slate-300 text-slate-700 text-[11px] rounded-xl p-2 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-600 file:text-white cursor-pointer shadow-sm" />
                <button type="button" id="remove-icon-photo-btn" class="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0 transition-colors shadow-xs" title="Remove icon photo">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remove
                </button>
              </div>
            </div>
          </div>

          <!-- 4. Co-Owner & Mentor (Optional) -->
          <div class="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200/80 space-y-3">
            <span class="text-[11px] font-black text-purple-800 uppercase tracking-wider block">👥 Co-Owner & Mentor (Optional)</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Co-Owner Name</label>
                <input type="text" id="edit-coowner-name" value="${team.coOwnerName || team.coOwner1Name || ''}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2 focus:border-purple-500 focus:outline-none shadow-sm" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Mentor Name</label>
                <input type="text" id="edit-mentor-name" value="${team.mentorName || ''}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2 focus:border-purple-500 focus:outline-none shadow-sm" />
              </div>
            </div>
          </div>

          <!-- 5. Purse & Auction Status -->
          <div class="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <span class="text-[11px] font-black text-rose-700 uppercase tracking-wider block">💰 Purse & Status Controls</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Total Purse Budget (₹)</label>
                <input type="number" id="edit-team-purse" required value="${maxPurse}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:border-rose-500 focus:outline-none shadow-sm" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Remaining Purse (₹)</label>
                <input type="number" id="edit-team-rem-purse" required value="${remPurse}" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:border-rose-500 focus:outline-none shadow-sm" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Registration Status</label>
                <select id="edit-team-status" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none shadow-sm">
                  <option value="APPROVED" ${team.registrationStatus === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
                  <option value="PENDING" ${team.registrationStatus === 'PENDING' ? 'selected' : ''}>PENDING</option>
                  <option value="REJECTED" ${team.registrationStatus === 'REJECTED' ? 'selected' : ''}>REJECTED</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Payment Status</label>
                <select id="edit-team-payment-status" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none shadow-sm">
                  <option value="APPROVED" ${team.paymentStatus === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
                  <option value="PENDING" ${team.paymentStatus === 'PENDING' ? 'selected' : ''}>PENDING</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-2">
            <button type="button" id="cancel-edit-team-btn" class="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer border border-slate-300">
              Cancel
            </button>
            <button type="submit" id="save-edit-team-btn" class="w-2/3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
              <i data-lucide="save" class="w-4 h-4"></i> Save Team Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('edit-team-modal')?.remove();
  document.getElementById('close-edit-team-modal-btn')?.addEventListener('click', removeModal);
  document.getElementById('cancel-edit-team-btn')?.addEventListener('click', removeModal);

  const setButtonUploading = (isUploading) => {
    isUploadingImage = isUploading;
    const saveBtn = document.getElementById('save-edit-team-btn');
    if (saveBtn) {
      saveBtn.disabled = isUploading;
      if (isUploading) {
        saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
        saveBtn.innerHTML = `
          <div class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Uploading Photo to CDN... Please wait</span>
          </div>
        `;
      } else {
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        saveBtn.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Save Team Changes`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  };

  // Helper for Instant Photo Upload with < 100KB Compression
  const handlePhotoSelectAndCDNUpload = async (fileInputEl, previewImgEl, statusEl, folder, onUploaded) => {
    const file = fileInputEl.files[0];
    if (!file) return;

    statusEl.innerHTML = `
      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
        <span class="w-2.5 h-2.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
        <span>Compressing &lt;100KB & Uploading to CDN...</span>
      </span>
    `;
    setButtonUploading(true);

    try {
      // 1. Compress image to < 100KB (600x600, quality 0.70)
      const compressedDataUrl = await compressImage(file, 600, 600, 0.70);
      previewImgEl.src = compressedDataUrl;

      // 2. Upload directly to Cloudinary HD CDN
      const cdnUrl = await uploadHDImage(compressedDataUrl, folder);
      const finalUrl = cdnUrl || compressedDataUrl;

      onUploaded(finalUrl);

      statusEl.innerHTML = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span>✅ CDN Uploaded (< 100KB)</span>
        </span>
      `;
    } catch (err) {
      console.warn('CDN upload fallback:', err);
      statusEl.innerHTML = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
          <span>✅ Compressed & Ready</span>
        </span>
      `;
    } finally {
      setButtonUploading(false);
    }
  };

  // 1. Logo Select
  document.getElementById('edit-logo-file')?.addEventListener('change', (e) => {
    handlePhotoSelectAndCDNUpload(
      e.target,
      document.getElementById('edit-logo-preview'),
      document.getElementById('logo-upload-status'),
      'team_logos',
      (url) => { teamLogoData = url; }
    );
  });

  // 2. Owner Photo Select
  document.getElementById('edit-owner-photo-file')?.addEventListener('change', (e) => {
    handlePhotoSelectAndCDNUpload(
      e.target,
      document.getElementById('edit-owner-photo-preview'),
      document.getElementById('owner-photo-upload-status'),
      'owner_photos',
      (url) => { ownerPhotoData = url; }
    );
  });

  // Icon Select Dropdown Change Handler
  document.getElementById('edit-icon-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    const customWrapper = document.getElementById('custom-icon-name-wrapper');
    const nameInput = document.getElementById('edit-icon-name');
    const preview = document.getElementById('edit-icon-photo-preview');

    if (val === '__CUSTOM__') {
      if (customWrapper) customWrapper.classList.remove('hidden');
    } else if (val === '') {
      if (customWrapper) customWrapper.classList.add('hidden');
      if (nameInput) nameInput.value = '';
      iconPhotoData = '';
      if (preview) preview.src = 'assets/player_jsl_hd.jpg';
    } else {
      if (customWrapper) customWrapper.classList.add('hidden');
      const selectedOption = e.target.options[e.target.selectedIndex];
      const pName = selectedOption?.getAttribute('data-name') || '';
      const pPhoto = selectedOption?.getAttribute('data-photo') || '';
      if (nameInput) nameInput.value = pName;
      if (pPhoto) {
        iconPhotoData = pPhoto;
        if (preview) preview.src = pPhoto;
      }
    }
  });

  // 3. Icon Photo Select
  document.getElementById('edit-icon-photo-file')?.addEventListener('change', (e) => {
    handlePhotoSelectAndCDNUpload(
      e.target,
      document.getElementById('edit-icon-photo-preview'),
      document.getElementById('icon-photo-upload-status'),
      'icon_player_photos',
      (url) => { iconPhotoData = url; }
    );
  });

  // Photo Remove Buttons
  document.getElementById('remove-logo-btn')?.addEventListener('click', () => {
    teamLogoData = '';
    const preview = document.getElementById('edit-logo-preview');
    if (preview) preview.src = 'assets/jsl_logo.jpg';
    const fileInp = document.getElementById('edit-logo-file');
    if (fileInp) fileInp.value = '';
    const status = document.getElementById('logo-upload-status');
    if (status) status.innerHTML = '<span class="text-[10px] text-red-600 font-bold">🗑️ Logo Removed</span>';
  });

  document.getElementById('remove-owner-photo-btn')?.addEventListener('click', () => {
    ownerPhotoData = '';
    const preview = document.getElementById('edit-owner-photo-preview');
    if (preview) preview.src = 'assets/card_jsl_user.png';
    const fileInp = document.getElementById('edit-owner-photo-file');
    if (fileInp) fileInp.value = '';
    const status = document.getElementById('owner-photo-upload-status');
    if (status) status.innerHTML = '<span class="text-[10px] text-red-600 font-bold">🗑️ Photo Removed</span>';
  });

  document.getElementById('remove-icon-photo-btn')?.addEventListener('click', () => {
    iconPhotoData = '';
    const preview = document.getElementById('edit-icon-photo-preview');
    if (preview) preview.src = 'assets/player_jsl_hd.jpg';
    const fileInp = document.getElementById('edit-icon-photo-file');
    if (fileInp) fileInp.value = '';
    const status = document.getElementById('icon-photo-upload-status');
    if (status) status.innerHTML = '<span class="text-[10px] text-red-600 font-bold">🗑️ Photo Removed</span>';
  });

  // Submit Handler: Save Team & Sync Cloud
  document.getElementById('edit-team-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isUploadingImage) {
      alert("Please wait for photo upload to finish!");
      return;
    }

    const saveBtn = document.getElementById('save-edit-team-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <div class="flex items-center justify-center gap-2">
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Saving Team Changes...</span>
        </div>
      `;
    }

    try {
      const updatedTeam = {
        ...team,
        name: document.getElementById('edit-team-name').value.trim(),
        shortCode: document.getElementById('edit-team-code').value.trim().toUpperCase(),
        ownerName: document.getElementById('edit-owner-name').value.trim(),
        ownerPhone: document.getElementById('edit-owner-phone').value.trim(),
        ownerPhotoUrl: ownerPhotoData,
        ownerPhoto: ownerPhotoData,
        captainName: document.getElementById('edit-owner-name').value.trim(),
        iconPlayerId: (document.getElementById('edit-icon-select')?.value !== '__CUSTOM__' && document.getElementById('edit-icon-select')?.value) || team.iconPlayerId || '',
        iconPlayerName: (() => {
          const sel = document.getElementById('edit-icon-select');
          if (!sel) return '';
          if (sel.value === '__CUSTOM__') return (document.getElementById('edit-icon-name')?.value || '').trim();
          if (sel.value === '') return '';
          const opt = sel.options[sel.selectedIndex];
          return (opt?.getAttribute('data-name') || '').trim();
        })(),
        iconName: (() => {
          const sel = document.getElementById('edit-icon-select');
          if (!sel) return '';
          if (sel.value === '__CUSTOM__') return (document.getElementById('edit-icon-name')?.value || '').trim();
          if (sel.value === '') return '';
          const opt = sel.options[sel.selectedIndex];
          return (opt?.getAttribute('data-name') || '').trim();
        })(),
        iconPlayerPhotoUrl: iconPhotoData,
        iconPhotoUrl: iconPhotoData,
        iconPhoto: iconPhotoData,
        logoUrl: teamLogoData,
        teamLogoUrl: teamLogoData,
        coOwnerName: document.getElementById('edit-coowner-name')?.value.trim() || '',
        coOwner1Name: document.getElementById('edit-coowner-name')?.value.trim() || '',
        mentorName: document.getElementById('edit-mentor-name')?.value.trim() || '',
        purse: Number(document.getElementById('edit-team-purse').value) || 8000,
        purseBudget: Number(document.getElementById('edit-team-purse').value) || 8000,
        remainingPurse: Number(document.getElementById('edit-team-rem-purse').value) || 8000,
        registrationStatus: document.getElementById('edit-team-status').value,
        paymentStatus: document.getElementById('edit-team-payment-status').value,
        updated_at: Date.now()
      };

      // 1. Update in local store
      store.updateTeam(updatedTeam);

      // 2. Sync to Supabase
      try {
        await syncTeamToSupabase(updatedTeam);
      } catch (cloudErr) {
        console.warn('Supabase team sync notice:', cloudErr);
      }

      removeModal();
      if (onSaved) onSaved();
      alert(`✅ Team "${updatedTeam.name}" updated successfully!`);

    } catch (err) {
      console.error('Error saving team:', err);
      alert(`❌ Error saving team: ${err.message || 'Please try again'}`);
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Save Team Changes`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  });
}

// --- MULTI-TENANT TOURNAMENT SAAS & TRIAL PANEL CONTROLLER ---
export function renderAdminSaasTournamentsPanel() {
  const container = document.getElementById('admin-custom-tourneys-table-container');
  const countBadge = document.getElementById('admin-custom-tourneys-count-badge');
  const statusBadge = document.getElementById('admin-host-tourney-status-badge');
  const toggleInput = document.getElementById('admin-host-tourney-feature-toggle');
  const createBtn = document.getElementById('admin-launch-create-tourney-wizard-btn');

  // 1. Wire up Master Feature Flag Switch
  if (toggleInput) {
    toggleInput.onchange = async (e) => {
      const isEnabled = e.target.checked;
      await store.updatePlatformSettings({ isHostTournamentEnabled: isEnabled });
      if (statusBadge) {
        statusBadge.className = `px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${isEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950'}`;
        statusBadge.textContent = isEnabled ? '🟢 PUBLICLY ACTIVE' : '🔒 DRAFT MODE (ADMIN ONLY)';
      }
      alert(isEnabled 
        ? "✅ Public Tournament Creation is now ACTIVE on the homepage! Visitors can create their own leagues."
        : "🔒 Public Tournament Creation is now in DRAFT MODE. The 'Create Tournament' button is hidden from normal visitors on the homepage."
      );
    };
  }

  // 2. Wire up Master Create Tournament Button
  if (createBtn) {
    createBtn.onclick = () => {
      if (window.openTournamentCreationWizard) {
        window.openTournamentCreationWizard(false);
      }
    };
  }

  // 3. Render Tournaments Directory Table
  const tourneys = store.getCustomTournaments();
  if (countBadge) countBadge.textContent = String(tourneys.length);

  if (!container) return;

  if (tourneys.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center space-y-3 bg-white">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 mx-auto flex items-center justify-center text-xl font-black border border-amber-200">
          🏆
        </div>
        <div class="space-y-1">
          <h4 class="text-xs sm:text-sm font-black text-slate-900">No Custom Tournaments Created Yet</h4>
          <p class="text-[11px] text-slate-500 max-w-sm mx-auto">Click below to create and launch your first custom tournament.</p>
        </div>
        <button type="button" onclick="window.openTournamentCreationWizard ? window.openTournamentCreationWizard(false) : null" class="px-4 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs border border-amber-300 cursor-pointer">
          + Create First Tournament
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto bg-white">
      <table class="w-full text-left text-xs text-slate-700">
        <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 tracking-wider">
          <tr>
            <th class="py-2.5 px-3">TOURNAMENT</th>
            <th class="py-2.5 px-2.5">MODE</th>
            <th class="py-2.5 px-2.5">STATUS</th>
            <th class="py-2.5 px-2.5">ORGANIZER</th>
            <th class="py-2.5 px-2.5">ENTRY / PURSE</th>
            <th class="py-2.5 px-3 text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 font-semibold">
          ${tourneys.map(t => {
            const isAuction = (t.mode === 'AUCTION_LEAGUE');
            const statusUpper = (t.status || 'ACTIVE').toUpperCase();
            const isPending = (statusUpper === 'PENDING_APPROVAL' || statusUpper === 'PENDING');
            const isRejected = (statusUpper === 'REJECTED');

            return `
              <tr class="hover:bg-slate-50/80 transition-colors ${isPending ? 'bg-amber-50/40' : ''}">
                <td class="py-2.5 px-3">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg ${isAuction ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'} flex items-center justify-center text-xs font-black shrink-0">
                      ${isAuction ? '🔨' : '🏏'}
                    </span>
                    <div class="min-w-0">
                      <div class="font-black text-slate-900 text-xs truncate">${t.name}</div>
                      <div class="text-[9px] text-slate-400 font-mono font-bold">Slug: #${t.slug || t.id} • 📍 ${t.venue || 'Venue'}</div>
                    </div>
                  </div>
                </td>

                <td class="py-2.5 px-2.5">
                  <span class="px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${isAuction ? 'bg-amber-50 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-300'}">
                    ${isAuction ? 'Mode A: Auction' : 'Mode B: Fixtures'}
                  </span>
                </td>

                <td class="py-2.5 px-2.5">
                  ${isPending ? `
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-max animate-pulse">
                      <span>⏳</span> Awaiting Approval
                    </span>
                  ` : isRejected ? `
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1 w-max">
                      <span>🔴</span> Rejected
                    </span>
                  ` : `
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 w-max">
                      <span>🟢</span> Active
                    </span>
                  `}
                </td>

                <td class="py-2.5 px-2.5">
                  <div class="text-xs font-bold text-slate-900">${t.organizer?.name || 'Organizer'}</div>
                  <div class="text-[9px] text-slate-500 font-mono">📱 ${t.organizer?.phone || 'N/A'}</div>
                </td>

                <td class="py-2.5 px-2.5 font-mono text-xs">
                  ${isAuction ? `
                    <div class="text-emerald-700 font-black">₹${t.entryFee || 300} Entry</div>
                    <div class="text-[9px] text-slate-400">Purse: ₹${t.teamPurse || 8000}</div>
                  ` : `
                    <span class="text-slate-500 text-[10px]">Direct Teams</span>
                  `}
                </td>

                <td class="py-2.5 px-3 text-right">
                  <div class="flex items-center justify-end gap-1.5 flex-wrap">
                    ${isPending ? `
                      <button type="button" class="btn-approve-tourney px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-xs flex items-center gap-1" data-id="${t.id}" data-name="${t.name}" data-phone="${t.organizer?.phone || ''}" data-slug="${t.slug}" data-supabase-id="${t.supabaseId || t.tournament_id || t.id || ''}">
                        ✅ Approve
                      </button>
                      <button type="button" class="btn-reject-tourney px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-[10px] font-black cursor-pointer shadow-2xs" data-id="${t.id}" data-name="${t.name}" data-slug="${t.slug}" data-supabase-id="${t.supabaseId || t.tournament_id || t.id || ''}">
                        ❌ Reject
                      </button>
                    ` : isRejected ? `
                      <button type="button" class="btn-approve-tourney px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-xs flex items-center gap-1" data-id="${t.id}" data-name="${t.name}" data-phone="${t.organizer?.phone || ''}" data-slug="${t.slug}" data-supabase-id="${t.supabaseId || t.tournament_id || t.id || ''}">
                        🔄 Re-Approve
                      </button>
                    ` : ''}

                    <button type="button" class="btn-edit-tourney px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-black cursor-pointer flex items-center gap-1 shadow-2xs" data-id="${t.id}">
                      ✏️ Edit
                    </button>
                    ${(isAuction && !isPending && !isRejected) ? `
                      <button type="button" class="btn-test-reg-modal px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-black cursor-pointer shadow-2xs" data-slug="${t.slug}">
                        📝 Test Reg
                      </button>
                    ` : ''}
                    <button type="button" class="btn-open-hub-link px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-[10px] font-black cursor-pointer shadow-2xs" data-slug="${t.slug}">
                      🌐 Hub
                    </button>
                    <button type="button" class="btn-delete-tourney px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black cursor-pointer shadow-2xs" data-id="${t.id}" data-slug="${t.slug}" data-supabase-id="${t.supabaseId || t.tournament_id || t.id || ''}" data-name="${t.name}">
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Attach Table Action Listeners
  container.querySelectorAll('.btn-approve-tourney').forEach(b => {
    b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');
      const phone = e.currentTarget.getAttribute('data-phone');
      const slug = e.currentTarget.getAttribute('data-slug');
      const supabaseId = e.currentTarget.getAttribute('data-supabase-id');
      if (confirm(`✅ Approve & Activate tournament "${name}"?\n\nThis will open player registration and activate the public hub immediately.`)) {
        b.disabled = true;
        b.textContent = '⏳ Approving...';
        await store.approveTournament(id, slug, supabaseId);
        renderAdminSaasTournamentsPanel();

        // 1-Tap WhatsApp notify organizer
        if (phone && confirm(`💬 Would you like to send official approval on WhatsApp to the organizer (${phone})?`)) {
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          const hostUrl = window.location.origin + window.location.pathname;
          const regUrl = `${hostUrl}#reg-${slug}`;
          const msg = `🎉 *CONGRATULATIONS! YOUR TOURNAMENT IS APPROVED & LIVE!* 🏆\n\nDear Organizer,\nYour tournament *${name}* has been officially verified and activated on Cricket Premier League.\n\n🔗 *Player Registration Link:* ${regUrl}\n\nYou can now share this registration link with teams and players.\n\nBest regards,\n*Master Admin - CPL Platform*`;
          window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        }
      }
    });
  });

  container.querySelectorAll('.btn-reject-tourney').forEach(b => {
    b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');
      const slug = e.currentTarget.getAttribute('data-slug');
      const supabaseId = e.currentTarget.getAttribute('data-supabase-id');
      const reason = prompt(`❌ Enter rejection reason for tournament "${name}":`, "Application details could not be verified.");
      if (reason !== null) {
        b.disabled = true;
        b.textContent = '⏳ Rejecting...';
        await store.rejectTournament(id, reason, slug, supabaseId);
        renderAdminSaasTournamentsPanel();
      }
    });
  });

  container.querySelectorAll('.btn-edit-tourney').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const t = tourneys.find(item => item.id === id);
      if (t) {
        openEditTournamentModal(t, () => renderAdminSaasTournamentsPanel());
      }
    });
  });

  container.querySelectorAll('.btn-test-reg-modal').forEach(b => {
    b.addEventListener('click', (e) => {
      const slug = e.currentTarget.getAttribute('data-slug');
      if (window.openDynamicTournamentRegistrationModal) {
        window.openDynamicTournamentRegistrationModal(slug);
      }
    });
  });

  container.querySelectorAll('.btn-open-hub-link').forEach(b => {
    b.addEventListener('click', (e) => {
      const slug = e.currentTarget.getAttribute('data-slug');
      if (window.location.hash.startsWith('#admin')) {
        window.location.hash = `#t/${slug}`;
      }
    });
  });

  container.querySelectorAll('.btn-delete-tourney').forEach(b => {
    b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const slug = e.currentTarget.getAttribute('data-slug');
      const supabaseId = e.currentTarget.getAttribute('data-supabase-id');
      const name = e.currentTarget.getAttribute('data-name');
      if (confirm(`⚠️ Are you sure you want to permanently delete tournament "${name}"?\n\nThis will remove this tournament, its settings, and organizer access.`)) {
        b.disabled = true;
        b.textContent = '⏳ Deleting...';
        await store.deleteCustomTournament(id, slug, supabaseId);
        renderAdminSaasTournamentsPanel();
      }
    });
  });
}

/**
 * Super Admin Modal: Full Tournament Editor & Admin Password Updater
 */
function openEditTournamentModal(tourney, onSaveCallback) {
  document.getElementById('edit-tournament-modal')?.remove();

  const isAuction = (tourney.mode === 'AUCTION_LEAGUE');
  const orgName = tourney.organizer?.name || '';
  const orgPhone = tourney.organizer?.phone || '';

  const modalEl = document.createElement('div');
  modalEl.id = 'edit-tournament-modal';
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl border-2 border-amber-400 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900 my-auto">
      <!-- Header -->
      <div class="px-5 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 flex items-center justify-between shadow-xs">
        <div class="flex items-center gap-2.5">
          <span class="p-2 bg-slate-950 text-amber-400 rounded-xl text-lg font-black shadow-xs">✏️</span>
          <div>
            <h3 class="text-base font-black tracking-wide text-slate-950">Edit Tournament & Admin Access</h3>
            <p class="text-[11px] text-slate-900 font-bold opacity-90">Modify details, dates, fees or reset organizer login password</p>
          </div>
        </div>
        <button id="close-edit-tourney-modal-btn" class="w-8 h-8 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 font-black flex items-center justify-center text-sm cursor-pointer transition-colors">
          ✕
        </button>
      </div>

      <!-- Form Body -->
      <form id="edit-tourney-form" class="p-5 overflow-y-auto space-y-4 text-xs font-semibold">
        <!-- Section 1: Tournament Identity -->
        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div class="flex items-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider">
            <span>🏆</span> Tournament Information
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Tournament Name *</label>
              <input type="text" id="edit-tourney-name" required value="${tourney.name || ''}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:border-amber-500 focus:outline-none" />
            </div>

            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Short Slug / Code *</label>
              <input type="text" id="edit-tourney-slug" required value="${tourney.slug || ''}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none" />
            </div>

            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Ground / Venue</label>
              <input type="text" id="edit-tourney-venue" value="${tourney.venue || ''}" placeholder="e.g. Eden Gardens, Kolkata" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:border-amber-500 focus:outline-none" />
            </div>

            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Dates / Season</label>
              <input type="text" id="edit-tourney-dates" value="${tourney.dates || ''}" placeholder="e.g. 15-20 October 2026" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:border-amber-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <!-- Section 2: Mode & Financials -->
        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div class="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
            <span>⚙️</span> Mode & Financial Rules
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Operating Mode</label>
              <select id="edit-tourney-mode" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:border-emerald-500 focus:outline-none">
                <option value="AUCTION_LEAGUE" ${tourney.mode === 'AUCTION_LEAGUE' ? 'selected' : ''}>Mode A: Player Reg + Auction</option>
                <option value="FIXTURES_ONLY" ${tourney.mode === 'FIXTURES_ONLY' ? 'selected' : ''}>Mode B: Teams & Live Scoring</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Player Entry Fee (₹)</label>
              <input type="number" id="edit-tourney-entry-fee" value="${tourney.entryFee || 300}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none" />
            </div>

            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Team Auction Purse (₹)</label>
              <input type="number" id="edit-tourney-purse" value="${tourney.teamPurse || 8000}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-black text-slate-700 mb-1">Rule / Player Eligibility Restriction</label>
            <input type="text" id="edit-tourney-rules" value="${tourney.ruleRestriction || ''}" placeholder="e.g. Open to all local district players" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>

        <!-- Section 3: Organizer Admin Credentials -->
        <div class="p-3.5 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-amber-950 font-black text-xs uppercase tracking-wider">
              <span>👑</span> Organizer / Admin Access
            </div>
            <span class="px-2 py-0.5 bg-amber-200 text-amber-950 rounded-full text-[9px] font-black">Login ID & Password</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Admin / Organizer Name</label>
              <input type="text" id="edit-tourney-org-name" value="${orgName}" placeholder="e.g. Gourav Roy" class="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-slate-900 text-xs font-bold focus:border-amber-600 focus:outline-none" />
            </div>

            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Admin Phone (Login ID) *</label>
              <input type="text" id="edit-tourney-org-phone" required maxlength="10" value="${orgPhone}" placeholder="10-digit mobile" class="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-slate-900 text-xs font-mono font-bold focus:border-amber-600 focus:outline-none" />
            </div>

            <div>
              <label class="block text-[11px] font-black text-slate-700 mb-1">Change Admin Password</label>
              <input type="text" id="edit-tourney-org-password" placeholder="Leave blank to keep unchanged" class="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-slate-900 text-xs font-mono font-bold focus:border-amber-600 focus:outline-none" />
            </div>
          </div>
        </div>

        <!-- Action Buttons Footer -->
        <div class="pt-2 flex items-center justify-end gap-2.5">
          <button type="button" id="cancel-edit-tourney-btn" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-500">
            💾 Save & Update Tournament
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  const closeModal = () => modalEl.remove();
  document.getElementById('close-edit-tourney-modal-btn')?.addEventListener('click', closeModal);
  document.getElementById('cancel-edit-tourney-btn')?.addEventListener('click', closeModal);

  document.getElementById('edit-tourney-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('edit-tourney-name').value.trim();
    const slug = document.getElementById('edit-tourney-slug').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const venue = document.getElementById('edit-tourney-venue').value.trim();
    const dates = document.getElementById('edit-tourney-dates').value.trim();
    const mode = document.getElementById('edit-tourney-mode').value;
    const entryFee = Number(document.getElementById('edit-tourney-entry-fee').value) || 300;
    const teamPurse = Number(document.getElementById('edit-tourney-purse').value) || 8000;
    const ruleRestriction = document.getElementById('edit-tourney-rules').value.trim();
    const orgNameInput = document.getElementById('edit-tourney-org-name').value.trim();
    const orgPhoneInput = document.getElementById('edit-tourney-org-phone').value.trim().replace(/[^0-9]/g, '');
    const newPassword = document.getElementById('edit-tourney-org-password').value.trim();

    if (!name || !slug) {
      alert("Please provide both Tournament Name and Slug!");
      return;
    }

    if (!orgPhoneInput || orgPhoneInput.length < 10) {
      alert("Please enter a valid 10-digit Admin Mobile Number!");
      return;
    }

    const updatedData = {
      ...tourney,
      name,
      slug,
      venue,
      dates,
      mode,
      entryFee,
      teamPurse,
      ruleRestriction,
      organizer: {
        ...(tourney.organizer || {}),
        name: orgNameInput || 'Tournament Organizer',
        phone: orgPhoneInput,
        ...(newPassword ? { password: newPassword } : {})
      }
    };

    // Save update via store
    await store.saveCustomTournament(updatedData);

    // If new password provided, also update in user account and tournament owners registry
    if (newPassword) {
      const accounts = store.getUserAccounts ? store.getUserAccounts() : [];
      const acc = accounts.find(a => a.phone === orgPhoneInput);
      if (acc) {
        acc.password = newPassword;
        safeSetLocalStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
      }
    }

    alert(`✅ Tournament "${name}" updated successfully!`);
    closeModal();
    if (typeof onSaveCallback === 'function') onSaveCallback();
  });
}

console.log('[ADMIN.JS MODULE] Setting window.processScorerBall now...');
window.processScorerBall = processScorerBall;
window.openScorerWicketModal = openScorerWicketModal;
window.renderScorerActivePanel = renderScorerActivePanel;
console.log('[ADMIN.JS MODULE] window.processScorerBall is:', typeof window.processScorerBall);


window.swapStrikeManually = function() {
  const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
  if (fixture && fixture.liveMatchState) {
    const temp = fixture.liveMatchState.strikerId;
    fixture.liveMatchState.strikerId = fixture.liveMatchState.nonStrikerId;
    fixture.liveMatchState.nonStrikerId = temp;
    store.updateFixture(fixture);
    renderScorerActivePanel();
  }
};

window.closeInningsManually = function() {
  const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
  if (!fixture || !fixture.liveMatchState) return;
  const state = fixture.liveMatchState;
  const battingTeamName = state.innings === 2 ? fixture.teamBName : fixture.teamAName;
  const bowlingTeamName = state.innings === 2 ? fixture.teamAName : fixture.teamBName;
  if (state.innings === 2) {
    return alert("Innings 2 is already in progress or completed!");
  }
  if (confirm(`Confirm Close Innings 1?\n\n${battingTeamName} scored ${state.runs}/${state.wickets} in ${state.overs}.${state.balls} overs.\nTarget for ${bowlingTeamName} will be ${state.runs + 1} runs.`)) {
    fixture.liveMatchState.innings = 2;
    fixture.liveMatchState.target = fixture.liveMatchState.runs + 1;
    fixture.liveMatchState.strikerId = '';
    fixture.liveMatchState.nonStrikerId = '';
    fixture.liveMatchState.bowlerId = '';
    fixture.liveMatchState.runs = 0;
    fixture.liveMatchState.wickets = 0;
    fixture.liveMatchState.overs = 0;
    fixture.liveMatchState.balls = 0;
    fixture.liveMatchState.overBalls = [];
    store.updateFixture(fixture);
    renderScorerActivePanel();
    alert(`✅ Innings 1 Closed! Target set to ${fixture.liveMatchState.target}. Now select new opening batsmen and bowler for Innings 2.`);
  }
};

window.finishMatchManually = function() {
  const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
  if (!fixture) return;
  if (confirm("🏆 Are you sure you want to finalize this match and record the official result?")) {
    let winnerId = null;
    let resultTxt = 'Match Tied';
    const teamAScore = fixture.teamAScore || { runs: 0, wickets: 0 };
    const teamBScore = fixture.teamBScore || { runs: 0, wickets: 0 };

    if (teamAScore.runs > teamBScore.runs) {
      winnerId = fixture.teamAId;
      resultTxt = `${fixture.teamAName} won by ${teamAScore.runs - teamBScore.runs} runs`;
    } else if (teamBScore.runs > teamAScore.runs) {
      winnerId = fixture.teamBId;
      resultTxt = `${fixture.teamBName} won by ${10 - teamBScore.wickets} wickets`;
    }

    fixture.status = 'COMPLETED';
    fixture.endedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    fixture.result = resultTxt;
    fixture.winnerTeamId = winnerId;
    
    store.updateFixture(fixture);
    document.getElementById('scorer-active-panel')?.classList.add('hidden');
    renderScorerMatchesList();
    renderAdminFixturesList();
    alert(`🎉 Match Completed!\n\nResult: ${resultTxt}`);
  }
};


