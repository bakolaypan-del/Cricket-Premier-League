// Admin Master Data & Payment Verification Panel with Single Source Cloud Control (Developer: Suman Kolay)

import { store } from './store.js';
import { exportPlayersToCSV, exportTeamsToCSV, exportPlayersToPDF } from './export.js';

let activeAdminTab = 'payments'; // 'payments', 'all-players', 'teams'

export function renderAdminDashboard(containerEl) {
  // STRICT ADMIN AUTHENTICATION LOCK (bakolaypan@gmail.com / Suman@1995)
  if (!store.isAdminAuthenticated()) {
    renderAdminLoginScreen(containerEl);
    return;
  }

  const leagues = store.getLeagues();
  const players = store.getPlayers();
  const teams = store.getTeams();

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingPlayers = players.filter(p => (p.registrationStatus || p.paymentStatus) === 'PENDING');
  const approvedPlayers = players.filter(p => (p.registrationStatus || p.paymentStatus) === 'APPROVED');
  const rejectedPlayers = players.filter(p => (p.registrationStatus || p.paymentStatus) === 'REJECTED');
  const todayPlayers = players.filter(p => p.regDate === todayStr || (p.created_at && p.created_at.startsWith(todayStr)));

  containerEl.innerHTML = `
    <div class="space-y-6 sm:space-y-8 animate-fade-in">
      <!-- Admin Header & Actions Bar -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div>
          <div class="flex items-center gap-3">
            <span class="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40">
              <i data-lucide="shield-check" class="w-6 h-6"></i>
            </span>
            <div>
              <h1 class="text-lg sm:text-2xl font-black text-white">Master Admin Control Panel</h1>
              <p class="text-xs text-slate-400">Log ID: <strong class="text-amber-400">bakolaypan@gmail.com</strong> • Single Source Supabase & Realtime Cloud Database</p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button id="export-master-csv-btn" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all shadow">
            <i data-lucide="download" class="w-4 h-4 text-emerald-400"></i> Export CSV
          </button>
          <button id="export-master-pdf-btn" class="px-3.5 py-2 bg-red-950 hover:bg-red-900 text-red-300 text-xs font-bold rounded-xl border border-red-800 flex items-center gap-2 transition-all shadow">
            <i data-lucide="file-text" class="w-4 h-4 text-red-400"></i> Export PDF
          </button>
          <button id="clear-all-players-btn" class="px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-bold rounded-xl border border-red-800 flex items-center gap-1.5 transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4 text-red-400"></i> Clear All
          </button>
          <button id="admin-logout-btn" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors">
            <i data-lucide="log-out" class="w-4 h-4"></i> Logout
          </button>
        </div>
      </div>

      <!-- DASHBOARD CARDS (Total, Pending, Approved, Rejected, Today's) -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div class="glass-card p-3 text-center border border-slate-800 bg-slate-900/90 rounded-2xl">
          <div class="text-[9px] font-bold text-slate-400 uppercase">Total Registered</div>
          <div class="text-xl sm:text-2xl font-black text-white mt-0.5">${players.length}</div>
        </div>

        <div class="glass-card p-3 text-center border border-amber-500/40 bg-amber-950/20 rounded-2xl">
          <div class="text-[9px] font-bold text-amber-400 uppercase">Pending (🔴 Red)</div>
          <div class="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">${pendingPlayers.length}</div>
        </div>

        <div class="glass-card p-3 text-center border border-emerald-500/40 bg-emerald-950/20 rounded-2xl">
          <div class="text-[9px] font-bold text-emerald-400 uppercase">Approved (🟢 Green)</div>
          <div class="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">${approvedPlayers.length}</div>
        </div>

        <div class="glass-card p-3 text-center border border-red-500/40 bg-red-950/20 rounded-2xl">
          <div class="text-[9px] font-bold text-red-400 uppercase">Rejected</div>
          <div class="text-xl sm:text-2xl font-black text-red-400 mt-0.5">${rejectedPlayers.length}</div>
        </div>

        <div class="glass-card p-3 text-center border border-sky-500/40 bg-sky-950/20 rounded-2xl col-span-2 sm:col-span-1">
          <div class="text-[9px] font-bold text-sky-400 uppercase">Today's Registrations</div>
          <div class="text-xl sm:text-2xl font-black text-sky-400 mt-0.5">${todayPlayers.length}</div>
        </div>
      </div>

      <!-- Admin Tabs Navigation -->
      <div class="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-1" id="admin-tab-nav">
        <button data-tab="payments" class="admin-tab-btn ${activeAdminTab === 'payments' ? 'active border-amber-400 text-amber-400 bg-slate-900/90' : 'border-transparent text-slate-400 hover:text-white'} px-4 sm:px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2">
          <i data-lucide="badge-indian-rupee" class="w-4 h-4"></i> Pending Approvals 
          <span class="px-2 py-0.5 text-xs bg-red-950 text-red-400 rounded-full font-black border border-red-800">${pendingPlayers.length}</span>
        </button>
        <button data-tab="all-players" class="admin-tab-btn ${activeAdminTab === 'all-players' ? 'active border-amber-400 text-amber-400 bg-slate-900/90' : 'border-transparent text-slate-400 hover:text-white'} px-4 sm:px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2">
          <i data-lucide="users" class="w-4 h-4"></i> All Registered Players (${players.length})
        </button>
        <button data-tab="teams" class="admin-tab-btn ${activeAdminTab === 'teams' ? 'active border-amber-400 text-amber-400 bg-slate-900/90' : 'border-transparent text-slate-400 hover:text-white'} px-4 sm:px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2">
          <i data-lucide="shield" class="w-4 h-4"></i> Registered Teams (${teams.length})
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="admin-tab-content">
        
        <!-- 1. Pending Payment Verification Tab -->
        <div id="tab-payments-view" class="${activeAdminTab === 'payments' ? '' : 'hidden'} space-y-6">
          <div class="glass-card p-4 sm:p-6 bg-slate-900/90 border border-slate-800">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="text-base sm:text-lg font-black text-white">Pending Player Approvals (${pendingPlayers.length})</h3>
                <p class="text-xs text-slate-400">Approve or Edit/Delete player registration entries in real-time.</p>
              </div>
            </div>

            ${pendingPlayers.length === 0 ? `
              <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80"></i>
                <p class="text-white font-bold text-sm">All Payments Verified!</p>
                <p class="text-xs text-slate-400 mt-1">There are no pending player registrations requiring approval right now.</p>
              </div>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs sm:text-sm text-slate-300">
                  <thead class="bg-slate-950 text-[10px] sm:text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th class="py-3 px-3">Serial & Reg ID</th>
                      <th class="py-3 px-3">Player Details</th>
                      <th class="py-3 px-3">Category & Phone</th>
                      <th class="py-3 px-3">UPI Ref No</th>
                      <th class="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800">
                    ${pendingPlayers.map(p => `
                      <tr class="hover:bg-slate-950/60">
                        <td class="py-3 px-3">
                          <div class="flex items-center gap-2.5">
                            <img src="${p.photoUrl || p.player_photo_url}" class="w-10 h-10 rounded-xl object-cover border border-slate-700" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'"/>
                            <div>
                              <div class="font-bold text-white text-xs sm:text-sm">${p.name}</div>
                              <span class="px-1.5 py-0.5 bg-slate-950 text-amber-400 font-mono text-[9px] font-black rounded border border-amber-500/40">${p.registrationId || p.regNo || 'JSL2026-0001'} (#${p.displayRegistrationNumber || p.serialNo})</span>
                            </div>
                          </div>
                        </td>
                        <td class="py-3 px-3 text-xs">
                          <div class="font-semibold text-slate-200">Father: ${p.fatherName || 'N/A'}</div>
                          <div class="text-slate-400 text-[10px]">📍 ${p.village || ''}, ${p.district || 'Paschim Medinipur'}</div>
                        </td>
                        <td class="py-3 px-3 text-xs">
                          <span class="px-2 py-0.5 bg-sky-950 text-sky-300 font-extrabold text-[10px] rounded border border-sky-800 inline-block mb-0.5">
                            ${p.category || p.playingType || 'All Rounder'}
                          </span>
                          <div class="text-slate-400 font-mono text-[10px]">📞 ${p.phone || 'N/A'}</div>
                        </td>
                        <td class="py-3 px-3 font-mono font-bold text-amber-400 text-xs">
                          ${p.paymentRef || 'N/A'}
                        </td>
                        <td class="py-3 px-3 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <button data-approve-id="${p.id}" class="approve-player-btn px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg shadow flex items-center gap-1">
                              <i data-lucide="check" class="w-3 h-3"></i> Approve
                            </button>
                            <button data-reject-id="${p.id}" class="reject-player-btn px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 font-extrabold text-[10px] rounded-lg border border-red-800 shadow">
                              Reject
                            </button>
                            <button data-edit-id="${p.id}" class="edit-player-btn p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700">
                              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                            </button>
                            <button data-delete-id="${p.id}" class="delete-player-btn p-1.5 bg-red-950 hover:bg-red-900 text-red-400 rounded-lg border border-red-800">
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
        <div id="tab-all-players-view" class="${activeAdminTab === 'all-players' ? '' : 'hidden'} space-y-6">
          <div class="glass-card p-4 sm:p-6 bg-slate-900/90 border border-slate-800 space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 class="text-base sm:text-lg font-black text-white">Registered Players Master Table (${players.length})</h3>
                <p class="text-xs text-slate-400">Search, filter, edit details, or remove players with automatic continuous serial re-indexing.</p>
              </div>

              <div class="relative w-full sm:w-64">
                <input type="text" id="admin-player-search" placeholder="🔍 Search by name, reg ID, phone..." class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2 pl-3 focus:outline-none focus:border-amber-500" />
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead class="bg-slate-950 text-[10px] sm:text-xs uppercase text-slate-400 border-b border-slate-800">
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
                <tbody id="admin-all-players-table-body" class="divide-y divide-slate-800">
                  ${renderAdminPlayersRows(players)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 3. Registered Teams Tab -->
        <div id="tab-teams-view" class="${activeAdminTab === 'teams' ? '' : 'hidden'} space-y-6">
          <div class="glass-card p-4 sm:p-6 bg-slate-900/90 border border-slate-800">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="text-base sm:text-lg font-black text-white">Registered Teams (${teams.length})</h3>
                <p class="text-xs text-slate-400">Manage franchise teams & squad allocations.</p>
              </div>
            </div>

            ${teams.length === 0 ? `
              <div class="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                <i data-lucide="shield-off" class="w-10 h-10 text-slate-600 mx-auto mb-2"></i>
                <p class="text-white font-bold text-xs">No teams registered yet!</p>
              </div>
            ` : `
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                ${teams.map(t => `
                  <div class="glass-card p-3 flex flex-col justify-between border border-slate-800 bg-slate-950/90">
                    <div class="flex items-center gap-3 mb-2">
                      <img src="${t.logoUrl || 'assets/jsl_logo.jpg'}" class="w-10 h-10 rounded-xl object-cover border border-sky-500/50" />
                      <div>
                        <div class="font-black text-white text-sm">${t.name}</div>
                        <div class="text-[10px] text-sky-400 font-bold">Owner: ${t.ownerName} (${t.ownerPhone})</div>
                      </div>
                    </div>
                    <div class="flex justify-between items-center pt-2 border-t border-slate-800">
                      <button data-edit-team-id="${t.id}" class="edit-team-btn px-2.5 py-1 bg-slate-800 text-sky-300 font-bold text-[10px] rounded-lg">Edit Team</button>
                      <button data-delete-team-id="${t.id}" class="delete-team-btn px-2 py-1 bg-red-950 text-red-300 font-bold text-[10px] rounded-lg">Delete</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // --- TAB SWITCHING LISTENERS ---
  const tabBtns = containerEl.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeAdminTab = e.currentTarget.getAttribute('data-tab');
      tabBtns.forEach(b => {
        b.classList.remove('active', 'border-amber-400', 'text-amber-400', 'bg-slate-900/90');
        b.classList.add('border-transparent', 'text-slate-400');
      });
      e.currentTarget.classList.add('active', 'border-amber-400', 'text-amber-400', 'bg-slate-900/90');
      e.currentTarget.classList.remove('border-transparent', 'text-slate-400');

      document.getElementById('tab-payments-view').classList.add('hidden');
      document.getElementById('tab-all-players-view').classList.add('hidden');
      document.getElementById('tab-teams-view').classList.add('hidden');

      if (activeAdminTab === 'payments') document.getElementById('tab-payments-view').classList.remove('hidden');
      if (activeAdminTab === 'all-players') document.getElementById('tab-all-players-view').classList.remove('hidden');
      if (activeAdminTab === 'teams') document.getElementById('tab-teams-view').classList.remove('hidden');
    });
  });

  // Export & Action Listeners
  document.getElementById('export-master-csv-btn')?.addEventListener('click', () => exportPlayersToCSV(store.getPlayers()));
  document.getElementById('export-master-pdf-btn')?.addEventListener('click', () => exportPlayersToPDF(store.getPlayers()));
  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    store.logoutAdmin();
    renderAdminDashboard(containerEl);
  });

  document.getElementById('clear-all-players-btn')?.addEventListener('click', () => {
    if (confirm("⚠️ WARNING: Are you sure you want to delete ALL player registrations?")) {
      store.clearAllPlayers();
      renderAdminDashboard(containerEl);
    }
  });

  // Realtime Search Listener for Admin Players Table
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
    };

    ['input', 'keyup', 'change', 'paste'].forEach(evt => {
      adminSearchInput.addEventListener(evt, filterAdminPlayers);
    });
  }

  // Action Listeners on Tables
  bindAdminTableActions(containerEl);
}

function renderAdminPlayersRows(playersList) {
  if (playersList.length === 0) {
    return `<tr><td colspan="7" class="py-8 text-center text-xs text-slate-500">No players found</td></tr>`;
  }

  return playersList.map(p => {
    const isApproved = (p.registrationStatus || p.paymentStatus) === 'APPROVED';
    const isRejected = (p.registrationStatus || p.paymentStatus) === 'REJECTED';

    return `
      <tr class="hover:bg-slate-950/60">
        <td class="py-3 px-3">
          <span class="px-1.5 py-0.5 bg-slate-950 text-amber-400 font-mono text-[9px] font-black rounded border border-amber-500/40">
            ${p.registrationId || p.regNo || 'JSL2026-0001'} (#${p.displayRegistrationNumber || p.serialNo})
          </span>
        </td>
        <td class="py-3 px-3 font-bold text-white text-xs">
          <div class="flex items-center gap-2">
            <img src="${p.photoUrl || p.player_photo_url}" class="w-8 h-8 rounded-lg object-cover border border-slate-700" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'"/>
            <div>
              <div>${p.name}</div>
              <div class="text-[9px] text-slate-400 font-normal">Age: ${p.age || 24} Yrs</div>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 text-xs">
          <div class="text-slate-300 font-medium">Father: ${p.fatherName || 'N/A'}</div>
          <div class="text-[9px] text-slate-400">📍 ${p.village || ''}, ${p.district || 'Paschim Medinipur'}</div>
        </td>
        <td class="py-3 px-3 text-xs">
          <div class="font-bold text-sky-400 text-[10px]">${p.category || p.playingType || 'All Rounder'}</div>
          <div class="text-[9px] text-slate-400">${p.battingStyle || 'Right Hand Bat'}</div>
        </td>
        <td class="py-3 px-3 font-mono text-xs text-amber-300">
          📞 ${p.phone || 'N/A'}
        </td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 text-[9px] font-black rounded-full border ${isApproved ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : isRejected ? 'bg-red-950 text-red-300 border-red-800' : 'bg-amber-950 text-amber-300 border-amber-800'}">
            ${isApproved ? '🟢 APPROVED' : isRejected ? '⚪ REJECTED' : '🔴 PENDING'}
          </span>
        </td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-1">
            <button data-edit-id="${p.id}" class="edit-player-btn p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700">
              <i data-lucide="edit-2" class="w-3.5 h-3.5 pointer-events-none"></i>
            </button>
            <button data-delete-id="${p.id}" class="delete-player-btn p-1.5 bg-red-950 hover:bg-red-900 text-red-400 rounded-lg border border-red-800">
              <i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function bindAdminTableActions(containerEl) {
  // Approve Player
  containerEl.querySelectorAll('.approve-player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.approve-player-btn');
      const pId = targetBtn ? targetBtn.getAttribute('data-approve-id') : null;
      if (pId) {
        store.updatePlayerStatus(pId, 'APPROVED', 'APPROVED');
        renderAdminDashboard(containerEl);
      }
    });
  });

  // Reject Player
  containerEl.querySelectorAll('.reject-player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.reject-player-btn');
      const pId = targetBtn ? targetBtn.getAttribute('data-reject-id') : null;
      if (pId) {
        store.updatePlayerStatus(pId, 'REJECTED', 'REJECTED');
        renderAdminDashboard(containerEl);
      }
    });
  });

  // Edit Player
  containerEl.querySelectorAll('.edit-player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.edit-player-btn');
      const pId = targetBtn ? targetBtn.getAttribute('data-edit-id') : null;
      if (pId) {
        const player = store.getPlayerById(pId);
        openAdminEditPlayerModal(player, containerEl);
      }
    });
  });

  // Delete Player (Dynamic Continuous Re-Indexing)
  containerEl.querySelectorAll('.delete-player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.delete-player-btn');
      const pId = targetBtn ? targetBtn.getAttribute('data-delete-id') : null;
      if (pId && confirm("Are you sure you want to delete this player? Remaining serial numbers will re-index continuously.")) {
        store.deletePlayer(pId);
        renderAdminDashboard(containerEl);
      }
    });
  });

  // Delete Team
  containerEl.querySelectorAll('.delete-team-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.delete-team-btn');
      const tId = targetBtn ? targetBtn.getAttribute('data-delete-team-id') : null;
      if (tId && confirm("Are you sure you want to delete this team?")) {
        store.deleteTeam(tId);
        renderAdminDashboard(containerEl);
      }
    });
  });

  // Search filter in Admin Table
  document.getElementById('admin-player-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const allPlayers = store.getPlayers();
    const filtered = allPlayers.filter(p => 
      (p.name || '').toLowerCase().includes(query) ||
      (p.registrationId || p.regNo || '').toLowerCase().includes(query) ||
      (p.phone || '').toLowerCase().includes(query) ||
      (p.village || p.district || '').toLowerCase().includes(query)
    );
    const tbody = document.getElementById('admin-all-players-table-body');
    if (tbody) tbody.innerHTML = renderAdminPlayersRows(filtered);
    if (window.lucide) window.lucide.createIcons();
    bindAdminTableActions(containerEl);
  });
}

// --- ADMIN LOGIN SCREEN (WITH TOP-RIGHT 'X' CROSS CLOSE BUTTON) ---
function renderAdminLoginScreen(containerEl) {
  containerEl.innerHTML = `
    <div class="max-w-md mx-auto my-8 p-6 bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl shadow-2xl space-y-4 animate-fade-in text-center relative">
      
      <!-- TOP RIGHT 'X' CROSS BUTTON FOR BACK / CLOSE -->
      <button id="close-admin-login-btn" class="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80 border border-slate-700 transition-colors shadow">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>

      <div class="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto text-slate-950 font-black text-2xl border border-amber-300 shadow-xl">
        🔐
      </div>

      <div>
        <h2 class="text-xl font-black text-white">Master Admin Verification</h2>
        <p class="text-xs text-slate-400 mt-0.5">Single Source Supabase & Realtime Cloud Data Control</p>
      </div>

      <form id="admin-login-form" class="space-y-3 text-left">
        <div>
          <label class="block text-[10px] font-bold text-slate-300 uppercase mb-1">Admin Email ID *</label>
          <input type="email" id="admin-email" required value="bakolaypan@gmail.com" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500 font-mono" />
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-300 uppercase mb-1">Password *</label>
          <input type="password" id="admin-password" required value="Suman@1995" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500 font-mono" />
        </div>

        <button type="submit" class="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black text-xs rounded-xl shadow-xl transition-all border border-amber-300">
          Unlock Master Admin Control Panel
        </button>
      </form>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // CLOSE 'X' BUTTON CLICK -> RETURN HOME / LANDING
  document.getElementById('close-admin-login-btn')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('user_updated'));
  });

  document.getElementById('admin-login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-password').value;

    const res = store.authenticateAdmin(email, pass);
    if (res.success) {
      renderAdminDashboard(containerEl);
    } else {
      alert(res.message || "Invalid Credentials");
    }
  });
}

// --- ADMIN EDIT PLAYER MODAL ---
function openAdminEditPlayerModal(player, containerEl) {
  if (!player) return;

  const modalHtml = `
    <div id="admin-edit-player-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 overflow-y-auto">
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-800 modal-content-container text-left max-h-[90vh] overflow-y-auto">
        <button id="close-edit-player-modal" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-amber-950 text-amber-400 text-[9px] font-black rounded border border-amber-800 uppercase">MASTER ADMIN EDIT</span>
          <h2 class="text-base font-black text-white mt-0.5">Edit Player Registration (${player.registrationId || player.regNo})</h2>
        </div>

        <!-- DOCUMENT VERIFICATION SCREENSHOTS (FULL HD ZOOMABLE) -->
        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
          <div class="text-[9px] font-extrabold text-amber-400 uppercase">HD Document Verification & Image Links</div>
          <div class="grid grid-cols-3 gap-1.5 text-center">
            
            <!-- 1. PLAYER PHOTO -->
            <div class="space-y-1">
              <span class="text-[8px] font-extrabold text-slate-300 block uppercase">Player Photo</span>
              <img src="${player.photoUrl || player.player_photo_url}" class="doc-zoomable-img w-full h-20 rounded-lg object-cover border border-amber-500/50 hover:border-amber-400 shadow cursor-pointer transition-all" title="Click to view full HD player photo" data-zoom-title="${player.name} - Player Photo" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E';" />
              <span class="text-[8px] text-amber-400 block font-bold cursor-pointer underline">🔍 Zoom Photo</span>
            </div>

            <!-- 2. AADHAAR CARD -->
            <div class="space-y-1">
              <span class="text-[8px] font-extrabold text-slate-300 block uppercase">Aadhaar Proof</span>
              ${player.aadharPhotoUrl || player.aadharBackUrl ? `
                <img src="${player.aadharPhotoUrl || player.aadharBackUrl}" class="doc-zoomable-img w-full h-20 rounded-lg object-cover border border-sky-500/50 hover:border-sky-400 shadow cursor-pointer transition-all" title="Click to view full HD Aadhaar document" data-zoom-title="${player.name} - Aadhaar Document" onerror="this.src='assets/jsl_logo.jpg'" />
                <span class="text-[8px] text-sky-400 block font-bold cursor-pointer underline">🔍 Zoom Aadhaar</span>
              ` : `<span class="text-[8px] text-slate-500 block">N/A</span>`}
            </div>

            <!-- 3. PAYMENT RECEIPT -->
            <div class="space-y-1">
              <span class="text-[8px] font-extrabold text-slate-300 block uppercase">Payment Receipt</span>
              ${player.paymentReceiptUrl || player.paymentProofUrl ? `
                <img src="${player.paymentReceiptUrl || player.paymentProofUrl}" class="doc-zoomable-img w-full h-20 rounded-lg object-cover border border-emerald-500/50 hover:border-emerald-400 shadow cursor-pointer transition-all" title="Click to view full HD payment receipt" data-zoom-title="${player.name} - Payment Receipt" onerror="this.src='assets/jsl_logo.jpg'" />
                <span class="text-[8px] text-emerald-400 block font-bold cursor-pointer underline">🔍 Zoom Receipt</span>
              ` : `<span class="text-[8px] text-slate-500 block">N/A</span>`}
            </div>

          </div>
        </div>

        <form id="admin-edit-player-form" class="space-y-2.5">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Player Name *</label>
              <input type="text" id="edit-ply-name" value="${player.name}" required class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Father's Name</label>
              <input type="text" id="edit-ply-father-name" value="${player.fatherName || ''}" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Phone Number *</label>
              <input type="tel" id="edit-ply-phone" value="${player.phone || ''}" required class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Category</label>
              <select id="edit-ply-category" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500">
                <option value="Batsman" ${(player.category || player.playingType) === 'Batsman' ? 'selected' : ''}>Batsman</option>
                <option value="Bowler" ${(player.category || player.playingType) === 'Bowler' ? 'selected' : ''}>Bowler</option>
                <option value="All-rounder" ${(player.category || player.playingType) === 'All-rounder' ? 'selected' : ''}>All-rounder</option>
                <option value="Wicket Keeper" ${(player.category || player.playingType) === 'Wicket Keeper' ? 'selected' : ''}>Wicket Keeper</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Registration Status</label>
              <select id="edit-ply-status" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500">
                <option value="APPROVED" ${(player.registrationStatus || player.paymentStatus) === 'APPROVED' ? 'selected' : ''}>APPROVED (🟢 Green)</option>
                <option value="PENDING" ${(player.registrationStatus || player.paymentStatus) === 'PENDING' ? 'selected' : ''}>PENDING (🔴 Red)</option>
                <option value="REJECTED" ${(player.registrationStatus || player.paymentStatus) === 'REJECTED' ? 'selected' : ''}>REJECTED</option>
              </select>
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">UPI Reference No</label>
              <input type="text" id="edit-ply-upiref" value="${player.paymentRef || player.remarks || ''}" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500 font-mono" />
            </div>
          </div>

          <button type="submit" class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg">
            Save Player Changes
          </button>
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

  document.getElementById('admin-edit-player-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newStatus = document.getElementById('edit-ply-status').value;
    store.updatePlayer({
      id: player.id,
      name: document.getElementById('edit-ply-name').value,
      fatherName: document.getElementById('edit-ply-father-name').value,
      phone: document.getElementById('edit-ply-phone').value,
      category: document.getElementById('edit-ply-category').value,
      role: document.getElementById('edit-ply-category').value,
      playingType: document.getElementById('edit-ply-category').value,
      paymentStatus: newStatus,
      registrationStatus: newStatus,
      paymentRef: document.getElementById('edit-ply-upiref').value
    });

    removeModal();
    renderAdminDashboard(containerEl);
  });
}

function openFullDocumentViewer(imgSrc, title = 'Document Proof Viewer') {
  const modalHtml = `
    <div id="full-doc-zoom-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 bg-slate-950/95 backdrop-blur-2xl">
      <div class="max-w-4xl w-full p-4 relative space-y-3 animate-fade-in text-center bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <button id="close-doc-zoom-btn" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1.5 bg-slate-800 rounded-xl">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
        <div class="text-left border-b border-slate-800 pb-2">
          <span class="px-2 py-0.5 bg-amber-950 text-amber-400 font-mono text-[9px] font-black rounded border border-amber-800">HD DOCUMENT VERIFICATION</span>
          <h3 class="text-white font-black text-base mt-0.5">${title}</h3>
        </div>
        <div class="max-h-[75vh] overflow-auto flex justify-center p-2 bg-slate-950 rounded-xl border border-slate-800">
          <img src="${imgSrc}" class="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl" />
        </div>
        <button id="close-doc-zoom-bottom-btn" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow">
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
