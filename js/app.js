// Core Application Router & Registration Portal (Developer: Suman Kolay - Form Protection & No-Blink Release)

import { store } from './store.js';
import { exportPlayersToCSV, exportTeamsToCSV, exportPlayersToPDF, printDigitalPass } from './export.js';
import { renderAdminDashboard } from './admin.js';

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/EDLr1a3qfww42HSmjKaBEL";

// ALWAYS default to landing page (No category opens automatically!)
let currentRoute = 'landing'; // landing, jsl-hub, admin

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  renderNavbar();
  renderMobileBottomNav();
  renderCurrentView();

  const safeRenderCurrentView = () => {
    // PROTECT ACTIVE USER FORMS: If any modal or form is open, DO NOT re-render or reset form data!
    if (document.querySelector('.modal-overlay')) return;
    renderCurrentView();
  };

  window.addEventListener('leagues_updated', safeRenderCurrentView);
  window.addEventListener('players_updated', safeRenderCurrentView);
  window.addEventListener('teams_updated', safeRenderCurrentView);
  window.addEventListener('user_updated', () => {
    renderNavbar();
    renderMobileBottomNav();
    safeRenderCurrentView();
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
        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-base sm:text-xl shadow-lg flex-shrink-0 border border-amber-300">
          🏏
        </div>
        <div class="truncate">
          <h1 class="text-xs sm:text-lg md:text-2xl font-black text-white leading-none tracking-tight truncate drop-shadow-md">
            Cricket Premier League
          </h1>
          <div class="text-[8px] sm:text-xs font-bold text-amber-400 truncate mt-0.5">Official Tournament Portal</div>
          <div class="text-[8px] sm:text-[10px] font-bold text-slate-400 tracking-wide truncate">Developer - <span class="text-sky-400 font-extrabold">Suman Kolay</span></div>
        </div>
      </div>

      <!-- Admin Panel Button -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <button id="admin-panel-nav-btn" class="px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-400 text-[11px] sm:text-xs font-bold rounded-xl flex items-center gap-1 transition-all shadow-lg hover:shadow-amber-500/20">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-amber-400"></i> Admin Panel
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

  bottomNavEl.className = "fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 px-4 py-2 sm:hidden shadow-2xl flex items-center justify-around";

  bottomNavEl.innerHTML = `
    <button id="mob-nav-home" class="flex flex-col items-center gap-0.5 ${currentRoute === 'landing' ? 'text-amber-400 font-extrabold' : 'text-slate-400'}">
      <i data-lucide="trophy" class="w-4 h-4"></i>
      <span class="text-[9px]">Home</span>
    </button>

    <button id="mob-nav-jsl" class="flex flex-col items-center gap-0.5 ${currentRoute === 'jsl-hub' ? 'text-sky-400 font-extrabold' : 'text-slate-400'}">
      <i data-lucide="shield" class="w-4 h-4"></i>
      <span class="text-[9px]">JSL Hub</span>
    </button>

    <button id="mob-nav-admin" class="flex flex-col items-center gap-0.5 ${currentRoute === 'admin' ? 'text-amber-400 font-extrabold' : 'text-slate-400'}">
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
      checkAndPromptWhatsAppGroup();
      break;
    case 'admin':
      renderAdminDashboard(container);
      break;
    default:
      renderFirstPageLanding(container);
  }

  if (window.lucide) window.lucide.createIcons();
}

// --- WHATSAPP GROUP POPUP PROMPT (SHOWS ONLY WHEN CLICKING JSL HUB) ---
function checkAndPromptWhatsAppGroup() {
  if (!sessionStorage.getItem('jsl_wa_group_prompted')) {
    sessionStorage.setItem('jsl_wa_group_prompted', 'true');
    setTimeout(() => {
      openWhatsAppGroupModal();
    }, 400);
  }
}

function openWhatsAppGroupModal() {
  const modalHtml = `
    <div id="whatsapp-group-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-sm w-full p-5 text-center relative space-y-4 animate-fade-in rounded-2xl shadow-2xl border-2 border-emerald-500/60">
        <button id="close-wa-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white mx-auto flex items-center justify-center font-black text-2xl shadow-xl border border-emerald-300">
          💬
        </div>

        <div class="space-y-1">
          <span class="px-3 py-0.5 bg-emerald-950 text-emerald-300 font-extrabold text-[10px] rounded-full uppercase border border-emerald-800 tracking-wider">
            ✨ Official JSL WhatsApp Group ✨
          </span>
          <h3 class="text-base sm:text-lg font-black text-white leading-snug">Join Jhankra Super League Group!</h3>
          <p class="text-[11px] text-slate-300 leading-snug">
            Get real-time match schedules, auction alerts, player updates & official announcements directly on WhatsApp!
          </p>
        </div>

        <div class="space-y-2">
          <a href="${WHATSAPP_GROUP_LINK}" target="_blank" id="join-wa-group-confirm-btn" class="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-xl flex items-center justify-center gap-2 border border-emerald-300">
            <i data-lucide="message-square" class="w-4 h-4 text-slate-950"></i> 📲 Join WhatsApp Group Now
          </a>
          <button id="remind-wa-later-btn" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl">
            Close & Continue
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('whatsapp-group-modal')?.remove();
  document.getElementById('close-wa-modal-btn')?.addEventListener('click', removeModal);
  document.getElementById('remind-wa-later-btn')?.addEventListener('click', removeModal);
  document.getElementById('join-wa-group-confirm-btn')?.addEventListener('click', removeModal);
}

// --- FIRST PAGE LANDING ---
function renderFirstPageLanding(containerEl) {
  containerEl.innerHTML = `
    <div class="min-h-[50vh] flex flex-col items-center justify-center space-y-4 sm:space-y-6 animate-fade-in py-2 sm:py-6">
      
      <!-- STYLISH WELCOME NOTE & SMART CRICKET MOTIVATIONAL NOTE -->
      <div class="w-full max-w-2xl text-center space-y-2.5 px-3">
        <div class="inline-block px-3.5 py-1 bg-gradient-to-r from-amber-500 via-red-600 to-amber-500 text-slate-950 font-black text-[11px] sm:text-xs rounded-full shadow-lg uppercase tracking-wider border border-amber-300">
          ✨ Welcome Champions & Cricket Enthusiasts! ✨
        </div>

        <h2 class="text-base sm:text-2xl font-black text-white leading-snug drop-shadow-md">
          "Champions aren't made in gymnasiums. Champions are made from a desire, a dream, & a vision. Play with Passion, Rise with Glory!"
        </h2>

        <p class="text-[10px] sm:text-xs font-bold text-slate-400 italic">
          🏏 Official Tournament Portal • Step onto the pitch and claim your victory!
        </p>
      </div>

      <!-- SELECT PREMIER LEAGUE PILL BADGE -->
      <div class="text-center">
        <span class="px-4 py-1 rounded-full bg-slate-900/90 text-amber-400 border border-amber-500/50 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest shadow-xl backdrop-blur-md">
          Select Premier League
        </span>
      </div>

      <!-- 3 CATEGORY SQUARE BOXES WITH 3 STYLISH LOGO IMAGES (grid-cols-3) -->
      <div class="grid grid-cols-3 gap-2 sm:gap-6 md:gap-8 w-full max-w-3xl px-2 sm:px-4">
        
        <!-- JPL STYLISH SQUARE BOX -->
        <div id="btn-click-jpl" class="square-category-box group border-amber-500/60">
          <img src="assets/jpl_logo.jpg" alt="JPL Logo" class="category-stylish-logo-img logo-border-jpl" />
          <h3 class="text-[11px] sm:text-2xl font-black text-white group-hover:text-amber-400 transition-colors">JPL</h3>
          <p class="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Jhankra Premier League</p>
        </div>

        <!-- JSL STYLISH SQUARE BOX -->
        <div id="btn-click-jsl" class="square-category-box group border-sky-400/60">
          <img src="assets/jsl_logo.jpg" alt="JSL Logo" class="category-stylish-logo-img logo-border-jsl" />
          <h3 class="text-[11px] sm:text-2xl font-black text-white group-hover:text-sky-400 transition-colors">JSL</h3>
          <p class="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Jhankra Super League</p>
        </div>

        <!-- KPL STYLISH SQUARE BOX -->
        <div id="btn-click-kpl" class="square-category-box group border-purple-400/60">
          <img src="assets/kpl_logo.jpg" alt="KPL Logo" class="category-stylish-logo-img logo-border-kpl" />
          <h3 class="text-[11px] sm:text-2xl font-black text-white group-hover:text-purple-400 transition-colors">KPL</h3>
          <p class="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Kota Premier League</p>
        </div>

      </div>

    </div>
  `;

  document.getElementById('btn-click-jpl')?.addEventListener('click', () => openComingSoonModal('JPL', 'Jhankra Premier League', 'assets/jpl_logo.jpg'));
  document.getElementById('btn-click-kpl')?.addEventListener('click', () => openComingSoonModal('KPL', 'Kota Premier League', 'assets/kpl_logo.jpg'));
  document.getElementById('btn-click-jsl')?.addEventListener('click', () => navigate('jsl-hub'));
}

// --- COMING SOON MODAL WITH STYLISH LOGOS ---
function openComingSoonModal(code, title, logoPath) {
  const modalHtml = `
    <div id="coming-soon-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-xs w-full p-4 text-center relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border ${code === 'JPL' ? 'border-amber-400/60' : 'border-purple-400/60'}">
        <button id="close-cs-btn" class="absolute top-2.5 right-2.5 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <img src="${logoPath}" class="w-14 h-14 rounded-xl mx-auto border-2 ${code === 'JPL' ? 'border-amber-400' : 'border-purple-400'} shadow-lg object-cover" />

        <div>
          <h3 class="text-lg font-black text-white">${title}</h3>
          <div class="inline-block mt-1 px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/50 rounded-full font-black text-[9px] uppercase tracking-widest animate-pulse">
            Coming Soon...
          </div>
        </div>

        <p class="text-[11px] text-slate-300 leading-snug">
          Registrations for <strong>${title} (${code})</strong> will open shortly. Stay tuned!
        </p>

        <button id="ok-cs-btn" class="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md">
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

// --- JSL HUB ---
function renderJSLHub(containerEl) {
  const teams = store.getTeams();
  const players = store.getPlayers();

  containerEl.innerHTML = `
    <div class="space-y-4 animate-fade-in max-w-4xl mx-auto py-2">
      
      <!-- Back Button & Header Bar -->
      <div class="flex items-center justify-between gap-2">
        <button id="back-to-landing-btn" class="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 shadow-lg backdrop-blur-md">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5 text-amber-400"></i> Category Selector
        </button>

        <span class="text-[10px] sm:text-xs font-black text-sky-400 bg-slate-900/90 px-3 py-1 rounded-xl border border-sky-500/40 shadow-lg backdrop-blur-md">
          🏆 JHANKRA SUPER LEAGUE 2026
        </span>
      </div>

      <!-- GRAND STADIUM POSTER STRIP -->
      <div class="jsl-header-strip p-3 sm:p-4 space-y-3 border-2 border-sky-500/50 shadow-2xl">
        <div class="flex items-center gap-3">
          <img src="assets/jsl_logo.jpg" alt="JSL Logo" class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-sky-400 shadow-xl flex-shrink-0" />
          <div>
            <div class="jsl-poster-title-navy">JHANKRA <span class="jsl-poster-title-red">SUPER LEAGUE</span></div>
            <div class="text-[9px] sm:text-xs font-extrabold text-sky-300 uppercase tracking-wide mt-0.5">
              8 TEAM TOURNAMENT • 29, 30 & 31 AUG 2026 @ JHANKRA SCHOOL GROUND
            </div>
          </div>
        </div>

        <!-- STYLISH GRADIENT PILL BADGES -->
        <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-700/60 text-[9px] sm:text-xs font-black">
          <span class="px-2.5 py-1 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-lg shadow border border-red-400">
            🏆 Winner: 35K | Runners: 25K
          </span>
          <span class="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg shadow border border-emerald-400">
            💰 Team Entry: 15K (8K Auction + 7K Fee)
          </span>
          <span class="px-2.5 py-1 bg-slate-900 text-amber-300 rounded-lg border border-amber-500/40 shadow">
            ⚠️ Chandrakona PS Only
          </span>
          <span class="px-2.5 py-1 bg-sky-600 text-white rounded-lg shadow border border-sky-400">
            📞 Contact: Pintu Santra (89722144166)
          </span>
        </div>
      </div>

      <!-- 3 HORIZONTAL COLUMNS (grid-cols-3 ON ALL DEVICES) -->
      <div class="grid grid-cols-3 gap-2 sm:gap-4 items-stretch">
        
        <!-- COLUMN 1 (LEFT SIDE): REGISTERED TEAMS CARD -->
        <div class="glass-card p-2.5 sm:p-4 text-center space-y-3 border-2 border-sky-500/40 flex flex-col justify-between hover:border-sky-400">
          <div class="space-y-2">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white mx-auto flex items-center justify-center shadow-lg border border-sky-300">
              <i data-lucide="shield" class="w-5 h-5 sm:w-6 sm:h-6"></i>
            </div>

            <div>
              <div class="text-[9px] sm:text-xs font-black text-slate-300 uppercase tracking-wide leading-tight">Registered Teams</div>
              <div class="text-lg sm:text-3xl font-black text-sky-400 mt-1 drop-shadow-md">${teams.length}</div>
            </div>
          </div>

          <button id="open-teams-modal-btn" class="w-full py-2 bg-slate-900/90 hover:bg-slate-800 text-sky-300 border border-sky-500/50 text-[9px] sm:text-xs font-black rounded-xl shadow-lg flex items-center justify-center gap-1 transition-all">
            <i data-lucide="search" class="w-3.5 h-3.5"></i> View Teams
          </button>
        </div>

        <!-- COLUMN 2 (MIDDLE): REGISTERED PLAYER LIST CARD -->
        <div class="glass-card p-2.5 sm:p-4 text-center space-y-3 border-2 border-amber-500/40 flex flex-col justify-between hover:border-amber-400">
          <div class="space-y-2">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 mx-auto flex items-center justify-center shadow-lg border border-amber-300 font-black">
              <i data-lucide="users" class="w-5 h-5 sm:w-6 sm:h-6"></i>
            </div>

            <div>
              <div class="text-[9px] sm:text-xs font-black text-slate-300 uppercase tracking-wide leading-tight">Registered Players</div>
              <div class="text-lg sm:text-3xl font-black text-amber-400 mt-1 drop-shadow-md">${players.length}</div>
            </div>
          </div>

          <button id="open-players-modal-btn" class="w-full py-2 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/50 text-[9px] sm:text-xs font-black rounded-xl shadow-lg flex items-center justify-center gap-1 transition-all">
            <i data-lucide="search" class="w-3.5 h-3.5"></i> View Players
          </button>
        </div>

        <!-- COLUMN 3 (RIGHT SIDE): REGISTRATION HERE CARD -->
        <div class="glass-card p-2.5 sm:p-4 text-center space-y-3 border-2 border-red-500/50 flex flex-col justify-between bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 hover:border-red-400">
          <div class="space-y-2">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 text-white mx-auto flex items-center justify-center font-black shadow-lg border border-amber-300">
              ✍️
            </div>

            <div>
              <div class="text-[9px] sm:text-xs font-black text-white uppercase tracking-wide leading-tight">Registration Here</div>
              <div class="text-[8px] sm:text-[10px] font-bold text-amber-400 mt-0.5">Team / Player Application</div>
            </div>
          </div>

          <!-- PERSISTENT BLINKING REGISTRATION BUTTON -->
          <button id="jsl-right-reg-btn" class="btn-blink-always w-full py-2 bg-gradient-to-r from-amber-500 via-red-600 to-amber-500 text-white font-black text-[9px] sm:text-xs rounded-xl shadow-xl flex items-center justify-center gap-1">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Registration Here
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

// --- REGISTERED TEAMS MODAL WITH MEDIUM SQUARE LOGO CARDS (NO NESTED SHAPES) ---
function openRegisteredTeamsModal(allTeams) {
  let filteredTeams = [...allTeams];

  const renderTeamListContent = () => {
    const container = document.getElementById('teams-list-container');
    if (!container) return;

    if (filteredTeams.length === 0) {
      container.innerHTML = `
        <div class="p-4 text-center space-y-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <i data-lucide="shield-off" class="w-5 h-5 text-slate-500 mx-auto"></i>
          <div class="text-xs font-bold text-slate-300">No matching teams found</div>
          <div class="text-[10px] text-slate-400">Try searching with a different name or owner.</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          ${filteredTeams.map((t) => `
            <div class="glass-card p-2.5 flex flex-col justify-between items-center text-center border border-sky-500/40 bg-slate-900/90 hover:border-sky-400">
              <img src="${t.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300'}" class="medium-square-team-logo mb-1.5" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300'" />
              
              <div class="space-y-0.5 w-full">
                <h3 class="font-extrabold text-white text-xs truncate leading-tight">${t.name}</h3>
                <div class="text-[9px] text-sky-300 font-bold truncate">Owner: ${t.ownerName}</div>
                <div class="text-[8px] text-slate-400 font-mono truncate">📞 ${t.ownerPhone}</div>
                ${t.coOwnerName ? `<div class="text-[8px] text-slate-400 truncate">Co-Owner: ${t.coOwnerName}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    if (window.lucide) window.lucide.createIcons();
  };

  const modalHtml = `
    <div id="teams-view-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-lg w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-800 modal-content-container">
        <button id="close-teams-modal" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-sky-950 text-sky-400 text-[9px] font-black rounded border border-sky-800 uppercase">JSL 2026</span>
          <h2 class="text-base font-black text-white mt-0.5">Registered Team List (${allTeams.length})</h2>
        </div>

        <!-- SEARCH BAR FOR TEAMS -->
        <div class="relative">
          <input type="text" id="team-search-input" placeholder="🔍 Search team by name or owner..." class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5 pl-3 focus:outline-none focus:border-sky-500 placeholder-slate-500" />
        </div>

        <div id="teams-list-container" class="max-h-[60vh] overflow-y-auto pr-1"></div>

        <button id="close-teams-modal-bottom" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow">
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

// --- REGISTERED PLAYERS MODAL WITH MEDIUM SQUARE PHOTO CARDS (NO NESTED SHAPES) ---
function openRegisteredPlayersModal(allPlayers) {
  let filteredPlayers = [...allPlayers];

  const renderPlayerListContent = () => {
    const container = document.getElementById('players-list-container');
    const countEl = document.getElementById('player-count-display');
    if (!container) return;

    if (countEl) countEl.innerText = `(${filteredPlayers.length})`;

    if (filteredPlayers.length === 0) {
      container.innerHTML = `
        <div class="p-4 text-center space-y-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <i data-lucide="user-x" class="w-5 h-5 text-slate-500 mx-auto"></i>
          <div class="text-xs font-bold text-slate-300">No matching players found</div>
          <div class="text-[10px] text-slate-400">Try searching with a different alphabet, name, category, or address.</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-xl w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-800 modal-content-container">
        <button id="close-players-modal" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div>
            <span class="px-2 py-0.5 bg-amber-950 text-amber-400 text-[9px] font-black rounded border border-amber-800 uppercase">JSL 2026</span>
            <h2 class="text-base font-black text-white mt-0.5">Registered Player List <span id="player-count-display">(${allPlayers.length})</span></h2>
          </div>

          <!-- DOWNLOAD PLAYERS PDF BUTTON -->
          <button id="download-players-pdf-btn" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-colors">
            <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Download PDF List
          </button>
        </div>

        <!-- SEARCH BAR FOR PLAYERS -->
        <div class="relative">
          <input type="text" id="player-search-input" placeholder="🔍 Search player by name, category, phone, address..." class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-2.5 pl-3 focus:outline-none focus:border-amber-500 placeholder-slate-500" />
        </div>

        <div id="players-list-container" class="max-h-[60vh] overflow-y-auto pr-1"></div>

        <button id="close-players-modal-bottom" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow">
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

// --- RENDER PLAYER CARDS (MEDIUM SQUARE PICTURE FORMAT WITH LOWER NAME - NO NESTED SHAPES) ---
function renderPlayerCardsWithSerial(playersList) {
  return playersList.map((p, idx) => {
    const serialNum = p.serialNo || (idx + 1);
    const isApproved = p.paymentStatus === 'APPROVED';

    return `
      <div class="glass-card p-2.5 flex flex-col justify-between items-center text-center relative border border-amber-500/40 bg-slate-900/90 hover:border-amber-400">
        
        <!-- Serial & Approval Badge Bar -->
        <div class="w-full flex justify-between items-center mb-1.5">
          <span class="px-1.5 py-0.5 bg-slate-950 text-amber-400 font-mono font-black text-[9px] rounded border border-amber-500/40 shadow">
            Serial ${serialNum}
          </span>

          <div class="flex items-center gap-0.5" title="${isApproved ? 'Payment Approved' : 'Pending Verification'}">
            <span class="${isApproved ? 'status-circle-green' : 'status-circle-red'}"></span>
            <span class="text-[8px] font-bold ${isApproved ? 'text-emerald-400' : 'text-red-400'}">
              ${isApproved ? 'OK' : 'PEND'}
            </span>
          </div>
        </div>

        <!-- MEDIUM SQUARE FORMAT PICTURE WITH BORDER (NO NESTED SHAPE) -->
        <img src="${p.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}" class="medium-square-photo mb-1.5" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'" />

        <!-- LOWER NAME & CATEGORY BELOW PICTURE -->
        <div class="space-y-0.5 mb-2 w-full">
          <h3 class="font-black text-white text-xs truncate leading-tight">${p.name}</h3>
          <div class="text-[9px] font-bold text-sky-400 truncate">
            ${p.category || 'Player'}
          </div>
        </div>

        <button data-profile-id="${p.id}" class="view-profile-modal-btn w-full py-1.5 bg-slate-950 hover:bg-slate-800 text-white text-[9px] font-extrabold rounded-lg border border-slate-800 shadow-sm flex items-center justify-center gap-1">
          <i data-lucide="user" class="w-3 h-3 text-amber-400"></i> View Profile
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
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-sm w-full p-4 relative space-y-3.5 animate-fade-in rounded-2xl shadow-2xl border border-slate-800 modal-content-container">
        <button id="close-profile-btn" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
          <img src="${player.photoUrl}" class="w-14 h-14 rounded-xl object-cover border-2 border-slate-700 shadow-lg" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'" />
          <div>
            <span class="px-1.5 py-0.5 bg-slate-950 text-white font-mono font-black text-[9px] rounded border border-slate-800">Serial ${player.serialNo || 1}</span>
            <h2 class="text-base font-black text-white mt-0.5">${player.name}</h2>
            <div class="flex items-center gap-1 text-[10px] font-bold ${isApproved ? 'text-emerald-400' : 'text-red-400'}">
              <span class="${isApproved ? 'status-circle-green' : 'status-circle-red'}"></span>
              <span>Status: ${isApproved ? 'Approved' : 'Pending Payment Verification'}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[10px]">
          <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
            <span class="text-slate-400 block uppercase font-semibold text-[8px]">Mobile Phone</span>
            <span class="font-extrabold text-white">${player.phone || 'N/A'}</span>
          </div>

          <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
            <span class="text-slate-400 block uppercase font-semibold text-[8px]">Category</span>
            <span class="font-extrabold text-sky-400">${player.category || player.role}</span>
          </div>

          <div class="col-span-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
            <span class="text-slate-400 block uppercase font-semibold text-[8px]">Full Address</span>
            <span class="font-bold text-slate-200">${player.address || 'Chandrakona Town PS Area'}</span>
          </div>

          <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
            <span class="text-slate-400 block uppercase font-semibold text-[8px]">UPI Ref No</span>
            <span class="font-mono font-bold text-emerald-400">${player.paymentRef || 'N/A'}</span>
          </div>

          <div class="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
            <span class="text-slate-400 block uppercase font-semibold text-[8px]">Registration Date</span>
            <span class="font-bold text-slate-200">${player.regDate}</span>
          </div>
        </div>

        <div class="flex gap-2 pt-1">
          <button id="print-pass-btn" class="flex-1 py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1">
            <i data-lucide="ticket" class="w-3.5 h-3.5"></i> Download Pass
          </button>
          <button id="close-profile-bottom-btn" class="py-2 px-3 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-700">
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
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-sm w-full p-4 relative space-y-3.5 animate-fade-in rounded-2xl shadow-2xl border border-slate-800 text-center modal-content-container">
        <button id="close-reg-type-btn" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-amber-950 text-amber-400 font-black text-[9px] rounded-full uppercase border border-amber-800">JHANKRA SUPER LEAGUE</span>
          <h2 class="text-base font-black text-white mt-1">Registration Here</h2>
          <p class="text-[10px] text-slate-400">Select registration type to proceed</p>
        </div>

        <div class="grid grid-cols-1 gap-2 pt-1">
          <button id="select-team-reg-btn" class="p-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white font-extrabold text-xs flex items-center justify-between shadow-lg">
            <div class="flex items-center gap-2">
              <i data-lucide="shield" class="w-4 h-4 text-amber-300"></i>
              <div class="text-left">
                <div>Part 1: Team Register</div>
                <div class="text-[9px] font-normal text-sky-100">15K (8K Auction + 7K Fee)</div>
              </div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </button>

          <button id="select-player-reg-btn" class="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 text-white font-extrabold text-xs flex items-center justify-between shadow-lg">
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
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-800 modal-content-container">
        <button id="close-team-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-sky-950 text-sky-400 text-[9px] font-black rounded border border-sky-800">PART 1: TEAM REGISTER</span>
          <h2 class="text-base font-black text-white mt-0.5">Register New Team</h2>
        </div>

        <form id="team-registration-form" class="space-y-2.5">
          <div>
            <label class="block text-[10px] font-bold text-slate-300 uppercase mb-0.5">Name of The Team *</label>
            <input type="text" id="team-name" required placeholder="Jhankra Strikers XI" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Owner Name *</label>
              <input type="text" id="owner-name" required placeholder="Vikram Rathore" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Phone *</label>
              <input type="tel" id="owner-phone" required placeholder="+91 98765..." class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Co-Owner Name</label>
              <input type="text" id="co-owner-name" placeholder="Rohit Verma" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Co-Owner Phone</label>
              <input type="tel" id="co-owner-phone" placeholder="+91 98123..." class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
            </div>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Upload Team Logo File</label>
            <input type="file" id="team-logo-file" accept="image/*" class="w-full bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-sky-600 file:text-white" />
            <div id="team-logo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <img id="team-logo-preview-img" class="w-8 h-8 rounded object-cover" />
              <span class="text-[9px] text-emerald-400 font-bold">Logo selected!</span>
            </div>
          </div>

          <button type="submit" class="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg">
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
      <div class="bg-slate-900/95 backdrop-blur-2xl max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-800 modal-content-container">
        <button id="close-player-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-amber-950 text-amber-400 text-[9px] font-black rounded border border-amber-800">PART 2: PLAYER REGISTER</span>
          <h2 class="text-base font-black text-white mt-0.5">Player Registration Form</h2>
        </div>

        <form id="player-registration-form" class="space-y-2.5">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Full Name *</label>
              <input type="text" id="ply-name" required placeholder="Rahul Sharma" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Phone Number *</label>
              <input type="tel" id="ply-phone" required placeholder="+91 98765..." class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Full Address *</label>
            <input type="text" id="ply-address" required placeholder="Chandrakona Town PS Area, Jhankra" class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500" />
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Player Category *</label>
            <select id="ply-category" required class="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500">
              <option value="Right Hand Batsman">Right Hand Batsman</option>
              <option value="Left Hand Batsman">Left Hand Batsman</option>
              <option value="Right Hand Bowler">Right Hand Bowler</option>
              <option value="Left Hand Bowler">Left Hand Bowler</option>
              <option value="All Rounder">All Rounder</option>
              <option value="Wicketkeeper">Wicketkeeper</option>
            </select>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Upload Photo *</label>
            <input type="file" id="ply-photo-file" accept="image/*" class="w-full bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-amber-500 file:text-slate-950" />
            <div id="ply-photo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <img id="ply-photo-preview-img" class="w-8 h-8 rounded object-cover" />
              <span class="text-[9px] text-emerald-400 font-bold">Photo ready!</span>
            </div>
          </div>

          <div>
            <label class="block text-[9px] font-bold text-slate-300 uppercase mb-0.5">Upload Aadhar Card (Back side Only) *</label>
            <input type="file" id="ply-aadhar-file" accept="image/*" class="w-full bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-sky-600 file:text-white" />
            <div id="ply-aadhar-preview-box" class="hidden mt-1 flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <img id="ply-aadhar-preview-img" class="w-10 h-7 rounded object-cover" />
              <span class="text-[9px] text-emerald-400 font-bold">Aadhar Back ready!</span>
            </div>
          </div>

          <div class="bg-slate-950 p-2.5 rounded-xl border border-amber-500/40 space-y-2 shadow-inner">
            <div class="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <div>
                <span class="font-extrabold text-white text-xs block">Entry Fee Payment</span>
              </div>
              <span class="text-lg font-black text-amber-400">₹ 200</span>
            </div>

            <div class="bg-slate-900 p-2 rounded-xl border border-slate-800 text-center flex flex-col items-center space-y-1">
              <div class="text-[9px] font-black text-slate-200 uppercase">Scan QR Code Below</div>
              
              <div class="overflow-hidden rounded-lg border border-slate-700 p-1 bg-white inline-block">
                <img src="assets/navi_qr_code.jpg" alt="Pintu Santra Navi UPI QR Code" class="w-32 h-auto mx-auto object-contain rounded" />
              </div>

              <div class="font-mono font-bold text-[9px] text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 inline-block">
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
                <label class="block text-[8px] font-bold text-slate-300 uppercase mb-0.5">UPI Transaction Number *</label>
                <input type="text" id="ply-upi-ref" required placeholder="UPI/9812736451/PINTU" class="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-[11px] rounded p-1.5 focus:outline-none" />
              </div>

              <div>
                <label class="block text-[8px] font-bold text-slate-300 uppercase mb-0.5">Upload Payment Screenshot File</label>
                <input type="file" id="ply-proof-file" accept="image/*" class="w-full bg-slate-900 border border-slate-700 text-slate-300 text-[9px] rounded p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[8px] file:font-bold file:bg-emerald-600 file:text-white" />
                <div id="ply-proof-preview-box" class="hidden mt-1 flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <img id="ply-proof-preview-img" class="w-10 h-7 rounded object-cover" />
                  <span class="text-[9px] text-emerald-400 font-bold">Receipt attached!</span>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" id="submit-player-reg-btn" class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-red-600 text-white font-extrabold text-xs rounded-xl shadow-lg">
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
