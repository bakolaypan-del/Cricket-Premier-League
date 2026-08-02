// Core Application Router & Registration Portal (Developer: Suman Kolay)

import { store } from './store.js';
import { exportPlayersToCSV, exportTeamsToCSV, printDigitalPass } from './export.js';
import { renderAdminDashboard } from './admin.js';

let currentRoute = 'landing'; // landing, jsl-hub, admin
let activeJSLTab = 'teams'; // teams, players

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  renderNavbar();
  renderCurrentView();

  window.addEventListener('leagues_updated', () => renderCurrentView());
  window.addEventListener('players_updated', () => renderCurrentView());
  window.addEventListener('teams_updated', () => renderCurrentView());
  window.addEventListener('user_updated', () => {
    renderNavbar();
    renderCurrentView();
  });
}

function navigate(route) {
  currentRoute = route;
  renderCurrentView();
}

// --- IMAGE COMPRESSION UTILITY FOR DEVICE FILE UPLOADS ---
function compressImage(file, maxWidth = 350, maxHeight = 350, quality = 0.7) {
  return new Promise((resolve) => {
    if (!file) {
      resolve('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
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
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300');
    reader.readAsDataURL(file);
  });
}

// --- UPPER HEADER ---
function renderNavbar() {
  const user = store.getUser();
  const navbarEl = document.getElementById('app-navbar');
  if (!navbarEl) return;

  navbarEl.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <!-- Title, Subtitle & Developer Credit -->
      <div class="flex items-center gap-4 cursor-pointer" id="brand-header-logo">
        <div class="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white font-black text-2xl shadow-md transform hover:rotate-6 transition-transform">
          🏏
        </div>
        <div>
          <h1 class="text-xl md:text-2xl font-black text-slate-900 leading-none tracking-tight flex items-center gap-3">
            Cricket Premier League
          </h1>
          <div class="text-xs font-bold text-amber-600 mt-1">Official Tournament & Registration Portal</div>
          <div class="text-[11px] font-bold text-slate-500 tracking-wide mt-0.5">Developer - <span class="text-sky-600 font-extrabold">Suman Kolay</span></div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <button id="admin-panel-nav-btn" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors">
          <i data-lucide="shield-check" class="w-4 h-4 text-amber-600"></i> Admin Panel
        </button>

        <!-- PERSISTENT BLINKING "Registration Here" BUTTON -->
        <button id="header-reg-btn" class="btn-blink-always px-4 py-2.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all">
          <i data-lucide="edit-3" class="w-4 h-4"></i> Registration Here
        </button>
      </div>
    </div>
  `;

  document.getElementById('brand-header-logo')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('admin-panel-nav-btn')?.addEventListener('click', () => navigate('admin'));
  document.getElementById('header-reg-btn')?.addEventListener('click', openRegistrationTypeModal);
  if (window.lucide) window.lucide.createIcons();
}

function renderCurrentView() {
  const container = document.getElementById('main-content');
  if (!container) return;

  switch (currentRoute) {
    case 'landing':
      renderFirstPageLanding(container);
      break;
    case 'jsl-hub':
      renderJSLHub(container);
      break;
    case 'admin':
      renderAdminDashboard(container);
      break;
    default:
      renderFirstPageLanding(container);
  }

  if (window.lucide) window.lucide.createIcons();
}

// --- FIRST PAGE LANDING (THREE SQUARE BOXES ONLY) ---
function renderFirstPageLanding(containerEl) {
  containerEl.innerHTML = `
    <div class="min-h-[65vh] flex flex-col items-center justify-center space-y-10 animate-fade-in py-8">
      
      <div class="text-center space-y-2">
        <span class="px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-extrabold uppercase tracking-widest">
          Select Premier League
        </span>
        <h2 class="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Choose Tournament Category</h2>
      </div>

      <!-- THREE SQUARE BOXES -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 w-full max-w-5xl px-4">
        <div id="btn-click-jpl" class="square-category-box group">
          <div class="category-logo-badge logo-jpl">JPL</div>
          <h3 class="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">JPL</h3>
          <p class="text-sm font-bold text-slate-600 mt-1 uppercase tracking-wider">Jhankra Premier League</p>
        </div>

        <div id="btn-click-jsl" class="square-category-box group hover:border-sky-500">
          <div class="category-logo-badge logo-jsl">JSL</div>
          <h3 class="text-2xl font-black text-slate-900 group-hover:text-sky-600 transition-colors">JSL</h3>
          <p class="text-sm font-bold text-slate-600 mt-1 uppercase tracking-wider">Jhankra Super League</p>
        </div>

        <div id="btn-click-kpl" class="square-category-box group hover:border-purple-500">
          <div class="category-logo-badge logo-kpl">KPL</div>
          <h3 class="text-2xl font-black text-slate-900 group-hover:text-purple-600 transition-colors">KPL</h3>
          <p class="text-sm font-bold text-slate-600 mt-1 uppercase tracking-wider">Kota Premier League</p>
        </div>
      </div>

    </div>
  `;

  document.getElementById('btn-click-jpl')?.addEventListener('click', () => openComingSoonModal('JPL', 'Jhankra Premier League'));
  document.getElementById('btn-click-kpl')?.addEventListener('click', () => openComingSoonModal('KPL', 'Kota Premier League'));
  document.getElementById('btn-click-jsl')?.addEventListener('click', () => navigate('jsl-hub'));
}

// --- COMING SOON MODAL ---
function openComingSoonModal(code, title) {
  const modalHtml = `
    <div id="coming-soon-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
      <div class="bg-white max-w-md w-full p-8 text-center relative space-y-6 animate-fade-in rounded-3xl shadow-2xl border-2 ${code === 'JPL' ? 'border-amber-400' : 'border-purple-400'}">
        <button id="close-cs-btn" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="w-20 h-20 rounded-2xl mx-auto ${code === 'JPL' ? 'logo-jpl' : 'logo-kpl'} flex items-center justify-center font-black text-3xl shadow-lg">
          ${code}
        </div>

        <div>
          <h3 class="text-2xl font-black text-slate-900">${title}</h3>
          <div class="inline-block mt-3 px-4 py-1.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full font-black text-sm uppercase tracking-widest animate-pulse">
            Coming Soon...
          </div>
        </div>

        <p class="text-xs text-slate-600 leading-relaxed">
          Player registrations and squad announcements for <strong>${title} (${code})</strong> will be opening shortly. Stay tuned!
        </p>

        <button id="ok-cs-btn" class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors">
          Got It
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('coming-soon-modal')?.remove();
  document.getElementById('close-cs-btn')?.addEventListener('click', removeModal);
  document.getElementById('ok-cs-btn')?.addEventListener('click', removeModal);
}

// --- JSL TOURNAMENT HUB ---
function renderJSLHub(containerEl) {
  const teams = store.getTeams();
  const players = store.getPlayers();
  const teamMap = new Map(teams.map(t => [t.id, t.name]));

  containerEl.innerHTML = `
    <div class="space-y-8 animate-fade-in">
      
      <!-- Back Button -->
      <button id="back-to-landing-btn" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-2 transition-colors">
        <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Premier League Category Selector
      </button>

      <!-- OFFICIAL JHANKRA SUPER LEAGUE POSTER BANNER HEADER -->
      <div class="jsl-poster-container p-6 md:p-8 space-y-6">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6 border-b-2 border-slate-100 pb-6 text-center md:text-left">
          <div class="flex items-center gap-5">
            <div class="w-20 h-24 md:w-24 md:h-28 rounded-2xl bg-gradient-to-b from-blue-900 to-red-600 p-1 flex-shrink-0 shadow-lg relative border-2 border-white flex flex-col items-center justify-center text-white">
              <i data-lucide="shield" class="w-12 h-12 text-white"></i>
              <span class="text-[10px] font-black tracking-widest mt-1">JSL 2026</span>
            </div>
            <div>
              <div class="jsl-poster-title-navy">JHANKRA</div>
              <div class="jsl-poster-title-red">SUPER LEAGUE</div>
              <div class="inline-block mt-2 px-4 py-1 bg-slate-900 text-white font-extrabold text-xs md:text-sm rounded-md tracking-wider uppercase">
                🚩 8 TEAM LEAGUE CRICKET TOURNAMENT
              </div>
            </div>
          </div>

          <!-- PERSISTENT BLINKING REGISTRATION BUTTON IN POSTER -->
          <button id="jsl-poster-reg-btn" class="btn-blink-always px-6 py-3.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-black text-sm rounded-2xl shadow-xl flex items-center gap-2">
            <i data-lucide="edit-3" class="w-5 h-5"></i> Registration Here
          </button>
        </div>

        <!-- Poster Grid (Prize Money, Entry Fee, Rules) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-red-50/60 border-2 border-red-300 rounded-2xl p-5 text-center space-y-3">
            <div class="inline-block px-3 py-0.5 bg-red-600 text-white font-black text-xs rounded-full uppercase tracking-wider">
              ★ PRIZE MONEY ★
            </div>
            <div class="grid grid-cols-2 gap-3 pt-1">
              <div class="bg-white p-3 rounded-xl border border-red-200 shadow-sm">
                <div class="text-[10px] font-bold text-red-600 uppercase">WINNER</div>
                <div class="text-3xl font-black text-red-600 flex items-center justify-center gap-1">35K 🏆</div>
              </div>
              <div class="bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
                <div class="text-[10px] font-bold text-blue-900 uppercase">RUNNERS</div>
                <div class="text-3xl font-black text-blue-950 flex items-center justify-center gap-1">25K 🏆</div>
              </div>
            </div>
          </div>

          <div class="bg-emerald-50/60 border-2 border-emerald-400 rounded-2xl p-5 text-center space-y-2">
            <div class="inline-block px-4 py-0.5 bg-emerald-700 text-white font-black text-xs rounded-full uppercase tracking-wider">TEAM ENTRY</div>
            <div class="text-4xl font-black text-emerald-700">15K</div>
            <div class="text-[11px] font-bold text-emerald-900 uppercase tracking-tight bg-white p-2 rounded-lg border border-emerald-200">
              ( 8K FOR PLAYERS AUCTION & 7K ENTRY FEE )
            </div>
          </div>

          <div class="bg-slate-900 text-white rounded-2xl p-5 flex flex-col justify-between space-y-3 shadow-md">
            <div class="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
              <i data-lucide="clipboard-list" class="w-4 h-4"></i> TOURNAMENT RULES
            </div>
            <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs font-bold text-red-400 leading-snug">
              ⚠️ ONLY CHANDRAKONA TOWN PS PLAYERS ARE ALLOWED.
            </div>
            <div class="text-[10px] text-slate-400 text-right">Mandatory residency verification</div>
          </div>
        </div>

        <!-- Dates & Place -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-bold">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-red-600 text-white rounded-lg"><i data-lucide="calendar" class="w-5 h-5"></i></div>
            <div>
              <span class="text-slate-500 text-[10px] block uppercase">TOURNAMENT DATES</span>
              <span class="text-red-600 text-sm font-extrabold">29, 30 & 31 AUGUST 2026</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-900 text-white rounded-lg"><i data-lucide="map-pin" class="w-5 h-5"></i></div>
            <div>
              <span class="text-slate-500 text-[10px] block uppercase">MATCH VENUE</span>
              <span class="text-blue-950 text-sm font-extrabold">JHANKRA SCHOOL GROUND</span>
            </div>
          </div>
        </div>

        <!-- Bottom Contact Ribbon -->
        <div class="bg-gradient-to-r from-slate-900 via-slate-900 to-red-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm font-bold">
          <div class="flex items-center gap-2 text-amber-400">
            <span class="px-2 py-0.5 bg-red-600 text-white font-black text-[10px] uppercase rounded">FOR TEAM ENTRY</span>
            <span>CONTACT TO</span>
          </div>

          <div class="flex items-center gap-2 text-white font-black text-base bg-emerald-600 px-4 py-1.5 rounded-lg shadow">
            <i data-lucide="phone-call" class="w-4 h-4 text-white"></i>
            <span>PINTU SANTRA - 89722144166</span>
          </div>
        </div>
      </div>

      <!-- MAIN SPLIT LAYOUT -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        <!-- LEFT SIDE (2 COLUMNS): REGISTERED TEAMS & REGISTERED PLAYER LIST -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Tab Selector -->
          <div class="flex border-b border-slate-200 space-x-3">
            <button id="tab-btn-teams" class="jsl-left-tab px-6 py-3 rounded-t-2xl font-black text-sm flex items-center gap-2 border-b-2 ${activeJSLTab === 'teams' ? 'border-sky-600 text-sky-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-900'}">
              <i data-lucide="shield" class="w-4 h-4"></i> Total Registered Teams (${teams.length})
            </button>
            <button id="tab-btn-players" class="jsl-left-tab px-6 py-3 rounded-t-2xl font-black text-sm flex items-center gap-2 border-b-2 ${activeJSLTab === 'players' ? 'border-sky-600 text-sky-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-900'}">
              <i data-lucide="users" class="w-4 h-4"></i> Total Registered Player List (${players.length})
            </button>
          </div>

          <!-- TAB 1: TOTAL REGISTERED TEAMS -->
          <div id="jsl-tab-teams-content" class="${activeJSLTab === 'teams' ? 'space-y-6' : 'hidden'}">
            ${teams.length === 0 ? `
              <div class="glass-card p-10 text-center space-y-3 bg-white border border-slate-200">
                <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <i data-lucide="shield-off" class="w-8 h-8"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-900">No Teams Registered Yet</h3>
                <p class="text-xs text-slate-500 max-w-sm mx-auto">Registration for JSL 2026 is live! Click "Registration Here" to register your team.</p>
              </div>
            ` : `
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${teams.map((t, idx) => `
                  <div class="glass-card p-6 flex flex-col justify-between">
                    <div>
                      <div class="flex justify-between items-start mb-3">
                        <span class="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-lg">Team ${idx + 1}</span>
                        <span class="text-xs font-mono text-slate-400">${t.regDate}</span>
                      </div>

                      <div class="flex items-center gap-4 mb-4">
                        <img src="${t.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300'}" class="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-sm" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300'"/>
                        <div>
                          <h3 class="text-lg font-black text-slate-900 leading-tight">${t.name}</h3>
                          <div class="text-xs text-slate-600 mt-1">Owner: <strong class="text-slate-900">${t.ownerName}</strong> (${t.ownerPhone})</div>
                          ${t.coOwnerName ? `<div class="text-[11px] text-slate-500">Co-Owner: ${t.coOwnerName} (${t.coOwnerPhone})</div>` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- TAB 2: TOTAL REGISTERED PLAYER LIST -->
          <div id="jsl-tab-players-content" class="${activeJSLTab === 'players' ? 'space-y-6' : 'hidden'}">
            ${players.length === 0 ? `
              <div class="glass-card p-10 text-center space-y-3 bg-white border border-slate-200">
                <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <i data-lucide="user-x" class="w-8 h-8"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-900">No Players Registered Yet</h3>
                <p class="text-xs text-slate-500 max-w-sm mx-auto">Click "Registration Here" to submit your player registration for ₹ 200!</p>
              </div>
            ` : `
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6" id="jsl-players-container">
                ${renderPlayerCardsWithSerial(players, teamMap)}
              </div>
            `}
          </div>

        </div>

        <!-- RIGHT SIDE (1 COLUMN): "Registration Here" ACTION CARD WITH EXACT UPLOADED QR IMAGE -->
        <div class="lg:col-span-1 space-y-6 sticky top-24">
          <div class="glass-card p-6 border-2 border-amber-400 shadow-xl relative overflow-hidden bg-gradient-to-b from-white to-amber-50 text-center space-y-4">
            
            <div class="w-16 h-16 rounded-2xl bg-amber-500 text-white mx-auto flex items-center justify-center font-black text-3xl shadow-lg animate-bounce">
              ✍️
            </div>

            <div>
              <span class="px-3 py-1 bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-amber-300">JSL 2026</span>
              <h3 class="text-2xl font-black text-slate-900 mt-2">Registration Portal</h3>
              <p class="text-xs text-slate-600 mt-1">Register your team (15K) or submit player entry (₹ 200) for Jhankra Super League!</p>
            </div>

            <!-- PERSISTENT BLINKING ACTION BUTTON -->
            <button id="jsl-right-reg-btn" class="btn-blink-always w-full py-4 bg-gradient-to-r from-amber-500 via-red-600 to-amber-500 hover:from-amber-600 hover:to-red-700 text-white font-black text-base rounded-2xl shadow-xl flex items-center justify-center gap-2">
              <i data-lucide="edit-3" class="w-5 h-5"></i> Registration Here
            </button>

            <!-- EXACT UPLOADED NAVI QR CODE IMAGE CONTAINER -->
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-md space-y-3">
              <div class="text-xs font-black text-slate-800 uppercase tracking-wider">Scan & Pay via Any UPI App</div>
              <div class="overflow-hidden rounded-xl border border-slate-200 shadow-inner bg-slate-50 p-2 inline-block">
                <img src="assets/navi_qr_code.jpg" alt="Pintu Santra Navi UPI QR Code" class="w-48 h-auto mx-auto object-contain rounded-lg hover:scale-105 transition-transform" />
              </div>
              <div class="text-[11px] font-bold text-emerald-800 font-mono bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200 inline-block">
                pintusantra4166@nyes
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  `;

  document.getElementById('back-to-landing-btn')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('jsl-poster-reg-btn')?.addEventListener('click', openRegistrationTypeModal);
  document.getElementById('jsl-right-reg-btn')?.addEventListener('click', openRegistrationTypeModal);

  document.getElementById('tab-btn-teams')?.addEventListener('click', () => {
    activeJSLTab = 'teams';
    renderJSLHub(containerEl);
  });
  
  document.getElementById('tab-btn-players')?.addEventListener('click', () => {
    activeJSLTab = 'players';
    renderJSLHub(containerEl);
  });

  attachPlayerProfileModalListeners(containerEl);
}

// --- RENDER PLAYER CARDS WITH SERIAL NUMBER, MEDIUM SQUARE PHOTO & RED/GREEN STATUS CIRCLE ---
function renderPlayerCardsWithSerial(playersList, teamMap) {
  return playersList.map((p, idx) => {
    const serialNum = p.serialNo || (idx + 1);
    const isApproved = p.paymentStatus === 'APPROVED';

    return `
      <div class="glass-card p-5 flex flex-col justify-between items-center text-center relative border border-slate-200 shadow-md bg-white">
        
        <div class="w-full flex justify-between items-center mb-3">
          <span class="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-black text-xs rounded-md">
            Serial ${serialNum}
          </span>

          <div class="flex items-center gap-1.5" title="${isApproved ? 'Payment Approved by Admin' : 'Pending Payment Verification'}">
            <span class="${isApproved ? 'status-circle-green' : 'status-circle-red'}"></span>
            <span class="text-[10px] font-bold ${isApproved ? 'text-emerald-600' : 'text-red-500'}">
              ${isApproved ? 'APPROVED' : 'PENDING'}
            </span>
          </div>
        </div>

        <div class="relative mb-3">
          <img src="${p.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}" class="player-square-photo" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'" />
        </div>

        <div class="space-y-1 mb-4">
          <h3 class="font-extrabold text-slate-900 text-lg leading-snug">${p.name}</h3>
          <div class="inline-block px-2.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold rounded-lg">
            ${p.category || p.role || 'Player'}
          </div>
        </div>

        <button data-profile-id="${p.id}" class="view-profile-modal-btn w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5">
          <i data-lucide="user" class="w-4 h-4 text-amber-400"></i> View Player Profile
        </button>
      </div>
    `;
  }).join('');
}

function attachPlayerProfileModalListeners(containerEl) {
  containerEl.querySelectorAll('.view-profile-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const playerId = e.currentTarget.getAttribute('data-profile-id');
      const player = store.getPlayerById(playerId);
      openFullPlayerProfileModal(player);
    });
  });
}

// --- FULL PLAYER PROFILE MODAL ---
function openFullPlayerProfileModal(player) {
  if (!player) return;
  const isApproved = player.paymentStatus === 'APPROVED';

  const modalHtml = `
    <div id="player-profile-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
      <div class="bg-white max-w-lg w-full p-6 md:p-8 relative space-y-6 animate-fade-in rounded-3xl shadow-2xl border border-slate-200">
        <button id="close-profile-btn" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="flex items-center gap-4 border-b border-slate-200 pb-4">
          <img src="${player.photoUrl}" class="w-20 h-20 rounded-2xl object-cover border-2 border-slate-300 shadow-md" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'" />
          <div>
            <span class="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-black text-xs rounded-md">Serial ${player.serialNo || 1}</span>
            <h2 class="text-2xl font-black text-slate-900 mt-1">${player.name}</h2>
            <div class="flex items-center gap-1.5 text-xs font-bold mt-1 ${isApproved ? 'text-emerald-600' : 'text-red-500'}">
              <span class="${isApproved ? 'status-circle-green' : 'status-circle-red'}"></span>
              <span>Status: ${isApproved ? 'Payment Approved by Admin' : 'Pending Payment Approval'}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-xs">
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span class="text-slate-500 block uppercase font-semibold text-[10px]">Mobile Phone</span>
            <span class="font-extrabold text-slate-900 text-sm">${player.phone || 'N/A'}</span>
          </div>

          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span class="text-slate-500 block uppercase font-semibold text-[10px]">Player Category</span>
            <span class="font-extrabold text-sky-700 text-sm">${player.category || player.role}</span>
          </div>

          <div class="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span class="text-slate-500 block uppercase font-semibold text-[10px]">Full Address</span>
            <span class="font-bold text-slate-800">${player.address || 'Chandrakona Town PS Area'}</span>
          </div>

          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span class="text-slate-500 block uppercase font-semibold text-[10px]">UPI Reference No</span>
            <span class="font-mono font-bold text-emerald-700 text-xs">${player.paymentRef || 'N/A'}</span>
          </div>

          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span class="text-slate-500 block uppercase font-semibold text-[10px]">Registration Date</span>
            <span class="font-bold text-slate-800">${player.regDate}</span>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button id="print-pass-btn" class="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5">
            <i data-lucide="ticket" class="w-4 h-4"></i> Download Digital Pass
          </button>
          <button id="close-profile-bottom-btn" class="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300">
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('player-profile-modal')?.remove();
  document.getElementById('close-profile-btn')?.addEventListener('click', removeModal);
  document.getElementById('close-profile-bottom-btn')?.addEventListener('click', removeModal);
  document.getElementById('print-pass-btn')?.addEventListener('click', () => {
    printDigitalPass(player, store.getLeagueById('leg-jsl'), store.getTeamById(player.teamId));
  });
}

// --- TWO-PART REGISTRATION TYPE MODAL ---
function openRegistrationTypeModal() {
  const modalHtml = `
    <div id="reg-type-backdrop" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
      <div class="bg-white max-w-md w-full p-6 md:p-8 relative space-y-6 animate-fade-in rounded-3xl shadow-2xl border border-slate-200 text-center">
        <button id="close-reg-type-btn" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div>
          <span class="px-3 py-1 bg-amber-100 text-amber-800 font-black text-xs rounded-full uppercase tracking-wider">JHANKRA SUPER LEAGUE</span>
          <h2 class="text-2xl font-black text-slate-900 mt-2">Registration Here</h2>
          <p class="text-xs text-slate-500 mt-1">Select registration type to proceed</p>
        </div>

        <div class="grid grid-cols-1 gap-4 pt-2">
          <button id="select-team-reg-btn" class="p-5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-extrabold text-base flex items-center justify-between shadow-lg transform hover:scale-[1.02] transition-all">
            <div class="flex items-center gap-3">
              <i data-lucide="shield" class="w-7 h-7 text-amber-300"></i>
              <div class="text-left">
                <div>Part 1: Team Register</div>
                <div class="text-[11px] font-normal text-sky-100">15K (8K Auction Purse + 7K Fee)</div>
              </div>
            </div>
            <i data-lucide="chevron-right" class="w-5 h-5"></i>
          </button>

          <button id="select-player-reg-btn" class="p-5 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-extrabold text-base flex items-center justify-between shadow-lg transform hover:scale-[1.02] transition-all">
            <div class="flex items-center gap-3">
              <i data-lucide="user-plus" class="w-7 h-7 text-white"></i>
              <div class="text-left">
                <div>Part 2: Player Register</div>
                <div class="text-[11px] font-normal text-amber-100">Entry Fee: ₹ 200 Rupees</div>
              </div>
            </div>
            <i data-lucide="chevron-right" class="w-5 h-5"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('reg-type-backdrop')?.remove();
  document.getElementById('close-reg-type-btn')?.addEventListener('click', removeModal);

  document.getElementById('select-team-reg-btn')?.addEventListener('click', () => {
    removeModal();
    openTeamRegisterFormModal();
  });

  document.getElementById('select-player-reg-btn')?.addEventListener('click', () => {
    removeModal();
    openPlayerRegisterFormModal();
  });
}

// --- PART 1: TEAM REGISTER FORM MODAL ---
function openTeamRegisterFormModal() {
  let teamLogoDataUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300';

  const modalHtml = `
    <div id="team-reg-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white max-w-xl w-full p-6 md:p-8 relative space-y-6 animate-fade-in rounded-3xl shadow-2xl border border-slate-200">
        <button id="close-team-modal-btn" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div>
          <span class="px-2.5 py-1 bg-sky-100 text-sky-800 text-[10px] font-black rounded-lg border border-sky-300">PART 1: TEAM REGISTER</span>
          <h2 class="text-2xl font-black text-slate-900 mt-1">Register New Team</h2>
          <p class="text-xs text-slate-500">Fill in team details, select logo image file, and submit.</p>
        </div>

        <form id="team-registration-form" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Name of The Team *</label>
            <input type="text" id="team-name" required placeholder="e.g. Jhankra Strikers XI" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-sky-600" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Owner Name *</label>
              <input type="text" id="owner-name" required placeholder="e.g. Vikram Rathore" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-sky-600" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number *</label>
              <input type="tel" id="owner-phone" required placeholder="+91 98765 43210" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-sky-600" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Co Owner Name (if any)</label>
              <input type="text" id="co-owner-name" placeholder="e.g. Rohit Verma" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-sky-600" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Co Owner Phone Number</label>
              <input type="tel" id="co-owner-phone" placeholder="+91 98123 45678" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-sky-600" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Upload Team Logo File (if any)</label>
            <input type="file" id="team-logo-file" accept="image/*" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white" />
            <div id="team-logo-preview-box" class="hidden mt-2 flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <img id="team-logo-preview-img" class="w-14 h-14 rounded-xl object-cover border border-slate-300 shadow-sm" />
              <span class="text-xs text-emerald-700 font-bold">Logo image selected!</span>
            </div>
          </div>

          <button type="submit" class="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all">
            Submit Team Registration
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('team-reg-modal')?.remove();
  document.getElementById('close-team-modal-btn')?.addEventListener('click', removeModal);

  document.getElementById('team-logo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      teamLogoDataUrl = await compressImage(file, 200, 200, 0.7);
      document.getElementById('team-logo-preview-img').src = teamLogoDataUrl;
      document.getElementById('team-logo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('team-registration-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newTeam = store.registerTeam({
      leagueId: 'leg-jsl',
      name: document.getElementById('team-name').value,
      shortCode: document.getElementById('team-name').value.substring(0, 3).toUpperCase(),
      ownerName: document.getElementById('owner-name').value,
      ownerPhone: document.getElementById('owner-phone').value,
      captainName: document.getElementById('owner-name').value,
      coOwnerName: document.getElementById('co-owner-name').value || '',
      coOwnerPhone: document.getElementById('co-owner-phone').value || '',
      logoUrl: teamLogoDataUrl
    });

    removeModal();
    alert(`Register Successful!\n\nTeam "${newTeam.name}" has been registered and added to Total Registered Teams list and Admin Portal.`);
    navigate('jsl-hub');
  });
}

// --- PART 2: PLAYER REGISTER FORM MODAL (WITH FAST AUTOMATIC CANVAS IMAGE COMPRESSION) ---
function openPlayerRegisterFormModal() {
  const upiId = "pintusantra4166@nyes";
  const payeeName = "Pintu Santra";
  const amount = 200;
  const note = "JSL2026PlayerReg";

  let plyPhotoDataUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300';
  let plyAadharDataUrl = 'Attached Document Proof';
  let plyProofDataUrl = 'Attached Receipt Screenshot';

  const phonepeUrl = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${note}`;
  const gpayUrl = `tez://upi/pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${note}`;
  const genericUpiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${note}`;

  const modalHtml = `
    <div id="player-reg-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white max-w-xl w-full p-6 md:p-8 relative space-y-6 animate-fade-in rounded-3xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <button id="close-player-modal-btn" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div>
          <span class="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-lg border border-amber-300">PART 2: PLAYER REGISTER</span>
          <h2 class="text-2xl font-black text-slate-900 mt-1">Player Registration Form</h2>
          <p class="text-xs text-slate-500">Fill details, select image files, and scan Navi QR code to pay ₹ 200.</p>
        </div>

        <form id="player-registration-form" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
              <input type="text" id="ply-name" required placeholder="e.g. Rahul Sharma" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number *</label>
              <input type="tel" id="ply-phone" required placeholder="+91 98765 43210" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Address *</label>
            <input type="text" id="ply-address" required placeholder="e.g. Chandrakona Town PS Area, Jhankra" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Player Category *</label>
            <select id="ply-category" required class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500">
              <option value="Right Hand Batsman">Right Hand Batsman</option>
              <option value="Left Hand Batsman">Left Hand Batsman</option>
              <option value="Right Hand Bowler">Right Hand Bowler</option>
              <option value="Left Hand Bowler">Left Hand Bowler</option>
              <option value="All Rounder">All Rounder</option>
              <option value="Wicketkeeper">Wicketkeeper</option>
            </select>
          </div>

          <!-- DIRECT FILE UPLOAD: PLAYER PHOTO -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Upload Photo (Select Image File) *</label>
            <input type="file" id="ply-photo-file" accept="image/*" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-white" />
            <div id="ply-photo-preview-box" class="hidden mt-2 flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <img id="ply-photo-preview-img" class="w-16 h-16 rounded-xl object-cover border border-slate-300 shadow-sm" />
              <span class="text-xs text-emerald-700 font-bold">Photo ready!</span>
            </div>
          </div>

          <!-- DIRECT FILE UPLOAD: AADHAR CARD BACK SIDE -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Upload Aadhar Card (Back side Only) *</label>
            <input type="file" id="ply-aadhar-file" accept="image/*" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white" />
            <div id="ply-aadhar-preview-box" class="hidden mt-2 flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <img id="ply-aadhar-preview-img" class="w-20 h-14 rounded-lg object-cover border border-slate-300 shadow-sm" />
              <span class="text-xs text-emerald-700 font-bold">Aadhar Back photo attached!</span>
            </div>
          </div>

          <!-- PAYMENT OPTION WITH EXACT UPLOADED NAVI QR CODE IMAGE -->
          <div class="bg-gradient-to-b from-amber-50 to-white p-5 rounded-2xl border-2 border-amber-300 space-y-4 shadow-sm">
            <div class="flex justify-between items-center border-b border-amber-200 pb-3">
              <div>
                <span class="font-extrabold text-slate-900 text-sm block">Entry Fee Payment</span>
                <span class="text-[11px] text-slate-500">Scan QR Code Below directly from phone</span>
              </div>
              <span class="text-2xl font-black text-amber-700">₹ 200 Rupees</span>
            </div>

            <!-- EXACT UPLOADED NAVI QR CODE IMAGE FOR DIRECT SCANNING -->
            <div class="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-inner flex flex-col items-center space-y-3">
              <div class="text-xs font-black text-slate-800 uppercase tracking-wider">Scan & Pay ₹ 200 via Any UPI App</div>
              
              <div class="overflow-hidden rounded-2xl border-2 border-slate-900 shadow-xl bg-white p-2 inline-block">
                <img src="assets/navi_qr_code.jpg" alt="Pintu Santra Official Navi UPI QR Code" class="w-56 h-auto mx-auto object-contain rounded-xl hover:scale-105 transition-transform" />
              </div>

              <div class="space-y-1">
                <div class="font-extrabold text-slate-900 text-sm">Pintu Santra</div>
                <div class="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200 inline-block">
                  UPI ID : pintusantra4166@nyes
                </div>
              </div>
            </div>

            <!-- Direct UPI Payment Apps Buttons -->
            <div class="space-y-2">
              <label class="block text-[10px] font-black text-slate-600 uppercase">Or Click to Open App Directly:</label>
              <div class="grid grid-cols-3 gap-2">
                <a href="${phonepeUrl}" class="py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl text-center shadow flex items-center justify-center gap-1">
                  PhonePe
                </a>
                <a href="${gpayUrl}" class="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl text-center shadow flex items-center justify-center gap-1">
                  GPay
                </a>
                <a href="${genericUpiUrl}" class="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl text-center shadow flex items-center justify-center gap-1">
                  Any UPI
                </a>
              </div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Entry UPI Transaction Number *</label>
                <input type="text" id="ply-upi-ref" required placeholder="e.g. UPI/9812736451/PINTU" class="w-full bg-white border border-slate-300 text-emerald-700 font-mono text-xs rounded-lg p-2.5 focus:outline-none" />
              </div>

              <!-- DIRECT FILE UPLOAD FOR PAYMENT SCREENSHOT -->
              <div>
                <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Upload Payment Screenshot File (if any)</label>
                <input type="file" id="ply-proof-file" accept="image/*" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-emerald-600 file:text-white" />
                <div id="ply-proof-preview-box" class="hidden mt-2 flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                  <img id="ply-proof-preview-img" class="w-20 h-14 rounded-lg object-cover border border-slate-300 shadow-sm" />
                  <span class="text-xs text-emerald-700 font-bold">Payment receipt attached!</span>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" id="submit-player-reg-btn" class="w-full py-3.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all">
            Submit Player Registration
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('player-reg-modal')?.remove();
  document.getElementById('close-player-modal-btn')?.addEventListener('click', removeModal);

  // Compressed Image File Change Listeners
  document.getElementById('ply-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      plyPhotoDataUrl = await compressImage(file, 300, 300, 0.7);
      document.getElementById('ply-photo-preview-img').src = plyPhotoDataUrl;
      document.getElementById('ply-photo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('ply-aadhar-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      plyAadharDataUrl = await compressImage(file, 350, 250, 0.6);
      document.getElementById('ply-aadhar-preview-img').src = plyAadharDataUrl;
      document.getElementById('ply-aadhar-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('ply-proof-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      plyProofDataUrl = await compressImage(file, 350, 250, 0.6);
      document.getElementById('ply-proof-preview-img').src = plyProofDataUrl;
      document.getElementById('ply-proof-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('player-registration-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const name = document.getElementById('ply-name').value;
      const phone = document.getElementById('ply-phone').value;
      const address = document.getElementById('ply-address').value;
      const category = document.getElementById('ply-category').value;
      const upiRef = document.getElementById('ply-upi-ref').value;

      const newPlayer = store.registerPlayer({
        name,
        phone,
        address,
        category,
        role: category,
        battingStyle: category.includes('Left') ? 'Left-Hand Bat' : 'Right-Hand Bat',
        photoUrl: plyPhotoDataUrl,
        aadharBackUrl: plyAadharDataUrl,
        paymentRef: upiRef,
        paymentProofUrl: plyProofDataUrl,
        basePrice: 200
      });

      store.setUserRole('PLAYER', newPlayer.name, newPlayer);
      removeModal();
      alert(`Register Successful!\n\nPlayer "${newPlayer.name}" has been registered as Serial ${newPlayer.serialNo}.\nPayment Ref: ${upiRef}\nStatus: Pending Admin Payment Approval (Red Circle 🔴).`);
      activeJSLTab = 'players';
      navigate('jsl-hub');
    } catch (err) {
      console.error("Player Registration Error:", err);
      alert("Registration Error: " + err.message);
    }
  });
}

// --- ROLE SWITCH MODAL ---
function openRoleSwitchModal() {
  const user = store.getUser();
  const modalHtml = `
    <div id="role-modal-backdrop" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
      <div class="bg-white max-w-sm w-full p-6 relative space-y-4 animate-fade-in rounded-2xl shadow-xl border border-slate-200">
        <button id="close-role-modal-btn" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
        <h3 class="text-xl font-black text-slate-900">Switch User Role</h3>
        <p class="text-xs text-slate-500">Instantly switch role to test access levels.</p>

        <div class="space-y-2">
          <button data-set-role="GUEST" class="role-opt-btn w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-xs font-bold text-slate-800 border border-slate-200 flex justify-between items-center">
            <span>Guest Visitor</span>
            ${user.role === 'GUEST' ? '<i data-lucide="check" class="w-4 h-4 text-amber-600"></i>' : ''}
          </button>
          <button data-set-role="PLAYER" class="role-opt-btn w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-xs font-bold text-sky-700 border border-slate-200 flex justify-between items-center">
            <span>Registered Player</span>
            ${user.role === 'PLAYER' ? '<i data-lucide="check" class="w-4 h-4 text-sky-600"></i>' : ''}
          </button>
          <button data-set-role="ADMIN" class="role-opt-btn w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-xs font-bold text-amber-700 border border-slate-200 flex justify-between items-center">
            <span>Master Administrator</span>
            ${user.role === 'ADMIN' ? '<i data-lucide="check" class="w-4 h-4 text-amber-600"></i>' : ''}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const backdrop = document.getElementById('role-modal-backdrop');
  document.getElementById('close-role-modal-btn')?.addEventListener('click', () => backdrop?.remove());

  document.querySelectorAll('.role-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-set-role');
      store.setUserRole(role, role === 'ADMIN' ? 'Master Admin' : 'Demo User');
      backdrop?.remove();
    });
  });
}
