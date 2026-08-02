// Core Application Router & Registration Portal (Developer: Suman Kolay)

import { store } from './store.js';
import { exportPlayersToCSV, exportTeamsToCSV, exportPlayersToPDF, printDigitalPass } from './export.js';
import { renderAdminDashboard } from './admin.js';

// ALWAYS default to landing page (No category opens automatically!)
let currentRoute = 'landing'; // landing, jsl-hub, admin

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  renderNavbar();
  renderMobileBottomNav();
  renderCurrentView();

  window.addEventListener('leagues_updated', () => renderCurrentView());
  window.addEventListener('players_updated', () => renderCurrentView());
  window.addEventListener('teams_updated', () => renderCurrentView());
  window.addEventListener('user_updated', () => {
    renderNavbar();
    renderMobileBottomNav();
    renderCurrentView();
  });
}

function navigate(route) {
  currentRoute = route;
  renderNavbar();
  renderMobileBottomNav();
  renderCurrentView();
}

// --- IMAGE COMPRESSION UTILITY ---
function compressImage(file, maxWidth = 250, maxHeight = 250, quality = 0.65) {
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
  const navbarEl = document.getElementById('app-navbar');
  if (!navbarEl) return;

  navbarEl.innerHTML = `
    <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-16 md:h-18 flex items-center justify-between gap-2">
      <!-- Title, Subtitle & Developer Credit -->
      <div class="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0" id="brand-header-logo">
        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white font-black text-base sm:text-xl shadow-sm flex-shrink-0">
          🏏
        </div>
        <div class="truncate">
          <h1 class="text-xs sm:text-lg md:text-2xl font-black text-slate-900 leading-none tracking-tight truncate">
            Cricket Premier League
          </h1>
          <div class="text-[8px] sm:text-xs font-bold text-amber-600 truncate mt-0.5">Official Tournament Portal</div>
          <div class="text-[8px] sm:text-[10px] font-bold text-slate-500 tracking-wide truncate">Developer - <span class="text-sky-600 font-extrabold">Suman Kolay</span></div>
        </div>
      </div>

      <!-- Admin Panel Button Only -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <button id="admin-panel-nav-btn" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-[11px] sm:text-xs font-bold rounded-lg flex items-center gap-1 transition-colors">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-amber-600"></i> Admin Panel
        </button>
      </div>
    </div>
  `;

  document.getElementById('brand-header-logo')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('admin-panel-nav-btn')?.addEventListener('click', () => navigate('admin'));
  if (window.lucide) window.lucide.createIcons();
}

// --- MOBILE STICKY BOTTOM BAR ---
function renderMobileBottomNav() {
  const bottomNavEl = document.getElementById('mobile-bottom-nav');
  if (!bottomNavEl) return;

  bottomNavEl.className = "fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 sm:hidden shadow-lg flex items-center justify-around";

  bottomNavEl.innerHTML = `
    <button id="mob-nav-home" class="flex flex-col items-center gap-0.5 ${currentRoute === 'landing' ? 'text-amber-600 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="trophy" class="w-4 h-4"></i>
      <span class="text-[9px]">Home</span>
    </button>

    <button id="mob-nav-jsl" class="flex flex-col items-center gap-0.5 ${currentRoute === 'jsl-hub' ? 'text-sky-600 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="shield" class="w-4 h-4"></i>
      <span class="text-[9px]">JSL Hub</span>
    </button>

    <button id="mob-nav-admin" class="flex flex-col items-center gap-0.5 ${currentRoute === 'admin' ? 'text-amber-600 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="shield-check" class="w-4 h-4"></i>
      <span class="text-[9px]">Admin</span>
    </button>
  `;

  document.getElementById('mob-nav-home')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('mob-nav-jsl')?.addEventListener('click', () => navigate('jsl-hub'));
  document.getElementById('mob-nav-admin')?.addEventListener('click', () => navigate('admin'));
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

// --- FIRST PAGE LANDING (3 CATEGORY SQUARE BOXES IN A HORIZONTAL ROW) ---
function renderFirstPageLanding(containerEl) {
  containerEl.innerHTML = `
    <div class="min-h-[45vh] flex flex-col items-center justify-center space-y-3 sm:space-y-6 animate-fade-in py-2 sm:py-6">
      
      <div class="text-center space-y-0.5 px-2">
        <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[9px] sm:text-xs font-extrabold uppercase tracking-widest">
          Select Premier League
        </span>
        <h2 class="text-base sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Choose Tournament Category</h2>
      </div>

      <!-- 3 CATEGORY SQUARE BOXES IN A SINGLE HORIZONTAL ROW (grid-cols-3) -->
      <div class="grid grid-cols-3 gap-2 sm:gap-6 md:gap-8 w-full max-w-3xl px-2 sm:px-4">
        
        <!-- JPL SQUARE BOX -->
        <div id="btn-click-jpl" class="square-category-box group">
          <div class="category-logo-badge logo-jpl">JPL</div>
          <h3 class="text-[11px] sm:text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">JPL</h3>
          <p class="text-[8px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Jhankra Premier League</p>
        </div>

        <!-- JSL SQUARE BOX -->
        <div id="btn-click-jsl" class="square-category-box group border-sky-400">
          <div class="category-logo-badge logo-jsl">JSL</div>
          <h3 class="text-[11px] sm:text-2xl font-black text-slate-900 group-hover:text-sky-600 transition-colors">JSL</h3>
          <p class="text-[8px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Jhankra Super League</p>
        </div>

        <!-- KPL SQUARE BOX -->
        <div id="btn-click-kpl" class="square-category-box group border-purple-400">
          <div class="category-logo-badge logo-kpl">KPL</div>
          <h3 class="text-[11px] sm:text-2xl font-black text-slate-900 group-hover:text-purple-600 transition-colors">KPL</h3>
          <p class="text-[8px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">Kota Premier League</p>
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
    <div id="coming-soon-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-xs w-full p-4 text-center relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border-2 ${code === 'JPL' ? 'border-amber-400' : 'border-purple-400'}">
        <button id="close-cs-btn" class="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-700 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="w-12 h-12 rounded-xl mx-auto ${code === 'JPL' ? 'logo-jpl' : 'logo-kpl'} flex items-center justify-center font-black text-xl shadow-md">
          ${code}
        </div>

        <div>
          <h3 class="text-lg font-black text-slate-900">${title}</h3>
          <div class="inline-block mt-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full font-black text-[9px] uppercase tracking-widest animate-pulse">
            Coming Soon...
          </div>
        </div>

        <p class="text-[11px] text-slate-600 leading-snug">
          Registrations for <strong>${title} (${code})</strong> will open shortly. Stay tuned!
        </p>

        <button id="ok-cs-btn" class="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md">
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

// --- JSL HUB (ULTRA-COMPACT HEADER + 3 HORIZONTAL COLUMNS BELOW) ---
function renderJSLHub(containerEl) {
  const teams = store.getTeams();
  const players = store.getPlayers();

  containerEl.innerHTML = `
    <div class="space-y-3 animate-fade-in">
      
      <!-- Back Button & Header Bar -->
      <div class="flex items-center justify-between gap-2">
        <button id="back-to-landing-btn" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded-lg border border-slate-300 flex items-center gap-1">
          <i data-lucide="arrow-left" class="w-3 h-3"></i> Category Selector
        </button>

        <span class="text-[10px] font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
          JHANKRA SUPER LEAGUE 2026
        </span>
      </div>

      <!-- ULTRA-COMPACT JSL HEADER POSTER STRIP -->
      <div class="jsl-header-strip p-2.5 space-y-1.5">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded bg-gradient-to-b from-blue-900 to-red-600 flex items-center justify-center text-white font-black text-xs shadow flex-shrink-0">
            JSL
          </div>
          <div>
            <div class="jsl-poster-title-navy">JHANKRA <span class="jsl-poster-title-red">SUPER LEAGUE</span></div>
            <div class="text-[8px] font-bold text-slate-500 uppercase">8 TEAM TOURNAMENT • 29-31 AUG 2026 @ JHANKRA SCHOOL GROUND</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1 text-[9px] font-extrabold pt-1 border-t border-slate-100">
          <span class="px-2 py-0.5 bg-red-100 text-red-800 rounded border border-red-200">🏆 Winner: 35K | Runners: 25K</span>
          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">💰 Team Entry: 15K (8K Auction + 7K Fee)</span>
          <span class="px-2 py-0.5 bg-slate-900 text-white rounded">⚠️ Rules: Chandrakona PS Only</span>
          <span class="px-2 py-0.5 bg-emerald-600 text-white rounded">📞 Contact: Pintu Santra (89722144166)</span>
        </div>
      </div>

      <!-- 3 HORIZONTAL COLUMNS (grid-cols-3 ON ALL DEVICES) -->
      <div class="grid grid-cols-3 gap-2 sm:gap-4 items-start">
        
        <!-- COLUMN 1 (LEFT SIDE): REGISTERED TEAMS CARD (CLICK TO VIEW & SEARCH) -->
        <div class="glass-card p-2 sm:p-3 text-center space-y-2 border border-slate-200">
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-sky-100 text-sky-700 mx-auto flex items-center justify-center">
            <i data-lucide="shield" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </div>

          <div>
            <div class="text-[9px] sm:text-xs font-black text-slate-900 leading-tight">Total Registered Teams</div>
            <div class="text-base sm:text-2xl font-black text-sky-600 mt-0.5">${teams.length}</div>
          </div>

          <button id="open-teams-modal-btn" class="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[9px] sm:text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1">
            <i data-lucide="search" class="w-3 h-3"></i> Search / View Teams
          </button>
        </div>

        <!-- COLUMN 2 (MIDDLE): REGISTERED PLAYER LIST CARD (CLICK TO VIEW, SEARCH & PDF) -->
        <div class="glass-card p-2 sm:p-3 text-center space-y-2 border border-slate-200">
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
            <i data-lucide="users" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </div>

          <div>
            <div class="text-[9px] sm:text-xs font-black text-slate-900 leading-tight">Total Registered Player List</div>
            <div class="text-base sm:text-2xl font-black text-amber-600 mt-0.5">${players.length}</div>
          </div>

          <button id="open-players-modal-btn" class="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[9px] sm:text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1">
            <i data-lucide="search" class="w-3 h-3"></i> Search / View Players
          </button>
        </div>

        <!-- COLUMN 3 (RIGHT SIDE): REGISTRATION HERE CARD (ONLY REGISTRATION TRIGGER) -->
        <div class="glass-card p-2 sm:p-3 text-center space-y-2 border border-amber-300 bg-gradient-to-b from-white to-amber-50">
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500 text-white mx-auto flex items-center justify-center font-black">
            ✍️
          </div>

          <div>
            <div class="text-[9px] sm:text-xs font-black text-slate-900 leading-tight">Team / Player Registration</div>
            <div class="text-[8px] font-bold text-amber-700">Click Below to Apply</div>
          </div>

          <!-- PERSISTENT BLINKING REGISTRATION BUTTON -->
          <button id="jsl-right-reg-btn" class="btn-blink-always w-full py-1.5 bg-gradient-to-r from-amber-500 to-red-600 text-white font-black text-[9px] sm:text-xs rounded-lg shadow flex items-center justify-center gap-1">
            <i data-lucide="edit-3" class="w-3 h-3"></i> Registration Here
          </button>
        </div>

      </div>

    </div>
  `;

  document.getElementById('back-to-landing-btn')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('jsl-right-reg-btn')?.addEventListener('click', openRegistrationTypeModal);

  // Click-to-Open Modal Listeners (Ensure options do not open automatically!)
  document.getElementById('open-teams-modal-btn')?.addEventListener('click', () => openRegisteredTeamsModal(teams));
  document.getElementById('open-players-modal-btn')?.addEventListener('click', () => openRegisteredPlayersModal(players));
}

// --- REGISTERED TEAMS MODAL WITH SEARCH OPTION ---
function openRegisteredTeamsModal(allTeams) {
  let filteredTeams = [...allTeams];

  const renderTeamListContent = () => {
    const container = document.getElementById('teams-list-container');
    if (!container) return;

    if (filteredTeams.length === 0) {
      container.innerHTML = `
        <div class="p-4 text-center space-y-1 bg-slate-50 rounded-xl border border-slate-200">
          <i data-lucide="shield-off" class="w-5 h-5 text-slate-400 mx-auto"></i>
          <div class="text-xs font-bold text-slate-800">No matching teams found</div>
          <div class="text-[10px] text-slate-500">Try searching with a different name or owner.</div>
        </div>
      `;
    } else {
      container.innerHTML = filteredTeams.map((t, idx) => `
        <div class="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2.5 shadow-sm">
          <img src="${t.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300'}" class="w-10 h-10 rounded-lg object-cover border border-slate-200" />
          <div>
            <div class="text-xs font-black text-slate-900 leading-tight">${t.name}</div>
            <div class="text-[10px] text-slate-600">Owner: <strong>${t.ownerName}</strong> (${t.ownerPhone})</div>
            ${t.coOwnerName ? `<div class="text-[9px] text-slate-500">Co-Owner: ${t.coOwnerName} (${t.coOwnerPhone})</div>` : ''}
          </div>
        </div>
      `).join('');
    }
    if (window.lucide) window.lucide.createIcons();
  };

  const modalHtml = `
    <div id="teams-view-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 modal-content-container">
        <button id="close-teams-modal" class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-sky-100 text-sky-800 text-[9px] font-black rounded uppercase">JSL 2026</span>
          <h2 class="text-base font-black text-slate-900 mt-0.5">Registered Team List (${allTeams.length})</h2>
        </div>

        <!-- SEARCH BAR FOR TEAMS -->
        <div class="relative">
          <input type="text" id="team-search-input" placeholder="🔍 Search team by name or owner..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 pl-3 focus:outline-none focus:border-sky-600" />
        </div>

        <div id="teams-list-container" class="space-y-2 max-h-[55vh] overflow-y-auto pr-1"></div>

        <button id="close-teams-modal-bottom" class="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow">
          Close List
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  renderTeamListContent();

  const removeModal = () => document.getElementById('teams-view-modal')?.remove();
  document.getElementById('close-teams-modal')?.addEventListener('click', removeModal);
  document.getElementById('close-teams-modal-bottom')?.addEventListener('click', removeModal);

  // SEARCH FILTER EVENT LISTENER FOR TEAMS
  document.getElementById('team-search-input')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    filteredTeams = allTeams.filter(t => 
      (t.name || '').toLowerCase().includes(query) ||
      (t.ownerName || '').toLowerCase().includes(query) ||
      (t.coOwnerName || '').toLowerCase().includes(query)
    );
    renderTeamListContent();
  });
}

// --- REGISTERED PLAYERS MODAL WITH SEARCH OPTION & DOWNLOAD PDF BUTTON ---
function openRegisteredPlayersModal(allPlayers) {
  let filteredPlayers = [...allPlayers];

  const renderPlayerListContent = () => {
    const container = document.getElementById('players-list-container');
    const countEl = document.getElementById('player-count-display');
    if (!container) return;

    if (countEl) countEl.innerText = `(${filteredPlayers.length})`;

    if (filteredPlayers.length === 0) {
      container.innerHTML = `
        <div class="p-4 text-center space-y-1 bg-slate-50 rounded-xl border border-slate-200">
          <i data-lucide="user-x" class="w-5 h-5 text-slate-400 mx-auto"></i>
          <div class="text-xs font-bold text-slate-800">No matching players found</div>
          <div class="text-[10px] text-slate-500">Try searching with a different alphabet, name, category, or address.</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="grid grid-cols-2 gap-2">
          ${renderPlayerCardsWithSerial(filteredPlayers)}
        </div>
      `;
    }

    if (window.lucide) window.lucide.createIcons();

    container.querySelectorAll('.view-profile-modal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const playerId = e.currentTarget.getAttribute('data-profile-id');
        const player = store.getPlayerById(playerId);
        openFullPlayerProfileModal(player);
      });
    });
  };

  const modalHtml = `
    <div id="players-view-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-lg w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 modal-content-container">
        <button id="close-players-modal" class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <span class="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded uppercase">JSL 2026</span>
            <h2 class="text-base font-black text-slate-900 mt-0.5">Registered Player List <span id="player-count-display">(${allPlayers.length})</span></h2>
          </div>

          <!-- DOWNLOAD PLAYERS PDF BUTTON -->
          <button id="download-players-pdf-btn" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors">
            <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Download PDF List
          </button>
        </div>

        <!-- SEARCH BAR FOR PLAYERS -->
        <div class="relative">
          <input type="text" id="player-search-input" placeholder="🔍 Search player by name, category, phone, address..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 pl-3 focus:outline-none focus:border-amber-500" />
        </div>

        <div id="players-list-container" class="max-h-[58vh] overflow-y-auto pr-1"></div>

        <button id="close-players-modal-bottom" class="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow">
          Close List
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  renderPlayerListContent();

  const removeModal = () => document.getElementById('players-view-modal')?.remove();
  document.getElementById('close-players-modal')?.addEventListener('click', removeModal);
  document.getElementById('close-players-modal-bottom')?.addEventListener('click', removeModal);

  // PDF EXPORT EVENT LISTENER
  document.getElementById('download-players-pdf-btn')?.addEventListener('click', () => {
    exportPlayersToPDF(filteredPlayers);
  });

  // REAL-TIME SEARCH FILTER EVENT LISTENER FOR PLAYERS
  document.getElementById('player-search-input')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    filteredPlayers = allPlayers.filter(p => 
      (p.name || '').toLowerCase().includes(query) ||
      (p.category || p.role || '').toLowerCase().includes(query) ||
      (p.phone || '').toLowerCase().includes(query) ||
      (p.address || '').toLowerCase().includes(query)
    );
    renderPlayerListContent();
  });
}

// --- RENDER PLAYER CARDS (2-COLUMN GRID) ---
function renderPlayerCardsWithSerial(playersList) {
  return playersList.map((p, idx) => {
    const serialNum = p.serialNo || (idx + 1);
    const isApproved = p.paymentStatus === 'APPROVED';

    return `
      <div class="glass-card p-2 flex flex-col justify-between items-center text-center relative border border-slate-200 shadow-sm bg-white">
        
        <div class="w-full flex justify-between items-center mb-1">
          <span class="px-1 py-0.5 bg-slate-900 text-white font-mono font-black text-[8px] rounded">
            Serial ${serialNum}
          </span>

          <div class="flex items-center gap-0.5" title="${isApproved ? 'Payment Approved' : 'Pending Verification'}">
            <span class="${isApproved ? 'status-circle-green' : 'status-circle-red'}"></span>
            <span class="text-[8px] font-bold ${isApproved ? 'text-emerald-600' : 'text-red-500'}">
              ${isApproved ? 'OK' : 'PEND'}
            </span>
          </div>
        </div>

        <div class="relative mb-1">
          <img src="${p.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}" class="player-square-photo" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'" />
        </div>

        <div class="space-y-0.5 mb-1.5 w-full">
          <h3 class="font-extrabold text-slate-900 text-[10px] truncate leading-tight">${p.name}</h3>
          <div class="text-[8px] font-bold text-sky-700 truncate">
            ${p.category || 'Player'}
          </div>
        </div>

        <button data-profile-id="${p.id}" class="view-profile-modal-btn w-full py-1 bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-bold rounded shadow-sm flex items-center justify-center gap-0.5">
          <i data-lucide="user" class="w-2.5 h-2.5 text-amber-400"></i> Profile
        </button>
      </div>
    `;
  }).join('');
}

// --- FULL PLAYER PROFILE MODAL ---
function openFullPlayerProfileModal(player) {
  if (!player) return;
  const isApproved = player.paymentStatus === 'APPROVED';

  const modalHtml = `
    <div id="player-profile-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-sm w-full p-4 relative space-y-3.5 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 modal-content-container">
        <button id="close-profile-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="flex items-center gap-3 border-b border-slate-200 pb-3">
          <img src="${player.photoUrl}" class="w-14 h-14 rounded-xl object-cover border-2 border-slate-300 shadow" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'" />
          <div>
            <span class="px-1.5 py-0.5 bg-slate-900 text-white font-mono font-black text-[9px] rounded">Serial ${player.serialNo || 1}</span>
            <h2 class="text-base font-black text-slate-900 mt-0.5">${player.name}</h2>
            <div class="flex items-center gap-1 text-[10px] font-bold ${isApproved ? 'text-emerald-600' : 'text-red-500'}">
              <span class="${isApproved ? 'status-circle-green' : 'status-circle-red'}"></span>
              <span>Status: ${isApproved ? 'Approved' : 'Pending Payment Verification'}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[10px]">
          <div class="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span class="text-slate-500 block uppercase font-semibold text-[8px]">Mobile Phone</span>
            <span class="font-extrabold text-slate-900">${player.phone || 'N/A'}</span>
          </div>

          <div class="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span class="text-slate-500 block uppercase font-semibold text-[8px]">Category</span>
            <span class="font-extrabold text-sky-700">${player.category || player.role}</span>
          </div>

          <div class="col-span-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span class="text-slate-500 block uppercase font-semibold text-[8px]">Full Address</span>
            <span class="font-bold text-slate-800">${player.address || 'Chandrakona Town PS Area'}</span>
          </div>

          <div class="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span class="text-slate-500 block uppercase font-semibold text-[8px]">UPI Ref No</span>
            <span class="font-mono font-bold text-emerald-700">${player.paymentRef || 'N/A'}</span>
          </div>

          <div class="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span class="text-slate-500 block uppercase font-semibold text-[8px]">Registration Date</span>
            <span class="font-bold text-slate-800">${player.regDate}</span>
          </div>
        </div>

        <div class="flex gap-2 pt-1">
          <button id="print-pass-btn" class="flex-1 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1">
            <i data-lucide="ticket" class="w-3.5 h-3.5"></i> Download Pass
          </button>
          <button id="close-profile-bottom-btn" class="py-2 px-3 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300">
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
    <div id="reg-type-backdrop" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-sm w-full p-4 relative space-y-3.5 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 text-center modal-content-container">
        <button id="close-reg-type-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-amber-100 text-amber-800 font-black text-[9px] rounded-full uppercase">JHANKRA SUPER LEAGUE</span>
          <h2 class="text-base font-black text-slate-900 mt-1">Registration Here</h2>
          <p class="text-[10px] text-slate-500">Select registration type to proceed</p>
        </div>

        <div class="grid grid-cols-1 gap-2 pt-1">
          <button id="select-team-reg-btn" class="p-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white font-extrabold text-xs flex items-center justify-between shadow">
            <div class="flex items-center gap-2">
              <i data-lucide="shield" class="w-4 h-4 text-amber-300"></i>
              <div class="text-left">
                <div>Part 1: Team Register</div>
                <div class="text-[9px] font-normal text-sky-100">15K (8K Auction + 7K Fee)</div>
              </div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </button>

          <button id="select-player-reg-btn" class="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 text-white font-extrabold text-xs flex items-center justify-between shadow">
            <div class="flex items-center gap-2">
              <i data-lucide="user-plus" class="w-4 h-4 text-white"></i>
              <div class="text-left">
                <div>Part 2: Player Register</div>
                <div class="text-[9px] font-normal text-amber-100">Entry Fee: ₹ 200 Rupees</div>
              </div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
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
    <div id="team-reg-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 overflow-y-auto">
      <div class="bg-white max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 modal-content-container">
        <button id="close-team-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-sky-100 text-sky-800 text-[9px] font-black rounded border border-sky-300">PART 1: TEAM REGISTER</span>
          <h2 class="text-base font-black text-slate-900 mt-0.5">Register New Team</h2>
        </div>

        <form id="team-registration-form" class="space-y-2.5">
          <div>
            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Name of The Team *</label>
            <input type="text" id="team-name" required placeholder="Jhankra Strikers XI" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none" />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Owner Name *</label>
              <input type="text" id="owner-name" required placeholder="Vikram Rathore" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Phone *</label>
              <input type="tel" id="owner-phone" required placeholder="+91 98765..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Co-Owner Name</label>
              <input type="text" id="co-owner-name" placeholder="Rohit Verma" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Co-Owner Phone</label>
              <input type="tel" id="co-owner-phone" placeholder="+91 98123..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Upload Team Logo File</label>
            <input type="file" id="team-logo-file" accept="image/*" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-sky-600 file:text-white" />
            <div id="team-logo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <img id="team-logo-preview-img" class="w-8 h-8 rounded object-cover" />
              <span class="text-[9px] text-emerald-700 font-bold">Logo selected!</span>
            </div>
          </div>

          <button type="submit" class="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 text-white font-extrabold text-xs rounded-xl shadow">
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
      teamLogoDataUrl = await compressImage(file, 160, 160, 0.7);
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
    alert(`Register Successful!\n\nTeam "${newTeam.name}" registered.`);
    navigate('jsl-hub');
    openRegisteredTeamsModal(store.getTeams());
  });
}

// --- PART 2: PLAYER REGISTER FORM MODAL ---
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
    <div id="player-reg-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 overflow-y-auto">
      <div class="bg-white max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 modal-content-container">
        <button id="close-player-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded border border-amber-300">PART 2: PLAYER REGISTER</span>
          <h2 class="text-base font-black text-slate-900 mt-0.5">Player Registration Form</h2>
        </div>

        <form id="player-registration-form" class="space-y-2.5">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Full Name *</label>
              <input type="text" id="ply-name" required placeholder="Rahul Sharma" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Phone Number *</label>
              <input type="tel" id="ply-phone" required placeholder="+91 98765..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Full Address *</label>
            <input type="text" id="ply-address" required placeholder="Chandrakona Town PS Area, Jhankra" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none" />
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Player Category *</label>
            <select id="ply-category" required class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none">
              <option value="Right Hand Batsman">Right Hand Batsman</option>
              <option value="Left Hand Batsman">Left Hand Batsman</option>
              <option value="Right Hand Bowler">Right Hand Bowler</option>
              <option value="Left Hand Bowler">Left Hand Bowler</option>
              <option value="All Rounder">All Rounder</option>
              <option value="Wicketkeeper">Wicketkeeper</option>
            </select>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Upload Photo *</label>
            <input type="file" id="ply-photo-file" accept="image/*" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-amber-500 file:text-white" />
            <div id="ply-photo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <img id="ply-photo-preview-img" class="w-8 h-8 rounded object-cover" />
              <span class="text-[9px] text-emerald-700 font-bold">Photo ready!</span>
            </div>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Upload Aadhar Card (Back side Only) *</label>
            <input type="file" id="ply-aadhar-file" accept="image/*" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-sky-600 file:text-white" />
            <div id="ply-aadhar-preview-box" class="hidden mt-1 flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <img id="ply-aadhar-preview-img" class="w-10 h-7 rounded object-cover" />
              <span class="text-[9px] text-emerald-700 font-bold">Aadhar Back ready!</span>
            </div>
          </div>

          <div class="bg-gradient-to-b from-amber-50 to-white p-2.5 rounded-xl border border-amber-300 space-y-2 shadow-sm">
            <div class="flex justify-between items-center border-b border-amber-200 pb-1.5">
              <div>
                <span class="font-extrabold text-slate-900 text-xs block">Entry Fee Payment</span>
              </div>
              <span class="text-lg font-black text-amber-700">₹ 200</span>
            </div>

            <div class="bg-white p-2 rounded-xl border border-slate-200 text-center shadow-inner flex flex-col items-center space-y-1">
              <div class="text-[9px] font-black text-slate-800 uppercase">Scan QR Code Below</div>
              
              <div class="overflow-hidden rounded-lg border border-slate-900 p-1 inline-block">
                <img src="assets/navi_qr_code.jpg" alt="Pintu Santra Navi UPI QR Code" class="w-32 h-auto mx-auto object-contain rounded" />
              </div>

              <div class="font-mono font-bold text-[9px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                pintusantra4166@nyes
              </div>
            </div>

            <div class="grid grid-cols-3 gap-1">
              <a href="${phonepeUrl}" class="py-1 px-1 bg-purple-600 text-white font-extrabold text-[9px] rounded text-center shadow">
                PhonePe
              </a>
              <a href="${gpayUrl}" class="py-1 px-1 bg-blue-600 text-white font-extrabold text-[9px] rounded text-center shadow">
                GPay
              </a>
              <a href="${genericUpiUrl}" class="py-1 px-1 bg-emerald-600 text-white font-extrabold text-[9px] rounded text-center shadow">
                Any UPI
              </a>
            </div>

            <div class="space-y-1.5">
              <div>
                <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">UPI Transaction Number *</label>
                <input type="text" id="ply-upi-ref" required placeholder="UPI/9812736451/PINTU" class="w-full bg-white border border-slate-300 text-emerald-700 font-mono text-[11px] rounded p-1.5 focus:outline-none" />
              </div>

              <div>
                <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Upload Payment Screenshot File</label>
                <input type="file" id="ply-proof-file" accept="image/*" class="w-full bg-white border border-slate-300 text-slate-900 text-[9px] rounded p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[8px] file:font-bold file:bg-emerald-600 file:text-white" />
                <div id="ply-proof-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                  <img id="ply-proof-preview-img" class="w-10 h-7 rounded object-cover" />
                  <span class="text-[9px] text-emerald-700 font-bold">Receipt attached!</span>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" id="submit-player-reg-btn" class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-red-600 text-white font-extrabold text-xs rounded-xl shadow">
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

  document.getElementById('ply-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      plyPhotoDataUrl = await compressImage(file, 220, 220, 0.65);
      document.getElementById('ply-photo-preview-img').src = plyPhotoDataUrl;
      document.getElementById('ply-photo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('ply-aadhar-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      plyAadharDataUrl = await compressImage(file, 250, 180, 0.6);
      document.getElementById('ply-aadhar-preview-img').src = plyAadharDataUrl;
      document.getElementById('ply-aadhar-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('ply-proof-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      plyProofDataUrl = await compressImage(file, 250, 180, 0.6);
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
      alert(`Register Successful!\n\nPlayer "${newPlayer.name}" registered as Serial ${newPlayer.serialNo}.\nPayment Ref: ${upiRef}\nStatus: Pending Admin Payment Approval (Red Circle 🔴).`);
      navigate('jsl-hub');
      openRegisteredPlayersModal(store.getPlayers());
    } catch (err) {
      console.error("Player Registration Error:", err);
      alert("Registration Error: " + err.message);
    }
  });
}
