// Admin Master Data & Payment Verification Panel with Single Source Cloud Control (Developer: Suman Kolay)

import { store } from './store.js';
import { exportPlayersToCSV, exportTeamsToCSV } from './export.js';

export function renderAdminDashboard(containerEl) {
  // STRICT ADMIN AUTHENTICATION LOCK (bakolaypan@gmail.com / Suman@1995)
  if (!store.isAdminAuthenticated()) {
    renderAdminLoginScreen(containerEl);
    return;
  }

  const leagues = store.getLeagues();
  const players = store.getPlayers();
  const teams = store.getTeams();

  const pendingPlayers = players.filter(p => p.paymentStatus === 'PENDING');
  const approvedPlayers = players.filter(p => p.paymentStatus === 'APPROVED');

  containerEl.innerHTML = `
    <div class="space-y-6 sm:space-y-8 animate-fade-in">
      <!-- Admin Header Stats -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div>
          <div class="flex items-center gap-3">
            <span class="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40">
              <i data-lucide="shield-check" class="w-6 h-6"></i>
            </span>
            <div>
              <h1 class="text-lg sm:text-2xl font-black text-white">Master Admin Control Panel</h1>
              <p class="text-xs text-slate-400">Log ID: <strong class="text-amber-400">bakolaypan@gmail.com</strong> • Single Source Cloud Realtime Database</p>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          <button id="export-master-csv-btn" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all">
            <i data-lucide="download" class="w-4 h-4 text-emerald-400"></i> Export CSV
          </button>
          <button id="clear-all-players-btn" class="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-300 text-xs font-bold rounded-xl border border-red-800 flex items-center gap-1.5 transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4 text-red-400"></i> Clear All Registrations
          </button>
          <button id="admin-logout-btn" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors">
            <i data-lucide="log-out" class="w-4 h-4"></i> Logout
          </button>
        </div>
      </div>

      <!-- Admin Tabs Navigation -->
      <div class="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-1" id="admin-tab-nav">
        <button data-tab="payments" class="admin-tab-btn active px-4 sm:px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 border-amber-400 text-amber-400 bg-slate-900/90">
          <i data-lucide="badge-indian-rupee" class="w-4 h-4"></i> Pending Approvals 
          <span class="px-2 py-0.5 text-xs bg-red-950 text-red-400 rounded-full font-black border border-red-800">${pendingPlayers.length}</span>
        </button>
        <button data-tab="all-players" class="admin-tab-btn px-4 sm:px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 border-transparent text-slate-400 hover:text-white">
          <i data-lucide="users" class="w-4 h-4"></i> All Registered Players (${players.length})
        </button>
        <button data-tab="teams" class="admin-tab-btn px-4 sm:px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 border-transparent text-slate-400 hover:text-white">
          <i data-lucide="shield" class="w-4 h-4"></i> Registered Teams (${teams.length})
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="admin-tab-content">
        <!-- 1. Pending Payment Verification Tab -->
        <div id="tab-payments-view" class="space-y-6">
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
                      <th class="py-3 px-3">Serial & Player</th>
                      <th class="py-3 px-3">Address & Phone</th>
                      <th class="py-3 px-3">Category</th>
                      <th class="py-3 px-3">UPI Ref No</th>
                      <th class="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800">
                    ${pendingPlayers.map(p => `
                      <tr class="hover:bg-slate-950/60">
                        <td class="py-3 px-3">
                          <div class="flex items-center gap-2.5">
                            <img src="${p.photoUrl}" class="w-10 h-10 rounded-xl object-cover border border-slate-700" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'"/>
                            <div>
                              <div class="font-bold text-white text-xs sm:text-sm">${p.name}</div>
                              <span class="px-1.5 py-0.5 bg-slate-950 text-amber-400 font-mono text-[9px] font-black rounded border border-amber-500/40">Serial ${p.serialNo}</span>
                            </div>
                          </div>
                        </td>
                        <td class="py-3 px-3">
                          <div class="font-bold text-white text-xs">${p.phone}</div>
                          <div class="text-[10px] text-slate-400">${p.address || 'Chandrakona Town PS'}</div>
                        </td>
                        <td class="py-3 px-3">
                          <span class="px-2 py-0.5 bg-sky-950 text-sky-400 border border-sky-800 rounded-lg text-[10px] font-bold">${p.category || p.role}</span>
                        </td>
                        <td class="py-3 px-3">
                          <div class="font-mono text-[11px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 inline-block font-bold">
                            ${p.paymentRef}
                          </div>
                        </td>
                        <td class="py-3 px-3 text-right space-x-1.5">
                          <button data-approve="${p.id}" class="approve-pay-btn px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow transition-all inline-flex items-center gap-1">
                            <i data-lucide="check" class="w-3 h-3"></i> Approve
                          </button>
                          <button data-edit-player="${p.id}" class="edit-player-btn px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] rounded-lg shadow transition-all inline-flex items-center gap-1">
                            <i data-lucide="edit-2" class="w-3 h-3"></i> Edit
                          </button>
                          <button data-delete-player="${p.id}" class="delete-player-btn px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow transition-all inline-flex items-center gap-1">
                            <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>

        <!-- 2. All Players Directory Tab with Edit & Delete -->
        <div id="tab-all-players-view" class="space-y-6 hidden">
          <div class="glass-card p-4 sm:p-6 bg-slate-900/90 border border-slate-800">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-base sm:text-lg font-black text-white">All Registered Players Directory (${players.length})</h3>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead class="bg-slate-950 text-[10px] sm:text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th class="py-3 px-3">Serial No</th>
                    <th class="py-3 px-3">Name & Address</th>
                    <th class="py-3 px-3">Phone</th>
                    <th class="py-3 px-3">Category</th>
                    <th class="py-3 px-3">Approval Status</th>
                    <th class="py-3 px-3 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                  ${players.map(p => `
                    <tr class="hover:bg-slate-950/60">
                      <td class="py-3 px-3 font-mono font-bold text-amber-400">Serial ${p.serialNo}</td>
                      <td class="py-3 px-3 font-bold text-white">
                        ${p.name}
                        <div class="text-[10px] text-slate-400 font-normal">${p.address || ''}</div>
                      </td>
                      <td class="py-3 px-3">${p.phone}</td>
                      <td class="py-3 px-3 font-semibold text-sky-400">${p.category || p.role}</td>
                      <td class="py-3 px-3">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${p.paymentStatus === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}">
                          <span class="${p.paymentStatus === 'APPROVED' ? 'status-circle-green' : 'status-circle-red'}"></span>
                          ${p.paymentStatus}
                        </span>
                      </td>
                      <td class="py-3 px-3 text-right space-x-1.5">
                        <button data-edit-player="${p.id}" class="edit-player-btn px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] rounded-lg shadow inline-flex items-center gap-1">
                          <i data-lucide="edit-2" class="w-3 h-3"></i> Edit
                        </button>
                        <button data-delete-player="${p.id}" class="delete-player-btn px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow inline-flex items-center gap-1">
                          <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 3. Registered Teams Tab with Edit & Delete -->
        <div id="tab-teams-view" class="space-y-6 hidden">
          <div class="glass-card p-4 sm:p-6 bg-slate-900/90 border border-slate-800">
            <h3 class="text-base sm:text-lg font-black text-white mb-4">All Registered Franchise Teams (${teams.length})</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${teams.map((t, idx) => `
                <div class="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                  <div class="flex items-center gap-3">
                    <img src="${t.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300'}" class="w-12 h-12 rounded-xl object-cover border border-slate-700" />
                    <div>
                      <span class="px-2 py-0.5 bg-sky-950 text-sky-400 font-mono text-[9px] font-black rounded border border-sky-800">Team ${idx + 1}</span>
                      <h4 class="text-base font-black text-white mt-0.5">${t.name}</h4>
                      <div class="text-xs text-slate-300">Owner: <strong>${t.ownerName}</strong> (${t.ownerPhone})</div>
                      ${t.coOwnerName ? `<div class="text-[10px] text-slate-400">Co-Owner: ${t.coOwnerName} (${t.coOwnerPhone})</div>` : ''}
                    </div>
                  </div>

                  <div class="flex flex-col gap-1.5 flex-shrink-0">
                    <button data-edit-team="${t.id}" class="edit-team-btn px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] rounded-lg shadow flex items-center gap-1">
                      <i data-lucide="edit-2" class="w-3 h-3"></i> Edit
                    </button>
                    <button data-delete-team="${t.id}" class="delete-team-btn px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow flex items-center gap-1">
                      <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  setupAdminEventHandlers(containerEl);
  if (window.lucide) window.lucide.createIcons();
}

// --- SECURE ADMIN LOGIN SCREEN ---
function renderAdminLoginScreen(containerEl) {
  containerEl.innerHTML = `
    <div class="min-h-[60vh] flex items-center justify-center py-10 animate-fade-in">
      <div class="glass-card max-w-md w-full p-8 bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6 text-center">
        <div class="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 mx-auto flex items-center justify-center font-black text-3xl shadow-lg border border-amber-300">
          🔒
        </div>

        <div>
          <h2 class="text-2xl font-black text-white">Master Admin Login</h2>
          <p class="text-xs text-slate-400 mt-1">Enter your Admin ID & Password to access the control panel</p>
        </div>

        <form id="admin-login-form" class="space-y-4 text-left">
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Admin Login ID *</label>
            <input type="email" id="admin-email" required placeholder="bakolaypan@gmail.com" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500 font-semibold" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Admin Password *</label>
            <input type="password" id="admin-password" required placeholder="••••••••" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500" />
          </div>

          <div id="admin-login-error" class="hidden p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-300 text-xs font-bold">
            Invalid Admin Email ID or Password!
          </div>

          <button type="submit" class="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2">
            <i data-lucide="key" class="w-4 h-4 text-slate-950"></i> Login to Admin Panel
          </button>
        </form>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('admin-login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    const res = store.authenticateAdmin(email, password);
    if (res.success) {
      renderAdminDashboard(containerEl);
    } else {
      const errBox = document.getElementById('admin-login-error');
      if (errBox) {
        errBox.classList.remove('hidden');
        errBox.innerText = res.message;
      }
    }
  });
}

function setupAdminEventHandlers(containerEl) {
  // Tab switching
  const tabBtns = containerEl.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      tabBtns.forEach(b => {
        b.classList.remove('active', 'border-amber-400', 'text-amber-400', 'bg-slate-900/90');
        b.classList.add('border-transparent', 'text-slate-400');
      });
      btn.classList.add('active', 'border-amber-400', 'text-amber-400', 'bg-slate-900/90');
      btn.classList.remove('border-transparent', 'text-slate-400');

      document.querySelectorAll('#admin-tab-content > div').forEach(div => div.classList.add('hidden'));
      document.getElementById(`tab-${tabName}-view`)?.classList.remove('hidden');
    });
  });

  // Approve Payment
  containerEl.querySelectorAll('.approve-pay-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const playerId = e.currentTarget.getAttribute('data-approve');
      store.updatePlayerStatus(playerId, 'APPROVED');
      renderAdminDashboard(containerEl);
    });
  });

  // Edit Player Event Listeners
  containerEl.querySelectorAll('.edit-player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const playerId = e.currentTarget.getAttribute('data-edit-player');
      const player = store.getPlayerById(playerId);
      if (player) openAdminEditPlayerModal(player, containerEl);
    });
  });

  // Delete Player Event Listeners
  containerEl.querySelectorAll('.delete-player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const playerId = e.currentTarget.getAttribute('data-delete-player');
      const player = store.getPlayerById(playerId);
      if (player && confirm(`Are you sure you want to DELETE player "${player.name}"? This action cannot be undone.`)) {
        store.deletePlayer(playerId);
        renderAdminDashboard(containerEl);
      }
    });
  });

  // Delete All Registrations Button
  containerEl.querySelector('#clear-all-players-btn')?.addEventListener('click', () => {
    if (confirm("⚠️ ARE YOU SURE YOU WANT TO CLEAR ALL REGISTERED PLAYERS ACROSS ALL DEVICES?")) {
      store.clearAllPlayers();
      renderAdminDashboard(containerEl);
    }
  });

  // Edit Team Event Listeners
  containerEl.querySelectorAll('.edit-team-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-edit-team');
      const team = store.getTeamById(teamId);
      if (team) openAdminEditTeamModal(team, containerEl);
    });
  });

  // Delete Team Event Listeners
  containerEl.querySelectorAll('.delete-team-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-delete-team');
      const team = store.getTeamById(teamId);
      if (team && confirm(`Are you sure you want to DELETE team "${team.name}"? This action cannot be undone.`)) {
        store.deleteTeam(teamId);
        renderAdminDashboard(containerEl);
      }
    });
  });

  containerEl.querySelector('#export-master-csv-btn')?.addEventListener('click', () => {
    exportPlayersToCSV(store.getPlayers(), store.getLeagues(), store.getTeams());
  });

  containerEl.querySelector('#admin-logout-btn')?.addEventListener('click', () => {
    store.logoutAdmin();
    renderAdminDashboard(containerEl);
  });
}

// --- ADMIN EDIT PLAYER MODAL ---
function openAdminEditPlayerModal(player, containerEl) {
  const modalHtml = `
    <div id="admin-edit-player-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 overflow-y-auto">
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-800 modal-content-container text-left">
        <button id="close-edit-player-modal" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-amber-950 text-amber-400 text-[9px] font-black rounded border border-amber-800">MASTER ADMIN EDIT</span>
          <h2 class="text-base font-black text-white mt-0.5">Edit Player Details</h2>
        </div>

        <form id="admin-edit-player-form" class="space-y-2.5">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Full Name *</label>
              <input type="text" id="edit-ply-name" value="${player.name}" required class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Phone Number *</label>
              <input type="tel" id="edit-ply-phone" value="${player.phone || ''}" required class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Full Address</label>
            <input type="text" id="edit-ply-address" value="${player.address || ''}" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500" />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Category</label>
              <select id="edit-ply-category" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500">
                <option value="Right Hand Batsman" ${player.category === 'Right Hand Batsman' ? 'selected' : ''}>Right Hand Batsman</option>
                <option value="Left Hand Batsman" ${player.category === 'Left Hand Batsman' ? 'selected' : ''}>Left Hand Batsman</option>
                <option value="Right Hand Bowler" ${player.category === 'Right Hand Bowler' ? 'selected' : ''}>Right Hand Bowler</option>
                <option value="Left Hand Bowler" ${player.category === 'Left Hand Bowler' ? 'selected' : ''}>Left Hand Bowler</option>
                <option value="All Rounder" ${player.category === 'All Rounder' ? 'selected' : ''}>All Rounder</option>
                <option value="Wicketkeeper" ${player.category === 'Wicketkeeper' ? 'selected' : ''}>Wicketkeeper</option>
              </select>
            </div>

            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Payment Status</label>
              <select id="edit-ply-status" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500">
                <option value="APPROVED" ${player.paymentStatus === 'APPROVED' ? 'selected' : ''}>APPROVED (🟢 Green)</option>
                <option value="PENDING" ${player.paymentStatus === 'PENDING' ? 'selected' : ''}>PENDING (🔴 Red)</option>
                <option value="REJECTED" ${player.paymentStatus === 'REJECTED' ? 'selected' : ''}>REJECTED</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">UPI Ref No</label>
              <input type="text" id="edit-ply-upiref" value="${player.paymentRef || ''}" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500 font-mono" />
            </div>

            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Serial No</label>
              <input type="number" id="edit-ply-serial" value="${player.serialNo || 1}" required class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500 font-mono" />
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

  const removeModal = () => document.getElementById('admin-edit-player-modal')?.remove();
  document.getElementById('close-edit-player-modal')?.addEventListener('click', removeModal);

  document.getElementById('admin-edit-player-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    store.updatePlayer({
      id: player.id,
      name: document.getElementById('edit-ply-name').value,
      phone: document.getElementById('edit-ply-phone').value,
      address: document.getElementById('edit-ply-address').value,
      category: document.getElementById('edit-ply-category').value,
      role: document.getElementById('edit-ply-category').value,
      paymentStatus: document.getElementById('edit-ply-status').value,
      paymentRef: document.getElementById('edit-ply-upiref').value,
      serialNo: Number(document.getElementById('edit-ply-serial').value) || player.serialNo
    });

    removeModal();
    renderAdminDashboard(containerEl);
  });
}

// --- ADMIN EDIT TEAM MODAL ---
function openAdminEditTeamModal(team, containerEl) {
  const modalHtml = `
    <div id="admin-edit-team-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 overflow-y-auto">
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-800 modal-content-container text-left">
        <button id="close-edit-team-modal" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-sky-950 text-sky-400 text-[9px] font-black rounded border border-sky-800">MASTER ADMIN EDIT</span>
          <h2 class="text-base font-black text-white mt-0.5">Edit Team Details</h2>
        </div>

        <form id="admin-edit-team-form" class="space-y-2.5">
          <div>
            <label class="block text-[10px] font-bold text-slate-300 uppercase mb-0.5">Team Name *</label>
            <input type="text" id="edit-team-name" value="${team.name}" required class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Owner Name *</label>
              <input type="text" id="edit-owner-name" value="${team.ownerName}" required class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Owner Phone *</label>
              <input type="tel" id="edit-owner-phone" value="${team.ownerPhone || ''}" required class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Co-Owner Name</label>
              <input type="text" id="edit-co-owner-name" value="${team.coOwnerName || ''}" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Co-Owner Phone</label>
              <input type="tel" id="edit-co-owner-phone" value="${team.coOwnerPhone || ''}" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
            </div>
          </div>

          <button type="submit" class="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg">
            Save Team Changes
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('admin-edit-team-modal')?.remove();
  document.getElementById('close-edit-team-modal')?.addEventListener('click', removeModal);

  document.getElementById('admin-edit-team-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    store.updateTeam({
      id: team.id,
      name: document.getElementById('edit-team-name').value,
      ownerName: document.getElementById('edit-owner-name').value,
      ownerPhone: document.getElementById('edit-owner-phone').value,
      coOwnerName: document.getElementById('edit-co-owner-name').value || '',
      coOwnerPhone: document.getElementById('edit-co-owner-phone').value || ''
    });

    removeModal();
    renderAdminDashboard(containerEl);
  });
}
