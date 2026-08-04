// Core Application Router & Registration Portal (Developer: Suman Kolay - Cambria & Deep Blue Theme)

import { store } from './store.js';
import { exportPlayersToCSV, exportTeamsToCSV, exportPlayersToPDF, exportTeamsToPDF, printDigitalPass, openUserGuidePDF } from './export.js';
import { renderAdminDashboard } from './admin.js';
import { uploadHDImage } from './supabase.js';

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/EDLr1a3qfww42HSmjKaBEL";

// PWA Deferred Prompt Capture
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("PWA install prompt captured.");
});

// ALWAYS default to landing page (No category opens automatically!)
let currentRoute = 'landing'; // landing, jsl-hub, admin

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  renderNavbar();
  renderMobileBottomNav();
  renderCurrentView();

  // First Visit Welcome & App Install Popup Prompt
  checkAndPromptFirstVisitPopup();

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

// --- PWA MOBILE APP INSTALLATION HANDLER ---
function handleInstallAppClick() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA installation');
      }
      deferredPrompt = null;
    });
  } else {
    openAppInstallInstructionModal();
  }
}

function openAppInstallInstructionModal() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const modalHtml = `
    <div id="app-install-instruction-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-sm sm:max-w-md w-full p-5 relative space-y-4 animate-fade-in rounded-2xl shadow-2xl border-2 border-emerald-500 text-center modal-content-container">
        <button id="close-install-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-900 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white mx-auto flex items-center justify-center font-black text-3xl shadow-lg border-2 border-emerald-300">
          📲
        </div>

        <div class="space-y-1">
          <span class="px-3 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full uppercase border border-emerald-300 tracking-wider">
            OFFICIAL MOBILE APP INSTALLATION
          </span>
          <h2 class="text-lg sm:text-xl font-black text-slate-900">Install CPL 2026 Mobile App</h2>
          <p class="text-xs text-slate-600">Get 1-click home screen access to Jhankra Super League on your mobile phone!</p>
        </div>

        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
          ${isIOS ? `
            <div class="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 text-sky-700">
              🍎 iPhone / iPad (Safari Browser Instructions):
            </div>
            <ol class="list-decimal list-inside space-y-1.5 text-slate-700 font-semibold pl-1">
              <li>Tap the <strong class="text-slate-900">Share Button ⎋</strong> at the bottom of Safari screen.</li>
              <li>Scroll down & select <strong class="text-emerald-700">"Add to Home Screen ➕"</strong>.</li>
              <li>Tap <strong class="text-emerald-700">"Add"</strong> in the top right corner.</li>
            </ol>
          ` : `
            <div class="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 text-emerald-700">
              🤖 Android / Chrome Browser Instructions:
            </div>
            <ol class="list-decimal list-inside space-y-1.5 text-slate-700 font-semibold pl-1">
              <li>Tap Chrome Menu <strong class="text-slate-900">(⋮ Three Dots)</strong> in top right corner.</li>
              <li>Tap <strong class="text-emerald-700 font-extrabold">"Install App"</strong> or <strong class="text-emerald-700 font-extrabold">"Add to Home screen"</strong>.</li>
              <li>Confirm & the <strong>CPL 2026 App icon 🏏</strong> will appear on your phone home screen!</li>
            </ol>
          `}
        </div>

        <button id="close-install-modal-confirm-btn" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md">
          Got It, Thanks!
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('app-install-instruction-modal')?.remove();
  document.getElementById('close-install-modal-btn')?.addEventListener('click', removeModal);
  document.getElementById('close-install-modal-confirm-btn')?.addEventListener('click', removeModal);
}

// --- FIRST VISIT WELCOME & APP INSTALL POPUP PROMPT ---
function checkAndPromptFirstVisitPopup() {
  if (!sessionStorage.getItem('cpl_first_visit_popup_shown_v2')) {
    sessionStorage.setItem('cpl_first_visit_popup_shown_v2', 'true');
    setTimeout(() => {
      openFirstVisitWelcomeModal();
    }, 600);
  }
}

function openFirstVisitWelcomeModal() {
  if (document.querySelector('.modal-overlay')) return;

  const modalHtml = `
    <div id="first-visit-welcome-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-sm sm:max-w-md w-full p-5 relative space-y-4 animate-fade-in rounded-2xl shadow-2xl border-2 border-amber-400 text-center modal-content-container">
        <button id="close-first-visit-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-900 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-emerald-600 text-slate-950 mx-auto flex items-center justify-center font-black text-3xl shadow-lg border-2 border-amber-300">
          🏏
        </div>

        <div class="space-y-1">
          <span class="px-3 py-0.5 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded-full uppercase border border-amber-300 tracking-wider">
            ✨ OFFICIAL TOURNAMENT PORTAL ✨
          </span>
          <h2 class="text-lg sm:text-xl font-black text-slate-900">Welcome to Jhankra Super League (JSL 2026)!</h2>
          <p class="text-xs text-slate-600 leading-relaxed">
            Step onto the pitch & claim your victory! Register your Franchise Team or Player entry online or install our Mobile App.
          </p>
        </div>

        <div class="space-y-2 pt-1">
          <!-- 1. Install App Button -->
          <button id="first-visit-install-app-btn" class="w-full py-3 bg-gradient-to-r from-amber-500 via-emerald-600 to-amber-500 hover:from-amber-400 hover:to-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 border border-amber-300">
            📲 Install Mobile App On Phone
          </button>

          <!-- 2. WhatsApp Group Button -->
          <a href="${WHATSAPP_GROUP_LINK}" target="_blank" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 border border-emerald-400">
            💬 Join Official WhatsApp Group
          </a>

          <!-- 3. Close Button -->
          <button id="close-first-visit-confirm-btn" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300">
            Continue to Portal
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('first-visit-welcome-modal')?.remove();
  document.getElementById('close-first-visit-modal-btn')?.addEventListener('click', removeModal);
  document.getElementById('close-first-visit-confirm-btn')?.addEventListener('click', removeModal);

  document.getElementById('first-visit-install-app-btn')?.addEventListener('click', () => {
    removeModal();
    handleInstallAppClick();
  });
}

// --- CLIENT-SIDE HD IMAGE COMPRESSION (~150 KB - 280 KB PER IMAGE, NOT LESS THAN 50 KB) ---
function compressImage(file, maxWidth = 1050, maxHeight = 1050, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
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
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// --- BEAUTIFUL REGISTRATION SUCCESS POPUP MODAL ---
function openRegistrationSuccessModal(details) {
  const modalHtml = `
    <div id="registration-success-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 animate-fade-in">
      <div class="bg-white max-w-sm sm:max-w-md w-full p-5 relative space-y-4 rounded-2xl shadow-2xl border-2 border-emerald-500 text-center modal-content-container">
        
        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white mx-auto flex items-center justify-center font-black text-3xl shadow-xl border-2 border-emerald-300 animate-bounce">
          🎉
        </div>

        <div>
          <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full border border-emerald-300 uppercase">JSL 2026 CONFIRMED</span>
          <h2 class="text-xl font-black text-slate-900 mt-1">Registration Successful!</h2>
          <p class="text-xs text-slate-600 mt-0.5">Your registration has been submitted successfully.</p>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-2 text-xs font-semibold text-slate-800">
          <div class="flex justify-between border-b border-slate-200 pb-1">
            <span class="text-slate-500">Registration ID:</span>
            <span class="font-mono font-black text-emerald-700">${details.registrationId || details.regNo || 'JSL2026-0001'}</span>
          </div>
          <div class="flex justify-between border-b border-slate-200 pb-1">
            <span class="text-slate-500">${details.isTeam ? 'Team Name:' : 'Player Name:'}</span>
            <span class="font-extrabold text-slate-900">${details.name}</span>
          </div>
          <div class="flex justify-between border-b border-slate-200 pb-1">
            <span class="text-slate-500">Serial No:</span>
            <span class="font-extrabold text-slate-900">#${details.displayRegistrationNumber || details.serialNo || 1}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Status:</span>
            <span class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px] border border-amber-300 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending Admin Verification
            </span>
          </div>
        </div>

        <div class="space-y-2 pt-1">
          <a href="https://chat.whatsapp.com/EDLr1a3qfww42HSmjKaBEL" target="_blank" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all">
            💬 Join Official WhatsApp Group
          </a>
          <button id="close-reg-success-btn" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow">
            View Registered List
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const removeModal = () => {
    document.getElementById('registration-success-modal')?.remove();
    navigate('jsl-hub');
    if (details.isTeam) {
      openRegisteredTeamsModal(store.getTeams());
    } else {
      openRegisteredPlayersModal(store.getPlayers());
    }
  };

  document.getElementById('close-reg-success-btn')?.addEventListener('click', removeModal);
}

// --- FULL HD PHOTO ZOOM MODAL ---
function openHDPhotoZoomModal(imgSrc, title = 'Player Full HD Photo') {
  if (!imgSrc) return;
  const modalHtml = `
    <div id="full-hd-photo-zoom-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-md">
      <div class="max-w-3xl w-full p-4 relative space-y-3 animate-fade-in text-center bg-white border border-slate-200 rounded-2xl shadow-2xl">
        <button id="close-hd-zoom-btn" class="absolute top-3 right-3 text-slate-500 hover:text-slate-900 p-1.5 bg-slate-100 rounded-xl">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
        <div class="text-left border-b border-slate-200 pb-2">
          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[9px] font-black rounded border border-emerald-300 uppercase">FULL HD PHOTO VIEWER</span>
          <h3 class="text-slate-900 font-black text-base mt-0.5">${title}</h3>
        </div>
        <div class="max-h-[75vh] overflow-auto flex justify-center p-2 bg-slate-50 rounded-xl border border-slate-200">
          <img src="${imgSrc}" class="max-w-full max-h-[70vh] object-contain rounded-xl shadow-xl border-2 border-emerald-500" />
        </div>
        <button id="close-hd-zoom-bottom-btn" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow">
          Close HD Viewer
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeZoomModal = () => document.getElementById('full-hd-photo-zoom-modal')?.remove();
  document.getElementById('close-hd-zoom-btn')?.addEventListener('click', removeZoomModal);
  document.getElementById('close-hd-zoom-bottom-btn')?.addEventListener('click', removeZoomModal);
}

// --- UPPER HEADER (DEEP BLUE WITH GOLD ACCENT, INSTALL APP & ADMIN PANEL BUTTONS) ---
function renderNavbar() {
  const navbarEl = document.getElementById('app-navbar');
  if (!navbarEl) return;

  navbarEl.innerHTML = `
    <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
      <!-- Title, Subtitle & Developer Credit -->
      <div class="flex items-center gap-2.5 sm:gap-3 cursor-pointer min-w-0" id="brand-header-logo">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-slate-950 font-black text-base sm:text-xl shadow-md flex-shrink-0 border border-amber-300">
          🏏
        </div>
        <div class="truncate">
          <h1 class="text-sm sm:text-lg md:text-2xl font-black text-white leading-none tracking-tight truncate drop-shadow">
            Cricket Premier League
          </h1>
          <div class="text-[9px] sm:text-xs font-black text-amber-400 truncate mt-0.5">Official Tournament Portal</div>
          <div class="text-[8px] sm:text-[10px] font-bold text-slate-300 tracking-wide truncate">Developer - <span class="text-sky-300 font-extrabold">Suman Kolay</span></div>
        </div>
      </div>

      <!-- Install App & Admin Panel Buttons -->
      <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <button id="nav-install-app-btn" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-black rounded-xl flex items-center gap-1 transition-all shadow-md border border-emerald-400">
          📲 Install App
        </button>
        <button id="admin-panel-nav-btn" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] sm:text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md border border-amber-300">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-slate-950"></i> Admin Panel
        </button>
      </div>
    </div>
  `;

  document.getElementById('brand-header-logo')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('nav-install-app-btn')?.addEventListener('click', handleInstallAppClick);
  document.getElementById('admin-panel-nav-btn')?.addEventListener('click', () => navigate('admin'));
  if (window.lucide) window.lucide.createIcons();
}

// --- MOBILE STICKY BOTTOM BAR ---
function renderMobileBottomNav() {
  const bottomNavEl = document.getElementById('mobile-bottom-nav');
  if (!bottomNavEl) return;

  bottomNavEl.className = "fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 py-2 sm:hidden shadow-lg flex items-center justify-around";

  bottomNavEl.innerHTML = `
    <button id="mob-nav-home" class="flex flex-col items-center gap-0.5 ${currentRoute === 'landing' ? 'text-emerald-600 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="trophy" class="w-4 h-4"></i>
      <span class="text-[9px]">Home</span>
    </button>

    <button id="mob-nav-jsl" class="flex flex-col items-center gap-0.5 ${currentRoute === 'jsl-hub' ? 'text-sky-600 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="shield" class="w-4 h-4"></i>
      <span class="text-[9px]">JSL Hub</span>
    </button>

    <button id="mob-nav-install" class="flex flex-col items-center gap-0.5 text-emerald-600 font-black">
      <i data-lucide="download" class="w-4 h-4 text-emerald-600"></i>
      <span class="text-[9px]">Install App</span>
    </button>

    <button id="mob-nav-admin" class="flex flex-col items-center gap-0.5 ${currentRoute === 'admin' ? 'text-emerald-600 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="shield-check" class="w-4 h-4"></i>
      <span class="text-[9px]">Admin</span>
    </button>
  `;

  document.getElementById('mob-nav-home')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('mob-nav-jsl')?.addEventListener('click', () => navigate('jsl-hub'));
  document.getElementById('mob-nav-install')?.addEventListener('click', handleInstallAppClick);
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

// --- WHATSAPP GROUP POPUP PROMPT ---
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
      <div class="bg-white max-w-sm w-full p-5 text-center relative space-y-4 animate-fade-in rounded-2xl shadow-2xl border-2 border-emerald-500">
        <button id="close-wa-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-800 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white mx-auto flex items-center justify-center font-black text-2xl shadow-md border border-emerald-300">
          💬
        </div>

        <div class="space-y-1">
          <span class="px-3 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full uppercase border border-emerald-300 tracking-wider">
            ✨ Official JSL WhatsApp Group ✨
          </span>
          <h3 class="text-base sm:text-lg font-black text-slate-900 leading-snug">Join Jhankra Super League Group!</h3>
          <p class="text-[11px] text-slate-600 leading-snug">
            Get real-time match schedules, auction alerts, player updates & official announcements directly on WhatsApp!
          </p>
        </div>

        <div class="space-y-2">
          <a href="${WHATSAPP_GROUP_LINK}" target="_blank" id="join-wa-group-confirm-btn" class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 border border-emerald-400">
            <i data-lucide="message-square" class="w-4 h-4 text-white"></i> 📲 Join WhatsApp Group Now
          </a>
          <button id="remind-wa-later-btn" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300">
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

// --- FIRST PAGE LANDING (HANDWRITTEN 2-LINE QUOTE & BIGGER BORDERLESS WHITE LOGOS) ---
function renderFirstPageLanding(containerEl) {
  containerEl.innerHTML = `
    <div class="min-h-[50vh] flex flex-col items-center justify-center space-y-4 sm:space-y-6 animate-fade-in py-2 sm:py-6">
      
      <!-- STYLISH WELCOME NOTE & 2-LINE LETTER READING CRICKET MOTIVATIONAL QUOTE -->
      <div class="w-full max-w-2xl text-center space-y-2 px-3 mx-auto">
        <div class="inline-block px-3.5 py-1 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-600 text-white font-black text-[11px] sm:text-xs rounded-full shadow-md uppercase tracking-wider border border-emerald-400">
          ✨ Welcome Champions & Cricket Enthusiasts! ✨
        </div>

        <!-- 2-LINE LEFT-TO-RIGHT READING ANIMATED HANDWRITTEN QUOTE -->
        <div class="handwritten-quote font-black text-slate-900 leading-tight space-y-1 mx-auto max-w-xl">
          <span class="animate-type-line-1 text-sm sm:text-xl font-black">"Champions aren't made in gymnasiums. Champions are made from a desire, a dream, & a vision.</span>
          <span class="animate-type-line-2 text-sm sm:text-xl font-black text-emerald-700">Play with Passion, Rise with Glory!"</span>
        </div>

        <p class="text-xs sm:text-sm font-black red-read-slogan mt-1">
          🏏 Official Tournament Portal • Step onto the pitch and claim your victory!
        </p>

        <div class="pt-1">
          <button id="landing-install-app-btn" class="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-600 text-white font-black text-xs rounded-xl shadow-md border border-emerald-400 inline-flex items-center gap-2 hover:scale-105 transition-transform">
            📲 Install Mobile App / Download APK
          </button>
        </div>
      </div>

      <!-- SELECT PREMIER LEAGUE PILL BADGE -->
      <div class="text-center">
        <span class="px-4 py-1.5 rounded-full bg-white text-emerald-700 border border-slate-300 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-md">
          Select Premier League
        </span>
      </div>

      <!-- 3 CATEGORY SQUARE BOXES WITH BIGGER WHITE-BACKGROUND ISOLATED LOGOS & NO IMAGE BORDER -->
      <div class="grid grid-cols-3 gap-2.5 sm:gap-6 md:gap-8 w-full max-w-3xl px-2 sm:px-4">
        
        <!-- JPL STYLISH SQUARE BOX (AMBER GOLD THEME) -->
        <div id="btn-click-jpl" class="square-category-box group bg-gradient-to-b from-amber-50 to-white border-2 border-amber-400 hover:border-amber-500 shadow-md">
          <img src="assets/jpl_logo_white.jpg" alt="JPL Logo" class="category-stylish-logo-img" />
          <h3 class="text-base sm:text-3xl font-black text-amber-700 group-hover:scale-105 transition-transform">JPL</h3>
          <p class="text-[9px] sm:text-xs font-black text-slate-600 uppercase tracking-wider hidden sm:block">Jhankra Premier League</p>
          
          <!-- BLINKING COMING SOON BADGE -->
          <div class="mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full font-black text-[9px] sm:text-xs uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-ping"></span> Coming Soon
          </div>
        </div>

        <!-- JSL STYLISH SQUARE BOX (EMERALD GREEN THEME) -->
        <div id="btn-click-jsl" class="square-category-box group bg-gradient-to-b from-emerald-50 to-white border-2 border-emerald-500 hover:border-emerald-600 shadow-lg">
          <img src="assets/jsl_logo_white.jpg" alt="JSL Logo" class="category-stylish-logo-img" />
          <h3 class="text-base sm:text-3xl font-black text-emerald-700 group-hover:scale-105 transition-transform">JSL</h3>
          <p class="text-[9px] sm:text-xs font-black text-slate-600 uppercase tracking-wider hidden sm:block">Jhankra Super League</p>
          
          <!-- BLINKING GREEN LIVE BADGE -->
          <div class="mt-1 px-2.5 py-0.5 bg-emerald-600 text-white border border-emerald-400 rounded-full font-black text-[9px] sm:text-xs uppercase tracking-wider btn-blink-always flex items-center gap-1 shadow-md">
            <span class="w-1.5 h-1.5 rounded-full bg-white inline-block animate-ping"></span> 🟢 LIVE
          </div>
        </div>

        <!-- KPL STYLISH SQUARE BOX (PURPLE THEME) -->
        <div id="btn-click-kpl" class="square-category-box group bg-gradient-to-b from-purple-50 to-white border-2 border-purple-400 hover:border-purple-500 shadow-md">
          <img src="assets/kpl_logo_white.jpg" alt="KPL Logo" class="category-stylish-logo-img" />
          <h3 class="text-base sm:text-3xl font-black text-purple-700 group-hover:scale-105 transition-transform">KPL</h3>
          <p class="text-[9px] sm:text-xs font-black text-slate-600 uppercase tracking-wider hidden sm:block">Kota Premier League</p>
          
          <!-- BLINKING COMING SOON BADGE -->
          <div class="mt-1 px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 rounded-full font-black text-[9px] sm:text-xs uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block animate-ping"></span> Coming Soon
          </div>
        </div>

      </div>

    </div>
  `;

  document.getElementById('landing-install-app-btn')?.addEventListener('click', handleInstallAppClick);
  document.getElementById('btn-click-jpl')?.addEventListener('click', () => openComingSoonModal('JPL', 'Jhankra Premier League', 'assets/jpl_logo_white.jpg'));
  document.getElementById('btn-click-kpl')?.addEventListener('click', () => openComingSoonModal('KPL', 'Kota Premier League', 'assets/kpl_logo_white.jpg'));
  document.getElementById('btn-click-jsl')?.addEventListener('click', () => navigate('jsl-hub'));
}

// --- COMING SOON MODAL WITH STYLISH LOGOS ---
function openComingSoonModal(code, title, logoPath) {
  const modalHtml = `
    <div id="coming-soon-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-xs w-full p-4 text-center relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border ${code === 'JPL' ? 'border-amber-400' : 'border-purple-400'}">
        <button id="close-cs-btn" class="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-800 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <img src="${logoPath}" class="w-20 h-20 rounded-2xl mx-auto border-0 shadow-md object-contain" />

        <div>
          <h3 class="text-lg font-black text-slate-900">${title}</h3>
          <div class="inline-block mt-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full font-black text-[9px] uppercase tracking-widest animate-pulse">
            Coming Soon...
          </div>
        </div>

        <p class="text-[11px] text-slate-600 leading-snug">
          Registrations for <strong>${title} (${code})</strong> will open shortly. Stay tuned!
        </p>

        <button id="ok-cs-btn" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md">
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
  const approvedPlayers = players.filter(p => (p.registrationStatus || p.paymentStatus) === 'APPROVED');
  const pendingPlayers = players.filter(p => (p.registrationStatus || p.paymentStatus) === 'PENDING');

  containerEl.innerHTML = `
    <div class="space-y-4 animate-fade-in max-w-4xl mx-auto py-2">
      
      <!-- Back Button & Header Bar -->
      <div class="flex items-center justify-between gap-2">
        <button id="back-to-landing-btn" class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-extrabold rounded-xl border border-slate-300 flex items-center gap-1.5 shadow-sm">
          <i data-lucide="arrow-left" class="w-3.5 h-3.5 text-emerald-600"></i> Category Selector
        </button>

        <button id="open-user-guide-pdf-btn" class="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-[10px] sm:text-xs rounded-xl border border-emerald-400 shadow-md flex items-center gap-1.5 transition-all">
          <i data-lucide="book-open" class="w-3.5 h-3.5 text-amber-300"></i> 📖 User Guide PDF (English & বাংলা)
        </button>
      </div>

      <!-- GRAND STADIUM POSTER STRIP (PURE WHITE LIGHT THEME) -->
      <div class="jsl-header-strip p-3 sm:p-4 space-y-3 bg-white border-2 border-slate-200 rounded-2xl shadow-lg">
        <div class="flex items-center gap-3">
          <img src="assets/jsl_logo_white.jpg" alt="JSL Logo" class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-contain border-0 shadow-md flex-shrink-0" />
          <div>
            <div class="jsl-poster-title-navy text-slate-900">JHANKRA <span class="text-emerald-600 font-black">SUPER LEAGUE</span></div>
            <div class="text-[9px] sm:text-xs font-extrabold text-sky-700 uppercase tracking-wide mt-0.5">
              8 TEAM TOURNAMENT • 29, 30 & 31 AUG 2026 @ JHANKRA SCHOOL GROUND
            </div>
          </div>
        </div>

        <!-- STYLISH GRADIENT PILL BADGES & STATS SUMMARY -->
        <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 text-[9px] sm:text-xs font-black">
          <span class="px-2.5 py-1 bg-amber-500 text-slate-950 font-black rounded-lg shadow border border-amber-400">
            🏆 Winner: 35K | Runners: 25K
          </span>
          <span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-lg border border-emerald-300 shadow-sm">
            🟢 Approved: ${approvedPlayers.length}
          </span>
          <span class="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold rounded-lg border border-amber-300 shadow-sm">
            🔴 Pending: ${pendingPlayers.length}
          </span>
          <span class="px-2.5 py-1 bg-sky-100 text-sky-900 font-extrabold rounded-lg border border-sky-300 shadow-sm">
            📞 Contact: Pintu Santra (89722144166)
          </span>
        </div>
      </div>

      <!-- 3 HORIZONTAL COLUMNS (grid-cols-3 ON ALL DEVICES) -->
      <div class="grid grid-cols-3 gap-2 sm:gap-4 items-stretch">
        
        <!-- COLUMN 1 (LEFT SIDE): REGISTERED TEAMS CARD -->
        <div class="glass-card p-3 sm:p-5 text-center space-y-3 border-2 border-sky-200 bg-white flex flex-col justify-between hover:border-sky-500 shadow-md">
          <div class="space-y-2">
            <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white mx-auto flex items-center justify-center shadow-md font-black">
              <i data-lucide="shield" class="w-6 h-6 sm:w-7 sm:h-7"></i>
            </div>

            <div>
              <div class="text-xs sm:text-base font-black text-slate-900 uppercase tracking-wide leading-tight">REGISTERED TEAMS</div>
              <div class="text-3xl sm:text-5xl font-black text-sky-600 mt-1">${teams.length}</div>
            </div>
          </div>

          <button id="open-teams-modal-btn" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all">
            <i data-lucide="search" class="w-4 h-4 text-amber-400"></i> View Teams
          </button>
        </div>

        <!-- COLUMN 2 (MIDDLE): REGISTERED PLAYER LIST CARD -->
        <div class="glass-card p-3 sm:p-5 text-center space-y-3 border-2 border-emerald-200 bg-white flex flex-col justify-between hover:border-emerald-500 shadow-md">
          <div class="space-y-2">
            <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white mx-auto flex items-center justify-center shadow-md font-black">
              <i data-lucide="users" class="w-6 h-6 sm:w-7 sm:h-7"></i>
            </div>

            <div>
              <div class="text-xs sm:text-base font-black text-slate-900 uppercase tracking-wide leading-tight">REGISTERED PLAYERS</div>
              <div class="text-3xl sm:text-5xl font-black text-emerald-600 mt-1">${players.length}</div>
            </div>
          </div>

          <button id="open-players-modal-btn" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all">
            <i data-lucide="search" class="w-4 h-4 text-amber-400"></i> View Players
          </button>
        </div>

        <!-- COLUMN 3 (RIGHT SIDE): REGISTRATION HERE CARD -->
        <div class="glass-card p-3 sm:p-5 text-center space-y-3 border-2 border-amber-300 bg-white flex flex-col justify-between hover:border-amber-500 shadow-md">
          <div class="space-y-2">
            <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 mx-auto flex items-center justify-center font-black shadow-md border border-amber-300">
              ✍️
            </div>

            <div>
              <div class="text-xs sm:text-base font-black text-slate-900 uppercase tracking-wide leading-tight">REGISTRATION HERE</div>
              <div class="text-[9px] sm:text-xs font-extrabold text-amber-700 mt-0.5">Team / Player Application</div>
            </div>
          </div>

          <!-- PERSISTENT BLINKING REGISTRATION BUTTON -->
          <button id="jsl-right-reg-btn" class="btn-blink-always w-full py-2.5 bg-gradient-to-r from-amber-500 via-emerald-600 to-amber-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-1.5">
            <i data-lucide="edit-3" class="w-4 h-4"></i> Registration Here
          </button>
        </div>

      </div>

    </div>
  `;

  document.getElementById('back-to-landing-btn')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('open-user-guide-pdf-btn')?.addEventListener('click', openUserGuidePDF);
  document.getElementById('jsl-right-reg-btn')?.addEventListener('click', openRegistrationTypeModal);

  // Click-to-Open Modal Listeners
  document.getElementById('open-teams-modal-btn')?.addEventListener('click', () => openRegisteredTeamsModal(teams));
  document.getElementById('open-players-modal-btn')?.addEventListener('click', () => openRegisteredPlayersModal(players));
}

// --- REGISTERED TEAMS MODAL WITH CO-OWNERS 1 & 2 SUPPORT ---
function openRegisteredTeamsModal(allTeams) {
  let filteredTeams = [...allTeams];

  const renderTeamListContent = () => {
    const container = document.getElementById('teams-list-container');
    if (!container) return;

    if (filteredTeams.length === 0) {
      container.innerHTML = `
        <div class="p-4 text-center space-y-1 bg-slate-50 rounded-xl border border-slate-200">
          <i data-lucide="shield-off" class="w-5 h-5 text-slate-400 mx-auto"></i>
          <div class="text-xs font-bold text-slate-700">No matching teams found</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${filteredTeams.map((t) => {
            const co1Name = t.coOwner1Name || t.coOwnerName || '';
            const co1Phone = t.coOwner1Phone || t.coOwnerPhone || '';
            const co1Photo = t.coOwner1PhotoUrl || '';

            const co2Name = t.coOwner2Name || '';
            const co2Phone = t.coOwner2Phone || '';
            const co2Photo = t.coOwner2PhotoUrl || '';

            return `
              <div class="glass-card p-3 flex flex-col justify-between items-center text-center border border-sky-300 bg-white hover:border-sky-500 shadow-md">
                <div class="flex items-center justify-center gap-1.5 mb-2 w-full flex-wrap">
                  <!-- TEAM LOGO -->
                  <div class="w-11 h-11 rounded-xl bg-white border border-slate-300 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0" title="Team Logo">
                    ${t.logoUrl ? `<img src="${t.logoUrl}" class="w-full h-full object-cover" />` : ''}
                  </div>

                  <!-- OWNER PHOTO -->
                  <div class="w-11 h-11 rounded-xl bg-white border-2 border-amber-500 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0" title="Owner: ${t.ownerName}">
                    ${t.ownerPhotoUrl || t.ownerPhoto ? `<img src="${t.ownerPhotoUrl || t.ownerPhoto}" class="w-full h-full object-cover" />` : ''}
                  </div>

                  <!-- CO-OWNER 1 PHOTO -->
                  ${co1Name ? `
                    <div class="w-11 h-11 rounded-xl bg-white border-2 border-sky-500 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0" title="Co-Owner 1: ${co1Name}">
                      ${co1Photo ? `<img src="${co1Photo}" class="w-full h-full object-cover" />` : ''}
                    </div>
                  ` : ''}

                  <!-- CO-OWNER 2 PHOTO -->
                  ${co2Name ? `
                    <div class="w-11 h-11 rounded-xl bg-white border-2 border-purple-500 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0" title="Co-Owner 2: ${co2Name}">
                      ${co2Photo ? `<img src="${co2Photo}" class="w-full h-full object-cover" />` : ''}
                    </div>
                  ` : ''}
                </div>
                
                <div class="space-y-0.5 w-full text-center">
                  <h3 class="font-black text-slate-900 text-sm truncate leading-tight">${t.name}</h3>
                  <div class="text-[10px] text-amber-700 font-extrabold truncate">👑 Owner: ${t.ownerName} (${t.ownerPhone})</div>
                  ${co1Name ? `<div class="text-[9px] text-sky-700 font-bold truncate">🤝 Co-Owner 1: ${co1Name} (${co1Phone || 'N/A'})</div>` : ''}
                  ${co2Name ? `<div class="text-[9px] text-purple-700 font-bold truncate">🤝 Co-Owner 2: ${co2Name} (${co2Phone || 'N/A'})</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
    if (window.lucide) window.lucide.createIcons();
  };

  const modalHtml = `
    <div id="teams-view-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-lg w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 modal-content-container">
        <button id="close-teams-modal" class="absolute top-3 right-3 text-slate-400 hover:text-slate-800 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <span class="px-2 py-0.5 bg-sky-100 text-sky-800 text-[9px] font-black rounded border border-sky-300 uppercase">JSL 2026</span>
            <h2 class="text-base font-black text-slate-900 mt-0.5">Registered Team List (${allTeams.length})</h2>
          </div>

          <button id="download-teams-pdf-btn" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors">
            <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Download PDF List
          </button>
        </div>

        <div class="relative">
          <input type="text" id="team-search-input" placeholder="🔍 Search team by name, owner, or co-owners..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 pl-3 focus:outline-none focus:border-sky-500 placeholder-slate-400" />
        </div>

        <div id="teams-list-container" class="max-h-[60vh] overflow-y-auto pr-1"></div>

        <button id="close-teams-modal-bottom" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow">
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

  document.getElementById('download-teams-pdf-btn')?.addEventListener('click', () => {
    exportTeamsToPDF(filteredTeams);
  });

  const handleTeamSearch = () => {
    const inputEl = document.getElementById('team-search-input');
    if (!inputEl) return;
    const query = inputEl.value.toLowerCase().trim();
    if (!query) {
      filteredTeams = [...allTeams];
    } else {
      filteredTeams = allTeams.filter(t => {
        const name = (t.name || '').toLowerCase();
        const shortCode = (t.shortCode || '').toLowerCase();
        const ownerName = (t.ownerName || '').toLowerCase();
        const ownerPhone = (t.ownerPhone || '').toLowerCase();
        const co1Name = (t.coOwner1Name || t.coOwnerName || '').toLowerCase();
        const co1Phone = (t.coOwner1Phone || t.coOwnerPhone || '').toLowerCase();
        const co2Name = (t.coOwner2Name || '').toLowerCase();
        const co2Phone = (t.coOwner2Phone || '').toLowerCase();

        return name.includes(query) ||
               shortCode.includes(query) ||
               ownerName.includes(query) ||
               ownerPhone.includes(query) ||
               co1Name.includes(query) ||
               co1Phone.includes(query) ||
               co2Name.includes(query) ||
               co2Phone.includes(query);
      });
    }
    renderTeamListContent();
  };

  const teamInput = document.getElementById('team-search-input');
  if (teamInput) {
    ['input', 'keyup', 'change', 'paste'].forEach(evt => {
      teamInput.addEventListener(evt, handleTeamSearch);
    });
  }
}

// --- REGISTERED PLAYERS MODAL WITH MEDIUM SQUARE PHOTO CARDS ---
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
          <div class="text-xs font-bold text-slate-700">No matching players found</div>
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
      <div class="bg-white max-w-xl w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 modal-content-container">
        <button id="close-players-modal" class="absolute top-3 right-3 text-slate-400 hover:text-slate-800 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <span class="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded border border-amber-300 uppercase">JSL 2026</span>
            <h2 class="text-base font-black text-slate-900 mt-0.5">Registered Player List <span id="player-count-display">(${allPlayers.length})</span></h2>
          </div>

          <button id="download-players-pdf-btn" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors">
            <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Download PDF List
          </button>
        </div>

        <div class="relative">
          <input type="text" id="player-search-input" placeholder="🔍 Search player by name, Reg ID (JSL2026-0001), category, phone, village..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 pl-3 focus:outline-none focus:border-emerald-500 placeholder-slate-400" />
        </div>

        <div id="players-list-container" class="max-h-[60vh] overflow-y-auto pr-1"></div>

        <button id="close-players-modal-bottom" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow">
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

  document.getElementById('download-players-pdf-btn')?.addEventListener('click', () => {
    exportPlayersToPDF(filteredPlayers);
  });

  const handlePlayerSearch = () => {
    const inputEl = document.getElementById('player-search-input');
    if (!inputEl) return;
    const query = inputEl.value.toLowerCase().trim();
    if (!query) {
      filteredPlayers = [...allPlayers];
    } else {
      filteredPlayers = allPlayers.filter(p => {
        const name = (p.name || '').toLowerCase();
        const fatherName = (p.fatherName || '').toLowerCase();
        const regId = (p.registrationId || p.regNo || '').toLowerCase();
        const serialNo = String(p.displayRegistrationNumber || p.serialNo || '');
        const category = (p.category || p.role || p.playingType || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const altPhone = (p.alternateMobile || '').toLowerCase();
        const village = (p.village || '').toLowerCase();
        const district = (p.district || '').toLowerCase();
        const address = (p.address || '').toLowerCase();
        const batting = (p.battingStyle || '').toLowerCase();
        const bowling = (p.bowlingStyle || '').toLowerCase();
        const teamPref = (p.teamPreference || '').toLowerCase();
        const upiRef = (p.paymentRef || p.remarks || '').toLowerCase();

        return name.includes(query) ||
               fatherName.includes(query) ||
               regId.includes(query) ||
               serialNo.includes(query) ||
               category.includes(query) ||
               phone.includes(query) ||
               altPhone.includes(query) ||
               village.includes(query) ||
               district.includes(query) ||
               address.includes(query) ||
               batting.includes(query) ||
               bowling.includes(query) ||
               teamPref.includes(query) ||
               upiRef.includes(query);
      });
    }
    renderPlayerListContent();
  };

  const playerInput = document.getElementById('player-search-input');
  if (playerInput) {
    ['input', 'keyup', 'change', 'paste'].forEach(evt => {
      playerInput.addEventListener(evt, handlePlayerSearch);
    });
  }
}

// --- RENDER PLAYER CARDS (MEDIUM SQUARE PICTURE FORMAT WITH REGISTRATION NUMBER & LOWER NAME) ---
function renderPlayerCardsWithSerial(playersList) {
  return playersList.map((p, idx) => {
    const displayNo = p.displayRegistrationNumber || p.serialNo || (idx + 1);
    const regId = p.registrationId || `JSL2026-${String(displayNo).padStart(4, '0')}`;
    const isApproved = (p.registrationStatus || p.paymentStatus) === 'APPROVED';

    return `
      <div class="glass-card p-2.5 flex flex-col justify-between items-center text-center relative border border-emerald-200 bg-white hover:border-emerald-500 shadow-sm">
        
        <!-- Serial & Registration Number Badge -->
        <div class="w-full flex justify-between items-center mb-1.5">
          <span class="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-mono font-black text-[9px] rounded border border-slate-300 shadow-sm" title="Dynamic Continuous Number">
            ${regId}
          </span>

          <div class="flex items-center gap-0.5" title="${isApproved ? 'Approved' : 'Pending Approval'}">
            <span class="${isApproved ? 'status-circle-green' : 'status-circle-red'}"></span>
            <span class="text-[8px] font-bold ${isApproved ? 'text-emerald-600' : 'text-red-600'}">
              ${isApproved ? 'OK' : 'PEND'}
            </span>
          </div>
        </div>

        <!-- MEDIUM SQUARE FORMAT HD PHOTO WITH CRISP BORDER -->
        <div class="w-full max-w-[120px] aspect-square rounded-xl bg-white border-2 border-emerald-500 flex items-center justify-center overflow-hidden shadow-sm mb-1.5 mx-auto">
          <img src="${p.photoUrl || p.player_photo_url}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E';" />
        </div>

        <!-- LOWER NAME, CATEGORY & DISTRICT -->
        <div class="space-y-0.5 mb-2 w-full">
          <h3 class="font-black text-slate-900 text-xs truncate leading-tight">${p.name}</h3>
          <div class="text-[9px] font-extrabold text-emerald-700 truncate">
            ${p.category || p.playingType || 'All Rounder'}
          </div>
          <div class="text-[8px] font-semibold text-slate-500 truncate">
            📍 ${p.district || p.village || 'Paschim Medinipur'}
          </div>
        </div>

        <button data-profile-id="${p.id}" class="view-profile-modal-btn w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-extrabold rounded-lg shadow-sm flex items-center justify-center gap-1">
          <i data-lucide="user" class="w-3 h-3 text-amber-400"></i> View Profile
        </button>
      </div>
    `;
  }).join('');
}

// --- DETAILED PLAYER PROFILE MODAL WITH CLICKABLE FULL HD PHOTO ZOOM ---
function openFullPlayerProfileModal(player) {
  if (!player) return;
  const isApproved = (player.registrationStatus || player.paymentStatus) === 'APPROVED';

  const modalHtml = `
    <div id="player-profile-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-sm sm:max-w-md w-full p-4 text-center relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border-2 border-emerald-500 modal-content-container max-h-[90vh] overflow-y-auto">
        
        <button id="close-profile-btn" class="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-800 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <!-- LARGE SIZE HD PICTURE WITH CLICK TO ZOOM -->
        <div class="pt-1 text-center cursor-pointer group" id="profile-photo-zoom-trigger" title="Click to view Full HD photo">
          <div class="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-white border-2 border-emerald-500 shadow-xl mx-auto overflow-hidden flex items-center justify-center group-hover:scale-105 transition-all">
            <img src="${player.photoUrl || player.player_photo_url}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E';" />
          </div>
          <span class="text-[9px] font-extrabold text-emerald-700 block mt-1 hover:underline">🔍 Click picture to view Full HD Photo</span>
        </div>

        <!-- PLAYER NAME, REG ID & STATUS BADGE -->
        <div class="space-y-1">
          <span class="px-2.5 py-0.5 bg-slate-100 text-slate-800 font-mono font-black text-xs rounded border border-slate-300 shadow-sm">
            ${player.registrationId || player.regNo || 'JSL2026-0001'} (Serial #${player.displayRegistrationNumber || player.serialNo || 1})
          </span>
          <h2 class="text-lg sm:text-xl font-black text-slate-900 leading-tight mt-1">${player.name}</h2>
          <div class="inline-block px-3 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full border border-emerald-300">
            ${player.category || player.playingType || 'All Rounder'}
          </div>
        </div>

        <!-- DETAILED PROFILE INFORMATION GRID -->
        <div class="grid grid-cols-2 gap-2 text-left bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div class="space-y-0.5">
            <span class="text-[8px] text-slate-500 uppercase font-bold block">Father's Name</span>
            <span class="font-extrabold text-slate-900 truncate block">${player.fatherName || 'N/A'}</span>
          </div>

          <div class="space-y-0.5">
            <span class="text-[8px] text-slate-500 uppercase font-bold block">DOB / Age</span>
            <span class="font-extrabold text-slate-900 block">${player.dob || 'N/A'} (${player.age || 24} Yrs)</span>
          </div>

          <div class="space-y-0.5">
            <span class="text-[8px] text-slate-500 uppercase font-bold block">Mobile Phone</span>
            <span class="font-extrabold text-emerald-700 font-mono block">📞 ${player.phone || 'N/A'}</span>
          </div>

          <div class="space-y-0.5">
            <span class="text-[8px] text-slate-500 uppercase font-bold block">Alt Mobile</span>
            <span class="font-bold text-slate-700 font-mono block">${player.alternateMobile || 'N/A'}</span>
          </div>

          <div class="space-y-0.5">
            <span class="text-[8px] text-slate-500 uppercase font-bold block">Batting Style</span>
            <span class="font-extrabold text-sky-700 block">🏏 ${player.battingStyle || 'Right Hand Bat'}</span>
          </div>

          <div class="space-y-0.5">
            <span class="text-[8px] text-slate-500 uppercase font-bold block">Bowling Style</span>
            <span class="font-extrabold text-sky-700 block">⚡ ${player.bowlingStyle || 'Right Hand Medium'}</span>
          </div>

          <div class="col-span-2 space-y-0.5 border-t border-slate-200 pt-1.5">
            <span class="text-[8px] text-slate-500 uppercase font-bold block">Full Address</span>
            <span class="font-bold text-slate-800 block">📍 ${player.village || ''}, ${player.district || 'Paschim Medinipur'}, ${player.state || 'West Bengal'}</span>
          </div>

          <div class="col-span-2 flex items-center justify-between border-t border-slate-200 pt-1.5">
            <div>
              <span class="text-[8px] text-slate-500 uppercase font-bold block">Player Category</span>
              <span class="font-extrabold text-amber-700">${player.category || player.playingType || 'All-rounder'}</span>
            </div>
            <div>
              <span class="text-[8px] text-slate-500 uppercase font-bold block">Registration Status</span>
              <span class="font-black ${isApproved ? 'text-emerald-600' : 'text-red-600'}">${isApproved ? '🟢 APPROVED' : '🔴 PENDING'}</span>
            </div>
          </div>
        </div>

        <!-- PRINT DIGITAL PASS & CLOSE BUTTONS -->
        <div class="flex gap-2 pt-1">
          <button id="print-pass-btn" class="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1">
            <i data-lucide="ticket" class="w-3.5 h-3.5"></i> Download Player Pass
          </button>
          <button id="close-profile-bottom-btn" class="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow">
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
  
  // CLICKABLE PHOTO ZOOM EVENT LISTENER
  document.getElementById('profile-photo-zoom-trigger')?.addEventListener('click', () => {
    const imgSrc = player.photoUrl || player.player_photo_url || '';
    if (imgSrc) openHDPhotoZoomModal(imgSrc, `${player.name} - Full HD Player Photo`);
  });

  document.getElementById('print-pass-btn')?.addEventListener('click', () => {
    printDigitalPass(player, store.getLeagueById('leg-jsl'), store.getTeamById(player.teamId));
  });
}

// --- REGISTRATION TYPE SELECTION MODAL ---
function openRegistrationTypeModal() {
  const modalHtml = `
    <div id="reg-type-backdrop" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-sm sm:max-w-md w-full p-5 relative space-y-4 animate-fade-in rounded-2xl shadow-2xl border-2 border-emerald-500 text-center modal-content-container">
        <button id="close-reg-type-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-900 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="space-y-1">
          <span class="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-xs rounded-full uppercase border border-emerald-300">JHANKRA SUPER LEAGUE</span>
          <h2 class="text-lg sm:text-xl font-black text-slate-900 mt-1">Select Registration Option</h2>
          <p class="text-xs font-bold text-slate-500">Choose team or player registration to proceed</p>
        </div>

        <div class="grid grid-cols-1 gap-3 pt-1">
          <!-- TEAM REGISTER BUTTON -->
          <button id="select-team-reg-btn" class="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-700 hover:from-blue-500 hover:to-sky-600 text-white font-black flex items-center justify-between shadow-lg border border-sky-400 transition-all">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <i data-lucide="shield" class="w-5 h-5 text-amber-300"></i>
              </div>
              <div class="text-left">
                <div class="text-base sm:text-lg font-black leading-snug">Team Register</div>
                <div class="text-xs font-semibold text-sky-100">15K (8K Auction + 7K Fee)</div>
              </div>
            </div>
            <i data-lucide="chevron-right" class="w-5 h-5"></i>
          </button>

          <!-- PLAYER REGISTER BUTTON -->
          <button id="select-player-reg-btn" class="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black flex items-center justify-between shadow-lg border border-emerald-400 transition-all">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <i data-lucide="user-plus" class="w-5 h-5 text-white"></i>
              </div>
              <div class="text-left">
                <div class="text-base sm:text-lg font-black leading-snug">Player Register</div>
                <div class="text-xs font-semibold text-emerald-100">Entry Fee: ₹ 200 Rupees</div>
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

// --- TEAM REGISTER FORM MODAL (WITH CO-OWNER 1 & CO-OWNER 2 MARK OPTIONS) ---
function openTeamRegisterFormModal() {
  let ownerPhotoFileObj = null;
  let coOwner1PhotoFileObj = null;
  let coOwner2PhotoFileObj = null;
  let teamLogoFileObj = null;

  let ownerPhotoDataUrl = '';
  let coOwner1PhotoDataUrl = '';
  let coOwner2PhotoDataUrl = '';
  let teamLogoDataUrl = '';

  const modalHtml = `
    <div id="team-reg-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 overflow-y-auto">
      <div class="bg-white max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 modal-content-container max-h-[92vh] overflow-y-auto text-slate-900">
        <button id="close-team-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-800 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-sky-100 text-sky-800 text-[9px] font-black rounded border border-sky-300">TEAM REGISTER</span>
          <h2 class="text-base font-black text-slate-900 mt-0.5">Register New Franchise Team</h2>
        </div>

        <form id="team-registration-form" class="space-y-2.5">
          <!-- 1. Team Name -->
          <div>
            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Name of The Team *</label>
            <input type="text" id="team-name" required placeholder="Jhankra Strikers XI" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
          </div>

          <!-- 2. Owner Details (Required) -->
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
            <span class="text-[10px] font-black text-amber-700 uppercase tracking-wider block">👑 Main Owner Details</span>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Owner Name *</label>
                <input type="text" id="owner-name" required placeholder="Vikram Rathore" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Owner Phone *</label>
                <input type="tel" id="owner-phone" required placeholder="+91 9876543210" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-amber-500" />
              </div>
            </div>
            <div>
              <label class="block text-[9px] font-bold text-amber-700 uppercase mb-0.5">Owner HD Photo *</label>
              <input type="file" id="owner-photo-file" accept="image/*" required class="w-full bg-white border border-slate-300 text-slate-700 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-amber-500 file:text-slate-950" />
              <div id="owner-photo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
                <img id="owner-photo-preview-img" class="w-8 h-8 rounded object-cover" />
                <span class="text-[9px] text-emerald-600 font-bold">Owner Photo Selected!</span>
              </div>
            </div>
          </div>

          <!-- 3. Co-Owner 1 Option -->
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" id="enable-co-owner-1" class="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 bg-white" />
              <span class="text-[10px] font-black text-sky-700 uppercase">🤝 Mark Co-Owner 1 (Optional)</span>
            </label>

            <div id="co-owner-1-fields" class="hidden space-y-2 pt-1 border-t border-slate-200">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Co-Owner 1 Name</label>
                  <input type="text" id="co-owner-1-name" placeholder="Rohit Verma" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Co-Owner 1 Phone</label>
                  <input type="tel" id="co-owner-1-phone" placeholder="+91 9812345678" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-sky-500" />
                </div>
              </div>
              <div>
                <label class="block text-[8px] font-bold text-sky-700 uppercase mb-0.5">Co-Owner 1 HD Photo</label>
                <input type="file" id="co-owner-1-photo-file" accept="image/*" class="w-full bg-white border border-slate-300 text-slate-700 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-sky-600 file:text-white" />
                <div id="co-owner-1-photo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
                  <img id="co-owner-1-photo-preview-img" class="w-8 h-8 rounded object-cover" />
                  <span class="text-[9px] text-emerald-600 font-bold">Co-Owner 1 Photo Selected!</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Co-Owner 2 Option -->
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" id="enable-co-owner-2" class="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 bg-white" />
              <span class="text-[10px] font-black text-purple-700 uppercase">🤝 Mark Co-Owner 2 (Optional)</span>
            </label>

            <div id="co-owner-2-fields" class="hidden space-y-2 pt-1 border-t border-slate-200">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Co-Owner 2 Name</label>
                  <input type="text" id="co-owner-2-name" placeholder="Aman Gupta" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Co-Owner 2 Phone</label>
                  <input type="tel" id="co-owner-2-phone" placeholder="+91 9765432109" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label class="block text-[8px] font-bold text-purple-700 uppercase mb-0.5">Co-Owner 2 HD Photo</label>
                <input type="file" id="co-owner-2-photo-file" accept="image/*" class="w-full bg-white border border-slate-300 text-slate-700 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-purple-600 file:text-white" />
                <div id="co-owner-2-photo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
                  <img id="co-owner-2-photo-preview-img" class="w-8 h-8 rounded object-cover" />
                  <span class="text-[9px] text-emerald-600 font-bold">Co-Owner 2 Photo Selected!</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 5. Team Logo -->
          <div>
            <label class="block text-[9px] font-bold text-sky-700 uppercase mb-0.5">Upload Team Logo (Optional)</label>
            <input type="file" id="team-logo-file" accept="image/*" class="w-full bg-slate-50 border border-slate-300 text-slate-700 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-sky-600 file:text-white" />
            <div id="team-logo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
              <img id="team-logo-preview-img" class="w-8 h-8 rounded object-cover" />
              <span class="text-[9px] text-emerald-600 font-bold">Team Logo Selected!</span>
            </div>
          </div>

          <button type="submit" id="submit-team-reg-btn" class="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-extrabold text-xs rounded-xl shadow-md border border-sky-400 transition-all">
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

  // CO-OWNER TOGGLES
  document.getElementById('enable-co-owner-1')?.addEventListener('change', (e) => {
    const fields = document.getElementById('co-owner-1-fields');
    if (e.target.checked) fields?.classList.remove('hidden');
    else fields?.classList.add('hidden');
  });

  document.getElementById('enable-co-owner-2')?.addEventListener('change', (e) => {
    const fields = document.getElementById('co-owner-2-fields');
    if (e.target.checked) fields?.classList.remove('hidden');
    else fields?.classList.add('hidden');
  });

  // FILE UPLOAD LISTENERS (Client-Side HD Compression ~150 KB - 280 KB per image)
  document.getElementById('owner-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      ownerPhotoFileObj = file;
      ownerPhotoDataUrl = await compressImage(file, 1050, 1050, 0.82);
      document.getElementById('owner-photo-preview-img').src = ownerPhotoDataUrl;
      document.getElementById('owner-photo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('co-owner-1-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      coOwner1PhotoFileObj = file;
      coOwner1PhotoDataUrl = await compressImage(file, 1050, 1050, 0.82);
      document.getElementById('co-owner-1-photo-preview-img').src = coOwner1PhotoDataUrl;
      document.getElementById('co-owner-1-photo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('co-owner-2-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      coOwner2PhotoFileObj = file;
      coOwner2PhotoDataUrl = await compressImage(file, 1050, 1050, 0.82);
      document.getElementById('co-owner-2-photo-preview-img').src = coOwner2PhotoDataUrl;
      document.getElementById('co-owner-2-photo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('team-logo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      teamLogoFileObj = file;
      teamLogoDataUrl = await compressImage(file, 1050, 1050, 0.82);
      document.getElementById('team-logo-preview-img').src = teamLogoDataUrl;
      document.getElementById('team-logo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('team-registration-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-team-reg-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <div class="flex items-center justify-center gap-2">
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Please Wait... Submitting Team Registration...</span>
        </div>
      `;
    }

    try {
      const name = document.getElementById('team-name').value;
      const ownerName = document.getElementById('owner-name').value;
      const ownerPhone = document.getElementById('owner-phone').value;

      const hasCoOwner1 = document.getElementById('enable-co-owner-1').checked;
      const coOwner1Name = hasCoOwner1 ? (document.getElementById('co-owner-1-name').value || '') : '';
      const coOwner1Phone = hasCoOwner1 ? (document.getElementById('co-owner-1-phone').value || '') : '';

      const hasCoOwner2 = document.getElementById('enable-co-owner-2').checked;
      const coOwner2Name = hasCoOwner2 ? (document.getElementById('co-owner-2-name').value || '') : '';
      const coOwner2Phone = hasCoOwner2 ? (document.getElementById('co-owner-2-phone').value || '') : '';

      // Parallel concurrent Cloudinary HD upload with 10s safety timeout
      const uploadWithTimeout = async (fileObj, folder, fallbackDataUrl) => {
        if (!fileObj) return fallbackDataUrl;
        try {
          const timeoutPromise = new Promise(res => setTimeout(() => res(null), 10000));
          const result = await Promise.race([
            uploadHDImage(fileObj, folder),
            timeoutPromise
          ]);
          return result || fallbackDataUrl;
        } catch (e) {
          return fallbackDataUrl;
        }
      };

      const [finalOwnerPhotoUrl, finalCoOwner1PhotoUrl, finalCoOwner2PhotoUrl, finalLogoUrl] = await Promise.all([
        uploadWithTimeout(ownerPhotoFileObj, 'owner_photos', ownerPhotoDataUrl),
        uploadWithTimeout(hasCoOwner1 ? coOwner1PhotoFileObj : null, 'co_owner_photos', coOwner1PhotoDataUrl),
        uploadWithTimeout(hasCoOwner2 ? coOwner2PhotoFileObj : null, 'co_owner_photos', coOwner2PhotoDataUrl),
        uploadWithTimeout(teamLogoFileObj, 'team_logos', teamLogoDataUrl)
      ]);

      const newTeam = store.registerTeam({
        leagueId: 'leg-jsl',
        name,
        shortCode: name.substring(0, 3).toUpperCase(),
        ownerName,
        ownerPhone,
        ownerPhotoUrl: finalOwnerPhotoUrl || '',
        ownerPhoto: finalOwnerPhotoUrl || '',
        captainName: ownerName,

        coOwner1Name,
        coOwner1Phone,
        coOwner1PhotoUrl: finalCoOwner1PhotoUrl || '',

        coOwner2Name,
        coOwner2Phone,
        coOwner2PhotoUrl: finalCoOwner2PhotoUrl || '',

        // Fallback backward compatibility
        coOwnerName: coOwner1Name,
        coOwnerPhone: coOwner1Phone,

        logoUrl: finalLogoUrl || ''
      });

      removeModal();
      openRegistrationSuccessModal({
        name: newTeam.name,
        registrationId: `TEAM-${newTeam.serialNo}`,
        displayRegistrationNumber: newTeam.serialNo,
        isTeam: true
      });
    } catch (err) {
      console.error("Team Registration Error:", err);
      alert("Registration Error: " + err.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Team Registration";
      }
    }
  });
}

// --- FULL PROFESSIONAL PLAYER REGISTER FORM MODAL ---
function openPlayerRegisterFormModal() {
  const upiId = "pintusantra4166@nyes";
  const payeeName = "Pintu Santra";
  const amount = 200;
  const note = "JSL2026PlayerReg";

  const phonepeUrl = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${note}`;
  const gpayUrl = `tez://upi/pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${note}`;
  const genericUpiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${note}`;

  const modalHtml = `
    <div id="player-reg-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 overflow-y-auto">
      <div class="bg-white max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 modal-content-container max-h-[92vh] overflow-y-auto text-slate-900">
        <button id="close-player-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-800 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded border border-emerald-300 uppercase">PLAYER REGISTER</span>
          <h2 class="text-base font-black text-slate-900 mt-0.5">Player Registration Form</h2>
        </div>

        <form id="player-registration-form" class="space-y-2.5">
          <!-- 1. Player Name & Father Name -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Player Name *</label>
              <input type="text" id="ply-name" required placeholder="Rahul Sharma" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Father's Name *</label>
              <input type="text" id="ply-father-name" required placeholder="Suresh Sharma" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <!-- 2. Date of Birth & Auto-Calculated Age -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Date of Birth (Select Calendar 📅) *</label>
              <div class="relative flex items-center">
                <input type="date" id="ply-dob" required class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 pr-8 focus:outline-none focus:border-emerald-500 cursor-pointer" />
              </div>
            </div>
            <div>
              <label class="block text-[9px] font-bold text-emerald-700 uppercase mb-0.5">Age (Auto-Fetched)</label>
              <input type="number" id="ply-age" required readonly placeholder="Auto-Calculated" class="w-full bg-slate-100 border border-slate-300 text-emerald-800 font-extrabold text-xs rounded-lg p-2 cursor-not-allowed" />
            </div>
          </div>

          <!-- 3. Mobile Number & Alternate Mobile -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Mobile Number *</label>
              <input type="tel" id="ply-phone" required placeholder="+91 9876543210" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Alternate Mobile</label>
              <input type="tel" id="ply-alt-mobile" placeholder="+91 9812345678" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <!-- 4. Village, District, State -->
          <div class="grid grid-cols-3 gap-1.5">
            <div>
              <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Village *</label>
              <input type="text" id="ply-village" required placeholder="Jhankra" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">District *</label>
              <input type="text" id="ply-district" required value="Paschim Medinipur" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">State</label>
              <input type="text" id="ply-state" value="West Bengal" readonly class="w-full bg-slate-100 border border-slate-300 text-slate-600 text-xs rounded-lg p-1.5" />
            </div>
          </div>

          <!-- 5. Player Category, Batting & Bowling Style -->
          <div class="grid grid-cols-3 gap-1.5">
            <div>
              <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Player Category *</label>
              <select id="ply-category" required class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-emerald-500">
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-rounder" selected>All-rounder</option>
                <option value="Wicket Keeper">Wicket Keeper</option>
              </select>
            </div>
            <div>
              <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Batting Style *</label>
              <select id="ply-batting-style" required class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-emerald-500">
                <option value="Right Hand Bat">Right Hand Bat</option>
                <option value="Left Hand Bat">Left Hand Bat</option>
              </select>
            </div>
            <div>
              <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Bowling Style</label>
              <select id="ply-bowling-style" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-emerald-500">
                <option value="Right Hand Fast">Right Hand Fast</option>
                <option value="Right Hand Spin">Right Hand Spin</option>
                <option value="Left Hand Fast">Left Hand Fast</option>
                <option value="Left Hand Spin">Left Hand Spin</option>
                <option value="None">None</option>
              </select>
            </div>
          </div>

          <!-- 6. Team Preference -->
          <div>
            <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Team Preference (Optional)</label>
            <input type="text" id="ply-team-pref" placeholder="Preferred Franchise Team Name (Optional)" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none focus:border-emerald-500" />
          </div>

          <!-- 7. HD Player Photo (Full HD Crisp Quality Upload) -->
          <div>
            <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Player Photo (FULL HD Crisp Quality) *</label>
            <input type="file" id="ply-photo-file" accept="image/*" required class="w-full bg-slate-50 border border-slate-300 text-slate-700 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-emerald-600 file:text-white" />
            <div id="ply-photo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
              <img id="ply-photo-preview-img" class="w-8 h-8 rounded object-cover" />
              <span class="text-[9px] text-emerald-600 font-bold">Full HD Photo Selected!</span>
            </div>
          </div>

          <!-- 8. Aadhaar Card Front -->
          <div>
            <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Aadhaar Card Front / Proof (Full HD) *</label>
            <input type="file" id="ply-aadhar-file" accept="image/*" required class="w-full bg-slate-50 border border-slate-300 text-slate-700 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-sky-600 file:text-white" />
            <div id="ply-aadhar-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
              <img id="ply-aadhar-preview-img" class="w-10 h-7 rounded object-cover" />
              <span class="text-[9px] text-emerald-600 font-bold">Aadhaar Document Selected!</span>
            </div>
          </div>

          <!-- 9. Entry Fee Payment & Receipt Upload -->
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2 shadow-sm">
            <div class="flex justify-between items-center border-b border-slate-200 pb-1.5">
              <div>
                <span class="font-extrabold text-slate-900 text-xs block">Entry Fee Payment</span>
              </div>
              <span class="text-lg font-black text-emerald-600">₹ 200</span>
            </div>

            <div class="bg-white p-2 rounded-xl border border-slate-200 text-center flex flex-col items-center space-y-1">
              <div class="text-[9px] font-black text-slate-700 uppercase">Scan QR Code Below</div>
              
              <div class="overflow-hidden rounded-lg border border-slate-300 p-1 bg-white inline-block">
                <img src="assets/navi_qr_code.jpg" alt="Pintu Santra Navi UPI QR Code" class="w-32 h-auto mx-auto object-contain rounded" />
              </div>

              <div class="font-mono font-bold text-[9px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 inline-block">
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
                <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Upload Payment Receipt Screenshot (Full HD) *</label>
                <input type="file" id="ply-proof-file" accept="image/*" required class="w-full bg-white border border-slate-300 text-slate-700 text-[9px] rounded p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[8px] file:font-bold file:bg-emerald-600 file:text-white" />
                <div id="ply-proof-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
                  <img id="ply-proof-preview-img" class="w-10 h-7 rounded object-cover" />
                  <span class="text-[9px] text-emerald-600 font-bold">Receipt Screenshot Selected!</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 10. Remarks & Terms Checkbox -->
          <div>
            <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Additional Remarks</label>
            <input type="text" id="ply-remarks" placeholder="Any additional notes or instructions..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none" />
          </div>

          <div class="pt-1">
            <label class="flex items-start gap-2 text-[10px] text-slate-700 cursor-pointer">
              <input type="checkbox" id="ply-terms" required class="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 bg-white" />
              <span>I hereby confirm all information provided is accurate and I agree to all League Terms & Conditions. *</span>
            </label>
          </div>

          <button type="submit" id="submit-player-reg-btn" class="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-600 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-md border border-emerald-400 transition-all">
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

  // AUTOMATIC AGE CALCULATION FROM DATE OF BIRTH
  const updateAgeFromDOB = () => {
    const dobVal = document.getElementById('ply-dob')?.value;
    if (dobVal) {
      const birthDate = new Date(dobVal);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge > 0) {
        document.getElementById('ply-age').value = calculatedAge;
      }
    }
  };

  document.getElementById('ply-dob')?.addEventListener('change', updateAgeFromDOB);
  document.getElementById('ply-dob')?.addEventListener('input', updateAgeFromDOB);

  let plyPhotoFileObj = null;
  let plyAadharFileObj = null;
  let plyProofFileObj = null;

  let plyPhotoDataUrl = '';
  let plyAadharDataUrl = '';
  let plyProofDataUrl = '';

  document.getElementById('ply-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      plyPhotoFileObj = file;
      plyPhotoDataUrl = await compressImage(file, 1050, 1050, 0.82);
      document.getElementById('ply-photo-preview-img').src = plyPhotoDataUrl;
      document.getElementById('ply-photo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('ply-aadhar-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      plyAadharFileObj = file;
      plyAadharDataUrl = await compressImage(file, 1050, 1050, 0.82);
      document.getElementById('ply-aadhar-preview-img').src = plyAadharDataUrl;
      document.getElementById('ply-aadhar-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('ply-proof-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      plyProofFileObj = file;
      plyProofDataUrl = await compressImage(file, 1050, 1050, 0.82);
      document.getElementById('ply-proof-preview-img').src = plyProofDataUrl;
      document.getElementById('ply-proof-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('player-registration-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-player-reg-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <div class="flex items-center justify-center gap-2">
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Please Wait... Submitting Your Registration...</span>
        </div>
      `;
    }

    try {
      const name = document.getElementById('ply-name').value;
      const fatherName = document.getElementById('ply-father-name').value;
      const dob = document.getElementById('ply-dob').value;
      const age = parseInt(document.getElementById('ply-age').value, 10) || 22;
      const phone = document.getElementById('ply-phone').value;
      const alternateMobile = document.getElementById('ply-alt-mobile').value || '';
      const village = document.getElementById('ply-village').value;
      const district = document.getElementById('ply-district').value;
      const state = document.getElementById('ply-state').value || 'West Bengal';
      const category = document.getElementById('ply-category').value;
      const battingStyle = document.getElementById('ply-batting-style').value;
      const bowlingStyle = document.getElementById('ply-bowling-style').value;
      const isWicketKeeper = (category === 'Wicket Keeper');
      const teamPreference = document.getElementById('ply-team-pref').value || 'Any Team';
      const upiRef = document.getElementById('ply-upi-ref').value;
      const remarks = document.getElementById('ply-remarks').value || upiRef;

      // Parallel concurrent Cloudinary HD upload with 10s safety timeout
      const uploadWithTimeout = async (fileObj, folder, fallbackDataUrl) => {
        if (!fileObj) return fallbackDataUrl;
        try {
          const timeoutPromise = new Promise(res => setTimeout(() => res(null), 10000));
          const result = await Promise.race([
            uploadHDImage(fileObj, folder),
            timeoutPromise
          ]);
          return result || fallbackDataUrl;
        } catch (e) {
          return fallbackDataUrl;
        }
      };

      const [finalPhotoUrl, finalAadharUrl, finalProofUrl] = await Promise.all([
        uploadWithTimeout(plyPhotoFileObj, 'player_photos', plyPhotoDataUrl),
        uploadWithTimeout(plyAadharFileObj, 'aadhaar_docs', plyAadharDataUrl),
        uploadWithTimeout(plyProofFileObj, 'payment_receipts', plyProofDataUrl)
      ]);

      const newPlayer = await store.registerPlayer({
        name,
        fatherName,
        dob,
        age,
        phone,
        alternateMobile,
        village,
        district,
        state,
        address: `${village}, ${district}`,
        category,
        role: category,
        playingType: category,
        battingStyle,
        bowlingStyle,
        isWicketKeeper,
        teamPreference,
        photoUrl: finalPhotoUrl || '',
        player_photo_url: finalPhotoUrl || '',
        aadharPhotoUrl: finalAadharUrl || '',
        aadhaar_photo_url: finalAadharUrl || '',
        paymentReceiptUrl: finalProofUrl || '',
        payment_receipt_url: finalProofUrl || '',
        paymentRef: upiRef,
        remarks,
        basePrice: 200
      });

      store.setUserRole('PLAYER', newPlayer.name, newPlayer);
      removeModal();
      openRegistrationSuccessModal({
        name: newPlayer.name,
        registrationId: newPlayer.registrationId || newPlayer.regNo,
        displayRegistrationNumber: newPlayer.displayRegistrationNumber || newPlayer.serialNo,
        isTeam: false
      });
    } catch (err) {
      console.error("Player Registration Error:", err);
      alert("Registration Error: " + err.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Player Registration";
      }
    }
  });
}
