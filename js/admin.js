// Admin Master Data & Payment Verification Panel with Single Source Cloud Control (Developer: Suman Kolay)

import { store } from './store.js';
import { exportPlayersToCSV, exportTeamsToCSV, exportPlayersToPDF } from './export.js';
import { openSquareImageCropModal, compressImage } from './app.js';

let activeAdminTab = 'payments'; // 'payments', 'all-players', 'teams'

export function renderAdminDashboard(containerEl) {
  // STRICT ADMIN AUTHENTICATION LOCK (bakolaypan@gmail.com / Suman@2030)
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
        <button data-tab="auction" class="admin-tab-btn ${activeAdminTab === 'auction' ? 'active border-amber-400 text-amber-400 bg-slate-900/90' : 'border-transparent text-slate-400 hover:text-white'} px-4 sm:px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2">
          <i data-lucide="gavel" class="w-4 h-4"></i> Auction Controls
        </button>
        <button data-tab="fixtures" class="admin-tab-btn ${activeAdminTab === 'fixtures' ? 'active border-amber-400 text-amber-400 bg-slate-900/90' : 'border-transparent text-slate-400 hover:text-white'} px-4 sm:px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2">
          <i data-lucide="calendar" class="w-4 h-4"></i> Scheduler
        </button>
        <button data-tab="scorer" class="admin-tab-btn ${activeAdminTab === 'scorer' ? 'active border-amber-400 text-amber-400 bg-slate-900/90' : 'border-transparent text-slate-400 hover:text-white'} px-4 sm:px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-black flex items-center gap-2 border-b-2">
          <i data-lucide="gamepad-2" class="w-4 h-4"></i> Match Scorer
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
                      <th class="py-3 px-3 font-mono font-bold text-amber-400">UPI Ref</th>
                      <th class="py-3 px-3 text-right flex justify-end">Actions</th>
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
                        <div class="text-[9px] text-slate-400 font-bold">Purse: ₹${t.purseBudget - t.purseSpent} / ₹${t.purseBudget}</div>
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

        <!-- 4. Auction Controls Tab -->
        <div id="tab-auction-view" class="${activeAdminTab === 'auction' ? '' : 'hidden'} space-y-6 animate-fade-in">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Setup & Settings -->
            <div class="glass-card p-4 sm:p-6 bg-slate-900/90 border border-slate-800 space-y-4">
              <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <i data-lucide="settings" class="w-5 h-5 text-amber-500"></i> Auction Parameters
              </h3>
              <form id="admin-auction-settings-form" class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">DEFAULT PLAYER BASE PRICE (INR)</label>
                  <input type="number" id="auction-setting-base-price" value="${store.getAuctionSettings().defaultBasePrice}" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">DEFAULT TEAM PURSE BUDGET</label>
                  <input type="number" id="auction-setting-purse-budget" value="${store.getAuctionSettings().defaultPurseBudget}" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5" />
                </div>
                <button type="submit" class="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl border border-amber-300">
                  Update Settings
                </button>
              </form>

              <!-- Put Player on Block Form -->
              <div class="border-t border-slate-800 pt-4 space-y-4">
                <h4 class="text-xs font-black text-white uppercase tracking-wider">Start Auction for a Player</h4>
                <div>
                  <label class="block text-xs font-bold text-slate-400 mb-1">SELECT APPROVED PLAYER</label>
                  <select id="auction-select-player" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5">
                    <option value="">-- Choose Player --</option>
                    ${players.filter(p => (p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED') && !p.teamId).map(p => `
                      <option value="${p.id}">${p.name} (${p.category || 'All Rounder'}) - Base: ₹${p.basePrice || 200}</option>
                    `).join('')}
                  </select>
                </div>
                <button id="auction-start-bid-btn" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl border border-emerald-400">
                  Put Player on Auction Block
                </button>
              </div>
            </div>

            <!-- Active Auctioneer Controls -->
            <div class="glass-card p-4 sm:p-6 bg-slate-900/90 border border-slate-800 space-y-4">
              <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <i data-lucide="gavel" class="w-5 h-5 text-amber-500"></i> Active Auction Console
              </h3>
              <div id="admin-active-auction-block" class="space-y-4"></div>
            </div>
          </div>
        </div>

        <!-- 5. Match Scheduler Tab -->
        <div id="tab-fixtures-view" class="${activeAdminTab === 'fixtures' ? '' : 'hidden'} space-y-6 animate-fade-in">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Create Fixture Form -->
            <div class="glass-card p-4 sm:p-6 bg-slate-900/90 border border-slate-800 space-y-4 md:col-span-1">
              <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-5 h-5 text-sky-400"></i> Schedule Match
              </h3>
              <form id="admin-create-fixture-form" class="space-y-3.5">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">TOURNAMENT LEAGUE</label>
                  <select id="fixture-league-category" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5">
                    <option value="JSL">JHANKRA SUPER LEAGUE (JSL)</option>
                    <option value="JPL">JHANKRA PREMIER LEAGUE (JPL)</option>
                    <option value="KPL">KOTA PREMIER LEAGUE (KPL)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">TEAM A</label>
                  <select id="fixture-team-a" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5" required>
                    <option value="">-- Select Team --</option>
                    ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">TEAM B</label>
                  <select id="fixture-team-b" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5" required>
                    <option value="">-- Select Team --</option>
                    ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 mb-1">MATCH DATE</label>
                    <input type="date" id="fixture-date" value="${new Date().toISOString().split('T')[0]}" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5" required />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 mb-1">START TIME</label>
                    <input type="time" id="fixture-time" value="09:00" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5" required />
                  </div>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">VENUE</label>
                  <input type="text" id="fixture-venue" value="JHANKRA SCHOOL GROUND" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5" required />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1">TOTAL OVERS</label>
                  <input type="number" id="fixture-overs" value="16" min="1" max="50" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5" required />
                </div>
                <button type="submit" class="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl border border-sky-400 shadow-md">
                  Schedule Fixture
                </button>
              </form>
            </div>

            <!-- List Scheduled Fixtures -->
            <div class="glass-card p-4 sm:p-6 bg-slate-900/90 border border-slate-800 space-y-4 md:col-span-2">
              <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <i data-lucide="calendar" class="w-5 h-5 text-sky-400"></i> Scheduled Matches
              </h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs sm:text-sm text-slate-300">
                  <thead class="bg-slate-950 text-[10px] uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th class="py-3 px-3">Teams</th>
                      <th class="py-3 px-3">Date / Venue</th>
                      <th class="py-3 px-3">Overs</th>
                      <th class="py-3 px-3">Status</th>
                      <th class="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody id="admin-fixtures-list" class="divide-y divide-slate-800"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Live Match Scorer Tab -->
        <div id="tab-scorer-view" class="${activeAdminTab === 'scorer' ? '' : 'hidden'} space-y-6 animate-fade-in">
          <div class="glass-card p-4 sm:p-6 bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <i data-lucide="gamepad-2" class="w-5 h-5 text-emerald-400"></i> Scorer Control Console
            </h3>

            <!-- Match Selector -->
            <div id="scorer-match-selector-block" class="space-y-4">
              <div class="flex flex-col sm:flex-row gap-3 items-end">
                <div class="flex-grow">
                  <label class="block text-xs font-bold text-slate-400 mb-1">SELECT MATCH TO SCORE</label>
                  <select id="scorer-select-match" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5">
                    <option value="">-- Choose Match --</option>
                  </select>
                </div>
                <button id="scorer-start-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl border border-emerald-400 shadow">
                  Load Scoring Panel
                </button>
              </div>
            </div>

            <!-- Active Scorer Panel -->
            <div id="scorer-active-panel" class="hidden border-t border-slate-800 pt-4 space-y-6">
              <!-- Active match status summary card -->
              <div id="scorer-match-status-summary"></div>
              
              <!-- Setup striker, non-striker and bowler -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Batsman 1 (On Strike 🏏)</label>
                  <select id="scorer-select-striker" class="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-2"></select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Batsman 2 (Non-Strike)</label>
                  <select id="scorer-select-non-striker" class="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-2"></select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Active Bowler ⚾</label>
                  <select id="scorer-select-bowler" class="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-2"></select>
                </div>
              </div>

              <!-- Ball Scoring Inputs -->
              <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div class="font-bold text-xs text-slate-400 uppercase tracking-wider">Scoring Actions</div>
                
                <!-- Runs & Wicket Buttons Grid -->
                <div class="grid grid-cols-3 sm:grid-cols-7 gap-2">
                  <button data-runs="0" class="scorer-ball-act-btn py-3 bg-slate-850 hover:bg-slate-800 font-extrabold text-sm rounded-xl">0 Runs</button>
                  <button data-runs="1" class="scorer-ball-act-btn py-3 bg-slate-850 hover:bg-slate-800 font-extrabold text-sm rounded-xl">1 Run</button>
                  <button data-runs="2" class="scorer-ball-act-btn py-3 bg-slate-850 hover:bg-slate-800 font-extrabold text-sm rounded-xl">2 Runs</button>
                  <button data-runs="3" class="scorer-ball-act-btn py-3 bg-slate-850 hover:bg-slate-800 font-extrabold text-sm rounded-xl">3 Runs</button>
                  <button data-runs="4" class="scorer-ball-act-btn py-3 bg-blue-900 hover:bg-blue-800 font-black text-sm rounded-xl border border-blue-500">4 (FOUR)</button>
                  <button data-runs="6" class="scorer-ball-act-btn py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-sm rounded-xl border border-amber-300">6 (SIX)</button>
                  <button id="scorer-wicket-btn" class="py-3 bg-red-950 hover:bg-red-900 text-red-300 font-black text-sm rounded-xl border border-red-800">WICKET</button>
                </div>

                <!-- Extras & Dismissal details -->
                <div class="flex flex-wrap gap-4 text-xs font-bold pt-2 border-t border-slate-900">
                  <div class="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" id="scorer-extra-wide" class="w-4 h-4 accent-amber-500" />
                    <label for="scorer-extra-wide">Wide Ball (WD)</label>
                  </div>
                  <div class="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" id="scorer-extra-noball" class="w-4 h-4 accent-amber-500" />
                    <label for="scorer-extra-noball">No Ball (NB)</label>
                  </div>
                  <div class="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" id="scorer-extra-bye" class="w-4 h-4 accent-amber-500" />
                    <label for="scorer-extra-bye">Byes (B)</label>
                  </div>
                  <div class="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" id="scorer-extra-legbye" class="w-4 h-4 accent-amber-500" />
                    <label for="scorer-extra-legbye">Leg Byes (LB)</label>
                  </div>
                </div>

                <!-- Current Over Logs -->
                <div class="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                  <span class="text-slate-400 font-bold">This Over:</span>
                  <div id="scorer-this-over-balls" class="flex gap-1.5"></div>
                </div>

                <!-- Submit and Innings controls -->
                <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-900">
                  <button id="scorer-swap-strike-btn" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl">
                    🔄 Swap Strike manually
                  </button>
                  <div class="flex items-center gap-2">
                    <button id="scorer-end-innings-btn" class="px-4 py-2 bg-purple-950 text-purple-300 font-black text-xs rounded-xl border border-purple-800">
                      🌓 Close Innings
                    </button>
                    <button id="scorer-finish-match-btn" class="px-4 py-2 bg-red-950 text-red-300 font-black text-xs rounded-xl border border-red-800">
                      🏆 Finish Match & Set Winner
                    </button>
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
      document.getElementById('tab-auction-view')?.classList.add('hidden');
      document.getElementById('tab-fixtures-view')?.classList.add('hidden');
      document.getElementById('tab-scorer-view')?.classList.add('hidden');

      if (activeAdminTab === 'payments') document.getElementById('tab-payments-view').classList.remove('hidden');
      if (activeAdminTab === 'all-players') document.getElementById('tab-all-players-view').classList.remove('hidden');
      if (activeAdminTab === 'teams') document.getElementById('tab-teams-view').classList.remove('hidden');
      
      if (activeAdminTab === 'auction') {
        document.getElementById('tab-auction-view')?.classList.remove('hidden');
        renderActiveAuctionBlock();
      }
      if (activeAdminTab === 'fixtures') {
        document.getElementById('tab-fixtures-view')?.classList.remove('hidden');
        renderAdminFixturesList();
      }
      if (activeAdminTab === 'scorer') {
        document.getElementById('tab-scorer-view')?.classList.remove('hidden');
        renderScorerMatchesList();
      }
    });
  });

  // Bind Auction Settings Form Submit
  document.getElementById('admin-auction-settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const defaultBasePrice = Number(document.getElementById('auction-setting-base-price').value) || 200;
    const defaultPurseBudget = Number(document.getElementById('auction-setting-purse-budget').value) || 8000;
    store.updateAuctionSettings({ defaultBasePrice, defaultPurseBudget });
    alert("Auction parameters updated successfully!");
    renderAdminDashboard(containerEl);
  });

  // Bind Put Player on block btn
  document.getElementById('auction-start-bid-btn')?.addEventListener('click', async () => {
    const pId = document.getElementById('auction-select-player').value;
    if (!pId) return alert("Select a player first!");
    const p = store.getPlayerById(pId);
    if (p) {
      await store.updateLiveAuctionState({
        active_player_id: p.id,
        name: p.name,
        photoUrl: p.photoUrl || p.player_photo_url || '',
        category: p.category || p.playingType || 'All Rounder',
        basePrice: p.basePrice || 200,
        current_bid: p.basePrice || 200,
        highest_bidder_team_id: null,
        timer_left: 30,
        status: 'BIDDING'
      });
      renderActiveAuctionBlock();
    }
  });

  // Bind Create Fixture Form Submit
  document.getElementById('admin-create-fixture-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const teamAId = document.getElementById('fixture-team-a').value;
    const teamBId = document.getElementById('fixture-team-b').value;
    if (teamAId === teamBId) return alert("Team A and Team B cannot be the same!");
    const teamA = store.getTeamById(teamAId);
    const teamB = store.getTeamById(teamBId);
    store.registerFixture({
      leagueCode: document.getElementById('fixture-league-category').value,
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
    alert("Match scheduled successfully!");
    renderAdminDashboard(containerEl);
  });

  // Bind Scorer match start
  document.getElementById('scorer-start-btn')?.addEventListener('click', () => {
    const matchId = document.getElementById('scorer-select-match').value;
    if (!matchId) return alert("Select a match to score!");
    activeScoringMatchId = matchId;
    const fixtures = store.getFixtures();
    const fixture = fixtures.find(f => f.id === matchId);
    if (fixture) {
      if (!fixture.liveMatchState) {
        openTossSelectionModal(fixture, () => {
          currentScoringState = fixture.liveMatchState;
          document.getElementById('scorer-active-panel').classList.remove('hidden');
          renderScorerActivePanel();
        });
      } else {
        currentScoringState = fixture.liveMatchState;
        document.getElementById('scorer-active-panel').classList.remove('hidden');
        renderScorerActivePanel();
      }
    }
  });

  // Bind Scorer Ball Actions
  document.querySelectorAll('.scorer-ball-act-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const runs = Number(e.currentTarget.getAttribute('data-runs')) || 0;
      processScorerBall(runs);
    });
  });

  // Bind Scorer Wicket btn
  document.getElementById('scorer-wicket-btn')?.addEventListener('click', () => {
    openScorerWicketModal();
  });

  // Bind Swap Strike
  document.getElementById('scorer-swap-strike-btn')?.addEventListener('click', () => {
    const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
    if (fixture && fixture.liveMatchState) {
      const temp = fixture.liveMatchState.strikerId;
      fixture.liveMatchState.strikerId = fixture.liveMatchState.nonStrikerId;
      fixture.liveMatchState.nonStrikerId = temp;
      store.updateFixture(fixture);
      renderScorerActivePanel();
      alert("Strike swapped manually!");
    }
  });

  // Bind Close Innings
  document.getElementById('scorer-end-innings-btn')?.addEventListener('click', () => {
    const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
    if (fixture && fixture.liveMatchState) {
      if (fixture.liveMatchState.innings === 2) {
        return alert("Innings 2 is already in progress or completed!");
      }
      if (confirm("Confirm Close Innings 1? This will calculate target and setup Innings 2.")) {
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
        alert(`Innings 1 closed! Target set to ${fixture.liveMatchState.target}. Please choose new batsmen and bowler for Innings 2.`);
      }
    }
  });

  // Bind Finish Match
  document.getElementById('scorer-finish-match-btn')?.addEventListener('click', () => {
    const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
    if (fixture && fixture.liveMatchState) {
      const state = fixture.liveMatchState;
      let resultText = "";
      let winnerTeamId = "";
      
      const teamAScore = state.innings === 2 ? fixture.teamAScore?.runs : state.runs;
      const teamBScore = state.innings === 2 ? state.runs : 0;

      if (state.innings === 2) {
        if (teamBScore >= state.target) {
          resultText = `${fixture.teamBName} won by ${10 - state.wickets} wickets`;
          winnerTeamId = fixture.teamBId;
        } else {
          const runsMargin = (state.target - 1) - teamBScore;
          resultText = `${fixture.teamAName} won by ${runsMargin} runs`;
          winnerTeamId = fixture.teamAId;
        }
      } else {
        resultText = `${fixture.teamAName} won (Opponent conceded)`;
        winnerTeamId = fixture.teamAId;
      }

      const finalResult = prompt("Confirm Match Outcome:", resultText);
      if (finalResult !== null) {
        fixture.status = 'COMPLETED';
        fixture.result = finalResult;
        fixture.winnerTeamId = winnerTeamId;
        fixture.teamAScore = { runs: teamAScore, wickets: state.innings === 2 ? (fixture.teamAScore?.wickets || 0) : state.wickets, overs: state.innings === 2 ? (fixture.teamAScore?.overs || 16) : state.overs, balls: state.innings === 2 ? (fixture.teamAScore?.balls || 0) : state.balls };
        fixture.teamBScore = { runs: teamBScore, wickets: state.innings === 2 ? state.wickets : 0, overs: state.innings === 2 ? state.overs : 0, balls: state.innings === 2 ? state.balls : 0 };
        store.updateFixture(fixture);
        alert("Match finalized successfully!");
        renderAdminDashboard(containerEl);
      }
    }
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
  // Event Delegation so Delete, Edit, Approve, and Reject buttons work 100% reliably
  containerEl.onclick = (e) => {
    // 1. Delete Player
    const deleteBtn = e.target.closest('.delete-player-btn');
    if (deleteBtn) {
      const pId = deleteBtn.getAttribute('data-delete-id');
      if (pId && confirm("⚠️ Are you sure you want to delete this player registration? Remaining numbers will re-index continuously.")) {
        store.deletePlayer(pId);
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
          <input type="email" id="admin-email" required placeholder="Enter Admin Email ID" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500 font-mono" />
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-300 uppercase mb-1">Password *</label>
          <input type="password" id="admin-password" required placeholder="Enter Admin Password" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500 font-mono" />
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

  document.getElementById('admin-edit-player-modal')?.remove();

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
          <!-- MASTER ADMIN PLAYER PHOTO CHANGE & RE-CROP SECTION (SQUARE 1:1) -->
          <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-[9px] font-black text-amber-400 uppercase">Admin Photo Control (Square 1:1)</label>
              <span class="text-[8px] text-slate-400">Crop or replace photo</span>
            </div>

            <div class="flex items-center gap-2.5">
              <img id="admin-edit-photo-preview" src="${player.photoUrl || player.player_photo_url}" class="w-12 h-12 rounded-xl object-cover border-2 border-amber-500 shadow-md" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E';" />
              
              <div class="flex items-center gap-1.5 flex-1 flex-wrap">
                <label class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[9px] rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1">
                  <i data-lucide="image" class="w-3 h-3 text-emerald-400"></i> Gallery
                  <input type="file" id="admin-photo-gallery-input" accept="image/*" class="hidden" />
                </label>
                <label class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[9px] rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1">
                  <i data-lucide="camera" class="w-3 h-3 text-amber-400"></i> Camera
                  <input type="file" id="admin-photo-camera-input" accept="image/*" capture="user" class="hidden" />
                </label>
                <button type="button" id="admin-crop-photo-btn" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] rounded-lg border border-amber-400 flex items-center gap-1 shadow">
                  <i data-lucide="crop" class="w-3 h-3"></i> Crop 1:1
                </button>
              </div>
            </div>
          </div>

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

  let updatedPhotoUrl = player.photoUrl || player.player_photo_url || '';

  const processAdminPhotoSelection = async (file) => {
    if (!file) return;
    const rawDataUrl = await compressImage(file, 1200, 1200, 0.85);
    openSquareImageCropModal(rawDataUrl, (croppedUrl) => {
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
      openSquareImageCropModal(currentSrc, (croppedUrl) => {
        updatedPhotoUrl = croppedUrl;
        const previewImg = document.getElementById('admin-edit-photo-preview');
        if (previewImg) previewImg.src = croppedUrl;
      }, `Re-Crop ${player.name}'s Photo (Square 1:1)`);
    }
  });

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
      paymentRef: document.getElementById('edit-ply-upiref').value,
      photoUrl: updatedPhotoUrl,
      player_photo_url: updatedPhotoUrl
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

// --- MASTER ADMIN CONFIGURATIONS, SCORING & AUCTION ENGINE ---
const FIREBASE_DB_URL = "https://cpl-jsl-2026-default-rtdb.firebaseio.com";
let activeScoringMatchId = null;
let currentScoringState = null;

async function renderActiveAuctionBlock() {
  const container = document.getElementById('admin-active-auction-block');
  if (!container) return;
  
  const state = await store.getLiveAuctionState();
  if (!state || !state.active_player_id) {
    container.innerHTML = `
      <div class="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
        No player currently on the bidding block. Select a player on the left to start.
      </div>
    `;
    return;
  }

  const teams = store.getTeams();
  const player = store.getPlayerById(state.active_player_id);
  const bidderTeam = teams.find(t => t.id === state.highest_bidder_team_id);

  container.innerHTML = `
    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
      <div class="flex items-center gap-3">
        <img src="${state.photoUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' rx=\'20\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E'}" class="w-16 h-16 rounded-xl object-cover border border-amber-500" />
        <div>
          <h4 class="font-black text-white text-base">${state.name}</h4>
          <div class="text-xs text-slate-400">Category: <span class="text-sky-400 font-bold">${state.category}</span></div>
          <div class="text-xs text-slate-400">Base Price: <span class="text-amber-400 font-bold">₹ ${state.basePrice}</span></div>
        </div>
      </div>

      <div class="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
        <div>
          <div class="text-[10px] font-bold text-slate-400 uppercase">CURRENT HIGH BID</div>
          <div class="text-2xl font-black text-amber-400">₹ ${state.current_bid}</div>
        </div>
        <div class="text-right">
          <div class="text-[10px] font-bold text-slate-400 uppercase">HIGHEST BIDDER</div>
          <div class="text-sm font-black text-white">${bidderTeam ? bidderTeam.name : 'No bids yet'}</div>
        </div>
      </div>

      <!-- Quick Bids & Manual Bid Entry -->
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-slate-400">INCREMENT BID FOR TEAM</label>
        <div class="grid grid-cols-2 gap-2">
          <select id="auction-bid-team-select" class="bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-2">
            <option value="">-- Choose Bidding Team --</option>
            ${teams.map(t => `<option value="${t.id}">${t.name} (Purse: ₹${t.purseBudget - t.purseSpent})</option>`).join('')}
          </select>
          <div class="flex gap-1">
            <input type="number" id="auction-bid-amount-input" value="${state.current_bid + 50}" class="w-20 bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-2 text-center" />
            <button id="auction-place-manual-bid-btn" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl border border-amber-300">
              Bid
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-1.5 pt-1">
          <button class="auction-quick-inc-btn py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-205 text-xs font-bold rounded-lg border border-slate-850" data-inc="50">+50</button>
          <button class="auction-quick-inc-btn py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-205 text-xs font-bold rounded-lg border border-slate-850" data-inc="100">+100</button>
          <button class="auction-quick-inc-btn py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-205 text-xs font-bold rounded-lg border border-slate-850" data-inc="200">+200</button>
        </div>
      </div>

      <!-- SOLD / UNSOLD / CANCEL Controls -->
      <div class="space-y-2 pt-2 border-t border-slate-900">
        <div class="grid grid-cols-2 gap-2">
          <button id="auction-mark-unsold-btn" class="py-2.5 bg-red-950/60 hover:bg-red-900 text-red-300 font-extrabold text-xs rounded-xl border border-red-900">
            Unsold
          </button>
          <button id="auction-mark-sold-btn" class="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl border border-emerald-400 shadow">
            Sold
          </button>
        </div>
        <button id="auction-pullback-btn" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 shadow-md">
          ↩️ Pull Back Player (Cancel Bidding)
        </button>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Bind manual bid
  document.getElementById('auction-place-manual-bid-btn')?.addEventListener('click', () => {
    const teamId = document.getElementById('auction-bid-team-select').value;
    const amount = Number(document.getElementById('auction-bid-amount-input').value) || 0;
    if (!teamId) return alert("Select a bidding team!");
    if (amount <= state.current_bid) return alert(`Bid must be higher than current bid (₹${state.current_bid})!`);
    
    const team = teams.find(t => t.id === teamId);
    if (team) {
      const remainingPurse = team.purseBudget - team.purseSpent;
      const slotsLeft = 13 - (team.squadCount || 0);
      const reservedAmount = (slotsLeft - 1) * (state.basePrice || 200);
      const maxAllowed = remainingPurse - reservedAmount;
      if (amount > maxAllowed) {
        return alert(`Safeguard Warning: Team ${team.name} cannot bid more than ₹${maxAllowed}. Must reserve ₹${reservedAmount} for remaining empty slots!`);
      }
    }

    state.current_bid = amount;
    state.highest_bidder_team_id = teamId;
    store.updateLiveAuctionState(state);
    renderActiveAuctionBlock();
  });

  // Bind quick increments
  document.querySelectorAll('.auction-quick-inc-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const inc = Number(e.currentTarget.getAttribute('data-inc')) || 50;
      const teamId = document.getElementById('auction-bid-team-select').value;
      if (!teamId) return alert("Select a bidding team to place increment!");
      
      const newBid = state.current_bid + inc;
      const team = teams.find(t => t.id === teamId);
      if (team) {
        const remainingPurse = team.purseBudget - team.purseSpent;
        const slotsLeft = 13 - (team.squadCount || 0);
        const reservedAmount = (slotsLeft - 1) * (state.basePrice || 200);
        const maxAllowed = remainingPurse - reservedAmount;
        if (newBid > maxAllowed) {
          return alert(`Safeguard Warning: Team ${team.name} cannot bid more than ₹${maxAllowed}. Must reserve ₹${reservedAmount} for remaining empty slots!`);
        }
      }

      state.current_bid = newBid;
      state.highest_bidder_team_id = teamId;
      store.updateLiveAuctionState(state);
      renderActiveAuctionBlock();
    });
  });

  // Bind Unsold
  document.getElementById('auction-mark-unsold-btn')?.addEventListener('click', async () => {
    if (confirm("Mark this player as UNSOLD?")) {
      await store.updateLiveAuctionState(null);
      alert("Player marked unsold. Bidding block cleared.");
      window.dispatchEvent(new CustomEvent('players_updated'));
    }
  });

  // Bind Pull Back Player (Cancel Bidding Block)
  document.getElementById('auction-pullback-btn')?.addEventListener('click', async () => {
    if (confirm(`Pull back ${state.name} from the auction block?`)) {
      await store.updateLiveAuctionState(null);
      alert("Player pulled back. Auction block cleared.");
      window.dispatchEvent(new CustomEvent('players_updated'));
    }
  });

  // Bind Sold
  document.getElementById('auction-mark-sold-btn')?.addEventListener('click', async () => {
    if (!state.highest_bidder_team_id) return alert("Cannot mark sold: No team has bid yet!");
    const t = teams.find(team => team.id === state.highest_bidder_team_id);
    if (confirm(`Confirm sale of ${state.name} to ${t ? t.name : 'Team'} for ₹${state.current_bid}?`)) {
      store.assignPlayerToTeam(state.active_player_id, state.highest_bidder_team_id, state.current_bid);
      await store.updateLiveAuctionState(null);
      alert("Player sold successfully!");
      window.dispatchEvent(new CustomEvent('players_updated'));
    }
  });
}

function renderAdminFixturesList() {
  const tbody = document.getElementById('admin-fixtures-list');
  if (!tbody) return;

  const fixtures = store.getFixtures();
  if (fixtures.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-xs text-slate-500">No matches scheduled yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = fixtures.map(f => `
    <tr class="hover:bg-slate-950/60">
      <td class="py-3 px-3">
        <div class="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
          <span class="px-1.5 py-0.5 bg-slate-900 text-sky-400 font-mono text-[9px] rounded border border-sky-500/30">${f.leagueCode || 'JSL'}</span>
          <span>${f.teamAName} <span class="text-slate-500 font-semibold">vs</span> ${f.teamBName}</span>
        </div>
      </td>
      <td class="py-3 px-3 text-xs">
        <div class="text-slate-200 font-semibold">${f.date} at ${f.time}</div>
        <div class="text-slate-500 text-[10px]">📍 ${f.venue}</div>
      </td>
      <td class="py-3 px-3 text-xs text-slate-300 font-bold">${f.oversLimit || 16} Overs</td>
      <td class="py-3 px-3 text-xs">
        ${f.status === 'LIVE' ? `
          <span class="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded-full font-black text-[9px] border border-emerald-800 animate-pulse uppercase">LIVE</span>
        ` : f.status === 'COMPLETED' ? `
          <span class="px-2 py-0.5 bg-slate-900 text-slate-400 rounded-full font-black text-[9px] border border-slate-800 uppercase">COMPLETED</span>
        ` : `
          <span class="px-2 py-0.5 bg-slate-900 text-sky-400 rounded-full font-black text-[9px] border border-slate-800 uppercase">SCHEDULED</span>
        `}
      </td>
      <td class="py-3 px-3 text-right">
        <button data-delete-fixture-id="${f.id}" class="admin-delete-fixture-btn px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 font-extrabold text-[10px] rounded-lg border border-red-800 shadow">
          Cancel
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) window.lucide.createIcons();

  tbody.querySelectorAll('.admin-delete-fixture-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const fId = e.currentTarget.getAttribute('data-delete-fixture-id');
      if (confirm("Delete this scheduled match?")) {
        store.deleteFixture(fId);
        renderAdminFixturesList();
      }
    });
  });
}

function renderScorerMatchesList() {
  const selectEl = document.getElementById('scorer-select-match');
  if (!selectEl) return;

  const fixtures = store.getFixtures();
  const selectables = fixtures.filter(f => f.status !== 'COMPLETED');

  selectEl.innerHTML = `
    <option value="">-- Choose Match --</option>
    ${selectables.map(f => `
      <option value="${f.id}" ${activeScoringMatchId === f.id ? 'selected' : ''}>
        [${f.leagueCode || 'JSL'}] ${f.teamAName} vs ${f.teamBName} (${f.date} ${f.time}) - Status: ${f.status}
      </option>
    `).join('')}
  `;
}

function renderScorerActivePanel() {
  const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
  if (!fixture) return;

  const state = fixture.liveMatchState || {};
  
  const battingTeamId = state.innings === 2 ? fixture.teamBId : fixture.teamAId;
  const bowlingTeamId = state.innings === 2 ? fixture.teamAId : fixture.teamBId;
  
  const battingTeamName = battingTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;
  const bowlingTeamName = bowlingTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;

  const batPlayers = store.getPlayers().filter(p => p.teamId === battingTeamId && (p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED'));
  const bowlPlayers = store.getPlayers().filter(p => p.teamId === bowlingTeamId && (p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED'));

  const strikerSel = document.getElementById('scorer-select-striker');
  const nonStrikerSel = document.getElementById('scorer-select-non-striker');
  const bowlerSel = document.getElementById('scorer-select-bowler');

  if (strikerSel && nonStrikerSel && bowlerSel) {
    strikerSel.innerHTML = `<option value="">-- Choose Striker --</option>` + batPlayers.map(p => `
      <option value="${p.id}" ${state.strikerId === p.id ? 'selected' : ''}>${p.name}</option>
    `).join('');

    nonStrikerSel.innerHTML = `<option value="">-- Choose Non-Striker --</option>` + batPlayers.map(p => `
      <option value="${p.id}" ${state.nonStrikerId === p.id ? 'selected' : ''}>${p.name}</option>
    `).join('');

    bowlerSel.innerHTML = `<option value="">-- Choose Bowler --</option>` + bowlPlayers.map(p => `
      <option value="${p.id}" ${state.bowlerId === p.id ? 'selected' : ''}>${p.name}</option>
    `).join('');
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
        <div class="text-xs font-black text-amber-400 mt-1">
          Target: ${state.target} | Need ${runsNeeded} runs in ${remainingBalls} balls remaining
        </div>
      `;
    }

    summaryContainer.innerHTML = `
      <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
        <div>
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Innings ${state.innings} Batting: <span class="text-emerald-400 font-extrabold">${battingTeamName}</span>
          </div>
          <div class="text-2xl font-black text-white mt-1">
            ${state.runs}/${state.wickets} <span class="text-xs text-slate-400 font-normal">(${state.overs}.${state.balls} / ${fixture.oversLimit} Overs)</span>
          </div>
          ${targetTxt}
        </div>
        <div class="text-right">
          <div class="text-xs font-bold text-slate-350">Run Rate: ${runRate}</div>
          <div class="text-[9px] text-slate-500 font-semibold mt-1">Bowling: ${bowlingTeamName}</div>
        </div>
      </div>
    `;
  }

  // Render current over balls ticker
  const overBallsTicker = document.getElementById('scorer-this-over-balls');
  if (overBallsTicker) {
    const list = state.overBalls || [];
    overBallsTicker.innerHTML = list.length === 0 ? `<span class="text-slate-500 italic">No balls in this over yet</span>` : list.map(b => {
      let colorClass = 'bg-slate-800 text-slate-300';
      if (b.type === 'four') colorClass = 'bg-blue-900 text-white font-bold';
      if (b.type === 'six') colorClass = 'bg-amber-500 text-slate-950 font-bold';
      if (b.type === 'wicket') colorClass = 'bg-red-650 text-white font-bold';
      if (b.type === 'wide' || b.type === 'noball') colorClass = 'bg-slate-900 text-amber-500 font-semibold';
      return `<span class="px-2 py-0.5 text-[10px] rounded ${colorClass}">${b.label}</span>`;
    }).join('');
  }
}

function processScorerBall(runsScored) {
  const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
  if (!fixture) return;

  const state = fixture.liveMatchState;
  
  const strikerId = document.getElementById('scorer-select-striker').value;
  const nonStrikerId = document.getElementById('scorer-select-non-striker').value;
  const bowlerId = document.getElementById('scorer-select-bowler').value;

  if (!strikerId || !nonStrikerId || !bowlerId) {
    return alert("Please select Striker, Non-Striker and Bowler first!");
  }

  if (strikerId === nonStrikerId) {
    return alert("Striker and Non-Striker cannot be the same player!");
  }

  state.strikerId = strikerId;
  state.nonStrikerId = nonStrikerId;
  state.bowlerId = bowlerId;

  if (!state.playerStats) state.playerStats = {};
  if (!state.playerStats[strikerId]) {
    state.playerStats[strikerId] = { runs: 0, balls: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
  }
  if (!state.playerStats[nonStrikerId]) {
    state.playerStats[nonStrikerId] = { runs: 0, balls: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
  }
  if (!state.playerStats[bowlerId]) {
    state.playerStats[bowlerId] = { runs: 0, balls: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
  }

  const isWide = document.getElementById('scorer-extra-wide').checked;
  const isNoBall = document.getElementById('scorer-extra-noball').checked;
  const isBye = document.getElementById('scorer-extra-bye').checked;
  const isLegBye = document.getElementById('scorer-extra-legbye').checked;

  let ballLabel = runsScored.toString();
  let ballType = 'ball';
  let totalBallRuns = runsScored;

  if (isWide) {
    ballLabel = 'WD';
    ballType = 'wide';
    totalBallRuns += 1;
  } else if (isNoBall) {
    ballLabel = 'NB';
    ballType = 'noball';
    totalBallRuns += 1;
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

  state.runs += totalBallRuns;

  const isValidBall = !isWide && !isNoBall;
  if (isValidBall) {
    state.balls += 1;
    if (state.balls >= 6) {
      state.overs += 1;
      state.balls = 0;
      state.overBalls = [];
      
      const temp = state.strikerId;
      state.strikerId = state.nonStrikerId;
      state.nonStrikerId = temp;
      alert("Over completed! Swap Strike automatically & select new Bowler.");
    } else {
      if (runsScored === 1 || runsScored === 3) {
        const temp = state.strikerId;
        state.strikerId = state.nonStrikerId;
        state.nonStrikerId = temp;
      }
    }
  }

  state.overBalls.push({
    label: ballLabel,
    type: ballType
  });

  // Reset checkboxes
  document.getElementById('scorer-extra-wide').checked = false;
  document.getElementById('scorer-extra-noball').checked = false;
  document.getElementById('scorer-extra-bye').checked = false;
  document.getElementById('scorer-extra-legbye').checked = false;

  fixture.liveMatchState = state;
  
  const currentBattingScore = { runs: state.runs, wickets: state.wickets, overs: state.overs, balls: state.balls };
  if (state.innings === 2) {
    fixture.teamBScore = currentBattingScore;
  } else {
    fixture.teamAScore = currentBattingScore;
  }

  store.updateFixture(fixture);
  renderScorerActivePanel();
}

function openScorerWicketModal() {
  const fixture = store.getFixtures().find(f => f.id === activeScoringMatchId);
  if (!fixture) return;

  const state = fixture.liveMatchState;
  const battingTeamId = state.innings === 2 ? fixture.teamBId : fixture.teamAId;
  const bowlingTeamId = state.innings === 2 ? fixture.teamAId : fixture.teamBId;

  const batPlayers = store.getPlayers().filter(p => p.teamId === battingTeamId && (p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED'));
  const bowlPlayers = store.getPlayers().filter(p => p.teamId === bowlingTeamId && (p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED'));

  document.getElementById('scorer-wicket-modal')?.remove();

  const modalHtml = `
    <div id="scorer-wicket-modal" class="fixed inset-0 z-[70] modal-overlay flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md">
      <div class="bg-slate-900 border-2 border-red-500/80 max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl text-white text-left">
        <h3 class="text-base font-black text-red-400">Record Wicket Dismissal</h3>
        
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1">DISMISSED BATTER</label>
          <select id="wicket-select-dismissed" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5">
            <option value="${state.strikerId}">Striker: ${store.getPlayerById(state.strikerId)?.name || 'Striker'}</option>
            <option value="${state.nonStrikerId}">Non-Striker: ${store.getPlayerById(state.nonStrikerId)?.name || 'Non-Striker'}</option>
          </select>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1">DISMISSAL TYPE</label>
          <select id="wicket-select-type" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5">
            <option value="BOWLED">Bowled</option>
            <option value="CAUGHT">Caught Out</option>
            <option value="LBW">L.B.W.</option>
            <option value="RUN_OUT">Run Out</option>
            <option value="STUMPED">Stumped</option>
          </select>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1">FIELDER (IF CAUGHT/RUN OUT/STUMPED)</label>
          <select id="wicket-select-fielder" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5">
            <option value="">-- Choose Fielder --</option>
            ${bowlPlayers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button id="cancel-wicket-btn" type="button" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700">
            Cancel
          </button>
          <button id="confirm-wicket-btn" type="button" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl border border-red-400 shadow">
            Out!
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const removeModal = () => document.getElementById('scorer-wicket-modal')?.remove();
  document.getElementById('cancel-wicket-btn')?.addEventListener('click', removeModal);

  document.getElementById('confirm-wicket-btn')?.addEventListener('click', () => {
    const dismissedId = document.getElementById('wicket-select-dismissed').value;
    const type = document.getElementById('wicket-select-type').value;
    const fielderId = document.getElementById('wicket-select-fielder').value;

    state.wickets += 1;

    if (!state.playerStats) state.playerStats = {};
    if (!state.playerStats[dismissedId]) {
      state.playerStats[dismissedId] = { runs: 0, balls: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
    }
    state.playerStats[dismissedId].dismissed = true;

    const bowlerId = state.bowlerId;
    if (bowlerId) {
      if (!state.playerStats[bowlerId]) {
        state.playerStats[bowlerId] = { runs: 0, balls: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, dismissed: false };
      }
      if (type !== 'RUN_OUT') {
        state.playerStats[bowlerId].wickets += 1;
      }
    }
    
    state.overBalls.push({
      label: 'W',
      type: 'wicket'
    });

    state.balls += 1;
    if (state.balls >= 6) {
      state.overs += 1;
      state.balls = 0;
      state.overBalls = [];
      alert("Over completed! Strike changes & select Bowler.");
    }

    if (dismissedId === state.strikerId) {
      state.strikerId = '';
    } else {
      state.nonStrikerId = '';
    }

    fixture.liveMatchState = state;
    if (state.innings === 2) {
      fixture.teamBScore = { runs: state.runs, wickets: state.wickets, overs: state.overs, balls: state.balls };
    } else {
      fixture.teamAScore = { runs: state.runs, wickets: state.wickets, overs: state.overs, balls: state.balls };
    }

    store.updateFixture(fixture);
    removeModal();
    renderScorerActivePanel();
    alert("Wicket recorded! Select the new batter on strike.");
  });
}

function openTossSelectionModal(fixture, onComplete) {
  document.getElementById('toss-select-modal')?.remove();

  const modalHtml = `
    <div id="toss-select-modal" class="fixed inset-0 z-[70] modal-overlay flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md">
      <div class="bg-slate-900 border-2 border-amber-500/80 max-w-md w-full p-5 relative space-y-4 animate-fade-in rounded-2xl shadow-2xl text-white text-left">
        <div>
          <span class="px-2 py-0.5 bg-amber-950 text-amber-400 font-mono text-[9px] font-black rounded border border-amber-800 uppercase">MATCH DAY TOSS</span>
          <h3 class="text-base font-black text-white mt-1">Select Toss & First Batting Team</h3>
          <p class="text-xs text-slate-400 leading-snug mt-1">Select the team that won the toss and decided to bat first for: ${fixture.teamAName} vs ${fixture.teamBName}.</p>
        </div>

        <div class="space-y-2">
          <label class="block text-[10px] font-bold text-slate-400 uppercase">First Batting Team</label>
          <select id="toss-first-batting-select" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500">
            <option value="${fixture.teamAId}">${fixture.teamAName}</option>
            <option value="${fixture.teamBId}">${fixture.teamBName}</option>
          </select>
        </div>

        <div class="flex justify-end gap-2.5 pt-2 border-t border-slate-800/80">
          <button id="cancel-toss-btn" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700">
            Cancel
          </button>
          <button id="confirm-toss-btn" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl border border-amber-300 shadow">
            Start Match Scoring
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const removeModal = () => document.getElementById('toss-select-modal')?.remove();
  document.getElementById('cancel-toss-btn')?.addEventListener('click', removeModal);

  document.getElementById('confirm-toss-btn')?.addEventListener('click', () => {
    const firstBattingId = document.getElementById('toss-first-batting-select').value;
    
    const otherTeamId = firstBattingId === fixture.teamAId ? fixture.teamBId : fixture.teamAId;
    const otherTeamName = firstBattingId === fixture.teamAId ? fixture.teamBName : fixture.teamAName;
    const firstBattingName = firstBattingId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;

    fixture.teamAId = firstBattingId;
    fixture.teamAName = firstBattingName;
    fixture.teamBId = otherTeamId;
    fixture.teamBName = otherTeamName;

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
      overBalls: [],
      recentBalls: [],
      playerStats: {}
    };
    fixture.status = 'LIVE';
    
    store.updateFixture(fixture);
    removeModal();
    onComplete();
  });
}
