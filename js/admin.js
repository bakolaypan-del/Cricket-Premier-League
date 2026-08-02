// Admin Master Data & Payment Verification Panel (Developer: Suman Kolay)

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
    <div class="space-y-8 animate-fade-in">
      <!-- Admin Header Stats -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div class="flex items-center gap-3">
            <span class="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <i data-lucide="shield-check" class="w-6 h-6"></i>
            </span>
            <div>
              <h1 class="text-2xl font-black text-slate-900">Master Admin Control Panel</h1>
              <p class="text-xs text-slate-500">Log ID: <strong class="text-slate-800">bakolaypan@gmail.com</strong> • Realtime Supabase Data & Approvals</p>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button id="export-master-csv-btn" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-2">
            <i data-lucide="download" class="w-4 h-4 text-emerald-600"></i> Export Master CSV
          </button>
          <button id="admin-logout-btn" class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-1.5 transition-colors">
            <i data-lucide="log-out" class="w-4 h-4"></i> Logout Admin
          </button>
        </div>
      </div>

      <!-- Admin Tabs Navigation -->
      <div class="flex border-b border-slate-200 space-x-2 overflow-x-auto pb-1" id="admin-tab-nav">
        <button data-tab="payments" class="admin-tab-btn active px-5 py-2.5 rounded-t-xl text-sm font-bold flex items-center gap-2 border-b-2 border-amber-500 text-amber-700 bg-white">
          <i data-lucide="badge-indian-rupee" class="w-4 h-4"></i> Pending Player Payments 
          <span class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-black">${pendingPlayers.length}</span>
        </button>
        <button data-tab="all-players" class="admin-tab-btn px-5 py-2.5 rounded-t-xl text-sm font-bold flex items-center gap-2 border-b-2 border-transparent text-slate-500 hover:text-slate-900">
          <i data-lucide="users" class="w-4 h-4"></i> All Registered Players (${players.length})
        </button>
        <button data-tab="teams" class="admin-tab-btn px-5 py-2.5 rounded-t-xl text-sm font-bold flex items-center gap-2 border-b-2 border-transparent text-slate-500 hover:text-slate-900">
          <i data-lucide="shield" class="w-4 h-4"></i> Registered Teams (${teams.length})
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="admin-tab-content">
        <!-- 1. Pending Payment Verification Tab -->
        <div id="tab-payments-view" class="space-y-6">
          <div class="glass-card p-6 bg-white">
            <div class="flex justify-between items-center mb-6">
              <div>
                <h3 class="text-lg font-bold text-slate-900">Pending Player Approvals</h3>
                <p class="text-xs text-slate-500">Approve ₹ 200 UPI transaction proofs to change player status indicator to Green (🟢 Approved).</p>
              </div>
            </div>

            ${pendingPlayers.length === 0 ? `
              <div class="text-center py-12 border border-dashed border-slate-300 rounded-xl">
                <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80"></i>
                <p class="text-slate-800 font-semibold">All Payments Verified!</p>
                <p class="text-xs text-slate-500 mt-1">There are no pending player registrations requiring approval right now.</p>
              </div>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm text-slate-700">
                  <thead class="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th class="py-3.5 px-4">Serial & Player</th>
                      <th class="py-3.5 px-4">Address & Phone</th>
                      <th class="py-3.5 px-4">Category</th>
                      <th class="py-3.5 px-4">UPI Ref No</th>
                      <th class="py-3.5 px-4">Aadhar Back & Proof</th>
                      <th class="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    ${pendingPlayers.map(p => `
                      <tr class="hover:bg-slate-50">
                        <td class="py-4 px-4">
                          <div class="flex items-center gap-3">
                            <img src="${p.photoUrl}" class="w-12 h-12 rounded-xl object-cover border border-slate-300" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'"/>
                            <div>
                              <div class="font-bold text-slate-900">${p.name}</div>
                              <span class="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-black rounded">Serial ${p.serialNo}</span>
                            </div>
                          </div>
                        </td>
                        <td class="py-4 px-4">
                          <div class="font-semibold text-slate-800">${p.phone}</div>
                          <div class="text-xs text-slate-500">${p.address || 'Chandrakona Town PS'}</div>
                        </td>
                        <td class="py-4 px-4">
                          <span class="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold">${p.category || p.role}</span>
                        </td>
                        <td class="py-4 px-4">
                          <div class="font-mono text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 inline-block font-bold">
                            ${p.paymentRef}
                          </div>
                        </td>
                        <td class="py-4 px-4 text-xs">
                          <div class="flex items-center gap-2">
                            ${p.aadharBackUrl && p.aadharBackUrl.startsWith('data:image') ? `
                              <a href="${p.aadharBackUrl}" target="_blank" class="text-sky-700 font-bold underline">Aadhar Back Preview</a>
                            ` : `<span class="text-slate-600 font-semibold">Aadhar Proof Attached</span>`}
                          </div>
                          <div class="text-slate-500 mt-1">Screenshot: ${p.paymentProofUrl ? 'Attached' : 'Verified'}</div>
                        </td>
                        <td class="py-4 px-4 text-right space-x-2">
                          <button data-approve="${p.id}" class="approve-pay-btn px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5">
                            <i data-lucide="check-circle" class="w-4 h-4"></i> Approve Payment
                          </button>
                          <button data-reject="${p.id}" class="reject-pay-btn px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl border border-red-300 transition-all inline-flex">
                            Reject
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

        <!-- 2. All Players Tab -->
        <div id="tab-all-players-view" class="space-y-6 hidden">
          <div class="glass-card p-6 bg-white">
            <h3 class="text-lg font-bold text-slate-900 mb-4">All Registered Players Directory</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm text-slate-700">
                <thead class="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-4">Serial No</th>
                    <th class="py-3 px-4">Name & Address</th>
                    <th class="py-3 px-4">Phone</th>
                    <th class="py-3 px-4">Category</th>
                    <th class="py-3 px-4">Approval Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  ${players.map(p => `
                    <tr>
                      <td class="py-3 px-4 font-mono font-bold">Serial ${p.serialNo}</td>
                      <td class="py-3 px-4 font-bold text-slate-900">
                        ${p.name}
                        <div class="text-xs text-slate-500 font-normal">${p.address || ''}</div>
                      </td>
                      <td class="py-3 px-4">${p.phone}</td>
                      <td class="py-3 px-4 font-semibold text-sky-700">${p.category || p.role}</td>
                      <td class="py-3 px-4">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${p.paymentStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}">
                          <span class="${p.paymentStatus === 'APPROVED' ? 'status-circle-green' : 'status-circle-red'}"></span>
                          ${p.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 3. Registered Teams Tab -->
        <div id="tab-teams-view" class="space-y-6 hidden">
          <div class="glass-card p-6 bg-white">
            <h3 class="text-lg font-bold text-slate-900 mb-4">All Registered Franchise Teams</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              ${teams.map((t, idx) => `
                <div class="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <div class="flex items-center gap-4">
                    <img src="${t.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300'}" class="w-14 h-14 rounded-2xl object-cover border border-slate-300" />
                    <div>
                      <span class="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-black rounded">Team ${idx + 1}</span>
                      <h4 class="text-lg font-black text-slate-900 leading-tight mt-0.5">${t.name}</h4>
                      <div class="text-xs text-slate-600 mt-1">Owner: <strong>${t.ownerName}</strong> (${t.ownerPhone})</div>
                      ${t.coOwnerName ? `<div class="text-[11px] text-slate-500">Co-Owner: ${t.coOwnerName} (${t.coOwnerPhone})</div>` : ''}
                    </div>
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

// --- SECURE ADMIN LOGIN SCREEN MODAL/VIEW ---
function renderAdminLoginScreen(containerEl) {
  containerEl.innerHTML = `
    <div class="min-h-[60vh] flex items-center justify-center py-10 animate-fade-in">
      <div class="glass-card max-w-md w-full p-8 bg-white border border-slate-200 shadow-2xl space-y-6 text-center">
        <div class="w-16 h-16 rounded-2xl bg-amber-500 text-white mx-auto flex items-center justify-center font-black text-3xl shadow-lg">
          🔒
        </div>

        <div>
          <h2 class="text-2xl font-black text-slate-900">Master Admin Login</h2>
          <p class="text-xs text-slate-500 mt-1">Enter your Admin ID & Password to access the control panel</p>
        </div>

        <form id="admin-login-form" class="space-y-4 text-left">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Admin Login ID *</label>
            <input type="email" id="admin-email" required placeholder="bakolaypan@gmail.com" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500 font-semibold" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Admin Password *</label>
            <input type="password" id="admin-password" required placeholder="••••••••" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500" />
          </div>

          <div id="admin-login-error" class="hidden p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold">
            Invalid Admin Email ID or Password!
          </div>

          <button type="submit" class="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
            <i data-lucide="key" class="w-4 h-4 text-amber-400"></i> Login to Admin Panel
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
  const tabBtns = containerEl.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      tabBtns.forEach(b => {
        b.classList.remove('active', 'border-amber-500', 'text-amber-700', 'bg-white');
        b.classList.add('border-transparent', 'text-slate-500');
      });
      btn.classList.add('active', 'border-amber-500', 'text-amber-700', 'bg-white');
      btn.classList.remove('border-transparent', 'text-slate-500');

      document.querySelectorAll('#admin-tab-content > div').forEach(div => div.classList.add('hidden'));
      document.getElementById(`tab-${tabName}-view`)?.classList.remove('hidden');
    });
  });

  containerEl.querySelectorAll('.approve-pay-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const playerId = e.target.getAttribute('data-approve');
      store.updatePlayerStatus(playerId, 'APPROVED');
      renderAdminDashboard(containerEl);
    });
  });

  containerEl.querySelectorAll('.reject-pay-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const playerId = e.target.getAttribute('data-reject');
      const reason = prompt("Enter rejection reason:", "Invalid payment transaction ID");
      if (reason) {
        store.updatePlayerStatus(playerId, 'REJECTED', reason);
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
