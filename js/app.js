// Core Application Router & Registration Portal (Developer: Suman Kolay - Cambria & Deep Blue Theme)

import { store } from './store.js';
import { exportPlayersToCSV, exportTeamsToCSV, exportPlayersToPDF, exportTeamsToPDF, printDigitalPass, openUserGuidePDF } from './export.js';
import { renderAdminDashboard } from './admin.js';
import { uploadHDImage, fetchAdSettingsFromFirebase, fetchPopupSettingsFromFirebase } from './supabase.js';
import { shops } from './shopsData.js';

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/EDLr1a3qfww42HSmjKaBEL";

// PWA Deferred Prompt Capture
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("PWA install prompt captured.");
});

// ALWAYS default to landing page (No category opens automatically!)
let currentRoute = 'landing'; // landing, jsl-hub, admin, shop-detail
let selectedShopId = '';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  renderNavbar();
  renderMobileBottomNav();
  renderCurrentView();

  // First Visit Welcome & App Install Popup Prompt
  checkAndPromptFirstVisitPopup();

  // Dynamic Partner Advertisement Popup
  setTimeout(() => {
    checkAndShowAdvertisementPopup();
  }, 1000);

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

async function checkAndPromptFirstVisitPopup() {
  try {
    const settings = await fetchPopupSettingsFromFirebase();
    if (!settings || !settings.isWelcomePopupEnabled) {
      console.log("Welcome popup is disabled by admin.");
      return;
    }
    if (!sessionStorage.getItem('cpl_first_visit_popup_shown_v2')) {
      sessionStorage.setItem('cpl_first_visit_popup_shown_v2', 'true');
      setTimeout(() => {
        openFirstVisitWelcomeModal();
      }, 600);
    }
  } catch (err) {
    console.warn("Failed to check first visit popup status:", err);
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
export function compressImage(file, maxWidth = 1050, maxHeight = 1050, quality = 0.82) {
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

// --- INTERACTIVE SQUARE SHAPE (1:1) IMAGE CROPPER MODAL WITH CAMERA & FILE SUPPORT ---
export function openSquareImageCropModal(imageSrc, onCropComplete, title = "Crop Player Photo (Square Shape 1:1)") {
  document.getElementById('square-cropper-modal')?.remove();

  const modalHtml = `
    <div id="square-cropper-modal" class="fixed inset-0 z-[70] modal-overlay flex items-center justify-center p-3 bg-slate-950/95 backdrop-blur-md">
      <div class="bg-slate-900 border-2 border-amber-500/80 max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl text-white modal-content-container">
        
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <div class="flex items-center gap-2">
            <span class="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40">
              <i data-lucide="crop" class="w-4 h-4"></i>
            </span>
            <div>
              <h3 class="text-sm sm:text-base font-black text-white">${title}</h3>
              <p class="text-[10px] text-amber-300 font-semibold">Adjust & Crop image into a perfect 1:1 Square</p>
            </div>
          </div>
          <button id="close-cropper-modal-btn" type="button" class="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800 border border-slate-700">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- CROP CONTAINER -->
        <div class="relative w-full max-h-[60vh] h-72 sm:h-80 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 p-1">
          <img id="cropper-target-img" src="${imageSrc}" class="max-w-full max-h-full object-contain block mx-auto" />
        </div>

        <!-- CROP CONTROLS TOOLBAR -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div class="flex items-center gap-1.5">
            <button type="button" id="cropper-zoom-in" title="Zoom In" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1">
              <i data-lucide="zoom-in" class="w-3.5 h-3.5"></i>
            </button>
            <button type="button" id="cropper-zoom-out" title="Zoom Out" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1">
              <i data-lucide="zoom-out" class="w-3.5 h-3.5"></i>
            </button>
            <button type="button" id="cropper-rotate-left" title="Rotate" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1">
              <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
            </button>
            <button type="button" id="cropper-reset" title="Reset Crop Box" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" id="cropper-cancel-btn" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700">
              Cancel
            </button>
            <button type="button" id="cropper-apply-btn" class="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg border border-emerald-400 flex items-center gap-1.5">
              <i data-lucide="check" class="w-4 h-4"></i> Crop Square Photo
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const imgEl = document.getElementById('cropper-target-img');
  let cropperInstance = null;

  const initCropper = () => {
    if (window.Cropper) {
      cropperInstance = new window.Cropper(imgEl, {
        aspectRatio: 1, // STRICT SQUARE ASPECT RATIO 1:1
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.9,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
      });
    }
  };

  if (imgEl.complete) {
    setTimeout(initCropper, 100);
  } else {
    imgEl.onload = () => setTimeout(initCropper, 100);
  }

  // EVENT BUTTON CONTROLS
  document.getElementById('cropper-zoom-in')?.addEventListener('click', () => cropperInstance?.zoom(0.1));
  document.getElementById('cropper-zoom-out')?.addEventListener('click', () => cropperInstance?.zoom(-0.1));
  document.getElementById('cropper-rotate-left')?.addEventListener('click', () => cropperInstance?.rotate(-90));
  document.getElementById('cropper-reset')?.addEventListener('click', () => cropperInstance?.reset());

  const removeCropperModal = () => {
    cropperInstance?.destroy();
    document.getElementById('square-cropper-modal')?.remove();
  };

  document.getElementById('close-cropper-modal-btn')?.addEventListener('click', removeCropperModal);
  document.getElementById('cropper-cancel-btn')?.addEventListener('click', removeCropperModal);

  document.getElementById('cropper-apply-btn')?.addEventListener('click', () => {
    if (cropperInstance) {
      const croppedCanvas = cropperInstance.getCroppedCanvas({
        width: 600,
        height: 600,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
      if (croppedCanvas) {
        const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.88);
        onCropComplete(croppedDataUrl);
      } else {
        onCropComplete(imageSrc);
      }
    } else {
      onCropComplete(imageSrc);
    }
    removeCropperModal();
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

      <!-- Navigation links (Desktop only) -->
      <div class="hidden md:flex items-center gap-5 text-xs font-black text-slate-200">
        <button id="nav-fixtures-btn" class="hover:text-amber-400 transition-colors py-1 ${currentRoute === 'fixtures' ? 'text-amber-400 border-b-2 border-amber-500' : ''}">Match Center</button>
        <button id="nav-auction-btn" class="hover:text-amber-400 transition-colors py-1 ${currentRoute === 'auction' ? 'text-amber-400 border-b-2 border-amber-500' : ''}">Live Auction</button>
        <button id="nav-career-btn" class="hover:text-amber-400 transition-colors py-1 ${currentRoute === 'career' ? 'text-amber-400 border-b-2 border-amber-500' : ''}">Career Hub</button>
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
  document.getElementById('nav-fixtures-btn')?.addEventListener('click', () => navigate('fixtures'));
  document.getElementById('nav-auction-btn')?.addEventListener('click', () => navigate('auction'));
  document.getElementById('nav-career-btn')?.addEventListener('click', () => navigate('career'));
  if (window.lucide) window.lucide.createIcons();
}

// --- MOBILE STICKY BOTTOM BAR ---
function renderMobileBottomNav() {
  const bottomNavEl = document.getElementById('mobile-bottom-nav');
  if (!bottomNavEl) return;

  bottomNavEl.className = "fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 py-2 sm:hidden shadow-lg flex items-center justify-around";

  bottomNavEl.innerHTML = `
    <button id="mob-nav-home" class="flex flex-col items-center gap-0.5 ${currentRoute === 'landing' ? 'text-emerald-650 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="trophy" class="w-4 h-4"></i>
      <span class="text-[9px]">Home</span>
    </button>

    <button id="mob-nav-fixtures" class="flex flex-col items-center gap-0.5 ${currentRoute === 'fixtures' ? 'text-emerald-655 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="calendar" class="w-4 h-4"></i>
      <span class="text-[9px]">Matches</span>
    </button>

    <button id="mob-nav-auction" class="flex flex-col items-center gap-0.5 ${currentRoute === 'auction' ? 'text-emerald-655 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="gavel" class="w-4 h-4"></i>
      <span class="text-[9px]">Auction</span>
    </button>

    <button id="mob-nav-career" class="flex flex-col items-center gap-0.5 ${currentRoute === 'career' ? 'text-emerald-655 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="users" class="w-4 h-4"></i>
      <span class="text-[9px]">Career</span>
    </button>

    <button id="mob-nav-admin" class="flex flex-col items-center gap-0.5 ${currentRoute === 'admin' ? 'text-emerald-655 font-extrabold' : 'text-slate-500'}">
      <i data-lucide="shield-check" class="w-4 h-4"></i>
      <span class="text-[9px]">Admin</span>
    </button>
  `;

  document.getElementById('mob-nav-home')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('mob-nav-fixtures')?.addEventListener('click', () => navigate('fixtures'));
  document.getElementById('mob-nav-auction')?.addEventListener('click', () => navigate('auction'));
  document.getElementById('mob-nav-career')?.addEventListener('click', () => navigate('career'));
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
    case 'fixtures':
      renderFixturesView(container);
      break;
    case 'auction':
      renderLiveAuctionView(container);
      break;
    case 'career':
      renderCareerHubView(container);
      break;
    case 'shop-detail':
      renderShopDetailsView(container);
      break;
    default:
      renderFirstPageLanding(container);
  }

  if (window.lucide) window.lucide.createIcons();
}

// --- WHATSAPP GROUP POPUP PROMPT ---
async function checkAndPromptWhatsAppGroup() {
  try {
    const settings = await fetchPopupSettingsFromFirebase();
    if (!settings || !settings.isWhatsAppPopupEnabled) {
      console.log("WhatsApp group popup is disabled by admin.");
      return;
    }
    if (!sessionStorage.getItem('jsl_wa_group_prompted')) {
      sessionStorage.setItem('jsl_wa_group_prompted', 'true');
      setTimeout(() => {
        openWhatsAppGroupModal();
      }, 400);
    }
  } catch (err) {
    console.warn("Failed to check WhatsApp popup settings:", err);
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

// --- FRONT PAGE LANDING PAGE (MATCHING UPLOADED REFERENCE DESIGN WITH STYLISH CARTOON CRICKETER AVATARS & RANK CORNERS) ---
function renderFirstPageLanding(containerEl) {
  const teams = store.getTeams();
  const players = store.getPlayers();

  containerEl.innerHTML = `
    <div class="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fade-in py-2 sm:py-6 text-slate-900">
      
      <!-- HERO WELCOME BANNER & MOTIVATIONAL QUOTE -->
      <div class="w-full max-w-3xl text-center space-y-3 mx-auto px-3">
        <div class="inline-block px-4 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-600 text-white font-black text-xs sm:text-sm rounded-full shadow-md uppercase tracking-wider border border-emerald-400">
          ✨ OFFICIAL CRICKET LEAGUE & REGISTRATION PORTAL ✨
        </div>

        <!-- 2-LINE HANDWRITTEN MOTIVATIONAL QUOTE -->
        <div class="handwritten-quote font-black text-slate-900 leading-tight space-y-1 mx-auto max-w-2xl">
          <span class="animate-type-line-1 text-lg sm:text-2xl font-black text-slate-900">"Champions aren't made in gymnasiums. Champions are made from a desire, a dream, & a vision.</span>
          <span class="animate-type-line-2 text-lg sm:text-2xl font-black text-emerald-700">Play with Passion, Rise with Glory!"</span>
        </div>

        <p class="text-xs sm:text-sm font-black red-read-slogan mt-1">
          🏏 Step onto the pitch and claim your victory!
        </p>
      </div>

      <!-- SELECT PREMIER LEAGUE BADGE -->
      <div class="text-center">
        <span class="px-5 py-1.5 rounded-full bg-white text-emerald-800 border-2 border-emerald-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-sm">
          Select Premier League Category
        </span>
      </div>

      <!-- 3 CATEGORY CARDS - ALL 3 CARDS FIT IN A SINGLE HORIZONTAL ROW ON MOBILE -->
      <div class="grid grid-cols-3 gap-1.5 sm:gap-6 w-full max-w-5xl mx-auto px-1 sm:px-2">
        
        <!-- CARD 1: JSL (GOLD THEME - CARTOON BOY) -->
        <div id="btn-click-jsl" class="group relative rounded-xl sm:rounded-3xl overflow-hidden shadow-md sm:shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer border sm:border-2 border-amber-300/80 bg-white flex flex-col justify-between p-1.5 sm:p-3.5 space-y-1 sm:space-y-3 text-center">
          <img src="assets/card_jsl_cartoon.png" alt="JSL Cartoon Boy Card" class="w-full h-auto object-contain rounded-lg sm:rounded-2xl group-hover:scale-[1.02] transition-transform duration-300 shadow-sm" />
          
          <div class="space-y-0.5 sm:space-y-1.5 w-full text-center">
            <h3 class="text-[9px] min-[380px]:text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">Jhankra Super League (JSL)</h3>
            <div class="flex items-center justify-center gap-1.5 text-[8px] min-[380px]:text-[9px] sm:text-xs font-black text-emerald-800 uppercase tracking-wider bg-emerald-50 py-0.5 px-2 sm:px-2.5 rounded-full border border-emerald-200 w-fit mx-auto">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE</span>
            </div>
          </div>

          <button class="w-full py-1 sm:py-2.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-[8px] min-[380px]:text-[9px] sm:text-sm rounded-full shadow-md border border-amber-300 flex items-center justify-center gap-1 btn-blink-always uppercase tracking-wider">
            View Full Details
          </button>
        </div>

        <!-- CARD 2: JPL (GREEN THEME - CARTOON BOY) -->
        <div id="btn-click-jpl" class="group relative rounded-xl sm:rounded-3xl overflow-hidden shadow-md sm:shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer border sm:border-2 border-emerald-300/80 bg-white flex flex-col justify-between p-1.5 sm:p-3.5 space-y-1 sm:space-y-3 text-center">
          <img src="assets/card_jpl_cartoon.png" alt="JPL Cartoon Boy Card" class="w-full h-auto object-contain rounded-lg sm:rounded-2xl group-hover:scale-[1.02] transition-transform duration-300 shadow-sm" />
          
          <div class="space-y-0.5 sm:space-y-1.5 w-full text-center">
            <h3 class="text-[9px] min-[380px]:text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">Jhankra Premier League (JPL)</h3>
            <div class="flex items-center justify-center gap-0.5 sm:gap-1.5 text-[7px] min-[380px]:text-[8px] sm:text-xs font-black text-red-600 uppercase tracking-wider bg-red-50 py-0.5 px-1 sm:px-2.5 rounded-full border border-red-200 w-fit mx-auto">
              <i data-lucide="clock" class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-red-500"></i>
              <span class="animate-pulse">COMING SOON</span>
            </div>
          </div>

          <button class="w-full py-1 sm:py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-[8px] min-[380px]:text-[9px] sm:text-sm rounded-full shadow-md border border-emerald-400 flex items-center justify-center gap-1 uppercase tracking-wider">
            View More Details
          </button>
        </div>

        <!-- CARD 3: KPL (BLUE THEME - CARTOON BOY) -->
        <div id="btn-click-kpl" class="group relative rounded-xl sm:rounded-3xl overflow-hidden shadow-md sm:shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer border sm:border-2 border-blue-300/80 bg-white flex flex-col justify-between p-1.5 sm:p-3.5 space-y-1 sm:space-y-3 text-center">
          <img src="assets/card_kpl_cartoon.png" alt="KPL Cartoon Boy Card" class="w-full h-auto object-contain rounded-lg sm:rounded-2xl group-hover:scale-[1.02] transition-transform duration-300 shadow-sm" />
          
          <div class="space-y-0.5 sm:space-y-1.5 w-full text-center">
            <h3 class="text-[9px] min-[380px]:text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">Kota Premier League (KPL)</h3>
            <div class="flex items-center justify-center gap-0.5 sm:gap-1.5 text-[7px] min-[380px]:text-[8px] sm:text-xs font-black text-red-600 uppercase tracking-wider bg-red-50 py-0.5 px-1 sm:px-2.5 rounded-full border border-red-200 w-fit mx-auto">
              <i data-lucide="clock" class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-red-500"></i>
              <span class="animate-pulse">COMING SOON</span>
            </div>
          </div>

          <button class="w-full py-1 sm:py-2.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-[8px] min-[380px]:text-[9px] sm:text-sm rounded-full shadow-md border border-blue-400 flex items-center justify-center gap-1 uppercase tracking-wider">
            View More Details
          </button>
        </div>

      </div>

      <!-- ANNOUNCEMENT SCROLLING MARQUEE TICKER STRIP -->
      <div class="w-full max-w-5xl mx-auto bg-slate-900 border-2 border-emerald-500/80 py-2.5 px-3 rounded-2xl flex items-center gap-2.5 sm:gap-3 shadow-xl overflow-hidden text-amber-300">
        
        <!-- FIXED ANNOUNCEMENT BADGE -->
        <span class="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[10px] sm:text-xs rounded-xl shadow-md uppercase shrink-0 flex items-center gap-1 z-10">
          <i data-lucide="bell" class="w-3.5 h-3.5 text-amber-300 animate-bounce"></i>
          <span>NOTICE</span>
        </span>

        <!-- SCROLLING MARQUEE TEXT -->
        <div class="overflow-hidden whitespace-nowrap w-full relative">
          <div class="animate-continuous-marquee text-xs sm:text-sm font-black text-amber-200 tracking-wide">
            <span class="px-4">📢 Stay Tuned! 🏏 Auction Date and Match Schedule for Jhankra Super League (JSL) will be published from time to time. Stay connected for the latest updates.</span>
            <span class="text-emerald-400 font-extrabold px-2">•</span>
            <span class="px-4">📢 Stay Tuned! 🏏 Auction Date and Match Schedule for Jhankra Super League (JSL) will be published from time to time. Stay connected for the latest updates.</span>
            <span class="text-emerald-400 font-extrabold px-2">•</span>
          </div>
        </div>

      </div>

      <!-- OFFICIAL CONFIRMED FRANCHISE TEAMS CAROUSEL (LOOPING SLIDER FOR MOBILE & DESKTOP) -->
      <div class="w-full max-w-5xl mx-auto space-y-3 sm:space-y-4 pt-2 sm:pt-4">
        
        <!-- SECTION HEADER -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 text-center sm:text-left">
          <div>
            <div class="flex items-center justify-center sm:justify-start gap-2">
              <span class="px-2.5 py-0.5 bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 text-slate-950 font-black text-[10px] sm:text-xs rounded-full border border-amber-300 shadow-md uppercase tracking-wider animate-pulse">
                ⚡ OFFICIAL CONFIRMED FRANCHISES
              </span>
              <span class="text-xs text-emerald-600 font-extrabold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Loop
              </span>
            </div>
            <h2 class="text-base sm:text-2xl font-black text-slate-900 mt-1 flex items-center justify-center sm:justify-start gap-2">
              <span>🏆 Official Confirmed Teams</span>
            </h2>
            <p class="text-[11px] sm:text-xs text-slate-600 font-semibold">Confirmed Team List for Jhankra Super League (JSL 2026)</p>
          </div>

          <!-- CAROUSEL CONTROLS (NEXT/PREV BUTTONS) -->
          <div class="flex items-center gap-2">
            <button id="confirmed-teams-prev-btn" aria-label="Previous Team" class="p-2 sm:p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center">
              <i data-lucide="chevron-left" class="w-4 h-4 sm:w-5 sm:h-5"></i>
            </button>
            <div id="confirmed-teams-counter" class="text-xs font-mono font-black text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              1 / 3
            </div>
            <button id="confirmed-teams-next-btn" aria-label="Next Team" class="p-2 sm:p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center">
              <i data-lucide="chevron-right" class="w-4 h-4 sm:w-5 sm:h-5"></i>
            </button>
          </div>
        </div>

        <!-- CAROUSEL CARD CONTAINER -->
        <div id="confirmed-teams-carousel-card" class="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-950 border-2 border-amber-400/80 shadow-2xl group">
          
          <!-- SLIDES CONTAINER -->
          <div id="confirmed-teams-slider" class="flex transition-transform duration-500 ease-out w-full">
            
            <!-- SLIDE 1: KHIRPAI HURRICANES -->
            <div class="w-full flex-shrink-0 relative group/slide cursor-pointer slide-item" data-slide-index="0" data-img-src="assets/team_confirm_1_khirpai_hurricanes.jpg" data-team-name="1st Confirm Team - Khirpai Hurricanes">
              <div class="relative w-full max-h-[75vh] flex justify-center bg-slate-950 overflow-hidden">
                <img src="assets/team_confirm_1_khirpai_hurricanes.jpg" alt="1st Confirm Team - Khirpai Hurricanes" class="w-full h-auto max-h-[75vh] object-contain mx-auto shadow-2xl transition-transform duration-300 group-hover/slide:scale-[1.01]" />
                
                <!-- TOP CORNER BADGE OVERLAY -->
                <div class="absolute top-3 left-3 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl shadow-2xl border border-amber-300 flex items-center gap-1.5">
                  <span>🏆 1ST CONFIRM TEAM</span>
                </div>

                <!-- BOTTOM CLICK TO ENLARGE HINT -->
                <div class="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md text-amber-300 font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1 shadow-lg">
                  <i data-lucide="maximize-2" class="w-3.5 h-3.5"></i> Tap Fullscreen
                </div>
              </div>
            </div>

            <!-- SLIDE 2: ANIKET XI -->
            <div class="w-full flex-shrink-0 relative group/slide cursor-pointer slide-item" data-slide-index="1" data-img-src="assets/team_confirm_2_aniket_xi.jpg" data-team-name="2nd Confirm Team - Aniket XI">
              <div class="relative w-full max-h-[75vh] flex justify-center bg-slate-950 overflow-hidden">
                <img src="assets/team_confirm_2_aniket_xi.jpg" alt="2nd Confirm Team - Aniket XI" class="w-full h-auto max-h-[75vh] object-contain mx-auto shadow-2xl transition-transform duration-300 group-hover/slide:scale-[1.01]" />
                
                <!-- TOP CORNER BADGE OVERLAY -->
                <div class="absolute top-3 left-3 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 text-slate-950 font-black text-xs sm:text-sm px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl shadow-2xl border border-white flex items-center gap-1.5">
                  <span>🥈 2ND CONFIRM TEAM</span>
                </div>

                <!-- BOTTOM CLICK TO ENLARGE HINT -->
                <div class="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md text-amber-300 font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1 shadow-lg">
                  <i data-lucide="maximize-2" class="w-3.5 h-3.5"></i> Tap Fullscreen
                </div>
              </div>
            </div>

            <!-- SLIDE 3: SRS BROTHER'S -->
            <div class="w-full flex-shrink-0 relative group/slide cursor-pointer slide-item" data-slide-index="2" data-img-src="assets/team_confirm_3_srs_brothers.jpg" data-team-name="3rd Confirm Team - SRS Brother's">
              <div class="relative w-full max-h-[75vh] flex justify-center bg-slate-950 overflow-hidden">
                <img src="assets/team_confirm_3_srs_brothers.jpg" alt="3rd Confirm Team - SRS Brother's" class="w-full h-auto max-h-[75vh] object-contain mx-auto shadow-2xl transition-transform duration-300 group-hover/slide:scale-[1.01]" />
                
                <!-- TOP CORNER BADGE OVERLAY -->
                <div class="absolute top-3 left-3 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-amber-100 font-black text-xs sm:text-sm px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl shadow-2xl border border-amber-600 flex items-center gap-1.5">
                  <span>🥉 3RD CONFIRM TEAM</span>
                </div>

                <!-- BOTTOM CLICK TO ENLARGE HINT -->
                <div class="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md text-amber-300 font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1 shadow-lg">
                  <i data-lucide="maximize-2" class="w-3.5 h-3.5"></i> Tap Fullscreen
                </div>
              </div>
            </div>

          </div>

          <!-- BOTTOM CAPTION & INDICATOR DOTS -->
          <div class="p-3 bg-slate-950/95 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div id="confirmed-team-caption" class="text-xs sm:text-sm font-black text-amber-400 truncate w-full sm:w-auto">
              🥇 1ST CONFIRM TEAM: KHIRPAI HURRICANES (Owner: MANTU | Icon: BIJAY HALDAR)
            </div>

            <div class="flex items-center justify-center gap-2 shrink-0" id="confirmed-teams-dots">
              <button data-dot-index="0" class="w-7 h-2 rounded-full bg-amber-400 transition-all duration-300" aria-label="Go to Slide 1"></button>
              <button data-dot-index="1" class="w-2.5 h-2 rounded-full bg-slate-700 hover:bg-slate-500 transition-all duration-300" aria-label="Go to Slide 2"></button>
              <button data-dot-index="2" class="w-2.5 h-2 rounded-full bg-slate-700 hover:bg-slate-500 transition-all duration-300" aria-label="Go to Slide 3"></button>
            </div>
          </div>

        </div>
      </div>

    </div>
  `;

  // ATTACH CARD CLICK LISTENERS
  document.getElementById('btn-click-jpl')?.addEventListener('click', () => openComingSoonModal('JPL', 'Jhankra Premier League', 'assets/jpl_logo_white.jpg'));
  document.getElementById('btn-click-kpl')?.addEventListener('click', () => openComingSoonModal('KPL', 'Kota Premier League', 'assets/kpl_logo_white.jpg'));
  document.getElementById('btn-click-jsl')?.addEventListener('click', () => navigate('jsl-hub'));

  // ATTACH CONFIRMED TEAMS LOOPING CAROUSEL EVENT LISTENERS & AUTO-PLAY
  const slider = document.getElementById('confirmed-teams-slider');
  const counter = document.getElementById('confirmed-teams-counter');
  const captionEl = document.getElementById('confirmed-team-caption');
  const carouselCard = document.getElementById('confirmed-teams-carousel-card');

  const teamCaptions = [
    '🥇 1ST CONFIRM TEAM: KHIRPAI HURRICANES (Owner: MANTU | Icon: BIJAY HALDAR)',
    '🥈 2ND CONFIRM TEAM: ANIKET XI (Owner: UTTAM GHOSH | Icon: RINTU ROY)',
    '🥉 3RD CONFIRM TEAM: SRS BROTHER\'S (Owner: RAJA | Icon: TAPAS)'
  ];

  let currentSlide = 0;
  const totalSlides = 3;

  const updateSlide = (index) => {
    currentSlide = (index + totalSlides) % totalSlides;
    if (slider) {
      slider.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
    if (counter) {
      counter.textContent = `${currentSlide + 1} / ${totalSlides}`;
    }
    if (captionEl) {
      captionEl.textContent = teamCaptions[currentSlide];
    }

    // Update dot styles
    const dots = document.querySelectorAll('#confirmed-teams-dots button');
    dots.forEach((dot, idx) => {
      if (idx === currentSlide) {
        dot.className = 'w-7 h-2 rounded-full bg-amber-400 transition-all duration-300';
      } else {
        dot.className = 'w-2.5 h-2 rounded-full bg-slate-700 hover:bg-slate-500 transition-all duration-300';
      }
    });
  };

  const nextSlide = () => updateSlide(currentSlide + 1);
  const prevSlide = () => updateSlide(currentSlide - 1);

  document.getElementById('confirmed-teams-next-btn')?.addEventListener('click', nextSlide);
  document.getElementById('confirmed-teams-prev-btn')?.addEventListener('click', prevSlide);

  document.querySelectorAll('#confirmed-teams-dots button').forEach(dotBtn => {
    dotBtn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-dot-index'), 10);
      updateSlide(idx);
    });
  });

  // Tap on slide image to open HD photo zoom modal
  document.querySelectorAll('.slide-item').forEach(slide => {
    slide.addEventListener('click', (e) => {
      const imgSrc = e.currentTarget.getAttribute('data-img-src');
      const teamName = e.currentTarget.getAttribute('data-team-name');
      if (imgSrc) {
        openHDPhotoZoomModal(imgSrc, teamName);
      }
    });
  });

  // Auto-play loop every 3.5 seconds
  let autoPlayTimer = setInterval(nextSlide, 3500);

  // Pause autoplay on mouse enter / touch start and resume on leave / end
  if (carouselCard) {
    carouselCard.addEventListener('mouseenter', () => clearInterval(autoPlayTimer));
    carouselCard.addEventListener('mouseleave', () => {
      clearInterval(autoPlayTimer);
      autoPlayTimer = setInterval(nextSlide, 3500);
    });

    // Touch swipe support for mobile phone screens
    let touchStartX = 0;
    let touchEndX = 0;

    carouselCard.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      clearInterval(autoPlayTimer);
    }, { passive: true });

    carouselCard.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 35) {
        nextSlide();
      } else if (touchEndX - touchStartX > 35) {
        prevSlide();
      }
      clearInterval(autoPlayTimer);
      autoPlayTimer = setInterval(nextSlide, 3500);
    }, { passive: true });
  }
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

      <!-- 3 HORIZONTAL COMPACT SQUARE COLUMNS (REDUCED GAP & COMPACT SQUARE SHAPE) -->
      <div class="grid grid-cols-3 gap-1 sm:gap-3 items-stretch">
        
        <!-- COLUMN 1 (LEFT SIDE): REGISTERED TEAMS CARD -->
        <div class="relative glass-card aspect-square p-1.5 sm:p-3 text-center border-2 border-sky-300 bg-white flex flex-col justify-between items-center hover:border-sky-500 shadow-md rounded-xl sm:rounded-2xl overflow-hidden">
          <!-- STYLISH TOP-RIGHT CORNER CIRCLE COUNTER BADGE -->
          <div class="absolute top-1 right-1 w-5 h-5 sm:w-7 sm:h-7 bg-sky-600 text-white text-[9px] sm:text-xs font-black rounded-full flex items-center justify-center border-2 border-white shadow-md z-10" title="Total Teams">
            ${teams.length}
          </div>

          <div class="space-y-0.5 sm:space-y-1.5 pt-0.5 w-full flex flex-col items-center">
            <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center shadow-md font-black">
              <i data-lucide="shield" class="w-3.5 h-3.5 sm:w-5 sm:h-5"></i>
            </div>

            <div class="w-full">
              <div class="text-[8px] min-[360px]:text-[9px] sm:text-xs font-black text-slate-900 uppercase tracking-tight leading-none">REGISTERED TEAMS</div>
              <div class="text-[7px] min-[360px]:text-[8px] sm:text-[10px] font-extrabold text-sky-700 leading-none mt-0.5">Official Squads</div>
            </div>
          </div>

          <button id="open-teams-modal-btn" class="w-full py-1 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[8px] min-[360px]:text-[9px] sm:text-xs font-extrabold rounded-lg sm:rounded-xl shadow-md flex items-center justify-center gap-0.5 transition-all">
            <i data-lucide="search" class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-400"></i> View Teams
          </button>
        </div>

        <!-- COLUMN 2 (MIDDLE): REGISTERED PLAYER LIST CARD -->
        <div class="relative glass-card aspect-square p-1.5 sm:p-3 text-center border-2 border-emerald-300 bg-white flex flex-col justify-between items-center hover:border-emerald-500 shadow-md rounded-xl sm:rounded-2xl overflow-hidden">
          <!-- STYLISH TOP-RIGHT CORNER CIRCLE COUNTER BADGE -->
          <div class="absolute top-1 right-1 w-5 h-5 sm:w-7 sm:h-7 bg-emerald-600 text-white text-[9px] sm:text-xs font-black rounded-full flex items-center justify-center border-2 border-white shadow-md z-10" title="Total Players">
            ${players.length}
          </div>

          <div class="space-y-0.5 sm:space-y-1.5 pt-0.5 w-full flex flex-col items-center">
            <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md font-black">
              <i data-lucide="users" class="w-3.5 h-3.5 sm:w-5 sm:h-5"></i>
            </div>

            <div class="w-full">
              <div class="text-[8px] min-[360px]:text-[9px] sm:text-xs font-black text-slate-900 uppercase tracking-tight leading-none">REGISTERED PLAYERS</div>
              <div class="text-[7px] min-[360px]:text-[8px] sm:text-[10px] font-extrabold text-emerald-700 leading-none mt-0.5">Player Entries</div>
            </div>
          </div>

          <button id="open-players-modal-btn" class="w-full py-1 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[8px] min-[360px]:text-[9px] sm:text-xs font-extrabold rounded-lg sm:rounded-xl shadow-md flex items-center justify-center gap-0.5 transition-all">
            <i data-lucide="search" class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-400"></i> View Players
          </button>
        </div>

        <!-- COLUMN 3 (RIGHT SIDE): REGISTRATION HERE CARD -->
        <div class="relative glass-card aspect-square p-1.5 sm:p-3 text-center border-2 border-red-400 bg-white flex flex-col justify-between items-center hover:border-red-600 shadow-md rounded-xl sm:rounded-2xl overflow-hidden">
          
          <div class="space-y-0.5 sm:space-y-1.5 pt-0.5 w-full flex flex-col items-center">
            <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center font-black shadow-md border border-red-300 text-xs sm:text-lg">
              ✍️
            </div>

            <div class="w-full">
              <div class="text-[8px] min-[360px]:text-[9px] sm:text-xs font-black text-slate-900 uppercase tracking-tight leading-none">REGISTRATION HERE</div>
              <div class="text-[7px] min-[360px]:text-[8px] sm:text-[10px] font-black text-black leading-none mt-0.5">Team & Player Entry</div>
            </div>
          </div>

          <!-- PERSISTENT BLINKING REGISTRATION BUTTON (VIBRANT RED BACKGROUND) -->
          <button id="jsl-right-reg-btn" class="btn-blink-always w-full py-1 sm:py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-[8px] min-[360px]:text-[9px] sm:text-xs rounded-lg sm:rounded-xl shadow-lg flex items-center justify-center gap-0.5 border border-red-400">
            <i data-lucide="edit-3" class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-300"></i> Register Now
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
                  
                  <button class="view-team-squad-btn mt-3.5 w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 text-[10px] font-black rounded-lg border border-sky-200 transition-all flex items-center justify-center gap-1 shadow-sm" data-team-id="${t.id}">
                    🏃‍♂️ View Squad (${store.getPlayers().filter(p => p.teamId === t.id).length} Players)
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
    if (window.lucide) window.lucide.createIcons();

    container.querySelectorAll('.view-team-squad-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tId = e.currentTarget.getAttribute('data-team-id');
        const team = allTeams.find(t => t.id === tId);
        if (team) openTeamSquadModal(team);
      });
    });
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

// --- RENDER PLAYER CARDS (SQUARE PHOTO CARDS WITH TOP SHORT SERIAL, BLINKING STATUS DOT & CLEAN NAME) ---
function renderPlayerCardsWithSerial(playersList) {
  return playersList.map((p, idx) => {
    const isApproved = (p.registrationStatus || p.paymentStatus) === 'APPROVED';
    const shortSerialNo = String(idx + 1).padStart(2, '0');
    const photoSrc = p.photoUrl || p.player_photo_url || '';

    return `
      <div class="glass-card p-2 flex flex-col justify-between items-center text-center relative border border-emerald-200 bg-white hover:border-emerald-500 shadow-md rounded-2xl overflow-hidden">
        
        <!-- LARGE SQUARE PICTURE CONTAINER WITH TOP-LEFT SHORT SERIAL & TOP-RIGHT BLINKING STATUS DOT -->
        <div class="w-full aspect-square rounded-xl bg-slate-100 border-2 border-emerald-500 flex items-center justify-center overflow-hidden shadow-md relative mb-1.5 mx-auto">
          
          <!-- PLAYER PHOTO -->
          <img src="${photoSrc}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E';" />

          <!-- SHORT SERIAL NO ON PICTURE TOP-LEFT (E.G. #01, #02) -->
          <span class="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-950/85 backdrop-blur-sm text-amber-300 font-mono font-black text-[10px] rounded-md border border-amber-400/80 shadow-md">
            #${shortSerialNo}
          </span>

          <!-- BLINKING GREEN OR RED STATUS CIRCLE ON PICTURE TOP-RIGHT -->
          <div class="absolute top-1.5 right-1.5 flex h-3.5 w-3.5" title="${isApproved ? 'Approved Player' : 'Pending Player'}">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-red-400'} opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3.5 w-3.5 ${isApproved ? 'bg-emerald-500' : 'bg-red-500'} border-2 border-white shadow-md"></span>
          </div>

        </div>

        <!-- PLAYER NAME ONLY (CATEGORY & DISTRICT REMOVED FOR CLEAN SQUARE CARD) -->
        <div class="w-full mb-1.5 px-0.5">
          <h3 class="font-black text-slate-900 text-xs sm:text-sm truncate leading-tight">${p.name}</h3>
        </div>

        <!-- VIEW PROFILE BUTTON -->
        <button data-profile-id="${p.id}" class="view-profile-modal-btn w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[9px] sm:text-[10px] font-extrabold rounded-xl shadow-sm flex items-center justify-center gap-1 transition-colors">
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
            <input type="text" id="ply-team-pref" placeholder="Preferred Franchise Team Name (Optional)" class="w-full bg-slate-50 border border          <!-- 7. HD Player Photo (Square 1:1 Crop with Camera & Gallery Options) -->
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2 shadow-sm">
            <div class="flex items-center justify-between">
              <label class="block text-[9px] font-black text-slate-800 uppercase">Player Photo (Square Shape 1:1) *</label>
              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black rounded-full border border-emerald-300">1:1 SQUARE FORMAT</span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <!-- Gallery Option -->
              <label class="px-2.5 py-2 bg-white hover:bg-emerald-50 text-slate-800 font-bold text-[10px] rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all hover:border-emerald-400">
                <i data-lucide="image" class="w-4 h-4 text-emerald-600"></i>
                <span>📁 Select Gallery</span>
                <input type="file" id="ply-photo-file-gallery" accept="image/*" class="hidden" />
              </label>

              <!-- Camera Option -->
              <label class="px-2.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-[10px] rounded-xl border border-emerald-400 flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all">
                <i data-lucide="camera" class="w-4 h-4 text-amber-300 animate-pulse"></i>
                <span>📷 Take Live Photo</span>
                <input type="file" id="ply-photo-file-camera" accept="image/*" capture="user" class="hidden" />
              </label>
            </div>

            <!-- Preview Box with Square Cropped Photo & Re-Crop Button -->
            <div id="ply-photo-preview-box" class="hidden p-2 bg-white rounded-xl border border-emerald-300 flex items-center justify-between gap-2 shadow-sm">
              <div class="flex items-center gap-2.5">
                <img id="ply-photo-preview-img" class="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shadow-sm" />
                <div>
                  <div class="text-[10px] text-slate-900 font-black flex items-center gap-1">
                    <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i> Square Photo Ready
                  </div>
                  <div class="text-[9px] text-slate-500 font-semibold">Cropped 1:1 Format</div>
                </div>
              </div>
              <button type="button" id="re-crop-ply-photo-btn" class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-black text-[10px] rounded-lg border border-slate-700 flex items-center gap-1 shadow">
                <i data-lucide="crop" class="w-3.5 h-3.5"></i> Re-Crop
              </button>
            </div>
          </div>

          <!-- 8. Aadhaar Card Front / Proof -->
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2 shadow-sm">
            <div class="flex items-center justify-between">
              <label class="block text-[9px] font-black text-slate-800 uppercase">Aadhaar Card Front / Proof *</label>
              <span class="px-2 py-0.5 bg-sky-100 text-sky-800 text-[8px] font-black rounded-full border border-sky-300">DOCUMENT PROOF</span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <label class="px-2.5 py-2 bg-white hover:bg-sky-50 text-slate-800 font-bold text-[10px] rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all hover:border-sky-400">
                <i data-lucide="file-text" class="w-4 h-4 text-sky-600"></i>
                <span>📁 Select File</span>
                <input type="file" id="ply-aadhar-file-gallery" accept="image/*" class="hidden" />
              </label>

              <label class="px-2.5 py-2 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-extrabold text-[10px] rounded-xl border border-sky-400 flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all">
                <i data-lucide="camera" class="w-4 h-4 text-white animate-pulse"></i>
                <span>📷 Capture Camera</span>
                <input type="file" id="ply-aadhar-file-camera" accept="image/*" capture="environment" class="hidden" />
              </label>
            </div>

            <div id="ply-aadhar-preview-box" class="hidden p-2 bg-white rounded-xl border border-sky-300 flex items-center justify-between gap-2 shadow-sm">
              <div class="flex items-center gap-2.5">
                <img id="ply-aadhar-preview-img" class="w-12 h-9 rounded-lg object-cover border border-sky-500 shadow-sm" />
                <div>
                  <div class="text-[10px] text-slate-900 font-black flex items-center gap-1">
                    <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-sky-600"></i> Aadhaar Document Selected
                  </div>
                  <div class="text-[9px] text-slate-500 font-semibold">HD Proof Ready</div>
                </div>
              </div>
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

              <div class="space-y-1">
                <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Upload Payment Receipt Screenshot *</label>
                
                <div class="grid grid-cols-2 gap-2">
                  <label class="px-2 py-1.5 bg-white hover:bg-emerald-50 text-slate-800 font-bold text-[9px] rounded-lg border border-slate-300 flex items-center justify-center gap-1 cursor-pointer shadow-sm transition-all">
                    <i data-lucide="file-image" class="w-3.5 h-3.5 text-emerald-600"></i>
                    <span>📁 Select File</span>
                    <input type="file" id="ply-proof-file-gallery" accept="image/*" class="hidden" />
                  </label>

                  <label class="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] rounded-lg border border-emerald-400 flex items-center justify-center gap-1 cursor-pointer shadow-sm transition-all">
                    <i data-lucide="camera" class="w-3.5 h-3.5 text-amber-300"></i>
                    <span>📷 From Camera</span>
                    <input type="file" id="ply-proof-file-camera" accept="image/*" capture="environment" class="hidden" />
                  </label>
                </div>

                <div id="ply-proof-preview-box" class="hidden p-2 bg-white rounded-xl border border-emerald-300 flex items-center justify-between gap-2 shadow-sm mt-1">
                  <div class="flex items-center gap-2">
                    <img id="ply-proof-preview-img" class="w-10 h-7 rounded object-cover border border-emerald-500" />
                    <span class="text-[9px] text-emerald-700 font-black flex items-center gap-1">
                      <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i> Receipt Selected!
                    </span>
                  </div>
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

  // PROCESS PLAYER PHOTO (TRIGGER SQUARE CROPPER MODAL)
  const handlePhotoSelection = async (file) => {
    if (!file) return;
    plyPhotoFileObj = file;
    const rawDataUrl = await compressImage(file, 1200, 1200, 0.85);
    openSquareImageCropModal(rawDataUrl, (croppedSquareDataUrl) => {
      plyPhotoDataUrl = croppedSquareDataUrl;
      const imgPreview = document.getElementById('ply-photo-preview-img');
      if (imgPreview) imgPreview.src = croppedSquareDataUrl;
      document.getElementById('ply-photo-preview-box')?.classList.remove('hidden');
    }, 'Crop Player Photo (Square 1:1)');
  };

  document.getElementById('ply-photo-file-gallery')?.addEventListener('change', (e) => handlePhotoSelection(e.target.files[0]));
  document.getElementById('ply-photo-file-camera')?.addEventListener('change', (e) => handlePhotoSelection(e.target.files[0]));

  document.getElementById('re-crop-ply-photo-btn')?.addEventListener('click', () => {
    if (plyPhotoDataUrl) {
      openSquareImageCropModal(plyPhotoDataUrl, (croppedSquareDataUrl) => {
        plyPhotoDataUrl = croppedSquareDataUrl;
        const imgPreview = document.getElementById('ply-photo-preview-img');
        if (imgPreview) imgPreview.src = croppedSquareDataUrl;
      }, 'Re-Crop Player Photo (Square 1:1)');
    }
  });

  // PROCESS AADHAAR CARD PROOF
  const handleAadharSelection = async (file) => {
    if (!file) return;
    plyAadharFileObj = file;
    plyAadharDataUrl = await compressImage(file, 1050, 1050, 0.82);
    const imgPreview = document.getElementById('ply-aadhar-preview-img');
    if (imgPreview) imgPreview.src = plyAadharDataUrl;
    document.getElementById('ply-aadhar-preview-box')?.classList.remove('hidden');
  };

  document.getElementById('ply-aadhar-file-gallery')?.addEventListener('change', (e) => handleAadharSelection(e.target.files[0]));
  document.getElementById('ply-aadhar-file-camera')?.addEventListener('change', (e) => handleAadharSelection(e.target.files[0]));

  // PROCESS PAYMENT RECEIPT SCREENSHOT
  const handleProofSelection = async (file) => {
    if (!file) return;
    plyProofFileObj = file;
    plyProofDataUrl = await compressImage(file, 1050, 1050, 0.82);
    const imgPreview = document.getElementById('ply-proof-preview-img');
    if (imgPreview) imgPreview.src = plyProofDataUrl;
    document.getElementById('ply-proof-preview-box')?.classList.remove('hidden');
  };

  document.getElementById('ply-proof-file-gallery')?.addEventListener('change', (e) => handleProofSelection(e.target.files[0]));
  document.getElementById('ply-proof-file-camera')?.addEventListener('change', (e) => handleProofSelection(e.target.files[0]));

  document.getElementById('player-registration-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!plyPhotoDataUrl) {
      alert("Please select or capture your Player Photo!");
      return;
    }
    if (!plyAadharDataUrl) {
      alert("Please upload or capture your Aadhaar Card proof!");
      return;
    }
    if (!plyProofDataUrl) {
      alert("Please upload or capture your Payment Receipt screenshot!");
      return;
    }

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
        if (!fileObj && fallbackDataUrl) return fallbackDataUrl;
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

// --- VISITOR VIEWS: MATCH CENTER, LIVE AUCTION & CAREER HUB ---
let auctionPollInterval = null;

function renderFixturesView(container) {
  let selectedCategory = 'JSL';
  let activeSubTab = 'matches'; // 'matches' or 'table'
  
  const drawFixtures = () => {
    const fixtures = store.getFixtures().filter(f => f.leagueCode === selectedCategory);
    const liveMatches = fixtures.filter(f => f.status === 'LIVE');
    const scheduledMatches = fixtures.filter(f => f.status === 'SCHEDULED');
    const completedMatches = fixtures.filter(f => f.status === 'COMPLETED');

    // Standings points compilation (dynamic calculation from matches)
    const standings = store.getTeams().map(t => {
      const teamId = t.id;
      // Get all completed games for this category involving this team
      const teamFixtures = store.getFixtures().filter(f => f.status === 'COMPLETED' && f.leagueCode === selectedCategory && (f.teamAId === teamId || f.teamBId === teamId));
      
      let played = teamFixtures.length;
      let won = 0;
      let lost = 0;
      let nr = 0;
      let points = 0;
      let totalRunsScored = 0;
      let totalOversFaced = 0;
      let totalRunsConceded = 0;
      let totalOversBowled = 0;

      teamFixtures.forEach(f => {
        const isTeamA = f.teamAId === teamId;
        const myScore = isTeamA ? f.teamAScore : f.teamBScore;
        const oppScore = isTeamA ? f.teamBScore : f.teamAScore;

        if (f.winnerTeamId === teamId) {
          won += 1;
          points += 2;
        } else if (!f.winnerTeamId) {
          nr += 1;
          points += 1;
        } else {
          lost += 1;
        }

        if (myScore && oppScore) {
          totalRunsScored += myScore.runs || 0;
          const myOversLimit = f.oversLimit || 16;
          if (myScore.wickets === 10) {
            totalOversFaced += myOversLimit;
          } else {
            const balls = (myScore.overs || 0) * 6 + (myScore.balls || 0);
            totalOversFaced += balls / 6;
          }

          totalRunsConceded += oppScore.runs || 0;
          if (oppScore.wickets === 10) {
            totalOversBowled += myOversLimit;
          } else {
            const oppBalls = (oppScore.overs || 0) * 6 + (oppScore.balls || 0);
            totalOversBowled += oppBalls / 6;
          }
        }
      });

      const myRR = totalOversFaced > 0 ? (totalRunsScored / totalOversFaced) : 0;
      const oppRR = totalOversBowled > 0 ? (totalRunsConceded / totalOversBowled) : 0;
      const nrrVal = myRR - oppRR;

      return {
        name: t.name,
        played,
        won,
        lost,
        nr,
        points,
        nrr: nrrVal.toFixed(3)
      };
    });

    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (parseFloat(b.nrr) !== parseFloat(a.nrr)) return parseFloat(b.nrr) - parseFloat(a.nrr);
      return b.won - a.won;
    });

    let mainContentHtml = '';

    if (activeSubTab === 'matches') {
      mainContentHtml = `
        <!-- 1. LIVE MATCHES (IF ANY) -->
        ${liveMatches.length > 0 ? `
          <div class="space-y-3">
            <h2 class="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Match Scoreboard
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${liveMatches.map(m => {
                const state = m.liveMatchState || {};
                const batTeamName = state.innings === 2 ? m.teamBName : m.teamAName;
                const bowlTeamName = state.innings === 2 ? m.teamAName : m.teamBName;
                const totalBalls = (state.overs * 6) + state.balls;
                const rr = totalBalls > 0 ? ((state.runs / totalBalls) * 6).toFixed(2) : '0.00';
                
                let secondInningsTarget = '';
                if (state.innings === 2 && state.target) {
                  const runsReq = state.target - state.runs;
                  const remainingBalls = (m.oversLimit * 6) - totalBalls;
                  secondInningsTarget = `<div class="text-xs font-black text-amber-400 mt-2">Target: ${state.target} | Need ${runsReq} runs off ${remainingBalls} balls</div>`;
                }

                return `
                  <div class="glass-card p-5 bg-gradient-to-br from-slate-900 to-emerald-950/20 border-2 border-emerald-500/40 rounded-2xl shadow-xl flex flex-col justify-between">
                    <div class="flex justify-between items-center pb-2 border-b border-slate-800/80">
                      <span class="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-black uppercase">Live Scoring</span>
                      <span class="text-[10px] text-slate-400 font-bold">${m.venue}</span>
                    </div>

                    <div class="py-4 space-y-2">
                      <div class="flex justify-between items-center">
                        <span class="font-black text-white text-base">${batTeamName}</span>
                        <span class="font-black text-2xl text-emerald-400">${state.runs} / ${state.wickets}</span>
                      </div>
                      <div class="flex justify-between items-center text-xs text-slate-400">
                        <span>Overs: ${state.overs}.${state.balls} / ${m.oversLimit}</span>
                        <span>Run Rate: ${rr}</span>
                      </div>
                      ${secondInningsTarget}
                    </div>

                    <!-- Batter / Bowler partner logs -->
                    <div class="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 space-y-1.5 text-[11px]">
                      <div class="flex justify-between text-slate-300 font-bold">
                        <span>Striker: ${store.getPlayerById(state.strikerId)?.name || 'Striking'}</span>
                        <span>Bowler: ${store.getPlayerById(state.bowlerId)?.name || 'Bowling'}</span>
                      </div>
                      <div class="flex items-center gap-2 pt-1.5 border-t border-slate-900 text-[10px]">
                        <span class="text-slate-500 uppercase font-extrabold">This Over:</span>
                        <div class="flex gap-1">
                          ${(state.overBalls || []).map(b => `<span class="px-1.5 py-0.5 bg-slate-900 text-slate-300 rounded font-bold text-[9px]">${b.label}</span>`).join('')}
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 2. UPCOMING MATCH FIXTURES -->
        <div class="space-y-3">
          <h2 class="text-sm font-black text-sky-400 uppercase tracking-widest">Scheduled Fixtures</h2>
          ${scheduledMatches.length === 0 ? `
            <div class="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/10">No upcoming fixtures scheduled yet.</div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${scheduledMatches.map(m => `
                <div class="glass-card p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-between">
                  <div class="flex justify-between items-center pb-2 border-b border-slate-800/60 text-[10px] text-slate-400">
                    <span class="font-bold uppercase tracking-wider text-sky-400">${m.leagueCode} Match</span>
                    <span class="font-semibold">${m.date} at ${m.time}</span>
                  </div>
                  <div class="py-3 flex justify-between items-center font-black text-white text-sm">
                    <span>${m.teamAName}</span>
                    <span class="text-xs text-slate-500">VS</span>
                    <span>${m.teamBName}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
                    <span>Overs: ${m.oversLimit} Overs</span>
                    <span>Venue: ${m.venue}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- 3. COMPLETED MATCH RESULTS -->
        <div class="space-y-3">
          <h2 class="text-sm font-black text-slate-400 uppercase tracking-widest">Results</h2>
          ${completedMatches.length === 0 ? `
            <div class="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/10">No matches completed yet.</div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${completedMatches.map(m => `
                <div class="glass-card p-4 bg-slate-900/90 border border-slate-850 rounded-2xl">
                  <div class="flex justify-between items-center pb-2 border-b border-slate-850 text-[10px] text-slate-400">
                    <span class="font-bold text-emerald-500 uppercase">Completed</span>
                    <span>${m.date}</span>
                  </div>
                  <div class="py-3 flex justify-between items-center font-black text-white text-xs sm:text-sm">
                    <div>
                      <div>${m.teamAName}</div>
                      <div class="text-[11px] text-slate-400 font-bold">${m.teamAScore ? `${m.teamAScore.runs}/${m.teamAScore.wickets} (${m.teamAScore.overs}.${m.teamAScore.balls})` : ''}</div>
                    </div>
                    <span class="text-slate-500 font-semibold">vs</span>
                    <div class="text-right">
                      <div>${m.teamBName}</div>
                      <div class="text-[11px] text-slate-400 font-bold">${m.teamBScore ? `${m.teamBScore.runs}/${m.teamBScore.wickets} (${m.teamBScore.overs}.${m.teamBScore.balls})` : ''}</div>
                    </div>
                  </div>
                  <div class="text-[11px] bg-sky-950/20 border border-sky-500/20 text-sky-300 font-extrabold p-2 rounded-xl text-center mt-2 uppercase tracking-wide">
                    🏆 ${m.result || 'Match Completed'}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    } else {
      mainContentHtml = `
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-black text-sky-400 uppercase tracking-widest">Franchise Standings (Points Table)</h2>
            <span class="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold text-[10px] uppercase tracking-wide">🏆 Top 4 Qualify for Semifinal</span>
          </div>

          <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs sm:text-sm text-slate-200">
                <thead class="bg-slate-950 font-black text-[10px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th class="py-3.5 px-4 text-center w-10">POS</th>
                    <th class="py-3.5 px-3">TEAM</th>
                    <th class="py-3.5 px-3 text-center">P</th>
                    <th class="py-3.5 px-3 text-center text-emerald-400">W</th>
                    <th class="py-3.5 px-3 text-center text-red-400">L</th>
                    <th class="py-3.5 px-3 text-center">NR</th>
                    <th class="py-3.5 px-3 text-center text-amber-400">PTS</th>
                    <th class="py-3.5 px-4 text-right">NRR</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 font-semibold">
                  ${standings.map((t, idx) => {
                    const isSemiSpot = idx < 4;
                    const rowClass = isSemiSpot ? 'bg-emerald-950/5 hover:bg-emerald-950/10' : 'hover:bg-slate-950/40';
                    return `
                      <tr class="${rowClass} transition-colors">
                        <td class="py-3.5 px-4 text-center font-black">
                          <span class="inline-flex w-5 h-5 rounded-full ${isSemiSpot ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'} items-center justify-center text-[10px] font-black shadow-sm">
                            ${idx + 1}
                          </span>
                        </td>
                        <td class="py-3.5 px-3 text-xs sm:text-sm font-black text-white flex items-center gap-2">
                          ${isSemiSpot ? `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="In Semifinal Zone"></span>` : ''}
                          <span>${t.name}</span>
                        </td>
                        <td class="py-3.5 px-3 text-center font-mono">${t.played}</td>
                        <td class="py-3.5 px-3 text-center font-mono text-emerald-400 font-bold">${t.won}</td>
                        <td class="py-3.5 px-3 text-center font-mono text-red-400 font-bold">${t.lost}</td>
                        <td class="py-3.5 px-3 text-center font-mono">${t.nr}</td>
                        <td class="py-3.5 px-3 text-center font-black font-mono text-amber-400 text-sm">${t.points}</td>
                        <td class="py-3.5 px-4 text-right font-mono text-xs ${parseFloat(t.nrr) >= 0 ? 'text-sky-400' : 'text-slate-400'}">${t.nrr}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-6 sm:space-y-8 animate-fade-in pb-16">
        <!-- Banner & Category Selector -->
        <div class="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white">🏏 Match Center</h1>
            <p class="text-xs text-slate-400">View live scores, match standings, and fixtures in real-time.</p>
          </div>
          <div class="flex border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-1">
            <button data-cat="JSL" class="fixture-cat-btn ${selectedCategory === 'JSL' ? 'bg-sky-600 text-white font-extrabold' : 'text-slate-400 hover:text-white'} px-3 py-1.5 text-xs rounded-lg transition-all">JSL</button>
            <button data-cat="JPL" class="fixture-cat-btn ${selectedCategory === 'JPL' ? 'bg-sky-600 text-white font-extrabold' : 'text-slate-400 hover:text-white'} px-3 py-1.5 text-xs rounded-lg transition-all">JPL</button>
            <button data-cat="KPL" class="fixture-cat-btn ${selectedCategory === 'KPL' ? 'bg-sky-600 text-white font-extrabold' : 'text-slate-400 hover:text-white'} px-3 py-1.5 text-xs rounded-lg transition-all">KPL</button>
          </div>
        </div>

        <!-- Sub-Tabs Navigation (Matches / Points Table) -->
        <div class="flex gap-4 border-b border-slate-800/60 pb-2">
          <button id="fixture-subtab-matches" class="text-xs font-black pb-1.5 border-b-2 transition-all ${activeSubTab === 'matches' ? 'text-sky-400 border-sky-500' : 'text-slate-400 border-transparent hover:text-white'}">
            Matches
          </button>
          <button id="fixture-subtab-table" class="text-xs font-black pb-1.5 border-b-2 transition-all ${activeSubTab === 'table' ? 'text-sky-400 border-sky-500' : 'text-slate-400 border-transparent hover:text-white'}">
            IPL Standing Table
          </button>
        </div>

        <!-- Dynamic Main Content Grid -->
        <div id="fixture-view-content-area">
          ${mainContentHtml}
        </div>
      </div>
    `;

    // Bind Category switching buttons
    container.querySelectorAll('.fixture-cat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedCategory = e.currentTarget.getAttribute('data-cat');
        drawFixtures();
      });
    });

    // Bind Subtab events
    document.getElementById('fixture-subtab-matches')?.addEventListener('click', () => {
      activeSubTab = 'matches';
      drawFixtures();
    });
    document.getElementById('fixture-subtab-table')?.addEventListener('click', () => {
      activeSubTab = 'table';
      drawFixtures();
    });

    if (window.lucide) window.lucide.createIcons();
  };

  drawFixtures();
}

function renderLiveAuctionView(container) {
  if (auctionPollInterval) {
    clearInterval(auctionPollInterval);
  }

  const pollActiveAuctionState = async () => {
    if (currentRoute !== 'auction') {
      clearInterval(auctionPollInterval);
      return;
    }

    const state = await store.getLiveAuctionState();
    const teams = store.getTeams();
    
    let activeBlockHtml = `
      <div class="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
        <i data-lucide="gavel" class="w-12 h-12 text-slate-700 mx-auto mb-3"></i>
        <h3 class="text-slate-400 font-bold text-sm">Waiting for Auctioneer...</h3>
        <p class="text-xs text-slate-500 mt-1">The active player will appear here dynamically once bidding starts.</p>
      </div>
    `;

    if (state && state.active_player_id) {
      const bidderTeam = teams.find(t => t.id === state.highest_bidder_team_id);
      activeBlockHtml = `
        <div class="bg-gradient-to-br from-slate-900 to-amber-950/10 border-2 border-amber-500/40 p-5 rounded-2xl shadow-2xl space-y-6 animate-fade-in relative overflow-hidden">
          <div class="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>

          <div class="flex justify-between items-center pb-2 border-b border-slate-800/80">
            <span class="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded font-black text-[10px] uppercase tracking-wider animate-pulse flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span> Live Bidding Block
            </span>
            <span class="text-xs text-slate-400 font-mono font-bold">Category: JSL 2026</span>
          </div>

          <!-- Active Player Details -->
          <div class="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
            <img src="${state.photoUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' rx=\'20\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E'}" class="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-amber-500 shadow-xl" />
            <div class="space-y-2">
              <h2 class="text-xl sm:text-2xl font-black text-white">${state.name}</h2>
              <div class="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                <span class="px-2.5 py-0.5 bg-sky-950 text-sky-400 border border-sky-850 rounded-full font-bold text-[10px]">${state.category}</span>
                <span class="px-2.5 py-0.5 bg-slate-950 text-slate-350 border border-slate-800 rounded-full font-mono text-[10px]">Base: ₹ ${state.basePrice}</span>
              </div>
            </div>
          </div>

          <!-- Active Bid Metrics -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-900">
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current High Bid</span>
              <span class="text-3xl font-black text-amber-400">₹ ${state.current_bid}</span>
            </div>
            <div class="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-900 pt-2.5 sm:pt-0 sm:pl-4">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Leading Bidder</span>
              <span class="text-lg font-black text-white truncate block mt-1">${bidderTeam ? bidderTeam.name : 'No bids yet'}</span>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-6 sm:space-y-8 animate-fade-in pb-16">
        <div class="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl backdrop-blur-xl">
          <h1 class="text-xl sm:text-2xl font-black text-white">🔨 Live Player Auction Hub</h1>
          <p class="text-xs text-slate-400">Track current bids, player block assignments, and team budgets live.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-4">
            ${activeBlockHtml}
          </div>

          <div class="lg:col-span-1 space-y-3">
            <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest">Franchise Purses</h3>
            <div class="space-y-2">
              ${teams.map(t => {
                const spent = t.purseSpent || 0;
                const totalPurse = t.purseBudget || 8000;
                const left = totalPurse - spent;
                const ratio = Math.min(100, Math.max(0, (left / totalPurse) * 100));
                return `
                  <div class="glass-card p-3.5 bg-slate-900/95 border border-slate-800 flex flex-col justify-between">
                    <div class="flex justify-between items-center mb-1 text-xs">
                      <span class="font-black text-white">${t.name}</span>
                      <span class="font-mono text-slate-400">Roster: <strong class="text-white">${t.squadCount || 0} / 13</strong></span>
                    </div>
                    <div class="flex justify-between items-center text-xs font-bold text-amber-400">
                      <span>Purse Remaining:</span>
                      <span>₹ ${left}</span>
                    </div>
                    <div class="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-900">
                      <div class="bg-amber-500 h-full rounded-full" style="width: ${ratio}%"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  };

  pollActiveAuctionState();
  auctionPollInterval = setInterval(pollActiveAuctionState, 1500);
}

function renderCareerHubView(container) {
  let searchQuery = '';

  const drawCareerHub = () => {
    const players = store.getPlayers().filter(p => (p.registrationStatus || p.paymentStatus) === 'APPROVED');
    const fixtures = store.getFixtures();
    const completedFixtures = fixtures.filter(f => f.status === 'COMPLETED');

    const list = players.map(p => {
      let runs = 0;
      let balls = 0;
      let wickets = 0;
      let runsConceded = 0;
      let ballsBowled = 0;
      let dismissals = 0;
      let matches = 0;
      let centuries = 0;
      let halfCenturies = 0;
      let fiveWickets = 0;

      completedFixtures.forEach(f => {
        if (f.liveMatchState && f.liveMatchState.playerStats && f.liveMatchState.playerStats[p.id]) {
          const ps = f.liveMatchState.playerStats[p.id];
          const r = ps.runs || 0;
          const w = ps.wickets || 0;
          runs += r;
          balls += ps.balls || 0;
          wickets += w;
          runsConceded += ps.runsConceded || 0;
          ballsBowled += ps.ballsBowled || 0;
          if (ps.dismissed) dismissals += 1;
          matches += 1;

          if (r >= 100) centuries += 1;
          else if (r >= 50) halfCenturies += 1;

          if (w >= 5) fiveWickets += 1;
        }
      });

      // Batting Average
      let battingAvg = '0.00';
      if (dismissals > 0) {
        battingAvg = (runs / dismissals).toFixed(2);
      } else if (runs > 0) {
        battingAvg = `${runs}*`;
      }

      // Bowling Economy
      let economy = '0.00';
      if (ballsBowled > 0) {
        economy = ((runsConceded / ballsBowled) * 6).toFixed(2);
      }

      // Total Performance Points (with milestone bonuses!)
      let points = runs * 1 + wickets * 25 + matches * 10 + (halfCenturies * 8) + (centuries * 16) + (fiveWickets * 16);

      return {
        id: p.id,
        name: p.name,
        phone: p.phone || '',
        photoUrl: p.photoUrl || p.player_photo_url || '',
        category: p.category || p.playingType || 'All Rounder',
        village: p.village || 'Jhankra',
        battingStyle: p.battingStyle || 'Right Hand Bat',
        bowlingStyle: p.bowlingStyle || 'Right Arm Medium',
        runs,
        wickets,
        matches,
        battingAvg,
        economy,
        points,
        centuries,
        halfCenturies,
        fiveWickets
      };
    });

    list.sort((a, b) => b.points - a.points);

    const filtered = searchQuery ? list.filter(item => 
      item.name.toLowerCase().includes(searchQuery) || 
      item.phone.includes(searchQuery)
    ) : list;

    container.innerHTML = `
      <div class="space-y-6 sm:space-y-8 animate-fade-in pb-16">
        <!-- Header -->
        <div class="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-6 rounded-2xl shadow-xl">
          <h1 class="text-xl sm:text-2xl font-black text-white">📊 Lifetime Career Hub</h1>
          <p class="text-xs text-emerald-100 mt-1">View real-time player standings and performance metrics compiled directly from completed matches.</p>
        </div>

        <!-- Search Bar -->
        <div class="relative max-w-md mx-auto">
          <input type="text" id="career-search-query-input" value="${searchQuery}" placeholder="🔍 Search player by name or phone number..." class="w-full bg-white border-2 border-slate-200 text-slate-800 text-xs rounded-xl p-3 pl-4 focus:outline-none focus:border-emerald-500 font-bold placeholder-slate-400 shadow-sm" />
        </div>

        <!-- White Leaderboard Table -->
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead class="bg-slate-50 font-bold text-[10px] uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th class="py-3.5 px-4 text-center w-12">RANK</th>
                  <th class="py-3.5 px-3">PLAYER</th>
                  <th class="py-3.5 px-3">CONTACT</th>
                  <th class="py-3.5 px-3 text-center">MATCHES</th>
                  <th class="py-3.5 px-3 text-center text-amber-700">RUNS</th>
                  <th class="py-3.5 px-3 text-center">BAT AVG</th>
                  <th class="py-3.5 px-3 text-center text-sky-700">WKTS</th>
                  <th class="py-3.5 px-3 text-center">ECON</th>
                  <th class="py-3.5 px-3 text-center text-emerald-600">POINTS</th>
                  <th class="py-3.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="10" class="py-8 text-center text-slate-400 text-xs">No active players found</td>
                  </tr>
                ` : filtered.map((p, idx) => {
                  const rank = idx + 1;
                  return `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="py-3.5 px-4 text-center font-black">
                        <span class="inline-flex w-5 h-5 rounded-full ${rank === 1 ? 'bg-amber-500 text-slate-950 font-black' : rank === 2 ? 'bg-slate-300 text-slate-900 font-black' : rank === 3 ? 'bg-amber-700 text-white font-black' : 'bg-slate-100 text-slate-500'} items-center justify-center text-[10px] shadow-sm">
                          ${rank}
                        </span>
                      </td>
                      <td class="py-3.5 px-3">
                        <div class="flex items-center gap-2.5">
                          <img src="${p.photoUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' rx=\'20\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E'}" class="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                          <div>
                            <div class="font-black text-slate-900 text-xs sm:text-sm leading-tight">${p.name}</div>
                            <div class="text-[9px] text-slate-400">${p.category}</div>
                          </div>
                        </div>
                      </td>
                      <td class="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                        ${p.phone ? p.phone.substring(0, 3) + '*****' + p.phone.substring(p.phone.length - 3) : 'N/A'}
                      </td>
                      <td class="py-3.5 px-3 text-center font-mono">${p.matches}</td>
                      <td class="py-3.5 px-3 text-center font-black font-mono text-amber-700">${p.runs}</td>
                      <td class="py-3.5 px-3 text-center font-mono text-slate-600">${p.battingAvg}</td>
                      <td class="py-3.5 px-3 text-center font-black font-mono text-sky-700">${p.wickets}</td>
                      <td class="py-3.5 px-3 text-center font-mono text-slate-600">${p.economy}</td>
                      <td class="py-3.5 px-3 text-center font-black font-mono text-emerald-600 text-sm">${p.points}</td>
                      <td class="py-3.5 px-4 text-right">
                        <button class="view-career-detail-btn px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[10px] rounded-lg border border-slate-350 shadow-sm transition-colors" data-id="${p.id}">
                          Profile
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const inputEl = document.getElementById('career-search-query-input');
    if (inputEl) {
      inputEl.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        drawCareerHub();
        const activeInput = document.getElementById('career-search-query-input');
        if (activeInput) {
          activeInput.focus();
          activeInput.setSelectionRange(activeInput.value.length, activeInput.value.length);
        }
      });
    }

    container.querySelectorAll('.view-career-detail-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const playerId = e.currentTarget.getAttribute('data-id');
        openCareerDetailModal(playerId);
      });
    });
  };

  drawCareerHub();
}

function openCareerDetailModal(playerId) {
  const playerReg = store.getPlayers().find(p => p.id === playerId);
  if (!playerReg) return;

  const phone = (playerReg.phone || '').trim();
  
  let profile = store.getPlayerProfiles().find(pp => (pp.phone || '').trim() === phone);
  if (!profile) {
    profile = {
      id: playerReg.id,
      name: playerReg.name,
      phone: playerReg.phone,
      photoUrl: playerReg.photoUrl || playerReg.player_photo_url || '',
      village: playerReg.village || 'Jhankra',
      battingStyle: playerReg.battingStyle || 'Right Hand Bat',
      bowlingStyle: playerReg.bowlingStyle || 'Right Arm Medium',
      category: playerReg.category || playerReg.playingType || 'All Rounder'
    };
  }

  const allRegistrations = store.getPlayers().filter(p => (p.phone || '').trim() === phone);
  const fixtures = store.getFixtures();
  const completedFixtures = fixtures.filter(f => f.status === 'COMPLETED');
  
  let totalRuns = 0;
  let totalWickets = 0;
  let matchesCount = 0;
  let runsConceded = 0;
  let ballsBowled = 0;
  let dismissals = 0;
  let centuries = 0;
  let halfCenturies = 0;
  let fiveWickets = 0;

  completedFixtures.forEach(f => {
    if (f.liveMatchState && f.liveMatchState.playerStats && f.liveMatchState.playerStats[profile.id]) {
      const ps = f.liveMatchState.playerStats[profile.id];
      const r = ps.runs || 0;
      const w = ps.wickets || 0;
      totalRuns += r;
      totalWickets += w;
      runsConceded += ps.runsConceded || 0;
      ballsBowled += ps.ballsBowled || 0;
      if (ps.dismissed) dismissals += 1;
      matchesCount += 1;

      if (r >= 100) centuries += 1;
      else if (r >= 50) halfCenturies += 1;

      if (w >= 5) fiveWickets += 1;
    }
  });

  // Batting Average
  let battingAvg = '0.00';
  if (dismissals > 0) {
    battingAvg = (totalRuns / dismissals).toFixed(2);
  } else if (totalRuns > 0) {
    battingAvg = `${totalRuns}*`;
  }

  // Bowling Economy
  let economy = '0.00';
  if (ballsBowled > 0) {
    economy = ((runsConceded / ballsBowled) * 6).toFixed(2);
  }

  const seasonalTimeline = allRegistrations.map(reg => {
    const teamId = reg.teamId;
    const team = store.getTeamById(teamId);
    
    // Get team matches stats
    let regRuns = 0;
    let regWickets = 0;
    let regMatches = 0;

    if (teamId) {
      const teamMatches = completedFixtures.filter(f => f.teamAId === teamId || f.teamBId === teamId);
      teamMatches.forEach(f => {
        if (f.liveMatchState && f.liveMatchState.playerStats && f.liveMatchState.playerStats[profile.id]) {
          const ps = f.liveMatchState.playerStats[profile.id];
          regRuns += ps.runs || 0;
          regWickets += ps.wickets || 0;
          regMatches += 1;
        }
      });
    }

    return {
      leagueCode: reg.leagueCategory || 'JSL',
      year: 2026,
      teamName: team ? team.name : 'Unassigned / Free Agent',
      matches: regMatches,
      runs: regRuns,
      wickets: regWickets
    };
  });

  document.getElementById('career-detail-modal')?.remove();

  const modalHtml = `
    <div id="career-detail-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div class="bg-white border border-slate-200 max-w-sm w-full p-5 relative space-y-4 rounded-2xl shadow-2xl text-slate-800 text-center modal-content-container">
        <button id="close-career-detail-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="flex flex-col items-center space-y-3 pb-4 border-b border-slate-200">
          <div class="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-250 bg-slate-50 flex items-center justify-center">
            <img src="${profile.photoUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' rx=\'20\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E'}" class="w-full h-full object-cover" />
          </div>
          <div>
            <span class="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-black text-[9px] uppercase tracking-wider">Player Profile</span>
            <h3 class="text-base sm:text-lg font-black text-slate-900 leading-tight mt-1.5">${profile.name}</h3>
            <div class="text-xs text-slate-500 font-bold mt-1">📍 Village: ${profile.village || 'Jhankra'}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-650">
          <div><span class="text-slate-400 font-bold">Batting:</span> <span class="text-slate-800 font-black">${profile.battingStyle || 'Right Hand'}</span></div>
          <div><span class="text-slate-400 font-bold">Bowling:</span> <span class="text-slate-800 font-black">${profile.bowlingStyle || 'Right Arm'}</span></div>
        </div>

        <div class="space-y-2">
          <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lifetime Stats</div>
          <div class="grid grid-cols-5 gap-1.5 text-center">
            <div class="bg-slate-50 p-2 border border-slate-200 rounded-xl">
              <span class="text-[8px] text-slate-500 uppercase font-semibold">MAT</span>
              <div class="text-sm font-black text-slate-900 mt-0.5">${matchesCount}</div>
            </div>
            <div class="bg-slate-50 p-2 border border-slate-200 rounded-xl">
              <span class="text-[8px] text-slate-500 uppercase font-semibold">RUNS</span>
              <div class="text-sm font-black text-amber-700 mt-0.5">${totalRuns}</div>
            </div>
            <div class="bg-slate-50 p-2 border border-slate-200 rounded-xl">
              <span class="text-[8px] text-slate-500 uppercase font-semibold">AVG</span>
              <div class="text-sm font-black text-slate-900 mt-0.5">${battingAvg}</div>
            </div>
            <div class="bg-slate-50 p-2 border border-slate-200 rounded-xl">
              <span class="text-[8px] text-slate-500 uppercase font-semibold">WKT</span>
              <div class="text-sm font-black text-sky-700 mt-0.5">${totalWickets}</div>
            </div>
            <div class="bg-slate-50 p-2 border border-slate-200 rounded-xl">
              <span class="text-[8px] text-slate-500 uppercase font-semibold">ECON</span>
              <div class="text-sm font-black text-slate-900 mt-0.5">${economy}</div>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Milestones</div>
          <div class="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-700">
            <div class="bg-amber-50/50 p-2 border border-amber-250 rounded-xl">
              <span class="text-[8px] text-amber-800 uppercase block font-bold">100s</span>
              <span class="text-sm font-black text-slate-900">${centuries}</span>
            </div>
            <div class="bg-amber-50/50 p-2 border border-amber-250 rounded-xl">
              <span class="text-[8px] text-amber-800 uppercase block font-bold">50s</span>
              <span class="text-sm font-black text-slate-900">${halfCenturies}</span>
            </div>
            <div class="bg-sky-50/50 p-2 border border-sky-250 rounded-xl">
              <span class="text-[8px] text-sky-850 uppercase block font-bold">5W Hauls</span>
              <span class="text-sm font-black text-slate-900">${fiveWickets}</span>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">League Timeline</div>
          <div class="relative pl-3 border-l border-slate-200 space-y-3 max-h-[25vh] overflow-y-auto pr-1">
            ${seasonalTimeline.map(time => `
              <div class="relative text-xs">
                <span class="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white shadow"></span>
                <div>
                  <div class="font-black text-slate-800">${time.year} — ${time.leagueCode} (${time.teamName})</div>
                  <div class="text-[9px] text-slate-550 mt-0.5">
                    Matches: ${time.matches} • Runs: ${time.runs} • Wickets: ${time.wickets}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <button id="close-career-detail-btn-bottom" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-colors">
          Close Profile
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('career-detail-modal')?.remove();
  document.getElementById('close-career-detail-btn')?.addEventListener('click', removeModal);
  document.getElementById('close-career-detail-btn-bottom')?.addEventListener('click', removeModal);
}

function openTeamSquadModal(team) {
  const players = store.getPlayers().filter(p => p.teamId === team.id);
  const totalSpent = players.reduce((sum, p) => sum + (p.soldPrice || 0), 0);

  document.getElementById('team-squad-view-modal')?.remove();

  const modalHtml = `
    <div id="team-squad-view-modal" class="fixed inset-0 z-[60] modal-overlay flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
      <div class="bg-slate-900 border border-slate-800 max-w-md w-full p-4 relative space-y-4 animate-fade-in rounded-2xl shadow-2xl text-white text-left">
        <button id="close-squad-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div class="w-12 h-12 rounded-xl bg-white border border-slate-700 flex items-center justify-center overflow-hidden shadow-md">
            ${team.logoUrl ? `<img src="${team.logoUrl}" class="w-full h-full object-cover" />` : '🛡️'}
          </div>
          <div>
            <h3 class="text-base font-black text-white leading-tight">${team.name} Squad</h3>
            <div class="text-[10px] text-amber-400 font-mono mt-0.5">
              Roster: ${players.length} / 13 | Purse Spent: ₹ ${totalSpent}
            </div>
          </div>
        </div>

        <div class="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
          ${players.length === 0 ? `
            <div class="text-center py-8 text-xs text-slate-500 italic">No players purchased yet in this auction.</div>
          ` : players.map(p => `
            <div class="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-850">
              <div class="flex items-center gap-2.5">
                <img src="${p.photoUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' rx=\'20\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E'}" class="w-9 h-9 rounded-lg object-cover border border-slate-700" />
                <div>
                  <div class="text-xs font-black text-white">${p.name}</div>
                  <div class="text-[9px] text-slate-400">${p.category || p.playingType}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs font-black text-amber-400">₹ ${p.soldPrice}</div>
                <div class="text-[8px] text-slate-500">Buy Price</div>
              </div>
            </div>
          `).join('')}
        </div>

        <button id="close-squad-modal-bottom-btn" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow border border-slate-700">
          Back to Teams
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('team-squad-view-modal')?.remove();
  document.getElementById('close-squad-modal-btn')?.addEventListener('click', removeModal);
  document.getElementById('close-squad-modal-bottom-btn')?.addEventListener('click', removeModal);
}

// --- DYNAMIC ADVERTISEMENT POPUP & SHOP DETAIL VIEWS ---

window.closeAdPopupDirect = function() {
  const modal = document.getElementById('ad-popup-modal');
  if (modal) modal.remove();

  // Show the next pending ad popup if any remain in queue
  if (window.pendingAdShopIds && window.pendingAdShopIds.length > 0) {
    setTimeout(() => {
      showNextAdPopup();
    }, 600);
  }
};

window.closeAdPopup = function(event) {
  if (event.target.id === 'ad-popup-modal') {
    window.closeAdPopupDirect();
  }
};

window.viewAdDetails = function(shopId) {
  window.closeAdPopupDirect();
  selectedShopId = shopId;
  navigate('shop-detail');
};

window.navigateBackToHome = function() {
  navigate('landing');
};

async function checkAndShowAdvertisementPopup() {
  try {
    const settings = await fetchPopupSettingsFromFirebase();
    if (!settings || !settings.isAdPopupEnabled) return;

    // Check expiry for snooze
    if (settings.adExpiryTime && Date.now() < settings.adExpiryTime) {
      console.log("Ad popup is currently paused/snoozed by admin.");
      return;
    }

    // Determine shop list to show
    let shopIds = settings.promotedShopIds;
    if (!shopIds || shopIds.length === 0) {
      shopIds = [settings.promotedShopId || 'maa-laxmi-kitchen'];
    }

    // Load sequential queue
    window.pendingAdShopIds = [...shopIds];
    showNextAdPopup();
  } catch (err) {
    console.warn("Failed to trigger ad popup:", err);
  }
}

function showNextAdPopup() {
  if (!window.pendingAdShopIds || window.pendingAdShopIds.length === 0) return;
  const nextShopId = window.pendingAdShopIds.shift();
  showAutoAdPopupSingle(nextShopId);
}

function showAutoAdPopupSingle(shopId) {
  const shop = shops.find(s => s.id === shopId);
  if (!shop) return;

  // Prevent multiple ads overlapping
  if (document.getElementById('ad-popup-modal')) return;

  const modalHtml = `
    <div id="ad-popup-modal" onclick="window.closeAdPopup(event)" class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="relative w-full max-w-[92%] sm:max-w-md md:max-w-lg overflow-hidden rounded-3xl border-2 border-amber-400 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        
        <!-- Close 'X' Button -->
        <button onclick="window.closeAdPopupDirect()" class="absolute top-3 right-3 z-30 p-1.5 bg-white/90 hover:bg-white text-slate-500 hover:text-slate-800 rounded-full transition-colors border border-slate-200">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <!-- Dynamic Header Image - Fully visible container with object-contain to show all text -->
        <div class="relative w-full bg-white border-b border-slate-100 flex items-center justify-center overflow-hidden">
          <img src="${shop.image}" class="w-full h-auto object-contain mx-auto max-h-[42vh]" alt="${shop.name}">
        </div>

        <!-- Details -->
        <div class="p-4 sm:p-6 space-y-3 sm:space-y-4 bg-white">
          <div>
            <h3 class="text-lg sm:text-2xl font-black text-slate-900 leading-tight">${shop.name}</h3>
            <p class="text-[9px] sm:text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
              ${shop.type === 'restaurant' ? '🍴 Restaurant / Home Delivery' : shop.type === 'rice' ? '🌾 Rice Mill & Wholesale' : '🛠️ Hardware & Sanitation'}
            </p>
          </div>

          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">${shop.shortDesc}</p>

          <div class="flex space-x-3 pt-1">
            <!-- Cancel / Dismiss -->
            <button onclick="window.closeAdPopupDirect()" class="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 font-bold text-xs sm:text-sm transition-all bg-white">
              Maybe Later
            </button>
            <!-- View Details Page -->
            <button onclick="window.viewAdDetails('${shop.id}')" class="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-2">
              <span>View Details</span>
              <i data-lucide="external-link" class="w-4 h-4 text-slate-950"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();
}

function renderShopDetailsView(containerEl) {
  const shop = shops.find(s => s.id === selectedShopId);
  if (!shop) {
    containerEl.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=Hind+Siliguri:wght@400;600;700&display=swap');
        .bengali-stylish {
          font-family: 'Sabir Samira Unicode', 'Hind Siliguri', 'SolaimanLipi', 'Siyam Rupali', sans-serif;
        }
      </style>
      <div class="text-center py-12 text-slate-500 text-sm bg-white rounded-3xl border border-slate-200 bengali-stylish">
        দোকানের তথ্য পাওয়া যায়নি। (Shop details not found)
      </div>
    `;
    return;
  }

  // Generate Detail Page
  let rightColumnHtml = '';
  if (shop.type === 'restaurant') {
    const categories = [
      { key: 'biryani', title: '🍗 বিরিয়ানি কালেকশন (Biryani Selection)' },
      { key: 'rolls', title: '🌯 ক্রিসপি রোলস (Crispy Rolls)' },
      { key: 'chowmin', title: '🍜 স্পেশাল চাউমিন (Chowmein)' },
      { key: 'moglai', title: '🥞 মোগলাই পরোটা (Moglai Special)' },
      { key: 'momos', title: '🥟 স্টিমড ও ফ্রাইড মোমো (Momos)' },
      { key: 'chickenSpecials', title: '🐔 চিকেন স্পেশাল প্রিপারেশন' },
      { key: 'tarka', title: '🍳 মুখরোচক ডাল তরকা (Tarka)' },
      { key: 'breads', title: '🫓 গরম গরম রুটি ও পরোটা (Breads)' }
    ];

    rightColumnHtml = `
      <div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div class="flex items-center space-x-2">
            <i data-lucide="book-open" class="text-amber-600 w-5 h-5"></i>
            <h3 class="font-black text-slate-900 text-base sm:text-xl">🍽️ মা লক্ষ্মী স্পেশাল মেনু কার্ড</h3>
          </div>
          ${shop.menuImage ? `
            <a href="${shop.menuImage}" target="_blank" class="inline-flex items-center text-xs font-black text-amber-600 hover:text-amber-700 transition-colors border border-amber-500/20 px-3 py-1.5 rounded-lg bg-amber-500/5 shadow-sm no-underline">
              📄 আসল মেনু কার্ড দেখুন <i data-lucide="external-link" class="w-3.5 h-3.5 ml-1"></i>
            </a>
          ` : ''}
        </div>

        ${categories.map(cat => {
          const items = shop.menu[cat.key];
          if (!items || items.length === 0) return '';
          return `
            <div class="space-y-3">
              <h4 class="text-xs font-black uppercase tracking-wider text-amber-600 border-l-2 border-amber-600 pl-2 mt-4 flex items-center gap-1">${cat.title}</h4>
              <div class="grid grid-cols-1 gap-2.5">
                ${items.map(item => `
                  <div class="flex items-center gap-3 bg-slate-50 hover:bg-slate-100/80 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-150 transition-all duration-200">
                    <img src="${item.img}" class="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg sm:rounded-xl border border-slate-200 flex-shrink-0 shadow-sm" alt="${item.name}">
                    <div class="flex-grow min-w-0">
                      <p class="font-extrabold text-slate-900 text-xs sm:text-sm truncate">${item.name}</p>
                      <p class="text-[9px] sm:text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2">${item.desc || ''}</p>
                    </div>
                    <span class="text-amber-600 font-extrabold text-[10px] sm:text-xs bg-amber-500/10 px-2 sm:px-3 py-1 rounded-lg border border-amber-500/25 whitespace-nowrap">${item.price}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (shop.type === 'rice') {
    rightColumnHtml = `
      <div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div class="flex items-center space-x-2">
            <i data-lucide="leaf" class="text-emerald-600 w-5 h-5 animate-pulse"></i>
            <h3 class="font-black text-slate-900 text-base sm:text-xl">🌾 উপলব্ধ চালের বৈচিত্র্যসমূহ (Available Rice Varieties)</h3>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3">
          ${shop.riceTypes.map(item => `
            <div class="flex items-center gap-3 bg-slate-50 hover:bg-slate-100/80 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-150 transition-all duration-200">
              <img src="${item.img}" class="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg sm:rounded-xl border border-slate-200 flex-shrink-0 shadow-sm" alt="${item.name}">
              <div class="flex-grow min-w-0">
                <p class="font-extrabold text-slate-900 text-xs sm:text-sm truncate">${item.name}</p>
                <p class="text-[9px] sm:text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2">${item.desc || ''}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Order Note -->
        <div class="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/50 text-emerald-800 text-xs font-semibold leading-relaxed flex items-start gap-2">
          <i data-lucide="info" class="w-4 h-4 text-emerald-605 shrink-0 mt-0.5 animate-bounce"></i>
          <span>বাজারের দর পরিবর্তনশীল হওয়ায় এখানে মূল্যতালিকা দেওয়া হয়নি। বর্তমান বাজার মূল্য জানতে ও অর্ডার করতে অনুগ্রহ করে পাশের দেওয়া <strong>যোগাযোগ নম্বরসমূহে কল করুন</strong>।</span>
        </div>
      </div>
    `;
  } else {
    // Hardware products
    rightColumnHtml = `
      <div class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-6 shadow-sm">
        <div class="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <i data-lucide="shopping-bag" class="text-amber-600 w-5 h-5"></i>
          <h3 class="font-black text-slate-900 text-base sm:text-xl">🛠️ উপলব্ধ প্রোডাক্ট ও সুবিধাসমূহ</h3>
        </div>

        <div class="grid grid-cols-1 gap-2.5">
          ${shop.products.map(item => `
            <div class="flex justify-between items-center bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl sm:rounded-2xl border border-slate-150 transition-all duration-200">
              <div class="space-y-1">
                <span class="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[8px] sm:text-[9px] uppercase tracking-wider">${item.category}</span>
                <p class="font-extrabold text-slate-900 text-xs sm:text-sm mt-1">${item.name}</p>
                <p class="text-[9px] sm:text-[10px] text-slate-500">${item.spec}</p>
              </div>
              <span class="text-emerald-600 font-extrabold text-[9px] sm:text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25">${item.type}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  containerEl.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=Hind+Siliguri:wght@400;600;700&display=swap');
      .bengali-stylish {
        font-family: 'Sabir Samira Unicode', 'Hind Siliguri', 'SolaimanLipi', 'Siyam Rupali', sans-serif;
      }
    </style>
    <div class="w-full max-w-5xl mx-auto space-y-5 sm:space-y-8 animate-fade-in py-3 sm:py-6 px-2 sm:px-4 bg-slate-50 text-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl bengali-stylish">
      
      <!-- Back navigation button -->
      <button onclick="window.navigateBackToHome()" class="inline-flex items-center text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors bg-white hover:bg-slate-100 border border-slate-300 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-sm">
        <i data-lucide="arrow-left" class="w-4 h-4 mr-2"></i> 🏠 হোমপেজে ফিরে যান
      </button>

      <!-- Shop Cover & Header -->
      <div class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-md">
        <img src="${shop.image}" class="w-full h-36 sm:h-56 md:h-72 object-cover opacity-90" alt="${shop.name}">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
        
        <div class="absolute bottom-3 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 space-y-1 text-white">
          <span class="inline-block px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-bold tracking-wide uppercase bg-amber-500 text-slate-950 shadow-md">
            ${shop.type === 'restaurant' ? '🍴 রেস্তোরাঁ পার্টনার' : shop.type === 'rice' ? '🌾 চালের আড়ত পার্টনার' : '🛠️ হার্ডওয়্যার পার্টনার'}
          </span>
          <h1 class="text-lg sm:text-3xl font-black drop-shadow-md text-white">${shop.name}</h1>
          <p class="text-slate-200 max-w-3xl text-[10px] sm:text-sm leading-relaxed drop-shadow-sm line-clamp-2 sm:line-clamp-none">${shop.description}</p>
        </div>
      </div>

      <!-- Layout Grid (Stacks on mobile, displays side-by-side on sm tablet/landscape mobile screens >= 640px) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        
        <!-- Info Column -->
        <div class="sm:col-span-1 space-y-4">
          
          <!-- Contact details (Leaf shape border, light amber background) -->
          <div class="rounded-tr-[35px] rounded-bl-[35px] sm:rounded-tr-[45px] sm:rounded-bl-[45px] rounded-tl-xl rounded-br-xl border-2 border-dashed border-amber-400/50 bg-amber-50/70 p-4 sm:p-6 space-y-4 shadow-md transition-all duration-300 hover:shadow-lg">
            <h3 class="font-black text-amber-900 text-sm sm:text-base border-b border-amber-200/60 pb-2 flex items-center gap-1.5">
              <i data-lucide="info" class="text-amber-700 w-4 h-4"></i> 📋 দোকানের তথ্যাবলী
            </h3>
            
            <div class="space-y-3 sm:space-y-4">
              <div class="flex items-start space-x-2.5">
                <div class="p-1 bg-white rounded-lg text-amber-700 border border-amber-200 flex-shrink-0"><i data-lucide="user" class="w-3.5 h-3.5"></i></div>
                <div>
                  <p class="text-[8px] sm:text-[9px] text-slate-500 uppercase font-black tracking-wider">👤 স্বত্বাধিকারী / প্রোপ্রাইটর</p>
                  <p class="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">${shop.owner}</p>
                </div>
              </div>

              <div class="flex items-start space-x-2.5">
                <div class="p-1 bg-white rounded-lg text-amber-700 border border-amber-200 flex-shrink-0"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i></div>
                <div>
                  <p class="text-[8px] sm:text-[9px] text-slate-500 uppercase font-black tracking-wider">📍 ঠিকানা</p>
                  <p class="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5 leading-relaxed">${shop.address}</p>
                </div>
              </div>

              <div class="flex items-start space-x-2.5">
                <div class="p-1 bg-white rounded-lg text-amber-700 border border-amber-200 flex-shrink-0"><i data-lucide="phone-call" class="w-3.5 h-3.5"></i></div>
                <div class="w-full">
                  <p class="text-[8px] sm:text-[9px] text-slate-500 uppercase font-black tracking-wider mb-1">📞 অর্ডার ও যোগাযোগের নম্বর</p>
                  <div class="flex flex-col gap-1.5">
                    ${shop.phones.map(phone => `
                      <a href="tel:${phone}" class="group flex items-center justify-between px-2.5 py-1.5 bg-white text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg border border-amber-200/80 shadow-sm font-black text-xs sm:text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 no-underline">
                        <span class="flex items-center gap-1">
                          <i data-lucide="phone" class="w-3 h-3 text-amber-600 group-hover:text-white animate-pulse"></i>
                          <span>${phone}</span>
                        </span>
                        <i data-lucide="chevron-right" class="w-3 h-3 text-amber-500 group-hover:text-white opacity-85"></i>
                      </a>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Highlight Badges -->
          <div class="rounded-tl-[35px] rounded-br-[35px] sm:rounded-tl-[45px] sm:rounded-br-[45px] rounded-tr-xl rounded-bl-xl border-2 border-double border-emerald-400/50 bg-emerald-50/50 p-4 sm:p-6 space-y-4 shadow-md transition-all duration-300 hover:shadow-lg">
            <h4 class="font-black text-emerald-900 text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5">
              <i data-lucide="sparkles" class="text-emerald-700 w-3.5 h-3.5 animate-spin"></i> ⭐ বিশেষ সুবিধা ও অফার
            </h4>
            <div class="flex flex-col gap-2">
              ${shop.features.map(f => `
                <div class="text-xs bg-white text-slate-800 p-2.5 rounded-lg border border-emerald-100 flex items-start shadow-sm">
                  <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600 mr-1.5 mt-0.5 flex-shrink-0"></i>
                  <span class="leading-tight font-extrabold text-slate-700 text-xs">${f}</span>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- Dynamic Detailed Content -->
        <div class="sm:col-span-2">
          ${rightColumnHtml}
        </div>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}
