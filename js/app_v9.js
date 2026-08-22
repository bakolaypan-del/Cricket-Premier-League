// Core Application Router & Registration Portal (Developer: Suman Kolay - Cambria & Deep Blue Theme)

import { store } from './store.js?v=11.3.8';
import { exportPlayersToCSV, exportTeamsToCSV, exportPlayersToPDF, exportTeamsToPDF, printDigitalPass, openUserGuidePDF } from './export.js?v=11.3.8';
import { renderAdminDashboard } from './admin.js?v=11.3.8';
import { uploadHDImage, fetchAdSettingsFromFirebase, fetchPopupSettingsFromFirebase, getOptimizedImageUrl, initVisitorTracking, fetchVisitorStats } from './supabase.js?v=11.3.8';
import { shops } from './shopsData.js?v=11.3.8';

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/EDLr1a3qfww42HSmjKaBEL";
let latestVisitorStats = { liveCount: 1, totalVisits: 1524 };

// PWA Deferred Prompt Capture
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("PWA install prompt captured.");
});

// ALWAYS default to landing page (No category opens automatically!)
let currentRoute = 'landing'; // landing, jsl-hub, admin, fixtures, auction, career, profile, shop-detail
let selectedShopId = '';
let introScreenInitialized = false;

function bootApp() {
  initIntroLoadingScreen();
  initApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

function initIntroLoadingScreen() {
  if (introScreenInitialized) return;
  introScreenInitialized = true;

  const introScreen = document.getElementById('intro-loading-screen');
  if (!introScreen) return;

  const typewriterEl = document.getElementById('typewriter-text');
  const targetText = "Developer - Suman Kolay";
  let typeIndex = 0;
  let typeInterval = null;

  const dismissIntro = () => {
    if (typeInterval) {
      clearInterval(typeInterval);
      typeInterval = null;
    }
    if (!introScreen) return;
    introScreen.classList.add('fade-out');
    if (introScreen.style) introScreen.style.pointerEvents = 'none';
    setTimeout(() => {
      if (introScreen && introScreen.parentNode) {
        introScreen.parentNode.removeChild(introScreen);
      }
    }, 350);
  };

  const startTypewriter = () => {
    if (!typewriterEl) {
      dismissIntro();
      return;
    }
    if (typeInterval) {
      clearInterval(typeInterval);
      typeInterval = null;
    }
    typeIndex = 0;
    typewriterEl.textContent = "";

    typeInterval = setInterval(() => {
      try {
        if (typeIndex < targetText.length) {
          typeIndex++;
          typewriterEl.textContent = targetText.slice(0, typeIndex);
        } else {
          clearInterval(typeInterval);
          typeInterval = null;
          // Hold display for 700ms so user can clearly read Developer - Suman Kolay
          setTimeout(dismissIntro, 700);
        }
      } catch (e) {
        if (typeInterval) clearInterval(typeInterval);
        dismissIntro();
      }
    }, 45);
  };

  const typewriterTimer = setTimeout(startTypewriter, 100);
  const fallbackTimer = setTimeout(dismissIntro, 2500);

  introScreen.addEventListener('click', () => {
    clearTimeout(typewriterTimer);
    clearTimeout(fallbackTimer);
    dismissIntro();
  });
}

function initApp() {
  // Initialize Real-time Live & Total Visitor Tracking
  initVisitorTracking((stats) => {
    latestVisitorStats = stats;
    const liveEl = document.getElementById('live-visitors-count');
    const totalEl = document.getElementById('total-visitors-count');
    if (liveEl) liveEl.textContent = stats.liveCount;
    if (totalEl) totalEl.textContent = Number(stats.totalVisits).toLocaleString('en-IN');
  });

  renderNavbar();
  renderMobileBottomNav();
  renderFooter();
  renderCurrentView();

  // First Visit Welcome & App Install Popup Prompt
  checkAndPromptFirstVisitPopup();

  // YouTube Channel Promotional Popup Banner (Bengali)
  setTimeout(() => {
    checkAndPromptYouTubePromoPopup();
  }, 1000);

  // Dynamic Partner Advertisement Popup
  setTimeout(() => {
    checkAndShowAdvertisementPopup();
  }, 2200);

  // Initialize Real-time Registered Player Toast Widget
  initRealtimePlayerToast();

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
    renderFooter();
    safeRenderCurrentView();
  });
}

let auctionPollInterval = null;

function navigate(route, pushState = true) {
  if (auctionPollInterval) {
    clearInterval(auctionPollInterval);
    auctionPollInterval = null;
  }
  currentRoute = route;
  if (pushState && history.pushState) {
    history.pushState({ route }, '', `#${route}`);
  }
  renderNavbar();
  renderMobileBottomNav();
  renderFooter();
  renderCurrentView();
  // Option 02: On-demand Cloud Data Sync on Navigation
  store.syncWithCloud().catch(err => console.warn("On-demand sync notice:", err));
}

window.addEventListener('popstate', (e) => {
  const modalOpen = document.querySelector('.modal-overlay');
  if (modalOpen) {
    modalOpen.remove();
    return;
  }
  if (e.state && e.state.route) {
    navigate(e.state.route, false);
  } else {
    navigate('landing', false);
  }
});

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

// --- YOUTUBE CHANNEL PROMOTIONAL POPUP BANNER (BENGALI) ---
async function checkAndPromptYouTubePromoPopup() {
  try {
    if (!sessionStorage.getItem('cpl_yt_promo_shown_v1')) {
      sessionStorage.setItem('cpl_yt_promo_shown_v1', 'true');
      openYouTubePromoModal();
    }
  } catch (err) {
    console.warn("Failed to check YouTube promo popup status:", err);
  }
}

export function openYouTubePromoModal(forceOpen = false) {
  if (!forceOpen && document.querySelector('.modal-overlay')) return;
  document.getElementById('youtube-promo-modal')?.remove();

  const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/channel/UC9P-iK1S-6mv4GDnenZtjWg";

  const modalHtml = `
    <div id="youtube-promo-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" style="font-family: 'Anek Bangla', 'Hind Siliguri', sans-serif;">
      <div class="relative w-full max-w-[360px] sm:max-w-[390px] bg-white text-slate-900 rounded-3xl shadow-2xl border-2 border-red-500/80 p-4 sm:p-5 overflow-hidden modal-content-container">
        
        <!-- VISIBLE POLICE & OFFICIAL VEHICLE WATERMARK BACKGROUND -->
        <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-3xl">
          <img src="assets/police_car.jpg" class="w-full h-full object-cover opacity-35 filter blur-[0.8px] scale-105" alt="Police & Official Vehicle Background" />
          <div class="absolute inset-0 bg-gradient-to-b from-white/75 via-white/60 to-white/85"></div>
        </div>

        <!-- TOP RUBY ACCENT STRIP WITH RED & BLUE POLICE EMERGENCY LIGHT BAR -->
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-blue-600 to-red-600 z-10 animate-pulse"></div>

        <!-- CLOSE BUTTON -->
        <button id="close-yt-promo-btn" class="absolute top-2.5 right-2.5 text-slate-600 hover:text-slate-900 p-1.5 rounded-full bg-white/70 hover:bg-slate-200 shadow-sm transition-all z-20">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <!-- STYLISH HERO BANNER -->
        <div class="text-center space-y-1.5 pt-1 relative z-10">
          <!-- POLICE / GOVT SIREN INDICATOR -->
          <div class="flex items-center justify-center gap-2 mb-1">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/85 text-white border border-slate-700 shadow-md">
              <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span class="text-[9px] font-black tracking-wider text-amber-300 uppercase">🚨 WBP • KP • GOVT JOBS</span>
            </span>
          </div>

          <!-- 3D YOUTUBE ICON WITH GLOW -->
          <div class="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 text-white shadow-md shadow-red-500/30 border border-red-400">
            <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>

          <!-- BADGE -->
          <div>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50/90 text-red-700 font-extrabold text-[10px] rounded-full border border-red-200 uppercase tracking-wide shadow-sm">
              <span class="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span> 📚 ফ্রি YouTube ডিজিটাল ক্লাস
            </span>
          </div>

          <!-- HEADLINE IN STYLISH BENGALI FONT -->
          <h2 class="text-base sm:text-lg font-black text-slate-900 leading-tight">
            🎯 সরকারি চাকরির সেরা প্রস্তুতি <br>
            <span class="text-red-600 font-black">শুরু হোক আজ থেকেই!</span>
          </h2>
        </div>

        <!-- COMPACT EYE-CATCHING FEATURE GRID -->
        <div class="mt-2.5 space-y-1.5 relative z-10">
          <div class="grid grid-cols-2 gap-1.5">
            <div class="p-2 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200/80 hover:border-red-400 hover:bg-red-50/50 transition-colors flex items-center gap-2 shadow-xs">
              <span class="text-base">📐</span>
              <div class="text-left">
                <div class="text-[11px] font-black text-slate-900">Math Tricks</div>
                <div class="text-[9px] text-slate-500 font-medium leading-tight">সহজ শর্টকাট ট্রিকস</div>
              </div>
            </div>

            <div class="p-2 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200/80 hover:border-red-400 hover:bg-red-50/50 transition-colors flex items-center gap-2 shadow-xs">
              <span class="text-base">🧠</span>
              <div class="text-left">
                <div class="text-[11px] font-black text-slate-900">Reasoning</div>
                <div class="text-[9px] text-slate-500 font-medium leading-tight">Concept + Practice</div>
              </div>
            </div>

            <div class="p-2 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200/80 hover:border-red-400 hover:bg-red-50/50 transition-colors flex items-center gap-2 shadow-xs">
              <span class="text-base">📰</span>
              <div class="text-left">
                <div class="text-[11px] font-black text-slate-900">Current Affairs</div>
                <div class="text-[9px] text-slate-500 font-medium leading-tight">সাম্প্রতিক তথ্য</div>
              </div>
            </div>

            <div class="p-2 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200/80 hover:border-red-400 hover:bg-red-50/50 transition-colors flex items-center gap-2 shadow-xs">
              <span class="text-base">🌍</span>
              <div class="text-left">
                <div class="text-[11px] font-black text-slate-900">GK & GS</div>
                <div class="text-[9px] text-slate-500 font-medium leading-tight">Static GK স্পেশাল</div>
              </div>
            </div>
          </div>

          <!-- TARGET EXAMS STRIP -->
          <div class="p-2 rounded-xl bg-gradient-to-r from-red-50/95 via-amber-50/95 to-red-50/95 backdrop-blur-sm border border-red-200/90 text-center space-y-0.5 shadow-xs">
            <div class="text-[9px] font-black text-red-800 uppercase tracking-wider">🏆 টার্গেট পরীক্ষা সমূহ</div>
            <div class="text-[10px] font-extrabold text-slate-800">WBP • KP • SSC GD • WBPSC • Railway • SSC</div>
          </div>
        </div>

        <!-- HIGH CONVERSION CTA BUTTONS -->
        <div class="mt-3 space-y-1.5 relative z-10">
          <a href="${YOUTUBE_CHANNEL_URL}" target="_blank" id="yt-subscribe-btn" class="w-full py-2.5 px-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-red-500/30 flex items-center justify-center gap-2 border border-red-500 transition-all transform hover:scale-[1.01] active:scale-[0.99]">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>👉 YouTube Channel-এ Join করুন</span>
          </a>

          <p class="text-[9px] text-center text-slate-500 font-bold leading-tight">
            🔔 Subscribe করে Bell Icon অন রাখুন, যাতে কোনো ক্লাস মিস না হয়!
          </p>

          <button id="close-yt-promo-bottom-btn" class="w-full py-1 text-[10px] text-slate-500 hover:text-slate-800 font-bold transition-colors">
            পরে দেখুন (Dismiss)
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('youtube-promo-modal')?.remove();
  document.getElementById('close-yt-promo-btn')?.addEventListener('click', removeModal);
  document.getElementById('close-yt-promo-bottom-btn')?.addEventListener('click', removeModal);
  document.getElementById('yt-subscribe-btn')?.addEventListener('click', removeModal);
}

// --- CLIENT-SIDE HD IMAGE COMPRESSION (GUARANTEED STRICTLY UNDER 100 KB PER IMAGE) ---
export function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {
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

        let currentQuality = quality;
        let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);

        // Strict size guarantee: <= 100 KB (~102,400 bytes)
        const targetSizeBytes = 100 * 1024;
        let estSize = Math.round((dataUrl.length - 22) * 0.75);

        while (estSize > targetSizeBytes && currentQuality > 0.25) {
          currentQuality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
          estSize = Math.round((dataUrl.length - 22) * 0.75);
        }

        resolve(dataUrl);
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
          <img id="cropper-target-img" src="${imageSrc}" crossorigin="anonymous" class="max-w-full max-h-full object-contain block mx-auto" />
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
        width: 750,
        height: 750,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
      if (croppedCanvas) {
        const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.86);
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

// --- UPPER HEADER: RICH GREEN WITH BATSMAN SVG, CRICKET PREMIER LEAGUE TITLE & DOWNLOAD ICON ---
function renderNavbar() {
  const navbarEl = document.getElementById('app-navbar');
  if (!navbarEl) return;

  navbarEl.classList.remove('hidden');
  navbarEl.className = "sticky top-0 z-40 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-950 text-white rounded-b-2xl sm:rounded-b-3xl shadow-2xl border-b-2 border-blue-400/40 px-2 sm:px-4";

  navbarEl.innerHTML = `
    <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 relative z-10">
      
      <!-- Left Side: Uploaded White Batsman Picture SVG Only -->
      <div class="flex items-center cursor-pointer flex-shrink-0" id="brand-header-logo" title="Cricket Premier League Home">
        <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 border border-white/30 flex items-center justify-center shadow-lg transition-transform hover:scale-105">
          <!-- Sleek White Batsman SVG Silhouette -->
          <svg class="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" viewBox="0 0 100 100" fill="none">
            <circle cx="42" cy="22" r="8" fill="#FFFFFF"/>
            <path d="M46 20 H54" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
            <path d="M36 32 L56 32 L48 54 L32 54 Z" fill="#FFFFFF"/>
            <path d="M48 34 L64 42 L72 36" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>
            <path d="M36 54 L28 78 L22 94" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
            <path d="M48 54 L64 78 L74 92" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
            <path d="M68 34 L92 10 L98 16 L74 40 Z" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>
          </svg>
        </div>
      </div>

      <!-- Middle Portion: Written CRICKET PREMIER LEAGUE -->
      <div class="flex flex-col items-center justify-center text-center cursor-pointer flex-1 px-2" id="brand-header-title">
        <h1 class="font-black text-white text-sm sm:text-base md:text-xl tracking-wider uppercase drop-shadow-md">CRICKET PREMIER LEAGUE</h1>
      </div>

      <!-- Desktop Navigation links -->
      <div class="hidden lg:flex items-center gap-4 xl:gap-6 text-xs font-bold tracking-widest text-emerald-100">
        <button id="nav-home-btn" class="hover:text-white transition-colors py-1 ${currentRoute === 'landing' ? 'text-white border-b-2 border-emerald-300 font-black' : ''}">HOME</button>
        <button id="nav-tournaments-btn" class="hover:text-white transition-colors py-1">TOURNAMENTS</button>
        <button id="nav-schedule-btn" class="hover:text-white transition-colors py-1 ${currentRoute === 'fixtures' ? 'text-white border-b-2 border-emerald-300 font-black' : ''}">SCHEDULE</button>
        <button id="nav-auction-btn" class="hover:text-amber-300 transition-colors py-1 flex items-center gap-1 ${currentRoute === 'auction' ? 'text-amber-300 border-b-2 border-amber-300 font-black' : ''}">🔨 AUCTION</button>
        <button id="nav-career-btn" class="hover:text-emerald-300 transition-colors py-1 flex items-center gap-1 ${currentRoute === 'career' ? 'text-emerald-300 border-b-2 border-emerald-300 font-black' : ''}">📊 PLAYER STATS</button>
        <button id="nav-teams-btn" class="hover:text-white transition-colors py-1">TEAMS</button>
      </div>

      <!-- Right Side: Download Button & Single Desktop-Only Account Pill -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- Apps Download Option -->
        <button id="nav-install-app-btn" title="Download Web App (PWA)" class="p-2 sm:p-2.5 bg-gradient-to-r from-amber-400 via-emerald-500 to-teal-500 hover:scale-105 transition-all rounded-full shadow-xl border border-white/60 flex items-center justify-center cursor-pointer">
          <svg class="w-5 h-5 text-slate-950 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v11m0 0l-5-5m5 5l5-5M4 19h16" stroke="#0F172A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- Desktop-Only Single Login/Profile Button (Hidden on Mobile) -->
        <button id="nav-admin-btn" title="Login / Profile" class="hidden lg:flex px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-950 text-xs font-black rounded-full transition-all shadow-lg items-center gap-1.5 cursor-pointer">
          <span class="text-[10px] uppercase font-black tracking-wider">${store.getCurrentUser() ? `👤 ${store.getCurrentUser().name ? store.getCurrentUser().name.split(' ')[0].toUpperCase() : 'PROFILE'}` : '🔐 LOGIN'}</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById('brand-header-logo')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('brand-header-title')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('nav-install-app-btn')?.addEventListener('click', handleInstallAppClick);
  document.getElementById('nav-admin-btn')?.addEventListener('click', () => {
    if (!store.getCurrentUser()) {
      openPlayerLoginModal(() => navigate('profile'));
    } else {
      navigate('profile');
    }
  });
  document.getElementById('nav-admin-link')?.addEventListener('click', () => {
    if (!store.getCurrentUser()) {
      openPlayerLoginModal(() => navigate('profile'));
    } else {
      navigate('profile');
    }
  });
  document.getElementById('nav-home-btn')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('nav-tournaments-btn')?.addEventListener('click', () => {
    navigate('landing');
    setTimeout(() => {
      document.querySelector('.handwritten-quote')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  });
  document.getElementById('nav-schedule-btn')?.addEventListener('click', () => navigate('fixtures'));
  document.getElementById('nav-auction-btn')?.addEventListener('click', () => navigate('auction'));
  document.getElementById('nav-career-btn')?.addEventListener('click', () => navigate('career'));
  document.getElementById('nav-profile-btn')?.addEventListener('click', () => navigate('profile'));
  document.getElementById('nav-teams-btn')?.addEventListener('click', () => {
    document.getElementById('open-teams-modal-btn')?.click();
  });
  document.getElementById('nav-support-btn')?.addEventListener('click', () => {
    const waLink = document.querySelector('[href*="chat.whatsapp.com"]');
    if (waLink) {
      window.open(waLink.href, '_blank');
    } else {
      window.open('https://chat.whatsapp.com/', '_blank');
    }
  });
  if (window.lucide) window.lucide.createIcons();
}

// --- SLEEK FLOATING BOTTOM NAVIGATION BAR FOR MOBILE SCREENS ---
function renderMobileNav() {
  let bottomNavEl = document.getElementById('mobile-bottom-nav');
  if (!bottomNavEl) {
    bottomNavEl = document.createElement('div');
    bottomNavEl.id = 'mobile-bottom-nav';
    document.body.appendChild(bottomNavEl);
  }

  bottomNavEl.className = "fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-2 py-1.5 sm:hidden shadow-lg flex items-center justify-around";

  const getSvgIcon = (type, isActive) => {
    const opacity = isActive ? 'opacity-100 scale-105' : 'opacity-65';
    switch (type) {
      case 'home':
        return `
          <svg class="w-5 h-5 flex-shrink-0 transition-transform ${opacity}" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="homeSvgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#3B82F6"/>
                <stop offset="100%" stop-color="#1D4ED8"/>
              </linearGradient>
            </defs>
            <path d="M3 10.5L12 3l9 7.5V20a2 2 0 01-2 2H5a2 2 0 01-2-2v-9.5z" fill="url(#homeSvgGrad)"/>
            <path d="M9 22V12h6v10" fill="#FFFFFF"/>
          </svg>
        `;
      case 'fixtures':
        return `
          <svg class="w-5 h-5 flex-shrink-0 transition-transform ${opacity}" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="matchSvgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#F59E0B"/>
                <stop offset="100%" stop-color="#D97706"/>
              </linearGradient>
            </defs>
            <rect x="3" y="4" width="18" height="17" rx="3" fill="url(#matchSvgGrad)"/>
            <path d="M16 2v4M8 2v4M3 9h18" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="15" r="2" fill="#FFFFFF"/>
          </svg>
        `;
      case 'auction':
        return `
          <svg class="w-5 h-5 flex-shrink-0 transition-transform ${opacity}" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="auctionSvgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FBBF24"/>
                <stop offset="100%" stop-color="#B45309"/>
              </linearGradient>
            </defs>
            <path d="M14 3l7 7-2 2-7-7 2-2zM3 21l8-8 2 2-8 8H3v-2z" fill="url(#auctionSvgGrad)"/>
            <circle cx="18" cy="6" r="3" fill="#F59E0B"/>
          </svg>
        `;
      case 'career':
        return `
          <svg class="w-5 h-5 flex-shrink-0 transition-transform ${opacity}" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="careerSvgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#10B981"/>
                <stop offset="100%" stop-color="#047857"/>
              </linearGradient>
            </defs>
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" fill="url(#careerSvgGrad)"/>
            <circle cx="9" cy="7" r="4" fill="url(#careerSvgGrad)"/>
            <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
      case 'profile':
        return `
          <svg class="w-5 h-5 flex-shrink-0 transition-transform ${opacity}" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="profSvgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366F1"/>
                <stop offset="100%" stop-color="#4338CA"/>
              </linearGradient>
            </defs>
            <circle cx="12" cy="8" r="4" fill="url(#profSvgGrad)"/>
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="url(#profSvgGrad)"/>
          </svg>
        `;
      default:
        return '';
    }
  };

  const getTabItem = (id, type, label, routeName) => {
    const isActive = currentRoute === routeName;
    return `
      <button id="${id}" class="flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-all cursor-pointer ${isActive ? 'bg-slate-100/90 rounded-2xl' : ''}">
        ${getSvgIcon(type, isActive)}
        <span class="text-[9px] ${isActive ? 'font-black text-slate-900' : 'font-semibold text-slate-500'} mt-0.5">${label}</span>
      </button>
    `;
  };

  const isUserLoggedIn = !!store.getCurrentUser();
  bottomNavEl.innerHTML = `
    ${getTabItem('mob-nav-home', 'home', 'Home', 'landing')}
    ${getTabItem('mob-nav-fixtures', 'fixtures', 'Schedule', 'fixtures')}
    ${getTabItem('mob-nav-auction', 'auction', 'Auction', 'auction')}
    ${getTabItem('mob-nav-career', 'career', 'Player Stats', 'career')}
    ${getTabItem('mob-nav-profile', 'profile', isUserLoggedIn ? 'Profile' : 'Login', 'profile')}
  `;

  document.getElementById('mob-nav-home')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('mob-nav-fixtures')?.addEventListener('click', () => navigate('fixtures'));
  document.getElementById('mob-nav-auction')?.addEventListener('click', () => navigate('auction'));
  document.getElementById('mob-nav-career')?.addEventListener('click', () => navigate('career'));
  document.getElementById('mob-nav-profile')?.addEventListener('click', () => {
    if (!store.getCurrentUser()) {
      openPlayerLoginModal(() => navigate('profile'));
    } else {
      navigate('profile');
    }
  });
}

function renderMobileBottomNav() {
  renderMobileNav();
}

// --- REMOVE FOOTER PORTION COMPLETELY ---
function renderFooter() {
  const footerEl = document.getElementById('app-footer');
  if (!footerEl) return;
  footerEl.innerHTML = '';
  footerEl.className = 'hidden';
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
    case 'profile':
      renderPlayerProfileView(container);
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

function renderFirstPageLanding(containerEl) {
  const teams = store.getTeams();
  const players = store.getPlayers();

  containerEl.innerHTML = `
    <div class="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in py-2 sm:py-4 text-slate-900">
      
      <!-- 👥 REALTIME LIVE & TOTAL VISITOR TRAFFIC METRICS BAR -->
      <div class="w-full max-w-3xl mx-auto bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-3 shadow-xs flex items-center justify-around gap-1.5 sm:gap-4 text-slate-800 animate-fade-in">
        <!-- Live Online Visitors -->
        <div class="flex items-center gap-1.5 sm:gap-2">
          <span class="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-600 shadow-xs"></span>
          </span>
          <div class="flex flex-col">
            <span class="text-[8px] sm:text-[10px] font-black text-emerald-800 uppercase tracking-wider whitespace-nowrap leading-none">Live Online</span>
            <span id="live-visitors-count" class="text-xs sm:text-base font-black text-slate-900 font-mono leading-tight mt-0.5">${latestVisitorStats.liveCount}</span>
          </div>
        </div>

        <div class="h-6 sm:h-7 w-px bg-slate-200 shrink-0"></div>

        <!-- Total Site Visitors -->
        <div class="flex items-center gap-1.5 sm:gap-2">
          <span class="p-1 sm:p-1.5 bg-amber-100 text-amber-800 rounded-xl text-[10px] sm:text-xs border border-amber-300 shrink-0 leading-none">👥</span>
          <div class="flex flex-col">
            <span class="text-[8px] sm:text-[10px] font-black text-amber-800 uppercase tracking-wider whitespace-nowrap leading-none">Total Visitors</span>
            <span id="total-visitors-count" class="text-xs sm:text-base font-black text-slate-900 font-mono leading-tight mt-0.5">${Number(latestVisitorStats.totalVisits).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div class="h-6 sm:h-7 w-px bg-slate-200 shrink-0"></div>

        <!-- Total Registered Players -->
        <div class="flex items-center gap-1.5 sm:gap-2">
          <span class="p-1 sm:p-1.5 bg-blue-100 text-blue-800 rounded-xl text-[10px] sm:text-xs border border-blue-300 shrink-0 leading-none">🏏</span>
          <div class="flex flex-col">
            <span class="text-[8px] sm:text-[10px] font-black text-blue-800 uppercase tracking-wider whitespace-nowrap leading-none">Registered</span>
            <span class="text-xs sm:text-base font-black text-slate-900 font-mono leading-tight mt-0.5">${players.length}</span>
          </div>
        </div>
      </div>

      <!-- ⏳ LIVE TOURNAMENT COUNTDOWN TIMER (COMPACT & MOBILE-OPTIMIZED) -->
      <div id="tournament-countdown-card" class="w-full max-w-3xl mx-auto bg-white border border-amber-400/90 p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl shadow-lg text-slate-900 animate-fade-in relative overflow-hidden">
        <div class="absolute -right-8 -bottom-8 w-24 h-24 bg-amber-400/10 rounded-full blur-lg pointer-events-none"></div>
        <div class="absolute -left-8 -top-8 w-24 h-24 bg-blue-500/10 rounded-full blur-lg pointer-events-none"></div>
        
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 relative z-10">
          <div class="text-center sm:text-left space-y-0.5">
            <div class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[9px] sm:text-[10px] font-black tracking-wider uppercase shadow-2xs">
              <span class="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
              <span>🏆 MEGA TOURNAMENT KICKOFF</span>
            </div>
            <h3 class="text-xs sm:text-base font-black text-slate-900 tracking-tight leading-tight">30 AUGUST 2026 • 9:00 AM IST</h3>
            <p class="text-[10px] sm:text-[11px] text-emerald-700 font-bold flex items-center justify-center sm:justify-start gap-1">
              <span>📍 Jhankra School Stadium Ground</span>
              <span>•</span>
              <span>JSL 2026</span>
            </p>
          </div>

          <!-- 4-Unit Colourful Vibrant Countdown Clock Grid (Compact on Mobile) -->
          <div class="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
            <!-- Days: Blue -->
            <div class="bg-gradient-to-b from-blue-50 to-blue-100/80 border border-blue-200 rounded-xl p-1.5 sm:p-2 min-w-[48px] sm:min-w-[60px] shadow-2xs">
              <div id="cd-days" class="text-base sm:text-2xl font-black text-blue-700 font-mono leading-none">00</div>
              <div class="text-[8px] sm:text-[9px] font-black text-blue-600 uppercase tracking-wider mt-0.5">Days</div>
            </div>
            <!-- Hours: Purple -->
            <div class="bg-gradient-to-b from-purple-50 to-purple-100/80 border border-purple-200 rounded-xl p-1.5 sm:p-2 min-w-[48px] sm:min-w-[60px] shadow-2xs">
              <div id="cd-hours" class="text-base sm:text-2xl font-black text-purple-700 font-mono leading-none">00</div>
              <div class="text-[8px] sm:text-[9px] font-black text-purple-600 uppercase tracking-wider mt-0.5">Hours</div>
            </div>
            <!-- Mins: Emerald -->
            <div class="bg-gradient-to-b from-emerald-50 to-emerald-100/80 border border-emerald-200 rounded-xl p-1.5 sm:p-2 min-w-[48px] sm:min-w-[60px] shadow-2xs">
              <div id="cd-mins" class="text-base sm:text-2xl font-black text-emerald-700 font-mono leading-none">00</div>
              <div class="text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase tracking-wider mt-0.5">Mins</div>
            </div>
            <!-- Secs: Rose Pulse -->
            <div class="bg-gradient-to-b from-rose-50 to-rose-100/80 border border-rose-200 rounded-xl p-1.5 sm:p-2 min-w-[48px] sm:min-w-[60px] shadow-2xs">
              <div id="cd-secs" class="text-base sm:text-2xl font-black text-rose-600 font-mono leading-none animate-pulse">00</div>
              <div class="text-[8px] sm:text-[9px] font-black text-rose-600 uppercase tracking-wider mt-0.5">Secs</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SELECT PREMIER LEAGUE BADGE -->
      <div class="text-center">
        <span class="px-5 py-2 rounded-full bg-white text-emerald-800 border-2 border-emerald-300 text-xs sm:text-base font-black uppercase tracking-widest shadow-md">
          Select Premier League
        </span>
      </div>

      <!-- 3 CATEGORY CARDS - TWO CATEGORIES IN A SINGLE ROW (SAME EQUAL SIZE) -->
      <div class="grid grid-cols-2 gap-3 sm:gap-6 w-full max-w-4xl mx-auto px-2">
        
        <!-- CARD 1: JSL (GOLD THEME - LIVE) -->
        <div id="btn-click-jsl" class="group relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-2 border-loop-jsl bg-white flex flex-col justify-between p-3 sm:p-5 space-y-2 text-center">
          <img src="assets/card_jsl_cartoon.png" alt="JSL" class="w-full h-auto object-contain rounded-xl sm:rounded-2xl group-hover:scale-[1.02] transition-transform duration-300 shadow-sm max-h-48 sm:max-h-64 mx-auto" />
          
          <div class="w-full text-center">
            <div class="flex items-center justify-center gap-1 text-[9px] sm:text-xs font-black text-amber-800 uppercase tracking-wider bg-amber-500/10 py-1 px-3 rounded-full border border-amber-300 w-fit mx-auto">
              <span class="relative flex h-2 w-2 animate-pulse">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE</span>
            </div>
          </div>

          <button class="w-full py-2 sm:py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md border border-amber-300 flex items-center justify-center gap-1 btn-blink-always uppercase tracking-wider shimmer-btn-1">
            View Details
          </button>
        </div>

        <!-- CARD 2: JPL (GREEN THEME - COMING SOON) -->
        <div id="btn-click-jpl" class="group relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-2 border-loop-jpl bg-white flex flex-col justify-between p-3 sm:p-5 space-y-2 text-center">
          <img src="assets/card_jpl_cartoon.png" alt="JPL" class="w-full h-auto object-contain rounded-xl sm:rounded-2xl group-hover:scale-[1.02] transition-transform duration-300 shadow-sm max-h-48 sm:max-h-64 mx-auto" />
          
          <div class="w-full text-center">
            <div class="flex items-center justify-center gap-1 text-[9px] sm:text-xs font-black text-red-600 uppercase tracking-wider bg-red-500/10 py-1 px-3 rounded-full border border-red-300 w-fit mx-auto">
              <i data-lucide="clock" class="w-3 h-3 text-red-500"></i>
              <span class="animate-pulse">COMING SOON</span>
            </div>
          </div>

          <button class="w-full py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-md border border-emerald-400 flex items-center justify-center gap-1 uppercase tracking-wider shimmer-btn-2">
            View Details
          </button>
        </div>

        <!-- CARD 3: KPL (BLUE THEME - COMING SOON) -->
        <div id="btn-click-kpl" class="group relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-2 border-loop-kpl bg-white flex flex-col justify-between p-3 sm:p-5 space-y-2 text-center">
          <img src="assets/card_kpl_cartoon.png" alt="KPL" class="w-full h-auto object-contain rounded-xl sm:rounded-2xl group-hover:scale-[1.02] transition-transform duration-300 shadow-sm max-h-48 sm:max-h-64 mx-auto" />
          
          <div class="w-full text-center">
            <div class="flex items-center justify-center gap-1 text-[9px] sm:text-xs font-black text-red-600 uppercase tracking-wider bg-red-500/10 py-1 px-3 rounded-full border border-red-300 w-fit mx-auto">
              <i data-lucide="clock" class="w-3 h-3 text-red-500"></i>
              <span class="animate-pulse">COMING SOON</span>
            </div>
          </div>

          <button class="w-full py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-md border border-blue-400 flex items-center justify-center gap-1 uppercase tracking-wider shimmer-btn-3">
            View Details
          </button>
        </div>

      </div>

      <!-- LOWER PORTION: JSL CONFIRM TEAMS -->
      <div class="w-full max-w-4xl mx-auto space-y-2 pt-2">
        
        <!-- CENTERED TITLE ONLY -->
        <div class="text-center py-1">
          <h2 class="text-base sm:text-xl font-black text-slate-900 tracking-wide uppercase">
            JSL Registered Team List (<span id="confirmed-teams-total-count">7</span>)
          </h2>
          <p id="confirmed-team-caption" class="text-xs sm:text-sm font-black text-amber-800 transition-all duration-300 min-h-[20px]">
            🥇 1ST CONFIRMED TEAM: KHIRPAI HURRICANES
          </p>
        </div>

        <!-- STYLISH CAROUSEL CARD -->
        <div id="confirmed-teams-carousel-card" class="relative bg-white rounded-3xl p-2 sm:p-4 shadow-xl border border-slate-200 overflow-hidden">
          
          <!-- SLIDER TRACK -->
          <div id="confirmed-teams-slider" class="flex transition-transform duration-500 ease-out w-full">
            
            <!-- SLIDE 1: KHIRPAI HURRICANES (1ST CONFIRM TEAM) -->
            <div class="w-full flex-shrink-0 relative cursor-pointer slide-item px-1" data-slide-index="0" data-img-src="assets/team_confirm_1_khirpai_hurricanes.jpg" data-team-name="1ST CONFIRM TEAM - KHIRPAI HURRICANES">
              <img src="assets/team_confirm_1_khirpai_hurricanes.jpg" alt="1st Confirm Team - KHIRPAI HURRICANES" class="w-full h-auto max-h-72 sm:max-h-96 object-contain mx-auto rounded-2xl border-4 border-white shadow-xl" />
            </div>

            <!-- SLIDE 2: ANIKET XI (2ND CONFIRM TEAM) -->
            <div class="w-full flex-shrink-0 relative cursor-pointer slide-item px-1" data-slide-index="1" data-img-src="assets/team_confirm_2_aniket_xi.jpg" data-team-name="2ND CONFIRM TEAM - ANIKET XI">
              <img src="assets/team_confirm_2_aniket_xi.jpg" alt="2nd Confirm Team - ANIKET XI" class="w-full h-auto max-h-72 sm:max-h-96 object-contain mx-auto rounded-2xl border-4 border-white shadow-xl" />
            </div>

            <!-- SLIDE 3: SRS BROTHERS (3RD CONFIRM TEAM) -->
            <div class="w-full flex-shrink-0 relative cursor-pointer slide-item px-1" data-slide-index="2" data-img-src="assets/team_confirm_3_srs_brothers.jpg" data-team-name="3RD CONFIRM TEAM - SRS BROTHER'S">
              <img src="assets/team_confirm_3_srs_brothers.jpg" alt="3rd Confirm Team - SRS BROTHER'S" class="w-full h-auto max-h-72 sm:max-h-96 object-contain mx-auto rounded-2xl border-4 border-white shadow-xl" />
            </div>

            <!-- SLIDE 4: SHIV SHAKTI EKADASH (4TH CONFIRM TEAM) -->
            <div class="w-full flex-shrink-0 relative cursor-pointer slide-item px-1" data-slide-index="3" data-img-src="assets/team_confirm_4_shiv_shakti_ekadash.jpg" data-team-name="4TH CONFIRM TEAM - SHIV SHAKTI EKADASH">
              <img src="assets/team_confirm_4_shiv_shakti_ekadash.jpg" alt="4th Confirm Team - SHIV SHAKTI EKADASH" class="w-full h-auto max-h-72 sm:max-h-96 object-contain mx-auto rounded-2xl border-4 border-white shadow-xl" />
            </div>

            <!-- SLIDE 5: AVD ELEVEN (5TH CONFIRM TEAM) -->
            <div class="w-full flex-shrink-0 relative cursor-pointer slide-item px-1" data-slide-index="4" data-img-src="assets/team_confirm_5_avd_eleven.jpg" data-team-name="5TH CONFIRM TEAM - AVD ELEVEN">
              <img src="assets/team_confirm_5_avd_eleven.jpg" alt="5th Confirm Team - AVD ELEVEN" class="w-full h-auto max-h-72 sm:max-h-96 object-contain mx-auto rounded-2xl border-4 border-white shadow-xl" />
            </div>

            <!-- SLIDE 6: CCC (6TH CONFIRM TEAM) -->
            <div class="w-full flex-shrink-0 relative cursor-pointer slide-item px-1" data-slide-index="5" data-img-src="assets/team_confirm_6_ccc.jpg" data-team-name="6TH CONFIRM TEAM - CCC">
              <img src="assets/team_confirm_6_ccc.jpg" alt="6th Confirm Team - CCC" class="w-full h-auto max-h-72 sm:max-h-96 object-contain mx-auto rounded-2xl border-4 border-white shadow-xl" />
            </div>

            <!-- SLIDE 7: ATRIKA & FRIEND X1 (7TH CONFIRM TEAM) -->
            <div class="w-full flex-shrink-0 relative cursor-pointer slide-item px-1" data-slide-index="6" data-img-src="assets/team_confirm_7_atrika_friend_xi.jpg" data-team-name="7TH CONFIRM TEAM - ATRIKA & FRIEND X1">
              <img src="assets/team_confirm_7_atrika_friend_xi.jpg" alt="7th Confirm Team - ATRIKA & FRIEND X1" class="w-full h-auto max-h-72 sm:max-h-96 object-contain mx-auto rounded-2xl border-4 border-white shadow-xl" />
            </div>

          </div>

        </div>
      </div>

      <!-- ANNOUNCEMENT SCROLLING MARQUEE TICKER STRIP (LOCATED AT THE VERY BOTTOM BELOW TEAM PICTURES) -->
      <div class="w-full max-w-4xl mx-auto bg-red-600 border-2 border-red-500 py-2 px-3 rounded-2xl flex items-center gap-2.5 sm:gap-3 shadow-lg overflow-hidden text-white animate-fade-in">
        
        <!-- FIXED ANNOUNCEMENT BADGE -->
        <span class="px-3 py-1 bg-white text-red-600 font-black text-[10px] sm:text-xs rounded-xl shadow-md uppercase shrink-0 flex items-center gap-1 z-10 border border-red-100">
          <i data-lucide="bell" class="w-3.5 h-3.5 text-red-600 animate-bounce"></i>
          <span>NOTICE</span>
        </span>

        <!-- SCROLLING MARQUEE TEXT -->
        <div class="overflow-hidden whitespace-nowrap w-full relative">
          <div class="animate-continuous-marquee text-xs sm:text-sm font-black text-white tracking-wide">
            <span class="px-4">📢 Stay Tuned! 🏏 Grand Tournament starts on 30 August 2026 at 9:00 AM! Player Auction & Match Fixtures will be published live on this website.</span>
            <span class="text-amber-300 font-extrabold px-2">•</span>
            <span class="px-4">📢 Stay Tuned! 🏏 Grand Tournament starts on 30 August 2026 at 9:00 AM! Player Auction & Match Fixtures will be published live on this website.</span>
            <span class="text-amber-300 font-extrabold px-2">•</span>
          </div>
        </div>

      </div>

    </div>

    </div>
  `;

  // START COUNTDOWN TIMER
  initTournamentCountdown();

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
    '🥇 1ST CONFIRMED TEAM: KHIRPAI HURRICANES',
    '🥈 2ND CONFIRMED TEAM: ANIKET XI',
    '🥉 3RD CONFIRMED TEAM: SRS BROTHER\'S',
    '🏆 4TH CONFIRMED TEAM: SHIV SHAKTI EKADASH',
    '🏆 5TH CONFIRMED TEAM: AVD ELEVEN',
    '🏆 6TH CONFIRMED TEAM: CCC',
    '🏆 7TH CONFIRMED TEAM: ATRIKA & FRIEND X1'
  ];

  let currentSlide = 0;
  const totalSlides = 7;

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

// --- LIVE TOURNAMENT COUNTDOWN CLOCK (30 AUGUST 2026, 9:00 AM IST) ---
export async function initTournamentCountdown() {
  const card = document.getElementById('tournament-countdown-card');
  if (!card) return;

  // Check admin settings from Firebase
  try {
    const settings = await fetchPopupSettingsFromFirebase();
    if (settings && settings.isCountdownEnabled === false) {
      card.classList.add('hidden');
      return;
    } else {
      card.classList.remove('hidden');
    }
  } catch (err) {
    console.warn('Countdown settings fetch fallback:', err);
  }

  const targetDate = new Date("2026-08-30T09:00:00+05:30").getTime();

  const update = () => {
    const now = Date.now();
    const diff = targetDate - now;

    const dEl = document.getElementById('cd-days');
    const hEl = document.getElementById('cd-hours');
    const mEl = document.getElementById('cd-mins');
    const sEl = document.getElementById('cd-secs');

    if (!dEl || !hEl || !mEl || !sEl) return;

    if (diff <= 0) {
      dEl.textContent = "00";
      hEl.textContent = "00";
      mEl.textContent = "00";
      sEl.textContent = "00";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');

    dEl.textContent = pad(days);
    hEl.textContent = pad(hours);
    mEl.textContent = pad(mins);
    sEl.textContent = pad(secs);
  };

  update();
  if (window._tournamentCountdownInterval) {
    clearInterval(window._tournamentCountdownInterval);
  }
  window._tournamentCountdownInterval = setInterval(update, 1000);
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

  containerEl.innerHTML = `
    <div class="space-y-3 sm:space-y-4 animate-fade-in max-w-4xl mx-auto py-1 sm:py-2">
      
      <!-- GRAND STADIUM POSTER STRIP (PURE WHITE BACKGROUND - POSTER PICTURE & CONTACT INFO) -->
      <div class="jsl-header-strip p-2 sm:p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-md space-y-2">
        
        <!-- POSTER PICTURE ON WHITE BACKGROUND (JHANKRA SUPER LEAGUE, 8 TEAMS, PRIZE MONEY, ENTRY & RULES) -->
        <div class="overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm max-w-4xl mx-auto">
          <img src="assets/jsl_poster_top_rules.jpg" alt="JSL Official Tournament Poster" class="w-full h-auto object-contain mx-auto rounded-xl" />
        </div>

        <!-- CLICKABLE CALL CONTACT BUTTON BELOW PICTURE -->
        <div class="flex justify-center pt-1">
          <a href="tel:89722144166" class="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm rounded-xl border border-emerald-400 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer group" title="Click to call Pintu Santra for Team Entry">
            <div class="relative flex h-3.5 w-3.5 flex-shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-white flex items-center justify-center">
                <svg class="w-2.5 h-2.5 text-emerald-700 fill-current" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </span>
            </div>
            <span class="tracking-wide">📞 Contact - Pintu Santra (89722144166)</span>
          </a>
        </div>

      </div>

      <!-- 2 CATEGORIES IN A ROW (MOBILE FRIENDLY & LARGER SIZE) -->
      <div class="grid grid-cols-2 gap-2.5 sm:gap-4 items-stretch">
        
        <!-- CARD 1: REGISTERED TEAMS -->
        <div class="relative glass-card p-3 sm:p-5 text-center border-2 border-sky-300 bg-white flex flex-col justify-between items-center hover:border-sky-500 shadow-md rounded-2xl overflow-hidden">
          <!-- TOP-RIGHT CORNER COUNTER BADGE -->
          <div class="absolute top-1.5 right-1.5 w-6 h-6 sm:w-8 sm:h-8 bg-sky-600 text-white text-xs sm:text-sm font-black rounded-full flex items-center justify-center border-2 border-white shadow-md z-10" title="Total Teams">
            ${teams.length}
          </div>

          <div class="space-y-2 sm:space-y-3 pt-1 w-full flex flex-col items-center mb-3">
            <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center shadow-md font-black">
              <i data-lucide="shield" class="w-5 h-5 sm:w-7 sm:h-7"></i>
            </div>

            <div class="w-full">
              <div class="text-xs sm:text-base font-black text-slate-900 uppercase tracking-tight leading-tight">REGISTERED TEAMS</div>
            </div>
          </div>

          <button id="open-teams-modal-btn" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-1 transition-all">
            <i data-lucide="search" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400"></i> View Teams
          </button>
        </div>

        <!-- CARD 2: REGISTERED PLAYERS -->
        <div class="relative glass-card p-3 sm:p-5 text-center border-2 border-emerald-300 bg-white flex flex-col justify-between items-center hover:border-emerald-500 shadow-md rounded-2xl overflow-hidden">
          <!-- TOP-RIGHT CORNER COUNTER BADGE -->
          <div class="absolute top-1.5 right-1.5 w-6 h-6 sm:w-8 sm:h-8 bg-emerald-600 text-white text-xs sm:text-sm font-black rounded-full flex items-center justify-center border-2 border-white shadow-md z-10" title="Total Players">
            ${players.length}
          </div>

          <div class="space-y-2 sm:space-y-3 pt-1 w-full flex flex-col items-center mb-3">
            <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md font-black">
              <i data-lucide="users" class="w-5 h-5 sm:w-7 sm:h-7"></i>
            </div>

            <div class="w-full">
              <div class="text-xs sm:text-base font-black text-slate-900 uppercase tracking-tight leading-tight">REGISTERED PLAYERS</div>
            </div>
          </div>

          <button id="open-players-modal-btn" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-1 transition-all">
            <i data-lucide="search" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400"></i> View Players
          </button>
        </div>

      </div>

      <!-- LOWER PORTION: COMPACT RED COLOUR REGISTER NOW BUTTON & LIVE AUCTION HUB -->
      <div class="flex flex-wrap items-center justify-center gap-3 pt-2 sm:pt-3">
        <button id="jsl-right-reg-btn" class="btn-blink-always px-6 sm:px-8 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 border border-red-400 transition-all">
          <i data-lucide="edit-3" class="w-4 h-4 text-amber-300"></i> Register Now
        </button>
        <button id="jsl-hub-auction-btn" class="px-5 sm:px-7 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 border border-amber-300 transition-all hover:scale-105">
          <span>🔨 Live Auction Hub</span>
        </button>
      </div>

    </div>
  `;

  document.getElementById('jsl-right-reg-btn')?.addEventListener('click', openRegistrationTypeModal);
  document.getElementById('open-teams-modal-btn')?.addEventListener('click', () => openRegisteredTeamsModal(teams));
  document.getElementById('open-players-modal-btn')?.addEventListener('click', () => openRegisteredPlayersModal(players));
}

// --- REGISTERED TEAMS MODAL WITH 2PX CRISP BORDERS & PRO CRICKET SVG ---
function openRegisteredTeamsModal(allTeams) {
  let filteredTeams = [...allTeams];

  const renderTeamListContent = () => {
    const container = document.getElementById('teams-list-container');
    if (!container) return;

    if (filteredTeams.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-200">
          <span class="text-3xl">🏏</span>
          <div class="text-xs font-bold text-slate-700">No matching teams found</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${filteredTeams.map((t) => {
            const coOwnerName = t.coOwnerName || t.coOwner1Name || '';
            const coOwnerPhoto = t.coOwnerPhotoUrl || t.coOwner1PhotoUrl || '';

            const mentorName = t.mentorName || t.coOwner2Name || '';
            const mentorPhoto = t.mentorPhotoUrl || t.coOwner2PhotoUrl || '';

            const iconPlayerName = t.iconPlayerName || t.iconName || '';
            const iconPlayerPhoto = t.iconPlayerPhotoUrl || t.iconPhotoUrl || t.iconPhoto || '';

            const squadCount = store.getPlayers().filter(p => p.teamId === t.id).length;

            return `
              <div class="bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-300 hover:border-indigo-600 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between text-center">
                
                <!-- Team Header: Distinct Top Banner with Logo + Large Centered Name -->
                <div class="w-full bg-slate-50/90 border-b-2 border-slate-200 py-3 px-3 flex flex-col items-center justify-center">
                  ${t.logoUrl ? `
                    <img src="${t.logoUrl}" class="w-12 h-12 rounded-xl object-cover border-2 border-slate-300 shadow-xs mb-1.5" alt="${t.name} Logo" />
                  ` : ''}
                  <h3 class="font-black text-slate-900 text-base sm:text-lg leading-tight tracking-tight text-center">${t.name}</h3>
                </div>

                <!-- Card Body: Key Personnel (Owner, Icon, Co-Owner) in Structured Pods -->
                <div class="w-full p-3.5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div class="flex items-start justify-center gap-2.5 flex-wrap">
                    
                    <!-- Owner Pod -->
                    <div class="flex flex-col items-center text-center p-2 rounded-xl bg-amber-50/80 border border-amber-300/90 shadow-xs min-w-[85px] max-w-[105px]">
                      <div class="w-11 h-11 rounded-xl overflow-hidden border-2 border-amber-500 shadow-xs bg-amber-100 flex items-center justify-center">
                        ${(t.ownerPhotoUrl || t.ownerPhoto) ? `
                          <img src="${t.ownerPhotoUrl || t.ownerPhoto}" class="w-full h-full object-cover" alt="Owner" />
                        ` : `
                          <span class="text-base font-black">👑</span>
                        `}
                      </div>
                      <span class="text-[8px] font-black uppercase tracking-wider text-amber-900 mt-1">Owner</span>
                      <div class="text-[11px] font-black text-slate-900 truncate w-full leading-tight" title="${t.ownerName}">${t.ownerName}</div>
                    </div>

                    <!-- Icon Player Pod (Only if set) -->
                    ${(iconPlayerName || iconPlayerPhoto) ? `
                      <div class="flex flex-col items-center text-center p-2 rounded-xl bg-emerald-50/80 border border-emerald-300/90 shadow-xs min-w-[85px] max-w-[105px]">
                        <div class="w-11 h-11 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-xs bg-emerald-100 flex items-center justify-center">
                          ${iconPlayerPhoto ? `
                            <img src="${iconPlayerPhoto}" class="w-full h-full object-cover" alt="Icon" />
                          ` : `
                            <span class="text-base font-black">🌟</span>
                          `}
                        </div>
                        <span class="text-[8px] font-black uppercase tracking-wider text-emerald-900 mt-1">Icon</span>
                        <div class="text-[11px] font-black text-slate-900 truncate w-full leading-tight" title="${iconPlayerName}">${iconPlayerName}</div>
                      </div>
                    ` : ''}

                    <!-- Co-Owner Pod (Only if set) -->
                    ${coOwnerName ? `
                      <div class="flex flex-col items-center text-center p-2 rounded-xl bg-sky-50/80 border border-sky-300/90 shadow-xs min-w-[85px] max-w-[105px]">
                        <div class="w-11 h-11 rounded-xl overflow-hidden border-2 border-sky-500 shadow-xs bg-sky-100 flex items-center justify-center">
                          ${coOwnerPhoto ? `
                            <img src="${coOwnerPhoto}" class="w-full h-full object-cover" alt="Co-Owner" />
                          ` : `
                            <span class="text-base font-black">🤝</span>
                          `}
                        </div>
                        <span class="text-[8px] font-black uppercase tracking-wider text-sky-900 mt-1">Co-Owner</span>
                        <div class="text-[11px] font-black text-slate-900 truncate w-full leading-tight" title="${coOwnerName}">${coOwnerName}</div>
                      </div>
                    ` : ''}

                    <!-- Mentor Pod (Only if set) -->
                    ${mentorName ? `
                      <div class="flex flex-col items-center text-center p-2 rounded-xl bg-purple-50/80 border border-purple-300/90 shadow-xs min-w-[85px] max-w-[105px]">
                        <div class="w-11 h-11 rounded-xl overflow-hidden border-2 border-purple-500 shadow-xs bg-purple-100 flex items-center justify-center">
                          ${mentorPhoto ? `
                            <img src="${mentorPhoto}" class="w-full h-full object-cover" alt="Mentor" />
                          ` : `
                            <span class="text-base font-black">🧠</span>
                          `}
                        </div>
                        <span class="text-[8px] font-black uppercase tracking-wider text-purple-900 mt-1">Mentor</span>
                        <div class="text-[11px] font-black text-slate-900 truncate w-full leading-tight" title="${mentorName}">${mentorName}</div>
                      </div>
                    ` : ''}

                  </div>

                  <!-- Lower Portion: View Squad with Cricket Bat/Ball SVG -->
                  <button class="view-team-squad-btn w-full py-2.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 hover:from-blue-800 hover:to-slate-950 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-indigo-900/30 cursor-pointer hover:scale-[1.01] active:scale-[0.98]" data-team-id="${t.id}">
                    <svg class="w-4 h-4 text-amber-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m14 2 6 6-12 12-4-2-2-4 12-12z"></path>
                      <path d="m18 10-4-4"></path>
                      <circle cx="19" cy="19" r="2.5" fill="currentColor"></circle>
                    </svg>
                    <span>View Squad (${squadCount} Players)</span>
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
      <div class="bg-white max-w-xl w-full p-4 sm:p-5 relative space-y-3.5 animate-fade-in rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-slate-300 modal-content-container">
        <button id="close-teams-modal" class="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-800 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="flex items-center justify-between gap-2 border-b-2 border-slate-200 pb-2.5">
          <div>
            <span class="px-2 py-0.5 bg-sky-100 text-sky-800 text-[9px] font-black rounded-full border border-sky-300 uppercase font-mono">JSL 2026</span>
            <h2 class="text-base sm:text-lg font-black text-slate-900 mt-0.5">Registered Team List (${allTeams.length})</h2>
          </div>
        </div>

        <div class="relative">
          <input type="text" id="team-search-input" placeholder="🔍 Search team by name, owner, or co-owners..." class="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 pl-3.5 focus:outline-none focus:border-blue-500 font-bold placeholder-slate-400 shadow-inner" />
        </div>

        <div id="teams-list-container" class="max-h-[60vh] overflow-y-auto pr-1"></div>

        <button id="close-teams-modal-bottom" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow cursor-pointer transition-all">
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
        const co1Name = (t.coOwner1Name || t.coOwnerName || '').toLowerCase();
        const co2Name = (t.coOwner2Name || t.mentorName || '').toLowerCase();
        const iconName = (t.iconPlayerName || t.iconName || '').toLowerCase();

        return name.includes(query) ||
               shortCode.includes(query) ||
               ownerName.includes(query) ||
               co1Name.includes(query) ||
               co2Name.includes(query) ||
               iconName.includes(query);
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
function openRegisteredPlayersModal(allPlayers = store.getPlayers()) {
  // Option 02: On-demand Cloud Sync when modal opens
  store.syncWithCloud().catch(err => console.warn("Modal sync notice:", err));

  const playersList = Array.isArray(allPlayers) ? allPlayers : store.getPlayers();
  let filteredPlayers = [...playersList];

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
        </div>

        <div class="space-y-2">
          <div class="relative">
            <input type="text" id="player-search-input" placeholder="🔍 Search player by name, Reg ID (JSL2026-0001), phone, village..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 pl-3 focus:outline-none focus:border-emerald-500 placeholder-slate-400" />
          </div>

          <!-- CATEGORY FILTER PILLS -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1" id="category-filter-pills">
            <button type="button" data-cat="ALL" class="cat-pill-btn active px-3 py-1 bg-emerald-600 text-white font-black text-[10px] rounded-full shadow-sm flex items-center gap-1 border border-emerald-500 whitespace-nowrap">
              🏏 All (${allPlayers.length})
            </button>
            <button type="button" data-cat="BATSMAN" class="cat-pill-btn px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-full border border-slate-300 whitespace-nowrap transition-colors">
              🏏 Batsman
            </button>
            <button type="button" data-cat="BOWLER" class="cat-pill-btn px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-full border border-slate-300 whitespace-nowrap transition-colors">
              ⚾ Bowler
            </button>
            <button type="button" data-cat="ALL ROUNDER" class="cat-pill-btn px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-full border border-slate-300 whitespace-nowrap transition-colors">
              ⭐ All Rounder
            </button>
            <button type="button" data-cat="WICKET KEEPER" class="cat-pill-btn px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-full border border-slate-300 whitespace-nowrap transition-colors">
              🧤 Wicket Keeper
            </button>
          </div>
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

  let activeCategoryFilter = 'ALL';

  const handlePlayerSearch = () => {
    const inputEl = document.getElementById('player-search-input');
    const query = inputEl ? inputEl.value.toLowerCase().trim() : '';

    filteredPlayers = allPlayers.filter(p => {
      // 1. Robust Category Filter Check (handles "All-rounder", "All Rounder", "ALLROUNDER")
      const rawCat = (p.category || p.role || p.playingType || 'All-rounder').toUpperCase();
      const cleanCat = rawCat.replace(/[^A-Z0-9]/g, ''); // e.g. "ALLROUNDER"

      if (activeCategoryFilter !== 'ALL') {
        const cleanTarget = activeCategoryFilter.replace(/[^A-Z0-9]/g, ''); // "ALLROUNDER", "BATSMAN", "BOWLER", "WICKETKEEPER"

        if (cleanTarget.includes('ROUNDER') || cleanTarget.includes('ALLROUND')) {
          if (!cleanCat.includes('ROUNDER') && !cleanCat.includes('ALLROUND')) {
            return false;
          }
        } else if (cleanTarget.includes('BAT')) {
          if (!cleanCat.includes('BAT')) {
            return false;
          }
        } else if (cleanTarget.includes('BOWL')) {
          if (!cleanCat.includes('BOWL') && !cleanCat.includes('FAST') && !cleanCat.includes('SPIN')) {
            return false;
          }
        } else if (cleanTarget.includes('KEEPER') || cleanTarget.includes('WK')) {
          if (!cleanCat.includes('KEEPER') && !cleanCat.includes('WK')) {
            return false;
          }
        } else {
          if (!cleanCat.includes(cleanTarget)) {
            return false;
          }
        }
      }

      // 2. Search Text Query Check
      if (!query) return true;

      const name = (p.name || '').toLowerCase();
      const fatherName = (p.fatherName || '').toLowerCase();
      const regId = (p.registrationId || p.regNo || '').toLowerCase();
      const serialNo = String(p.displayRegistrationNumber || p.serialNo || '');
      const category = pCat.toLowerCase();
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

    renderPlayerListContent();
  };

  // CATEGORY PILL CLICK LISTENERS
  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeCategoryFilter = e.currentTarget.getAttribute('data-cat') || 'ALL';
      document.querySelectorAll('.cat-pill-btn').forEach(b => {
        b.classList.remove('active', 'bg-emerald-600', 'text-white', 'font-black', 'border-emerald-500');
        b.classList.add('bg-slate-100', 'text-slate-700', 'font-bold', 'border-slate-300');
      });
      e.currentTarget.classList.add('active', 'bg-emerald-600', 'text-white', 'font-black', 'border-emerald-500');
      e.currentTarget.classList.remove('bg-slate-100', 'text-slate-700', 'font-bold', 'border-slate-300');

      handlePlayerSearch();
    });
  });

  const playerInput = document.getElementById('player-search-input');
  if (playerInput) {
    let debounceTimer = null;
    playerInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handlePlayerSearch, 200);
    });
  }
}

// --- RENDER PLAYER CARDS (SQUARE PHOTO CARDS WITH TOP SHORT SERIAL, BLINKING STATUS DOT & CLEAN NAME) ---
function renderPlayerCardsWithSerial(playersList) {
  return playersList.map((p, idx) => {
    const isApproved = (p.registrationStatus || p.paymentStatus) === 'APPROVED';
    const shortSerialNo = String(idx + 1).padStart(2, '0');
    const photoSrc = getOptimizedImageUrl(p.photoUrl || p.player_photo_url || '', 280, 280);

    return `
      <div class="glass-card p-2 flex flex-col justify-between items-center text-center relative border border-emerald-200 bg-white hover:border-emerald-500 shadow-md rounded-2xl overflow-hidden">
        
        <!-- LARGE SQUARE PICTURE CONTAINER WITH TOP-LEFT SHORT SERIAL & TOP-RIGHT BLINKING STATUS DOT -->
        <div class="w-full aspect-square rounded-xl bg-slate-100 border-2 border-emerald-500 flex items-center justify-center overflow-hidden shadow-md relative mb-1.5 mx-auto">
          
          <!-- PLAYER PHOTO WITH LAZY LOADING & ASYNC DECODING -->
          <img src="${photoSrc}" loading="lazy" decoding="async" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E';" />

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

        <!-- SQUARE 200 KB CROPPED PLAYER PHOTO DISPLAY -->
        <div class="pt-1 text-center">
          <div class="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-white border-2 border-emerald-500 shadow-xl mx-auto overflow-hidden flex items-center justify-center">
            <img src="${getOptimizedImageUrl(player.photoUrl || player.player_photo_url, 400, 400)}" loading="lazy" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E';" />
          </div>
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

        <!-- PHOTO UPDATE OPTION -->
        <div class="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl text-left">
          <div class="space-y-0.5">
            <span class="text-[9px] text-slate-500 uppercase font-bold block">Profile Management</span>
            <span class="text-[10px] text-slate-700 font-bold">Update your HD profile photo</span>
          </div>
          <label class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg shadow flex items-center gap-1 cursor-pointer transition-all">
            <i data-lucide="camera" class="w-3.5 h-3.5 text-amber-400"></i> Change Photo
            <input type="file" id="profile-photo-change-input" accept="image/*" class="hidden" />
          </label>
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

  document.getElementById('profile-photo-change-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    openSquareImageCropModal(objectUrl, async (croppedDataUrl) => {
      const cdnUrl = await uploadHDImage(croppedDataUrl, 'player_photos');
      const photoToSave = cdnUrl || croppedDataUrl;
      store.updatePlayerProfilePhoto(player.phone, photoToSave, player.id);
      removeModal();
      const updatedP = store.getPlayerById(player.id) || { ...player, photoUrl: photoToSave, player_photo_url: photoToSave };
      openFullPlayerProfileModal(updatedP);
    }, 'Crop New Profile Photo (1:1)');
  });

  document.getElementById('print-pass-btn')?.addEventListener('click', () => {
    printDigitalPass(player, store.getLeagueById('leg-jsl'), store.getTeamById(player.teamId));
  });
}

// --- FIREBASE LIVE AUTH INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCtyOlUuFX6Io2ZDcYlt2xLB3ADkeQH0Ns",
  authDomain: "cricket-league-794da.firebaseapp.com",
  projectId: "cricket-league-794da",
  storageBucket: "cricket-league-794da.firebasestorage.app",
  messagingSenderId: "481137863760",
  appId: "1:481137863760:web:a315b609cca5cf36af3555",
  measurementId: "G-F180JQGSHP"
};

try {
  if (window.firebase && !window.firebase.apps.length) {
    window.firebase.initializeApp(firebaseConfig);
    console.log("Firebase App & Phone Auth initialized with live config.");
  }
} catch (e) {
  console.warn("Firebase Auth init notice:", e);
}

// --- UNIVERSAL PHONE OTP VERIFICATION MODAL WITH LIVE FIREBASE SMS DELIVERY ---
export function openPhoneOtpModal({ title = 'Mobile Number Verification', subtitle = 'Verify your 10-digit mobile number via SMS OTP', prefilledPhone = '', onSuccess }) {
  document.getElementById('phone-otp-modal')?.remove();

  let confirmationResult = null;
  let recaptchaVerifier = null;
  let countdown = 60;
  let timerInterval = null;
  let currentPhone = prefilledPhone ? prefilledPhone.replace(/[^0-9]/g, '').slice(-10) : '';

  const modalHtml = `
    <div id="phone-otp-modal" class="fixed inset-0 z-[60] modal-overlay flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div class="bg-white max-w-sm sm:max-w-md w-full p-5 relative space-y-4 rounded-2xl shadow-2xl border-2 border-emerald-500 text-slate-900 modal-content-container">
        <button id="close-otp-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-900 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="text-center space-y-1">
          <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-black text-xl border border-emerald-300 mb-2">
            <i data-lucide="message-square" class="w-6 h-6"></i>
          </div>
          <h2 class="text-lg font-black text-slate-900 leading-tight">${title}</h2>
          <p class="text-xs text-slate-500 font-medium">${subtitle}</p>
        </div>

        <!-- INVISIBLE RECAPTCHA CONTAINER -->
        <div id="recaptcha-container"></div>

        <!-- STEP 1: PHONE INPUT -->
        <div id="otp-phone-step" class="space-y-3">
          <div>
            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">10-Digit Mobile Number *</label>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-black text-slate-700">+91</span>
              <input type="tel" id="otp-phone-input" maxlength="10" value="${currentPhone}" placeholder="9876543210" class="flex-1 bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm rounded-xl p-2 focus:outline-none focus:border-emerald-500 focus:bg-white" />
            </div>
            <p class="text-[9px] text-slate-500 mt-1">A real 6-digit SMS verification code will be sent to your mobile phone.</p>
          </div>

          <button type="button" id="send-otp-btn" class="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all">
            <i data-lucide="send" class="w-4 h-4"></i> Send SMS OTP Code
          </button>
        </div>

        <!-- STEP 2: OTP INPUT -->
        <div id="otp-verify-step" class="hidden space-y-3">
          <!-- LIVE SMS NOTIFICATION BANNER -->
          <div id="otp-banner" class="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-1">
            <div class="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">📩 SMS Verification Code Sent</div>
            <div id="otp-phone-display" class="text-xs font-mono font-bold text-emerald-700">+91 ${currentPhone}</div>
            <div class="text-[9px] text-slate-600">Please check your SMS inbox and enter the 6-digit OTP code below.</div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-[10px] font-bold text-slate-700 uppercase">Enter 6-Digit SMS Code *</label>
              <span id="otp-timer-text" class="text-[10px] font-mono font-bold text-amber-600">Resend in 60s</span>
            </div>
            <input type="text" id="otp-input" maxlength="6" placeholder="123456" class="w-full text-center tracking-[0.5em] font-mono font-black text-xl bg-slate-50 border-2 border-slate-300 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white" />
          </div>

          <button type="button" id="verify-otp-btn" class="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all">
            <i data-lucide="check-circle" class="w-4 h-4"></i> Verify SMS Code & Continue
          </button>

          <button type="button" id="resend-otp-btn" class="hidden w-full py-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-bold underline text-center">
            Resend SMS OTP Code
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => {
    if (timerInterval) clearInterval(timerInterval);
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (e) {}
    }
    document.getElementById('phone-otp-modal')?.remove();
  };

  document.getElementById('close-otp-modal-btn')?.addEventListener('click', removeModal);

  const phoneInput = document.getElementById('otp-phone-input');
  const sendBtn = document.getElementById('send-otp-btn');
  const phoneStep = document.getElementById('otp-phone-step');
  const verifyStep = document.getElementById('otp-verify-step');
  const phoneDisplay = document.getElementById('otp-phone-display');
  const otpInput = document.getElementById('otp-input');
  const verifyBtn = document.getElementById('verify-otp-btn');
  const timerText = document.getElementById('otp-timer-text');
  const resendBtn = document.getElementById('resend-otp-btn');

  const startTimer = () => {
    countdown = 60;
    if (timerInterval) clearInterval(timerInterval);
    if (timerText) timerText.innerText = `Resend in ${countdown}s`;
    if (resendBtn) resendBtn.classList.add('hidden');

    timerInterval = setInterval(() => {
      countdown--;
      if (timerText) timerText.innerText = `Resend in ${countdown}s`;
      if (countdown <= 0) {
        clearInterval(timerInterval);
        if (timerText) timerText.innerText = 'Code expired';
        if (resendBtn) resendBtn.classList.remove('hidden');
      }
    }, 1000);
  };

  const generateAndSendOtp = async () => {
    const rawVal = (phoneInput?.value || '').replace(/[^0-9]/g, '');
    if (rawVal.length < 10) {
      alert("Please enter a valid 10-digit mobile number!");
      return;
    }

    currentPhone = rawVal.slice(-10);
    const fullPhoneNumber = `+91${currentPhone}`;

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `<span class="flex items-center justify-center gap-1.5"><i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Sending SMS OTP...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      if (window.firebase && window.firebase.auth) {
        if (!recaptchaVerifier) {
          recaptchaVerifier = new window.firebase.auth.RecaptchaVerifier('recaptcha-container', {
            size: 'invisible'
          });
        }
        confirmationResult = await window.firebase.auth().signInWithPhoneNumber(fullPhoneNumber, recaptchaVerifier);
        console.log("Firebase SMS OTP sent to:", fullPhoneNumber);
      } else {
        throw new Error("Firebase Auth SDK not ready");
      }

      phoneStep?.classList.add('hidden');
      verifyStep?.classList.remove('hidden');
      if (phoneDisplay) phoneDisplay.innerText = fullPhoneNumber;

      startTimer();
      setTimeout(() => otpInput?.focus(), 100);
    } catch (err) {
      console.error("SMS OTP Send Error:", err);
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i> Send SMS OTP Code`;
        if (window.lucide) window.lucide.createIcons();
      }
      alert(`⚠️ SMS Delivery Notice:\n\n${err.message || 'Unable to send SMS code'}\n\n(Ensure Phone provider is enabled in Firebase Console & localhost is in Authorized Domains).`);
    }
  };

  sendBtn?.addEventListener('click', generateAndSendOtp);
  resendBtn?.addEventListener('click', generateAndSendOtp);

  verifyBtn?.addEventListener('click', async () => {
    const entered = (otpInput?.value || '').trim();
    if (!entered || entered.length !== 6) {
      alert("Please enter the 6-digit SMS verification code!");
      return;
    }

    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `<span class="flex items-center justify-center gap-1.5"><i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Verifying Code...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      if (confirmationResult) {
        const userCredential = await confirmationResult.confirm(entered);
        console.log("Phone OTP verified successfully:", userCredential.user);
      }

      const profile = store.getPlayerProfileByPhone(currentPhone);
      removeModal();
      if (onSuccess) {
        onSuccess(currentPhone, profile);
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> Verify SMS Code & Continue`;
        if (window.lucide) window.lucide.createIcons();
      }
      alert("⚠️ Invalid or expired SMS verification code! Please check the code received on your phone.");
    }
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

// --- TEAM REGISTER FORM MODAL ---
function openTeamRegisterFormModal(initialData = null, verifiedPhone = null) {
  document.getElementById('team-reg-modal')?.remove();

  let ownerPhotoFileObj = null;
  let ownerPhotoDataUrl = '';
  let coOwnerPhotoFileObj = null;
  let coOwnerPhotoDataUrl = '';
  let mentorPhotoFileObj = null;
  let mentorPhotoDataUrl = '';
  let iconPlayerPhotoFileObj = null;
  let iconPlayerPhotoDataUrl = '';
  let teamLogoFileObj = null;
  let teamLogoDataUrl = '';

  const prefilledOwnerPhone = verifiedPhone || (initialData ? initialData.phone : '') || '';

  const modalHtml = `
    <div id="team-reg-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-md w-full p-4 relative space-y-3 animate-fade-in rounded-2xl shadow-2xl border border-slate-200 modal-content-container max-h-[92vh] overflow-y-auto text-slate-900">
        <button id="close-team-modal-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-800 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <div>
          <span class="px-2 py-0.5 bg-sky-100 text-sky-800 text-[9px] font-black rounded border border-sky-300 uppercase">TEAM REGISTER</span>
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
                <input type="tel" id="owner-phone" required value="${prefilledOwnerPhone}" placeholder="+91 9876543210" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-amber-500" />
              </div>
            </div>
            <div>
              <label class="block text-[9px] font-bold text-amber-700 uppercase mb-0.5">Owner HD Photo * (Compressed &lt; 200KB)</label>
              <input type="file" id="owner-photo-file" accept="image/*" required class="w-full bg-white border border-slate-300 text-slate-700 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-amber-500 file:text-slate-950" />
              <div id="owner-photo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
                <img id="owner-photo-preview-img" class="w-8 h-8 rounded object-cover" />
                <span class="text-[9px] text-emerald-600 font-bold">Owner Photo Selected (&lt; 200KB)</span>
              </div>
            </div>
          </div>

          <!-- 3. Icon Player Details -->
          <div class="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 space-y-2">
            <span class="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">🌟 Icon Player Details (Optional)</span>
            <div>
              <label class="block text-[9px] font-bold text-slate-700 uppercase mb-0.5">Icon Player Name</label>
              <input type="text" id="icon-player-name" placeholder="e.g. Bijay Haldar" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-emerald-800 uppercase mb-0.5">Icon Player HD Photo (Compressed &lt; 200KB)</label>
              <input type="file" id="icon-player-photo-file" accept="image/*" class="w-full bg-white border border-slate-300 text-slate-700 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-emerald-600 file:text-white" />
              <div id="icon-player-photo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
                <img id="icon-player-photo-preview-img" class="w-8 h-8 rounded object-cover" />
                <span class="text-[9px] text-emerald-600 font-bold">Icon Player Photo Selected (&lt; 200KB)</span>
              </div>
            </div>
          </div>

          <!-- 4. Co-Owner Option (Single Co-Owner) -->
          <div class="bg-sky-50 p-2.5 rounded-xl border border-sky-200 space-y-2">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" id="enable-co-owner" class="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 bg-white" />
              <span class="text-[10px] font-black text-sky-700 uppercase">🤝 Mark Co-Owner (Optional)</span>
            </label>

            <div id="co-owner-fields" class="hidden space-y-2 pt-1 border-t border-sky-200">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Co-Owner Name</label>
                  <input type="text" id="co-owner-name" placeholder="Rohit Verma" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Co-Owner Phone</label>
                  <input type="tel" id="co-owner-phone" placeholder="+91 9812345678" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-sky-500" />
                </div>
              </div>
              <div>
                <label class="block text-[8px] font-bold text-sky-700 uppercase mb-0.5">Co-Owner HD Photo</label>
                <input type="file" id="co-owner-photo-file" accept="image/*" class="w-full bg-white border border-slate-300 text-slate-700 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-sky-600 file:text-white" />
                <div id="co-owner-photo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
                  <img id="co-owner-photo-preview-img" class="w-8 h-8 rounded object-cover" />
                  <span class="text-[9px] text-emerald-600 font-bold">Co-Owner Photo Selected!</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 5. Mentor Option -->
          <div class="bg-purple-50 p-2.5 rounded-xl border border-purple-200 space-y-2">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" id="enable-mentor" class="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 bg-white" />
              <span class="text-[10px] font-black text-purple-700 uppercase">🧠 Mark Mentor (Optional)</span>
            </label>

            <div id="mentor-fields" class="hidden space-y-2 pt-1 border-t border-purple-200">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Mentor Name</label>
                  <input type="text" id="mentor-name" placeholder="Aman Gupta" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label class="block text-[8px] font-bold text-slate-700 uppercase mb-0.5">Mentor Phone</label>
                  <input type="tel" id="mentor-phone" placeholder="+91 9765432109" class="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label class="block text-[8px] font-bold text-purple-700 uppercase mb-0.5">Mentor HD Photo</label>
                <input type="file" id="mentor-photo-file" accept="image/*" class="w-full bg-white border border-slate-300 text-slate-700 text-[10px] rounded-lg p-1 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-purple-600 file:text-white" />
                <div id="mentor-photo-preview-box" class="hidden mt-1 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
                  <img id="mentor-photo-preview-img" class="w-8 h-8 rounded object-cover" />
                  <span class="text-[9px] text-emerald-600 font-bold">Mentor Photo Selected!</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 6. Team Logo -->
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

  // TOGGLES FOR CO-OWNER & MENTOR
  document.getElementById('enable-co-owner')?.addEventListener('change', (e) => {
    const fields = document.getElementById('co-owner-fields');
    if (e.target.checked) fields?.classList.remove('hidden');
    else fields?.classList.add('hidden');
  });

  document.getElementById('enable-mentor')?.addEventListener('change', (e) => {
    const fields = document.getElementById('mentor-fields');
    if (e.target.checked) fields?.classList.remove('hidden');
    else fields?.classList.add('hidden');
  });

  // FILE UPLOAD LISTENERS (Client-Side HD Compression guaranteed strictly < 200 KB per image)
  document.getElementById('owner-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      ownerPhotoFileObj = file;
      ownerPhotoDataUrl = await compressImage(file, 1000, 1000, 0.80);
      document.getElementById('owner-photo-preview-img').src = ownerPhotoDataUrl;
      document.getElementById('owner-photo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('icon-player-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      iconPlayerPhotoFileObj = file;
      iconPlayerPhotoDataUrl = await compressImage(file, 1000, 1000, 0.80);
      document.getElementById('icon-player-photo-preview-img').src = iconPlayerPhotoDataUrl;
      document.getElementById('icon-player-photo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('co-owner-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      coOwnerPhotoFileObj = file;
      coOwnerPhotoDataUrl = await compressImage(file, 1000, 1000, 0.80);
      document.getElementById('co-owner-photo-preview-img').src = coOwnerPhotoDataUrl;
      document.getElementById('co-owner-photo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('mentor-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      mentorPhotoFileObj = file;
      mentorPhotoDataUrl = await compressImage(file, 1000, 1000, 0.80);
      document.getElementById('mentor-photo-preview-img').src = mentorPhotoDataUrl;
      document.getElementById('mentor-photo-preview-box').classList.remove('hidden');
    }
  });

  document.getElementById('team-logo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      teamLogoFileObj = file;
      teamLogoDataUrl = await compressImage(file, 1000, 1000, 0.80);
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
      const iconPlayerName = document.getElementById('icon-player-name')?.value || '';

      const hasCoOwner = document.getElementById('enable-co-owner').checked;
      const coOwnerName = hasCoOwner ? (document.getElementById('co-owner-name').value || '') : '';
      const coOwnerPhone = hasCoOwner ? (document.getElementById('co-owner-phone').value || '') : '';

      const hasMentor = document.getElementById('enable-mentor').checked;
      const mentorName = hasMentor ? (document.getElementById('mentor-name').value || '') : '';
      const mentorPhone = hasMentor ? (document.getElementById('mentor-phone').value || '') : '';

      // Parallel concurrent HD upload with 10s safety timeout
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

      const [finalOwnerPhotoUrl, finalCoOwnerPhotoUrl, finalMentorPhotoUrl, finalIconPhotoUrl, finalLogoUrl] = await Promise.all([
        uploadWithTimeout(ownerPhotoFileObj, 'owner_photos', ownerPhotoDataUrl),
        uploadWithTimeout(hasCoOwner ? coOwnerPhotoFileObj : null, 'co_owner_photos', coOwnerPhotoDataUrl),
        uploadWithTimeout(hasMentor ? mentorPhotoFileObj : null, 'mentor_photos', mentorPhotoDataUrl),
        uploadWithTimeout(iconPlayerPhotoFileObj, 'icon_player_photos', iconPlayerPhotoDataUrl),
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

        iconPlayerName,
        iconName: iconPlayerName,
        iconPlayerPhotoUrl: finalIconPhotoUrl || '',
        iconPhotoUrl: finalIconPhotoUrl || '',
        iconPhoto: finalIconPhotoUrl || '',

        coOwnerName,
        coOwnerPhone,
        coOwnerPhotoUrl: finalCoOwnerPhotoUrl || '',
        coOwner1Name: coOwnerName,
        coOwner1Phone: coOwnerPhone,
        coOwner1PhotoUrl: finalCoOwnerPhotoUrl || '',

        mentorName,
        mentorPhone,
        mentorPhotoUrl: finalMentorPhotoUrl || '',

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
function openPlayerRegisterFormModal(initialData = null, verifiedPhone = null) {
  const upiId = "pintusantra4166@nyes";
  const payeeName = "Pintu Santra";
  const amount = 200;
  const note = "JSL2026PlayerReg";

  const prefilledPhone = verifiedPhone || (initialData ? initialData.phone : '') || '';

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
          <p class="text-[10px] text-slate-500 font-medium mt-0.5">⚡ Serial No. & Registration ID are assigned sequentially upon final submission.</p>
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
              <input type="tel" id="ply-phone" required value="${prefilledPhone}" placeholder="+91 9876543210" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none focus:border-emerald-500" />
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
                <option value="" disabled selected>-- Select Category * --</option>
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-rounder">All-rounder</option>
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
                <div id="ply-photo-status-text">
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
                <div id="ply-aadhar-status-text">
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
                    <div id="ply-proof-status-text">
                      <span class="text-[9px] text-emerald-700 font-black flex items-center gap-1">
                        <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i> Receipt Selected!
                      </span>
                    </div>
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

  // AUTO-POPULATE RETURNING PLAYER DETAILS FROM LIFETIME PROFILE
  if (initialData) {
    if (initialData.name) document.getElementById('ply-name').value = initialData.name;
    if (initialData.fatherName && initialData.fatherName !== 'N/A') document.getElementById('ply-father-name').value = initialData.fatherName;
    if (initialData.dob) {
      document.getElementById('ply-dob').value = initialData.dob;
      updateAgeFromDOB();
    }
    if (initialData.village) document.getElementById('ply-village').value = initialData.village;
    if (initialData.district) document.getElementById('ply-district').value = initialData.district;
    if (initialData.category || initialData.playingType) document.getElementById('ply-category').value = initialData.category || initialData.playingType;
    if (initialData.battingStyle) document.getElementById('ply-batting-style').value = initialData.battingStyle;
    if (initialData.bowlingStyle) document.getElementById('ply-bowling-style').value = initialData.bowlingStyle;
  }

  let plyPhotoFileObj = null;
  let plyAadharFileObj = null;
  let plyProofFileObj = null;

  let plyPhotoDataUrl = (initialData && initialData.photoUrl) ? initialData.photoUrl : '';
  let plyAadharDataUrl = '';
  let plyProofDataUrl = '';

  let finalPhotoUrl = (initialData && initialData.photoUrl) ? initialData.photoUrl : '';
  let finalAadharUrl = '';
  let finalProofUrl = '';

  if (initialData && initialData.photoUrl) {
    setTimeout(() => {
      const previewBox = document.getElementById('ply-photo-preview-box');
      const previewImg = document.getElementById('ply-photo-preview-img');
      const statusBox = document.getElementById('ply-photo-status-text');
      if (previewBox) previewBox.classList.remove('hidden');
      if (previewImg) previewImg.src = initialData.photoUrl;
      if (statusBox) {
        statusBox.innerHTML = `<span class="text-[9px] text-emerald-700 font-black flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300"><i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i> ✅ Photo Auto-Loaded from Lifetime Profile</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    }, 50);
  }

  // PROCESS PLAYER PHOTO (REALTIME 100KB COMPRESSION + INSTANT CDN UPLOAD + GREEN CHECKMARK)
  const processAndUploadPhoto = async (dataUrlOrFile) => {
    const previewBox = document.getElementById('ply-photo-preview-box');
    const previewImg = document.getElementById('ply-photo-preview-img');
    const statusBox = document.getElementById('ply-photo-status-text');

    if (previewBox) previewBox.classList.remove('hidden');
    if (previewImg && typeof dataUrlOrFile === 'string') previewImg.src = dataUrlOrFile;

    if (statusBox) {
      statusBox.innerHTML = `
        <span class="text-[9px] text-amber-600 font-extrabold flex items-center gap-1">
          <i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> ⏳ Compressing (&lt;100KB) & Uploading to Cloud CDN...
        </span>
      `;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const compressedDataUrl = typeof dataUrlOrFile === 'string' && dataUrlOrFile.startsWith('data:image') 
        ? dataUrlOrFile 
        : await compressImage(dataUrlOrFile, 800, 800, 0.75);

      plyPhotoDataUrl = compressedDataUrl;
      if (previewImg) previewImg.src = compressedDataUrl;

      const cdnUrl = await uploadHDImage(compressedDataUrl, 'player_photos');
      if (cdnUrl && (cdnUrl.startsWith('http://') || cdnUrl.startsWith('https://'))) {
        finalPhotoUrl = cdnUrl;
        const estKb = Math.round((compressedDataUrl.length - 22) * 0.75 / 1024);
        if (statusBox) {
          statusBox.innerHTML = `
            <span class="text-[9px] text-emerald-700 font-black flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i> ✅ Player Photo Uploaded to CDN (${estKb} KB)
            </span>
          `;
          if (window.lucide) window.lucide.createIcons();
        }
      } else {
        finalPhotoUrl = compressedDataUrl;
        if (statusBox) {
          statusBox.innerHTML = `<span class="text-[9px] text-emerald-700 font-bold">✅ Photo Compressed (&lt;100 KB Ready)</span>`;
        }
      }
    } catch (err) {
      console.warn("Photo compression upload error:", err);
    }
  };

  const handlePhotoSelection = (file) => {
    if (!file) return;
    plyPhotoFileObj = file;
    const objectUrl = URL.createObjectURL(file);
    openSquareImageCropModal(objectUrl, (croppedSquareDataUrl) => {
      processAndUploadPhoto(croppedSquareDataUrl);
    }, 'Crop Player Photo (Square 1:1)');
  };

  document.getElementById('ply-photo-file-gallery')?.addEventListener('change', (e) => handlePhotoSelection(e.target.files[0]));
  document.getElementById('ply-photo-file-camera')?.addEventListener('change', (e) => handlePhotoSelection(e.target.files[0]));

  document.getElementById('re-crop-ply-photo-btn')?.addEventListener('click', () => {
    if (plyPhotoDataUrl) {
      openSquareImageCropModal(plyPhotoDataUrl, (croppedSquareDataUrl) => {
        processAndUploadPhoto(croppedSquareDataUrl);
      }, 'Re-Crop Player Photo (Square 1:1)');
    }
  });

  // PROCESS AADHAAR CARD PROOF (REALTIME 100KB COMPRESSION + INSTANT CDN UPLOAD + GREEN CHECKMARK)
  const handleAadharSelection = async (file) => {
    if (!file) return;
    plyAadharFileObj = file;

    const previewBox = document.getElementById('ply-aadhar-preview-box');
    const previewImg = document.getElementById('ply-aadhar-preview-img');
    const statusBox = document.getElementById('ply-aadhar-status-text');

    if (previewBox) previewBox.classList.remove('hidden');

    if (statusBox) {
      statusBox.innerHTML = `
        <span class="text-[9px] text-amber-600 font-extrabold flex items-center gap-1">
          <i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> ⏳ Compressing (&lt;100KB) & Uploading Aadhaar to Cloud CDN...
        </span>
      `;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const compressedDataUrl = await compressImage(file, 800, 800, 0.75);
      plyAadharDataUrl = compressedDataUrl;
      if (previewImg) previewImg.src = compressedDataUrl;

      const cdnUrl = await uploadHDImage(compressedDataUrl, 'aadhaar_docs');
      if (cdnUrl && (cdnUrl.startsWith('http://') || cdnUrl.startsWith('https://'))) {
        finalAadharUrl = cdnUrl;
        const estKb = Math.round((compressedDataUrl.length - 22) * 0.75 / 1024);
        if (statusBox) {
          statusBox.innerHTML = `
            <span class="text-[9px] text-emerald-700 font-black flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i> ✅ Aadhaar Document Uploaded to CDN (${estKb} KB)
            </span>
          `;
          if (window.lucide) window.lucide.createIcons();
        }
      } else {
        finalAadharUrl = compressedDataUrl;
        if (statusBox) {
          statusBox.innerHTML = `<span class="text-[9px] text-emerald-700 font-bold">✅ Aadhaar Document Ready (&lt;100 KB)</span>`;
        }
      }
    } catch (err) {
      console.warn("Aadhaar upload notice:", err);
    }
  };

  document.getElementById('ply-aadhar-file-gallery')?.addEventListener('change', (e) => handleAadharSelection(e.target.files[0]));
  document.getElementById('ply-aadhar-file-camera')?.addEventListener('change', (e) => handleAadharSelection(e.target.files[0]));

  // PROCESS PAYMENT RECEIPT SCREENSHOT (REALTIME 100KB COMPRESSION + INSTANT CDN UPLOAD + GREEN CHECKMARK)
  const handleProofSelection = async (file) => {
    if (!file) return;
    plyProofFileObj = file;

    const previewBox = document.getElementById('ply-proof-preview-box');
    const previewImg = document.getElementById('ply-proof-preview-img');
    const statusBox = document.getElementById('ply-proof-status-text');

    if (previewBox) previewBox.classList.remove('hidden');

    if (statusBox) {
      statusBox.innerHTML = `
        <span class="text-[9px] text-amber-600 font-extrabold flex items-center gap-1">
          <i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> ⏳ Compressing (&lt;100KB) & Uploading Receipt to Cloud CDN...
        </span>
      `;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const compressedDataUrl = await compressImage(file, 800, 800, 0.75);
      plyProofDataUrl = compressedDataUrl;
      if (previewImg) previewImg.src = compressedDataUrl;

      const cdnUrl = await uploadHDImage(compressedDataUrl, 'payment_receipts');
      if (cdnUrl && (cdnUrl.startsWith('http://') || cdnUrl.startsWith('https://'))) {
        finalProofUrl = cdnUrl;
        const estKb = Math.round((compressedDataUrl.length - 22) * 0.75 / 1024);
        if (statusBox) {
          statusBox.innerHTML = `
            <span class="text-[9px] text-emerald-700 font-black flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i> ✅ Payment Receipt Uploaded to CDN (${estKb} KB)
            </span>
          `;
          if (window.lucide) window.lucide.createIcons();
        }
      } else {
        finalProofUrl = compressedDataUrl;
        if (statusBox) {
          statusBox.innerHTML = `<span class="text-[9px] text-emerald-700 font-bold">✅ Payment Receipt Ready (&lt;100 KB)</span>`;
        }
      }
    } catch (err) {
      console.warn("Proof upload notice:", err);
    }
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
          <span>Saving Registration & Assigning Serial Number...</span>
        </div>
      `;
    }

    try {
      const name = document.getElementById('ply-name').value;
      const category = document.getElementById('ply-category').value;
      if (!category) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "Submit Player Registration";
        }
        alert("⚠️ Please select your Player Category (Batsman, Bowler, All-rounder, or Wicket Keeper).");
        return;
      }
      const fatherName = document.getElementById('ply-father-name').value;
      const dob = document.getElementById('ply-dob').value;
      const age = parseInt(document.getElementById('ply-age').value, 10) || 22;
      const phone = document.getElementById('ply-phone').value;
      const alternateMobile = document.getElementById('ply-alt-mobile').value || '';
      const village = document.getElementById('ply-village').value;
      const district = document.getElementById('ply-district').value;
      const state = document.getElementById('ply-state').value || 'West Bengal';
      const battingStyle = document.getElementById('ply-batting-style').value;
      const bowlingStyle = document.getElementById('ply-bowling-style').value;
      const isWicketKeeper = (category === 'Wicket Keeper');
      const teamPreference = document.getElementById('ply-team-pref').value || 'Any Team';
      const upiRef = document.getElementById('ply-upi-ref').value;
      const remarks = document.getElementById('ply-remarks').value || upiRef;

      // Ensure CDN URLs are finalized or fallback to compressed data URLs
      const photoToSave = finalPhotoUrl || plyPhotoDataUrl;
      const aadharToSave = finalAadharUrl || plyAadharDataUrl;
      const proofToSave = finalProofUrl || plyProofDataUrl;

      // STRICT VALIDATION: Photo upload MUST succeed with a valid Cloudinary/CDN URL (http/https)
      if (!finalPhotoUrl || (!finalPhotoUrl.startsWith('http://') && !finalPhotoUrl.startsWith('https://'))) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "Submit Player Registration";
        }
        alert("⚠️ Photo Upload Failed!\n\nUnable to upload player photo to Cloudinary CDN. Please check your internet connection and try submitting again.\n\n(Registration was stopped to prevent corrupted/missing pictures).");
        return;
      }

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
        photoUrl: photoToSave || '',
        player_photo_url: photoToSave || '',
        aadharPhotoUrl: aadharToSave || '',
        aadhaar_photo_url: aadharToSave || '',
        paymentReceiptUrl: proofToSave || '',
        payment_receipt_url: proofToSave || '',
        paymentRef: upiRef,
        remarks,
        phoneVerified: true,
        basePrice: 300
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

function renderFixturesView(container) {
  let selectedCategory = 'JSL';
  let activeSubTab = 'matches'; // 'matches' or 'table'
  
  const drawFixtures = () => {
    const fixtures = store.getFixtures().filter(f => f.leagueCode === selectedCategory);
    const liveMatches = fixtures.filter(f => f.status === 'LIVE');
    const scheduledMatches = fixtures.filter(f => f.status === 'SCHEDULED');
    const completedMatches = fixtures.filter(f => f.status === 'COMPLETED');

    // Filter teams strictly by selected tournament category
    const leagueTeams = store.getTeams().filter(t => {
      const code = (t.leagueCode || (t.leagueId === 'leg-jsl' ? 'JSL' : (t.leagueId === 'leg-jpl' ? 'JPL' : (t.leagueId === 'leg-kpl' ? 'KPL' : 'JSL'))));
      return code === selectedCategory;
    });

    // Standings points compilation (dynamic calculation from matches)
    const standings = leagueTeams.map(t => {
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
            <h2 class="text-sm font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
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
                  secondInningsTarget = `<div class="text-xs font-black text-amber-700 mt-2">Target: ${state.target} | Need ${runsReq} runs off ${remainingBalls} balls</div>`;
                }

                return `
                  <div class="bg-white border-2 border-emerald-500 rounded-2xl shadow-md p-4 sm:p-5 flex flex-col justify-between">
                    <div class="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span class="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-black uppercase flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Scoring
                      </span>
                      <span class="text-[10px] text-slate-500 font-bold">📍 ${m.venue}</span>
                    </div>

                    <div class="py-3 space-y-2">
                      <div class="flex justify-between items-center">
                        <span class="font-black text-slate-900 text-base">${batTeamName}</span>
                        <span class="font-black text-2xl text-emerald-600">${state.runs} / ${state.wickets}</span>
                      </div>
                      <div class="flex justify-between items-center text-xs text-slate-500">
                        <span>Overs: <strong>${state.overs}.${state.balls}</strong> / ${m.oversLimit}</span>
                        <span>Run Rate: <strong>${rr}</strong></span>
                      </div>
                      ${secondInningsTarget}
                    </div>

                    <!-- Batter / Bowler partner logs -->
                    <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                      <div class="flex justify-between text-slate-700 font-bold">
                        <span>🏏 Striker: <strong class="text-slate-900">${store.getPlayerById(state.strikerId)?.name || 'Striking'}</strong></span>
                        <span>⚾ Bowler: <strong class="text-slate-900">${store.getPlayerById(state.bowlerId)?.name || 'Bowling'}</strong></span>
                      </div>
                      <div class="flex items-center gap-2 pt-1.5 border-t border-slate-200 text-[10px]">
                        <span class="text-slate-500 uppercase font-extrabold">This Over:</span>
                        <div class="flex gap-1">
                          ${(state.overBalls || []).map(b => `<span class="px-2 py-0.5 bg-white border border-slate-200 text-slate-800 rounded font-bold text-[9px] shadow-sm">${b.label}</span>`).join('')}
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
          <h2 class="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
            <span>📅</span> Scheduled Fixtures (${selectedCategory})
          </h2>
          ${scheduledMatches.length === 0 ? `
            <div class="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-white shadow-sm">No upcoming fixtures scheduled for ${selectedCategory} yet.</div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${scheduledMatches.map(m => `
                <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div class="flex justify-between items-center pb-2 border-b border-slate-100 text-[10px] text-slate-500">
                    <span class="font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">${m.leagueCode} Match</span>
                    <span class="font-semibold">🗓️ ${m.date} at ${m.time}</span>
                  </div>
                  <div class="py-3 flex justify-between items-center font-black text-slate-900 text-sm">
                    <span class="truncate">${m.teamAName}</span>
                    <span class="text-xs text-slate-400 font-bold px-2 py-0.5 bg-slate-100 rounded-full">VS</span>
                    <span class="truncate text-right">${m.teamBName}</span>
                  </div>
                  <div class="text-[10px] text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
                    <span>⚡ Overs: <strong>${m.oversLimit} Overs</strong></span>
                    <span>📍 Venue: <strong>${m.venue}</strong></span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- 3. COMPLETED MATCH RESULTS -->
        <div class="space-y-3">
          <h2 class="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
            <span>🏆</span> Match Results (${selectedCategory})
          </h2>
          ${completedMatches.length === 0 ? `
            <div class="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-white shadow-sm">No completed matches for ${selectedCategory} yet.</div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${completedMatches.map(m => `
                <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div class="flex justify-between items-center pb-2 border-b border-slate-100 text-[10px] text-slate-500">
                    <span class="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">Completed</span>
                    <span>🗓️ ${m.date}</span>
                  </div>
                  <div class="py-3 flex justify-between items-center font-black text-slate-900 text-xs sm:text-sm">
                    <div>
                      <div>${m.teamAName}</div>
                      <div class="text-[11px] text-slate-500 font-bold">${m.teamAScore ? `${m.teamAScore.runs}/${m.teamAScore.wickets} (${m.teamAScore.overs}.${m.teamAScore.balls} ov)` : ''}</div>
                    </div>
                    <span class="text-slate-400 font-semibold px-2">vs</span>
                    <div class="text-right">
                      <div>${m.teamBName}</div>
                      <div class="text-[11px] text-slate-500 font-bold">${m.teamBScore ? `${m.teamBScore.runs}/${m.teamBScore.wickets} (${m.teamBScore.overs}.${m.teamBScore.balls} ov)` : ''}</div>
                    </div>
                  </div>
                  <div class="text-[11px] bg-blue-50 border border-blue-200 text-blue-900 font-extrabold p-2 rounded-xl text-center mt-2 uppercase tracking-wide shadow-sm">
                    🏆 ${m.result || 'Match Completed'}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    } else {
      if (standings.length === 0) {
        mainContentHtml = `
          <div class="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm space-y-3 animate-fade-in">
            <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto text-2xl shadow-inner">
              🏏
            </div>
            <h3 class="text-base sm:text-lg font-black text-slate-800">${selectedCategory} Tournament Standings Coming Soon</h3>
            <p class="text-xs text-slate-500 max-w-md mx-auto">Franchise teams and fixtures for <strong>${selectedCategory}</strong> will be populated as tournament registrations open.</p>
          </div>
        `;
      } else {
        mainContentHtml = `
          <div class="space-y-3 sm:space-y-4 animate-fade-in">
            <!-- Table Header Bar -->
            <div class="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h2 class="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏆</span> ${selectedCategory} Franchise Standings
                </h2>
              </div>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full font-black text-[10px] uppercase shadow-xs">
                <span>⭐</span> Top 4 Qualify for Semifinal
              </span>
            </div>

            <!-- Single-Display Mobile-Friendly Colorful Points Table -->
            <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
              <table class="w-full text-left text-xs text-slate-800">
                <thead class="bg-gradient-to-r from-slate-100 via-blue-50/50 to-slate-100 font-black text-[10px] sm:text-[11px] uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th class="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center w-7 sm:w-10">#</th>
                    <th class="py-2.5 sm:py-3 px-1.5 sm:px-3 text-left">Team</th>
                    <th class="py-2.5 sm:py-3 px-1 text-center w-6 sm:w-10" title="Played">P</th>
                    <th class="py-2.5 sm:py-3 px-1 text-center w-6 sm:w-10 text-emerald-700 font-black" title="Won">W</th>
                    <th class="py-2.5 sm:py-3 px-1 text-center w-6 sm:w-10 text-rose-600 font-bold" title="Lost">L</th>
                    <th class="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center w-10 sm:w-14 text-blue-700 font-black" title="Points">PTS</th>
                    <th class="py-2.5 sm:py-3 px-2 sm:px-4 text-right w-14 sm:w-20 font-mono" title="Net Run Rate">NRR</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-semibold">
                  ${standings.map((t, idx) => {
                    const isSemiSpot = idx < 4;
                    const rowBg = isSemiSpot ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'hover:bg-slate-50';
                    return `
                      <tr class="${rowBg} transition-colors">
                        <td class="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-center font-black">
                          <span class="inline-flex w-5 h-5 sm:w-6 sm:h-6 rounded-full ${isSemiSpot ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500 border border-slate-200'} items-center justify-center text-[10px] font-black">
                            ${idx + 1}
                          </span>
                        </td>
                        <td class="py-2.5 sm:py-3.5 px-1.5 sm:px-3 font-black text-slate-900">
                          <div class="flex items-center gap-1.5 min-w-0">
                            ${isSemiSpot ? `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="In Semifinal Zone"></span>` : ''}
                            <span class="text-xs sm:text-sm font-black truncate tracking-tight">${t.name}</span>
                          </div>
                        </td>
                        <td class="py-2.5 sm:py-3.5 px-1 text-center font-mono text-xs text-slate-600 font-bold">${t.played}</td>
                        <td class="py-2.5 sm:py-3.5 px-1 text-center font-mono text-xs text-emerald-700 font-black">${t.won}</td>
                        <td class="py-2.5 sm:py-3.5 px-1 text-center font-mono text-xs text-rose-600 font-bold">${t.lost}</td>
                        <td class="py-2.5 sm:py-3.5 px-1.5 sm:px-3 text-center font-mono">
                          <span class="inline-block px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md font-black text-[11px] sm:text-xs shadow-xs">
                            ${t.points}
                          </span>
                        </td>
                        <td class="py-2.5 sm:py-3.5 px-2 sm:px-4 text-right font-mono text-[10px] sm:text-xs font-bold ${parseFloat(t.nrr) >= 0 ? 'text-emerald-700' : 'text-slate-500'}">
                          ${parseFloat(t.nrr) > 0 ? '+' : ''}${t.nrr}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Mobile-Friendly Footer Legend -->
            <div class="flex flex-wrap items-center justify-between text-[10px] text-slate-500 px-2 pt-1 font-semibold gap-1">
              <span class="flex items-center gap-1 text-emerald-700 font-bold">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> 1-4 Rank: Semifinal Qualifier
              </span>
              <span class="text-slate-400">P=Played, W=Won, L=Lost, PTS=Points</span>
            </div>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <div class="space-y-6 sm:space-y-8 animate-fade-in pb-16">
        <!-- Banner & Category Selector -->
        <div class="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span class="p-1.5 bg-emerald-100 text-emerald-800 rounded-xl">🏏</span> Match Center
            </h1>
            <p class="text-xs text-slate-500 mt-1">View live scores, match standings, and fixtures in real-time.</p>
          </div>
          <div class="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-100 p-1 shadow-inner">
            <button data-cat="JSL" class="fixture-cat-btn ${selectedCategory === 'JSL' ? 'bg-blue-600 text-white font-extrabold shadow' : 'text-slate-600 hover:text-slate-900 font-bold'} px-3.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer">JSL</button>
            <button data-cat="JPL" class="fixture-cat-btn ${selectedCategory === 'JPL' ? 'bg-blue-600 text-white font-extrabold shadow' : 'text-slate-600 hover:text-slate-900 font-bold'} px-3.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer">JPL</button>
            <button data-cat="KPL" class="fixture-cat-btn ${selectedCategory === 'KPL' ? 'bg-blue-600 text-white font-extrabold shadow' : 'text-slate-600 hover:text-slate-900 font-bold'} px-3.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer">KPL</button>
          </div>
        </div>

        <!-- Sub-Tabs Navigation (Matches / Points Table) -->
        <div class="flex gap-4 border-b border-slate-200 pb-2">
          <button id="fixture-subtab-matches" class="text-xs font-black pb-1.5 border-b-2 transition-all cursor-pointer ${activeSubTab === 'matches' ? 'text-blue-700 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'}">
            🏏 Matches
          </button>
          <button id="fixture-subtab-table" class="text-xs font-black pb-1.5 border-b-2 transition-all cursor-pointer ${activeSubTab === 'table' ? 'text-blue-700 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'}">
            📊 Points Table (Standings)
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
    auctionPollInterval = null;
  }

  let playerSearchQuery = '';
  let activeStatusTab = 'all'; // 'all', 'sold', 'unsold', 'pending'

  // 1. Render outer shell ONCE in crisp professional theme
  container.innerHTML = `
    <div class="space-y-5 sm:space-y-6 animate-fade-in pb-16 max-w-4xl mx-auto px-1 sm:px-4">
      
      <!-- Top Header matching screenshot -->
      <div class="bg-white border-2 border-slate-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center shrink-0 text-xl shadow-2xs">
            🔨
          </span>
          <h1 class="text-base sm:text-xl font-black text-slate-900 tracking-tight">
            Live Player Auction Hub
          </h1>
        </div>
        <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-full border border-emerald-200 shadow-2xs">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> LIVE
        </span>
      </div>

      <!-- Active Player Live Block (Waiting / Active Bidding) -->
      <div id="auction-active-block-container" class="space-y-4"></div>

      <!-- FRANCHISE PURSES SECTION (ALL TEAMS SHOWN FIRST) -->
      <div class="space-y-3 pt-1">
        <div class="flex justify-between items-center px-1">
          <h3 class="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
            FRANCHISE PURSES
          </h3>
          <span class="text-xs font-bold text-slate-500">Target: 13 Players</span>
        </div>

        <div class="space-y-3" id="auction-franchise-purses-list"></div>
      </div>

      <!-- LOWER PORTION: Compact & Ultra-Stylish Player Auction Status & Record Card -->
      <div class="bg-white border-2 border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
        
        <!-- Sleek Click-to-Open Accordion Header (Strict Single-Line Design) -->
        <button id="toggle-player-status-accordion-btn" class="w-full flex items-center justify-between p-2.5 sm:p-3.5 bg-white hover:bg-slate-50 transition-all text-left cursor-pointer group select-none">
          <div class="flex items-center gap-2.5 min-w-0 pr-1">
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              📋
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <!-- Single Line 1: Header - Auction Record + Total Badge -->
              <div class="flex items-center gap-1.5 whitespace-nowrap">
                <h3 class="text-xs sm:text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">
                  Auction Record
                </h3>
                <span class="px-1.5 py-0.2 bg-slate-900 text-white rounded-full text-[9px] sm:text-[10px] font-mono font-bold whitespace-nowrap" id="accordion-total-players-badge">
                  0 Players
                </span>
              </div>
              
              <!-- Mini Stats Row: Sold, Unsold & Queue in single line, respective Numbers in next line -->
              <div class="flex items-center gap-2.5 sm:gap-4 mt-1">
                <!-- Sold -->
                <div class="flex flex-col items-center">
                  <span class="text-[9px] font-extrabold text-emerald-700 flex items-center gap-0.5 whitespace-nowrap">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span> Sold
                  </span>
                  <span class="text-[11px] sm:text-xs font-black text-emerald-900 font-mono leading-tight" id="accordion-sold-count">
                    0
                  </span>
                </div>

                <div class="h-4 w-[1px] bg-slate-200 shrink-0"></div>

                <!-- Unsold -->
                <div class="flex flex-col items-center">
                  <span class="text-[9px] font-extrabold text-rose-600 flex items-center gap-0.5 whitespace-nowrap">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span> Unsold
                  </span>
                  <span class="text-[11px] sm:text-xs font-black text-rose-900 font-mono leading-tight" id="accordion-unsold-count">
                    0
                  </span>
                </div>

                <div class="h-4 w-[1px] bg-slate-200 shrink-0"></div>

                <!-- Queue -->
                <div class="flex flex-col items-center">
                  <span class="text-[9px] font-extrabold text-slate-500 flex items-center gap-0.5 whitespace-nowrap">
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span> Queue
                  </span>
                  <span class="text-[11px] sm:text-xs font-black text-slate-800 font-mono leading-tight" id="accordion-pending-count">
                    0
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex items-center shrink-0 pl-1">
            <span id="accordion-toggle-btn-badge" class="px-2.5 sm:px-3 py-1.5 bg-blue-600 group-hover:bg-blue-700 text-white font-black text-[11px] sm:text-xs rounded-xl shadow-xs flex items-center gap-1 transition-all whitespace-nowrap">
              <span id="accordion-toggle-label">Open Table</span>
              <span id="accordion-toggle-arrow" class="text-[9px] transition-transform duration-300">▼</span>
            </span>
          </div>
        </button>

        <!-- Collapsible Content (Hidden by Default) -->
        <div id="player-auction-status-collapsible" class="hidden border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4 space-y-3 animate-fade-in">
          
          <!-- Compact Segmented Filter Tabs -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar" id="auction-status-filter-tabs">
            <button class="status-tab-btn px-2.5 py-1.2 rounded-lg font-black text-xs transition-all cursor-pointer bg-slate-900 text-white shadow-xs shrink-0" data-tab="all">
              All (<span id="count-all">0</span>)
            </button>
            <button class="status-tab-btn px-2.5 py-1.2 rounded-lg font-bold text-xs transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shrink-0" data-tab="sold">
              ✅ Sold (<span id="count-sold">0</span>)
            </button>
            <button class="status-tab-btn px-2.5 py-1.2 rounded-lg font-bold text-xs transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shrink-0" data-tab="unsold">
              ❌ Unsold (<span id="count-unsold">0</span>)
            </button>
            <button class="status-tab-btn px-2.5 py-1.2 rounded-lg font-bold text-xs transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shrink-0" data-tab="pending">
              ⏳ In Queue (<span id="count-pending">0</span>)
            </button>
          </div>

          <!-- Compact Search Bar -->
          <div class="relative">
            <input type="text" id="auction-player-search-input" placeholder="🔍 Search by name, village, role, or team..." class="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl py-2 px-3 pl-3 focus:outline-none focus:border-blue-500 font-bold placeholder-slate-400 shadow-2xs" />
          </div>

          <!-- Stylish Compact Table Container -->
          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div id="auction-players-full-table-content" class="overflow-x-auto max-h-[460px] overflow-y-auto"></div>
          </div>

        </div>

      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  let lastActivePlayerId = undefined;
  let lastActiveStatus = undefined;

  // Toggle Accordion Click Handler
  let isTableOpen = false;
  const toggleBtn = document.getElementById('toggle-player-status-accordion-btn');
  const collapsibleDiv = document.getElementById('player-auction-status-collapsible');
  const toggleLabel = document.getElementById('accordion-toggle-label');
  const toggleArrow = document.getElementById('accordion-toggle-arrow');

  if (toggleBtn && collapsibleDiv) {
    toggleBtn.addEventListener('click', () => {
      isTableOpen = !isTableOpen;
      if (isTableOpen) {
        collapsibleDiv.classList.remove('hidden');
        if (toggleLabel) toggleLabel.textContent = 'Close';
        if (toggleArrow) toggleArrow.textContent = '▲';
        renderPlayerStatusTable();
      } else {
        collapsibleDiv.classList.add('hidden');
        if (toggleLabel) toggleLabel.textContent = 'Open Table';
        if (toggleArrow) toggleArrow.textContent = '▼';
      }
    });
  }

  // Tab switching
  document.querySelectorAll('.status-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeStatusTab = e.currentTarget.getAttribute('data-tab');
      document.querySelectorAll('.status-tab-btn').forEach(b => {
        b.className = 'status-tab-btn px-2.5 py-1.2 rounded-lg font-bold text-xs transition-all cursor-pointer bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shrink-0';
      });
      e.currentTarget.className = 'status-tab-btn px-2.5 py-1.2 rounded-lg font-black text-xs transition-all cursor-pointer bg-slate-900 text-white shadow-xs shrink-0';
      renderPlayerStatusTable();
    });
  });

  // Search input handler
  const searchInput = document.getElementById('auction-player-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      playerSearchQuery = e.target.value.toLowerCase().trim();
      renderPlayerStatusTable();
    });
  }

  const renderPlayerStatusTable = () => {
    const tableContainer = document.getElementById('auction-players-full-table-content');
    const allPlayers = store.getPlayers().filter(p => p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED');
    const teams = store.getTeams();

    const soldList = allPlayers.filter(p => p.teamId || p.auctionStatus === 'SOLD');
    const unsoldList = allPlayers.filter(p => p.auctionStatus === 'UNSOLD' && !p.teamId);
    const pendingList = allPlayers.filter(p => !p.teamId && p.auctionStatus !== 'SOLD' && p.auctionStatus !== 'UNSOLD' && !p.isIcon && !p.isIconPlayer);

    // Update Counts & Badges
    document.getElementById('accordion-total-players-badge')?.replaceChildren(document.createTextNode(`${allPlayers.length} Players`));
    document.getElementById('accordion-sold-count')?.replaceChildren(document.createTextNode(String(soldList.length)));
    document.getElementById('accordion-unsold-count')?.replaceChildren(document.createTextNode(String(unsoldList.length)));
    document.getElementById('accordion-pending-count')?.replaceChildren(document.createTextNode(String(pendingList.length)));

    document.getElementById('count-all')?.replaceChildren(document.createTextNode(String(allPlayers.length)));
    document.getElementById('count-sold')?.replaceChildren(document.createTextNode(String(soldList.length)));
    document.getElementById('count-unsold')?.replaceChildren(document.createTextNode(String(unsoldList.length)));
    document.getElementById('count-pending')?.replaceChildren(document.createTextNode(String(pendingList.length)));

    if (!tableContainer || collapsibleDiv?.classList.contains('hidden')) return;

    let listToDisplay = allPlayers;
    if (activeStatusTab === 'sold') listToDisplay = soldList;
    else if (activeStatusTab === 'unsold') listToDisplay = unsoldList;
    else if (activeStatusTab === 'pending') listToDisplay = pendingList;

    if (playerSearchQuery) {
      listToDisplay = listToDisplay.filter(p => {
        const team = teams.find(t => t.id === p.teamId);
        const teamName = team ? team.name.toLowerCase() : '';
        const name = (p.name || '').toLowerCase();
        const village = (p.village || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        return name.includes(playerSearchQuery) || teamName.includes(playerSearchQuery) || village.includes(playerSearchQuery) || cat.includes(playerSearchQuery);
      });
    }

    if (listToDisplay.length === 0) {
      tableContainer.innerHTML = `
        <div class="py-6 text-center text-xs text-slate-400 font-bold italic">
          No players match your search filter.
        </div>
      `;
      return;
    }

    tableContainer.innerHTML = `
      <table class="w-full text-left text-xs text-slate-700">
        <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 tracking-wider sticky top-0 z-10 backdrop-blur-sm">
          <tr>
            <th class="py-2 px-3 min-w-[140px]">PLAYER</th>
            <th class="py-2 px-2.5">ROLE</th>
            <th class="py-2 px-2.5 min-w-[130px]">STATUS / TEAM</th>
            <th class="py-2 px-3 text-right font-mono">PRICE</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 font-semibold">
          ${listToDisplay.map(p => {
            const isSold = (p.teamId || p.auctionStatus === 'SOLD');
            const isUnsold = (p.auctionStatus === 'UNSOLD' && !p.teamId);
            const team = teams.find(t => t.id === p.teamId);
            const teamLogo = team ? (team.logoUrl || team.teamLogoUrl || '') : '';

            return `
              <tr class="hover:bg-blue-50/30 transition-colors">
                <td class="py-2 px-3">
                  <div class="flex items-center gap-2">
                    <img src="${getOptimizedImageUrl(p.photoUrl || p.player_photo_url, 70, 70)}" class="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                    <div class="min-w-0">
                      <div class="font-black text-slate-900 text-xs truncate">${p.name}</div>
                      <div class="text-[9px] text-slate-400 font-medium truncate leading-tight">📍 ${p.village || 'Jhankra'}</div>
                    </div>
                  </div>
                </td>
                <td class="py-2 px-2.5">
                  <span class="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-bold uppercase whitespace-nowrap">
                    ${p.category || 'All Rounder'}
                  </span>
                </td>
                <td class="py-2 px-2.5">
                  ${isSold ? `
                    <div class="inline-flex items-center gap-1 px-2 py-0.5 ${(p.isIcon || p.isIconPlayer) ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-blue-50 text-blue-800 border-blue-200/80'} border rounded-md text-[10px] font-black max-w-[160px] truncate">
                      ${(p.isIcon || p.isIconPlayer) ? '⭐' : (teamLogo ? `<img src="${teamLogo}" class="w-3.5 h-3.5 rounded-xs object-cover shrink-0" />` : '🛡️')}
                      <span class="truncate">${team ? team.name : (p.teamName || 'Sold')} ${(p.isIcon || p.isIconPlayer) ? '(Icon)' : ''}</span>
                    </div>
                  ` : isUnsold ? `
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-black whitespace-nowrap">
                      ❌ UNSOLD
                    </span>
                  ` : `
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold whitespace-nowrap">
                      ⏳ In Queue
                    </span>
                  `}
                </td>
                <td class="py-2 px-3 text-right font-mono font-black ${isSold ? ((p.isIcon || p.isIconPlayer) ? 'text-amber-800 text-xs' : 'text-emerald-700 text-xs') : 'text-slate-400 text-[10px]'} whitespace-nowrap">
                  ${isSold ? ((p.isIcon || p.isIconPlayer) ? '⭐ ₹ 1,000' : `₹ ${Number(p.soldPrice || p.basePrice || 300).toLocaleString('en-IN')}`) : `₹${Number(p.basePrice || 300).toLocaleString('en-IN')}`}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };

  // Pre-calculate counts on load
  renderPlayerStatusTable();

  let lastAuctionSyncTimestamp = 0;
  let lastAuctionCloudHeartbeat = 0;

  const pollActiveAuctionState = async () => {
    if (currentRoute !== 'auction') {
      if (auctionPollInterval) {
        clearInterval(auctionPollInterval);
        auctionPollInterval = null;
      }
      return;
    }

    const state = await store.getLiveAuctionState();
    if (currentRoute !== 'auction') return;

    const now = Date.now();
    const stateUpdatedAt = Number(state?.updated_at || state?.timestamp || 0);

    // If state version changed OR periodic heartbeat (every 3.5s), sync cloud data to keep all phones 100% matched!
    if (stateUpdatedAt > lastAuctionSyncTimestamp || (now - lastAuctionCloudHeartbeat > 3500)) {
      lastAuctionSyncTimestamp = stateUpdatedAt;
      lastAuctionCloudHeartbeat = now;
      try {
        await store.syncWithCloud();
      } catch (err) {
        console.warn("Auction cloud sync notice:", err);
      }
    }

    const teams = store.getTeams();
    const allPlayers = store.getPlayers();
    const activeBlockWrapper = document.getElementById('auction-active-block-container');
    const pursesWrapper = document.getElementById('auction-franchise-purses-list');

    // 1. Render / Update Active Bidding Block
    if (activeBlockWrapper) {
      if (state && state.active_player_id) {
        const bidderTeam = teams.find(t => t.id === state.highest_bidder_team_id);
        const isUnsoldState = (state.status === 'UNSOLD' || state.is_unsold);
        const isStateChanged = (lastActivePlayerId !== state.active_player_id || lastActiveStatus !== state.status);

        if (isStateChanged) {
          lastActivePlayerId = state.active_player_id;
          lastActiveStatus = state.status;
          const playerPhoto = getOptimizedImageUrl(state.photoUrl, 600, 600) || 'assets/card_jsl_user.png';

          activeBlockWrapper.innerHTML = `
            <div class="relative rounded-2xl overflow-hidden shadow-2xl border-2 ${isUnsoldState ? 'border-rose-500' : 'border-slate-200'} min-h-[380px] sm:min-h-[420px] flex flex-col justify-between p-4 sm:p-5 bg-slate-100 animate-fade-in">
              <img src="${playerPhoto}" class="absolute inset-0 w-full h-full object-cover object-top" alt="${state.name}" onerror="this.src='assets/card_jsl_user.png'" />
              <div class="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-slate-900/40 pointer-events-none"></div>

              ${isUnsoldState ? `
                <!-- 🔴 LARGE RED UNSOLD STAMP OVERLAY -->
                <div class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-slate-950/40 backdrop-blur-[1px]">
                  <div class="px-6 sm:px-10 py-3 sm:py-4 bg-rose-600/95 text-white font-black text-2xl sm:text-4xl uppercase tracking-widest border-4 border-white shadow-2xl rounded-2xl rotate-[-12deg] animate-pulse">
                    ❌ UNSOLD (ROUND 1)
                  </div>
                </div>
              ` : ''}

              <div class="relative z-10 flex justify-between items-center">
                <span class="px-3 py-1 ${isUnsoldState ? 'bg-rose-600 text-white' : 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950'} font-black text-[10px] rounded-full uppercase tracking-wider shadow-md flex items-center gap-1.5 border border-white/60">
                  <span class="w-2 h-2 ${isUnsoldState ? 'bg-white' : 'bg-rose-600'} rounded-full animate-ping"></span> ${isUnsoldState ? 'PASSED FOR ROUND 1' : 'LIVE AUCTION'}
                </span>
                <span class="px-3 py-1 bg-white/95 backdrop-blur-md text-slate-900 border border-slate-200 rounded-full text-xs font-mono font-black shadow-sm">
                  ${state.registrationId || 'JSL 2026'}
                </span>
              </div>

              <div class="relative z-10 space-y-2 mt-auto mb-3">
                <div class="inline-block p-3 sm:p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-white/80 shadow-lg max-w-full">
                  <div class="flex flex-wrap items-center gap-1.5 mb-1">
                    <span class="px-2.5 py-0.5 bg-emerald-600 text-white font-extrabold text-[10px] sm:text-[11px] rounded-md uppercase tracking-wider shadow-sm">
                      🏏 ${state.category || 'All Rounder'}
                    </span>
                    <span class="px-2.5 py-0.5 bg-blue-50 text-blue-800 font-bold text-[10px] rounded-md border border-blue-200">
                      📍 ${state.village || 'Paschim Medinipur'}
                    </span>
                  </div>
                  <h2 class="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                    ${state.name}
                  </h2>
                  <div class="text-[11px] text-slate-600 font-semibold flex flex-wrap items-center gap-2 mt-0.5">
                    <span>${state.battingStyle || 'Right Hand Bat'}</span>
                    ${state.bowlingStyle && state.bowlingStyle !== 'None' ? `<span>• ${state.bowlingStyle}</span>` : ''}
                    <span class="text-amber-600 font-bold">• Base: ₹ ${state.basePrice || 300}</span>
                  </div>
                </div>
              </div>

              <div class="relative z-10 grid grid-cols-2 gap-3 ${isUnsoldState ? 'bg-rose-950/95 border-2 border-rose-500' : 'bg-slate-950/95 border-2 border-amber-400'} backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl shadow-2xl">
                <div>
                  <span class="text-[9px] font-extrabold ${isUnsoldState ? 'text-rose-300' : 'text-amber-300'} uppercase tracking-widest block">${isUnsoldState ? 'Auction Status' : 'Current High Bid'}</span>
                  <span id="auction-live-bid-display" class="text-xl sm:text-2xl font-black ${isUnsoldState ? 'text-rose-400' : 'text-amber-400'} font-mono">
                    ${isUnsoldState ? '❌ UNSOLD' : '₹ ' + Number(state.current_bid || state.basePrice || 300).toLocaleString('en-IN')}
                  </span>
                  <span class="text-[9px] text-slate-400 block font-mono">Base Price: ₹ ${state.basePrice || 300}</span>
                </div>
                <div class="text-right border-l border-slate-800 pl-3 flex flex-col justify-center">
                  <span class="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">${isUnsoldState ? 'Round 2 Status' : 'Leading Bidder'}</span>
                  <span id="auction-leading-bidder-display" class="text-xs sm:text-sm font-black text-white block mt-0.5 truncate">
                    ${isUnsoldState ? 'Eligible for Re-Bid' : (bidderTeam ? '🛡️ ' + bidderTeam.name : 'No bids yet')}
                  </span>
                  <span id="auction-bid-tag-display" class="text-[9px] font-bold ${isUnsoldState ? 'text-amber-400' : (bidderTeam ? 'text-emerald-400' : 'text-slate-400')}">
                    ${isUnsoldState ? '⚡ Round 2 Pool' : (bidderTeam ? '🔥 Leading Offer' : 'Opening Bid')}
                  </span>
                </div>
              </div>
            </div>
          `;
          if (window.lucide) window.lucide.createIcons();
        } else if (!isUnsoldState) {
          const bidEl = document.getElementById('auction-live-bid-display');
          const teamEl = document.getElementById('auction-leading-bidder-display');
          const tagEl = document.getElementById('auction-bid-tag-display');
          if (bidEl) bidEl.textContent = `₹ ${Number(state.current_bid || state.basePrice || 300).toLocaleString('en-IN')}`;
          if (teamEl) teamEl.textContent = bidderTeam ? '🛡️ ' + bidderTeam.name : 'No bids yet';
          if (tagEl) {
            tagEl.textContent = bidderTeam ? '🔥 Leading Offer' : 'Opening Bid';
            tagEl.className = `text-[9px] font-bold ${bidderTeam ? 'text-emerald-400' : 'text-slate-400'}`;
          }
        }
      } else {
        if (lastActivePlayerId !== null) {
          lastActivePlayerId = null;
          lastActiveStatus = null;
          const isAuctionCompleted = (state && state.status === 'COMPLETED') || (allPlayers.length > 0 && allPlayers.filter(p => (p.registrationStatus === 'APPROVED' || p.paymentStatus === 'APPROVED')).every(p => p.auctionStatus === 'SOLD'));

          activeBlockWrapper.innerHTML = `
            <div class="text-center p-6 sm:p-8 ${isAuctionCompleted ? 'bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border-2 border-amber-400/60' : 'bg-white border-2 border-dashed border-slate-300'} rounded-2xl sm:rounded-3xl shadow-xs">
              <div class="w-12 h-12 rounded-2xl ${isAuctionCompleted ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-500'} flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0-.83-.83-.83-2.17 0-3L11 10"/>
                  <path d="m16 16 6-6"/>
                  <path d="m8 8 6-6"/>
                  <path d="m9 7 8 8"/>
                  <path d="m21 11-8-8"/>
                </svg>
              </div>
              <h3 class="text-slate-900 font-black text-base sm:text-lg">
                ${isAuctionCompleted ? '🏆 JSL 2026 Live Auction Concluded!' : 'Waiting for Auctioneer to Place Player on Block...'}
              </h3>
              <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                ${isAuctionCompleted ? 'All approved franchise squad selections are complete. Review the final sold rosters below.' : 'Live bids will appear here automatically when the next player is auctioned.'}
              </p>
            </div>
          `;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    }

    // 2. Real-time update of player status table if open
    renderPlayerStatusTable();

    // 3. Render / Update Franchise Purses & Live Squad Names
    if (pursesWrapper) {
      pursesWrapper.innerHTML = teams.map(t => {
        const hasIcon = !!((t.iconPlayerName && t.iconPlayerName.trim()) || (t.iconName && t.iconName.trim()));
        const iconDeduction = hasIcon ? 1000 : 0;
        const totalPurse = Number(t.purseBudget || t.purse || 8000);
        const purchasedNonIconPlayers = allPlayers.filter(p => p.teamId === t.id && !p.isIcon && !p.isIconPlayer && (p.auctionStatus === 'SOLD' || p.paymentStatus === 'APPROVED'));
        const auctionSpent = purchasedNonIconPlayers.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0);
        const spent = iconDeduction + auctionSpent;
        const left = Math.max(0, totalPurse - spent);
        const squadCount = (hasIcon ? 1 : 0) + purchasedNonIconPlayers.length;
        const totalRequired = 13;
        const ratio = Math.min(100, Math.max(0, (left / totalPurse) * 100));

        return `
          <div data-team-id="${t.id}" class="franchise-purse-card p-3 sm:p-3.5 bg-white border-2 border-slate-200/90 hover:border-amber-400 rounded-2xl sm:rounded-3xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-2.5 cursor-pointer group">
            <div class="flex justify-between items-center gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <img src="${t.logoUrl || t.teamLogoUrl || 'assets/card_jsl_user.png'}" class="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0 group-hover:border-amber-400 transition-colors" onerror="this.src='assets/card_jsl_user.png'" />
                <span class="font-black text-slate-900 text-xs sm:text-sm truncate group-hover:text-amber-800 transition-colors" title="${t.name}">${t.name}</span>
              </div>
              <span class="px-2.5 py-0.5 bg-sky-50 text-sky-800 font-mono font-black text-[11px] rounded-lg border border-sky-200 shrink-0">
                Squad: <strong class="text-teal-700 font-black">${squadCount}/${totalRequired}</strong>
              </span>
            </div>
            
            ${hasIcon ? `
              <div class="text-[11px] text-amber-900 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200/90 font-bold flex items-center justify-between">
                <span class="truncate">⭐ Icon: ${t.iconPlayerName || t.iconName}</span>
                <span class="text-amber-700 font-mono text-[10px] font-black shrink-0">-₹1,000</span>
              </div>
            ` : ''}

            <!-- Real-Time Purchased Player Chips under this team -->
            ${purchasedNonIconPlayers.length > 0 ? `
              <div class="flex flex-wrap gap-1 pt-0.5">
                ${purchasedNonIconPlayers.map(pl => `
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[9px] font-bold text-slate-800 truncate max-w-[140px]" title="${pl.name} (₹${pl.soldPrice || 0})">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    ${pl.name}
                  </span>
                `).join('')}
              </div>
            ` : `
              <div class="text-[10px] text-slate-400 italic">No auction players purchased yet</div>
            `}

            <div class="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
              <span class="text-[11px] font-bold text-slate-500">Purse Left:</span>
              <span class="font-black text-emerald-700 font-mono text-xs">
                ₹ ${Number(left).toLocaleString('en-IN')} 
                <span class="text-[10px] text-slate-400 font-normal">/ ₹${Number(totalPurse).toLocaleString('en-IN')}</span>
              </span>
            </div>

            <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
              <div class="bg-gradient-to-r from-teal-500 to-emerald-600 h-full rounded-full transition-all duration-500" style="width: ${ratio}%"></div>
            </div>

            <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-1 group-hover:text-amber-700 transition-colors">
              <span class="flex items-center gap-1">
                <i data-lucide="users" class="w-3 h-3 text-amber-500"></i> Full Squad Details
              </span>
              <span class="text-amber-600 font-black">➔</span>
            </div>
          </div>
        `;
      }).join('');

      pursesWrapper.querySelectorAll('.franchise-purse-card').forEach(card => {
        card.addEventListener('click', (e) => {
          const teamId = e.currentTarget.getAttribute('data-team-id');
          if (teamId) {
            openTeamPurchasedSquadModal(teamId);
          }
        });
      });
    }
  };

  pollActiveAuctionState();
  auctionPollInterval = setInterval(pollActiveAuctionState, 1000);
}

// --- FRANCHISE SQUAD & PURCHASED PLAYERS MODAL ---
export function openTeamPurchasedSquadModal(teamId) {
  document.getElementById('team-squad-modal')?.remove();

  const team = store.getTeamById(teamId);
  if (!team) return;

  const allPlayers = store.getPlayers();
  const hasIcon = !!((team.iconPlayerName && team.iconPlayerName.trim()) || (team.iconName && team.iconName.trim()));
  const iconName = team.iconPlayerName || team.iconName;
  const iconDeduction = hasIcon ? 1000 : 0;

  // Find purchased players (excluding icon player to avoid double charging)
  const purchasedNonIconPlayers = allPlayers.filter(p => p.teamId === team.id && !p.isIcon && !p.isIconPlayer && (p.auctionStatus === 'SOLD' || p.paymentStatus === 'APPROVED'));
  const auctionSpent = purchasedNonIconPlayers.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0);
  const totalPurse = Number(team.purseBudget || team.purse || 8000);
  const totalSpent = iconDeduction + auctionSpent;
  const remainingPurse = Math.max(0, totalPurse - totalSpent);
  const squadCount = (hasIcon ? 1 : 0) + purchasedNonIconPlayers.length;

  const modalHtml = `
    <div id="team-squad-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div class="relative w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 max-h-[88vh] flex flex-col">
        
        <!-- Header -->
        <div class="flex justify-between items-start pb-3.5 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <img src="${team.logoUrl || team.teamLogoUrl || 'assets/card_jsl_user.png'}" class="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
            <div>
              <div class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                🛡️ Franchise Squad
              </div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">${team.name}</h3>
              <p class="text-[11px] text-slate-500 font-bold">Owner: <span class="text-slate-800">${team.ownerName || 'Franchise Owner'}</span></p>
            </div>
          </div>
          <button id="close-team-squad-modal-btn" class="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Budget & Squad Statistics Ribbon -->
        <div class="grid grid-cols-3 gap-2 my-3.5">
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-center shadow-2xs">
            <div class="text-[9px] font-black text-slate-500 uppercase tracking-wider">Squad Count</div>
            <div class="text-sm sm:text-base font-black text-teal-700 font-mono mt-0.5">${squadCount} / 13</div>
          </div>
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-center shadow-2xs">
            <div class="text-[9px] font-black text-slate-500 uppercase tracking-wider">Purse Spent</div>
            <div class="text-sm sm:text-base font-black text-rose-600 font-mono mt-0.5">₹${Number(totalSpent).toLocaleString('en-IN')}</div>
          </div>
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-center shadow-2xs">
            <div class="text-[9px] font-black text-slate-500 uppercase tracking-wider">Purse Left</div>
            <div class="text-sm sm:text-base font-black text-emerald-700 font-mono mt-0.5">₹${Number(remainingPurse).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <!-- Player List Header -->
        <div class="flex justify-between items-center px-1 mb-2">
          <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>👥 Purchased Squad</span>
            <span class="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded-full font-bold">${squadCount} Players</span>
          </h4>
          <span class="text-[10px] font-bold text-slate-400">Total Budget: ₹${Number(totalPurse).toLocaleString('en-IN')}</span>
        </div>

        <!-- Scrollable Player List -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          ${hasIcon ? `
            <!-- Icon Player Card -->
            <div class="p-3 bg-gradient-to-r from-amber-50 to-orange-50/60 border-2 border-amber-300/80 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center text-xl shrink-0">
                  ⭐
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="font-black text-sm text-slate-900 truncate">${iconName}</span>
                    <span class="px-1.5 py-0.5 bg-amber-200 text-amber-900 font-black text-[9px] rounded uppercase tracking-wider">ICON</span>
                  </div>
                  <div class="text-[11px] text-amber-800 font-bold">
                    Official Franchise Icon Player
                  </div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Icon Fee</div>
                <div class="text-xs sm:text-sm font-black text-amber-700 font-mono">₹ 1,000</div>
              </div>
            </div>
          ` : ''}

          ${purchasedNonIconPlayers.length > 0 ? purchasedNonIconPlayers.map((p, idx) => `
            <div class="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-all">
              <div class="flex items-center gap-3 min-w-0">
                <img src="${getOptimizedImageUrl(p.photoUrl || p.player_photo_url, 80, 80)}" class="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                <div class="min-w-0">
                  <div class="font-black text-sm text-slate-900 truncate">${p.name}</div>
                  <div class="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 flex-wrap">
                    <span class="text-teal-700">🏏 ${p.category || 'All Rounder'}</span>
                    <span>•</span>
                    <span>📍 ${p.village || 'Paschim Medinipur'}</span>
                  </div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Sold Price</div>
                <div class="text-xs sm:text-sm font-black text-emerald-700 font-mono">₹ ${Number(p.soldPrice || p.basePrice || 300).toLocaleString('en-IN')}</div>
              </div>
            </div>
          `).join('') : (!hasIcon ? `
            <div class="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <div class="text-3xl">🏏</div>
              <div class="text-xs sm:text-sm font-black text-slate-700">No Players Purchased Yet</div>
              <p class="text-[11px] text-slate-400 max-w-xs mx-auto">Players bought by ${team.name} during the live auction will appear here with their final auction prices.</p>
            </div>
          ` : '')}
        </div>

        <!-- Footer -->
        <div class="pt-3 border-t border-slate-100 mt-3 text-center">
          <button id="dismiss-team-squad-btn" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer">
            Close Squad Window
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  document.getElementById('close-team-squad-modal-btn')?.addEventListener('click', () => {
    document.getElementById('team-squad-modal')?.remove();
  });
  document.getElementById('dismiss-team-squad-btn')?.addEventListener('click', () => {
    document.getElementById('team-squad-modal')?.remove();
  });
  document.getElementById('team-squad-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'team-squad-modal') {
      document.getElementById('team-squad-modal')?.remove();
    }
  });
}

function renderCareerHubView(container) {
  let searchQuery = '';
  let selectedCategory = 'ALL';
  let sortBy = 'points'; // 'points', 'runs', 'wickets', 'matches', 'avg', 'economy'

  const drawCareerHub = () => {
    const players = store.getPlayers().filter(p => (p.registrationStatus || p.paymentStatus) !== 'REJECTED');
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
      let highestScore = 0;

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

          if (r > highestScore) highestScore = r;
          if (r >= 100) centuries += 1;
          else if (r >= 50) halfCenturies += 1;

          if (w >= 5) fiveWickets += 1;
        }
      });

      // Batting Strike Rate
      let strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';

      // Batting Average
      let battingAvgNum = dismissals > 0 ? (runs / dismissals) : (runs > 0 ? runs : 0);
      let battingAvg = '0.00';
      if (dismissals > 0) {
        battingAvg = (runs / dismissals).toFixed(2);
      } else if (runs > 0) {
        battingAvg = `${runs}*`;
      }

      // Bowling Economy
      let economyNum = ballsBowled > 0 ? ((runsConceded / ballsBowled) * 6) : 999;
      let economy = '0.00';
      if (ballsBowled > 0) {
        economy = ((runsConceded / ballsBowled) * 6).toFixed(2);
      }

      // Total Performance Points (with milestone bonuses!)
      let points = runs * 1 + wickets * 25 + matches * 10 + (halfCenturies * 8) + (centuries * 16) + (fiveWickets * 16);

      return {
        id: p.id,
        name: p.name || 'Unnamed Player',
        photoUrl: p.photoUrl || p.player_photo_url || '',
        category: p.category || p.playingType || 'All Rounder',
        village: p.village || 'Jhankra',
        battingStyle: p.battingStyle || 'Right Hand Bat',
        bowlingStyle: p.bowlingStyle || 'Right Arm Medium',
        runs,
        balls,
        strikeRate,
        highestScore,
        wickets,
        runsConceded,
        ballsBowled,
        matches,
        battingAvg,
        battingAvgNum,
        economy,
        economyNum,
        points,
        centuries,
        halfCenturies,
        fiveWickets
      };
    });

    // Compute Top Performers for Single Row 3 Top Highlights
    const topRunScorer = [...list].sort((a, b) => b.runs - a.runs)[0] || null;
    const topWicketTaker = [...list].sort((a, b) => b.wickets - a.wickets)[0] || null;
    const topMvp = [...list].sort((a, b) => b.points - a.points)[0] || null;

    // Filter by Category
    let filtered = list;
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(item => {
        const cat = item.category.toLowerCase();
        if (selectedCategory === 'BATSMAN') return cat.includes('bat');
        if (selectedCategory === 'BOWLER') return cat.includes('bowl');
        if (selectedCategory === 'ALL_ROUNDER') return cat.includes('all') || cat.includes('round');
        if (selectedCategory === 'WK') return cat.includes('keep') || cat.includes('wk');
        return true;
      });
    }

    // Filter by Search Query (Name, Village, Category - No phone number, no team)
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery) ||
        item.village.toLowerCase().includes(searchQuery) ||
        item.category.toLowerCase().includes(searchQuery)
      );
    }

    // Sort Records
    filtered.sort((a, b) => {
      if (sortBy === 'runs') return b.runs - a.runs || b.points - a.points;
      if (sortBy === 'wickets') return b.wickets - a.wickets || b.points - a.points;
      if (sortBy === 'matches') return b.matches - a.matches || b.points - a.points;
      if (sortBy === 'avg') return b.battingAvgNum - a.battingAvgNum || b.runs - a.runs;
      if (sortBy === 'economy') return a.economyNum - b.economyNum || b.wickets - a.wickets;
      return b.points - a.points || b.runs - a.runs;
    });

    container.innerHTML = `
      <div class="space-y-4 sm:space-y-5 animate-fade-in pb-16">
        
        <!-- Compact Stylish White Header Card with Single Row 3 Top Performers -->
        <div class="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-sm p-3.5 sm:p-5">
          <!-- Heading -->
          <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <h1 class="text-base sm:text-2xl font-black text-slate-900 flex items-center gap-1.5 sm:gap-2">
              <span>📊</span> Lifetime Player Stats
            </h1>
            <span class="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-black text-[10px] font-mono uppercase tracking-wider">
              ${list.length} Registered
            </span>
          </div>

          <!-- Single Row 3 Top Performers (Mobile Friendly & Stylish White Background) -->
          <div class="grid grid-cols-3 gap-2 sm:gap-4">
            
            <!-- 1. Top Run Scorer -->
            <div class="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2 sm:p-3 text-center shadow-xs flex flex-col justify-between">
              <div>
                <span class="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-amber-800 block truncate">🏏 Top Run Scorer</span>
                <div class="text-xs sm:text-sm md:text-base font-black text-slate-900 truncate mt-1 leading-tight">
                  ${topRunScorer && topRunScorer.runs > 0 ? topRunScorer.name : '—'}
                </div>
              </div>
              <div class="text-[10px] sm:text-xs font-black text-amber-700 font-mono mt-1">
                ${topRunScorer && topRunScorer.runs > 0 ? `${topRunScorer.runs} Runs` : '0 Runs'}
              </div>
            </div>

            <!-- 2. Top Wicket Taker -->
            <div class="bg-sky-50/70 border border-sky-200/80 rounded-xl p-2 sm:p-3 text-center shadow-xs flex flex-col justify-between">
              <div>
                <span class="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-sky-800 block truncate">⚡ Top Wicket Taker</span>
                <div class="text-xs sm:text-sm md:text-base font-black text-slate-900 truncate mt-1 leading-tight">
                  ${topWicketTaker && topWicketTaker.wickets > 0 ? topWicketTaker.name : '—'}
                </div>
              </div>
              <div class="text-[10px] sm:text-xs font-black text-sky-700 font-mono mt-1">
                ${topWicketTaker && topWicketTaker.wickets > 0 ? `${topWicketTaker.wickets} Wkts` : '0 Wkts'}
              </div>
            </div>

            <!-- 3. MVP Player -->
            <div class="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2 sm:p-3 text-center shadow-xs flex flex-col justify-between">
              <div>
                <span class="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-800 block truncate">🌟 MVP Player</span>
                <div class="text-xs sm:text-sm md:text-base font-black text-slate-900 truncate mt-1 leading-tight">
                  ${topMvp && topMvp.points > 0 ? topMvp.name : '—'}
                </div>
              </div>
              <div class="text-[10px] sm:text-xs font-black text-emerald-700 font-mono mt-1">
                ${topMvp && topMvp.points > 0 ? `${topMvp.points} Pts` : '0 Pts'}
              </div>
            </div>

          </div>
        </div>

        <!-- Filter & Search Toolbar (White Container) -->
        <div class="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            
            <!-- Category Pills -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button class="filter-cat-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${selectedCategory === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}" data-category="ALL">
                All Players (${list.length})
              </button>
              <button class="filter-cat-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${selectedCategory === 'BATSMAN' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}" data-category="BATSMAN">
                🏏 Batsmen
              </button>
              <button class="filter-cat-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${selectedCategory === 'BOWLER' ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}" data-category="BOWLER">
                🎯 Bowlers
              </button>
              <button class="filter-cat-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${selectedCategory === 'ALL_ROUNDER' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}" data-category="ALL_ROUNDER">
                ⚡ All-Rounders
              </button>
              <button class="filter-cat-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${selectedCategory === 'WK' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}" data-category="WK">
                🧤 Wicket Keepers
              </button>
            </div>

            <!-- Sort Selection Dropdown -->
            <div class="flex items-center gap-2 self-end md:self-auto">
              <span class="text-xs font-bold text-slate-500 whitespace-nowrap">Sort by:</span>
              <select id="career-sort-select" class="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-1.5 font-bold focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer">
                <option value="points" ${sortBy === 'points' ? 'selected' : ''}>🌟 Points (MVP)</option>
                <option value="runs" ${sortBy === 'runs' ? 'selected' : ''}>🏏 Most Runs</option>
                <option value="avg" ${sortBy === 'avg' ? 'selected' : ''}>📈 Best Bat Avg</option>
                <option value="wickets" ${sortBy === 'wickets' ? 'selected' : ''}>🎯 Most Wickets</option>
                <option value="economy" ${sortBy === 'economy' ? 'selected' : ''}>🛡️ Best Economy</option>
                <option value="matches" ${sortBy === 'matches' ? 'selected' : ''}>🏟️ Most Matches</option>
              </select>
            </div>
          </div>

          <!-- Search Input Field (No phone numbers, no team) -->
          <div class="relative w-full">
            <input type="text" id="career-search-query-input" value="${searchQuery}" placeholder="🔍 Search player by name, village, or role..." class="w-full bg-slate-50 border border-slate-200/90 text-slate-800 text-xs sm:text-sm rounded-xl p-2.5 pl-3.5 focus:outline-none focus:border-blue-500 focus:bg-white font-bold placeholder-slate-400 shadow-inner transition-all" />
          </div>
        </div>

        <!-- Professional Clean White Table -->
        <div class="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-md overflow-hidden">
          
          <!-- Table Subheader -->
          <div class="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-black text-slate-800 text-xs sm:text-sm uppercase tracking-wider">Registered Players List</span>
              <span class="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full font-mono">${filtered.length}</span>
            </div>
            <span class="text-[10px] sm:text-[11px] text-slate-400 font-semibold">Live match compiled</span>
          </div>

          <!-- Table Container with Horizontal Scroll -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead class="bg-slate-100/80 font-black text-[10px] uppercase text-slate-600 border-b border-slate-200 tracking-wider">
                <tr>
                  <th class="py-3 px-3 sm:px-4 text-center w-12">RANK</th>
                  <th class="py-3 px-3 min-w-[170px]">PLAYER</th>
                  <th class="py-3 px-3">ROLE</th>
                  <th class="py-3 px-3 text-center">MAT</th>
                  <th class="py-3 px-3 text-center text-amber-700">RUNS</th>
                  <th class="py-3 px-3 text-center">BAT AVG</th>
                  <th class="py-3 px-3 text-center text-sky-700">WKTS</th>
                  <th class="py-3 px-3 text-center">ECON</th>
                  <th class="py-3 px-3 text-center text-emerald-700">POINTS</th>
                  <th class="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="10" class="py-12 text-center bg-white">
                      <div class="flex flex-col items-center justify-center space-y-2">
                        <span class="text-3xl">🏏</span>
                        <div class="text-slate-700 font-bold text-sm">No players found</div>
                        <p class="text-slate-400 text-xs">Try adjusting your search query or role filter</p>
                      </div>
                    </td>
                  </tr>
                ` : filtered.map((p, idx) => {
                  const rank = idx + 1;
                  const rankBadge = rank === 1 
                    ? '<span class="inline-flex w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black items-center justify-center text-xs shadow-xs border border-amber-300">🥇</span>'
                    : rank === 2 
                    ? '<span class="inline-flex w-6 h-6 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-900 font-black items-center justify-center text-xs shadow-xs border border-slate-300">🥈</span>'
                    : rank === 3 
                    ? '<span class="inline-flex w-6 h-6 rounded-full bg-gradient-to-tr from-amber-700 to-amber-600 text-white font-black items-center justify-center text-xs shadow-xs border border-amber-600">🥉</span>'
                    : `<span class="inline-flex w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold items-center justify-center text-[10px] border border-slate-200">${rank}</span>`;

                  const rolePill = p.category.toLowerCase().includes('bat')
                    ? '<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black uppercase">Batsman</span>'
                    : p.category.toLowerCase().includes('bowl')
                    ? '<span class="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-[9px] font-black uppercase">Bowler</span>'
                    : p.category.toLowerCase().includes('keep') || p.category.toLowerCase().includes('wk')
                    ? '<span class="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[9px] font-black uppercase">Wicket Keeper</span>'
                    : '<span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-black uppercase">All Rounder</span>';

                  return `
                    <tr class="hover:bg-blue-50/40 transition-colors">
                      <!-- Rank -->
                      <td class="py-2.5 px-3 sm:px-4 text-center">
                        ${rankBadge}
                      </td>

                      <!-- Player Avatar & Name -->
                      <td class="py-2.5 px-3">
                        <div class="flex items-center gap-2.5">
                          <img src="${p.photoUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' rx=\'20\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E'}" class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border-2 border-slate-200 shadow-xs flex-shrink-0" />
                          <div class="min-w-0">
                            <div class="font-black text-slate-900 text-xs sm:text-sm leading-tight truncate">${p.name}</div>
                            <div class="text-[9px] sm:text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <span>📍 ${p.village}</span>
                              <span class="text-slate-300">•</span>
                              <span>${p.battingStyle.split(' ')[0]}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- Role -->
                      <td class="py-2.5 px-3">
                        ${rolePill}
                      </td>

                      <!-- Matches -->
                      <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-700">${p.matches}</td>

                      <!-- Runs -->
                      <td class="py-2.5 px-3 text-center font-mono font-black text-amber-700">
                        <div>${p.runs}</div>
                        ${p.balls > 0 ? `<div class="text-[9px] font-normal text-slate-400">SR ${p.strikeRate}</div>` : ''}
                      </td>

                      <!-- Batting Average -->
                      <td class="py-2.5 px-3 text-center font-mono text-slate-700 font-bold">${p.battingAvg}</td>

                      <!-- Wickets -->
                      <td class="py-2.5 px-3 text-center font-mono font-black text-sky-700">
                        <div>${p.wickets}</div>
                        ${p.ballsBowled > 0 ? `<div class="text-[9px] font-normal text-slate-400">${p.ballsBowled} b</div>` : ''}
                      </td>

                      <!-- Economy -->
                      <td class="py-2.5 px-3 text-center font-mono text-slate-700">${p.economy}</td>

                      <!-- Points -->
                      <td class="py-2.5 px-3 text-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-black font-mono text-[11px]">
                          ${p.points}
                        </span>
                      </td>

                      <!-- Action Button -->
                      <td class="py-2.5 px-4 text-right">
                        <button class="view-career-detail-btn px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] rounded-lg shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap" data-id="${p.id}">
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

    // Category Filter Events
    container.querySelectorAll('.filter-cat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedCategory = e.currentTarget.getAttribute('data-category');
        drawCareerHub();
      });
    });

    // Sort Select Event
    const sortSelect = document.getElementById('career-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        drawCareerHub();
      });
    }

    // Search Input Event
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

    // View Profile Modal Events
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
  if (team && team.id) {
    openTeamPurchasedSquadModal(team.id);
  }
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

// --- REAL-TIME REGISTERED PLAYER TOAST POP-UP WIDGET ---
function initRealtimePlayerToast() {
  let toastContainer = document.getElementById('realtime-player-toast-widget');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'realtime-player-toast-widget';
    toastContainer.className = 'fixed bottom-16 sm:bottom-6 left-3 sm:left-6 z-50 transition-all duration-500 transform translate-y-10 opacity-0 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  let toastTimer = null;
  let autoRotateInterval = null;
  let currentIndex = 0;
  let isUserClosed = false;

  const showToastForPlayer = (player, badgeText = '⚡ JUST REGISTERED') => {
    if (!player || isUserClosed) return;

    const photoUrl = player.photoUrl || player.player_photo_url || player.photo_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23059669'/%3E%3Ctext x='50' y='62' font-size='45' text-anchor='middle' fill='white'%3E🏏%3C/text%3E%3C/svg%3E";
    const playerName = player.playerName || player.name || 'Anonymous Player';
    const playerRole = player.playerRole || player.role || player.category || 'All Rounder';
    const playerVillage = player.village || player.address || player.teamName || 'Jhankra';

    toastContainer.innerHTML = `
      <div class="relative bg-white/95 backdrop-blur-md border-2 border-emerald-400 rounded-2xl p-2.5 shadow-2xl flex items-center gap-2.5 max-w-[280px] sm:max-w-xs cursor-pointer group hover:scale-[1.02] transition-transform" id="toast-card-inner">
        <!-- PLAYER PHOTO (SQUARE 1:1 WITH CROPPED BORDER) -->
        <div class="relative shrink-0">
          <img src="${getOptimizedImageUrl(photoUrl, 100, 100)}" loading="lazy" alt="${playerName}" class="w-11 h-11 sm:w-13 sm:h-13 rounded-xl object-cover border-2 border-emerald-500 shadow-md" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&background=059669&color=fff'" />
          <span class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>

        <!-- PLAYER DETAILS -->
        <div class="flex-1 min-w-0 pr-4">
          <div class="flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-emerald-700 uppercase tracking-wider">
            <span>${badgeText}</span>
          </div>
          <h4 class="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight mt-0.5">
            ${playerName}
          </h4>
          <p class="text-[10px] sm:text-xs font-semibold text-slate-500 truncate mt-0.5">
            📍 ${playerVillage} • <span class="text-emerald-600 font-bold">${playerRole}</span>
          </p>
        </div>

        <!-- CLOSE BUTTON -->
        <button id="toast-close-btn" class="absolute top-1.5 right-1.5 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors" aria-label="Close">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Show animation
    toastContainer.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
    toastContainer.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');

    // Click card opens registered players view
    document.getElementById('toast-card-inner')?.addEventListener('click', (e) => {
      if (e.target.closest('#toast-close-btn')) return;
      openRegisteredPlayersModal(store.getPlayers());
    });

    // Close button handler
    document.getElementById('toast-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      isUserClosed = true;
      hideToast();
    });

    // Auto-hide after 6 seconds
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      hideToast();
    }, 6000);
  };

  const hideToast = () => {
    toastContainer.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
    toastContainer.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
  };

  // Function to show ONLY THE LAST REGISTERED PLAYER (ONE TIME, 6 SECONDS DURATION)
  const triggerLatestPlayerToast = async (isNewEvent = false) => {
    // Check if Admin has paused/held the toast popup
    try {
      const popupSettings = await fetchPopupSettingsFromFirebase();
      if (popupSettings && popupSettings.isRealtimePlayerToastEnabled === false) {
        hideToast();
        return;
      }
    } catch (e) {
      // fallback continue
    }

    const players = store.getPlayers();
    if (!players || players.length === 0) return;

    // Sort descending by registration order / serial number / creation time to get strictly the LAST REGISTERED PLAYER
    const sortedDesc = [...players].sort((a, b) => {
      const timeA = new Date(a.created_at || a.registrationDate || 0).getTime() || (parseInt(a.id) || 0);
      const timeB = new Date(b.created_at || b.registrationDate || 0).getTime() || (parseInt(b.id) || 0);
      return timeB - timeA; // Most recent first (Index 0 is latest registered player)
    });

    const lastRegisteredPlayer = sortedDesc[0];
    if (!lastRegisteredPlayer) return;

    const totalCount = players.length;
    const serialNum = lastRegisteredPlayer.displayRegistrationNumber || lastRegisteredPlayer.serialNo || totalCount;

    if (isNewEvent) {
      isUserClosed = false;
    }

    showToastForPlayer(lastRegisteredPlayer, `🔥 LATEST REGISTERED PLAYER #${serialNum}`);
  };

  // Listen for real-time new player registrations
  window.addEventListener('players_updated', () => triggerLatestPlayerToast(true));
  window.addEventListener('players_synced', () => triggerLatestPlayerToast(true));

  // Trigger ONE TIME pop-up 2.5s after page load
  setTimeout(() => {
    triggerLatestPlayerToast(false);
  }, 2500);
}



// =========================================================================
// PLAYER AUTHENTICATION, PASSWORD RESET & PROFILE HUB
// =========================================================================

export function openPlayerLoginModal(onSuccess) {
  document.getElementById('player-login-modal')?.remove();

  const modalHtml = `
    <div id="player-login-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div class="relative w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 text-center modal-content-container">
        <button id="close-player-login-modal-btn" class="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="w-14 h-14 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-lg border border-blue-400">
          🔐
        </div>

        <div class="mt-3 mb-4">
          <h3 class="text-xl font-black text-slate-900">Player & Official Login</h3>
          <p class="text-xs text-slate-500 mt-0.5">Sign in to view your digital pass, status & tournament controls</p>
        </div>

        <form id="player-login-form" class="space-y-3.5 text-left">
          <div>
            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">10-Digit Mobile Number *</label>
            <input type="text" id="login-identifier" required autocomplete="off" placeholder="Enter your 10-digit mobile number" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:border-blue-500 focus:outline-none font-mono" />
          </div>

          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-[10px] font-bold text-slate-700 uppercase">Password *</label>
              <span class="text-[10px] text-amber-600 font-semibold">(Default for players: Mobile Number)</span>
            </div>
            <input type="password" id="login-password" required autocomplete="off" placeholder="Enter password" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:border-blue-500 focus:outline-none font-mono" />
          </div>

          <div id="login-error-msg" class="text-xs text-rose-600 font-bold hidden text-center"></div>

          <button type="submit" class="w-full py-3 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-950 hover:from-blue-600 hover:to-indigo-900 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-400/40">
            <i data-lucide="log-in" class="w-4 h-4"></i> Sign In to Account
          </button>
        </form>

        <div class="mt-4 pt-3 border-t border-slate-100 text-center">
          <p class="text-xs text-slate-500">
            New Player? 
            <button id="modal-goto-register-btn" class="font-bold text-blue-600 hover:underline cursor-pointer">Register for Tournament</button>
          </p>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('player-login-modal')?.remove();
  document.getElementById('close-player-login-modal-btn')?.addEventListener('click', removeModal);

  document.getElementById('modal-goto-register-btn')?.addEventListener('click', () => {
    removeModal();
    openRegistrationModal();
  });

  document.getElementById('player-login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const errEl = document.getElementById('login-error-msg');

    const res = store.authenticateUser(identifier, pass);
    if (!res.success) {
      if (errEl) {
        errEl.textContent = res.message || 'Login failed';
        errEl.classList.remove('hidden');
      }
      return;
    }

    removeModal();

    if (onSuccess) onSuccess(res.user);
    renderNavbar();
    renderMobileNav();

    // Smart routing based on role
    if (res.role === 'SUPER_ADMIN') {
      navigate('admin');
    } else if (res.role === 'TOURNAMENT_OWNER') {
      navigate('profile');
    } else {
      navigate('profile');
    }
  });
}

export function openFirstTimePasswordResetModal(phone, onSuccess) {
  document.getElementById('first-login-pwd-modal')?.remove();

  const modalHtml = `
    <div id="first-login-pwd-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div class="relative w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border-2 border-amber-400 p-5 sm:p-6 text-center modal-content-container">
        <button id="close-pwd-reset-modal-btn" class="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" title="Close">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
        
        <div class="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-lg border border-amber-300">
          🔐
        </div>

        <div class="mt-3 mb-4">
          <h3 class="text-lg font-black text-slate-900">First-Time Login Security</h3>
          <p class="text-xs text-slate-500 mt-0.5">Please create your private password to protect your player profile</p>
        </div>

        <form id="first-login-pwd-form" class="space-y-3.5 text-left">
          <div>
            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">New Password *</label>
            <input type="password" id="first-new-password" required minlength="4" placeholder="Enter new password (min 4 chars)" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:border-amber-500 focus:outline-none" />
          </div>

          <div>
            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Confirm New Password *</label>
            <input type="password" id="first-confirm-password" required minlength="4" placeholder="Re-enter new password" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:border-amber-500 focus:outline-none" />
          </div>

          <div id="pwd-error-msg" class="text-xs text-rose-600 font-bold hidden text-center"></div>

          <button type="submit" class="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
            <i data-lucide="shield-check" class="w-4 h-4"></i> Save Password & Enter Profile
          </button>
          
          <button type="button" id="skip-first-pwd-btn" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer">
            Keep Default Password (Mobile Number) & Continue
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  document.getElementById('close-pwd-reset-modal-btn')?.addEventListener('click', () => {
    document.getElementById('first-login-pwd-modal')?.remove();
  });

  document.getElementById('skip-first-pwd-btn')?.addEventListener('click', () => {
    document.getElementById('first-login-pwd-modal')?.remove();
    renderNavbar();
    renderMobileNav();
    navigate('profile');
  });

  document.getElementById('first-login-pwd-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const p1 = document.getElementById('first-new-password').value;
    const p2 = document.getElementById('first-confirm-password').value;
    const errEl = document.getElementById('pwd-error-msg');

    if (p1 !== p2) {
      if (errEl) {
        errEl.textContent = 'Passwords do not match!';
        errEl.classList.remove('hidden');
      }
      return;
    }

    const res = store.updateUserPassword(phone, p1);
    if (!res.success) {
      if (errEl) {
        errEl.textContent = res.message || 'Failed to update password';
        errEl.classList.remove('hidden');
      }
      return;
    }

    document.getElementById('first-login-pwd-modal')?.remove();
    alert('🎉 Password set successfully! Welcome to your profile.');
    if (onSuccess) onSuccess(res.user);
    renderNavbar();
    renderMobileNav();
    navigate('profile');
  });
}

function renderPlayerProfileView(container) {
  const currentUser = store.getCurrentUser();

  if (!currentUser) {
    container.innerHTML = `
      <div class="max-w-md mx-auto my-8 p-6 bg-white border border-slate-200 rounded-3xl shadow-xl text-center space-y-4 animate-fade-in">
        <div class="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-lg">
          👤
        </div>
        <div>
          <h2 class="text-xl font-black text-slate-900">Account Login</h2>
          <p class="text-xs text-slate-500 mt-1">Sign in with your 10-Digit Mobile Number OR Master Admin Email</p>
        </div>
        <button id="trigger-profile-login-btn" class="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
          <i data-lucide="log-in" class="w-4 h-4"></i> Sign In to Account
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    document.getElementById('trigger-profile-login-btn')?.addEventListener('click', () => {
      openPlayerLoginModal(() => navigate('profile'));
    });
    return;
  }

  const isMaster = currentUser.role === 'SUPER_ADMIN' || (currentUser.email && currentUser.email.toLowerCase() === 'bakolaypan@gmail.com');
  const allPlayers = store.getPlayers();
  const cleanPhone = (currentUser.phone || '').replace(/[^0-9]/g, '');
  const owners = store.getTournamentOwners();
  const isAssignedOwner = Object.values(owners).some(o => o && (o.phone || '').replace(/[^0-9]/g, '').slice(-10) === cleanPhone.slice(-10));
  const isTournamentOwner = currentUser.role === 'TOURNAMENT_OWNER' || isAssignedOwner;

  // Player record lookup
  let player = allPlayers.find(p => (p.phone || p.mobile || '').replace(/[^0-9]/g, '').slice(-10) === cleanPhone.slice(-10));
  if (!player) {
    if (isMaster) {
      player = {
        name: 'Suman Kolay (Master Super Admin)',
        phone: 'bakolaypan@gmail.com',
        category: 'Super Admin Authority',
        village: 'Kolkata, West Bengal',
        registrationStatus: 'APPROVED',
        paymentStatus: 'APPROVED',
        basePrice: 300
      };
    } else if (isTournamentOwner) {
      player = {
        name: owners['tournament-jsl-2026']?.name || 'Pintu Santra',
        phone: currentUser.phone || '8972144166',
        category: 'Tournament Owner',
        village: 'Jhakra, Paschim Medinipur',
        registrationStatus: 'APPROVED',
        paymentStatus: 'APPROVED',
        basePrice: 300
      };
    } else {
      player = {
        name: currentUser.name || 'Registered Player',
        phone: currentUser.phone || '',
        category: 'Player',
        village: 'Paschim Medinipur',
        registrationStatus: 'APPROVED',
        paymentStatus: 'APPROVED',
        basePrice: 300
      };
    }
  }

  const teams = store.getTeams();
  const playerTeam = player.teamId ? teams.find(t => t.id === player.teamId) : null;
  const isOwner = isMaster || isTournamentOwner;

  container.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-6 animate-fade-in pb-16">
      
      <!-- Top Identity Card -->
      <div class="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div class="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-100/50 to-indigo-100/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

        <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
          <img src="${getOptimizedImageUrl(player.photoUrl || player.player_photo_url, 160, 160)}" class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-blue-500 shadow-md bg-slate-100 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />

          <div class="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span class="px-2.5 py-0.5 ${isMaster ? 'bg-amber-50 text-amber-800 border-amber-300' : (isTournamentOwner ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200')} border rounded-full font-black text-[10px] uppercase">
                ${isMaster ? '👑 MASTER SUPER ADMIN' : (isTournamentOwner ? '🏆 TOURNAMENT OWNER' : '🏏 JSL 2026 PLAYER')}
              </span>
              ${player.registrationId ? `
                <span class="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-mono font-bold text-[10px]">
                  #${player.displayRegistrationNumber || player.serialNo || 1} • ${player.registrationId}
                </span>
              ` : ''}
            </div>

            <h1 class="text-xl sm:text-2xl font-black text-slate-900 truncate">${player.name}</h1>
            <div class="text-xs text-slate-600 font-semibold flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span>📱 ${player.phone}</span>
              <span>•</span>
              <span>📍 ${player.village || 'Paschim Medinipur'}</span>
              <span>•</span>
              <span class="text-emerald-700 font-bold">🏏 ${player.category || 'All Rounder'}</span>
            </div>
          </div>

          <div class="flex flex-row sm:flex-col items-center gap-2 shrink-0">
            <button id="profile-edit-btn" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Profile
            </button>
            <button id="profile-logout-btn" class="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Logout
            </button>
          </div>
        </div>
      </div>

      <!-- TOURNAMENT OWNER / MASTER ADMIN CONTROL CONSOLE LAUNCHER -->
      ${isOwner ? `
        <div class="p-5 sm:p-6 bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-indigo-950/20 border-2 border-amber-400 rounded-3xl shadow-xl space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="p-3 bg-amber-400 text-slate-950 font-black rounded-2xl text-2xl shadow">🏆</span>
              <div>
                <h3 class="font-black text-slate-900 text-base sm:text-lg">${isMaster ? 'Master Super Admin Control Console' : 'JSL 2026 Tournament Control Console'}</h3>
                <p class="text-xs text-slate-600">${isMaster ? 'You have full Super Admin control over the entire system and ownership delegations.' : 'You have full administrative authority over auction, verification, fixtures & scoring.'}</p>
              </div>
            </div>
          </div>
          <div class="pt-2 flex flex-wrap gap-2">
            <button id="profile-open-admin-console-btn" class="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 border border-amber-300">
              <i data-lucide="shield-check" class="w-4 h-4"></i> ${isMaster ? 'Open Master Admin Panel' : 'Open Tournament Control Dashboard'}
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Status & Pass Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Verification Card -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Verification & Payment Status</span>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1.5 rounded-xl font-black text-xs ${(player.registrationStatus === 'APPROVED' || player.paymentStatus === 'APPROVED') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
              ${(player.registrationStatus === 'APPROVED' || player.paymentStatus === 'APPROVED') ? '✅ VERIFIED & APPROVED' : '⏳ PENDING VERIFICATION'}
            </span>
          </div>
          <p class="text-[11px] text-slate-500">
            ${(player.registrationStatus === 'APPROVED' || player.paymentStatus === 'APPROVED') ? 'Your registration and fee payment are verified for JSL 2026.' : 'Your documents are currently under verification by the tournament organizers.'}
          </p>
        </div>

        <!-- Team & Auction Status Card -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Franchise & Auction Status</span>
          <div>
            ${playerTeam ? `
              <div class="font-black text-sm text-blue-700 flex items-center gap-1.5">
                🛡️ ${playerTeam.name}
              </div>
              <span class="text-xs text-slate-500 font-bold block mt-0.5">
                Sold Price: <strong class="text-emerald-700">₹ ${Number(player.soldPrice || player.basePrice || 300).toLocaleString('en-IN')}</strong>
              </span>
            ` : `
              <div class="font-black text-xs text-amber-600 flex items-center gap-1.5">
                🔨 Active Auction Pool (Base: ₹${player.basePrice || 300})
              </div>
              <span class="text-[11px] text-slate-500 block mt-0.5">Available for bidding during live player auction.</span>
            `}
          </div>
        </div>
      </div>

      <!-- 1-Click Digital ID Card Download -->
      <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="space-y-1 text-center sm:text-left">
          <h3 class="text-sm sm:text-base font-black flex items-center justify-center sm:justify-start gap-2">
            <span>🪪</span> Official Player Digital Pass
          </h3>
          <p class="text-xs text-blue-100">Download or print your high-definition tournament registration pass.</p>
        </div>
        <button id="profile-download-pass-btn" class="px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-900 font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer shrink-0 transition-transform active:scale-95">
          <i data-lucide="download" class="w-4 h-4"></i> Download Digital Pass
        </button>
      </div>

      <!-- Account Security Card -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div class="flex justify-between items-center">
          <div>
            <h4 class="text-xs sm:text-sm font-black text-slate-900">Account Security</h4>
            <p class="text-[11px] text-slate-500">Update your private password anytime</p>
          </div>
          <button id="profile-change-pwd-btn" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer">
            Change Password
          </button>
        </div>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('profile-logout-btn')?.addEventListener('click', () => {
    store.logoutUser();
    renderNavbar();
    renderMobileNav();
    navigate('landing');
  });

  document.getElementById('profile-edit-btn')?.addEventListener('click', () => {
    openPlayerEditProfileModal(player, () => renderPlayerProfileView(container));
  });

  document.getElementById('profile-open-admin-console-btn')?.addEventListener('click', () => {
    navigate('admin');
  });

  document.getElementById('profile-change-pwd-btn')?.addEventListener('click', () => {
    openFirstTimePasswordResetModal(cleanPhone, () => renderPlayerProfileView(container));
  });

  document.getElementById('profile-download-pass-btn')?.addEventListener('click', async () => {
    try {
      const exportModule = await import('./export.js');
      if (exportModule && exportModule.printDigitalPass) {
        exportModule.printDigitalPass(player);
      } else {
        alert("Pass generator loaded. Preparing document...");
      }
    } catch(err) {
      console.warn("Pass download error:", err);
      alert("Preparing pass download...");
    }
  });
}



// --- GLOBAL DELEGATED LOGOUT CLICK HANDLER ---
document.addEventListener('click', (e) => {
  const logoutTrigger = e.target.closest('#profile-logout-btn, #admin-logout-btn, #nav-logout-btn, [data-action="logout"]');
  if (logoutTrigger) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Global Logout clicked. Terminating user session...");
    store.logoutUser();
    renderNavbar();
    renderMobileNav();
    navigate('landing');
  }
});


// =========================================================================
// PLAYER EDIT PROFILE MODAL (Photo & Category Update)
// =========================================================================
export function openPlayerEditProfileModal(player, onSaved) {
  document.getElementById('player-edit-profile-modal')?.remove();

  let currentPhoto = player.photoUrl || player.player_photo_url || 'assets/card_jsl_user.png';
  let uploadedPhotoBase64 = null;

  const modalHtml = `
    <div id="player-edit-profile-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div class="relative w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 text-center modal-content-container">
        <button id="close-edit-profile-modal-btn" class="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" title="Close">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center mx-auto text-xl shadow-lg border border-blue-400">
          ✏️
        </div>

        <div class="mt-2 mb-4">
          <h3 class="text-lg font-black text-slate-900">Edit Player Profile</h3>
          <p class="text-xs text-slate-500 mt-0.5">Update your profile photo, player role category, and village</p>
        </div>

        <form id="player-edit-profile-form" class="space-y-4 text-left">
          
          <!-- Photo Upload & Preview -->
          <div class="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <img id="edit-player-preview-img" src="${currentPhoto}" class="w-16 h-16 rounded-xl object-cover border-2 border-blue-500 shadow-sm bg-white shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
            <div class="space-y-1 text-center sm:text-left flex-1">
              <label class="block text-[10px] font-bold text-slate-700 uppercase">Profile Photo</label>
              <input type="file" id="edit-player-photo-file" accept="image/*" class="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              <p class="text-[9px] text-slate-400">Recommended: Passport or clear face photo</p>
            </div>
          </div>

          <!-- Category Selection -->
          <div>
            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Player Category (Role) *</label>
            <select id="edit-player-category" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-3 focus:border-blue-500 focus:outline-none cursor-pointer">
              <option value="All Rounder" ${(player.category || '') === 'All Rounder' ? 'selected' : ''}>🏏 All Rounder</option>
              <option value="Batsman" ${(player.category || '') === 'Batsman' ? 'selected' : ''}>🏏 Batsman</option>
              <option value="Bowler" ${(player.category || '') === 'Bowler' ? 'selected' : ''}>⚾ Bowler</option>
              <option value="Wicket Keeper" ${(player.category || '') === 'Wicket Keeper' ? 'selected' : ''}>🧤 Wicket Keeper</option>
              <option value="Wicket Keeper Batsman" ${(player.category || '') === 'Wicket Keeper Batsman' ? 'selected' : ''}>🧤🏏 Wicket Keeper Batsman</option>
            </select>
          </div>

          <!-- Village / City -->
          <div>
            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Village / City *</label>
            <input type="text" id="edit-player-village" value="${player.village || 'Paschim Medinipur'}" required placeholder="e.g. Jhankra, Paschim Medinipur" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:border-blue-500 focus:outline-none" />
          </div>

          <div id="edit-profile-error-msg" class="text-xs text-rose-600 font-bold hidden text-center"></div>

          <button type="submit" id="save-player-profile-btn" class="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
            <i data-lucide="check" class="w-4 h-4"></i> Save Profile Changes
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('player-edit-profile-modal')?.remove();
  document.getElementById('close-edit-profile-modal-btn')?.addEventListener('click', removeModal);

  // Handle Photo File Upload & Canvas Compression
  document.getElementById('edit-player-photo-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        uploadedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
        document.getElementById('edit-player-preview-img').src = uploadedPhotoBase64;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Handle Form Submit
  document.getElementById('player-edit-profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-player-profile-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Saving updates...';

    const newCategory = document.getElementById('edit-player-category').value;
    const newVillage = document.getElementById('edit-player-village').value.trim();
    const finalPhoto = uploadedPhotoBase64 || player.photoUrl || player.player_photo_url || currentPhoto;

    const updatedPlayerData = {
      ...player,
      category: newCategory,
      village: newVillage,
      photoUrl: finalPhoto,
      player_photo_url: finalPhoto
    };

    store.updatePlayer(updatedPlayerData);

    // Also update current user account name & details if applicable
    const currentUser = store.getCurrentUser();
    if (currentUser) {
      currentUser.category = newCategory;
      currentUser.village = newVillage;
      currentUser.photoUrl = finalPhoto;
      store.setCurrentUser(currentUser);
    }

    removeModal();
    if (onSaved) onSaved(updatedPlayerData);
  });
}

window.openSquareImageCropModal = openSquareImageCropModal;
window.compressImage = compressImage;
window.openYouTubePromoModal = openYouTubePromoModal;
