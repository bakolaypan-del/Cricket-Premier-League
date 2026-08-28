// Core Application Router & Registration Portal (Developer: Suman Kolay - Cambria & Deep Blue Theme)

import { store } from './store.js?v=13.0.0';
import { exportPlayersToCSV, exportTeamsToCSV, exportPlayersToPDF, exportTeamsToPDF, exportTeamFinalSquadToPDF, exportAllTeamsFinalSquadsToPDF, printDigitalPass, openUserGuidePDF } from './export.js?v=13.0.0';
import { renderAdminDashboard } from './admin.js?v=13.0.0';
import { uploadHDImage, fetchAdSettingsFromCloud, fetchPopupSettingsFromCloud, getOptimizedImageUrl, initVisitorTracking, fetchVisitorStats, dbLookupPlayerByPhone, dbRegisterPlayer, dbGetNextRegNumber, compressImageToTarget, sendPhoneOtp, verifyPhoneOtp } from './supabase.js?v=13.0.1';
import { shops } from './shopsData.js?v=12.0.2';

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/EDLr1a3qfww42HSmjKaBEL";
const CARD_OUTLINE_COLORS = ['#10b981','#3b82f6','#f59e0b','#f43f5e','#a855f7','#14b8a6','#f97316','#6366f1','#ec4899','#06b6d4'];
let latestVisitorStats = { liveCount: 1, totalVisits: 286 };

const CRICKET_THUMBNAILS = [
  { gradient: 'from-emerald-800 via-teal-700 to-green-900', emoji: '🏏', pattern: 'Cricket Stadium' },
  { gradient: 'from-amber-800 via-orange-700 to-yellow-900', emoji: '🏆', pattern: 'Trophy Cup' },
  { gradient: 'from-blue-800 via-indigo-700 to-sky-900', emoji: '⚡', pattern: 'Thunder League' },
  { gradient: 'from-red-800 via-rose-700 to-pink-900', emoji: '🔥', pattern: 'Fire Cricket' },
  { gradient: 'from-purple-800 via-violet-700 to-fuchsia-900', emoji: '👑', pattern: 'Royal Premier' },
  { gradient: 'from-cyan-800 via-teal-600 to-emerald-800', emoji: '🌟', pattern: 'Star League' },
  { gradient: 'from-slate-800 via-zinc-700 to-neutral-900', emoji: '🎯', pattern: 'Precision Cup' },
  { gradient: 'from-lime-800 via-green-700 to-emerald-900', emoji: '🏟️', pattern: 'Ground Arena' },
  { gradient: 'from-orange-800 via-amber-600 to-red-900', emoji: '🏅', pattern: 'Gold Medal' },
  { gradient: 'from-indigo-800 via-blue-600 to-violet-900', emoji: '💫', pattern: 'Galaxy Cup' },
];

// PWA Deferred Prompt Capture
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("PWA install prompt captured.");
});

// ALWAYS default to landing page (No category opens automatically!)
let currentRoute = 'landing'; // landing, tournament-hub, admin, fixtures, auction, career, profile, shop-detail
let selectedShopId = '';
let introScreenInitialized = false;
let renderDebounceTimer = null;

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
  // Deep-link: read hash route on initial page load (e.g. #t/jsl-2026, #admin, #fixtures)
  const initialHash = location.hash.replace(/^#/, '');
  if (initialHash) {
    currentRoute = initialHash;
  }

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
    // PROTECT ACTIVE USER FORMS: Only prevent re-render if user is filling player/team registration forms
    const isUserFillingForm = document.getElementById('player-reg-modal') || document.getElementById('team-reg-modal') || document.getElementById('edit-player-modal');
    if (isUserFillingForm) return;

    // IF ON HOME/LANDING PAGE, NEVER WIPE OR FLASH THE SCREEN: Smooth in-place updates only
    if (currentRoute === 'landing') {
      const regCountEl = document.getElementById('landing-registered-count');
      if (regCountEl) regCountEl.textContent = store.getPlayers().length;
      return;
    }

    // IF ON AUCTION TAB, NEVER WIPE THE AUCTION VIEW: Let pollActiveAuctionState() handle smooth in-place updates
    if (currentRoute === 'auction') {
      const activeBlock = document.getElementById('auction-active-block-container');
      if (activeBlock && typeof pollActiveAuctionState === 'function') {
        pollActiveAuctionState();
        return;
      }
    }

    // IF ON TOURNAMENT-HUB TAB, NEVER WIPE CAROUSEL OR POSTER: Smooth in-place counter updates
    if (currentRoute === 'tournament-hub') {
      const pCountEl = document.getElementById('tournament-hub-players-count');
      const tCountEl = document.getElementById('tournament-hub-teams-count');
      if (pCountEl) pCountEl.textContent = store.getPlayers().length;
      if (tCountEl) tCountEl.textContent = store.getTeams().length;
      return;
    }

    // IF ON ADMIN TAB, NEVER WIPE THE ENTIRE DASHBOARD ON REALTIME EVENTS (PREVENTS FLICKER):
    if (currentRoute === 'admin') {
      return;
    }

    // IF ON FIXTURES / MATCH CORNER TAB, NEVER WIPE THE SCREEN: Smooth in-place updates only
    if (currentRoute === 'fixtures') {
      if (typeof window.refreshFixturesViewContent === 'function') {
        window.refreshFixturesViewContent();
        return;
      }
    }

    if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => {
      renderCurrentView();

      // REAL-TIME AUTO SQUAD SYNC: If Franchise Squad Modal is open on screen, re-render it in real-time!
      const openSquadModal = document.getElementById('team-squad-modal');
      if (openSquadModal && window.currentViewingTeamId) {
        openTeamPurchasedSquadModal(window.currentViewingTeamId);
      }
    }, 250);
  };

  window.addEventListener('leagues_updated', safeRenderCurrentView);
  window.addEventListener('players_updated', safeRenderCurrentView);
  window.addEventListener('teams_updated', safeRenderCurrentView);
  window.addEventListener('registration_settings_updated', () => {
    if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => renderCurrentView(), 250);
  });
  window.addEventListener('custom_tournaments_updated', safeRenderCurrentView);
  
  // LIVE AUCTION SYNC: Only update auction page when on auction route to prevent unnecessary full-page refreshes
  window.addEventListener('live_auction_updated', () => {
    if (currentRoute === 'auction') {
      const activeBlockWrapper = document.getElementById('auction-active-block-container');
      if (activeBlockWrapper && typeof pollActiveAuctionState === 'function') {
        pollActiveAuctionState();
      } else {
        safeRenderCurrentView();
      }
    }
  });

  window.addEventListener('user_updated', () => {
    renderNavbar();
    renderMobileBottomNav();
    renderFooter();
    safeRenderCurrentView();
  });
}

let auctionPollInterval = null;
let pollActiveAuctionState = null;

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

window.addEventListener('hashchange', () => {
  const hash = location.hash.replace(/^#/, '');
  if (hash && hash !== currentRoute) {
    navigate(hash, false);
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
          <p class="text-xs text-slate-600">Get 1-click home screen access to Cricket Premier League on your mobile phone!</p>
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
    const settings = await fetchPopupSettingsFromCloud();
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
          <h2 class="text-lg sm:text-xl font-black text-slate-900">Welcome to Cricket Premier League!</h2>
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
    const settings = await fetchPopupSettingsFromCloud();
    if (!settings || !settings.isYouTubePromoEnabled) {
      console.log("YouTube promo popup is disabled by admin.");
      return;
    }
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

if (typeof window !== 'undefined') {
  window.openYouTubePromoModal = openYouTubePromoModal;
  window.addEventListener('popup_settings_updated', (e) => {
    const settings = e.detail;
    if (!settings) return;
    
    // 1. Live Countdown Banner sync
    const countdownCard = document.getElementById('tournament-countdown-card');
    if (countdownCard) {
      if (settings.isCountdownEnabled === false) {
        countdownCard.classList.add('hidden');
      } else {
        countdownCard.classList.remove('hidden');
      }
    }

    // 2. YouTube Promo Popup live sync
    if (settings.isYouTubePromoEnabled === false) {
      document.getElementById('youtube-promo-modal')?.remove();
    }

    // 3. Real-Time Player Toast sync
    if (settings.isRealtimePlayerToastEnabled === false) {
      const toast = document.getElementById('realtime-player-toast-widget');
      if (toast) {
        toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        toast.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
      }
    }
  });
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

// Center-crop image to 4:3 aspect ratio for tournament banner cards
export function cropBannerImage(file, targetWidth = 600, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file) { resolve(''); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const targetHeight = Math.round(targetWidth * 3 / 4);
        const srcAspect = img.width / img.height;
        const targetAspect = 4 / 3;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (srcAspect > targetAspect) {
          sw = Math.round(img.height * targetAspect);
          sx = Math.round((img.width - sw) / 2);
        } else {
          sh = Math.round(img.width / targetAspect);
          sy = Math.round((img.height - sh) / 2);
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        const maxBytes = 120 * 1024;
        let q = quality;
        while (Math.round((dataUrl.length - 22) * 0.75) > maxBytes && q > 0.3) {
          q -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', q);
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
          <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full border border-emerald-300 uppercase">REGISTRATION CONFIRMED</span>
          <h2 class="text-xl font-black text-slate-900 mt-1">Registration Successful!</h2>
          <p class="text-xs text-slate-600 mt-0.5">Your registration has been submitted successfully.</p>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-2 text-xs font-semibold text-slate-800">
          <div class="flex justify-between border-b border-slate-200 pb-1">
            <span class="text-slate-500">Registration ID:</span>
            <span class="font-mono font-black text-emerald-700">${details.registrationId || details.regNo || 'REG-0001'}</span>
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
    navigate('tournament-hub');
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
      <div class="hidden lg:flex items-center gap-3 xl:gap-5 text-xs font-bold tracking-widest text-emerald-100">
        <button id="nav-home-btn" class="hover:text-white transition-colors py-1 ${currentRoute === 'landing' ? 'text-white border-b-2 border-emerald-300 font-black' : ''}">HOME</button>
        <button id="nav-tournaments-btn" class="hover:text-white transition-colors py-1">TOURNAMENTS</button>
        <button id="nav-schedule-btn" class="hover:text-white transition-colors py-1 ${currentRoute === 'fixtures' ? 'text-white border-b-2 border-emerald-300 font-black' : ''}">MATCH CORNER</button>
        <button id="nav-auction-btn" class="hover:text-amber-300 transition-colors py-1 flex items-center gap-1 ${currentRoute === 'auction' ? 'text-amber-300 border-b-2 border-amber-300 font-black' : ''}">🔨 AUCTION</button>
        <button id="nav-career-btn" class="hover:text-emerald-300 transition-colors py-1 flex items-center gap-1 ${currentRoute === 'career' ? 'text-emerald-300 border-b-2 border-emerald-300 font-black' : ''}">📊 PLAYER STATS</button>
        <button id="nav-host-saas-btn" class="px-2.5 py-1 bg-amber-400 text-slate-950 hover:bg-amber-300 rounded-lg font-black text-[11px] uppercase tracking-normal shadow-xs flex items-center gap-1 transition-all cursor-pointer">
          <span>🏆 Host Tournament</span>
        </button>
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
  document.getElementById('nav-host-saas-btn')?.addEventListener('click', () => openTournamentCreationWizard(false));
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
    ${getTabItem('mob-nav-fixtures', 'fixtures', 'Match Corner', 'fixtures')}
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

  if (currentRoute === 'landing') {
    renderFirstPageLanding(container);
  } else if (currentRoute === 'tournament-hub') {
    renderTournamentHub(container);
    checkAndPromptWhatsAppGroup();
  } else if (currentRoute === 'admin') {
    renderAdminDashboard(container);
  } else if (currentRoute === 'fixtures') {
    renderFixturesView(container);
  } else if (currentRoute === 'auction') {
    renderLiveAuctionView(container);
  } else if (currentRoute === 'auction-projector') {
    renderLiveAuctionView(container);
    setTimeout(() => openLiveAuctionProjectorView(), 50);
  } else if (currentRoute === 'career') {
    renderCareerHubView(container);
  } else if (currentRoute === 'profile') {
    renderPlayerProfileView(container);
  } else if (currentRoute === 'shop-detail') {
    renderShopDetailsView(container);
  } else if (currentRoute === 'create-tournament-trial') {
    renderFirstPageLanding(container);
    setTimeout(() => openTournamentCreationWizard(true), 100);
  } else if (currentRoute.startsWith('reg-')) {
    const slug = currentRoute.replace(/^reg-/, '');
    const regTourney = store.getCustomTournamentById(slug);
    if (regTourney) {
      const regTid = regTourney.supabaseId || regTourney.tournament_id || regTourney.id;
      if (regTid) store.setActiveTournament(regTid);
      renderFirstPageLanding(container);
      store.syncWithCloud().then(() => openDynamicTournamentRegistrationModal(slug));
    } else {
      renderFirstPageLanding(container);
      store.syncWithCloud().then(() => {
        const retryTourney = store.getCustomTournamentById(slug);
        if (retryTourney && currentRoute === `reg-${slug}`) {
          const tid = retryTourney.supabaseId || retryTourney.tournament_id || retryTourney.id;
          if (tid) store.setActiveTournament(tid);
          openDynamicTournamentRegistrationModal(slug);
        }
      });
    }
  } else if (currentRoute.startsWith('t/')) {
    const slug = currentRoute.replace(/^t\//, '');
    const tourney = store.getCustomTournamentById(slug);
    if (tourney) {
      const tid = tourney.supabaseId || tourney.tournament_id || tourney.id;
      if (tid) store.setActiveTournament(tid);
      renderCustomTournamentHub(container, tourney);
    } else {
      // Tournament not in local cache yet — show loading, wait for cloud sync, then retry
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-center space-y-3 animate-fade-in">
          <div class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-black shadow-xs">🏏</div>
          <p class="text-sm font-bold text-slate-700">Loading tournament...</p>
          <p class="text-xs text-slate-400">Fetching <span class="font-mono font-bold">${slug}</span> from cloud</p>
        </div>
      `;
      store.syncWithCloud().then(() => {
        const retryTourney = store.getCustomTournamentById(slug);
        if (retryTourney && currentRoute === `t/${slug}`) {
          const tid = retryTourney.supabaseId || retryTourney.tournament_id || retryTourney.id;
          if (tid) store.setActiveTournament(tid);
          renderCustomTournamentHub(container, retryTourney);
          if (window.lucide) window.lucide.createIcons();
        } else if (currentRoute === `t/${slug}`) {
          container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-center space-y-3 animate-fade-in">
              <div class="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center text-2xl font-black shadow-xs">❌</div>
              <p class="text-sm font-bold text-slate-900">Tournament Not Found</p>
              <p class="text-xs text-slate-500">No tournament with slug "<span class="font-mono font-bold">${slug}</span>" exists.</p>
              <button onclick="window.navigateBackToHome()" class="mt-2 px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer">← Back to Home</button>
            </div>
          `;
        }
      });
    }
  } else {
    renderFirstPageLanding(container);
  }

  if (window.lucide) window.lucide.createIcons();
}

// --- WHATSAPP GROUP POPUP PROMPT ---
async function checkAndPromptWhatsAppGroup() {
  try {
    const settings = await fetchPopupSettingsFromCloud();
    if (!settings || !settings.isWhatsAppPopupEnabled) {
      console.log("WhatsApp group popup is disabled by admin.");
      return;
    }
    if (!sessionStorage.getItem('wa_group_prompted')) {
      sessionStorage.setItem('wa_group_prompted', 'true');
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
            ✨ Official WhatsApp Group ✨
          </span>
          <h3 class="text-base sm:text-lg font-black text-slate-900 leading-snug">Join the Official Tournament Group!</h3>
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

function getTournamentThumbnail(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
  return CRICKET_THUMBNAILS[Math.abs(hash) % CRICKET_THUMBNAILS.length];
}

function renderTournamentFallbackPoster(ct) {
  const thumb = getTournamentThumbnail(ct.name || ct.slug || '');
  return `
    <div class="absolute inset-0 bg-gradient-to-br ${thumb.gradient} flex flex-col items-center justify-center text-white p-2 text-center">
      <div class="text-3xl mb-1 drop-shadow-lg">${thumb.emoji}</div>
      <div class="text-[10px] sm:text-xs font-black uppercase leading-tight tracking-wide drop-shadow-md line-clamp-2">${ct.name || 'Tournament'}</div>
      <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px); background-size: 40px 40px, 60px 60px;"></div>
    </div>
  `;
}

function buildTournamentCarouselHTML(allTournaments) {
  const activeTourneys = allTournaments.filter(ct => ct.status === 'ACTIVE' || !ct.status);
  // Cap top carousel to featured/active 8 to keep mobile carousel responsive with 200+ tournaments
  const featuredTourneys = activeTourneys.slice(0, 8);

  const carouselCards = featuredTourneys.map((ct, idx) => {
    const outlineColor = CARD_OUTLINE_COLORS[idx % CARD_OUTLINE_COLORS.length];
    const poster = ct.posterUrl
      ? '<img src="' + ct.posterUrl + '" loading="lazy" class="w-full h-full object-cover object-center" onerror="this.style.display=\'none\'" />'
      : renderTournamentFallbackPoster(ct);
    return '<div data-nav-route="t/' + ct.slug + '" data-tourney-name="' + (ct.name || '').toLowerCase() + '" data-tourney-venue="' + (ct.venue || '').toLowerCase() + '" class="tourney-card shrink-0 bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer transition-all group" style="min-width:100%;border:3px solid white;outline:3px solid ' + outlineColor + ';">'
      + '<div class="relative w-full aspect-[16/9] overflow-hidden">'
      + poster
      + '<div class="absolute top-2 left-2"><span class="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded-full uppercase shadow-md flex items-center gap-1"><span class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE</span></div>'
      + '</div>'
      + '<div class="px-3 py-2 bg-white"><h4 class="text-sm font-black text-slate-900 truncate group-hover:text-emerald-700 transition-colors">' + ct.name + '</h4></div>'
      + '</div>';
  }).join('');

  const dots = featuredTourneys.map((ct, idx) => {
    const dotColor = idx === 0 ? CARD_OUTLINE_COLORS[idx % CARD_OUTLINE_COLORS.length] : '#cbd5e1';
    return '<span class="carousel-dot w-2 h-2 rounded-full transition-all cursor-pointer" data-dot-idx="' + idx + '" style="background:' + dotColor + ';"></span>';
  }).join('');

  const searchCards = allTournaments.map((ct, idx) => {
    const outlineColor = CARD_OUTLINE_COLORS[idx % CARD_OUTLINE_COLORS.length];
    const poster = ct.posterUrl
      ? '<img src="' + ct.posterUrl + '" loading="lazy" class="w-full h-full object-cover object-center" onerror="this.style.display=\'none\'" />'
      : renderTournamentFallbackPoster(ct);
    const statusBadge = (ct.status === 'ACTIVE' || !ct.status)
      ? '<span class="px-1 py-0.5 bg-emerald-500 text-white text-[7px] font-black rounded-full uppercase">LIVE</span>'
      : '<span class="px-1 py-0.5 bg-slate-500 text-white text-[7px] font-black rounded-full uppercase">' + (ct.status || 'DRAFT') + '</span>';
    return '<div data-nav-route="t/' + ct.slug + '" data-tourney-name="' + (ct.name || '').toLowerCase() + '" data-tourney-venue="' + (ct.venue || '').toLowerCase() + '" class="tourney-card-search bg-white rounded-xl shadow-sm hover:shadow-md overflow-hidden cursor-pointer transition-all group" style="border:2px solid white;outline:2px solid ' + outlineColor + ';">'
      + '<div class="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">'
      + poster
      + '<div class="absolute top-1 left-1">' + statusBadge + '</div>'
      + '</div>'
      + '<div class="px-2 py-1.5 bg-white"><h4 class="text-[11px] font-black text-slate-900 truncate leading-tight">' + ct.name + '</h4></div>'
      + '</div>';
  }).join('');

  return '<div id="tourney-carousel-wrapper" class="relative overflow-hidden rounded-2xl">'
    + '<div id="tourney-carousel" class="flex gap-0" style="will-change:transform;">' + carouselCards + '</div>'
    + '<div id="tourney-carousel-dots" class="flex items-center justify-center gap-1.5 py-2 bg-white/80">' + dots + '</div>'
    + '</div>'
    + '<div id="landing-tournaments-grid" class="hidden grid grid-cols-2 sm:grid-cols-3 gap-2.5">' + searchCards + '</div>';
}

function renderFirstPageLanding(containerEl) {
  const teams = store.getTeams();
  const players = store.getPlayers();
  const allTournaments = store.getCustomTournaments ? store.getCustomTournaments() : [];

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
            <span id="landing-registered-count" class="text-xs sm:text-base font-black text-slate-900 font-mono leading-tight mt-0.5">${players.length}</span>
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
            <h3 class="text-xs sm:text-base font-black text-slate-900 tracking-tight leading-tight">${allTournaments[0]?.kickoffDate ? new Date(allTournaments[0].kickoffDate + 'T09:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() + ' • 9:00 AM IST' : 'COMING SOON'}</h3>
            <p class="text-[10px] sm:text-[11px] text-emerald-700 font-bold flex items-center justify-center sm:justify-start gap-1">
              <span>📍 ${allTournaments[0]?.venue || 'Tournament Venue'}</span>
              <span>•</span>
              <span>${allTournaments[0]?.name || 'Cricket Premier League'}</span>
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

      <!-- BROWSE TOURNAMENTS -->
      <div class="w-full max-w-4xl mx-auto px-2 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
            <i data-lucide="trophy" class="w-3.5 h-3.5 text-amber-600"></i>
            Tournaments
            <span class="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full border border-emerald-200">${allTournaments.length}</span>
          </h3>
          <div class="relative">
            <input type="text" id="landing-tournament-search" placeholder="Search..." class="bg-white border border-slate-200 text-slate-900 text-[11px] rounded-lg py-1.5 pl-7 pr-2 focus:outline-none focus:border-emerald-400 w-32 sm:w-44 shadow-xs" />
            <i data-lucide="search" class="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>
        </div>

        ${allTournaments.length === 0 ? '<div class="text-center py-8 bg-white border-2 border-dashed border-slate-200 rounded-xl"><div class="text-3xl mb-1">🏏</div><h4 class="text-xs font-black text-slate-900">No Tournaments Yet</h4><p class="text-[10px] text-slate-500 mt-0.5">Be the first to host a tournament!</p></div>' : buildTournamentCarouselHTML(allTournaments)}
      </div>

      <!-- HOST YOUR OWN TOURNAMENT BANNER -->
      <div class="w-full max-w-4xl mx-auto px-2 pt-2">
        <div class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-slate-950 shadow-xl border-2 border-amber-300 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div class="space-y-1 text-center md:text-left">
            <h3 class="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-tight">
              🏆 Host Your Own Cricket Tournament
            </h3>
            <p class="text-[11px] sm:text-xs font-black text-slate-800 leading-snug">
              Launch and manage your custom cricket tournament online
            </p>
            <p class="text-[10px] sm:text-[11px] text-slate-900 font-bold max-w-lg leading-relaxed">
              ✨ <strong>Mode A</strong>: Player Registration + Live Auction + Squads + Live Scorer<br/>
              ⚡ <strong>Mode B</strong>: Direct Team Entry + Auto Fixtures + Ball-by-Ball Scoring
            </p>
          </div>
          <button id="btn-home-create-tourney" class="w-full md:w-auto px-5 py-3 bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-xs sm:text-sm rounded-xl shadow-xl border-2 border-amber-400 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 shrink-0">
            <span>+ Create Tournament ➔</span>
          </button>
        </div>
      </div>

    </div>

    </div>
  `;

  // Wire up tournament card clicks
  document.querySelectorAll('[data-nav-route]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.navRoute));
  });

  // START COUNTDOWN TIMER
  initTournamentCountdown();

  // Search filter: show grid on search, carousel when empty
  const searchInput = document.getElementById('landing-tournament-search');
  const carouselWrapper = document.getElementById('tourney-carousel-wrapper');
  const searchGrid = document.getElementById('landing-tournaments-grid');
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target.value || '').toLowerCase().trim();
    if (query) {
      if (carouselWrapper) carouselWrapper.classList.add('hidden');
      if (searchGrid) searchGrid.classList.remove('hidden');
      document.querySelectorAll('.tourney-card-search').forEach(card => {
        const name = card.getAttribute('data-tourney-name') || '';
        const venue = card.getAttribute('data-tourney-venue') || '';
        card.style.display = (name.includes(query) || venue.includes(query)) ? '' : 'none';
      });
    } else {
      if (carouselWrapper) carouselWrapper.classList.remove('hidden');
      if (searchGrid) searchGrid.classList.add('hidden');
    }
  });

  // Wire up search grid card clicks
  document.querySelectorAll('.tourney-card-search[data-nav-route]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.navRoute));
  });

  // Full-width carousel: slide one card at a time every 3.5 seconds
  const carousel = document.getElementById('tourney-carousel');
  const dotsContainer = document.getElementById('tourney-carousel-dots');
  if (carousel && carousel.children.length > 1) {
    const totalSlides = carousel.children.length;
    let currentSlide = 0;
    let autoTimer = null;

    const goToSlide = (idx) => {
      currentSlide = idx % totalSlides;
      carousel.style.transition = 'transform 0.5s ease-in-out';
      carousel.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
          dot.style.background = i === currentSlide ? CARD_OUTLINE_COLORS[i % CARD_OUTLINE_COLORS.length] : '#cbd5e1';
          dot.style.width = i === currentSlide ? '16px' : '8px';
          dot.style.borderRadius = '999px';
        });
      }
    };

    const startAuto = () => {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(() => goToSlide(currentSlide + 1), 3500);
    };
    startAuto();

    // Dot click navigation
    dotsContainer?.querySelectorAll('.carousel-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        goToSlide(Number(dot.dataset.dotIdx));
        startAuto();
      });
    });

    // Touch swipe support
    let touchStartX = 0;
    carousel.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; clearInterval(autoTimer); }, { passive: true });
    carousel.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        goToSlide(diff > 0 ? currentSlide + 1 : currentSlide - 1 + totalSlides);
      }
      startAuto();
    }, { passive: true });

    // Pause on hover
    carousel.addEventListener('mouseenter', () => clearInterval(autoTimer));
    carousel.addEventListener('mouseleave', startAuto);

    goToSlide(0);
  }

  document.getElementById('btn-home-create-tourney')?.addEventListener('click', () => openTournamentCreationWizard(false));
}

// --- DEDICATED CUSTOM TOURNAMENT HUB VIEW WITH DYNAMIC MULTI-TENANT ARCHITECTURE ---
export function renderCustomTournamentHub(container, tourney) {
  if (!container || !tourney) return;

  const isJsl = (tourney.slug === 'jsl-2026' || tourney.slug === 'jsl' || (tourney.code || '').toUpperCase() === 'JSL' || (tourney.shortCode || '').toUpperCase() === 'JSL' || (tourney.name || '').toUpperCase().includes('JHANKRA'));
  // Force JSL to Mode A (AUCTION_LEAGUE)
  const isAuction = isJsl || (tourney.mode === 'AUCTION_LEAGUE') || (!tourney.mode);

  const tid = tourney.supabaseId || tourney.tournament_id || tourney.id;
  const tourneySlug = (tourney.slug || '').toLowerCase();
  const tourneyCode = (tourney.shortCode || tourney.code || '').toUpperCase();
  const tourneyName = (tourney.name || '').toUpperCase();

  const allPlayers = store.getPlayers().filter(p => {
    if (isJsl && (!p.tournamentId && !p.tournament_id && !p.tournamentSlug)) return true;
    const pTid = p.tournament_id || p.tournamentId || '';
    const pSlug = (p.tournamentSlug || p.tournament_slug || '').toLowerCase();
    const pCode = (p.tournamentCode || p.category_code || '').toUpperCase();
    const pTName = (p.tournamentName || '').toUpperCase();

    return (pTid && (pTid === tid || pTid === tourney.id || pTid === tourney.supabaseId)) ||
           (pSlug && pSlug === tourneySlug) ||
           (pCode && pCode === tourneyCode) ||
           (tourneySlug.includes('kota') && (pTid.includes('kpl') || pSlug.includes('kpl') || pTName.includes('KOTA'))) ||
           (tourneySlug.includes('khirpai') && (pTid.includes('khirpai') || pSlug.includes('khirpai') || pTName.includes('KHIRPAI'))) ||
           (isJsl && (pTid.includes('jsl') || pSlug.includes('jsl') || pTName.includes('JHANKRA') || pTName.includes('JSL')));
  });

  const displayPlayers = allPlayers;

  const allTeams = store.getTeams().filter(t => {
    if (isJsl && (!t.tournamentId && !t.tournament_id)) return true;
    return t.tournament_id === tid || t.tournamentId === tourney.id || (isJsl && (t.leagueId === 'leg-jsl' || (t.leagueCode || '').toUpperCase() === 'JSL'));
  });

  const allFixtures = store.getFixtures ? store.getFixtures().filter(f => {
    if (isJsl && (!f.tournamentId && !f.tournament_id)) return true;
    return f.tournament_id === tid || f.tournamentId === tourney.id || f.leagueCode === (tourney.shortCode || 'JSL').toUpperCase();
  }) : [];

  const pendingPlayers = allPlayers.filter(p => (p.registrationStatus || p.paymentStatus || '').toUpperCase().includes('PENDING'));
  const approvedPlayers = allPlayers.filter(p => {
    const s = (p.registrationStatus || p.paymentStatus || '').toUpperCase();
    return s.includes('APPROVED') || s.includes('VERIFIED') || s === 'SOLD';
  });
  const soldPlayers = allPlayers.filter(p => p.teamId || p.auctionStatus === 'SOLD');

  // Top Award Candidates & Tournament Leaders
  const topBatsman = allPlayers.filter(p => (p.totalRuns || 0) > 0).sort((a, b) => (b.totalRuns || 0) - (a.totalRuns || 0))[0] || allPlayers[0];
  const topBowler = allPlayers.filter(p => (p.totalWickets || 0) > 0).sort((a, b) => (b.totalWickets || 0) - (a.totalWickets || 0))[0] || allPlayers[1] || allPlayers[0];
  const topKeeper = allPlayers.filter(p => (p.category || '').toUpperCase().includes('KEEPER') || p.isWicketKeeper)[0] || null;
  const topFielder = allPlayers.filter(p => (p.catches || 0) > 0).sort((a, b) => (b.catches || 0) - (a.catches || 0))[0] || null;
  const emergingPlayer = allPlayers.filter(p => p.age && Number(p.age) <= 19).sort((a, b) => (b.totalRuns || 0) - (a.totalRuns || 0))[0] || null;
  const topTeam = allTeams[0] || null;

  // DYNAMIC TABS CONFIGURATION:
  // Mode A (Auction): Home -> Teams -> Registered Players -> Auction -> Match Corner -> Statistics
  // Mode B (Fixtures): Home -> Teams -> Match Corner -> Statistics
  const hubTabs = isAuction ? [
    { id: 'home', label: '🏠 HOME' },
    { id: 'teams', label: '🛡️ TEAMS' },
    { id: 'players', label: '👥 REGISTERED PLAYERS' },
    { id: 'auction', label: '🔨 AUCTION' },
    { id: 'matches', label: '🏏 MATCH CORNER' },
    { id: 'stats', label: '📊 STATISTICS' },
  ] : [
    { id: 'home', label: '🏠 HOME' },
    { id: 'teams', label: '🛡️ TEAMS' },
    { id: 'matches', label: '🏏 MATCH CORNER' },
    { id: 'stats', label: '📊 STATISTICS' },
  ];

  let hubTab = 'home';
  try {
    const saved = sessionStorage.getItem('cpl_hub_tab_' + tourney.slug);
    if (saved && hubTabs.some(t => t.id === saved)) hubTab = saved;
  } catch(e) {}

  const currentUser = store.getCurrentUser ? store.getCurrentUser() : null;
  const userPhone = (currentUser?.phone || currentUser?.mobile || '').replace(/[^0-9]/g, '');
  const orgPhone = (tourney.organizer?.phone || '').replace(/[^0-9]/g, '');
  const isMaster = store.isMasterAdmin ? store.isMasterAdmin() : false;
  const isTourneyAdmin = isMaster || (userPhone && userPhone === orgPhone) || (Array.isArray(currentUser?.ownedTournaments) && currentUser.ownedTournaments.some(id => id && id.toLowerCase().includes(tourney.slug?.toLowerCase() || '')));

  container.innerHTML = `
    <div class="w-full max-w-4xl mx-auto animate-fade-in text-slate-900 pb-12">

      <!-- TOP BAR -->
      <div class="flex items-center justify-between gap-2 py-3 px-3 sm:px-4 bg-white border-b border-slate-200 shadow-2xs rounded-t-2xl">
        <button id="btn-custom-hub-back" class="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-black text-slate-700 shadow-2xs">
          <i data-lucide="arrow-left" class="w-4 h-4"></i> Back
        </button>
        <div class="text-center min-w-0">
          <h2 class="text-xs sm:text-base font-black text-slate-900 truncate leading-tight">${tourney.name}</h2>
          <span class="text-[9px] font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">${isAuction ? 'Mode A: Auction Championship' : 'Mode B: Fixtures & Live Scoring'}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button id="btn-hub-share" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer" title="Share Tournament">
            <i data-lucide="share-2" class="w-4 h-4"></i>
          </button>
          ${isTourneyAdmin ? `
            <button id="btn-custom-hub-admin" class="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-black text-xs shadow-xs flex items-center gap-1 cursor-pointer border border-amber-300">
              <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Admin
            </button>
          ` : ''}
        </div>
      </div>

      <!-- DYNAMIC TAB NAVIGATION -->
      <div class="flex bg-slate-50 border-b-2 border-slate-200 px-2 sm:px-4 overflow-x-auto scrollbar-hide shadow-inner">
        ${hubTabs.map(t => `
          <button data-hub-tab="${t.id}" class="hub-tab-btn px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs font-black tracking-wide transition-all whitespace-nowrap cursor-pointer ${hubTab === t.id ? 'text-emerald-700 border-b-[3px] border-emerald-600 bg-white font-black' : 'text-slate-500 hover:text-slate-900'}">
            ${t.label}
          </button>
        `).join('')}
      </div>

      <!-- ========================================== -->
      <!-- TAB 1: 🏠 HOME OVERVIEW                    -->
      <!-- ========================================== -->
      <div id="hub-tab-home" class="${hubTab === 'home' ? '' : 'hidden'} space-y-4">
        <!-- HERO POSTER BANNER -->
        <div class="relative w-full aspect-[16/8] sm:aspect-[16/7] overflow-hidden bg-slate-900 border-b border-slate-200">
          ${tourney.posterUrl ? `
            <img src="${tourney.posterUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'" />
          ` : renderTournamentFallbackPoster(tourney)}
        </div>

        <!-- PRIZE & KEY METRICS STRIP -->
        <div class="p-3 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-slate-950 rounded-2xl mx-3 shadow-md border-2 border-amber-300">
          <div class="flex items-center justify-around text-center divide-x divide-amber-700/30">
            <div class="px-2">
              <span class="text-[8px] font-black uppercase tracking-wider block text-amber-950">🏆 Winner</span>
              <span class="text-xs sm:text-base font-black">${tourney.prizeWinner ? '₹' + Number(tourney.prizeWinner).toLocaleString('en-IN') : 'Trophy + Prize'}</span>
            </div>
            <div class="px-2">
              <span class="text-[8px] font-black uppercase tracking-wider block text-amber-950">🥈 Runner-Up</span>
              <span class="text-xs sm:text-base font-black">${tourney.prizeRunner ? '₹' + Number(tourney.prizeRunner).toLocaleString('en-IN') : 'Trophy + Medals'}</span>
            </div>
            <div class="px-2">
              <span class="text-[8px] font-black uppercase tracking-wider block text-amber-950">💰 Entry Fee</span>
              <span class="text-xs sm:text-base font-black">₹${tourney.entryFee || (isAuction ? 300 : 'Free')}</span>
            </div>
            <div class="px-2">
              <span class="text-[8px] font-black uppercase tracking-wider block text-amber-950">🛡️ Teams</span>
              <span class="text-xs sm:text-base font-black">${allTeams.length}</span>
            </div>
            ${isAuction ? `
              <div class="px-2">
                <span class="text-[8px] font-black uppercase tracking-wider block text-amber-950">👥 Players</span>
                <span class="text-xs sm:text-base font-black">${allPlayers.length}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- TOURNAMENT DETAILS & RULES CARD -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mx-3 space-y-3">
          <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>📋</span> Tournament Schedule & Specifications
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold">
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span class="text-[9px] font-black text-slate-400 uppercase block">Ground / Venue</span>
              <span class="text-slate-900 font-bold">📍 ${tourney.venue || 'Local Stadium / Ground'}</span>
            </div>
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span class="text-[9px] font-black text-slate-400 uppercase block">Tournament Dates</span>
              <span class="text-slate-900 font-bold">📅 ${tourney.dates || (tourney.kickoffDate ? new Date(tourney.kickoffDate).toLocaleDateString('en-IN') : 'Season 2026')}</span>
            </div>
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span class="text-[9px] font-black text-slate-400 uppercase block">Tournament Organizer</span>
              <span class="text-slate-900 font-bold">👑 ${tourney.organizer?.name || 'Tournament Committee'}</span>
            </div>
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span class="text-[9px] font-black text-slate-400 uppercase block">Tournament Mode</span>
              <span class="text-emerald-700 font-bold">${isAuction ? '🔨 Player Registration & Team Auction' : '⚔️ Direct Team Fixtures & Live Scoring'}</span>
            </div>
          </div>

          ${tourney.ruleRestriction ? `
            <div class="p-3 bg-red-50/80 border border-red-200 rounded-xl text-xs">
              <span class="text-[9px] font-black text-red-700 uppercase block mb-0.5">⚠️ Player Eligibility / Rules</span>
              <p class="text-slate-800 font-semibold leading-relaxed">${tourney.ruleRestriction}</p>
            </div>
          ` : ''}
        </div>

        <!-- HIGHLIGHTED RED REGISTRATION LINK (IF AUCTION MODE & REG OPEN) -->
        ${isAuction && store.isRegistrationOpen() ? `
          <div class="p-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-2xl mx-3 shadow-xl text-white text-center space-y-2 border-2 border-red-400 animate-pulse">
            <div class="text-sm sm:text-base font-black tracking-wide">🏏 PLAYER REGISTRATIONS ARE ACTIVE!</div>
            <p class="text-xs text-red-100 font-medium">Join the grand player auction pool for ₹${tourney.entryFee || 300} and get drafted into top franchise teams.</p>
            <button id="btn-home-hero-reg-link" class="w-full sm:w-auto px-8 py-3 bg-white hover:bg-slate-100 text-red-700 font-black text-sm rounded-xl shadow-lg cursor-pointer transition-all hover:scale-105 border border-red-200">
              📝 Register for ${tourney.name} Now ➔
            </button>
          </div>
        ` : isAuction ? `
          <div class="p-4 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 rounded-2xl mx-3 shadow-xl text-white text-center space-y-2 border-2 border-slate-400">
            <div class="text-sm sm:text-base font-black tracking-wide">🔒 PLAYER REGISTRATIONS ARE CLOSED</div>
            <p class="text-xs text-slate-300 font-medium">${store.getRegistrationSettings().closedReason || 'Registration is currently closed by the Admin.'}</p>
          </div>
        ` : ''}
      </div>

      <!-- ========================================== -->
      <!-- TAB 2: 🛡️ TEAMS                             -->
      <!-- ========================================== -->
      <div id="hub-tab-teams" class="${hubTab === 'teams' ? '' : 'hidden'} p-3 sm:p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-black text-slate-800 flex items-center gap-1.5">
            <span>🛡️</span> Participating Teams (${allTeams.length})
          </h3>
          ${isTourneyAdmin ? `
            <span class="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
              👑 Admin Team Edit Enabled
            </span>
          ` : ''}
        </div>

        ${allTeams.length > 0 ? `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            ${allTeams.map((t, idx) => {
              const teamSquad = allPlayers.filter(p => p.teamId === t.id);
              const logo = t.logoUrl || t.teamLogoUrl || generateUniqueTeamBadge(t.name, idx);

              return `
                <div class="bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                  <!-- Team Header Banner -->
                  <div class="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-12 h-12 rounded-xl bg-white border-2 border-slate-300 shadow-2xs overflow-hidden flex items-center justify-center shrink-0">
                        <img src="${logo}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Crect width=\\'100\\' height=\\'100\\' fill=\\'%230F2C59\\'/%3E%3Ctext x=\\'50\\' y=\\'60\\' font-size=\\'40\\' text-anchor=\\'middle\\' fill=\\'white\\'%3E🏏%3C/text%3E%3C/svg%3E'" />
                      </div>
                      <div class="min-w-0">
                        <h4 class="text-sm sm:text-base font-black text-slate-900 truncate leading-tight">${t.name}</h4>
                        <span class="text-[10px] font-bold text-slate-500">${teamSquad.length} Players Drafted</span>
                      </div>
                    </div>

                    ${isTourneyAdmin ? `
                      <button type="button" class="btn-hub-edit-team px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-black cursor-pointer shrink-0 shadow-2xs" data-team-id="${t.id}">
                        ✏️ Edit Team
                      </button>
                    ` : ''}
                  </div>

                  <!-- Key Personnel Pods -->
                  <div class="p-3 space-y-2 text-xs">
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <!-- Owner -->
                      <div class="p-2 bg-amber-50/70 border border-amber-200 rounded-xl text-center">
                        <div class="w-8 h-8 rounded-lg mx-auto mb-1 overflow-hidden bg-amber-100 flex items-center justify-center border border-amber-300 shadow-2xs">
                          ${t.ownerPhotoUrl || t.ownerPhoto ? `<img src="${t.ownerPhotoUrl || t.ownerPhoto}" class="w-full h-full object-cover" />` : `<span>👑</span>`}
                        </div>
                        <span class="text-[8px] font-black uppercase text-amber-900 block">Owner</span>
                        <span class="text-[11px] font-black text-slate-900 truncate block">${t.ownerName || 'TBD'}</span>
                      </div>

                      <!-- Icon Player -->
                      <div class="p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                        <div class="w-8 h-8 rounded-lg mx-auto mb-1 overflow-hidden bg-emerald-100 flex items-center justify-center border border-emerald-300 shadow-2xs">
                          ${t.iconPlayerPhotoUrl || t.iconPhoto ? `<img src="${t.iconPlayerPhotoUrl || t.iconPhoto}" class="w-full h-full object-cover" />` : `<span>⭐</span>`}
                        </div>
                        <span class="text-[8px] font-black uppercase text-emerald-900 block">Icon</span>
                        <span class="text-[11px] font-black text-slate-900 truncate block">${t.iconPlayerName || t.iconName || 'None'}</span>
                      </div>

                      <!-- Mentor / Co-Owner -->
                      <div class="p-2 bg-purple-50/70 border border-purple-200 rounded-xl text-center col-span-2 sm:col-span-1">
                        <div class="w-8 h-8 rounded-lg mx-auto mb-1 overflow-hidden bg-purple-100 flex items-center justify-center border border-purple-300 shadow-2xs">
                          ${t.mentorPhotoUrl || t.coOwnerPhotoUrl ? `<img src="${t.mentorPhotoUrl || t.coOwnerPhotoUrl}" class="w-full h-full object-cover" />` : `<span>🧠</span>`}
                        </div>
                        <span class="text-[8px] font-black uppercase text-purple-900 block">${t.mentorName ? 'Mentor' : 'Co-Owner'}</span>
                        <span class="text-[11px] font-black text-slate-900 truncate block">${t.mentorName || t.coOwnerName || 'N/A'}</span>
                      </div>
                    </div>

                    <!-- View Squad Button -->
                    <button class="hub-view-squad-btn w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1" data-team-id="${t.id}">
                      <span>View Full Squad (${teamSquad.length} Players)</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div class="text-3xl">🛡️</div>
            <p class="text-sm font-bold text-slate-700">No teams created yet</p>
            <p class="text-xs text-slate-400">Teams will be listed here once assigned by the tournament organizer.</p>
          </div>
        `}
      </div>

      <!-- ============================================================= -->
      <!-- TAB 3: 👥 REGISTERED PLAYERS (Square Photos, Masked Phone)    -->
      <!-- ============================================================= -->
      ${isAuction ? `
        <div id="hub-tab-players" class="${hubTab === 'players' ? '' : 'hidden'} p-3 sm:p-4 space-y-4">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-black text-slate-900">Registered Players (${displayPlayers.length})</h3>
              <p class="text-[11px] text-slate-500 font-semibold">Click "View Profile" to see complete player credentials</p>
            </div>
            <span class="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0">
              ${displayPlayers.filter(p => (p.registrationStatus || p.paymentStatus) === 'APPROVED').length} Verified
            </span>
          </div>

          ${displayPlayers.length > 0 ? `
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              ${displayPlayers.map((p, idx) => {
                const serial = String(p.displayRegistrationNumber || p.serialNo || (idx + 1)).padStart(2, '0');
                const isApproved = (p.registrationStatus || p.paymentStatus) === 'APPROVED';
                const photo = p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png';

                return `
                  <div class="bg-white p-2.5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-center group">
                    <!-- Square 1:1 Player Picture -->
                    <div class="w-full aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative mb-2 shadow-2xs">
                      <img src="${photo}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" onerror="this.src='assets/card_jsl_user.png'" />
                      <span class="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-900/90 text-amber-300 font-mono font-black text-[10px] rounded border border-amber-400/50 shadow">
                        #${serial}
                      </span>
                      <span class="absolute top-1.5 right-1.5 w-3 h-3 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-amber-400'} border-2 border-white shadow"></span>
                    </div>

                    <!-- Name & Category -->
                    <div class="space-y-0.5 mb-2">
                      <h4 class="text-xs font-black text-slate-900 truncate leading-tight">${p.name}</h4>
                      <span class="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[8.5px] font-black uppercase rounded-full border border-slate-200">
                        ${p.category || p.role || 'All Rounder'}
                      </span>
                    </div>

                    <!-- View Profile Button -->
                    <button class="hub-view-profile-btn w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] rounded-xl shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors" data-player-id="${p.id}">
                      <i data-lucide="user" class="w-3 h-3 text-amber-400"></i> View Profile
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div class="text-3xl">📝</div>
              <p class="text-sm font-bold text-slate-700">No players registered yet</p>
              <button id="btn-tab-open-reg-empty" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow cursor-pointer">
                📝 Register First Player
              </button>
            </div>
          `}
        </div>
      ` : ''}

      <!-- ============================================================= -->
      <!-- TAB 4: 🔨 AUCTION ARCHIVE & SUMMARY PORTAL (5-YEAR RECORD)     -->
      <!-- ============================================================= -->
      ${isAuction ? `
        <div id="hub-tab-auction" class="${hubTab === 'auction' ? '' : 'hidden'} p-3 sm:p-4 space-y-4">
          
          <!-- PREVIOUS AUCTION SUMMARY HEADER BANNER -->
          <div class="bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-2xl flex items-center justify-center shadow-2xs shrink-0">
                  📜
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-[9px] font-black uppercase text-amber-900 tracking-wider">PREVIOUS AUCTION SUMMARY</span>
                    <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[8.5px] font-black rounded-full border border-emerald-300 flex items-center gap-1">
                      🔒 5-YEAR ARCHIVE
                    </span>
                  </div>
                  <h3 class="text-sm sm:text-base font-black text-slate-900 leading-tight mt-0.5">
                    ${tourney.name} Final Auction Summary & Roster Archives
                  </h3>
                </div>
              </div>

              <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full border border-emerald-300 flex items-center gap-1 shrink-0">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Auction Completed
              </span>
            </div>

            <p class="text-xs text-slate-500 font-medium">
              All ${allTeams.length} franchise squads, player sold values, icon player ⭐ allocations, and purse balances are permanently preserved in the ${tourney.shortCode || 'TOURNAMENT'} Master Archive.
            </p>

            <!-- 3 ACTION BUTTONS -->
            <div class="pt-1 flex flex-wrap items-center gap-2">
              <button id="btn-open-final-auction-summary-modal" class="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102">
                <span>🏆</span> View Final Auction Summary
              </button>
              <button id="btn-download-all-squads-pdf" class="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all">
                <span>📑</span> All Squads PDF
              </button>
              <button id="btn-download-json-backup" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-all">
                <span>💾</span> JSON Backup
              </button>
            </div>
          </div>

          <!-- TOP 8 HIGHEST BUYS INLINE PREVIEW -->
          <div class="bg-white p-4 rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🔥</span> TOP HIGHEST BUYS OF ${tourney.name} AUCTION
              </h4>
              <span class="text-[10px] font-bold text-slate-400">Top Bids</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${(() => {
                const sortedSold = allPlayers.filter(p => (Number(p.soldPrice || p.boughtPrice || 0) > 0)).sort((a, b) => (Number(b.soldPrice || b.boughtPrice || 0) - Number(a.soldPrice || a.boughtPrice || 0))).slice(0, 8);
                
                if (sortedSold.length === 0) {
                  return `<div class="col-span-2 text-center py-6 text-xs text-slate-400 font-bold">No sold players recorded in auction yet.</div>`;
                }

                return sortedSold.map((p, idx) => {
                  const team = allTeams.find(t => t.id === p.teamId);
                  const soldAmt = Number(p.soldPrice || p.boughtPrice || 0);
                  const photo = p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png';

                  return `
                    <div class="p-3 bg-slate-50/70 border border-slate-200 rounded-2xl flex items-center justify-between gap-2.5 hover:border-amber-400 hover:bg-amber-50/20 transition-all">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                          #${idx + 1}
                        </span>
                        <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                          <img src="${photo}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
                        </div>
                        <div class="min-w-0">
                          <h5 class="text-xs font-black text-slate-900 truncate leading-tight">${p.name}</h5>
                          <div class="text-[10px] font-bold text-slate-600 truncate flex items-center gap-1">
                            <span>🛡️</span> ${team?.name || p.teamName || 'Franchise Team'}
                          </div>
                          <span class="text-[9px] text-slate-400 font-medium">${p.category || 'All-rounder'}</span>
                        </div>
                      </div>

                      <div class="text-right shrink-0">
                        <div class="text-xs sm:text-sm font-mono font-black text-emerald-700">₹ ${soldAmt.toLocaleString('en-IN')}</div>
                        <span class="text-[8px] font-black uppercase text-slate-400 block tracking-wider">FINAL BID</span>
                      </div>
                    </div>
                  `;
                }).join('');
              })()}
            </div>
          </div>

        </div>
      ` : ''}

      <!-- ============================================================= -->
      <!-- TAB 5: 🏏 MATCH CORNER (Fixtures & Points Table)               -->
      <!-- ============================================================= -->
      <div id="hub-tab-matches" class="${hubTab === 'matches' ? '' : 'hidden'} p-3 sm:p-4 space-y-4">
        <!-- Subtabs: Fixtures vs Points Table -->
        <div class="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-xs border border-slate-200">
          <button id="hub-match-subtab-fixtures" class="flex-1 py-1.5 rounded-lg text-xs font-black bg-white text-slate-900 shadow-xs transition-all cursor-pointer">
            📅 Matches (${allFixtures.length})
          </button>
          <button id="hub-match-subtab-points" class="flex-1 py-1.5 rounded-lg text-xs font-black text-slate-500 hover:text-slate-900 transition-all cursor-pointer">
            🏆 Points Table
          </button>
        </div>

        <!-- Section 1: Fixtures List -->
        <div id="hub-matches-fixtures-container" class="space-y-3">
          ${allFixtures.length > 0 ? `
            <div class="space-y-2.5">
              ${allFixtures.map(f => {
                const isLive = f.status === 'LIVE';
                const isCompleted = f.status === 'COMPLETED';

                return `
                  <div class="bg-white p-3.5 rounded-2xl border-2 ${isLive ? 'border-red-500 bg-red-50/20' : 'border-slate-200'} shadow-sm space-y-2">
                    <div class="flex items-center justify-between text-[10px] font-black">
                      <span class="text-slate-500 uppercase tracking-wider">Match #${f.matchNo || 1} • ${f.stage || f.groupCode || 'League Match'}</span>
                      <span class="px-2 py-0.5 rounded-full text-[9px] ${isLive ? 'bg-red-500 text-white animate-pulse' : isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
                        ${f.status || 'SCHEDULED'}
                      </span>
                    </div>

                    <div class="flex items-center justify-between gap-3 py-1">
                      <div class="flex-1 text-left min-w-0">
                        <div class="text-xs sm:text-sm font-black text-slate-900 truncate">${f.teamAName || 'Team A'}</div>
                        ${f.liveScoreTeamA ? `<div class="text-xs font-mono font-black text-slate-700">${f.liveScoreTeamA}</div>` : ''}
                      </div>

                      <span class="px-2 py-1 bg-slate-100 text-slate-500 font-black text-[10px] rounded-lg shrink-0">VS</span>

                      <div class="flex-1 text-right min-w-0">
                        <div class="text-xs sm:text-sm font-black text-slate-900 truncate">${f.teamBName || 'Team B'}</div>
                        ${f.liveScoreTeamB ? `<div class="text-xs font-mono font-black text-slate-700">${f.liveScoreTeamB}</div>` : ''}
                      </div>
                    </div>

                    <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>📅 ${f.date || 'TBD'} ${f.time ? '• ⏰ ' + f.time : ''}</span>
                      <span>📍 ${f.venue || tourney.venue || 'Ground'}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="text-center py-10 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div class="text-3xl">📅</div>
              <p class="text-sm font-bold text-slate-700">No matches scheduled yet</p>
              <p class="text-xs text-slate-400">Fixtures will be published once announced by the tournament admin.</p>
            </div>
          `}
        </div>

        <!-- Section 2: Points Table -->
        <div id="hub-matches-points-container" class="hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider">Tournament Standings</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-semibold">
              <thead class="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                <tr>
                  <th class="p-2.5">Team</th>
                  <th class="p-2.5 text-center">P</th>
                  <th class="p-2.5 text-center">W</th>
                  <th class="p-2.5 text-center">L</th>
                  <th class="p-2.5 text-center">NRR</th>
                  <th class="p-2.5 text-right">PTS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${allTeams.map((t, idx) => `
                  <tr class="hover:bg-slate-50">
                    <td class="p-2.5 font-bold text-slate-900 flex items-center gap-2">
                      <span class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono font-black text-[10px] text-slate-600">${idx + 1}</span>
                      <span class="truncate">${t.name}</span>
                    </td>
                    <td class="p-2.5 text-center text-slate-600 font-mono">0</td>
                    <td class="p-2.5 text-center text-emerald-700 font-mono font-bold">0</td>
                    <td class="p-2.5 text-center text-red-600 font-mono">0</td>
                    <td class="p-2.5 text-center text-slate-500 font-mono">+0.000</td>
                    <td class="p-2.5 text-right text-emerald-800 font-mono font-black text-sm">0</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ============================================================= -->
      <!-- TAB 6: 📊 STATISTICS & AWARDS LEADERBOARD                     -->
      <!-- ============================================================= -->
      <div id="hub-tab-stats" class="${hubTab === 'stats' ? '' : 'hidden'} p-3 sm:p-4 space-y-4">
        <!-- 1. BEST MVP PLAYER PODIUM BOX -->
        <div class="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 rounded-3xl text-slate-950 shadow-xl border-2 border-amber-300 flex items-center justify-between gap-4">
          <div class="space-y-1">
            <span class="px-2.5 py-0.5 bg-slate-950 text-amber-300 text-[9px] font-black rounded-full uppercase tracking-wider">🏆 TOURNAMENT MVP</span>
            <h3 class="text-base sm:text-xl font-black text-slate-950 leading-tight">${topBatsman?.name || 'Tournament Leader'}</h3>
            <p class="text-xs text-slate-900 font-semibold">Best Overall Performer of ${tourney.name}</p>
          </div>
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-slate-950 overflow-hidden shadow-lg shrink-0">
            <img src="${topBatsman?.photoUrl || 'assets/card_jsl_user.png'}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
          </div>
        </div>

        <!-- 2. AWARDS LEADERBOARD GRID -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Best Batsman -->
          <div class="bg-white p-3.5 rounded-2xl border-2 border-orange-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-[10px] font-black uppercase text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">🏏 Best Batsman</span>
              <span class="font-mono font-black text-orange-950">${topBatsman?.totalRuns || 0} Runs</span>
            </div>
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 overflow-hidden shrink-0">
                <img src="${topBatsman?.photoUrl || 'assets/card_jsl_user.png'}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
              </div>
              <div class="min-w-0">
                <h4 class="text-xs font-black text-slate-900 truncate">${topBatsman?.name || 'Candidate'}</h4>
                <p class="text-[10px] text-slate-500 font-medium">${topBatsman?.category || 'Batsman'}</p>
              </div>
            </div>
          </div>

          <!-- Best Bowler -->
          <div class="bg-white p-3.5 rounded-2xl border-2 border-purple-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-[10px] font-black uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">⚡ Best Bowler</span>
              <span class="font-mono font-black text-purple-950">${topBowler?.totalWickets || 0} Wickets</span>
            </div>
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 overflow-hidden shrink-0">
                <img src="${topBowler?.photoUrl || 'assets/card_jsl_user.png'}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
              </div>
              <div class="min-w-0">
                <h4 class="text-xs font-black text-slate-900 truncate">${topBowler?.name || 'Candidate'}</h4>
                <p class="text-[10px] text-slate-500 font-medium">${topBowler?.category || 'Bowler'}</p>
              </div>
            </div>
          </div>

          <!-- Best Wicket Keeper -->
          <div class="bg-white p-3.5 rounded-2xl border-2 border-sky-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-[10px] font-black uppercase text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">🧤 Best Keeper</span>
              <span class="font-mono font-black text-sky-950">Active Dismissals</span>
            </div>
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 overflow-hidden shrink-0">
                <img src="${topKeeper?.photoUrl || 'assets/card_jsl_user.png'}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
              </div>
              <div class="min-w-0">
                <h4 class="text-xs font-black text-slate-900 truncate">${topKeeper?.name || 'Wicket Keeper'}</h4>
                <p class="text-[10px] text-slate-500 font-medium">Safe Hands Award</p>
              </div>
            </div>
          </div>

          <!-- Best Emerging Player -->
          <div class="bg-white p-3.5 rounded-2xl border-2 border-emerald-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">🌟 Emerging Player</span>
              <span class="font-mono font-black text-emerald-950">Under 19 Talent</span>
            </div>
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 overflow-hidden shrink-0">
                <img src="${emergingPlayer?.photoUrl || 'assets/card_jsl_user.png'}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
              </div>
              <div class="min-w-0">
                <h4 class="text-xs font-black text-slate-900 truncate">${emergingPlayer?.name || 'Young Talent'}</h4>
                <p class="text-[10px] text-slate-500 font-medium">Future Star</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Tab switching handler
  container.querySelectorAll('.hub-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.hubTab;
      try { sessionStorage.setItem('cpl_hub_tab_' + tourney.slug, tab); } catch(ex) {}

      container.querySelectorAll('.hub-tab-btn').forEach(b => {
        b.classList.remove('text-emerald-700', 'border-b-[3px]', 'border-emerald-600', 'bg-white', 'font-black');
        b.classList.add('text-slate-500');
      });
      e.currentTarget.classList.add('text-emerald-700', 'border-b-[3px]', 'border-emerald-600', 'bg-white', 'font-black');
      e.currentTarget.classList.remove('text-slate-500');

      hubTabs.forEach(t => {
        document.getElementById('hub-tab-' + t.id)?.classList.add('hidden');
      });
      document.getElementById('hub-tab-' + tab)?.classList.remove('hidden');
    });
  });

  // Match corner subtabs switching
  document.getElementById('hub-match-subtab-fixtures')?.addEventListener('click', () => {
    document.getElementById('hub-matches-fixtures-container')?.classList.remove('hidden');
    document.getElementById('hub-matches-points-container')?.classList.add('hidden');
    document.getElementById('hub-match-subtab-fixtures')?.classList.add('bg-white', 'text-slate-900', 'shadow-xs');
    document.getElementById('hub-match-subtab-fixtures')?.classList.remove('text-slate-500');
    document.getElementById('hub-match-subtab-points')?.classList.remove('bg-white', 'text-slate-900', 'shadow-xs');
    document.getElementById('hub-match-subtab-points')?.classList.add('text-slate-500');
  });

  document.getElementById('hub-match-subtab-points')?.addEventListener('click', () => {
    document.getElementById('hub-matches-points-container')?.classList.remove('hidden');
    document.getElementById('hub-matches-fixtures-container')?.classList.add('hidden');
    document.getElementById('hub-match-subtab-points')?.classList.add('bg-white', 'text-slate-900', 'shadow-xs');
    document.getElementById('hub-match-subtab-points')?.classList.remove('text-slate-500');
    document.getElementById('hub-match-subtab-fixtures')?.classList.remove('bg-white', 'text-slate-900', 'shadow-xs');
    document.getElementById('hub-match-subtab-fixtures')?.classList.add('text-slate-500');
  });

  // Action button listeners
  document.getElementById('btn-home-hero-reg-link')?.addEventListener('click', () => openDynamicTournamentRegistrationModal(tourney.slug));
  document.getElementById('btn-tab-open-reg-empty')?.addEventListener('click', () => openDynamicTournamentRegistrationModal(tourney.slug));
  document.getElementById('btn-custom-hub-back')?.addEventListener('click', () => navigate('landing'));
  document.getElementById('btn-custom-hub-admin')?.addEventListener('click', () => navigate('admin'));

  // Auction summary & backup buttons
  document.getElementById('btn-open-final-auction-summary-modal')?.addEventListener('click', () => {
    openFinalAuctionSummaryModal(tourney, allTeams, allPlayers);
  });

  document.getElementById('btn-download-all-squads-pdf')?.addEventListener('click', () => {
    if (typeof window.print === 'function') {
      window.print();
    } else {
      alert('Generating PDF summary...');
    }
  });

  document.getElementById('btn-download-json-backup')?.addEventListener('click', () => {
    const backupObj = {
      tournament: tourney,
      archivedAt: new Date().toISOString(),
      teams: allTeams,
      players: allPlayers,
      topBuys: allPlayers.filter(p => Number(p.soldPrice || 0) > 0).sort((a, b) => Number(b.soldPrice || 0) - Number(a.soldPrice || 0)).slice(0, 20)
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tourney.slug || 'tournament'}_auction_archive_backup.json`;
    a.click();
  });

  document.getElementById('btn-hub-share')?.addEventListener('click', () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: tourney.name, url });
    } else {
      navigator.clipboard?.writeText(url);
      alert('Tournament link copied to clipboard!\n\n' + url);
    }
  });

  document.querySelectorAll('.hub-view-squad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const teamId = btn.getAttribute('data-team-id');
      const team = allTeams.find(t => t.id === teamId);
      if (team) openTeamSquadModal(team);
    });
  });

  document.querySelectorAll('.hub-view-profile-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const playerId = btn.getAttribute('data-player-id');
      const player = store.getPlayerById(playerId);
      if (player) openFullPlayerProfileModal(player);
    });
  });

  // Admin Team Editor Click Listener
  document.querySelectorAll('.btn-hub-edit-team').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-team-id');
      const team = allTeams.find(t => t.id === teamId);
      if (team) {
        openEditTeamModalForAdmin(team, tourney, () => renderCustomTournamentHub(container, tourney));
      }
    });
  });
}

/**
 * Generate a distinct deterministic Cricket Team Badge SVG based on team name & index
 */
function generateUniqueTeamBadge(name = 'Team', idx = 0) {
  const colors = [
    { bg: '#0F2C59', text: '#F59E0B' },
    { bg: '#059669', text: '#FFFFFF' },
    { bg: '#DC2626', text: '#FEF08A' },
    { bg: '#7C3AED', text: '#FFFFFF' },
    { bg: '#EA580C', text: '#FFFFFF' },
    { bg: '#0284C7', text: '#FFFFFF' },
    { bg: '#4338CA', text: '#FDE047' },
    { bg: '#047857', text: '#FDE047' }
  ];
  const pair = colors[idx % colors.length];
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'TM';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="20" fill="${pair.bg}"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="${pair.text}" stroke-width="3" stroke-dasharray="4 2"/>
    <text x="50" y="58" font-family="sans-serif" font-size="28" font-weight="900" text-anchor="middle" fill="${pair.text}">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/**
 * Admin / Master Admin Modal to Edit Full Team Details (Name, Owner, Icon, Co-Owner, Mentor, Logo)
 */
function openEditTeamModalForAdmin(team, tourney, onSaveCallback) {
  document.getElementById('admin-edit-team-modal')?.remove();

  const modalEl = document.createElement('div');
  modalEl.id = 'admin-edit-team-modal';
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in';

  modalEl.innerHTML = `
    <div class="bg-white rounded-3xl border-2 border-indigo-500 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900 my-auto">
      <div class="px-5 py-4 bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="p-2 bg-indigo-500/30 rounded-xl text-lg">✏️</span>
          <div>
            <h3 class="text-base font-black">Edit Team & Personnel Details</h3>
            <p class="text-[11px] text-slate-300">Modify Team Name, Owner, Icon, Co-Owner, Mentor & Logo</p>
          </div>
        </div>
        <button id="close-edit-team-modal-btn" class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black flex items-center justify-center text-sm cursor-pointer">
          ✕
        </button>
      </div>

      <form id="admin-edit-team-form" class="p-5 overflow-y-auto space-y-3.5 text-xs font-semibold">
        <div>
          <label class="block text-[11px] font-black text-slate-700 mb-1">Team Name *</label>
          <input type="text" id="team-edit-name" required value="${team.name || ''}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:border-indigo-500 focus:outline-none" />
        </div>

        <!-- Owner Details -->
        <div class="p-3 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-2">
          <span class="text-[9px] font-black uppercase text-amber-950 block">👑 Owner Details</span>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="team-edit-owner-name" value="${team.ownerName || ''}" placeholder="Owner Name" class="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs" />
            <input type="text" id="team-edit-owner-photo" value="${team.ownerPhotoUrl || team.ownerPhoto || ''}" placeholder="Owner Photo URL" class="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs" />
          </div>
        </div>

        <!-- Icon Player Details -->
        <div class="p-3 bg-emerald-50/80 border border-emerald-300 rounded-2xl space-y-2">
          <span class="text-[9px] font-black uppercase text-emerald-950 block">⭐ Icon Player Details</span>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="team-edit-icon-name" value="${team.iconPlayerName || team.iconName || ''}" placeholder="Icon Player Name" class="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs" />
            <input type="text" id="team-edit-icon-photo" value="${team.iconPlayerPhotoUrl || team.iconPhoto || ''}" placeholder="Icon Photo URL" class="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs" />
          </div>
        </div>

        <!-- Co-Owner Details -->
        <div class="p-3 bg-sky-50/80 border border-sky-300 rounded-2xl space-y-2">
          <span class="text-[9px] font-black uppercase text-sky-950 block">🤝 Co-Owner Details</span>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="team-edit-co-owner-name" value="${team.coOwnerName || ''}" placeholder="Co-Owner Name" class="px-3 py-1.5 bg-white border border-sky-300 rounded-xl text-xs" />
            <input type="text" id="team-edit-co-owner-photo" value="${team.coOwnerPhotoUrl || ''}" placeholder="Co-Owner Photo URL" class="px-3 py-1.5 bg-white border border-sky-300 rounded-xl text-xs" />
          </div>
        </div>

        <!-- Mentor Details -->
        <div class="p-3 bg-purple-50/80 border border-purple-300 rounded-2xl space-y-2">
          <span class="text-[9px] font-black uppercase text-purple-950 block">🧠 Mentor Details</span>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="team-edit-mentor-name" value="${team.mentorName || ''}" placeholder="Mentor Name" class="px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs" />
            <input type="text" id="team-edit-mentor-photo" value="${team.mentorPhotoUrl || ''}" placeholder="Mentor Photo URL" class="px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs" />
          </div>
        </div>

        <!-- Team Logo URL -->
        <div>
          <label class="block text-[11px] font-black text-slate-700 mb-1">Custom Team Logo URL (Leave blank to use unique auto-badge)</label>
          <input type="text" id="team-edit-logo-url" value="${team.logoUrl || team.teamLogoUrl || ''}" placeholder="https://..." class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:border-indigo-500 focus:outline-none" />
        </div>

        <div class="pt-2 flex items-center justify-end gap-2">
          <button type="button" id="cancel-edit-team-btn" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-black rounded-xl text-xs shadow-md cursor-pointer">
            💾 Save Team Details
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  const closeModal = () => modalEl.remove();
  document.getElementById('close-edit-team-modal-btn')?.addEventListener('click', closeModal);
  document.getElementById('cancel-edit-team-btn')?.addEventListener('click', closeModal);

  document.getElementById('admin-edit-team-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('team-edit-name').value.trim();
    const ownerName = document.getElementById('team-edit-owner-name').value.trim();
    const ownerPhoto = document.getElementById('team-edit-owner-photo').value.trim();
    const iconName = document.getElementById('team-edit-icon-name').value.trim();
    const iconPhoto = document.getElementById('team-edit-icon-photo').value.trim();
    const coOwnerName = document.getElementById('team-edit-co-owner-name').value.trim();
    const coOwnerPhoto = document.getElementById('team-edit-co-owner-photo').value.trim();
    const mentorName = document.getElementById('team-edit-mentor-name').value.trim();
    const mentorPhoto = document.getElementById('team-edit-mentor-photo').value.trim();
    const logoUrl = document.getElementById('team-edit-logo-url').value.trim();

    const updatedTeam = {
      ...team,
      name,
      ownerName,
      ownerPhotoUrl: ownerPhoto,
      ownerPhoto: ownerPhoto,
      iconPlayerName: iconName,
      iconName: iconName,
      iconPlayerPhotoUrl: iconPhoto,
      iconPhoto: iconPhoto,
      coOwnerName,
      coOwnerPhotoUrl: coOwnerPhoto,
      mentorName,
      mentorPhotoUrl: mentorPhoto,
      logoUrl,
      teamLogoUrl: logoUrl
    };

    store.updateTeam(updatedTeam);
    alert(`✅ Team "${name}" details saved successfully!`);
    closeModal();
    if (typeof onSaveCallback === 'function') onSaveCallback();
  });
}

/**
 * Open Final Auction Summary & Roster Archives Modal (Permanent 5-Year Record)
 */
function openFinalAuctionSummaryModal(tourney, allTeams, allPlayers) {
  document.getElementById('final-auction-summary-modal')?.remove();

  const soldPlayers = allPlayers.filter(p => Number(p.soldPrice || p.boughtPrice || 0) > 0 || p.auctionStatus === 'SOLD');
  const totalPurse = allTeams.reduce((sum, t) => sum + (Number(t.purseBudget || t.purse || tourney.teamPurse || 8000)), 0) || (allTeams.length * 8000);
  const totalSpent = soldPlayers.reduce((sum, p) => sum + (Number(p.soldPrice || p.boughtPrice || 0)), 0);
  const remainingPurse = Math.max(0, totalPurse - totalSpent);

  const sortedTopBuys = [...soldPlayers].sort((a, b) => (Number(b.soldPrice || b.boughtPrice || 0) - Number(a.soldPrice || a.boughtPrice || 0))).slice(0, 8);

  let activeSubTab = 'overview';

  const modalEl = document.createElement('div');
  modalEl.id = 'final-auction-summary-modal';
  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in text-slate-900';

  const renderContent = () => {
    modalEl.innerHTML = `
      <div class="bg-white rounded-3xl border-2 border-amber-400 shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden my-auto text-slate-900">
        
        <!-- MODAL HEADER -->
        <div class="px-5 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-slate-950 flex items-center justify-between border-b border-amber-300">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-400 border border-amber-300 text-2xl flex items-center justify-center shadow-xs">
              🏆
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 bg-slate-950 text-amber-300 font-mono font-black text-[9px] rounded-full uppercase tracking-wider">
                  PERMANENT 5-YEAR RECORD
                </span>
                <span class="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[9px] rounded-full border border-emerald-300">
                  🔒 LOCKED & PRESERVED
                </span>
              </div>
              <h3 class="text-sm sm:text-lg font-black text-slate-950 leading-tight mt-0.5">
                ${tourney.name} Official Final Auction Summary
              </h3>
            </div>
          </div>

          <button id="close-final-summary-modal-btn" class="w-8 h-8 rounded-full bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 font-black flex items-center justify-center text-sm cursor-pointer transition-colors">
            ✕
          </button>
        </div>

        <!-- SUB-NAV TABS & ACTION BUTTONS BAR -->
        <div class="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button id="modal-subtab-overview" class="px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'overview' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
              <span>📊</span> Overview & Top Buys
            </button>
            <button id="modal-subtab-squads" class="px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'squads' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
              <span>🛡️</span> Team Squads (${allTeams.length})
            </button>
            <button id="modal-subtab-players" class="px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'players' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
              <span>📋</span> All Players (${allPlayers.length})
            </button>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button id="modal-btn-pdf" class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer">
              <span>📑</span> All Squads PDF
            </button>
            <button id="modal-btn-json" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer">
              <span>📥</span> JSON Archive
            </button>
          </div>
        </div>

        <!-- MODAL BODY -->
        <div class="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          ${activeSubTab === 'overview' ? `
            <!-- 4 METRIC CARDS -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <!-- Total Purse -->
              <div class="p-3.5 bg-amber-50/70 border-2 border-amber-300 rounded-2xl text-center space-y-0.5 shadow-2xs">
                <span class="text-[9px] font-black uppercase text-amber-900 tracking-wider">TOTAL PURSE</span>
                <div class="text-base sm:text-xl font-black text-slate-900 font-mono">₹ ${totalPurse.toLocaleString('en-IN')}</div>
              </div>

              <!-- Total Auction Spent -->
              <div class="p-3.5 bg-rose-50/70 border-2 border-rose-300 rounded-2xl text-center space-y-0.5 shadow-2xs">
                <span class="text-[9px] font-black uppercase text-rose-900 tracking-wider">TOTAL AUCTION SPENT</span>
                <div class="text-base sm:text-xl font-black text-rose-700 font-mono">₹ ${totalSpent.toLocaleString('en-IN')}</div>
              </div>

              <!-- Total Remaining Purse -->
              <div class="p-3.5 bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl text-center space-y-0.5 shadow-2xs">
                <span class="text-[9px] font-black uppercase text-emerald-900 tracking-wider">TOTAL REMAINING PURSE</span>
                <div class="text-base sm:text-xl font-black text-emerald-700 font-mono">₹ ${remainingPurse.toLocaleString('en-IN')}</div>
              </div>

              <!-- Squad Players Sold -->
              <div class="p-3.5 bg-sky-50/70 border-2 border-sky-300 rounded-2xl text-center space-y-0.5 shadow-2xs">
                <span class="text-[9px] font-black uppercase text-sky-900 tracking-wider">SQUAD PLAYERS SOLD</span>
                <div class="text-base sm:text-xl font-black text-sky-800 font-mono">${soldPlayers.length} / ${allPlayers.length}</div>
              </div>
            </div>

            <!-- TOP 8 HIGHEST BUYS GRID -->
            <div class="bg-white p-4 rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔥</span> TOP HIGHEST BUYS OF ${tourney.name} AUCTION
                </h4>
                <span class="text-[10px] font-bold text-slate-400">Top 8 Bids</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${sortedTopBuys.map((p, idx) => {
                  const team = allTeams.find(t => t.id === p.teamId);
                  const soldAmt = Number(p.soldPrice || p.boughtPrice || 0);
                  const photo = p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png';

                  return `
                    <div class="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-amber-400 transition-all">
                      <div class="flex items-center gap-3 min-w-0">
                        <span class="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                          #${idx + 1}
                        </span>
                        <div class="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                          <img src="${photo}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
                        </div>
                        <div class="min-w-0">
                          <h5 class="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight">${p.name}</h5>
                          <div class="text-[10px] font-bold text-slate-600 truncate flex items-center gap-1">
                            <span>🛡️</span> ${team?.name || p.teamName || 'Franchise Team'}
                          </div>
                          <span class="text-[9px] text-slate-400 font-medium">🏏 ${p.category || 'All-rounder'}</span>
                        </div>
                      </div>

                      <div class="text-right shrink-0">
                        <div class="text-xs sm:text-base font-mono font-black text-emerald-700">₹ ${soldAmt.toLocaleString('en-IN')}</div>
                        <span class="text-[8px] font-black uppercase text-slate-400 block tracking-wider">FINAL BID</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          ${activeSubTab === 'squads' ? `
            <!-- ALL TEAM SQUADS BREAKDOWN -->
            <div class="space-y-4">
              ${allTeams.map(t => {
                const teamSquad = allPlayers.filter(p => p.teamId === t.id);
                const spent = teamSquad.reduce((sum, p) => sum + Number(p.soldPrice || p.boughtPrice || 0), 0);
                const purse = Number(t.purseBudget || t.purse || tourney.teamPurse || 8000);
                const remaining = Math.max(0, purse - spent);

                return `
                  <div class="p-4 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                          <img src="${t.logoUrl || t.teamLogoUrl || generateUniqueTeamBadge(t.name)}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='🏏'" />
                        </div>
                        <div>
                          <h4 class="text-xs sm:text-sm font-black text-slate-900">${t.name}</h4>
                          <span class="text-[10px] text-slate-500 font-bold">Owner: ${t.ownerName || 'TBD'}</span>
                        </div>
                      </div>
                      <div class="text-right font-mono">
                        <div class="text-xs font-black text-slate-900">${teamSquad.length} Players</div>
                        <div class="text-[10px] text-emerald-700 font-bold">Left: ₹${remaining.toLocaleString('en-IN')}</div>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      ${teamSquad.map(p => `
                        <div class="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <div class="text-xs font-black text-slate-900 truncate">${p.name}</div>
                          <div class="text-[9px] text-slate-500">${p.category || 'Player'}</div>
                          <div class="text-[10px] font-mono font-black text-emerald-700 mt-0.5">₹${Number(p.soldPrice || 0).toLocaleString('en-IN')}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          ${activeSubTab === 'players' ? `
            <!-- ALL 123 REGISTERED PLAYERS TABLE -->
            <div class="bg-white p-4 rounded-3xl border-2 border-slate-200 shadow-sm overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th class="p-2">#</th>
                    <th class="p-2">Player</th>
                    <th class="p-2">Role</th>
                    <th class="p-2">Status</th>
                    <th class="p-2">Team</th>
                    <th class="p-2 text-right">Sold Price</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-semibold">
                  ${allPlayers.map((p, idx) => {
                    const team = allTeams.find(t => t.id === p.teamId);
                    const isSold = Number(p.soldPrice || 0) > 0 || p.teamId;

                    return `
                      <tr class="hover:bg-slate-50">
                        <td class="p-2 text-slate-400 font-mono">${idx + 1}</td>
                        <td class="p-2 font-bold text-slate-900">${p.name}</td>
                        <td class="p-2 text-slate-500">${p.category || 'All-rounder'}</td>
                        <td class="p-2">
                          <span class="px-2 py-0.5 text-[9px] font-black rounded-full ${isSold ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                            ${isSold ? 'SOLD' : 'UNSOLD'}
                          </span>
                        </td>
                        <td class="p-2 font-bold text-slate-700">${team?.name || p.teamName || '-'}</td>
                        <td class="p-2 text-right font-mono font-black ${isSold ? 'text-emerald-700' : 'text-slate-400'}">
                          ${isSold ? `₹ ${Number(p.soldPrice || p.basePrice || 300).toLocaleString('en-IN')}` : '-'}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

        </div>

        <!-- MODAL FOOTER -->
        <div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
          <div class="flex items-center gap-1.5">
            <span>🏛️</span> ${tourney.name} Archive Record Vault
          </div>
          <div>
            Permanent Multi-Tenant Auction Architecture
          </div>
        </div>

      </div>
    `;

    document.getElementById('close-final-summary-modal-btn')?.addEventListener('click', () => modalEl.remove());

    document.getElementById('modal-subtab-overview')?.addEventListener('click', () => {
      activeSubTab = 'overview';
      renderContent();
    });

    document.getElementById('modal-subtab-squads')?.addEventListener('click', () => {
      activeSubTab = 'squads';
      renderContent();
    });

    document.getElementById('modal-subtab-players')?.addEventListener('click', () => {
      activeSubTab = 'players';
      renderContent();
    });

    document.getElementById('modal-btn-pdf')?.addEventListener('click', () => {
      if (typeof window.print === 'function') window.print();
    });

    document.getElementById('modal-btn-json')?.addEventListener('click', () => {
      document.getElementById('btn-download-json-backup')?.click();
    });
  };

  document.body.appendChild(modalEl);
  renderContent();
}

// --- LIVE TOURNAMENT COUNTDOWN CLOCK (31 AUGUST 2026, 9:00 AM IST) ---
export async function initTournamentCountdown() {
  const card = document.getElementById('tournament-countdown-card');
  if (!card) return;

  // Check admin settings from cloud
  try {
    const settings = await fetchPopupSettingsFromCloud();
    if (settings && settings.isCountdownEnabled === false) {
      card.classList.add('hidden');
      return;
    } else {
      card.classList.remove('hidden');
    }
  } catch (err) {
    console.warn('Countdown settings fetch fallback:', err);
  }

  const allTourneys = store.getCustomTournaments ? store.getCustomTournaments() : [];
  const featured = allTourneys.find(t => t.kickoffDate) || {};
  const targetDateStr = featured.kickoffDate ? `${featured.kickoffDate}T09:00:00+05:30` : "2026-08-31T09:00:00+05:30";
  const targetDate = new Date(targetDateStr).getTime();

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

// --- LIVE PLAYER AUCTION 3 PM COUNTDOWN CLOCK ---
export function initAuctionNoticeCountdown() {
  const hEl = document.getElementById('auc-cd-hrs');
  const mEl = document.getElementById('auc-cd-mins');
  const sEl = document.getElementById('auc-cd-secs');
  if (!hEl || !mEl || !sEl) return;

  const update = () => {
    const now = new Date();
    // Auction target: Today at 3:00 PM IST (15:00:00)
    let target = new Date();
    target.setHours(15, 0, 0, 0);

    // If today's 3 PM has passed by more than 6 hours, show next day 3 PM
    if (now.getTime() > target.getTime() && (now.getTime() - target.getTime() > 6 * 3600 * 1000)) {
      target.setDate(target.getDate() + 1);
    }

    const diff = target.getTime() - now.getTime();
    const liveBox = document.getElementById('auc-cd-box');

    if (diff <= 0) {
      if (liveBox) {
        liveBox.innerHTML = `
          <button id="live-auction-click-btn" class="px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg border border-red-400 flex items-center justify-center gap-1.5 uppercase tracking-wider animate-pulse cursor-pointer">
            <span>🔴 LIVE NOW - ENTER</span>
            <span class="text-base">➔</span>
          </button>
        `;
        document.getElementById('live-auction-click-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          navigate('auction');
        });
      }
      return;
    }

    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');
    if (hEl) hEl.textContent = pad(hrs);
    if (mEl) mEl.textContent = pad(mins);
    if (sEl) sEl.textContent = pad(secs);
  };

  update();
  if (window._auctionNoticeCountdownInterval) {
    clearInterval(window._auctionNoticeCountdownInterval);
  }
  window._auctionNoticeCountdownInterval = setInterval(update, 1000);
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

// --- TOURNAMENT HUB ---
function renderTournamentHub(containerEl) {
  const teams = store.getTeams();
  const players = store.getPlayers();
  const isRegOpen = store.isJslRegistrationOpen();
  const regSettings = store.getRegistrationSettings();

  containerEl.innerHTML = `
    <div class="space-y-3 sm:space-y-4 animate-fade-in max-w-4xl mx-auto py-1 sm:py-2">
      
      <!-- GRAND STADIUM POSTER STRIP (PURE WHITE BACKGROUND - POSTER PICTURE & CONTACT INFO) -->
      <div class="tournament-header-strip p-2 sm:p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-md space-y-2">

        <!-- POSTER PICTURE ON WHITE BACKGROUND (TOURNAMENT POSTER & RULES) -->
        <div class="overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm max-w-4xl mx-auto">
          <img src="assets/jsl_poster_top_rules.jpg" alt="Official Tournament Poster" class="w-full h-auto object-contain mx-auto rounded-xl" />
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
          <div id="tournament-hub-teams-count" class="absolute top-1.5 right-1.5 w-6 h-6 sm:w-8 sm:h-8 bg-sky-600 text-white text-xs sm:text-sm font-black rounded-full flex items-center justify-center border-2 border-white shadow-md z-10" title="Total Teams">
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
          <div id="tournament-hub-players-count" class="absolute top-1.5 right-1.5 w-6 h-6 sm:w-8 sm:h-8 bg-emerald-600 text-white text-xs sm:text-sm font-black rounded-full flex items-center justify-center border-2 border-white shadow-md z-10" title="Total Players">
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

      <!-- 📜 PREVIOUS AUCTION SUMMARY (CLEAN WHITE BACKGROUND) -->
      <div class="w-full bg-white border-2 border-slate-200 hover:border-amber-400 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-md text-slate-900 space-y-2.5 relative overflow-hidden animate-fade-in transition-all">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 bg-amber-100 text-amber-800 rounded-2xl text-lg border border-amber-300 flex items-center justify-center shrink-0 shadow-2xs font-black">
              📜
            </span>
            <div>
              <div class="text-[9.5px] sm:text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5 flex-wrap">
                <span>PREVIOUS AUCTION SUMMARY</span>
                <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8.5px] font-mono rounded-full border border-emerald-300 font-bold">🔒 5-YEAR ARCHIVE</span>
              </div>
              <h3 class="text-xs sm:text-base font-black text-slate-900 leading-tight mt-0.5">
                Final Auction Summary & Roster Archives
              </h3>
            </div>
          </div>
          <div class="text-right">
            <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] sm:text-xs rounded-xl border border-emerald-200 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Auction Completed
            </span>
          </div>
        </div>

        <p class="text-[11px] sm:text-xs text-slate-600 font-medium">
          All franchise squads, player sold values, icon player ⭐ allocations, and purse balances are permanently preserved in the Master Archive.
        </p>

        <div class="flex flex-wrap items-center gap-2 pt-0.5">
          <button id="open-auction-summary-modal-btn" class="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-300">
            <span>🏆 View Final Auction Summary</span>
          </button>
          <button id="download-all-squads-pdf-hub-btn" class="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl border border-emerald-500 shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
            <span>📄 All Squads PDF</span>
          </button>
          <button id="download-json-archive-hub-btn" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer" title="Download Master JSON Archive">
            <span>📥 JSON Backup</span>
          </button>
        </div>
      </div>

    </div>
  `;

  document.getElementById('open-teams-modal-btn')?.addEventListener('click', () => openRegisteredTeamsModal(teams));
  document.getElementById('open-players-modal-btn')?.addEventListener('click', () => openRegisteredPlayersModal(players));
  document.getElementById('open-auction-summary-modal-btn')?.addEventListener('click', openAuctionSummaryModal);
  document.getElementById('download-all-squads-pdf-hub-btn')?.addEventListener('click', () => exportAllTeamsFinalSquadsToPDF(teams, players));
  document.getElementById('download-json-archive-hub-btn')?.addEventListener('click', downloadAuctionArchiveJSON);
}

// --- HELPER: DOWNLOAD OFFICIAL JSON ARCHIVE RECORD (FOR 5+ YEARS PRESERVATION) ---
function downloadAuctionArchiveJSON() {
  const archive = store.getAuctionPermanentArchive();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(archive, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `Official_Auction_Archive.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// --- OFFICIAL FINAL AUCTION SUMMARY & 5-YEAR RECORD VAULT MODAL (VIBRANT COLORFUL WHITE THEME) ---
function openAuctionSummaryModal() {
  const archive = store.getAuctionPermanentArchive();
  const allPlayers = store.getPlayers();
  const teams = store.getTeams();
  let activeTab = 'overview'; // 'overview', 'teams', 'roster'
  let selectedTeamId = teams[0]?.id || '';

  const modalHtml = `
    <div id="auction-summary-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-2 sm:p-4 animate-fade-in bg-slate-950/70 backdrop-blur-sm">
      <div class="bg-white text-slate-900 max-w-4xl w-full max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border-2 border-amber-400 shadow-2xl overflow-hidden">
        
        <!-- MODAL HEADER (COLORFUL LIGHT AMBER GRADIENT) -->
        <div class="p-3 sm:p-4 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between gap-2 shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border border-amber-300 flex items-center justify-center text-xl shrink-0 shadow-md">
              🏆
            </span>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-950 border border-amber-300 shadow-2xs">
                  PERMANENT 5-YEAR RECORD
                </span>
                <span class="text-[9px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 font-bold">🔒 LOCKED & PRESERVED</span>
              </div>
              <h2 class="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                Official Final Auction Summary
              </h2>
            </div>
          </div>
          
          <button id="close-auction-summary-modal-btn" class="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-950 border border-slate-300 flex items-center justify-center text-sm font-black transition-all shadow-xs cursor-pointer">
            ✕
          </button>
        </div>

        <!-- NAVIGATION TABS & EXPORT BUTTONS BAR (CLEAN WHITE/SLATE STRIP) -->
        <div class="p-2 sm:p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div class="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button id="tab-btn-summary-overview" class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-slate-700 hover:bg-slate-100">
              📊 Overview & Top Buys
            </button>
            <button id="tab-btn-summary-teams" class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-slate-700 hover:bg-slate-100">
              🛡️ Team Squads (${teams.length})
            </button>
            <button id="tab-btn-summary-roster" class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-slate-700 hover:bg-slate-100">
              📋 All Players (${archive.totalRegisteredPlayers})
            </button>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            <button id="summary-download-pdf-btn" class="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer border border-emerald-400">
              <span>📄 All Squads PDF</span>
            </button>
            <button id="summary-download-json-btn" class="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer border border-amber-300" title="Download Master JSON Archive">
              <span>📥 JSON Archive</span>
            </button>
          </div>
        </div>

        <!-- MODAL BODY CONTAINER (WHITE BACKGROUND) -->
        <div id="auction-summary-tab-content" class="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-white">
          <!-- Content dynamically rendered below -->
        </div>

        <!-- MODAL FOOTER (CLEAN SLATE BAR) -->
        <div class="p-2.5 sm:p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600 shrink-0 font-bold">
          <span>🏛️ Official Archive Record Vault</span>
          <span>System Architect: Suman Kolay</span>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const renderTab = (tab) => {
    activeTab = tab;
    const content = document.getElementById('auction-summary-tab-content');
    if (!content) return;

    // Highlight active tab
    ['overview', 'teams', 'roster'].forEach(t => {
      const btn = document.getElementById(`tab-btn-summary-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'px-3 py-1.5 text-xs font-black rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-sm border border-amber-300';
        } else {
          btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-100 border border-transparent';
        }
      }
    });

    if (tab === 'overview') {
      content.innerHTML = `
        <div class="space-y-4 animate-fade-in">
          <!-- 4 VIBRANT COLORFUL STAT CARDS ON WHITE -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
            <!-- 1. Total Purse: Gold/Amber -->
            <div class="bg-gradient-to-b from-amber-50 to-amber-100/80 border-2 border-amber-300 p-3 rounded-2xl text-center shadow-xs">
              <span class="text-[9.5px] font-black text-amber-800 uppercase tracking-wider block">TOTAL PURSE</span>
              <span class="text-base sm:text-2xl font-black text-amber-950 font-mono mt-0.5 block">₹ ${archive.financials.totalTournamentPurse.toLocaleString('en-IN')}</span>
            </div>
            <!-- 2. Total Spent: Rose/Red -->
            <div class="bg-gradient-to-b from-rose-50 to-rose-100/80 border-2 border-rose-300 p-3 rounded-2xl text-center shadow-xs">
              <span class="text-[9.5px] font-black text-rose-800 uppercase tracking-wider block">TOTAL AUCTION SPENT</span>
              <span class="text-base sm:text-2xl font-black text-rose-700 font-mono mt-0.5 block">₹ ${archive.financials.totalTournamentSpent.toLocaleString('en-IN')}</span>
            </div>
            <!-- 3. Remaining Purse: Emerald/Green -->
            <div class="bg-gradient-to-b from-emerald-50 to-emerald-100/80 border-2 border-emerald-300 p-3 rounded-2xl text-center shadow-xs">
              <span class="text-[9.5px] font-black text-emerald-800 uppercase tracking-wider block">TOTAL REMAINING PURSE</span>
              <span class="text-base sm:text-2xl font-black text-emerald-700 font-mono mt-0.5 block">₹ ${archive.financials.totalRemainingPurse.toLocaleString('en-IN')}</span>
            </div>
            <!-- 4. Players Sold: Blue/Indigo -->
            <div class="bg-gradient-to-b from-blue-50 to-blue-100/80 border-2 border-blue-300 p-3 rounded-2xl text-center shadow-xs">
              <span class="text-[9.5px] font-black text-blue-800 uppercase tracking-wider block">SQUAD PLAYERS SOLD</span>
              <span class="text-base sm:text-2xl font-black text-blue-700 font-mono mt-0.5 block">${archive.totalSoldSquadPlayers} / ${archive.totalRegisteredPlayers}</span>
            </div>
          </div>

          <!-- TOP BUYS (COLORFUL WHITE CARDS) -->
          <div class="bg-slate-50/80 border-2 border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-3 shadow-xs">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 class="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🔥 Top Highest Buys of Auction</span>
              </h3>
              <span class="text-[10px] font-bold text-slate-500 font-mono bg-white px-2 py-0.5 rounded-full border border-slate-200">Top 8 Bids</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              ${archive.topBuys.map((p, idx) => `
                <div class="bg-white border-2 border-slate-200 hover:border-amber-400 p-2.5 rounded-2xl flex items-center justify-between gap-2.5 shadow-sm transition-all hover:shadow-md">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-7 h-7 rounded-xl ${idx === 0 ? 'bg-amber-400 text-slate-950 shadow-xs' : (idx === 1 ? 'bg-slate-200 text-slate-900' : (idx === 2 ? 'bg-amber-700 text-white' : 'bg-blue-100 text-blue-900 border border-blue-200'))} font-black text-xs flex items-center justify-center shrink-0 font-mono">
                      #${idx + 1}
                    </span>
                    <div class="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 shrink-0 border-2 border-slate-200 shadow-2xs">
                      <img src="${p.photoUrl || 'assets/card_jsl_user.png'}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs sm:text-sm font-black text-slate-900 truncate">${p.name}</div>
                      <div class="text-[10.5px] text-amber-800 font-extrabold truncate flex items-center gap-1">
                        <span>🛡️ ${p.teamName}</span>
                      </div>
                      <div class="text-[9.5px] text-slate-500 font-bold">🏏 ${p.category}</div>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-xs sm:text-base font-black text-emerald-700 font-mono leading-tight">₹ ${p.soldPrice.toLocaleString('en-IN')}</div>
                    <span class="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">FINAL BID</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'teams') {
      const currentTeam = archive.teams.find(t => t.teamId === selectedTeamId) || archive.teams[0];
      content.innerHTML = `
        <div class="space-y-3.5 animate-fade-in">
          <!-- COLORFUL TEAM SELECTOR CHIPS -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            ${archive.teams.map(t => `
              <button class="team-chip-btn px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${t.teamId === currentTeam.teamId ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-md border border-amber-300' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}" data-team-id="${t.teamId}">
                ${t.teamName}
              </button>
            `).join('')}
          </div>

          <!-- SELECTED TEAM HEADER BANNER (COLORFUL DEEP NAVY / GOLD) -->
          <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-2 border-amber-400 p-3.5 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-white shadow-md">
            <div>
              <div class="text-[9px] font-black text-amber-300 uppercase tracking-wider">FRANCHISE ROSTER</div>
              <h3 class="text-base sm:text-lg font-black text-white leading-tight">${currentTeam.teamName}</h3>
              <div class="text-xs text-amber-300 font-bold mt-0.5">👑 Owner: <span class="text-white">${currentTeam.ownerName}</span> ${currentTeam.ownerPhone !== 'N/A' ? `<span class="text-slate-300 text-[10px]">(📞 ${currentTeam.ownerPhone})</span>` : ''}</div>
            </div>
            <div class="flex items-center gap-2.5">
              <div class="text-right bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <div class="text-xs sm:text-sm font-black text-emerald-400 font-mono">₹ ${currentTeam.remainingPurse.toLocaleString('en-IN')} Left</div>
                <div class="text-[9px] text-slate-300">Spent: ₹ ${currentTeam.totalSpent.toLocaleString('en-IN')}</div>
              </div>
              <button id="download-selected-team-pdf-btn" class="px-3 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-sm">
                <span>📄 PDF</span>
              </button>
            </div>
          </div>

          <!-- SQUAD PLAYERS GRID (WHITE BACKGROUND CARDS) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <!-- Icon Player (Golden Highlight on White) -->
            ${currentTeam.iconPlayer ? `
              <div class="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-400 flex items-center justify-between gap-2.5 shadow-sm">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-11 h-11 rounded-xl overflow-hidden bg-white border-2 border-amber-400 shrink-0 shadow-xs">
                    <img src="${currentTeam.iconPlayer.photoUrl || 'assets/card_jsl_user.png'}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1">
                      <span>⭐ ${currentTeam.iconPlayer.name}</span>
                      <span class="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black text-[8px] rounded">ICON</span>
                    </div>
                    <div class="text-[10px] text-amber-800 font-bold">📞 ${currentTeam.iconPlayer.phone} • 📍 ${currentTeam.iconPlayer.village}</div>
                    <div class="text-[9px] text-amber-700">🏏 ${currentTeam.iconPlayer.category}</div>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-xs sm:text-sm font-black text-amber-900 font-mono">₹ 1,000</div>
                  <div class="text-[8px] text-amber-700 font-bold uppercase">Icon Fee</div>
                </div>
              </div>
            ` : ''}

            <!-- Auctioned Players (Clean White Cards) -->
            ${currentTeam.auctionedPlayers.map(p => `
              <div class="p-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 flex items-center justify-between gap-2.5 shadow-xs transition-all">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                    <img src="${p.photoUrl || 'assets/card_jsl_user.png'}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs sm:text-sm font-black text-slate-900 truncate">#${p.slNo} ${p.name}</div>
                    <div class="text-[10px] text-blue-700 font-bold truncate">🏏 ${p.category}</div>
                    <div class="text-[9.5px] text-slate-500 truncate">📞 ${p.phone} • 📍 ${p.village}</div>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-xs sm:text-sm font-black text-emerald-700 font-mono">₹ ${p.soldPrice.toLocaleString('en-IN')}</div>
                  <div class="text-[8px] text-slate-400 font-bold uppercase">Auction Sold</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // Team chip listeners
      content.querySelectorAll('.team-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedTeamId = btn.getAttribute('data-team-id');
          renderTab('teams');
        });
      });

      document.getElementById('download-selected-team-pdf-btn')?.addEventListener('click', () => {
        const tObj = teams.find(t => t.id === currentTeam.teamId) || currentTeam;
        exportTeamFinalSquadToPDF(tObj, allPlayers);
      });
    } else if (tab === 'roster') {
      content.innerHTML = `
        <div class="space-y-3 animate-fade-in">
          <div class="flex items-center justify-between gap-2">
            <input type="text" id="archive-roster-search" placeholder="🔍 Search by player name, team, or village..." class="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 font-medium" />
          </div>

          <div class="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-xs">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900 text-white font-black text-[10px] uppercase border-b border-slate-300">
                <tr>
                  <th class="p-2.5">Player</th>
                  <th class="p-2.5">Role</th>
                  <th class="p-2.5">Assigned Team</th>
                  <th class="p-2.5">Village</th>
                  <th class="p-2.5 text-right">Sold Price</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 text-[11px] bg-white" id="archive-roster-tbody">
                ${archive.masterPlayerRoster.map(p => `
                  <tr class="hover:bg-amber-50/60 transition-colors">
                    <td class="p-2.5 flex items-center gap-2">
                      <div class="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        <img src="${p.photoUrl || 'assets/card_jsl_user.png'}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
                      </div>
                      <div>
                        <div class="font-bold text-slate-900">${p.name}</div>
                        <div class="text-[9.5px] text-slate-500 font-mono">${p.displayRegistrationNumber}</div>
                      </div>
                    </td>
                    <td class="p-2.5 text-slate-700 font-bold">${p.category}</td>
                    <td class="p-2.5">
                      ${p.teamName ? `<span class="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-black rounded-md text-[10px]">${p.teamName}</span>` : `<span class="text-slate-400">Unassigned</span>`}
                    </td>
                    <td class="p-2.5 text-slate-600">${p.village}</td>
                    <td class="p-2.5 text-right font-mono font-black ${p.soldPrice ? 'text-emerald-700' : 'text-slate-400'}">
                      ${p.soldPrice ? `₹ ${Number(p.soldPrice).toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Live search filter
      document.getElementById('archive-roster-search')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const rows = archive.masterPlayerRoster.filter(p => 
          p.name.toLowerCase().includes(q) || 
          (p.teamName && p.teamName.toLowerCase().includes(q)) || 
          (p.village && p.village.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
        );
        const tbody = document.getElementById('archive-roster-tbody');
        if (tbody) {
          tbody.innerHTML = rows.map(p => `
            <tr class="hover:bg-amber-50/60 transition-colors">
              <td class="p-2.5 flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  <img src="${p.photoUrl || 'assets/card_jsl_user.png'}" class="w-full h-full object-cover" onerror="this.src='assets/card_jsl_user.png'" />
                </div>
                <div>
                  <div class="font-bold text-slate-900">${p.name}</div>
                  <div class="text-[9.5px] text-slate-500 font-mono">${p.displayRegistrationNumber}</div>
                </div>
              </td>
              <td class="p-2.5 text-slate-700 font-bold">${p.category}</td>
              <td class="p-2.5">
                ${p.teamName ? `<span class="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-black rounded-md text-[10px]">${p.teamName}</span>` : `<span class="text-slate-400">Unassigned</span>`}
              </td>
              <td class="p-2.5 text-slate-600">${p.village}</td>
              <td class="p-2.5 text-right font-mono font-black ${p.soldPrice ? 'text-emerald-700' : 'text-slate-400'}">
                ${p.soldPrice ? `₹ ${Number(p.soldPrice).toLocaleString('en-IN')}` : '—'}
              </td>
            </tr>
          `).join('');
        }
      });
    }
  };

  // Close handlers
  const handleClose = () => {
    document.getElementById('auction-summary-modal')?.remove();
  };

  document.getElementById('close-auction-summary-modal-btn')?.addEventListener('click', handleClose);
  document.getElementById('auction-summary-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'auction-summary-modal') handleClose();
  });

  // Tab switch listeners
  document.getElementById('tab-btn-summary-overview')?.addEventListener('click', () => renderTab('overview'));
  document.getElementById('tab-btn-summary-teams')?.addEventListener('click', () => renderTab('teams'));
  document.getElementById('tab-btn-summary-roster')?.addEventListener('click', () => renderTab('roster'));

  // Export handlers
  document.getElementById('summary-download-pdf-btn')?.addEventListener('click', () => {
    exportAllTeamsFinalSquadsToPDF(teams, allPlayers);
  });
  document.getElementById('summary-download-json-btn')?.addEventListener('click', () => {
    downloadAuctionArchiveJSON();
  });

  // Initial render
  renderTab('overview');
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

            const squadCount = store.getPlayers().filter(p => (p.teamId === t.id || (p.teamName && p.teamName.trim().toLowerCase() === t.name.trim().toLowerCase())) && (p.isIcon || p.isIconPlayer || p.auctionStatus === 'SOLD' || p.isSold === true || !!p.teamId)).length;

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
            <span class="px-2 py-0.5 bg-sky-100 text-sky-800 text-[9px] font-black rounded-full border border-sky-300 uppercase font-mono">TOURNAMENT</span>
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
            <span class="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded border border-amber-300 uppercase">TOURNAMENT</span>
            <h2 class="text-base font-black text-slate-900 mt-0.5">Registered Player List <span id="player-count-display">(${allPlayers.length})</span></h2>
          </div>
        </div>

        <div class="space-y-2">
          <div class="relative">
            <input type="text" id="player-search-input" placeholder="🔍 Search player by name, Reg ID, phone, village..." class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 pl-3 focus:outline-none focus:border-emerald-500 placeholder-slate-400" />
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
      const category = (p.category || p.role || p.playingType || '').toLowerCase();
      const phone = (p.phone || p.mobile || '').toLowerCase();
      const cleanPhone = (p.phone || p.mobile || '').replace(/[^0-9]/g, '');
      const cleanQueryPhone = query.replace(/[^0-9]/g, '');
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
             (cleanQueryPhone && cleanPhone.includes(cleanQueryPhone)) ||
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
    const trueSerial = p.displayRegistrationNumber || p.serialNo || (idx + 1);
    const shortSerialNo = String(trueSerial).padStart(2, '0');
    const photoSrc = getOptimizedImageUrl(p.photoUrl || p.player_photo_url || '', 280, 280);

    return `
      <div class="cpl-white-card p-2.5 flex flex-col justify-between items-center text-center relative border border-slate-200 bg-white hover:border-emerald-400 shadow-sm hover:shadow-md rounded-2xl overflow-hidden transition-all">
        
        <!-- LARGE SQUARE PICTURE CONTAINER WITH TOP-LEFT SHORT SERIAL & TOP-RIGHT BLINKING STATUS DOT -->
        <div class="w-full aspect-square rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-xs relative mb-1.5 mx-auto">
          
          <!-- PLAYER PHOTO WITH LAZY LOADING & ASYNC DECODING -->
          <img src="${photoSrc}" loading="lazy" decoding="async" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23059669\'/%3E%3Ctext x=\'50\' y=\'62\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E🏏%3C/text%3E%3C/svg%3E';" />

          <!-- SHORT SERIAL NO ON PICTURE TOP-LEFT (E.G. #01, #02) -->
          <span class="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-900/90 backdrop-blur-sm text-amber-300 font-mono font-black text-[10px] rounded-md border border-amber-400/60 shadow-sm">
            #${shortSerialNo}
          </span>

          <!-- BLINKING GREEN OR RED STATUS CIRCLE ON PICTURE TOP-RIGHT -->
          <div class="absolute top-1.5 right-1.5 flex h-3.5 w-3.5" title="${isApproved ? 'Approved Player' : 'Pending Player'}">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-red-400'} opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3.5 w-3.5 ${isApproved ? 'bg-emerald-500' : 'bg-red-500'} border-2 border-white shadow-md"></span>
          </div>

        </div>

        <!-- PLAYER NAME & COLORFUL CATEGORY BADGE -->
        <div class="w-full mb-2 px-0.5 space-y-1">
          <h3 class="font-black text-slate-900 text-xs sm:text-sm truncate leading-tight">${p.name}</h3>
          <span class="inline-block px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
            p.category === 'Batsman' ? 'bg-sky-50 text-sky-700 border border-sky-300' :
            p.category === 'Bowler' ? 'bg-purple-50 text-purple-700 border border-purple-300' :
            p.category === 'Wicket Keeper' ? 'bg-amber-50 text-amber-800 border border-amber-300' :
            'bg-emerald-50 text-emerald-700 border border-emerald-300'
          }">
            ${p.category || 'All Rounder'}
          </span>
        </div>

        <!-- VIEW PROFILE BUTTON -->
        <button data-profile-id="${p.id}" class="view-profile-modal-btn w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[9px] sm:text-[10px] font-black rounded-xl shadow-xs flex items-center justify-center gap-1 transition-colors cursor-pointer">
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
            ${player.registrationId || player.regNo || 'REG-0001'} (Serial #${player.displayRegistrationNumber || player.serialNo || 1})
          </span>
          <h2 class="text-lg sm:text-xl font-black text-slate-900 leading-tight mt-1">${player.name}</h2>
          <div class="inline-block px-3 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full border border-emerald-300">
            ${player.category || player.playingType || 'All Rounder'}
          </div>
        </div>

        <!-- DETAILED PROFILE INFORMATION GRID -->
        <div class="grid grid-cols-2 gap-2 text-left bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-semibold">
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
            <span class="font-extrabold text-emerald-700 font-mono block">
              📞 ${(() => {
                const isPrivileged = store.isAdminAuthenticated ? store.isAdminAuthenticated() : false;
                const pPhone = (player.phone || player.mobile || '').replace(/[^0-9]/g, '');
                if (!pPhone) return 'N/A';
                if (isPrivileged) return pPhone;
                return '*******' + pPhone.slice(-2);
              })()}
            </span>
          </div>

          <div class="space-y-0.5">
            <span class="text-[8px] text-slate-500 uppercase font-bold block">Registration Time</span>
            <span class="font-bold text-slate-700 font-mono text-[11px] block">
              🕒 ${(() => {
                const d = player.created_at ? new Date(player.created_at) : (player.regDate ? new Date(player.regDate) : new Date());
                return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              })()}
            </span>
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

  document.getElementById('print-pass-btn')?.addEventListener('click', () => {
    printDigitalPass(player, store.getLeagueById(player.leagueId || store.activeTournamentId), store.getTeamById(player.teamId));
  });
}

// --- SUPABASE PHONE OTP AUTH ---

// --- UNIVERSAL PHONE OTP VERIFICATION MODAL WITH SUPABASE SMS DELIVERY ---
export function openPhoneOtpModal({ title = 'Mobile Number Verification', subtitle = 'Verify your 10-digit mobile number via SMS OTP', prefilledPhone = '', onSuccess }) {
  document.getElementById('phone-otp-modal')?.remove();

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
      const otpResult = await sendPhoneOtp(fullPhoneNumber);
      if (otpResult.error) throw otpResult.error;
      console.log("Supabase SMS OTP sent to:", fullPhoneNumber);

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
      alert(`⚠️ SMS Delivery Notice:\n\n${err.message || 'Unable to send SMS code'}\n\n(Ensure Phone provider is enabled in Supabase Auth settings).`);
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
      const verifyResult = await verifyPhoneOtp(`+91${currentPhone}`, entered);
      if (verifyResult.error) throw verifyResult.error;
      console.log("Phone OTP verified successfully via Supabase");

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

// --- REGISTRATION CLOSED MODAL (WHEN DEACTIVATED BY MASTER ADMIN) ---
function openRegistrationClosedModal() {
  document.getElementById('reg-closed-backdrop')?.remove();
  const regSettings = store.getRegistrationSettings();
  const message = regSettings.closedReason || "Registration is currently closed by the Admin.";

  const modalHtml = `
    <div id="reg-closed-backdrop" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-3">
      <div class="bg-white max-w-sm sm:max-w-md w-full p-5 sm:p-6 relative space-y-4 animate-fade-in rounded-2xl shadow-2xl border-2 border-red-500 text-center modal-content-container">
        <button id="close-reg-closed-btn" class="absolute top-3 right-3 text-slate-400 hover:text-slate-900 p-1 cursor-pointer">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner border border-red-200">
          <i data-lucide="lock" class="w-7 h-7"></i>
        </div>

        <div class="space-y-1">
          <span class="px-3 py-1 bg-red-100 text-red-800 font-black text-[10px] rounded-full uppercase border border-red-300">REGISTRATION DEACTIVATED</span>
          <h2 class="text-lg sm:text-xl font-black text-slate-900 mt-1">Registration is Closed</h2>
          <p class="text-xs font-semibold text-slate-600 leading-relaxed pt-1">${message}</p>
        </div>

        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1.5 text-xs text-slate-700">
          <div class="font-bold text-slate-900 flex items-center gap-1.5">
            <i data-lucide="info" class="w-4 h-4 text-sky-600"></i> Need Help / Tournament Queries?
          </div>
          <div class="text-[11px] text-slate-600">Contact Tournament Management: <strong>Pintu Santra (89722144166)</strong> or check the live auction hub.</div>
        </div>

        <div class="grid grid-cols-2 gap-2.5 pt-1">
          <button id="view-teams-from-closed-btn" class="py-2.5 px-3 bg-sky-900 hover:bg-sky-800 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1 cursor-pointer">
            <i data-lucide="shield" class="w-3.5 h-3.5 text-sky-400"></i> View Teams
          </button>
          <button id="view-players-from-closed-btn" class="py-2.5 px-3 bg-emerald-900 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1 cursor-pointer">
            <i data-lucide="users" class="w-3.5 h-3.5 text-emerald-400"></i> View Players
          </button>
        </div>

        <button id="ok-reg-closed-btn" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow transition-all cursor-pointer">
          Close Window
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('reg-closed-backdrop')?.remove();
  document.getElementById('close-reg-closed-btn')?.addEventListener('click', removeModal);
  document.getElementById('ok-reg-closed-btn')?.addEventListener('click', removeModal);

  document.getElementById('view-teams-from-closed-btn')?.addEventListener('click', () => {
    removeModal();
    openRegisteredTeamsModal(store.getTeams());
  });

  document.getElementById('view-players-from-closed-btn')?.addEventListener('click', () => {
    removeModal();
    openRegisteredPlayersModal(store.getPlayers());
  });
}

// --- REGISTRATION TYPE SELECTION MODAL ---
function openRegistrationTypeModal() {
  if (!store.isJslRegistrationOpen()) {
    openRegistrationClosedModal();
    return;
  }

  const isTeamOpen = store.isTeamRegistrationOpen();
  const isPlayerOpen = store.isPlayerRegistrationOpen();

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
          <button id="select-team-reg-btn" class="p-4 rounded-2xl ${isTeamOpen ? 'bg-gradient-to-r from-blue-600 to-sky-700 hover:from-blue-500 hover:to-sky-600 cursor-pointer' : 'bg-slate-700 opacity-60 cursor-not-allowed'} text-white font-black flex items-center justify-between shadow-lg border border-sky-400 transition-all">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <i data-lucide="${isTeamOpen ? 'shield' : 'lock'}" class="w-5 h-5 text-amber-300"></i>
              </div>
              <div class="text-left">
                <div class="text-base sm:text-lg font-black leading-snug">Team Register ${!isTeamOpen ? '(Closed)' : ''}</div>
                <div class="text-xs font-semibold text-sky-100">15K (8K Auction + 7K Fee)</div>
              </div>
            </div>
            <i data-lucide="chevron-right" class="w-5 h-5"></i>
          </button>

          <!-- PLAYER REGISTER BUTTON -->
          <button id="select-player-reg-btn" class="p-4 rounded-2xl ${isPlayerOpen ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 cursor-pointer' : 'bg-slate-700 opacity-60 cursor-not-allowed'} text-white font-black flex items-center justify-between shadow-lg border border-emerald-400 transition-all">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <i data-lucide="${isPlayerOpen ? 'user-plus' : 'lock'}" class="w-5 h-5 text-white"></i>
              </div>
              <div class="text-left">
                <div class="text-base sm:text-lg font-black leading-snug">Player Register ${!isPlayerOpen ? '(Closed)' : ''}</div>
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
    if (!store.isTeamRegistrationOpen()) {
      removeModal();
      openRegistrationClosedModal();
      return;
    }
    removeModal();
    openTeamRegisterFormModal();
  });

  document.getElementById('select-player-reg-btn')?.addEventListener('click', () => {
    if (!store.isPlayerRegistrationOpen()) {
      removeModal();
      openRegistrationClosedModal();
      return;
    }
    removeModal();
    openPlayerRegisterFormModal();
  });
}

// --- TEAM REGISTER FORM MODAL ---
function openTeamRegisterFormModal(initialData = null, verifiedPhone = null) {
  if (!store.isTeamRegistrationOpen()) {
    openRegistrationClosedModal();
    return;
  }
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
            <input type="text" id="team-name" required placeholder="e.g. Thunder Strikers XI" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2 focus:outline-none focus:border-sky-500" />
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
        leagueId: store.activeTournamentId || 'default',
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
  if (!store.isPlayerRegistrationOpen()) {
    openRegistrationClosedModal();
    return;
  }
  const upiId = "pintusantra4166@nyes";
  const payeeName = "Pintu Santra";
  const amount = 200;
  const note = "PlayerReg";

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
              <input type="text" id="ply-village" required placeholder="e.g. Mumbai" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:outline-none focus:border-emerald-500" />
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

let activeFixtureCategory = sessionStorage.getItem('cpl_active_fixture_cat') || 'T';
let activeFixtureSubTab = sessionStorage.getItem('cpl_active_fixture_subtab') || 'matches'; // 'matches' or 'table'
let activeFixtureGroupFilter = sessionStorage.getItem('cpl_active_fixture_grp_filter') || 'ALL'; // 'ALL', 'A', 'B', 'C', 'D', 'KNOCKOUT'

function renderFixturesView(container) {
  const computeTeamStandings = (teamList, categoryFixtures) => {
    const standings = teamList.map(t => {
      const teamId = t.id;
      const teamFixtures = categoryFixtures.filter(f => f.status === 'COMPLETED' && (f.teamAId === teamId || f.teamBId === teamId));
      
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
        id: t.id,
        name: t.name,
        group: (t.group || 'A').toUpperCase(),
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

    return standings;
  };

  // Compact standings TABLE that fits a phone in one screen: tight columns, and the
  // team-name font shrinks as the name gets longer so all of P/W/L/PTS/NRR stay visible
  // without horizontal scroll. `accent` is a Tailwind colour family for the group.
  const standingsTableHtml = (list, qualifyCount, accent) => {
    const rowHtml = list.map((t, idx) => {
      const teamObj = store.getTeamById(t.id);
      const logo = teamObj?.logoUrl || teamObj?.teamLogoUrl || 'assets/card_jsl_user.png';
      const qualified = idx < qualifyCount;
      const nrrNum = parseFloat(t.nrr);
      const nrrStr = (nrrNum > 0 ? '+' : '') + t.nrr;
      const nrrCls = nrrNum >= 0 ? 'text-emerald-600' : 'text-rose-500';
      const rankCls = idx === 0
        ? 'bg-amber-400 text-slate-950'
        : (qualified ? `bg-${accent}-600 text-white` : 'bg-slate-100 text-slate-500 border border-slate-200');
      // Longer names -> smaller font so the row never pushes the number columns off-screen.
      const n = (t.name || '').length;
      const nameFont = n > 26 ? 'text-[8px]' : n > 20 ? 'text-[9px]' : n > 15 ? 'text-[10px]' : 'text-[11px]';
      return `
        <tr class="${qualified ? `bg-${accent}-50/50` : 'bg-white'} border-b border-slate-100 last:border-0">
          <td class="py-2 px-1.5 text-center"><span class="inline-flex w-5 h-5 rounded-md items-center justify-center text-[9px] font-black ${rankCls}">${idx + 1}</span></td>
          <td class="py-2 px-1 max-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <img src="${logo}" class="w-6 h-6 rounded-md object-cover border border-slate-200 bg-slate-50 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
              <span class="${nameFont} font-black text-slate-900 tracking-tight leading-[1.05] uppercase break-words line-clamp-2 min-w-0">${t.name}</span>
              ${qualified ? `<span class="shrink-0 px-1 py-0.5 text-[7px] leading-none bg-${accent}-600 text-white rounded font-black" title="Qualifies">Q</span>` : ''}
            </div>
          </td>
          <td class="py-2 px-1 text-center text-[11px] font-mono font-bold text-slate-600">${t.played}</td>
          <td class="py-2 px-1 text-center text-[11px] font-mono font-black text-emerald-600">${t.won}</td>
          <td class="py-2 px-1 text-center text-[11px] font-mono font-bold text-rose-500">${t.lost}</td>
          <td class="py-2 px-1 text-center"><span class="inline-block px-1.5 py-0.5 bg-blue-600 text-white rounded font-black text-[11px] font-mono">${t.points}</span></td>
          <td class="py-2 pl-1 pr-2 text-right text-[11px] font-mono font-black ${nrrCls} whitespace-nowrap">${nrrStr}</td>
        </tr>`;
    }).join('');
    return `
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full table-fixed">
            <colgroup><col class="w-7"/><col/><col class="w-6"/><col class="w-6"/><col class="w-6"/><col class="w-9"/><col class="w-11"/></colgroup>
            <thead class="bg-gradient-to-r from-slate-900 to-slate-800 text-white text-[9px] font-black uppercase tracking-wider">
              <tr>
                <th class="py-2.5 px-1.5 text-center">#</th>
                <th class="py-2.5 px-1 text-left">Franchise Team</th>
                <th class="py-2.5 px-1 text-center text-slate-200" title="Played">P</th>
                <th class="py-2.5 px-1 text-center text-emerald-400" title="Won">W</th>
                <th class="py-2.5 px-1 text-center text-rose-400" title="Lost">L</th>
                <th class="py-2.5 px-1 text-center text-amber-400" title="Points">PTS</th>
                <th class="py-2.5 pl-1 pr-2 text-right text-sky-300" title="Net Run Rate">NRR</th>
              </tr>
            </thead>
            <tbody>${rowHtml || `<tr><td colspan="7" class="py-4 text-center text-[11px] font-bold text-slate-400">No teams yet.</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  };

  // Full "every player" leaderboard for a clicked award card. Reads the cache the
  // Awards tab stashed on window.__cplAwardsCache when it last rendered.
  const openTournamentAwardModal = (key) => {
    const cache = window.__cplAwardsCache;
    if (!cache) return;
    const { category, rows, standings } = cache;

    // Per-award title/icon + which discipline table to draw.
    const META = {
      runs:      { icon:'🏏', title:'Best Batsman',      metric:'Most Runs',        accent:'emerald', group:'bat' },
      fours:     { icon:'🏸', title:'Four Hitter',       metric:'Most Fours',       accent:'cyan',    group:'bat' },
      sixes:     { icon:'💥', title:'Six Hitter',        metric:'Most Sixes',       accent:'amber',   group:'bat' },
      wickets:   { icon:'🎯', title:'Best Bowler',       metric:'Most Wickets',     accent:'rose',    group:'bowl' },
      maidens:   { icon:'🛡️', title:'Best Maiden Overs', metric:'Most Maidens',     accent:'slate',   group:'bowl' },
      stumpings: { icon:'🧤', title:'Best Wicketkeeper',  metric:'Most Stumpings',   accent:'violet',  group:'keep' },
      fielding:  { icon:'🤾', title:'Best Fielder',       metric:'Catches + Run-outs',accent:'sky',    group:'field' },
      mvp:       { icon:'⭐', title:'Tournament MVP',      metric:'Weighted Composite',accent:'fuchsia',group:'mvp' },
      team:      { icon:'🏆', title:'Best Team',          metric:'Wins + NRR',       accent:'amber',   group:'team' },
    };
    const m = META[key] || META.mvp;
    const sr = (r) => r.balls > 0 ? (r.runs / r.balls * 100).toFixed(1) : '0.0';
    const ov = (r) => (r.ballsBowled / 6).toFixed(1);
    const econ = (r) => r.ballsBowled > 0 ? (r.runsConceded / (r.ballsBowled / 6)).toFixed(2) : '0.00';

    // Column set per discipline: {label, val(row), key? (highlight when === sortKey)}
    const COLS = {
      bat:   [ {l:'Runs',v:r=>r.runs,k:'runs'}, {l:'Balls',v:r=>r.balls}, {l:'4s',v:r=>r.fours,k:'fours'}, {l:'6s',v:r=>r.sixes,k:'sixes'}, {l:'SR',v:sr} ],
      bowl:  [ {l:'Wkts',v:r=>r.wickets,k:'wickets'}, {l:'Overs',v:ov}, {l:'Runs',v:r=>r.runsConceded}, {l:'Econ',v:econ}, {l:'Mdns',v:r=>r.maidens,k:'maidens'} ],
      keep:  [ {l:'Stump',v:r=>r.stumpings,k:'stumpings'}, {l:'Catches',v:r=>r.catches} ],
      field: [ {l:'Catches',v:r=>r.catches}, {l:'Run-outs',v:r=>r.runOuts}, {l:'Total',v:r=>r.fielding,k:'fielding'} ],
      mvp:   [ {l:'MVP',v:r=>r.mvp,k:'mvp'}, {l:'Runs',v:r=>r.runs}, {l:'Wkts',v:r=>r.wickets}, {l:'Fld',v:r=>r.fielding} ],
    };

    let headerCols, bodyRows;
    if (m.group === 'team') {
      headerCols = [ {l:'P'}, {l:'W'}, {l:'L'}, {l:'Pts',k:1}, {l:'NRR'} ];
      const played = (standings || []).filter(t => t.played > 0);
      bodyRows = played.map((t, i) => {
        const cells = [t.played, t.won, t.lost, `<span class="font-black text-amber-600">${t.points}</span>`, t.nrr];
        return { rank:i+1, name:t.name, sub:`Group ${t.group}`, cells };
      });
    } else {
      const cols = COLS[m.group];
      headerCols = cols.map(c => ({ l:c.l, k: c.k === key }));
      // Everyone who has activity in this discipline, ranked by the award metric.
      const include = (r) => m.group === 'mvp' ? (r.balls > 0 || r.ballsBowled > 0 || r.catches > 0 || r.stumpings > 0 || r.runOuts > 0)
        : m.group === 'bat' ? (r.balls > 0 || r.runs > 0)
        : m.group === 'bowl' ? (r.ballsBowled > 0 || r.wickets > 0)
        : m.group === 'keep' ? (r.stumpings > 0 || r.catches > 0)
        : (r.fielding > 0);
      const list = (rows || []).filter(include).sort((a, b) => (b[key]||0) - (a[key]||0) || (b.mvp||0) - (a.mvp||0));
      bodyRows = list.map((r, i) => ({
        rank: i+1, name: r.name, sub: r.team || '—',
        cells: cols.map(c => c.k === key ? `<span class="font-black text-${m.accent}-600">${c.v(r)}</span>` : c.v(r))
      }));
    }

    const bodyHtml = bodyRows.length ? bodyRows.map(br => `
      <tr class="${br.rank === 1 ? `bg-${m.accent}-50/60` : 'hover:bg-slate-50'} border-b border-slate-100">
        <td class="py-2 px-2 text-center">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${br.rank===1?`bg-${m.accent}-600 text-white`:br.rank<=3?`bg-${m.accent}-100 text-${m.accent}-700`:'bg-slate-100 text-slate-500'}">${br.rank}</span>
        </td>
        <td class="py-2 px-2 min-w-0">
          <div class="text-xs font-black text-slate-900 truncate">${br.rank===1?'👑 ':''}${br.name}</div>
          <div class="text-[10px] font-bold text-slate-400 truncate">${br.sub}</div>
        </td>
        ${br.cells.map(c => `<td class="py-2 px-2 text-center text-xs font-bold text-slate-700 whitespace-nowrap">${c}</td>`).join('')}
      </tr>`).join('') : `
      <tr><td colspan="${headerCols.length + 2}" class="py-8 text-center text-xs font-bold text-slate-400">No players recorded for this award yet.</td></tr>`;

    document.getElementById('tournament-award-modal')?.remove();
    const modalHtml = `
      <div id="tournament-award-modal" class="fixed inset-0 z-[70] modal-overlay flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-md animate-fade-in">
        <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden">
          <div class="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-10 h-10 rounded-2xl bg-${m.accent}-50 border border-${m.accent}-100 flex items-center justify-center text-xl shrink-0">${m.icon}</span>
              <div class="min-w-0">
                <div class="text-[9px] font-black uppercase tracking-wider text-${m.accent}-600">${category} · ${m.metric}</div>
                <h3 class="text-base font-black text-slate-900 leading-tight truncate">${m.title}</h3>
              </div>
            </div>
            <button id="close-award-modal" class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shrink-0"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <div class="overflow-auto">
            <table class="w-full border-collapse">
              <thead class="sticky top-0 bg-slate-50 z-10">
                <tr class="border-b border-slate-200">
                  <th class="py-2.5 px-2 text-[9px] font-black uppercase tracking-wider text-slate-500 text-center w-10">#</th>
                  <th class="py-2.5 px-2 text-[9px] font-black uppercase tracking-wider text-slate-500 text-left">Player</th>
                  ${headerCols.map(h => `<th class="py-2.5 px-2 text-[9px] font-black uppercase tracking-wider text-center ${h.k?`text-${m.accent}-600`:'text-slate-500'} whitespace-nowrap">${h.l}</th>`).join('')}
                </tr>
              </thead>
              <tbody>${bodyHtml}</tbody>
            </table>
          </div>
          <div class="p-3 border-t border-slate-100 text-center">
            <span class="text-[10px] font-bold text-slate-400">${bodyRows.length} ${m.group==='team'?'team':'player'}${bodyRows.length!==1?'s':''} · sorted by ${m.metric.toLowerCase()}</span>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) window.lucide.createIcons();
    const modal = document.getElementById('tournament-award-modal');
    const close = () => modal?.remove();
    document.getElementById('close-award-modal')?.addEventListener('click', close);
    modal?.addEventListener('click', (e) => { if (e.target === modal) close(); });
  };
  window.openTournamentAwardModal = openTournamentAwardModal;

  const drawFixtures = () => {
    const selectedCategory = activeFixtureCategory || 'T';
    const rawFixtures = store.getFixtures().filter(f => (f.leagueCode || 'T').toUpperCase() === selectedCategory.toUpperCase());
    
    // Apply Match Group Filter
    let filteredFixtures = rawFixtures;
    if (activeFixtureGroupFilter === 'A') {
      filteredFixtures = rawFixtures.filter(f => f.stage === 'GROUP_A' || f.groupCode === 'A');
    } else if (activeFixtureGroupFilter === 'B') {
      filteredFixtures = rawFixtures.filter(f => f.stage === 'GROUP_B' || f.groupCode === 'B');
    } else if (activeFixtureGroupFilter === 'C') {
      filteredFixtures = rawFixtures.filter(f => f.stage === 'GROUP_C' || f.groupCode === 'C');
    } else if (activeFixtureGroupFilter === 'D') {
      filteredFixtures = rawFixtures.filter(f => f.stage === 'GROUP_D' || f.groupCode === 'D');
    } else if (activeFixtureGroupFilter === 'KNOCKOUT') {
      filteredFixtures = rawFixtures.filter(f => f.stage === 'SEMI_FINAL_1' || f.stage === 'SEMI_FINAL_2' || f.stage === 'FINAL' || f.stage === 'QUARTER_FINAL');
    }

    const liveMatches = filteredFixtures.filter(f => f.status === 'LIVE');
    const scheduledMatches = filteredFixtures.filter(f => f.status === 'SCHEDULED' || (!f.status && !f.result));
    const completedMatches = filteredFixtures.filter(f => f.status === 'COMPLETED' || f.result);

    // Filter teams strictly by selected tournament category
    const leagueTeams = store.getTeams().filter(t => {
      const code = (t.leagueCode || (t.leagueId === 'leg-jsl' ? 'JSL' : (t.leagueId === 'leg-jpl' ? 'JPL' : (t.leagueId === 'leg-kpl' ? 'KPL' : 'T'))));
      return code.toUpperCase() === selectedCategory.toUpperCase();
    });

    const format = store.getTournamentFormat(selectedCategory);
    const isMultiGroup = format.format === 'TWO_GROUPS' || format.format === 'FOUR_GROUPS';

    let mainContentHtml = '';

    if (activeFixtureSubTab === 'matches') {
      mainContentHtml = `
        <!-- MATCH STAGE & GROUP FILTER PILLS -->
        ${isMultiGroup ? `
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs">
            <button class="match-grp-filter-btn px-3 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer ${activeFixtureGroupFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}" data-grp="ALL">
              All Matches (${rawFixtures.length})
            </button>
            <button class="match-grp-filter-btn px-3 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer ${activeFixtureGroupFilter === 'A' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}" data-grp="A">
              🟢 Group A Matches
            </button>
            <button class="match-grp-filter-btn px-3 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer ${activeFixtureGroupFilter === 'B' ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}" data-grp="B">
              🔵 Group B Matches
            </button>
            ${format.format === 'FOUR_GROUPS' ? `
              <button class="match-grp-filter-btn px-3 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer ${activeFixtureGroupFilter === 'C' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}" data-grp="C">
                🟡 Group C
              </button>
              <button class="match-grp-filter-btn px-3 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer ${activeFixtureGroupFilter === 'D' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}" data-grp="D">
                🟣 Group D
              </button>
            ` : ''}
            <button class="match-grp-filter-btn px-3 py-1.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer ${activeFixtureGroupFilter === 'KNOCKOUT' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}" data-grp="KNOCKOUT">
              🏆 Semi-Finals & Final
            </button>
          </div>
        ` : ''}

        <!-- DYNAMIC MATCH SECTIONS: LIVE, SCHEDULED, COMPLETED -->
        ${(() => {
          if (filteredFixtures.length === 0) {
            return `
              <div class="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-2xs">
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto text-xl shadow-2xs">
                  🏏
                </div>
                <h4 class="text-sm font-black text-slate-800">No Matches Scheduled Yet</h4>
                <p class="text-xs text-slate-500 max-w-sm mx-auto">Fixtures for ${selectedCategory} 2026 are being scheduled and will appear here shortly.</p>
              </div>
            `;
          }

          const sections = [];

          const getMatchBadgeInfo = (m, idx = 1) => {
            const matchNum = m.matchNo || idx;
            let label = `Match #${matchNum}`;
            let pillClass = 'bg-slate-800 text-white';
            let borderClass = 'border-slate-200 hover:border-slate-400';

            if (m.stage === 'GROUP_A' || m.groupCode === 'A') {
              label = `🟢 Group A • Match ${matchNum}`;
              pillClass = 'bg-emerald-100 text-emerald-900 border border-emerald-300';
              borderClass = 'border-emerald-200 hover:border-emerald-400';
            } else if (m.stage === 'GROUP_B' || m.groupCode === 'B') {
              label = `🔵 Group B • Match ${matchNum}`;
              pillClass = 'bg-sky-100 text-sky-900 border border-sky-300';
              borderClass = 'border-sky-200 hover:border-sky-400';
            } else if (m.stage === 'GROUP_C' || m.groupCode === 'C') {
              label = `🟡 Group C • Match ${matchNum}`;
              pillClass = 'bg-amber-100 text-amber-900 border border-amber-300';
              borderClass = 'border-amber-200 hover:border-amber-400';
            } else if (m.stage === 'GROUP_D' || m.groupCode === 'D') {
              label = `🟣 Group D • Match ${matchNum}`;
              pillClass = 'bg-purple-100 text-purple-900 border border-purple-300';
              borderClass = 'border-purple-200 hover:border-purple-400';
            } else {
              label = `${m.leagueCode || 'T'} • Match ${matchNum}`;
            }

            return { label, pillClass, borderClass, matchNum };
          };

          // 1. LIVE MATCH SCOREBOARD (ONLY IF LIVE MATCHES EXIST)
          if (liveMatches.length > 0) {
            sections.push(`
              <div class="space-y-3">
                <div class="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-2.5 rounded-2xl shadow-sm flex items-center justify-between">
                  <h2 class="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span> 🔴 Live Match Scoreboard
                  </h2>
                  <span class="px-3 py-0.5 bg-white/20 backdrop-blur-sm text-white font-mono text-[10px] font-black rounded-full border border-white/30">
                    LIVE NOW
                  </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  ${liveMatches.map((m, idx) => {
                    const state = m.liveMatchState || {};
                    const teamAObj = store.getTeamById(m.teamAId);
                    const teamBObj = store.getTeamById(m.teamBId);
                    const logoA = teamAObj?.logoUrl || teamAObj?.teamLogoUrl || 'assets/card_jsl_user.png';
                    const logoB = teamBObj?.logoUrl || teamBObj?.teamLogoUrl || 'assets/card_jsl_user.png';

                    const isBattingTeamA = state.innings !== 2;
                    const teamAScoreTxt = isBattingTeamA ? `${state.runs}/${state.wickets} (${state.overs}.${state.balls})` : (m.teamAScore ? `${m.teamAScore.runs}/${m.teamAScore.wickets}` : '-');
                    const teamBScoreTxt = !isBattingTeamA ? `${state.runs}/${state.wickets} (${state.overs}.${state.balls})` : (m.teamBScore ? `${m.teamBScore.runs}/${m.teamBScore.wickets}` : '-');

                    const startTs = m.startedAtTimestamp || Date.now();
                    const startClock = m.startedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return `
                      <div class="cpl-match-card bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group" data-fixture-id="${m.id}" onclick="window.openMatchCenterModal('${m.id}')">
                        <!-- Top Line: Stage, Start Time & Real-time Live Running Duration -->
                        <div class="flex items-center justify-between gap-2 text-xs">
                          <div class="font-medium text-slate-600 truncate flex items-center gap-1.5 min-w-0">
                            <span class="font-black text-slate-900">${m.group ? `GROUP ${m.group} Match ${m.matchNo || idx + 1}` : `Match ${m.matchNo || idx + 1}`}</span>
                            <span>•</span>
                            <span class="font-bold text-slate-700">T${m.oversLimit || 16}</span>
                            <span>•</span>
                            <span class="text-slate-500 truncate">🗓️ Started: ${startClock} (⏱️ <span class="cpl-live-match-timer font-mono font-black text-emerald-700" data-start="${startTs}">0m 0s</span>)</span>
                          </div>
                          <div class="shrink-0">
                            <span class="text-rose-600 font-black tracking-wider uppercase text-xs flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              <span class="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span> LIVE
                            </span>
                          </div>
                        </div>

                        <!-- Teams List with Circular Logos & Live Scores -->
                        <div class="space-y-2.5 py-1">
                          <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                              <img src="${logoA}" class="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-50 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                              <span class="font-black text-slate-900 text-sm sm:text-base tracking-wide uppercase truncate leading-tight group-hover:text-emerald-700 transition-colors">
                                ${m.teamAName}
                              </span>
                            </div>
                            <div class="text-xs sm:text-sm font-black font-mono ${isBattingTeamA ? 'text-emerald-700' : 'text-slate-500'} shrink-0">
                              ${teamAScoreTxt}
                            </div>
                          </div>

                          <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                              <img src="${logoB}" class="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-50 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                              <span class="font-black text-slate-900 text-sm sm:text-base tracking-wide uppercase truncate leading-tight group-hover:text-emerald-700 transition-colors">
                                ${m.teamBName}
                              </span>
                            </div>
                            <div class="text-xs sm:text-sm font-black font-mono ${!isBattingTeamA ? 'text-emerald-700' : 'text-slate-500'} shrink-0">
                              ${teamBScoreTxt}
                            </div>
                          </div>
                        </div>

                        <!-- Toss / Target Equation if any -->
                        ${state.innings === 2 && state.target ? `
                          <div class="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black p-2 rounded-xl text-center shadow-2xs">
                            🎯 Target: ${state.target} | Need ${state.target - state.runs} runs off ${(m.oversLimit * 6) - ((state.overs * 6) + state.balls)} balls
                          </div>
                        ` : ((m.tossDetails || state.tossDetails) ? `
                          <div class="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold p-1.5 rounded-xl truncate flex items-center gap-1">
                            <span>🪙</span> <span class="truncate">${m.tossDetails || state.tossDetails}</span>
                          </div>
                        ` : '')}

                        <!-- Footer: Tournament Name & Direct Match Centre Prompt -->
                        <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div class="min-w-0">
                            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                              ${m.leagueCode || selectedCategory} PREMIER LEAGUE • ${m.venue || 'JHANKRA SCHOOL GROUND'}
                            </div>
                            <div class="text-xs font-black text-emerald-700 group-hover:text-emerald-800 transition-colors flex items-center gap-1 mt-0.5">
                              View Match Centre <span class="text-emerald-600 font-bold transition-transform group-hover:translate-x-1">→</span>
                            </div>
                          </div>
                          <span class="text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-xl shadow-2xs">
                            📊 Tap for Scorecard
                          </span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `);
          }

          // 2. UPCOMING MATCH FIXTURES (ONLY IF SCHEDULED MATCHES EXIST)
          if (scheduledMatches.length > 0) {
            sections.push(`
              <div class="space-y-3">
                <div class="bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-700 text-white px-4 py-2.5 rounded-2xl shadow-sm flex items-center justify-between">
                  <h2 class="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <span>📅</span> Scheduled Fixtures (${selectedCategory})
                  </h2>
                  <span class="px-3 py-0.5 bg-white/20 backdrop-blur-sm text-white font-mono text-[10px] font-black rounded-full border border-white/30">
                    ${scheduledMatches.length} MATCHES
                  </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  ${scheduledMatches.map((m, idx) => {
                    const teamAObj = store.getTeamById(m.teamAId);
                    const teamBObj = store.getTeamById(m.teamBId);
                    const logoA = teamAObj?.logoUrl || teamAObj?.teamLogoUrl || 'assets/card_jsl_user.png';
                    const logoB = teamBObj?.logoUrl || teamBObj?.teamLogoUrl || 'assets/card_jsl_user.png';

                    return `
                      <div class="cpl-match-card bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group" data-fixture-id="${m.id}" onclick="window.openMatchCenterModal('${m.id}')">
                        <!-- Top Line: Stage, T20/T16, Time & Status -->
                        <div class="flex items-center justify-between gap-2 text-xs">
                          <div class="font-medium text-slate-600 truncate flex items-center gap-1.5">
                            <span class="font-black text-slate-900">${m.group ? `GROUP ${m.group} Match ${m.matchNo || idx + 1}` : `Match ${m.matchNo || idx + 1}`}</span>
                            <span>•</span>
                            <span class="font-bold text-slate-700">T${m.oversLimit || 16}</span>
                            <span>•</span>
                            <span class="text-slate-500">🗓️ ${m.date || 'Today'} ${m.time ? `(${m.time})` : ''}</span>
                          </div>
                          <div class="shrink-0">
                            <span class="text-sky-700 font-black tracking-wider uppercase text-xs bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                              SCHEDULED
                            </span>
                          </div>
                        </div>

                        <!-- Teams List with Circular Logos -->
                        <div class="space-y-2.5 py-1">
                          <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                              <img src="${logoA}" class="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-50 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                              <span class="font-black text-slate-900 text-sm sm:text-base tracking-wide uppercase truncate leading-tight group-hover:text-emerald-700 transition-colors">
                                ${m.teamAName}
                              </span>
                            </div>
                            <span class="text-xs font-bold text-slate-400 font-mono shrink-0">-</span>
                          </div>

                          <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                              <img src="${logoB}" class="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-50 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                              <span class="font-black text-slate-900 text-sm sm:text-base tracking-wide uppercase truncate leading-tight group-hover:text-emerald-700 transition-colors">
                                ${m.teamBName}
                              </span>
                            </div>
                            <span class="text-xs font-bold text-slate-400 font-mono shrink-0">-</span>
                          </div>
                        </div>

                        <!-- Footer: Tournament Name & Click Action -->
                        <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div class="min-w-0">
                            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                              ${m.leagueCode || selectedCategory} PREMIER LEAGUE • ${m.venue || 'JHANKRA SCHOOL GROUND'}
                            </div>
                            <div class="text-xs font-black text-emerald-700 group-hover:text-emerald-800 transition-colors flex items-center gap-1 mt-0.5">
                              View Match Centre <span class="text-emerald-600 font-bold transition-transform group-hover:translate-x-1">→</span>
                            </div>
                          </div>
                          <span class="text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-300 px-3 py-1 rounded-xl shadow-2xs">
                            📊 Tap for Preview
                          </span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `);
          }

          // 3. COMPLETED MATCH RESULTS (ONLY IF COMPLETED MATCHES EXIST)
          if (completedMatches.length > 0) {
            sections.push(`
              <div class="space-y-3">
                <div class="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-2.5 rounded-2xl shadow-sm flex items-center justify-between">
                  <h2 class="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <span>🏆</span> Match Results (${selectedCategory})
                  </h2>
                  <span class="px-3 py-0.5 bg-white/20 backdrop-blur-sm text-white font-mono text-[10px] font-black rounded-full border border-white/30">
                    ${completedMatches.length} COMPLETED
                  </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  ${completedMatches.map((m, idx) => {
                    const teamAObj = store.getTeamById(m.teamAId);
                    const teamBObj = store.getTeamById(m.teamBId);
                    const logoA = teamAObj?.logoUrl || teamAObj?.teamLogoUrl || 'assets/card_jsl_user.png';
                    const logoB = teamBObj?.logoUrl || teamBObj?.teamLogoUrl || 'assets/card_jsl_user.png';

                    return `
                      <div class="cpl-match-card bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group" data-fixture-id="${m.id}" onclick="window.openMatchCenterModal('${m.id}')">
                        <!-- Top Line: Stage & Duration -->
                        <div class="flex items-center justify-between gap-2 text-xs">
                          <div class="font-medium text-slate-600 truncate flex items-center gap-1.5">
                            <span class="font-black text-slate-900">${m.group ? `GROUP ${m.group} Match ${m.matchNo || idx + 1}` : `Match ${m.matchNo || idx + 1}`}</span>
                            <span>•</span>
                            <span class="font-bold text-slate-700">T${m.oversLimit || 16}</span>
                            <span>•</span>
                            <span class="text-slate-500">⏱️ ${m.startedAt || '09:00 AM'} - ${m.endedAt || 'Finished'}</span>
                          </div>
                          <div class="shrink-0">
                            <span class="text-emerald-700 font-black tracking-wider uppercase text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              COMPLETED
                            </span>
                          </div>
                        </div>

                        <!-- Teams List with Circular Logos & Final Scores -->
                        <div class="space-y-2.5 py-1">
                          <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                              <img src="${logoA}" class="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-50 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                              <span class="font-black text-slate-900 text-sm sm:text-base tracking-wide uppercase truncate leading-tight group-hover:text-emerald-700 transition-colors">
                                ${m.teamAName}
                              </span>
                            </div>
                            <div class="text-xs sm:text-sm font-black font-mono text-slate-900 shrink-0">
                              ${m.teamAScore ? `${m.teamAScore.runs}/${m.teamAScore.wickets} (${m.teamAScore.overs}.${m.teamAScore.balls} ov)` : '-'}
                            </div>
                          </div>

                          <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                              <img src="${logoB}" class="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-50 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                              <span class="font-black text-slate-900 text-sm sm:text-base tracking-wide uppercase truncate leading-tight group-hover:text-emerald-700 transition-colors">
                                ${m.teamBName}
                              </span>
                            </div>
                            <div class="text-xs sm:text-sm font-black font-mono text-slate-900 shrink-0">
                              ${m.teamBScore ? `${m.teamBScore.runs}/${m.teamBScore.wickets} (${m.teamBScore.overs}.${m.teamBScore.balls} ov)` : '-'}
                            </div>
                          </div>
                        </div>

                        <!-- Result Banner -->
                        <div class="text-xs bg-emerald-50 border border-emerald-300 text-emerald-950 font-black p-2 rounded-xl text-center shadow-2xs uppercase tracking-wide flex items-center justify-center gap-1.5">
                          <span>🏆</span> <span>${m.result || 'Match Completed'}</span>
                        </div>

                        <!-- Footer: Tournament Name & Click Action -->
                        <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div class="min-w-0">
                            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                              ${m.leagueCode || selectedCategory} PREMIER LEAGUE • ${m.venue || 'JHANKRA SCHOOL GROUND'}
                            </div>
                            <div class="text-xs font-black text-emerald-700 group-hover:text-emerald-800 transition-colors flex items-center gap-1 mt-0.5">
                              View Match Centre <span class="text-emerald-600 font-bold transition-transform group-hover:translate-x-1">→</span>
                            </div>
                          </div>
                          <span class="text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-xl shadow-2xs">
                            📊 View Summary
                          </span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `);
          }

          return `<div class="space-y-4">${sections.join('')}</div>`;
        })()}
      `;
    } else if (activeFixtureSubTab === 'awards') {
      // ---------------- TOURNAMENT AWARDS ----------------
      // Aggregate every player's per-match stats across this league's fixtures.
      // playerStats survives on each fixture's liveMatchState after the match completes.
      const agg = {};
      rawFixtures.forEach(f => {
        const ps = f.liveMatchState && f.liveMatchState.playerStats;
        if (!ps || typeof ps !== 'object') return;
        Object.keys(ps).forEach(pid => {
          const s = ps[pid] || {};
          if (!agg[pid]) agg[pid] = { runs:0, balls:0, fours:0, sixes:0, wickets:0, runsConceded:0, ballsBowled:0, maidens:0, catches:0, stumpings:0, runOuts:0 };
          const a = agg[pid];
          a.runs += s.runs||0; a.balls += s.balls||0; a.fours += s.fours||0; a.sixes += s.sixes||0;
          a.wickets += s.wickets||0; a.runsConceded += s.runsConceded||0; a.ballsBowled += s.ballsBowled||0;
          a.maidens += s.maidens||0; a.catches += s.catches||0; a.stumpings += s.stumpings||0; a.runOuts += s.runOuts||0;
        });
      });

      const allPlayers = store.getPlayers();
      const allTeams = store.getTeams();
      const nameOf = (pid) => (allPlayers.find(p => p.id === pid)?.name) || 'Unknown Player';
      const teamOf = (pid) => { const p = allPlayers.find(x => x.id === pid); const t = p && allTeams.find(tt => tt.id === p.teamId); return t ? t.name : ''; };

      const rows = Object.keys(agg).map(pid => {
        const a = agg[pid];
        // MVP weighted composite (signed off): reward all-round impact.
        const mvp = a.runs*1 + a.fours*1 + a.sixes*2 + a.wickets*20 + a.maidens*8 + a.catches*8 + a.stumpings*10 + a.runOuts*8;
        const fielding = a.catches + a.runOuts;
        return { pid, name: nameOf(pid), team: teamOf(pid), ...a, mvp, fielding };
      });

      const topBy = (key) => {
        const s = rows.filter(r => (r[key] || 0) > 0).sort((x, y) => (y[key]||0) - (x[key]||0) || (y.mvp||0) - (x.mvp||0));
        return s.length ? { win: s[0], runner: s[1] || null } : null;
      };

      const standings = computeTeamStandings(leagueTeams, rawFixtures);
      const bestTeam = (standings[0] && standings[0].played > 0) ? standings[0] : null;

      const hasAnyData = rows.length > 0 || bestTeam;

      // Compact inline SVG icons (white on the gradient chip) for each award shape.
      const SVG = {
        bat:    '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3.5l6.5 6.5-8 8-6.5-6.5z"/><path d="M6 13.5L3.5 16l4.5 4.5L10.5 18"/></svg>',
        ball:   '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" stroke-dasharray="1.5 2.5"/></svg>',
        gloves: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12V7.5a1.5 1.5 0 0 1 3 0V11M9 11V6a1.5 1.5 0 0 1 3 0v5M12 11V7a1.5 1.5 0 0 1 3 0v5.5"/><path d="M6 12a1.5 1.5 0 0 0-3 0v1.5a6 6 0 0 0 6 6h3.5a4.5 4.5 0 0 0 4.5-4.5V9a1.5 1.5 0 0 0-3 0"/></svg>',
        hand:   '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="2.5"/><path d="M4.5 19a7.5 7.5 0 0 1 15 0z"/></svg>',
        shield: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.2-3 7.3-7 8.5C8 21.3 5 18.2 5 14V6z"/></svg>',
        star:   '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z"/></svg>',
        trophy: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2 2 0 0 0 0 4H8M16 6h2.5a2 2 0 0 1 0 4H16M9.5 20h5M12 13v3.5"/></svg>',
        six:    '<svg viewBox="0 0 24 24" width="17" height="17"><text x="12" y="17.5" text-anchor="middle" font-size="15" font-weight="900" fill="currentColor" font-family="system-ui,sans-serif">6</text></svg>',
        four:   '<svg viewBox="0 0 24 24" width="17" height="17"><text x="12" y="17.5" text-anchor="middle" font-size="15" font-weight="900" fill="currentColor" font-family="system-ui,sans-serif">4</text></svg>',
      };

      const specs = [
        { title:'Best Batsman',      key:'runs',      accent:'emerald', svg:SVG.bat },
        { title:'Best Bowler',       key:'wickets',   accent:'rose',    svg:SVG.ball },
        { title:'Best Wicketkeeper', key:'stumpings', accent:'violet',  svg:SVG.gloves },
        { title:'Best Fielder',      key:'fielding',  accent:'sky',     svg:SVG.hand },
        { title:'Six Hitter',        key:'sixes',     accent:'amber',   svg:SVG.six },
        { title:'Four Hitter',       key:'fours',     accent:'cyan',    svg:SVG.four },
        { title:'Best Maiden Overs', key:'maidens',   accent:'slate',   svg:SVG.shield },
        { title:'Tournament MVP',    key:'mvp',       accent:'fuchsia', svg:SVG.star },
      ];

      // Cache the computed rows + standings so the "view full list" modal can reuse
      // them without re-aggregating (the modal is only reachable from this rendered tab).
      window.__cplAwardsCache = { category: selectedCategory, rows, standings };

      // Compact card: shape icon + award name + top player's name + "View Full List".
      const compactCard = (key, accent, svg, title, name) => `
        <button type="button" data-award-key="${key}" class="award-card text-left rounded-2xl p-3 bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-${accent}-300 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col gap-2 overflow-hidden group">
          <div class="h-1 -mx-3 -mt-3 mb-0.5 bg-gradient-to-r from-${accent}-400 to-${accent}-600"></div>
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-${accent}-400 to-${accent}-600 text-white flex items-center justify-center shrink-0 shadow-sm">${svg}</span>
            <span class="text-[10px] font-black uppercase tracking-wide text-slate-600 leading-tight">${title}</span>
          </div>
          <div class="text-sm font-black ${name ? 'text-slate-900' : 'text-slate-400'} truncate leading-tight">${name || 'Awaiting matches'}</div>
          <div class="mt-auto flex items-center gap-1 text-[10px] font-black text-${accent}-600 group-hover:gap-1.5 transition-all">
            View Full List <span class="transition-transform group-hover:translate-x-0.5">→</span>
          </div>
        </button>`;

      const cardHtml = (sp) => {
        const t = topBy(sp.key);
        return compactCard(sp.key, sp.accent, sp.svg, sp.title, t ? t.win.name : '');
      };

      const bestTeamHtml = compactCard('team', 'amber', SVG.trophy, 'Best Team', bestTeam ? bestTeam.name : '');

      if (!hasAnyData) {
        mainContentHtml = `
          <div class="bg-white border-2 border-emerald-200 rounded-3xl p-8 text-center shadow-sm space-y-2 animate-fade-in">
            <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto text-2xl">🏆</div>
            <h3 class="text-sm font-black text-slate-900">${selectedCategory} Awards Coming Soon</h3>
            <p class="text-[11px] text-slate-500 max-w-sm mx-auto">Player and team awards for ${selectedCategory} 2026 will appear here automatically as matches are scored.</p>
          </div>`;
      } else {
        mainContentHtml = `
          <div class="space-y-3 animate-fade-in">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <h3 class="text-sm font-black text-slate-900 flex items-center gap-2"><span>🏆</span> ${selectedCategory} Tournament Awards</h3>
              <span class="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">Tap a card for the full list →</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              ${specs.map(cardHtml).join('')}
              ${bestTeamHtml}
            </div>
            <p class="text-[10px] text-slate-400 leading-relaxed px-1">
              Keeper, fielder and maiden awards reflect matches scored after this feature went live; all others cover every completed match.
            </p>
          </div>`;
      }
    } else {
      // Standings / Points Table Subtab
      if (leagueTeams.length === 0) {
        mainContentHtml = `
          <div class="bg-white border-2 border-emerald-200 rounded-3xl p-8 text-center shadow-sm space-y-2 animate-fade-in">
            <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto text-2xl">
              🏏
            </div>
            <h3 class="text-sm font-black text-slate-900">${selectedCategory} Tournament Standings Coming Soon</h3>
            <p class="text-[11px] text-slate-500 max-w-sm mx-auto">Franchise teams and standings for ${selectedCategory} 2026 will be updated live as matches are played.</p>
          </div>
        `;
      } else if (isMultiGroup) {
        // Multi-Group Standings View (Group A & Group B + Playoff Bracket)
        const groups = (format.groups && format.groups.length > 0) ? format.groups : ['A', 'B'];
        const groupColors = {
          A: { border: 'border-emerald-300', bg: 'bg-emerald-50', badge: 'bg-emerald-600 text-white', text: 'text-emerald-950', title: '🟢 GROUP A' },
          B: { border: 'border-sky-300', bg: 'bg-sky-50', badge: 'bg-sky-600 text-white', text: 'text-sky-950', title: '🔵 GROUP B' },
          C: { border: 'border-amber-300', bg: 'bg-amber-50', badge: 'bg-amber-600 text-white', text: 'text-amber-950', title: '🟡 GROUP C' },
          D: { border: 'border-purple-300', bg: 'bg-purple-50', badge: 'bg-purple-600 text-white', text: 'text-purple-950', title: '🟣 GROUP D' }
        };

        const groupStandingsMap = {};
        groups.forEach(g => {
          const gTeams = leagueTeams.filter(t => (t.group || 'A').toUpperCase() === g);
          groupStandingsMap[g] = computeTeamStandings(gTeams, rawFixtures);
        });

        const grpAStandings = groupStandingsMap['A'] || [];
        const grpBStandings = groupStandingsMap['B'] || [];

        mainContentHtml = `
          <div class="space-y-4 animate-fade-in">
            ${groups.map(g => {
              const styling = groupColors[g] || groupColors.A;
              const gStandings = groupStandingsMap[g] || [];

              const gAccent = { A:'emerald', B:'sky', C:'amber', D:'purple' }[g] || 'emerald';
              return `
                <div class="space-y-2">
                  <!-- Group Header Bar -->
                  <div class="flex flex-wrap items-center justify-between gap-2 ${styling.bg} border-2 ${styling.border} p-3 rounded-2xl text-slate-900 shadow-2xs">
                    <h2 class="text-xs sm:text-sm font-black ${styling.text} uppercase tracking-wider flex items-center gap-1.5">
                      <span>${styling.title}</span> Points Table (${gStandings.length} Teams)
                    </h2>
                    <span class="inline-flex items-center gap-1 px-3 py-1 ${styling.badge} rounded-full font-black text-[10px] uppercase shadow-2xs">
                      ⭐ Top 2 Qualify for Semifinals
                    </span>
                  </div>

                  <!-- Compact points table that fits one mobile screen -->
                  ${standingsTableHtml(gStandings, 2, gAccent)}
                </div>
              `;
            }).join('')}

            <!-- DYNAMIC PLAYOFF / KNOCKOUT BRACKET VISUALIZER (COMPACT CRISP WHITE THEME) -->
            <div class="playoff-bracket-container p-3 sm:p-3.5 bg-white text-slate-900 rounded-2xl border-2 border-amber-400 shadow-2xs space-y-2.5">
              <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-2xs shrink-0">🏆</span>
                  <div class="min-w-0">
                    <h3 class="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide truncate">
                      ${selectedCategory} Playoff &amp; Knockout Bracket
                    </h3>
                    <p class="text-[9.5px] sm:text-[10.5px] text-slate-500 font-medium truncate">Cross-Over: 1st Grp A vs 2nd Grp B • 1st Grp B vs 2nd Grp A</p>
                  </div>
                </div>
                <span class="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-full font-mono text-[9px] font-black uppercase shadow-2xs shrink-0">
                  ⭐ Finals Road
                </span>
              </div>

              <!-- Bracket Visual Tree Grid (Compact) -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5">
                <!-- SF 1 Card -->
                <div class="playoff-card-box bg-slate-50 border border-slate-200 hover:border-emerald-400 rounded-xl p-2 sm:p-2.5 space-y-1.5 shadow-2xs transition-all flex flex-col justify-between">
                  <div class="flex justify-between items-center text-[9px] font-black uppercase pb-1 border-b border-slate-200">
                    <span class="flex items-center gap-1 text-emerald-800 font-black">🏆 Semi-Final 1</span>
                    <span class="text-slate-500 font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[8px]">Knockout</span>
                  </div>
                  <div class="space-y-1 text-xs font-bold">
                    <div class="playoff-team-slot flex justify-between items-center px-2 py-1.5 rounded-lg bg-white border border-emerald-300 text-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
                      <div class="flex items-center gap-2 min-w-0">
                        <img src="${(grpAStandings[0] && store.getTeamById(grpAStandings[0].id)?.logoUrl) || (grpAStandings[0] && store.getTeamById(grpAStandings[0].id)?.teamLogoUrl) || 'assets/card_jsl_user.png'}" class="w-5 h-5 rounded-md object-cover border border-emerald-200 bg-emerald-50 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                        <span class="truncate font-black text-[11px] sm:text-xs text-slate-900">${grpAStandings[0] ? grpAStandings[0].name : '1st Place (Group A)'}</span>
                      </div>
                      <span class="text-[8.5px] font-black px-1.5 py-0.2 bg-emerald-600 text-white rounded font-mono shadow-2xs shrink-0">1st A</span>
                    </div>
                    <div class="text-center text-[8.5px] font-black text-slate-400 font-mono tracking-widest leading-none py-0.5">VS</div>
                    <div class="playoff-team-slot flex justify-between items-center px-2 py-1.5 rounded-lg bg-white border border-sky-300 text-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
                      <div class="flex items-center gap-2 min-w-0">
                        <img src="${(grpBStandings[1] && store.getTeamById(grpBStandings[1].id)?.logoUrl) || (grpBStandings[1] && store.getTeamById(grpBStandings[1].id)?.teamLogoUrl) || 'assets/card_jsl_user.png'}" class="w-5 h-5 rounded-md object-cover border border-sky-200 bg-sky-50 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                        <span class="truncate font-black text-[11px] sm:text-xs text-slate-900">${grpBStandings[1] ? grpBStandings[1].name : '2nd Place (Group B)'}</span>
                      </div>
                      <span class="text-[8.5px] font-black px-1.5 py-0.2 bg-sky-600 text-white rounded font-mono shadow-2xs shrink-0">2nd B</span>
                    </div>
                  </div>
                </div>

                <!-- SF 2 Card -->
                <div class="playoff-card-box bg-slate-50 border border-slate-200 hover:border-sky-400 rounded-xl p-2 sm:p-2.5 space-y-1.5 shadow-2xs transition-all flex flex-col justify-between">
                  <div class="flex justify-between items-center text-[9px] font-black uppercase pb-1 border-b border-slate-200">
                    <span class="flex items-center gap-1 text-sky-800 font-black">🏆 Semi-Final 2</span>
                    <span class="text-slate-500 font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[8px]">Knockout</span>
                  </div>
                  <div class="space-y-1 text-xs font-bold">
                    <div class="playoff-team-slot flex justify-between items-center px-2 py-1.5 rounded-lg bg-white border border-sky-300 text-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
                      <div class="flex items-center gap-2 min-w-0">
                        <img src="${(grpBStandings[0] && store.getTeamById(grpBStandings[0].id)?.logoUrl) || (grpBStandings[0] && store.getTeamById(grpBStandings[0].id)?.teamLogoUrl) || 'assets/card_jsl_user.png'}" class="w-5 h-5 rounded-md object-cover border border-sky-200 bg-sky-50 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                        <span class="truncate font-black text-[11px] sm:text-xs text-slate-900">${grpBStandings[0] ? grpBStandings[0].name : '1st Place (Group B)'}</span>
                      </div>
                      <span class="text-[8.5px] font-black px-1.5 py-0.2 bg-sky-600 text-white rounded font-mono shadow-2xs shrink-0">1st B</span>
                    </div>
                    <div class="text-center text-[8.5px] font-black text-slate-400 font-mono tracking-widest leading-none py-0.5">VS</div>
                    <div class="playoff-team-slot flex justify-between items-center px-2 py-1.5 rounded-lg bg-white border border-emerald-300 text-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
                      <div class="flex items-center gap-2 min-w-0">
                        <img src="${(grpAStandings[1] && store.getTeamById(grpAStandings[1].id)?.logoUrl) || (grpAStandings[1] && store.getTeamById(grpAStandings[1].id)?.teamLogoUrl) || 'assets/card_jsl_user.png'}" class="w-5 h-5 rounded-md object-cover border border-emerald-200 bg-emerald-50 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                        <span class="truncate font-black text-[11px] sm:text-xs text-slate-900">${grpAStandings[1] ? grpAStandings[1].name : '2nd Place (Group A)'}</span>
                      </div>
                      <span class="text-[8.5px] font-black px-1.5 py-0.2 bg-emerald-600 text-white rounded font-mono shadow-2xs shrink-0">2nd A</span>
                    </div>
                  </div>
                </div>

                <!-- Grand Final Card -->
                <div class="playoff-final-box bg-gradient-to-br from-amber-50/90 via-white to-amber-100/50 border-2 border-amber-400 rounded-xl p-2 sm:p-2.5 space-y-1.5 shadow-2xs flex flex-col justify-between">
                  <div class="flex justify-between items-center text-[9px] font-black uppercase pb-1 border-b border-amber-200">
                    <span class="flex items-center gap-1 text-amber-900 font-black">👑 Grand Final 2026</span>
                    <span class="text-amber-900 font-mono bg-amber-200/90 border border-amber-300 px-1.5 py-0.2 rounded font-black text-[8px] shadow-2xs">Championship</span>
                  </div>
                  <div class="space-y-1 text-xs font-bold">
                    <div class="playoff-team-slot flex justify-between items-center px-2 py-1.5 rounded-lg bg-white border border-amber-300 text-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-5 h-5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center text-[10px] shrink-0 font-bold">🥇</span>
                        <span class="truncate font-black text-[11px] sm:text-xs text-slate-900">Winner Semi-Final 1</span>
                      </div>
                      <span class="text-[8.5px] font-black px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded font-mono shadow-2xs shrink-0">SF1</span>
                    </div>
                    <div class="text-center text-[8px] sm:text-[8.5px] font-black text-amber-800 font-mono uppercase tracking-wider leading-none py-0.5 flex items-center justify-center gap-1">
                      <span class="text-amber-500">⚡</span> <span>CHAMPIONSHIP TROPHY</span> <span class="text-amber-500">⚡</span>
                    </div>
                    <div class="playoff-team-slot flex justify-between items-center px-2 py-1.5 rounded-lg bg-white border border-amber-300 text-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-5 h-5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center text-[10px] shrink-0 font-bold">🥈</span>
                        <span class="truncate font-black text-[11px] sm:text-xs text-slate-900">Winner Semi-Final 2</span>
                      </div>
                      <span class="text-[8.5px] font-black px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded font-mono shadow-2xs shrink-0">SF2</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer Legend -->
            <div class="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between text-[10px] text-slate-600 font-bold gap-2 shadow-2xs">
              <span class="flex items-center gap-1 text-emerald-700 font-black">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Q: Semifinal Qualifier (Rank 1 & 2 in each group)
              </span>
              <span class="text-slate-400 font-mono">P = Played | W = Won | L = Lost | PTS = Points | NRR = Net Run Rate</span>
            </div>
          </div>
        `;
      } else {
        // Single Table Standings View
        const unifiedStandings = computeTeamStandings(leagueTeams, rawFixtures);
        mainContentHtml = `
          <div class="space-y-3 animate-fade-in">
            <!-- Table Header Bar -->
            <div class="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 border-2 border-emerald-300 p-3 rounded-2xl text-slate-900 shadow-2xs">
              <h2 class="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏆</span> ${selectedCategory} Franchise Standings Table
              </h2>
              <span class="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-full font-black text-[10px] uppercase shadow-2xs">
                ⭐ Top 4 Qualify for Semifinal
              </span>
            </div>

            <!-- Compact points table that fits one mobile screen -->
            ${standingsTableHtml(unifiedStandings, 4, 'emerald')}

            <!-- Footer Legend -->
            <div class="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between text-[10px] text-slate-600 font-bold gap-2 shadow-2xs">
              <span class="flex items-center gap-1 text-emerald-700 font-black">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> 1-4 Rank: Semifinal Qualifier
              </span>
              <span class="text-slate-400">P = Played | W = Won | L = Lost | PTS = Points | NRR = Net Run Rate</span>
            </div>
          </div>
        `;
      }
    }

    const contentArea = document.getElementById('fixture-view-content-area');
    if (contentArea) {
      contentArea.innerHTML = mainContentHtml;
      
      // Update Category Button active classes
      container.querySelectorAll('.fixture-cat-btn').forEach(btn => {
        const cat = btn.getAttribute('data-cat');
        const isActive = activeFixtureCategory === cat;
        btn.className = `fixture-cat-btn ${isActive ? 'bg-emerald-600 text-white font-black shadow-xs' : 'text-slate-700 hover:text-slate-900 font-bold'} px-3 py-1 text-[11px] rounded-lg transition-all cursor-pointer`;
      });

      // Update Subtab Button active classes
      const matchSubtabBtn = document.getElementById('fixture-subtab-matches');
      const tableSubtabBtn = document.getElementById('fixture-subtab-table');
      if (matchSubtabBtn) {
        matchSubtabBtn.className = `text-xs font-black py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeFixtureSubTab === 'matches' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`;
      }
      if (tableSubtabBtn) {
        tableSubtabBtn.className = `text-xs font-black py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeFixtureSubTab === 'table' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`;
      }
      const awardsSubtabBtn = document.getElementById('fixture-subtab-awards');
      if (awardsSubtabBtn) {
        awardsSubtabBtn.className = `text-xs font-black py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeFixtureSubTab === 'awards' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`;
      }

      // Award cards -> open the full ranked list of every player (fast-path re-render)
      contentArea.querySelectorAll('.award-card').forEach(card => {
        card.addEventListener('click', (e) => {
          const key = e.currentTarget.getAttribute('data-award-key');
          if (key) openTournamentAwardModal(key);
        });
      });

      // Re-bind match group filter buttons inside the newly updated content area
      contentArea.querySelectorAll('.match-grp-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          activeFixtureGroupFilter = e.currentTarget.getAttribute('data-grp') || 'ALL';
          sessionStorage.setItem('cpl_active_fixture_grp_filter', activeFixtureGroupFilter);
          drawFixtures();
        });
      });

      // Re-bind View Playing 11 buttons inside content area
      contentArea.querySelectorAll('.view-match-lineups-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const fId = e.currentTarget.getAttribute('data-fixture-id');
          openMatchPlayingXIModal(fId);
        });
      });

      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="space-y-3 animate-fade-in pb-16">
        <!-- Compact Header & Category Selector: Match Corner -->
        <div class="bg-white border-2 border-emerald-500/20 px-3.5 py-2.5 rounded-2xl shadow-sm flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs text-sm">🏏</span>
            <h1 class="text-sm sm:text-base font-black text-slate-900 leading-none">Match Corner</h1>
          </div>
          <div class="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-100 p-0.5 shadow-inner gap-0.5">
            ${(store.getAccessibleLeagues ? store.getAccessibleLeagues() : [{code:'T',name:'T'}]).map(l => {
              const code = (l.code || l.category || 'T').toUpperCase();
              return `<button data-cat="${code}" class="fixture-cat-btn ${activeFixtureCategory === code ? 'bg-emerald-600 text-white font-black shadow-xs' : 'text-slate-700 hover:text-slate-900 font-bold'} px-3 py-1 text-[11px] rounded-lg transition-all cursor-pointer">${code}</button>`;
            }).join('')}
          </div>
        </div>

        <!-- Sub-Tabs Navigation (Matches / Points Table / Awards) -->
        <div class="grid grid-cols-3 gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
          <button id="fixture-subtab-matches" class="text-xs font-black py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeFixtureSubTab === 'matches' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">
            🏏 Matches
          </button>
          <button id="fixture-subtab-table" class="text-xs font-black py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeFixtureSubTab === 'table' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">
            📊 Points Table
          </button>
          <button id="fixture-subtab-awards" class="text-xs font-black py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeFixtureSubTab === 'awards' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">
            🏆 Awards
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
        activeFixtureCategory = e.currentTarget.getAttribute('data-cat') || 'T';
        sessionStorage.setItem('cpl_active_fixture_cat', activeFixtureCategory);
        activeFixtureGroupFilter = 'ALL';
        sessionStorage.setItem('cpl_active_fixture_grp_filter', 'ALL');
        drawFixtures();
      });
    });

    // Bind Match Group filter buttons
    container.querySelectorAll('.match-grp-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeFixtureGroupFilter = e.currentTarget.getAttribute('data-grp') || 'ALL';
        sessionStorage.setItem('cpl_active_fixture_grp_filter', activeFixtureGroupFilter);
        drawFixtures();
      });
    });

    // Bind Subtab events
    document.getElementById('fixture-subtab-matches')?.addEventListener('click', () => {
      activeFixtureSubTab = 'matches';
      sessionStorage.setItem('cpl_active_fixture_subtab', 'matches');
      drawFixtures();
    });
    document.getElementById('fixture-subtab-table')?.addEventListener('click', () => {
      activeFixtureSubTab = 'table';
      sessionStorage.setItem('cpl_active_fixture_subtab', 'table');
      drawFixtures();
    });
    document.getElementById('fixture-subtab-awards')?.addEventListener('click', () => {
      activeFixtureSubTab = 'awards';
      sessionStorage.setItem('cpl_active_fixture_subtab', 'awards');
      drawFixtures();
    });

    // Award cards -> open the full ranked list of every player for that category
    container.querySelectorAll('.award-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const key = e.currentTarget.getAttribute('data-award-key');
        if (key) openTournamentAwardModal(key);
      });
    });

    // Bind Clickable Match Cards (clicking anywhere on card opens Match Centre directly)
    container.querySelectorAll('.cpl-match-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const fId = e.currentTarget.getAttribute('data-fixture-id');
        if (fId) {
          openMatchCenterModal(fId);
        }
      });
    });

    // Bind View Playing 11 buttons
    container.querySelectorAll('.view-match-lineups-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering card click
        const fId = e.currentTarget.getAttribute('data-fixture-id');
        openMatchPlayingXIModal(fId);
      });
    });

    // Bind Open Match Centre buttons
    container.querySelectorAll('.open-match-center-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fId = e.currentTarget.getAttribute('data-fixture-id');
        openMatchCenterModal(fId);
      });
    });

    // Live Match Duration Timer Interval Loop (counts up every 1s)
    if (window.__matchTimerInterval) clearInterval(window.__matchTimerInterval);
    const updateLiveTimers = () => {
      const now = Date.now();
      container.querySelectorAll('.cpl-live-match-timer').forEach(timerEl => {
        const start = Number(timerEl.getAttribute('data-start')) || now;
        const diffMs = Math.max(0, now - start);
        const diffSecs = Math.floor(diffMs / 1000);
        const mins = Math.floor(diffSecs / 60);
        const secs = diffSecs % 60;
        timerEl.textContent = `${mins}m ${secs}s`;
      });
    };
    updateLiveTimers();
    window.__matchTimerInterval = setInterval(updateLiveTimers, 1000);

    if (window.lucide) window.lucide.createIcons();
  };

  window.refreshFixturesViewContent = () => {
    if (currentRoute === 'fixtures') {
      drawFixtures();
    }
  };

  drawFixtures();
}

export function openMatchCenterModal(fixtureId) {
  document.getElementById('match-center-modal')?.remove();

  const fixture = store.getFixtures().find(f => f.id === fixtureId);
  if (!fixture) return;

  const teamAObj = store.getTeamById(fixture.teamAId) || {};
  const teamBObj = store.getTeamById(fixture.teamBId) || {};
  const logoA = teamAObj.logoUrl || teamAObj.teamLogoUrl || 'assets/card_jsl_user.png';
  const logoB = teamBObj.logoUrl || teamBObj.teamLogoUrl || 'assets/card_jsl_user.png';

  const teamAPlayers = store.getPlayers().filter(p => p.teamId === fixture.teamAId);
  const teamBPlayers = store.getPlayers().filter(p => p.teamId === fixture.teamBId);

  const pxiA = fixture.playingXI?.[fixture.teamAId] || { playing11Ids: teamAPlayers.slice(0, 11).map(p => p.id), twelfthManId: teamAPlayers[11]?.id || '' };
  const pxiB = fixture.playingXI?.[fixture.teamBId] || { playing11Ids: teamBPlayers.slice(0, 11).map(p => p.id), twelfthManId: teamBPlayers[11]?.id || '' };

  const playing11A = teamAPlayers.filter(p => (pxiA.playing11Ids || []).includes(p.id));
  const playing11B = teamBPlayers.filter(p => (pxiB.playing11Ids || []).includes(p.id));

  const state = fixture.liveMatchState || {};
  const isLive = fixture.status === 'LIVE';
  const isCompleted = fixture.status === 'COMPLETED';
  const currentInnings = state.innings || (isCompleted ? 2 : 1);
  const pStats = state.playerStats || {};

  let activeTab = 'summary'; // 'summary', 'scorecard', 'balls', 'superstars', 'info'
  let activeScorecardInnings = currentInnings;
  let activeBallsInnings = currentInnings;
  let activeSuperStarsFilter = 'ALL';

  const modalHtml = `
    <div id="match-center-modal" class="fixed inset-0 z-[80] modal-overlay flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div class="bg-white border-2 border-emerald-500 max-w-3xl w-full h-[95vh] sm:h-[90vh] relative flex flex-col justify-between rounded-3xl shadow-2xl text-slate-900 overflow-hidden">
        
        <!-- Top App Bar (Mobile & Desktop) -->
        <div class="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div class="flex items-center gap-2.5 min-w-0">
            <button id="close-match-center-btn" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0">
              <i data-lucide="arrow-left" class="w-5 h-5"></i>
            </button>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-black rounded-md uppercase shrink-0">
                  ${fixture.leagueCode || 'T'} • MATCH ${fixture.matchNo || 1}
                </span>
                ${isLive ? `<span class="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-md uppercase animate-pulse shrink-0">🔴 LIVE</span>` : (isCompleted ? `<span class="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-md uppercase shrink-0">COMPLETED</span>` : `<span class="px-2 py-0.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded-md uppercase shrink-0">SCHEDULED</span>`)}
              </div>
              <h2 class="text-sm sm:text-base font-black text-white leading-tight mt-0.5 truncate">
                ${fixture.teamAName} vs ${fixture.teamBName}
              </h2>
            </div>
          </div>
          <span class="text-[10px] text-slate-400 font-bold bg-slate-800/70 border border-slate-700 px-2.5 py-1 rounded-xl hidden sm:inline-block shrink-0">
            📍 ${fixture.venue || 'School Ground'}
          </span>
        </div>

        <!-- Sticky Navigation Tabs (Mobile-Scrollable) -->
        <div class="bg-slate-100 border-b border-slate-200 px-2 sm:px-4 py-1.5 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-xs font-black">
          <button class="mc-nav-tab py-2 px-3 rounded-xl transition-all cursor-pointer shrink-0 ${activeTab === 'summary' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'}" data-tab="summary">
            📌 Summary
          </button>
          <button class="mc-nav-tab py-2 px-3 rounded-xl transition-all cursor-pointer shrink-0 ${activeTab === 'scorecard' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'}" data-tab="scorecard">
            📊 Scorecard
          </button>
          <button class="mc-nav-tab py-2 px-3 rounded-xl transition-all cursor-pointer shrink-0 ${activeTab === 'balls' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'}" data-tab="balls">
            ⚾ Balls (Log)
          </button>
          <button class="mc-nav-tab py-2 px-3 rounded-xl transition-all cursor-pointer shrink-0 ${activeTab === 'superstars' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'}" data-tab="superstars">
            ⭐ Super Stars & Field
          </button>
          <button class="mc-nav-tab py-2 px-3 rounded-xl transition-all cursor-pointer shrink-0 ${activeTab === 'info' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'}" data-tab="info">
            ℹ️ Match Info
          </button>
        </div>

        <!-- Scrollable Tab Content Container -->
        <div id="mc-tab-content-area" class="p-3 sm:p-5 overflow-y-auto flex-grow space-y-4 scrollbar-thin bg-slate-50/50"></div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  let mcPollTimer = null;
  let mcLiveHandler = null;
  const removeModal = () => {
    if (mcPollTimer) { clearInterval(mcPollTimer); mcPollTimer = null; }
    if (mcLiveHandler) {
      window.removeEventListener('fixtures_updated', mcLiveHandler);
      window.removeEventListener('live_auction_updated', mcLiveHandler);
      mcLiveHandler = null;
    }
    if (window.renderActiveMatchCenter === renderMatchCenterContent) window.renderActiveMatchCenter = null;
    document.getElementById('match-center-modal')?.remove();
  };
  document.getElementById('close-match-center-btn')?.addEventListener('click', removeModal);

  const contentArea = document.getElementById('mc-tab-content-area');

  function renderMatchCenterContent() {
    if (!contentArea) return;

    // LIVE REFRESH: re-read the freshest fixture every render so spectators see
    // real-time score updates instead of a stale open-time snapshot.
    const fixture = store.getFixtures().find(f => f.id === fixtureId) || {};
    const state = fixture.liveMatchState || {};
    const pStats = state.playerStats || {};
    const isLive = fixture.status === 'LIVE';
    const isCompleted = fixture.status === 'COMPLETED';
    const teamAObj = store.getTeamById(fixture.teamAId) || {};
    const teamBObj = store.getTeamById(fixture.teamBId) || {};
    const logoA = teamAObj.logoUrl || teamAObj.teamLogoUrl || 'assets/card_jsl_user.png';
    const logoB = teamBObj.logoUrl || teamBObj.teamLogoUrl || 'assets/card_jsl_user.png';
    const teamAPlayers = store.getPlayers().filter(p => p.teamId === fixture.teamAId);
    const teamBPlayers = store.getPlayers().filter(p => p.teamId === fixture.teamBId);
    const pxiA = fixture.playingXI?.[fixture.teamAId] || { playing11Ids: teamAPlayers.slice(0, 11).map(p => p.id), twelfthManId: teamAPlayers[11]?.id || '' };
    const pxiB = fixture.playingXI?.[fixture.teamBId] || { playing11Ids: teamBPlayers.slice(0, 11).map(p => p.id), twelfthManId: teamBPlayers[11]?.id || '' };
    const playing11A = teamAPlayers.filter(p => (pxiA.playing11Ids || []).includes(p.id));
    const playing11B = teamBPlayers.filter(p => (pxiB.playing11Ids || []).includes(p.id));

    // 1. SUMMARY TAB
    if (activeTab === 'summary') {
      const batTeamId = state.innings === 2 ? fixture.teamBId : fixture.teamAId;
      const bowlTeamId = state.innings === 2 ? fixture.teamAId : fixture.teamBId;
      const batTeamName = batTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;
      const bowlTeamName = bowlTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;
      const batLogo = store.getTeamById(batTeamId)?.logoUrl || 'assets/card_jsl_user.png';

      const totalBalls = (state.overs * 6) + (state.balls || 0);
      const crr = totalBalls > 0 ? ((state.runs / totalBalls) * 6).toFixed(2) : '0.00';
      
      let targetEquation = '';
      let reqRR = '0.00';
      if (state.innings === 2 && state.target) {
        const runsReq = state.target - state.runs;
        const remBalls = (fixture.oversLimit * 6) - totalBalls;
        reqRR = remBalls > 0 ? ((runsReq / remBalls) * 6).toFixed(2) : '0.00';
        targetEquation = `
          <div class="bg-amber-100 border border-amber-300 text-amber-950 p-2.5 rounded-2xl text-center text-xs font-black shadow-2xs">
            🎯 Need ${runsReq > 0 ? runsReq : 0} Runs off ${remBalls > 0 ? remBalls : 0} Balls (Req RR: ${reqRR})
          </div>
        `;
      }

      // Active Batsmen & Bowler rows with full fallback resolution
      const allRegisteredPlayers = store.getPlayers();
      const strikerP = store.getPlayerById(state.strikerId) || allRegisteredPlayers.find(p => String(p.id) === String(state.strikerId));
      const nonStrikerP = store.getPlayerById(state.nonStrikerId) || allRegisteredPlayers.find(p => String(p.id) === String(state.nonStrikerId));
      const bowlerP = store.getPlayerById(state.bowlerId) || allRegisteredPlayers.find(p => String(p.id) === String(state.bowlerId));

      const strikerStat = pStats[state.strikerId] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
      const nonStrikerStat = pStats[state.nonStrikerId] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
      const bowlerStat = pStats[state.bowlerId] || { ballsBowled: 0, runsConceded: 0, wickets: 0 };

      const bBalls = bowlerStat.ballsBowled || 0;
      const bOvs = `${Math.floor(bBalls / 6)}.${bBalls % 6}`;
      const totalOversDec = bBalls / 6;
      const bowlerEco = totalOversDec > 0 ? ((bowlerStat.runsConceded || 0) / totalOversDec).toFixed(2) : '0.00';

      const strikerSR = (strikerStat.balls > 0) ? (((strikerStat.runs || 0) / strikerStat.balls) * 100).toFixed(1) : '0.0';
      const nonStrikerSR = (nonStrikerStat.balls > 0) ? (((nonStrikerStat.runs || 0) / nonStrikerStat.balls) * 100).toFixed(1) : '0.0';

      const pshipRuns = (strikerStat.runs || 0) + (nonStrikerStat.runs || 0);
      const pshipBalls = (strikerStat.balls || 0) + (nonStrikerStat.balls || 0);

      contentArea.innerHTML = `
        <div class="space-y-3.5 animate-fade-in">
          <!-- Main Big Score Hero Card -->
          <div class="bg-white border-2 border-emerald-500 rounded-3xl p-4 sm:p-5 shadow-md space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <img src="${batLogo}" class="w-10 h-10 rounded-2xl object-cover border border-slate-200 shadow-2xs bg-slate-50 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                <div class="truncate">
                  <h3 class="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">${batTeamName}</h3>
                  <span class="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Innings ${state.innings || 1} Batting</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-3xl sm:text-4xl font-black text-slate-900 font-mono leading-none">
                  <span class="text-emerald-700">${state.runs || 0}</span><span class="text-slate-400 text-xl">/${state.wickets || 0}</span>
                </div>
                <div class="text-xs text-slate-500 font-mono font-bold mt-1">
                  ${state.overs || 0}.${state.balls || 0} / ${fixture.oversLimit || 16} Overs
                </div>
              </div>
            </div>

            ${(fixture.tossDetails || state.tossDetails) ? `
              <div class="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-2xl text-[11px] font-bold flex items-center gap-2 shadow-2xs">
                <span>🪙</span> <span>${fixture.tossDetails || state.tossDetails}</span>
              </div>
            ` : ''}

            ${targetEquation}

            <!-- Match Metric Badges Grid (Extras, Overs, CRR, Target, Req. RR, P'ship) -->
            <div class="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-center font-mono">
              <div class="p-1.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                <div class="text-[9px] text-slate-400 font-bold uppercase">Extras</div>
                <div class="text-xs font-black text-slate-800">${(state.extras || 0)}</div>
              </div>
              <div class="p-1.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                <div class="text-[9px] text-slate-400 font-bold uppercase">Overs</div>
                <div class="text-xs font-black text-slate-800">${state.overs || 0}.${state.balls || 0} / ${fixture.oversLimit || 16}</div>
              </div>
              <div class="p-1.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                <div class="text-[9px] text-slate-400 font-bold uppercase">CRR</div>
                <div class="text-xs font-black text-emerald-700">${crr}</div>
              </div>
              ${state.innings === 2 && state.target ? `
                <div class="p-1.5 bg-amber-50 border border-amber-200 rounded-xl shadow-2xs">
                  <div class="text-[9px] text-amber-800 font-bold uppercase">Target</div>
                  <div class="text-xs font-black text-amber-950">${state.target}</div>
                </div>
                <div class="p-1.5 bg-amber-50 border border-amber-200 rounded-xl shadow-2xs">
                  <div class="text-[9px] text-amber-800 font-bold uppercase">Req. RR</div>
                  <div class="text-xs font-black text-amber-950">${reqRR}</div>
                </div>
              ` : ''}
              <div class="p-1.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs ${state.innings === 2 && state.target ? '' : 'col-span-3'}">
                <div class="text-[9px] text-slate-400 font-bold uppercase">Partnership</div>
                <div class="text-xs font-black text-slate-800">${pshipRuns} (${pshipBalls} balls)</div>
              </div>
            </div>
          </div>

          <!-- Live Batsman Table -->
          <div class="bg-white border-2 border-slate-200 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-2">
            <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>🏏 Batsmen in Play</span>
              <span class="text-[10px] text-slate-400 font-normal">Live In-Play</span>
            </h4>
            
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead>
                  <tr class="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                    <th class="py-1.5 px-2">Batsman</th>
                    <th class="py-1.5 px-2 text-center font-mono">R</th>
                    <th class="py-1.5 px-2 text-center font-mono">B</th>
                    <th class="py-1.5 px-2 text-center font-mono">4s</th>
                    <th class="py-1.5 px-2 text-center font-mono">6s</th>
                    <th class="py-1.5 px-2 text-right font-mono">SR</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-bold">
                  <tr class="bg-emerald-50/60">
                    <td class="py-2.5 px-2">
                      <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                        <span class="text-slate-950 font-black">${strikerP ? strikerP.name : 'Striker (Not Selected)'} *</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-2 text-center text-emerald-800 font-black font-mono">${strikerStat.runs || 0}</td>
                    <td class="py-2.5 px-2 text-center text-slate-700 font-mono">${strikerStat.balls || 0}</td>
                    <td class="py-2.5 px-2 text-center text-slate-700 font-mono">${strikerStat.fours || 0}</td>
                    <td class="py-2.5 px-2 text-center text-slate-700 font-mono">${strikerStat.sixes || 0}</td>
                    <td class="py-2.5 px-2 text-right text-slate-700 font-mono">${strikerSR}</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-2">
                      <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-teal-500"></span>
                        <span class="text-slate-900">${nonStrikerP ? nonStrikerP.name : 'Non-Striker (Not Selected)'}</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-2 text-center text-teal-800 font-black font-mono">${nonStrikerStat.runs || 0}</td>
                    <td class="py-2.5 px-2 text-center text-slate-700 font-mono">${nonStrikerStat.balls || 0}</td>
                    <td class="py-2.5 px-2 text-center text-slate-700 font-mono">${nonStrikerStat.fours || 0}</td>
                    <td class="py-2.5 px-2 text-center text-slate-700 font-mono">${nonStrikerStat.sixes || 0}</td>
                    <td class="py-2.5 px-2 text-right text-slate-700 font-mono">${nonStrikerSR}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Live Bowler Table -->
          <div class="bg-white border-2 border-slate-200 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-2">
            <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>⚾ Active Bowler</span>
              <span class="text-[10px] text-slate-400 font-normal">Current Spell</span>
            </h4>
            
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead>
                  <tr class="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                    <th class="py-1.5 px-2">Bowler</th>
                    <th class="py-1.5 px-2 text-center font-mono">O</th>
                    <th class="py-1.5 px-2 text-center font-mono">M</th>
                    <th class="py-1.5 px-2 text-center font-mono">R</th>
                    <th class="py-1.5 px-2 text-center font-mono">W</th>
                    <th class="py-1.5 px-2 text-right font-mono">Eco</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-bold">
                  <tr class="bg-indigo-50/50">
                    <td class="py-2.5 px-2">
                      <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        <span class="text-slate-950 font-black">${bowlerP ? bowlerP.name : 'Bowler (Not Selected)'}</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-2 text-center text-slate-800 font-mono">${bOvs}</td>
                    <td class="py-2.5 px-2 text-center text-slate-700 font-mono">${bowlerStat.maidens || 0}</td>
                    <td class="py-2.5 px-2 text-center text-slate-800 font-mono">${bowlerStat.runsConceded || 0}</td>
                    <td class="py-2.5 px-2 text-center text-rose-700 font-black font-mono">${bowlerStat.wickets || 0}</td>
                    <td class="py-2.5 px-2 text-right text-slate-700 font-mono">${bowlerEco}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Recent Overs Ticker -->
          <div class="bg-white border-2 border-slate-200 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-2">
            <div class="flex items-center justify-between text-xs font-black text-slate-900 uppercase">
              <span>⚡ Recent Deliveries</span>
              <span class="text-[10px] text-slate-400 font-normal">This Over:</span>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${(state.overBalls || []).length > 0 ? (state.overBalls || []).map(b => {
                let pillClass = 'bg-slate-100 text-slate-800 border-slate-300';
                if (b.type === 'four') pillClass = 'bg-blue-600 text-white border-blue-700 font-black';
                if (b.type === 'six') pillClass = 'bg-amber-400 text-slate-950 border-amber-500 font-black';
                if (b.type === 'wicket') pillClass = 'bg-rose-600 text-white border-rose-700 font-black';
                if (b.type === 'wide' || b.type === 'noball') pillClass = 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
                return `<span class="px-2 py-1 rounded-xl border font-mono font-black text-xs shadow-2xs ${pillClass}">${b.label}</span>`;
              }).join('') : '<span class="text-slate-400 italic text-xs">No balls in this over yet</span>'}
            </div>
          </div>
        </div>
      `;
    }

    // 2. SCORECARD TAB
    else if (activeTab === 'scorecard') {
      const isTeamAInnings = activeScorecardInnings === 1;
      const battingTeamId = isTeamAInnings ? fixture.teamAId : fixture.teamBId;
      const bowlingTeamId = isTeamAInnings ? fixture.teamBId : fixture.teamAId;
      const battingTeamName = isTeamAInnings ? fixture.teamAName : fixture.teamBName;
      const bowlingTeamName = isTeamAInnings ? fixture.teamBName : fixture.teamAName;

      const battingPlayers = isTeamAInnings ? playing11A : playing11B;
      const bowlingPlayers = isTeamAInnings ? playing11B : playing11A;

      const inningsScore = isTeamAInnings ? (fixture.teamAScore || state) : (fixture.teamBScore || state);

      contentArea.innerHTML = `
        <div class="space-y-3.5 animate-fade-in">
          <!-- Innings Switcher Tabs -->
          <div class="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button id="sc-tab-inn1" class="py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isTeamAInnings ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'}">
              🏏 ${fixture.teamAName} (1st Inn)
            </button>
            <button id="sc-tab-inn2" class="py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${!isTeamAInnings ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'}">
              🏏 ${fixture.teamBName} (2nd Inn)
            </button>
          </div>

          <!-- Full Batting Scorecard Table -->
          <div class="bg-white border-2 border-slate-200 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider">
                ${battingTeamName} Batting Scorecard
              </h4>
              <span class="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                ${inningsScore.runs || 0}/${inningsScore.wickets || 0} (${inningsScore.overs || 0}.${inningsScore.balls || 0} ov)
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead>
                  <tr class="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                    <th class="py-1.5 px-2">Batsman</th>
                    <th class="py-1.5 px-2 text-center font-mono">R</th>
                    <th class="py-1.5 px-2 text-center font-mono">B</th>
                    <th class="py-1.5 px-2 text-center font-mono">4s</th>
                    <th class="py-1.5 px-2 text-center font-mono">6s</th>
                    <th class="py-1.5 px-2 text-right font-mono">SR</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-bold">
                  ${battingPlayers.map(p => {
                    const stat = pStats[p.id] || {};
                    const hasBatted = (stat.balls > 0 || stat.runs > 0 || stat.dismissed || state.strikerId === p.id || state.nonStrikerId === p.id);
                    const isOut = stat.dismissed;
                    const sr = stat.balls > 0 ? (((stat.runs || 0) / stat.balls) * 100).toFixed(1) : '-';
                    const dismissalTxt = isOut ? `out (${stat.dismissalInfo || 'Dismissed'})` : (hasBatted ? `<span class="text-emerald-700 font-bold">not out *</span>` : `<span class="text-slate-400 font-normal">did not bat</span>`);

                    return `
                      <tr class="${hasBatted ? 'hover:bg-slate-50' : 'opacity-60'}">
                        <td class="py-2 px-2">
                          <div class="font-black text-slate-900">${p.name} ${p.isCaptain ? '<span class="text-[9px] bg-amber-400 text-slate-950 px-1 py-0.2 rounded">C</span>' : ''}</div>
                          <div class="text-[10px] font-medium text-slate-500">${dismissalTxt}</div>
                        </td>
                        <td class="py-2 px-2 text-center font-black font-mono ${hasBatted ? 'text-slate-900' : 'text-slate-400'}">${hasBatted ? (stat.runs || 0) : '-'}</td>
                        <td class="py-2 px-2 text-center font-mono ${hasBatted ? 'text-slate-700' : 'text-slate-400'}">${hasBatted ? (stat.balls || 0) : '-'}</td>
                        <td class="py-2 px-2 text-center font-mono ${hasBatted ? 'text-slate-700' : 'text-slate-400'}">${hasBatted ? (stat.fours || 0) : '-'}</td>
                        <td class="py-2 px-2 text-center font-mono ${hasBatted ? 'text-slate-700' : 'text-slate-400'}">${hasBatted ? (stat.sixes || 0) : '-'}</td>
                        <td class="py-2 px-2 text-right font-mono ${hasBatted ? 'text-slate-700' : 'text-slate-400'}">${sr}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Extras & Totals Row -->
            <div class="pt-2 border-t border-slate-200 text-xs flex justify-between items-center bg-slate-50 p-2.5 rounded-2xl font-bold">
              <span class="text-slate-600">Extras: <strong class="text-slate-900 font-mono">${inningsScore.extras || 0}</strong></span>
              <span class="text-slate-900">Total: <strong class="text-emerald-700 font-mono text-sm">${inningsScore.runs || 0}/${inningsScore.wickets || 0}</strong> (${inningsScore.overs || 0}.${inningsScore.balls || 0} ov)</span>
            </div>
          </div>

          <!-- Full Bowling Scorecard Table -->
          <div class="bg-white border-2 border-slate-200 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-3">
            <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              ${bowlingTeamName} Bowling Figures
            </h4>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead>
                  <tr class="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                    <th class="py-1.5 px-2">Bowler</th>
                    <th class="py-1.5 px-2 text-center font-mono">O</th>
                    <th class="py-1.5 px-2 text-center font-mono">M</th>
                    <th class="py-1.5 px-2 text-center font-mono">R</th>
                    <th class="py-1.5 px-2 text-center font-mono">W</th>
                    <th class="py-1.5 px-2 text-right font-mono">Eco</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-bold">
                  ${bowlingPlayers.filter(p => (pStats[p.id]?.ballsBowled > 0 || state.bowlerId === p.id)).map(p => {
                    const stat = pStats[p.id] || {};
                    const bBalls = stat.ballsBowled || 0;
                    const bOvs = `${Math.floor(bBalls / 6)}.${bBalls % 6}`;
                    const totalOversDec = bBalls / 6;
                    const eco = totalOversDec > 0 ? ((stat.runsConceded || 0) / totalOversDec).toFixed(2) : '0.00';

                    return `
                      <tr class="hover:bg-slate-50">
                        <td class="py-2.5 px-2 font-black text-slate-900">${p.name}</td>
                        <td class="py-2.5 px-2 text-center font-mono text-slate-800">${bOvs}</td>
                        <td class="py-2.5 px-2 text-center font-mono text-slate-700">${stat.maidens || 0}</td>
                        <td class="py-2.5 px-2 text-center font-mono text-slate-800">${stat.runsConceded || 0}</td>
                        <td class="py-2.5 px-2 text-center font-mono text-rose-700 font-black">${stat.wickets || 0}</td>
                        <td class="py-2.5 px-2 text-right font-mono text-slate-700">${eco}</td>
                      </tr>
                    `;
                  }).join('') || `<tr><td colspan="6" class="py-4 text-center text-slate-400 text-xs">No bowling recorded for this innings yet.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById('sc-tab-inn1')?.addEventListener('click', () => {
        activeScorecardInnings = 1;
        renderMatchCenterContent();
      });
      document.getElementById('sc-tab-inn2')?.addEventListener('click', () => {
        activeScorecardInnings = 2;
        renderMatchCenterContent();
      });
    }

    // 3. BALLS TAB (COMMENTARY)
    else if (activeTab === 'balls') {
      const ballList = (state.ballHistory || []).filter(b => b.innings === activeBallsInnings);

      contentArea.innerHTML = `
        <div class="space-y-3.5 animate-fade-in">
          <!-- Innings Switcher -->
          <div class="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button id="balls-tab-inn1" class="py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeBallsInnings === 1 ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'}">
              1st Innings
            </button>
            <button id="balls-tab-inn2" class="py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeBallsInnings === 2 ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'}">
              2nd Innings
            </button>
          </div>

          ${ballList.length === 0 ? `
            <div class="p-8 text-center space-y-2 bg-white rounded-3xl border border-slate-200">
              <div class="text-3xl">⚾</div>
              <h4 class="text-xs font-black text-slate-900">No ball commentary recorded yet</h4>
              <p class="text-[11px] text-slate-400">Balls delivered will appear here in real-time with ball-by-ball commentary.</p>
            </div>
          ` : `
            <div class="space-y-2.5">
              ${ballList.map(b => {
                let badgeClass = 'bg-slate-100 text-slate-800 border-slate-300';
                if (b.type === 'four') badgeClass = 'bg-blue-600 text-white border-blue-700';
                if (b.type === 'six') badgeClass = 'bg-amber-400 text-slate-950 border-amber-500 font-black';
                if (b.type === 'wicket') badgeClass = 'bg-rose-600 text-white border-rose-700 font-black';
                if (b.type === 'wide' || b.type === 'noball') badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';

                return `
                  <div class="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 transition-all flex items-start gap-3">
                    <div class="flex flex-col items-center shrink-0 w-12">
                      <span class="text-[10px] font-black text-slate-400 font-mono">${b.overNum}</span>
                      <span class="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs font-mono border ${badgeClass} shadow-2xs mt-0.5">
                        ${b.label}
                      </span>
                    </div>
                    <div class="flex-grow min-w-0">
                      <div class="text-xs font-black text-slate-900 leading-tight">
                        ${b.bowlerName || 'Bowler'} to ${b.batterName || 'Batter'}
                      </div>
                      <div class="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed">
                        ${b.commentary || 'Delivery bowled.'}
                      </div>
                    </div>
                    <span class="text-[9px] text-slate-400 font-mono shrink-0">${b.timestamp || ''}</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;

      document.getElementById('balls-tab-inn1')?.addEventListener('click', () => {
        activeBallsInnings = 1;
        renderMatchCenterContent();
      });
      document.getElementById('balls-tab-inn2')?.addEventListener('click', () => {
        activeBallsInnings = 2;
        renderMatchCenterContent();
      });
    }

    // 4. SUPER STARS & 2D CRICKET GROUND
    else if (activeTab === 'superstars') {
      const allPlayersList = [...playing11A.map(p => ({ ...p, teamLabel: fixture.teamAName, teamColor: 'emerald' })), ...playing11B.map(p => ({ ...p, teamLabel: fixture.teamBName, teamColor: 'sky' }))];
      const filteredPlayers = activeSuperStarsFilter === 'ALL' ? allPlayersList : (activeSuperStarsFilter === 'TEAMA' ? allPlayersList.filter(p => p.teamId === fixture.teamAId) : allPlayersList.filter(p => p.teamId === fixture.teamBId));

      contentArea.innerHTML = `
        <div class="space-y-3.5 animate-fade-in">
          <!-- Filter Buttons -->
          <div class="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button id="ss-btn-all" class="py-1.5 px-2 rounded-xl font-black text-xs transition-all cursor-pointer ${activeSuperStarsFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              All Players (${allPlayersList.length})
            </button>
            <button id="ss-btn-teama" class="py-1.5 px-2 rounded-xl font-black text-xs transition-all cursor-pointer ${activeSuperStarsFilter === 'TEAMA' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              ${fixture.teamAName}
            </button>
            <button id="ss-btn-teamb" class="py-1.5 px-2 rounded-xl font-black text-xs transition-all cursor-pointer ${activeSuperStarsFilter === 'TEAMB' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              ${fixture.teamBName}
            </button>
          </div>

          <!-- 2D Cricket Field Ground Canvas / Visualization -->
          <div class="relative bg-gradient-to-b from-emerald-600 via-green-600 to-emerald-700 rounded-3xl p-4 border-4 border-white shadow-lg overflow-hidden min-h-[380px] flex flex-col justify-between items-center text-white">
            
            <!-- Boundary Oval Inner Ring -->
            <div class="absolute inset-4 rounded-[100px] border-2 border-dashed border-white/40 pointer-events-none"></div>
            
            <!-- 30-Yard Circle Inner Oval -->
            <div class="absolute inset-12 sm:inset-16 rounded-[80px] border-2 border-white/50 bg-emerald-500/20 pointer-events-none"></div>
            
            <!-- Central Pitch Strip -->
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 sm:w-20 h-32 sm:h-36 bg-amber-100/90 rounded-xl border border-amber-300 shadow-inner flex flex-col justify-between items-center py-2 pointer-events-none">
              <div class="w-8 h-1 bg-white border border-slate-400"></div>
              <div class="text-[9px] font-black text-amber-900 uppercase tracking-widest font-mono">PITCH</div>
              <div class="w-8 h-1 bg-white border border-slate-400"></div>
            </div>

            <!-- Field Top / Bowler End Jersey -->
            <div class="z-10 text-center space-y-1">
              ${filteredPlayers[0] ? `
                <div class="inline-flex flex-col items-center">
                  <div class="relative">
                    <span class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md border-2 border-white">👕</span>
                    <span class="absolute -top-2 -right-2 px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full shadow-2xs font-mono">⭐ 4.2</span>
                  </div>
                  <div class="bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[10px] font-black mt-1 text-white border border-white/20">
                    ${filteredPlayers[0].name}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Midfield / Strike End Jersey -->
            <div class="z-10 text-center space-y-1 my-auto">
              ${filteredPlayers[1] ? `
                <div class="inline-flex flex-col items-center">
                  <div class="relative">
                    <span class="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-md border-2 border-white">👕</span>
                    <span class="absolute -top-2 -right-2 px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full shadow-2xs font-mono">⭐ 4.8</span>
                  </div>
                  <div class="bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[10px] font-black mt-1 text-white border border-white/20">
                    ${filteredPlayers[1].name}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Wicketkeeper / Deep Field Jersey -->
            <div class="z-10 text-center space-y-1">
              ${filteredPlayers[2] ? `
                <div class="inline-flex flex-col items-center">
                  <div class="relative">
                    <span class="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md border-2 border-white">🧤</span>
                    <span class="absolute -top-2 -right-2 px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full shadow-2xs font-mono">⭐ 3.9</span>
                  </div>
                  <div class="bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[10px] font-black mt-1 text-white border border-white/20">
                    ${filteredPlayers[2].name}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Super Stars Cards List -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            ${filteredPlayers.map((p, idx) => {
              const stat = pStats[p.id] || {};
              const starRating = (3.0 + ((stat.runs || 0) * 0.1) + ((stat.wickets || 0) * 0.5)).toFixed(1);
              return `
                <div class="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center justify-between gap-2.5">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <img src="${p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png'}" class="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                    <div class="truncate">
                      <div class="text-xs font-black text-slate-900 truncate flex items-center gap-1">
                        <span>${p.name}</span>
                        ${p.isCaptain ? '<span class="px-1 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded">C</span>' : ''}
                      </div>
                      <div class="text-[10px] text-slate-500 truncate">
                        ${p.category || 'All Rounder'} • ${p.teamLabel}
                      </div>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 bg-amber-50 text-amber-950 border border-amber-300 font-mono font-black text-xs rounded-xl shadow-2xs shrink-0">
                    ⭐ ${starRating}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      document.getElementById('ss-btn-all')?.addEventListener('click', () => {
        activeSuperStarsFilter = 'ALL';
        renderMatchCenterContent();
      });
      document.getElementById('ss-btn-teama')?.addEventListener('click', () => {
        activeSuperStarsFilter = 'TEAMA';
        renderMatchCenterContent();
      });
      document.getElementById('ss-btn-teamb')?.addEventListener('click', () => {
        activeSuperStarsFilter = 'TEAMB';
        renderMatchCenterContent();
      });
    }

    // 5. INFO TAB
    else if (activeTab === 'info') {
      contentArea.innerHTML = `
        <div class="space-y-3.5 animate-fade-in">
          <div class="bg-white border-2 border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
            <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Match Information & Venue
            </h4>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span class="text-[10px] text-slate-400 uppercase font-black block">Tournament</span>
                <span class="font-black text-slate-900">${fixture.leagueCode || 'T'} Premier League</span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span class="text-[10px] text-slate-400 uppercase font-black block">Match Number & Stage</span>
                <span class="font-black text-slate-900">Match #${fixture.matchNo || 1} • ${fixture.stage || 'League Stage'}</span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span class="text-[10px] text-slate-400 uppercase font-black block">Date & Time</span>
                <span class="font-black text-slate-900">🗓️ ${fixture.date || 'TBD'} • ⏱️ ${fixture.time || '09:00 AM'}</span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span class="text-[10px] text-slate-400 uppercase font-black block">Venue</span>
                <span class="font-black text-slate-900">📍 ${fixture.venue || 'JHANKRA SCHOOL GROUND'}</span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 sm:col-span-2">
                <span class="text-[10px] text-slate-400 uppercase font-black block">Toss Decision</span>
                <span class="font-black text-amber-900">🪙 ${fixture.tossDetails || state.tossDetails || 'Toss yet to take place'}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Bind top tabs
  document.querySelectorAll('.mc-nav-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', (e) => {
      activeTab = e.currentTarget.getAttribute('data-tab');
      document.querySelectorAll('.mc-nav-tab').forEach(b => {
        b.className = `mc-nav-tab py-2 px-3 rounded-xl transition-all cursor-pointer shrink-0 ${b.getAttribute('data-tab') === activeTab ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white'}`;
      });
      renderMatchCenterContent();
    });
  });

  window.renderActiveMatchCenter = renderMatchCenterContent;

  // --- REAL-TIME LIVE UPDATES while the Match Centre is open ---
  // Redraw on every cloud fixture change (SSE → 'fixtures_updated'), and poll the
  // cloud every few seconds as a reliable fallback for spectator devices.
  mcLiveHandler = () => { if (document.getElementById('match-center-modal')) renderMatchCenterContent(); };
  window.addEventListener('fixtures_updated', mcLiveHandler);
  window.addEventListener('live_auction_updated', mcLiveHandler);
  mcPollTimer = setInterval(() => {
    if (!document.getElementById('match-center-modal')) { removeModal(); return; }
    Promise.resolve(store.syncWithCloud()).then(() => renderMatchCenterContent()).catch(() => renderMatchCenterContent());
  }, 4000);

  renderMatchCenterContent();
}

export function openMatchPlayingXIModal(fixtureId) {
  document.getElementById('match-lineups-modal')?.remove();

  const fixture = store.getFixtures().find(f => f.id === fixtureId);
  if (!fixture) return;

  const teamAPlayers = store.getPlayers().filter(p => p.teamId === fixture.teamAId);
  const teamBPlayers = store.getPlayers().filter(p => p.teamId === fixture.teamBId);

  const pxiA = fixture.playingXI?.[fixture.teamAId] || { playing11Ids: teamAPlayers.slice(0, 11).map(p => p.id), twelfthManId: teamAPlayers[11]?.id || '' };
  const pxiB = fixture.playingXI?.[fixture.teamBId] || { playing11Ids: teamBPlayers.slice(0, 11).map(p => p.id), twelfthManId: teamBPlayers[11]?.id || '' };

  const playing11A = teamAPlayers.filter(p => (pxiA.playing11Ids || []).includes(p.id));
  const twelfthManA = (pxiA.twelfthManId && !(pxiA.playing11Ids || []).includes(pxiA.twelfthManId)) 
    ? teamAPlayers.find(p => p.id === pxiA.twelfthManId) 
    : teamAPlayers.find(p => !(pxiA.playing11Ids || []).includes(p.id));

  const playing11B = teamBPlayers.filter(p => (pxiB.playing11Ids || []).includes(p.id));
  const twelfthManB = (pxiB.twelfthManId && !(pxiB.playing11Ids || []).includes(pxiB.twelfthManId)) 
    ? teamBPlayers.find(p => p.id === pxiB.twelfthManId) 
    : teamBPlayers.find(p => !(pxiB.playing11Ids || []).includes(p.id));

  const pStats = fixture.liveMatchState?.playerStats || {};
  const liveState = fixture.liveMatchState || {};

  const renderPlayerRow = (p, isTwelfth = false) => {
    const photo = p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png';
    const stat = pStats[p.id] || {};
    const isStriker = liveState.strikerId === p.id;
    const isNonStriker = liveState.nonStrikerId === p.id;
    const isCurrentBowler = liveState.bowlerId === p.id;

    const hasBatted = (stat.balls !== undefined && stat.balls > 0) || (stat.runs !== undefined && stat.runs > 0) || isStriker || isNonStriker || stat.dismissed;
    const hasBowled = (stat.ballsBowled && stat.ballsBowled > 0) || isCurrentBowler || (stat.wickets && stat.wickets > 0);

    let batBoxHtml = '';
    if (hasBatted) {
      const sr = (stat.balls && stat.balls > 0) ? (((stat.runs || 0) / stat.balls) * 100).toFixed(1) : '0.0';
      const isNotOut = !stat.dismissed;
      batBoxHtml = `
        <div class="flex items-center gap-1.5 flex-wrap">
          <div class="flex items-center bg-emerald-50 border border-emerald-300 px-2 py-1 rounded-xl shadow-2xs">
            <span class="text-[9px] text-emerald-800 font-bold uppercase mr-1">R</span>
            <span class="text-xs font-black text-emerald-950 font-mono">${stat.runs || 0}${isNotOut && (isStriker || isNonStriker) ? '*' : ''}</span>
          </div>
          <div class="flex items-center bg-slate-100 border border-slate-200 px-2 py-1 rounded-xl shadow-2xs">
            <span class="text-[9px] text-slate-500 font-bold uppercase mr-1">B</span>
            <span class="text-xs font-black text-slate-900 font-mono">${stat.balls || 0}</span>
          </div>
          <div class="flex items-center bg-amber-50 border border-amber-200 px-2 py-1 rounded-xl shadow-2xs">
            <span class="text-[9px] text-amber-800 font-bold uppercase mr-1">4s</span>
            <span class="text-xs font-black text-amber-950 font-mono">${stat.fours || 0}</span>
          </div>
          <div class="flex items-center bg-purple-50 border border-purple-200 px-2 py-1 rounded-xl shadow-2xs">
            <span class="text-[9px] text-purple-800 font-bold uppercase mr-1">6s</span>
            <span class="text-xs font-black text-purple-950 font-mono">${stat.sixes || 0}</span>
          </div>
          <div class="flex items-center bg-sky-50 border border-sky-200 px-2 py-1 rounded-xl shadow-2xs">
            <span class="text-[9px] text-sky-800 font-bold uppercase mr-1">SR</span>
            <span class="text-xs font-black text-sky-950 font-mono">${sr}</span>
          </div>
          ${isStriker ? `<span class="px-2 py-0.5 bg-emerald-600 text-white font-black text-[9px] rounded-lg animate-pulse shadow-2xs">🏏 ON STRIKE</span>` : ''}
          ${isNonStriker ? `<span class="px-2 py-0.5 bg-teal-600 text-white font-black text-[9px] rounded-lg shadow-2xs">🏏 NON-STRIKER</span>` : ''}
          ${stat.dismissed ? `<span class="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 font-black text-[9px] rounded-lg shadow-2xs">OUT (${stat.dismissalInfo || 'Dismissed'})</span>` : ''}
        </div>
      `;
    }

    let bowlBoxHtml = '';
    if (hasBowled) {
      const bBalls = stat.ballsBowled || 0;
      const bOvers = Math.floor(bBalls / 6);
      const bRemBalls = bBalls % 6;
      const totalOversDec = bBalls / 6;
      const eco = totalOversDec > 0 ? ((stat.runsConceded || 0) / totalOversDec).toFixed(2) : '0.00';

      bowlBoxHtml = `
        <div class="flex items-center gap-1.5 flex-wrap mt-1">
          <div class="flex items-center bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-xl shadow-2xs">
            <span class="text-[9px] text-indigo-800 font-bold uppercase mr-1">O</span>
            <span class="text-xs font-black text-indigo-950 font-mono">${bOvers}.${bRemBalls}</span>
          </div>
          <div class="flex items-center bg-slate-100 border border-slate-200 px-2 py-1 rounded-xl shadow-2xs">
            <span class="text-[9px] text-slate-500 font-bold uppercase mr-1">R</span>
            <span class="text-xs font-black text-slate-900 font-mono">${stat.runsConceded || 0}</span>
          </div>
          <div class="flex items-center bg-rose-50 border border-rose-300 px-2 py-1 rounded-xl shadow-2xs">
            <span class="text-[9px] text-rose-800 font-bold uppercase mr-1">W</span>
            <span class="text-xs font-black text-rose-700 font-mono">${stat.wickets || 0}</span>
          </div>
          <div class="flex items-center bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xl shadow-2xs">
            <span class="text-[9px] text-emerald-800 font-bold uppercase mr-1">ECO</span>
            <span class="text-xs font-black text-emerald-950 font-mono">${eco}</span>
          </div>
          ${isCurrentBowler ? `<span class="px-2 py-0.5 bg-indigo-600 text-white font-black text-[9px] rounded-lg animate-pulse shadow-2xs">⚾ BOWLING</span>` : ''}
        </div>
      `;
    }

    const hasAnyLiveStat = hasBatted || hasBowled;

    return `
      <div class="p-3 bg-white border-2 ${isStriker || isCurrentBowler ? 'border-emerald-500 shadow-sm' : 'border-slate-200'} rounded-2xl shadow-2xs hover:border-emerald-400 transition-all space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <img src="${photo}" class="w-10 h-10 rounded-2xl object-cover border border-slate-200 shadow-2xs bg-slate-50 shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
            <div class="truncate">
              <div class="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5 truncate">
                <span class="truncate">${p.name}</span>
                ${isTwelfth ? `<span class="px-1.5 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 font-mono text-[9px] font-black rounded uppercase shrink-0">12th Man</span>` : ''}
                ${p.isCaptain ? `<span class="px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded uppercase shrink-0">C</span>` : ''}
                ${p.isWicketKeeper ? `<span class="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded uppercase shrink-0">WK</span>` : ''}
              </div>
              <div class="text-[10px] text-slate-500 font-bold truncate">
                ${p.category || 'All Rounder'} • ${p.village || 'N/A'}
              </div>
            </div>
          </div>

          <div class="shrink-0 text-right">
            ${isTwelfth ? `
              <span class="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-[10px] font-black shadow-2xs">
                🛡️ Substitute
              </span>
            ` : `
              <span class="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-[10px] font-black shadow-2xs">
                🏏 Starting XI
              </span>
            `}
          </div>
        </div>

        ${hasAnyLiveStat ? `
          <div class="pt-2 border-t border-slate-100 space-y-1.5 bg-slate-50/70 p-2.5 rounded-xl">
            ${batBoxHtml}
            ${bowlBoxHtml}
          </div>
        ` : `
          <div class="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
            <span>Match Status</span>
            <span class="text-slate-500 font-bold">Yet to Bat / Bowl</span>
          </div>
        `}
      </div>
    `;
  };

  const modalHtml = `
    <div id="match-lineups-modal" class="fixed inset-0 z-[70] modal-overlay flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div class="bg-white border-2 border-emerald-500 max-w-2xl w-full p-4 sm:p-6 relative space-y-4 animate-fade-in rounded-3xl shadow-2xl text-slate-900 max-h-[90vh] flex flex-col justify-between">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 text-base shadow-2xs">👥</span>
            <div>
              <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-mono text-[9px] font-black rounded border border-emerald-200 uppercase">${fixture.leagueCode || 'T'} MATCH LINEUPS</span>
              <h3 class="text-base font-black text-slate-900 leading-tight mt-0.5">Playing 11 & Match Scorecard</h3>
            </div>
          </div>
          <button id="close-lineups-btn" class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Toss Details Ribbon -->
        ${(fixture.tossDetails || fixture.liveMatchState?.tossDetails) ? `
          <div class="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs shrink-0">
            <span>🪙</span> <span>${fixture.tossDetails || fixture.liveMatchState?.tossDetails}</span>
          </div>
        ` : ''}

        <!-- Team Selector Tabs -->
        <div class="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
          <button id="lineup-tab-teama" class="py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-emerald-600 text-white shadow-xs">
            🏏 ${fixture.teamAName} (${playing11A.length})
          </button>
          <button id="lineup-tab-teamb" class="py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-50">
            🏏 ${fixture.teamBName} (${playing11B.length})
          </button>
        </div>

        <!-- Lineup Content Area -->
        <div id="lineup-roster-content" class="space-y-2.5 overflow-y-auto max-h-[48vh] pr-1 scrollbar-thin"></div>

        <!-- Footer -->
        <div class="pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button id="close-lineups-bottom-btn" class="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all">
            Close Lineups
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const removeModal = () => document.getElementById('match-lineups-modal')?.remove();
  document.getElementById('close-lineups-btn')?.addEventListener('click', removeModal);
  document.getElementById('close-lineups-bottom-btn')?.addEventListener('click', removeModal);

  const tabA = document.getElementById('lineup-tab-teama');
  const tabB = document.getElementById('lineup-tab-teamb');
  const rosterContent = document.getElementById('lineup-roster-content');

  let activeLineupTab = 'teamA';

  function renderLineupRoster() {
    const isTeamA = activeLineupTab === 'teamA';
    const teamName = isTeamA ? fixture.teamAName : fixture.teamBName;
    const playing11 = isTeamA ? playing11A : playing11B;
    const twelfth = isTeamA ? twelfthManA : twelfthManB;

    if (playing11.length === 0) {
      rosterContent.innerHTML = `
        <div class="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-slate-200">
          Playing 11 lineup for ${teamName} has not been confirmed yet.
        </div>
      `;
      return;
    }

    rosterContent.innerHTML = `
      <div class="space-y-2.5">
        <div class="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">Starting 11 Players & Live Score:</div>
        ${playing11.map(p => renderPlayerRow(p, false)).join('')}
        ${twelfth ? `
          <div class="text-[11px] font-black text-amber-700 uppercase tracking-wider px-1 pt-2 border-t border-slate-200">12th Man / Impact Substitute:</div>
          ${renderPlayerRow(twelfth, true)}
        ` : ''}
      </div>
    `;
  }

  tabA?.addEventListener('click', () => {
    activeLineupTab = 'teamA';
    tabA.className = "py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-emerald-600 text-white shadow-xs";
    tabB.className = "py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-50";
    renderLineupRoster();
  });

  tabB?.addEventListener('click', () => {
    activeLineupTab = 'teamB';
    tabB.className = "py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-sky-600 text-white shadow-xs";
    tabA.className = "py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-50";
    renderLineupRoster();
  });

  renderLineupRoster();
}
window.openMatchPlayingXIModal = openMatchPlayingXIModal;

function renderLiveAuctionView(container) {
  if (auctionPollInterval) {
    clearInterval(auctionPollInterval);
    auctionPollInterval = null;
  }

  const liveState = store.getLiveAuctionStateSync();
  const hasActivePlayer = liveState && liveState.active_player_id;

  if (!hasActivePlayer) {
    container.innerHTML = `
      <div class="space-y-6 animate-fade-in pb-16 max-w-2xl mx-auto px-2 sm:px-4 py-8 sm:py-12">
        <div class="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-md">
          <div class="w-16 h-16 bg-amber-100 text-amber-800 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-xs font-black">
            🔨
          </div>
          
          <div class="space-y-2">
            <span class="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full border border-emerald-300">
              ✅ AUCTION CONCLUDED & ARCHIVED
            </span>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              No Live Auction in Session
            </h2>
            <p class="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              The player auction has completed. All franchise squads, player sold records, icon player allocations, and financial ledgers are securely archived under the <strong>Tournament Hub</strong>.
            </p>
          </div>

          <div class="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button id="auction-go-to-tournament-hub-btn" class="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5 border border-amber-300 cursor-pointer transition-all">
              <span>📜 Visit Tournament Hub & View Auction Summary</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('auction-go-to-tournament-hub-btn')?.addEventListener('click', () => {
      navigate('tournament-hub');
    });

    // Check periodically if admin starts an auction
    auctionPollInterval = setInterval(async () => {
      const state = await store.fetchLiveAuctionState();
      if (state && state.active_player_id) {
        clearInterval(auctionPollInterval);
        renderLiveAuctionView(container);
      }
    }, 4000);

    return;
  }

  let playerSearchQuery = '';
  let activeStatusTab = 'all'; // 'all', 'sold', 'unsold', 'pending'

  // 1. Render outer shell ONCE in crisp professional theme
  container.innerHTML = `
    <div class="space-y-5 sm:space-y-6 animate-fade-in pb-16 max-w-4xl mx-auto px-1 sm:px-4">
      
      <!-- Top Header matching screenshot -->
      <div class="bg-white border-2 border-slate-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center shrink-0 text-xl shadow-2xs">
            🔨
          </span>
          <div>
            <h1 class="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              Live Player Auction Hub
            </h1>
            <p class="text-[10px] sm:text-xs text-slate-500 font-bold">Real-time bids, live purse tracking & official team squads</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="auction-open-projector-view-btn" onclick="window.openLiveAuctionProjectorView ? window.openLiveAuctionProjectorView() : null" class="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105 border border-amber-300 cursor-pointer active:scale-95 select-none" title="Open Single-Screen Live Projector View">
            <span class="text-base">📽️</span> <span>Projector Screen</span>
          </button>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 shadow-2xs">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> LIVE
          </span>
        </div>
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
    const pendingList = allPlayers.filter(p => !p.teamId && p.auctionStatus !== 'SOLD' && p.auctionStatus !== 'UNSOLD');

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
                      <div class="text-[9px] text-slate-400 font-medium truncate leading-tight">📍 ${p.village || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td class="py-2 px-2.5">
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap ${
                    p.category === 'Batsman' ? 'bg-sky-50 text-sky-700 border border-sky-300' :
                    p.category === 'Bowler' ? 'bg-purple-50 text-purple-700 border border-purple-300' :
                    p.category === 'Wicket Keeper' ? 'bg-amber-50 text-amber-800 border border-amber-300' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  }">
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

  const renderActiveBlock = (state, teams, allPlayers) => {
    const activeBlockWrapper = document.getElementById('auction-active-block-container');
    if (!activeBlockWrapper) return;

    if (state && state.active_player_id) {
      const bidderTeam = teams.find(t => t.id === state.highest_bidder_team_id);
      const isUnsoldState = (state.status === 'UNSOLD' || state.is_unsold);
      const isSoldState = (state.status === 'SOLD' || state.is_sold);
      const isNewPlayer = (lastActivePlayerId !== state.active_player_id);
      const playerCardEl = document.getElementById('auction-player-card-box');

      if (isNewPlayer || !playerCardEl) {
        lastActivePlayerId = state.active_player_id;
        lastActiveStatus = state.status;
        const playerPhoto = getOptimizedImageUrl(state.photoUrl, 600, 600) || 'assets/card_jsl_user.png';

        activeBlockWrapper.innerHTML = `
          <div id="auction-player-card-box" class="relative rounded-3xl overflow-hidden shadow-2xl border-2 ${isSoldState ? 'border-emerald-500' : isUnsoldState ? 'border-rose-500' : 'border-emerald-500/40'} min-h-[460px] sm:min-h-[540px] md:min-h-[580px] max-w-2xl mx-auto flex flex-col justify-between p-3 sm:p-4 bg-slate-900 animate-fade-in">
            <!-- Full Crystal Clear Real Player Photo (Zero Dark Shading/Light Overlay) -->
            <img id="auction-player-photo-img" src="${playerPhoto}" class="absolute inset-0 w-full h-full object-cover sm:object-contain object-top" alt="${state.name}" onerror="this.src='assets/card_jsl_user.png'" />

            <div id="auction-stamp-slot">
              ${isSoldState ? `
                <div id="auction-stamp-overlay" class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-slate-950/20">
                  <svg viewBox="0 0 300 300" class="w-60 h-60 sm:w-80 sm:h-80 stamp-slam-animate select-none drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                    <g transform="rotate(-13 150 150)">
                      <circle cx="150" cy="150" r="140" fill="none" stroke="#059669" stroke-width="7" stroke-dasharray="20 4 15 3 25 5" />
                      <circle cx="150" cy="150" r="128" fill="none" stroke="#059669" stroke-width="2.5" />
                      <path id="sold-arc-top-v9" d="M 35,150 A 115,115 0 0,1 265,150" fill="none" />
                      <text fill="#059669" font-size="22" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6">
                        <textPath href="#sold-arc-top-v9" startOffset="50%" text-anchor="middle">LIVE AUCTION</textPath>
                      </text>
                      <text x="105" y="94" fill="#059669" font-size="20" text-anchor="middle">★</text>
                      <text x="150" y="82" fill="#059669" font-size="28" text-anchor="middle">★</text>
                      <text x="195" y="94" fill="#059669" font-size="20" text-anchor="middle">★</text>
                      <text x="105" y="222" fill="#059669" font-size="20" text-anchor="middle">★</text>
                      <text x="150" y="234" fill="#059669" font-size="28" text-anchor="middle">★</text>
                      <text x="195" y="222" fill="#059669" font-size="20" text-anchor="middle">★</text>
                      <path id="sold-arc-bottom-v9" d="M 265,150 A 115,115 0 0,1 35,150" fill="none" />
                      <text fill="#059669" font-size="20" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6">
                        <textPath href="#sold-arc-bottom-v9" startOffset="50%" text-anchor="middle">OFFICIALLY SIGNED</textPath>
                      </text>
                      <rect x="5" y="106" width="290" height="88" rx="16" fill="#059669" stroke="#ffffff" stroke-width="4" />
                      <text x="150" y="152" fill="#ffffff" font-size="46" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="8" text-anchor="middle">SOLD</text>
                      <text x="150" y="178" fill="#fef08a" font-size="14" font-weight="900" font-family="'Arial', sans-serif" text-anchor="middle">${bidderTeam ? bidderTeam.name + ' • ' : ''}₹ ${Number(state.sold_price || state.current_bid || 300).toLocaleString('en-IN')}</text>
                    </g>
                  </svg>
                </div>
              ` : isUnsoldState ? `
                <div id="auction-stamp-overlay" class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-slate-950/20">
                  <svg viewBox="0 0 300 300" class="w-60 h-60 sm:w-80 sm:h-80 stamp-slam-animate select-none drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                    <g transform="rotate(-15 150 150)">
                      <circle cx="150" cy="150" r="140" fill="none" stroke="#C5221F" stroke-width="7" stroke-dasharray="18 4 12 3 24 5" />
                      <circle cx="150" cy="150" r="128" fill="none" stroke="#C5221F" stroke-width="2.5" />
                      <path id="unsold-arc-top-v9" d="M 35,150 A 115,115 0 0,1 265,150" fill="none" />
                      <text fill="#C5221F" font-size="28" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="14">
                        <textPath href="#unsold-arc-top-v9" startOffset="50%" text-anchor="middle">UNSOLD</textPath>
                      </text>
                      <text x="105" y="94" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                      <text x="150" y="82" fill="#C5221F" font-size="28" text-anchor="middle">★</text>
                      <text x="195" y="94" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                      <text x="105" y="222" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                      <text x="150" y="234" fill="#C5221F" font-size="28" text-anchor="middle">★</text>
                      <text x="195" y="222" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                      <path id="unsold-arc-bottom-v9" d="M 265,150 A 115,115 0 0,1 35,150" fill="none" />
                      <text fill="#C5221F" font-size="24" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="12">
                        <textPath href="#unsold-arc-bottom-v9" startOffset="50%" text-anchor="middle">UNSOLD</textPath>
                      </text>
                      <rect x="5" y="110" width="290" height="80" rx="16" fill="#C5221F" stroke="#ffffff" stroke-width="4" />
                      <text x="150" y="167" fill="#ffffff" font-size="52" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6" text-anchor="middle">UNSOLD</text>
                    </g>
                  </svg>
                </div>
              ` : ''}
            </div>

            <!-- TOP ROW: Upper Right Red Box with Serial ID -->
            <div class="relative z-10 flex justify-end items-center w-full">
              <span class="px-3.5 py-1.5 bg-red-600 text-white font-black font-mono text-xs sm:text-sm rounded-xl border-2 border-red-400 shadow-lg tracking-wider">
                ${state.registrationId || state.regNo || ('REG-' + String(state.displayRegistrationNumber || state.serialNo || 1).padStart(4, '0'))}
              </span>
            </div>

            <!-- LOWEST PORTION: Compact Player Details Box & Bid Shape (Max Image Visibility) -->
            <div class="relative z-10 mt-auto space-y-1.5">
              
              <!-- Compact Details Box with Larger Name & Category, SVG Icons -->
              <div class="p-2 sm:p-2.5 bg-white/95 backdrop-blur-md rounded-2xl border border-white/80 shadow-md space-y-0.5">
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-lg sm:text-2xl font-black text-slate-950 tracking-tight leading-tight truncate">
                    ${state.name}
                  </h2>
                  <span class="px-2.5 py-0.5 bg-emerald-600 text-white font-black text-xs sm:text-sm rounded-lg uppercase tracking-wider shrink-0 shadow-2xs">
                    🏏 ${state.category || 'All Rounder'}
                  </span>
                </div>

                <div class="flex items-center justify-between text-[10px] sm:text-xs text-slate-700 font-bold border-t border-slate-200/80 pt-1 flex-wrap gap-x-2 gap-y-0.5">
                  <div class="flex items-center gap-2 flex-wrap min-w-0">
                    <!-- Red Pin SVG + Address -->
                    <span class="inline-flex items-center gap-0.5 truncate text-slate-800">
                      <svg class="w-3.5 h-3.5 text-red-500 fill-red-500 shrink-0 inline-block" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      ${state.village || 'Paschim Medinipur'}
                    </span>

                    <!-- SVG Bat + Batting Style -->
                    <span class="inline-flex items-center gap-0.5 truncate text-slate-700">
                      <svg class="w-3.5 h-3.5 text-amber-600 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0-.83-.83-.83-2.17 0-3L11 10"/>
                        <path d="m16 16 6-6"/>
                      </svg>
                      ${state.battingStyle || 'Right Hand Bat'}
                    </span>

                    <!-- SVG Ball + Bowling Style -->
                    ${state.bowlingStyle && state.bowlingStyle !== 'None' ? `
                      <span class="inline-flex items-center gap-0.5 truncate text-slate-700">
                        <svg class="w-3.5 h-3.5 text-rose-600 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="9"/>
                          <path d="m4.93 4.93 4.24 4.24"/>
                          <path d="m14.83 14.83 4.24 4.24"/>
                        </svg>
                        ${state.bowlingStyle}
                      </span>
                    ` : ''}
                  </div>

                  <!-- Base Price -->
                  <span class="text-amber-800 font-mono font-black shrink-0 ml-auto text-xs sm:text-sm">Base: ₹${state.basePrice || 300}</span>
                </div>
              </div>

              <!-- High-Impact Bold Bid Shape (Red High-Glow Amount & LEADER BIDDER 🔥) -->
              <div class="grid grid-cols-2 gap-2 ${isUnsoldState ? 'bg-rose-950/95 border-2 sm:border-3 border-rose-500' : 'bg-slate-950/95 border-2 sm:border-3 border-amber-400'} backdrop-blur-2xl p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl">
                <!-- LEFT: CURRENT HIGH BID (Massive Glowing RED Display) -->
                <div class="flex flex-col justify-center">
                  <span id="auction-status-label" class="text-[9px] sm:text-[11px] font-black ${isUnsoldState ? 'text-rose-300' : 'text-amber-300'} uppercase tracking-widest block">
                    ${isSoldState ? 'AUCTION RESULT' : isUnsoldState ? 'Auction Status' : 'CURRENT HIGH BID'}
                  </span>
                  <div id="auction-live-bid-display" class="text-3xl sm:text-5xl md:text-6xl font-black ${isSoldState ? 'text-emerald-400' : isUnsoldState ? 'text-rose-400' : 'text-[#DC2626] live-bid-ambient-blink'} font-mono leading-none mt-0.5 drop-shadow-[0_4px_22px_rgba(220,38,38,0.95)]">
                    ${isSoldState ? '🔨 SOLD' : isUnsoldState ? '❌ UNSOLD' : '₹ ' + Number(state.current_bid || state.basePrice || 300).toLocaleString('en-IN')}
                  </div>
                </div>
                
                <!-- RIGHT: LEADER BIDDER 🔥 & TEAM NAME -->
                <div class="text-right border-l border-slate-800/90 pl-2.5 flex flex-col justify-center">
                  <span id="auction-bidder-label" class="text-[9px] sm:text-[11px] font-black ${isSoldState ? 'text-emerald-400' : isUnsoldState ? 'text-rose-400' : 'text-amber-400'} uppercase tracking-widest flex items-center justify-end gap-1">
                    ${isSoldState ? 'WINNING FRANCHISE 🏆' : isUnsoldState ? 'ROUND 2 STATUS ⚡' : 'LEADER BIDDER 🔥'}
                  </span>
                  <span id="auction-leading-bidder-display" class="text-lg sm:text-2xl md:text-3xl font-black text-white block mt-0.5 truncate leading-tight tracking-wide">
                    ${isSoldState ? (bidderTeam ? '🛡️ ' + bidderTeam.name : 'Sold') : isUnsoldState ? 'Eligible for Re-Bid' : (bidderTeam ? '🛡️ ' + bidderTeam.name : 'No bids yet')}
                  </span>
                </div>
              </div>

            </div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      } else {
        // SAME PLAYER ALREADY SHOWN: SMOOTH IN-PLACE UPDATES WITHOUT TOUCHING PHOTO!
        const stampSlot = document.getElementById('auction-stamp-slot');
        const stampOverlay = document.getElementById('auction-stamp-overlay');

        if (isSoldState) {
          if (!stampOverlay && stampSlot) {
            stampSlot.innerHTML = `
              <div id="auction-stamp-overlay" class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-slate-950/20">
                <svg viewBox="0 0 300 300" class="w-60 h-60 sm:w-80 sm:h-80 stamp-slam-animate select-none drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                  <g transform="rotate(-13 150 150)">
                    <circle cx="150" cy="150" r="140" fill="none" stroke="#059669" stroke-width="7" stroke-dasharray="20 4 15 3 25 5" />
                    <circle cx="150" cy="150" r="128" fill="none" stroke="#059669" stroke-width="2.5" />
                    <path id="sold-arc-top-v9" d="M 35,150 A 115,115 0 0,1 265,150" fill="none" />
                    <text fill="#059669" font-size="22" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6">
                      <textPath href="#sold-arc-top-v9" startOffset="50%" text-anchor="middle">LIVE AUCTION</textPath>
                    </text>
                    <text x="105" y="94" fill="#059669" font-size="20" text-anchor="middle">★</text>
                    <text x="150" y="82" fill="#059669" font-size="28" text-anchor="middle">★</text>
                    <text x="195" y="94" fill="#059669" font-size="20" text-anchor="middle">★</text>
                    <text x="105" y="222" fill="#059669" font-size="20" text-anchor="middle">★</text>
                    <text x="150" y="234" fill="#059669" font-size="28" text-anchor="middle">★</text>
                    <text x="195" y="222" fill="#059669" font-size="20" text-anchor="middle">★</text>
                    <path id="sold-arc-bottom-v9" d="M 265,150 A 115,115 0 0,1 35,150" fill="none" />
                    <text fill="#059669" font-size="20" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6">
                      <textPath href="#sold-arc-bottom-v9" startOffset="50%" text-anchor="middle">OFFICIALLY SIGNED</textPath>
                    </text>
                    <rect x="5" y="106" width="290" height="88" rx="16" fill="#059669" stroke="#ffffff" stroke-width="4" />
                    <text x="150" y="152" fill="#ffffff" font-size="46" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="8" text-anchor="middle">SOLD</text>
                    <text x="150" y="178" fill="#fef08a" font-size="14" font-weight="900" font-family="'Arial', sans-serif" text-anchor="middle">${bidderTeam ? bidderTeam.name + ' • ' : ''}₹ ${Number(state.sold_price || state.current_bid || 300).toLocaleString('en-IN')}</text>
                  </g>
                </svg>
              </div>
            `;
          }
          const statusLabel = document.getElementById('auction-status-label');
          const bidEl = document.getElementById('auction-live-bid-display');
          const bidderLabel = document.getElementById('auction-bidder-label');
          const teamEl = document.getElementById('auction-leading-bidder-display');
          if (statusLabel) statusLabel.textContent = 'AUCTION RESULT';
          if (bidEl) {
            bidEl.textContent = '🔨 SOLD';
            bidEl.className = 'text-3xl sm:text-5xl md:text-6xl font-black text-emerald-400 font-mono leading-none mt-0.5 drop-shadow-[0_4px_16px_rgba(16,185,129,0.5)]';
          }
          if (bidderLabel) bidderLabel.textContent = 'WINNING FRANCHISE 🏆';
          if (teamEl) teamEl.textContent = bidderTeam ? '🛡️ ' + bidderTeam.name : 'Sold';
        } else if (isUnsoldState) {
          if (!stampOverlay && stampSlot) {
            stampSlot.innerHTML = `
              <div id="auction-stamp-overlay" class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-slate-950/20">
                <svg viewBox="0 0 300 300" class="w-60 h-60 sm:w-80 sm:h-80 stamp-slam-animate select-none drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                  <g transform="rotate(-15 150 150)">
                    <circle cx="150" cy="150" r="140" fill="none" stroke="#C5221F" stroke-width="7" stroke-dasharray="18 4 12 3 24 5" />
                    <circle cx="150" cy="150" r="128" fill="none" stroke="#C5221F" stroke-width="2.5" />
                    <path id="unsold-arc-top-v9" d="M 35,150 A 115,115 0 0,1 265,150" fill="none" />
                    <text fill="#C5221F" font-size="28" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="14">
                      <textPath href="#unsold-arc-top-v9" startOffset="50%" text-anchor="middle">UNSOLD</textPath>
                    </text>
                    <text x="105" y="94" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                    <text x="150" y="82" fill="#C5221F" font-size="28" text-anchor="middle">★</text>
                    <text x="195" y="94" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                    <text x="105" y="222" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                    <text x="150" y="234" fill="#C5221F" font-size="28" text-anchor="middle">★</text>
                    <text x="195" y="222" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                    <path id="unsold-arc-bottom-v9" d="M 265,150 A 115,115 0 0,1 35,150" fill="none" />
                    <text fill="#C5221F" font-size="24" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="12">
                      <textPath href="#unsold-arc-bottom-v9" startOffset="50%" text-anchor="middle">UNSOLD</textPath>
                    </text>
                    <rect x="5" y="110" width="290" height="80" rx="16" fill="#C5221F" stroke="#ffffff" stroke-width="4" />
                    <text x="150" y="167" fill="#ffffff" font-size="52" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6" text-anchor="middle">UNSOLD</text>
                  </g>
                </svg>
              </div>
            `;
          }
          const statusLabel = document.getElementById('auction-status-label');
          const bidEl = document.getElementById('auction-live-bid-display');
          const bidderLabel = document.getElementById('auction-bidder-label');
          const teamEl = document.getElementById('auction-leading-bidder-display');
          if (statusLabel) statusLabel.textContent = 'Auction Status';
          if (bidEl) {
            bidEl.textContent = '❌ UNSOLD';
            bidEl.className = 'text-3xl sm:text-5xl md:text-6xl font-black text-rose-400 font-mono leading-none mt-0.5 drop-shadow-[0_4px_16px_rgba(244,63,94,0.5)]';
          }
          if (bidderLabel) bidderLabel.textContent = 'ROUND 2 STATUS ⚡';
          if (teamEl) teamEl.textContent = 'Eligible for Re-Bid';
        } else {
          // NORMAL BIDDING IN PROGRESS: Update text only + trigger pulse flash animation on change!
          if (stampOverlay && stampSlot) stampSlot.innerHTML = '';
          const statusLabel = document.getElementById('auction-status-label');
          const bidEl = document.getElementById('auction-live-bid-display');
          const bidderLabel = document.getElementById('auction-bidder-label');
          const teamEl = document.getElementById('auction-leading-bidder-display');
          if (statusLabel) statusLabel.textContent = 'CURRENT HIGH BID';
          if (bidEl) {
            const currentBidVal = Number(state.current_bid || state.basePrice || 300);
            bidEl.textContent = `₹ ${currentBidVal.toLocaleString('en-IN')}`;
            bidEl.className = 'text-3xl sm:text-5xl md:text-6xl font-black text-[#DC2626] font-mono leading-none mt-0.5 drop-shadow-[0_4px_22px_rgba(220,38,38,0.95)] live-bid-ambient-blink';
            
            if (lastRenderedLiveBid !== currentBidVal) {
              lastRenderedLiveBid = currentBidVal;
              bidEl.classList.remove('bid-pulse-flash');
              void bidEl.offsetWidth; // Force CSS reflow to replay flash
              bidEl.classList.add('bid-pulse-flash');
            }
          }
          if (bidderLabel) bidderLabel.innerHTML = 'LEADER BIDDER <span class="text-amber-400">🔥</span>';
          if (teamEl) teamEl.textContent = bidderTeam ? '🛡️ ' + bidderTeam.name : 'No bids yet';
        }
      }
    } else {
      if (lastActivePlayerId !== null || !document.getElementById('auction-waiting-block-box')) {
        lastActivePlayerId = null;
        lastActiveStatus = null;
        const isAuctionCompleted = (state && state.status === 'COMPLETED');

        activeBlockWrapper.innerHTML = `
          <div id="auction-waiting-block-box" class="text-center p-6 sm:p-8 ${isAuctionCompleted ? 'bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border-2 border-amber-400/60' : 'bg-white border-2 border-dashed border-slate-300'} rounded-2xl sm:rounded-3xl shadow-xs animate-fade-in">
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
              ${isAuctionCompleted ? '🏆 Live Auction Concluded!' : 'Waiting for Auctioneer to Place Player on Block...'}
            </h3>
            <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              ${isAuctionCompleted ? 'All approved franchise squad selections are complete. Review the final sold rosters below.' : 'Live bids will appear here automatically when the next player is auctioned.'}
            </p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  };

  const renderFranchisePurses = (teams, allPlayers) => {
    const pursesWrapper = document.getElementById('auction-franchise-purses-list');
    if (!pursesWrapper) return;

    const currentTableHash = allPlayers.map(p => p.id + ':' + (p.auctionStatus || '') + ':' + (p.teamId || '') + ':' + (p.soldPrice || 0)).join('|');
    const currentPursesHash = teams.map(t => t.id + ':' + (t.remainingPurse || 0) + ':' + (t.squadCount || 0) + ':' + (t.purseSpent || 0)).join('|') + '||' + currentTableHash;
    
    if (currentPursesHash === lastRenderedPursesHash && pursesWrapper.children.length > 0) return;
    lastRenderedPursesHash = currentPursesHash;

    pursesWrapper.innerHTML = teams.map(t => {
      const hasIcon = !!((t.iconPlayerName && t.iconPlayerName.trim()) || (t.iconName && t.iconName.trim()));
      const iconDeduction = hasIcon ? 1000 : 0;
      const totalPurse = Number(t.purseBudget || t.purse || 8000);
      const purchasedNonIconPlayers = allPlayers.filter(p => (p.teamId === t.id || (p.teamName && p.teamName.trim().toLowerCase() === t.name.trim().toLowerCase())) && !p.isIcon && !p.isIconPlayer && (p.auctionStatus === 'SOLD' || p.isSold === true || !!p.teamId));
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
  };

  let lastAuctionSyncTimestamp = 0;
  let lastAuctionCloudHeartbeat = 0;
  let lastRenderedTableHash = '';
  let lastRenderedPursesHash = '';
  let lastRenderedLiveBid = null;

  // --- IMMEDIATE 0ms SYNCHRONOUS FIRST RENDER ---
  const initialTeams = store.getTeams();
  const initialPlayers = store.getPlayers();
  const initialLiveState = store.getLiveAuctionStateSync();

  renderActiveBlock(initialLiveState, initialTeams, initialPlayers);
  renderFranchisePurses(initialTeams, initialPlayers);
  renderPlayerStatusTable();

  pollActiveAuctionState = async () => {
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

    // MONOTONIC VERSION GUARD: Discard any stale in-flight packet older than what we already rendered
    if (stateUpdatedAt < lastAuctionSyncTimestamp && stateUpdatedAt > 0) {
      return;
    }
    lastAuctionSyncTimestamp = Math.max(lastAuctionSyncTimestamp, stateUpdatedAt);

    // If state version changed OR periodic heartbeat (every 10s), sync cloud data
    if (now - lastAuctionCloudHeartbeat > 10000) {
      lastAuctionCloudHeartbeat = now;
      try {
        await store.syncWithCloud();
      } catch (err) {
        console.warn("Auction cloud sync notice:", err);
      }
    }

    const teams = store.getTeams();
    const allPlayers = store.getPlayers();

    // 1. Render / Update Active Bidding Block
    renderActiveBlock(state, teams, allPlayers);

    // 2. Real-time update of player status table ONLY when data actually changed
    const currentTableHash = allPlayers.map(p => p.id + ':' + (p.auctionStatus || '') + ':' + (p.teamId || '') + ':' + (p.soldPrice || 0)).join('|');
    if (currentTableHash !== lastRenderedTableHash) {
      lastRenderedTableHash = currentTableHash;
      renderPlayerStatusTable();
    }

    // 3. Render / Update Franchise Purses ONLY when teams or player purchases changed
    renderFranchisePurses(teams, allPlayers);
  };

  // Attach Projector View Button Listener
  document.getElementById('auction-open-projector-view-btn')?.addEventListener('click', () => {
    openLiveAuctionProjectorView();
  });

  pollActiveAuctionState();
  auctionPollInterval = setInterval(pollActiveAuctionState, 5000);
}

// --- 📽️ WORLD-CLASS LIVE AUCTION PROJECTOR SCREEN (ENHANCED OFF-WHITE THEME, AUTO-NAVIGATE & 2-PAGE SQUADS) ---
let projectorPollInterval = null;
let projectorClockInterval = null;
let projectorAutoTourTimer = null;

export function openLiveAuctionProjectorView() {
  window.openLiveAuctionProjectorView = openLiveAuctionProjectorView;
  document.getElementById('live-auction-projector-view-modal')?.remove();
  if (projectorPollInterval) { clearInterval(projectorPollInterval); projectorPollInterval = null; }
  if (projectorClockInterval) { clearInterval(projectorClockInterval); projectorClockInterval = null; }
  if (projectorAutoTourTimer) { clearTimeout(projectorAutoTourTimer); projectorAutoTourTimer = null; }

  let isMuted = localStorage.getItem('jsl_projector_sound_muted') === 'true';
  let isAutoTourEnabled = localStorage.getItem('jsl_projector_auto_tour') !== 'false'; // default enabled
  let lastProjectorPlayerId = undefined;
  let lastProjectorStatus = undefined;
  let lastProjectorLiveBid = null;
  let lastAudioFiredForBid = null;
  let lastProjectorPursesHash = '';
  let activeProjectorTab = 'stage'; // 'stage', 'history', 'teams'
  let historySubTab = 'sold'; // 'sold', 'unsold'
  let teamsCurrentPage = 1; // 1 (teams 1-4), 2 (teams 5-8)
  let lastAutoTourProcessedPlayerId = null;
  let lastAutoTourProcessedStatus = null;
  let isAutoTourRunning = false;

  // Web Audio API Synthesizer (Instant & 100% Offline)
  const playAudioCue = (type) => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      if (type === 'bid') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'sold') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.85, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);
      } else if (type === 'unsold') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch(e) {}
  };

  const modalHtml = `
    <div id="live-auction-projector-view-modal" class="fixed inset-0 z-[99999] bg-[#F1F5F9] text-slate-900 flex flex-col h-screen w-screen overflow-hidden select-none font-sans animate-fade-in">
      
      <!-- 1. TOP BROADCAST HEADER (Height: 52px, Shrink-0, Perfectly Proportioned) -->
      <header class="h-13 px-2.5 sm:px-4 bg-white border-b-2 border-slate-200/90 flex items-center justify-between shrink-0 shadow-xs z-30 gap-2">
        <!-- Left: Tournament Title & Live Pulse -->
        <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <img src="assets/jsl_logo.jpg" class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-amber-400 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <h1 class="text-xs sm:text-sm lg:text-base font-black tracking-tight text-slate-950 uppercase truncate">
                JHANKRA SUPER LEAGUE 2026
              </h1>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-600 text-white font-black text-[9px] rounded uppercase tracking-wider animate-pulse shrink-0 shadow-xs">
                <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> 🔴 LIVE
              </span>
            </div>
            <div class="text-[9px] sm:text-[10px] font-bold text-amber-700 tracking-wider uppercase hidden md:block">
              Official Player Auction Arena Broadcast
            </div>
          </div>
        </div>

        <!-- Center: Prominent Black BG Stats Bar & Compact View Buttons -->
        <div class="flex items-center gap-1.5 sm:gap-3">
          <!-- Sold / Unsold / Queue Stats in Solid Black Background -->
          <div class="hidden md:flex items-center gap-2 px-2.5 sm:px-3 py-1 bg-black text-white border border-slate-800 rounded-xl text-xs font-mono font-bold shadow-sm shrink-0">
            <span class="text-slate-200">👥 <strong id="proj-stat-total" class="text-white font-black">117</strong></span>
            <span class="text-slate-700">|</span>
            <span class="text-emerald-400">✅ <strong id="proj-stat-sold" class="font-black">0</strong> Sold</span>
            <span class="text-slate-700">|</span>
            <span class="text-rose-400">❌ <strong id="proj-stat-unsold" class="font-black">0</strong> Unsold</span>
            <span class="text-slate-700">|</span>
            <span class="text-amber-400">⏳ <strong id="proj-stat-queue" class="font-black">0</strong> In Queue</span>
          </div>

          <!-- View Mode Switcher (Smaller Buttons) -->
          <div class="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button id="proj-tab-stage-btn" class="px-2 py-0.5 rounded text-[11px] font-black transition-all cursor-pointer ${activeProjectorTab === 'stage' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              🔨 Arena
            </button>
            <button id="proj-tab-history-btn" class="px-2 py-0.5 rounded text-[11px] font-black transition-all cursor-pointer ${activeProjectorTab === 'history' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              📜 History
            </button>
            <button id="proj-tab-teams-btn" class="px-2 py-0.5 rounded text-[11px] font-black transition-all cursor-pointer ${activeProjectorTab === 'teams' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
              👥 Squads
            </button>
          </div>

          <!-- Auto-Tour Toggle (Smaller Button) -->
          <button id="proj-auto-tour-toggle-btn" class="px-2 py-0.5 rounded-lg border text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0 ${isAutoTourEnabled ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-100 border-slate-200 text-slate-500'}" title="Toggle Automatic Rotation between Stage, History & Squads after sale (A)">
            <span>🔄</span> <strong id="proj-auto-tour-label">${isAutoTourEnabled ? 'Auto ON' : 'Auto OFF'}</strong>
          </button>

          <!-- Live Digital Clock -->
          <div class="px-2 py-0.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-mono font-black text-amber-900 flex items-center gap-1 shadow-2xs shrink-0">
            <span>⏰</span> <span id="proj-live-clock">--:--:--</span>
          </div>
        </div>

        <!-- Right: Pure SVG-Only Icon Buttons (Sound, Fullscreen, Exit) -->
        <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <!-- Sound Toggle SVG -->
          <button id="proj-audio-toggle-btn" class="w-8 h-8 sm:w-8.5 sm:h-8.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200 flex items-center justify-center transition-all cursor-pointer select-none shadow-2xs" title="Toggle Sound FX (M)">
            <span id="proj-audio-icon-wrap" class="flex items-center justify-center pointer-events-none">
              ${isMuted ? `
                <svg class="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              ` : `
                <svg class="w-4 h-4 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              `}
            </span>
          </button>

          <!-- Fullscreen Toggle SVG (Square Icon) -->
          <button id="proj-fullscreen-toggle-btn" class="w-8 h-8 sm:w-8.5 sm:h-8.5 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-amber-800 rounded-lg border border-slate-300 flex items-center justify-center transition-all cursor-pointer select-none shadow-2xs" title="Toggle Fullscreen (F)">
            <svg class="w-4 h-4 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
          </button>

          <!-- Exit SVG (Close 'X' Icon) -->
          <button id="proj-close-btn" class="w-8 h-8 sm:w-8.5 sm:h-8.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 rounded-lg border border-rose-200 flex items-center justify-center transition-all cursor-pointer select-none shadow-2xs" title="Exit Projector (Esc)">
            <svg class="w-4 h-4 text-rose-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <!-- 2. MAIN STAGE (100% Height - flex-1, overflow-hidden, Off-White Stadium Theme) -->
      <main class="flex-1 overflow-hidden min-h-0 relative">
        
        <!-- VIEW 1: LIVE ARENA STAGE (Active Bidding + 8 Franchises) -->
        <div id="proj-main-arena-view" class="h-full w-full grid grid-cols-12 gap-3 sm:gap-4 p-2 sm:p-4 overflow-hidden min-h-0">
          
          <!-- LEFT / CENTER: Active Player Spotlight & Mega Bid Card -->
          <section class="col-span-12 lg:col-span-7 xl:col-span-8 h-full flex flex-col justify-between overflow-hidden min-h-0" id="proj-hero-player-container">
            <!-- Injected dynamically -->
          </section>

          <!-- RIGHT COLUMN: All 8 Franchise Purses & Squad Status (Larger Fonts & Clear Visibility) -->
          <aside class="col-span-12 lg:col-span-5 xl:col-span-4 h-full flex flex-col justify-between overflow-hidden min-h-0 bg-white border-2 border-slate-200/90 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-xs">
            <!-- Header -->
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div class="flex items-center gap-2">
                <span class="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-black">🛡️</span>
                <h2 class="text-xs sm:text-base font-black text-slate-950 uppercase tracking-wider">FRANCHISE PURSES</h2>
              </div>
              <span class="text-xs font-bold text-slate-500 font-mono">Target: 13 Players</span>
            </div>

            <!-- 8 Teams Grid (8 rows fitting 100% of height without scrollbar, ZERO flicker, Extra-Large Fonts) -->
            <div class="flex-1 grid grid-rows-8 gap-1.5 py-1.5 min-h-0" id="proj-franchise-list">
              <!-- Rendered dynamically -->
            </div>

            <!-- Footer Info Bar -->
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700 font-bold shrink-0">
              <span class="truncate">💰 League Total Spent: <strong id="proj-total-spent" class="text-emerald-700 font-mono font-black text-sm">₹0</strong></span>
              <span class="text-slate-400 font-mono">Live Auction Arena</span>
            </div>
          </aside>

        </div>

        <!-- VIEW 2: 📜 AUCTION HISTORY OVERLAY (Reversed: Last to First, Extra Large Cards) -->
        <div id="proj-history-overlay" class="hidden absolute inset-0 bg-[#F8FAFC] z-20 flex flex-col p-3 sm:p-6 overflow-hidden">
          <div class="flex justify-between items-center pb-3 border-b-2 border-slate-200 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xl shadow-xs">📜</div>
              <div>
                <h2 class="text-lg sm:text-2xl font-black text-slate-950 uppercase tracking-tight">Live Auction History & Activity Record</h2>
                <p class="text-xs sm:text-sm text-slate-500 font-bold">Showing all auction results (latest recorded at top)</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button id="proj-hist-tab-sold" class="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${historySubTab === 'sold' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700'}">
                  ✅ Sold Players (<span id="proj-hist-sold-count">0</span>)
                </button>
                <button id="proj-hist-tab-unsold" class="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${historySubTab === 'unsold' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-700'}">
                  ❌ Unsold Pool (<span id="proj-hist-unsold-count">0</span>)
                </button>
              </div>
              <button id="proj-close-history-btn" class="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-black rounded-xl border border-slate-300 text-xs sm:text-sm cursor-pointer shadow-2xs">
                ✖ Back to Arena
              </button>
            </div>
          </div>

          <!-- History Content Container (Extra Large Cards) -->
          <div class="flex-1 overflow-y-auto mt-3.5 border-2 border-slate-200/90 rounded-2xl p-3 bg-white min-h-0" id="proj-history-content-box">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- VIEW 3: 👥 4-TEAM VERTICAL 2-PAGE SQUADS OVERLAY -->
        <div id="proj-teams-overlay" class="hidden absolute inset-0 bg-[#F8FAFC] z-20 flex flex-col p-3 sm:p-5 overflow-hidden">
          <div class="flex justify-between items-center pb-3 border-b-2 border-slate-200 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-xl shadow-xs">🛡️</div>
              <div>
                <h2 class="text-lg sm:text-2xl font-black text-slate-950 uppercase tracking-tight">Official Franchise Squad Rosters</h2>
                <p class="text-xs sm:text-sm text-slate-500 font-bold">4-Team Vertical Broadcast View • Page <span id="proj-teams-page-num" class="font-black text-amber-700">1</span> of 2</p>
              </div>
            </div>
            
            <!-- Page Selector & Close -->
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button id="proj-teams-page1-btn" class="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${teamsCurrentPage === 1 ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-700'}">
                  ◀ Page 1 (Teams 1–4)
                </button>
                <button id="proj-teams-page2-btn" class="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${teamsCurrentPage === 2 ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-700'}">
                  Page 2 (Teams 5–8) ▶
                </button>
              </div>
              <button id="proj-close-teams-btn" class="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-black rounded-xl border border-slate-300 text-xs sm:text-sm cursor-pointer shadow-2xs">
                ✖ Back to Arena
              </button>
            </div>
          </div>

          <!-- 4-Team Vertical Columns Container -->
          <div class="flex-1 overflow-hidden mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 min-h-0" id="proj-teams-content-box">
            <!-- Rendered dynamically -->
          </div>
        </div>

      </main>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  // Digital Clock Updater
  const updateClock = () => {
    const clockEl = document.getElementById('proj-live-clock');
    if (clockEl) {
      const d = new Date();
      clockEl.textContent = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
  };
  updateClock();
  projectorClockInterval = setInterval(updateClock, 1000);

  // Tab Switcher Functions
  const setProjectorTab = (tab, manual = true) => {
    activeProjectorTab = tab;
    if (manual) {
      // If user clicked manually, cancel pending auto tour step so they can browse freely
      if (projectorAutoTourTimer) { clearTimeout(projectorAutoTourTimer); projectorAutoTourTimer = null; }
      isAutoTourRunning = false;
    }

    const stageBtn = document.getElementById('proj-tab-stage-btn');
    const histBtn = document.getElementById('proj-tab-history-btn');
    const teamsBtn = document.getElementById('proj-tab-teams-btn');
    const arenaView = document.getElementById('proj-main-arena-view');
    const histOverlay = document.getElementById('proj-history-overlay');
    const teamsOverlay = document.getElementById('proj-teams-overlay');

    if (stageBtn) stageBtn.className = `px-2 py-0.5 rounded text-[11px] font-black transition-all cursor-pointer ${tab === 'stage' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`;
    if (histBtn) histBtn.className = `px-2 py-0.5 rounded text-[11px] font-black transition-all cursor-pointer ${tab === 'history' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`;
    if (teamsBtn) teamsBtn.className = `px-2 py-0.5 rounded text-[11px] font-black transition-all cursor-pointer ${tab === 'teams' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`;

    if (arenaView) arenaView.classList.toggle('hidden', tab !== 'stage');
    if (histOverlay) histOverlay.classList.toggle('hidden', tab !== 'history');
    if (teamsOverlay) teamsOverlay.classList.toggle('hidden', tab !== 'teams');

    if (tab === 'history') renderHistoryOverlay();
    if (tab === 'teams') renderTeamsOverlay();
  };

  document.getElementById('proj-tab-stage-btn')?.addEventListener('click', () => setProjectorTab('stage', true));
  document.getElementById('proj-tab-history-btn')?.addEventListener('click', () => setProjectorTab('history', true));
  document.getElementById('proj-tab-teams-btn')?.addEventListener('click', () => setProjectorTab('teams', true));
  document.getElementById('proj-close-history-btn')?.addEventListener('click', () => setProjectorTab('stage', true));
  document.getElementById('proj-close-teams-btn')?.addEventListener('click', () => setProjectorTab('stage', true));

  // Auto-Tour Toggle Button
  const toggleAutoTour = () => {
    isAutoTourEnabled = !isAutoTourEnabled;
    localStorage.setItem('jsl_projector_auto_tour', String(isAutoTourEnabled));
    const btn = document.getElementById('proj-auto-tour-toggle-btn');
    const label = document.getElementById('proj-auto-tour-label');
    if (btn && label) {
      btn.className = `px-2 py-0.5 rounded-lg border text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0 ${isAutoTourEnabled ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-100 border-slate-200 text-slate-500'}`;
      label.textContent = isAutoTourEnabled ? 'Auto ON' : 'Auto OFF';
    }
    if (!isAutoTourEnabled && projectorAutoTourTimer) {
      clearTimeout(projectorAutoTourTimer);
      projectorAutoTourTimer = null;
      isAutoTourRunning = false;
    }
  };
  document.getElementById('proj-auto-tour-toggle-btn')?.addEventListener('click', toggleAutoTour);

  // Teams Page Switcher
  const setTeamsPage = (pageNum) => {
    teamsCurrentPage = pageNum;
    const p1Btn = document.getElementById('proj-teams-page1-btn');
    const p2Btn = document.getElementById('proj-teams-page2-btn');
    const numEl = document.getElementById('proj-teams-page-num');
    if (p1Btn) p1Btn.className = `px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${pageNum === 1 ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-700'}`;
    if (p2Btn) p2Btn.className = `px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${pageNum === 2 ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-700'}`;
    if (numEl) numEl.textContent = String(pageNum);
    renderTeamsOverlay();
  };

  document.getElementById('proj-teams-page1-btn')?.addEventListener('click', () => setTeamsPage(1));
  document.getElementById('proj-teams-page2-btn')?.addEventListener('click', () => setTeamsPage(2));

  document.getElementById('proj-hist-tab-sold')?.addEventListener('click', () => {
    historySubTab = 'sold';
    document.getElementById('proj-hist-tab-sold').className = 'px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer bg-emerald-600 text-white shadow-xs';
    document.getElementById('proj-hist-tab-unsold').className = 'px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer text-slate-700 hover:text-slate-900';
    renderHistoryOverlay();
  });

  document.getElementById('proj-hist-tab-unsold')?.addEventListener('click', () => {
    historySubTab = 'unsold';
    document.getElementById('proj-hist-tab-unsold').className = 'px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer bg-rose-600 text-white shadow-xs';
    document.getElementById('proj-hist-tab-sold').className = 'px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer text-slate-700 hover:text-slate-900';
    renderHistoryOverlay();
  });

  // Audio Toggle
  document.getElementById('proj-audio-toggle-btn')?.addEventListener('click', () => {
    isMuted = !isMuted;
    localStorage.setItem('jsl_projector_sound_muted', String(isMuted));
    const iconWrap = document.getElementById('proj-audio-icon-wrap');
    if (iconWrap) {
      iconWrap.innerHTML = isMuted ? `
        <svg class="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
      ` : `
        <svg class="w-4 h-4 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      `;
    }
  });

  // Fullscreen Toggle
  document.getElementById('proj-fullscreen-toggle-btn')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  });

  // Close Handler
  const closeProjectorView = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (projectorPollInterval) { clearInterval(projectorPollInterval); projectorPollInterval = null; }
    if (projectorClockInterval) { clearInterval(projectorClockInterval); projectorClockInterval = null; }
    if (projectorAutoTourTimer) { clearTimeout(projectorAutoTourTimer); projectorAutoTourTimer = null; }
    document.getElementById('live-auction-projector-view-modal')?.remove();
    window.removeEventListener('keydown', handleKeyShortcuts);
  };
  document.getElementById('proj-close-btn')?.addEventListener('click', closeProjectorView);

  // Keyboard Shortcuts
  const handleKeyShortcuts = (e) => {
    if (e.key === 'Escape') {
      if (activeProjectorTab !== 'stage') {
        setProjectorTab('stage', true);
      } else {
        closeProjectorView();
      }
    }
    if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
    if (e.key === 'h' || e.key === 'H') {
      setProjectorTab(activeProjectorTab === 'history' ? 'stage' : 'history', true);
    }
    if (e.key === 't' || e.key === 'T') {
      setProjectorTab(activeProjectorTab === 'teams' ? 'stage' : 'teams', true);
    }
    if (e.key === 'a' || e.key === 'A') {
      toggleAutoTour();
    }
    if (e.key === 'm' || e.key === 'M') {
      document.getElementById('proj-audio-toggle-btn')?.click();
    }
  };
  window.addEventListener('keydown', handleKeyShortcuts);

  // --- RENDER HISTORY OVERLAY (REVERSED: LATEST FIRST, EXTRA LARGE CARDS) ---
  const renderHistoryOverlay = () => {
    const box = document.getElementById('proj-history-content-box');
    if (!box) return;
    const allPlayers = store.getPlayers();
    const teams = store.getTeams();

    // Reverse so latest sold/unsold appear first!
    const soldPlayers = allPlayers.filter(p => p.teamId || p.auctionStatus === 'SOLD').reverse();
    const unsoldPlayers = allPlayers.filter(p => p.auctionStatus === 'UNSOLD' && !p.teamId).reverse();

    const soldCountEl = document.getElementById('proj-hist-sold-count');
    const unsoldCountEl = document.getElementById('proj-hist-unsold-count');
    if (soldCountEl) soldCountEl.textContent = String(soldPlayers.length);
    if (unsoldCountEl) unsoldCountEl.textContent = String(unsoldPlayers.length);

    if (historySubTab === 'sold') {
      if (soldPlayers.length === 0) {
        box.innerHTML = `<div class="py-16 text-center text-slate-400 font-bold italic text-base sm:text-lg">No players sold in the auction yet.</div>`;
        return;
      }
      box.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          ${soldPlayers.map(p => {
            const team = teams.find(t => t.id === p.teamId) || { name: p.teamName || 'Unknown Franchise' };
            const isIcon = (p.isIcon || p.isIconPlayer);
            return `
              <div class="p-3.5 sm:p-4 bg-white border-2 border-slate-200/90 rounded-2xl shadow-sm hover:border-slate-300 transition-all flex items-center justify-between gap-3.5">
                <div class="flex items-center gap-3 min-w-0">
                  <img src="${p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png'}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                  <div class="min-w-0">
                    <span class="text-[10px] font-black font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 inline-block mb-1">
                      ${p.registrationId || ('REG-' + String(p.serialNo || 1).padStart(4, '0'))}
                    </span>
                    <h4 class="font-black text-slate-950 text-sm sm:text-base lg:text-lg truncate leading-tight">${p.name}</h4>
                    <div class="text-xs text-slate-500 font-bold truncate mt-0.5">🏏 ${p.category || 'All Rounder'} • 📍 ${p.village || 'N/A'}</div>
                    <div class="text-xs sm:text-sm font-black text-sky-900 truncate mt-1 flex items-center gap-1">
                      <span>🛡️</span> <span class="truncate">${team.name}</span>
                    </div>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <span class="px-3 py-1.5 rounded-xl text-sm sm:text-base font-mono font-black block shadow-2xs ${isIcon ? 'bg-amber-100 text-amber-950 border-2 border-amber-300' : 'bg-emerald-100 text-emerald-950 border-2 border-emerald-300'}">
                    ${isIcon ? '⭐ ₹1,000' : '₹' + Number(p.soldPrice || 0).toLocaleString('en-IN')}
                  </span>
                  <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 block mt-1">
                    ${isIcon ? 'ICON SIGNING' : 'WINNING BID'}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      if (unsoldPlayers.length === 0) {
        box.innerHTML = `<div class="py-16 text-center text-slate-400 font-bold italic text-base sm:text-lg">No unsold players in this round.</div>`;
        return;
      }
      box.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          ${unsoldPlayers.map(p => `
            <div class="p-3.5 sm:p-4 bg-white border-2 border-rose-200 rounded-2xl shadow-sm flex items-center justify-between gap-3.5">
              <div class="flex items-center gap-3 min-w-0">
                <img src="${p.photoUrl || p.player_photo_url || 'assets/card_jsl_user.png'}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
                <div class="min-w-0">
                  <span class="text-[10px] font-black font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 inline-block mb-1">
                    ${p.registrationId || ('REG-' + String(p.serialNo || 1).padStart(4, '0'))}
                  </span>
                  <h4 class="font-black text-slate-950 text-sm sm:text-base lg:text-lg truncate leading-tight">${p.name}</h4>
                  <div class="text-xs text-slate-500 font-bold truncate mt-0.5">🏏 ${p.category || 'All Rounder'} • 📍 ${p.village || 'N/A'}</div>
                  <span class="inline-block mt-1 text-[10px] font-black text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    ❌ UNSOLD (ROUND 1)
                  </span>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-[10px] font-black uppercase text-slate-400 block">Base Price</span>
                <span class="text-sm sm:text-base font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block mt-0.5">₹${p.basePrice || 300}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  };

  // --- RENDER 4-TEAM VERTICAL SQUADS OVERLAY (2 PAGES, LARGE FONTS) ---
  const renderTeamsOverlay = () => {
    const box = document.getElementById('proj-teams-content-box');
    if (!box) return;
    const allPlayers = store.getPlayers();
    const teams = store.getTeams();

    const startIdx = (teamsCurrentPage - 1) * 4;
    const pageTeams = teams.slice(startIdx, startIdx + 4);

    box.innerHTML = pageTeams.map((t, idx) => {
      const hasIcon = !!((t.iconPlayerName && t.iconPlayerName.trim()) || (t.iconName && t.iconName.trim()));
      const iconName = t.iconPlayerName || t.iconName;
      const totalPurse = Number(t.purseBudget || t.purse || 8000);
      const purchasedPlayers = allPlayers.filter(p => {
        const isMatch = (p.teamId === t.id) || (p.teamName && (p.teamName || '').trim().toLowerCase() === (t.name || '').trim().toLowerCase());
        const isSoldStatus = (p.auctionStatus === 'SOLD' || p.isSold === true || !!p.teamId);
        return isMatch && isSoldStatus;
      });
      const iconPlayer = purchasedPlayers.find(p => (p.isIcon || p.isIconPlayer) || ((p.name || '').trim().toLowerCase() === (iconName || '').trim().toLowerCase()));
      const nonIconPlayers = purchasedPlayers.filter(p => p !== iconPlayer);
      const spent = (hasIcon ? 1000 : 0) + nonIconPlayers.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0);
      const left = Math.max(0, totalPurse - spent);
      const squadCount = (hasIcon ? 1 : 0) + nonIconPlayers.length;

      return `
        <div class="h-full bg-white border-2 border-slate-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm flex flex-col justify-between overflow-hidden">
          <!-- Team Header with Large Logo & Huge Team Name -->
          <div class="pb-3 border-b-2 border-slate-100 shrink-0">
            <div class="flex items-center gap-3">
              <img src="${t.logoUrl || t.teamLogoUrl || 'assets/card_jsl_user.png'}" class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-slate-200 shadow-xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
              <div class="min-w-0 flex-1">
                <span class="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block mb-0.5">
                  Franchise #${startIdx + idx + 1}
                </span>
                <h3 class="font-black text-slate-950 text-base sm:text-lg lg:text-xl truncate leading-tight tracking-tight">${t.name}</h3>
                <div class="text-xs text-slate-500 font-bold truncate">Owner: ${t.ownerName || 'Franchise Owner'}</div>
              </div>
            </div>

            <!-- Big Remaining Purse Banner -->
            <div class="mt-2.5 p-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl flex items-center justify-between shadow-2xs">
              <span class="text-[11px] font-black uppercase text-emerald-900">Remaining Purse:</span>
              <span class="text-sm sm:text-base font-mono font-black text-emerald-800">₹ ${left.toLocaleString('en-IN')}</span>
            </div>
            <div class="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono font-bold">
              <span>Squad: <strong class="text-sky-700 font-black">${squadCount}/13</strong> Players</span>
              <span>Budget: ₹${totalPurse.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <!-- Vertical Squad Roster List (Scrollable internally) -->
          <div class="py-2.5 space-y-1.5 flex-1 overflow-y-auto pr-1 min-h-0">
            ${hasIcon ? `
              <div class="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-sm font-bold flex items-center justify-between shadow-2xs">
                <span class="truncate">⭐ Icon: <strong>${iconName}</strong></span>
                <span class="font-mono font-black text-amber-900 shrink-0 ml-1">₹1,000</span>
              </div>
            ` : ''}

            ${nonIconPlayers.length > 0 ? nonIconPlayers.map((p, pIdx) => `
              <div class="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-between hover:bg-slate-100 transition-all">
                <div class="min-w-0 flex items-center gap-1.5">
                  <span class="text-[10px] font-mono text-slate-400">${pIdx + 1}.</span>
                  <span class="truncate font-black">${p.name}</span>
                </div>
                <span class="font-mono font-black text-emerald-700 shrink-0 ml-1">₹${Number(p.soldPrice || 0).toLocaleString('en-IN')}</span>
              </div>
            `).join('') : `
              <div class="text-xs text-slate-400 italic py-8 text-center">No auction players purchased yet</div>
            `}
          </div>

          <!-- Column Footer -->
          <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono font-bold shrink-0">
            <span>Slots Left: <strong class="text-slate-900">${Math.max(0, 13 - squadCount)}</strong></span>
            <span>Total Spent: <strong class="text-emerald-700">₹${spent.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>
      `;
    }).join('');
  };

  // --- AUTO TOUR CONTROLLER ENGINE ---
  const triggerAutoTourTransition = () => {
    if (!isAutoTourEnabled) return;
    if (projectorAutoTourTimer) { clearTimeout(projectorAutoTourTimer); projectorAutoTourTimer = null; }

    isAutoTourRunning = true;

    // Step 1: Switch to History for 6 seconds
    setProjectorTab('history', false);

    projectorAutoTourTimer = setTimeout(() => {
      if (!isAutoTourEnabled || !document.getElementById('live-auction-projector-view-modal')) return;

      // Step 2: Switch to Franchise Squads (Page 1) for 6 seconds
      teamsCurrentPage = 1;
      setProjectorTab('teams', false);

      projectorAutoTourTimer = setTimeout(() => {
        if (!isAutoTourEnabled || !document.getElementById('live-auction-projector-view-modal')) return;

        // Step 3: Switch to Franchise Squads (Page 2) for 6 seconds
        teamsCurrentPage = 2;
        setProjectorTab('teams', false);

        projectorAutoTourTimer = setTimeout(() => {
          if (!isAutoTourEnabled || !document.getElementById('live-auction-projector-view-modal')) return;

          // Step 4: Return to Live Arena Stage
          setProjectorTab('stage', false);
          isAutoTourRunning = false;
        }, 6000);

      }, 6000);

    }, 6000);
  };

  // --- PROJECTOR HERO & FRANCHISE UPDATER ---
  const updateProjectorDisplay = (state, teams, allPlayers) => {
    const heroContainer = document.getElementById('proj-hero-player-container');
    const franchiseList = document.getElementById('proj-franchise-list');
    if (!heroContainer || !franchiseList) return;

    // 1. Update Top League Statistics Pills
    const soldList = allPlayers.filter(p => p.teamId || p.auctionStatus === 'SOLD');
    const unsoldList = allPlayers.filter(p => p.auctionStatus === 'UNSOLD' && !p.teamId);
    const pendingList = allPlayers.filter(p => !p.teamId && p.auctionStatus !== 'SOLD' && p.auctionStatus !== 'UNSOLD');
    const totalSpent = soldList.reduce((sum, p) => sum + (Number(p.soldPrice) || (p.isIcon ? 1000 : 0) || 0), 0);

    const totalEl = document.getElementById('proj-stat-total');
    const soldEl = document.getElementById('proj-stat-sold');
    const unsoldEl = document.getElementById('proj-stat-unsold');
    const queueEl = document.getElementById('proj-stat-queue');
    const totalSpentEl = document.getElementById('proj-total-spent');

    if (totalEl) totalEl.textContent = String(allPlayers.length);
    if (soldEl) soldEl.textContent = String(soldList.length);
    if (unsoldEl) unsoldEl.textContent = String(unsoldList.length);
    if (queueEl) queueEl.textContent = String(pendingList.length);
    if (totalSpentEl) totalSpentEl.textContent = `₹ ${totalSpent.toLocaleString('en-IN')}`;

    // 2. AUTO-TOUR LOGIC CONTROLLER
    if (state && (state.status === 'BIDDING' || state.status === 'LIVE')) {
      // Bidding in progress! Lock screen to Live Arena immediately
      if (activeProjectorTab !== 'stage') {
        setProjectorTab('stage', false);
      }
      if (projectorAutoTourTimer) {
        clearTimeout(projectorAutoTourTimer);
        projectorAutoTourTimer = null;
      }
      isAutoTourRunning = false;
      lastAutoTourProcessedPlayerId = null;
      lastAutoTourProcessedStatus = null;
    } else if (state && (state.status === 'SOLD' || state.status === 'UNSOLD')) {
      // Just completed SOLD or UNSOLD
      if (isAutoTourEnabled && !isAutoTourRunning) {
        const key = `${state.active_player_id}_${state.status}`;
        if (lastAutoTourProcessedPlayerId !== key) {
          lastAutoTourProcessedPlayerId = key;
          // Hold on stage for 5 seconds so crowd sees SOLD stamp, then auto-tour!
          if (projectorAutoTourTimer) clearTimeout(projectorAutoTourTimer);
          projectorAutoTourTimer = setTimeout(triggerAutoTourTransition, 5000);
        }
      }
    }

    // 3. Render Hero Player Spotlight (With In-Place Update & Zero Flicker)
    if (state && state.active_player_id) {
      const bidderTeam = teams.find(t => t.id === state.highest_bidder_team_id);
      const isSoldState = (state.status === 'SOLD' || state.is_sold);
      const isUnsoldState = (state.status === 'UNSOLD' || state.is_unsold);
      const isNewPlayer = (lastProjectorPlayerId !== state.active_player_id);
      const currentBidVal = Number(state.sold_price || state.current_bid || state.basePrice || 300);

      // Play Sound Cues
      if (isSoldState && lastProjectorStatus !== 'SOLD') {
        playAudioCue('sold');
      } else if (isUnsoldState && lastProjectorStatus !== 'UNSOLD') {
        playAudioCue('unsold');
      } else if (!isSoldState && !isUnsoldState && lastAudioFiredForBid !== null && currentBidVal > lastAudioFiredForBid) {
        playAudioCue('bid');
      }
      lastAudioFiredForBid = currentBidVal;

      if (isNewPlayer || !document.getElementById('proj-player-card-box')) {
        lastProjectorPlayerId = state.active_player_id;
        lastProjectorStatus = state.status;
        const playerPhoto = getOptimizedImageUrl(state.photoUrl, 700, 700) || 'assets/card_jsl_user.png';

        heroContainer.innerHTML = `
          <div id="proj-player-card-box" class="flex-1 relative rounded-2xl sm:rounded-3xl border-2 ${isSoldState ? 'border-emerald-500' : isUnsoldState ? 'border-rose-500' : 'border-slate-300'} overflow-hidden bg-slate-900 shadow-lg flex flex-col justify-between p-3 sm:p-4 min-h-0 relative animate-fade-in">
            <!-- Full Crystal Clear Player Photo -->
            <img id="proj-player-photo" src="${playerPhoto}" class="absolute inset-0 w-full h-full object-cover md:object-contain object-top" alt="${state.name}" onerror="this.src='assets/card_jsl_user.png'" />

            <!-- Dynamic SVG Stamp Overlay Slot -->
            <div id="proj-stamp-slot">
              ${isSoldState ? `
                <div class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-slate-950/20">
                  <svg viewBox="0 0 300 300" class="w-64 h-64 sm:w-84 sm:h-84 stamp-slam-animate select-none drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                    <g transform="rotate(-13 150 150)">
                      <circle cx="150" cy="150" r="140" fill="none" stroke="#059669" stroke-width="7" stroke-dasharray="20 4 15 3 25 5" />
                      <circle cx="150" cy="150" r="128" fill="none" stroke="#059669" stroke-width="2.5" />
                      <path id="sold-arc-top-proj" d="M 35,150 A 115,115 0 0,1 265,150" fill="none" />
                      <text fill="#059669" font-size="22" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6">
                        <textPath href="#sold-arc-top-proj" startOffset="50%" text-anchor="middle">LIVE AUCTION</textPath>
                      </text>
                      <text x="105" y="94" fill="#059669" font-size="20" text-anchor="middle">★</text>
                      <text x="150" y="82" fill="#059669" font-size="28" text-anchor="middle">★</text>
                      <text x="195" y="94" fill="#059669" font-size="20" text-anchor="middle">★</text>
                      <text x="105" y="222" fill="#059669" font-size="20" text-anchor="middle">★</text>
                      <text x="150" y="234" fill="#059669" font-size="28" text-anchor="middle">★</text>
                      <text x="195" y="222" fill="#059669" font-size="20" text-anchor="middle">★</text>
                      <path id="sold-arc-bottom-proj" d="M 265,150 A 115,115 0 0,1 35,150" fill="none" />
                      <text fill="#059669" font-size="20" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6">
                        <textPath href="#sold-arc-bottom-proj" startOffset="50%" text-anchor="middle">OFFICIALLY SIGNED</textPath>
                      </text>
                      <rect x="5" y="106" width="290" height="88" rx="16" fill="#059669" stroke="#ffffff" stroke-width="4" />
                      <text x="150" y="152" fill="#ffffff" font-size="46" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="8" text-anchor="middle">SOLD</text>
                      <text x="150" y="178" fill="#fef08a" font-size="14" font-weight="900" font-family="'Arial', sans-serif" text-anchor="middle">${bidderTeam ? bidderTeam.name + ' • ' : ''}₹ ${currentBidVal.toLocaleString('en-IN')}</text>
                    </g>
                  </svg>
                </div>
              ` : isUnsoldState ? `
                <div class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-slate-950/20">
                  <svg viewBox="0 0 300 300" class="w-64 h-64 sm:w-84 sm:h-84 stamp-slam-animate select-none drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                    <g transform="rotate(-15 150 150)">
                      <circle cx="150" cy="150" r="140" fill="none" stroke="#C5221F" stroke-width="7" stroke-dasharray="18 4 12 3 24 5" />
                      <circle cx="150" cy="150" r="128" fill="none" stroke="#C5221F" stroke-width="2.5" />
                      <path id="unsold-arc-top-proj" d="M 35,150 A 115,115 0 0,1 265,150" fill="none" />
                      <text fill="#C5221F" font-size="28" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="14">
                        <textPath href="#unsold-arc-top-proj" startOffset="50%" text-anchor="middle">UNSOLD</textPath>
                      </text>
                      <text x="105" y="94" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                      <text x="150" y="82" fill="#C5221F" font-size="28" text-anchor="middle">★</text>
                      <text x="195" y="94" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                      <text x="105" y="222" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                      <text x="150" y="234" fill="#C5221F" font-size="28" text-anchor="middle">★</text>
                      <text x="195" y="222" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                      <path id="unsold-arc-bottom-proj" d="M 265,150 A 115,115 0 0,1 35,150" fill="none" />
                      <text fill="#C5221F" font-size="24" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="12">
                        <textPath href="#unsold-arc-bottom-proj" startOffset="50%" text-anchor="middle">UNSOLD</textPath>
                      </text>
                      <rect x="5" y="110" width="290" height="80" rx="16" fill="#C5221F" stroke="#ffffff" stroke-width="4" />
                      <text x="150" y="167" fill="#ffffff" font-size="52" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6" text-anchor="middle">UNSOLD</text>
                    </g>
                  </svg>
                </div>
              ` : ''}
            </div>

            <!-- Top Right Full Registration Badge -->
            <div class="relative z-10 flex justify-end items-center w-full">
              <span class="px-4 py-1.5 bg-red-600 text-white font-black font-mono text-xs sm:text-sm rounded-xl border-2 border-red-400 shadow-md tracking-wider">
                ${state.registrationId || state.regNo || ('REG-' + String(state.displayRegistrationNumber || state.serialNo || 1).padStart(4, '0'))}
              </span>
            </div>

            <!-- Bottom Player Information Glass Card -->
            <div class="relative z-10 mt-auto p-3 sm:p-3.5 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl space-y-1">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-xl sm:text-3xl font-black text-white tracking-tight truncate leading-tight">
                  ${state.name}
                </h2>
                <span class="px-3 py-1 bg-emerald-600 text-white font-black text-xs sm:text-sm rounded-xl uppercase tracking-wider shrink-0 shadow-md">
                  🏏 ${state.category || 'All Rounder'}
                </span>
              </div>

              <div class="flex items-center justify-between text-xs sm:text-sm text-slate-300 font-bold border-t border-slate-800 pt-1.5 flex-wrap gap-2">
                <div class="flex items-center gap-3 flex-wrap min-w-0">
                  <span class="text-slate-200">📍 ${state.village || 'Paschim Medinipur'}</span>
                  <span class="text-slate-400">•</span>
                  <span class="text-amber-400">🏏 ${state.battingStyle || 'Right Hand Bat'}</span>
                  ${state.bowlingStyle && state.bowlingStyle !== 'None' ? `
                    <span class="text-slate-400">•</span>
                    <span class="text-rose-400">⚾ ${state.bowlingStyle}</span>
                  ` : ''}
                </div>
                <span class="text-amber-300 font-mono font-black text-xs sm:text-sm shrink-0 ml-auto">Base Price: ₹${state.basePrice || 300}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Mega High-Impact Live Bid Panel (Bright Dark Red Bid Price) -->
          <div class="mt-2 sm:mt-3 h-20 sm:h-24 bg-gradient-to-r ${isUnsoldState ? 'from-rose-950 via-slate-950 to-rose-950 border-rose-500' : isSoldState ? 'from-emerald-950 via-slate-950 to-emerald-950 border-emerald-400' : 'from-slate-950 via-slate-900 to-slate-950 border-amber-400'} border-2 sm:border-3 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex items-center justify-between shadow-xl shrink-0">
            <!-- Left: Current High Bid Amount (Bright Dark Red) -->
            <div class="flex flex-col justify-center">
              <span id="proj-bid-status-label" class="text-[10px] sm:text-xs font-black ${isUnsoldState ? 'text-rose-300' : isSoldState ? 'text-emerald-300' : 'text-amber-300'} uppercase tracking-widest block">
                ${isSoldState ? 'AUCTION RESULT 🏆' : isUnsoldState ? 'AUCTION RESULT ⚡' : 'CURRENT HIGH BID'}
              </span>
              <div id="proj-mega-bid-display" class="text-3xl sm:text-5xl lg:text-6xl font-black ${isSoldState ? 'text-emerald-400' : isUnsoldState ? 'text-rose-400' : 'text-[#DC2626] live-bid-ambient-blink'} font-mono leading-none mt-0.5 drop-shadow-[0_4px_22px_rgba(220,38,38,0.95)]">
                ${isSoldState ? '🔨 SOLD' : isUnsoldState ? '❌ UNSOLD' : '₹ ' + currentBidVal.toLocaleString('en-IN')}
              </div>
            </div>

            <!-- Right: Winning / Leader Franchise Name & Logo -->
            <div class="text-right border-l border-slate-800 pl-3 sm:pl-4 flex flex-col justify-center max-w-[55%]">
              <span id="proj-leader-label" class="text-[10px] sm:text-xs font-black ${isSoldState ? 'text-emerald-400' : isUnsoldState ? 'text-rose-400' : 'text-amber-400'} uppercase tracking-widest flex items-center justify-end gap-1">
                ${isSoldState ? 'WINNING FRANCHISE 🏆' : isUnsoldState ? 'ROUND 2 STATUS ⚡' : 'LEADER FRANCHISE 🔥'}
              </span>
              <span id="proj-mega-leader-team" class="text-lg sm:text-2xl lg:text-3xl font-black text-white block mt-0.5 truncate leading-tight tracking-wide">
                ${isSoldState ? (bidderTeam ? '🛡️ ' + bidderTeam.name : 'Sold') : isUnsoldState ? 'Eligible for Re-Bid' : (bidderTeam ? '🛡️ ' + bidderTeam.name : 'Waiting for Bid...')}
              </span>
            </div>
          </div>
        `;
      } else {
        // In-place dynamic text & stamp update for the same active player
        lastProjectorStatus = state.status;
        const stampSlot = document.getElementById('proj-stamp-slot');
        const statusLabel = document.getElementById('proj-bid-status-label');
        const bidEl = document.getElementById('proj-mega-bid-display');
        const leaderLabel = document.getElementById('proj-leader-label');
        const teamEl = document.getElementById('proj-mega-leader-team');

        if (isSoldState) {
          if (stampSlot && !stampSlot.querySelector('svg')) {
            stampSlot.innerHTML = `
              <div class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-slate-950/20">
                <svg viewBox="0 0 300 300" class="w-64 h-64 sm:w-84 sm:h-84 stamp-slam-animate select-none drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                  <g transform="rotate(-13 150 150)">
                    <circle cx="150" cy="150" r="140" fill="none" stroke="#059669" stroke-width="7" stroke-dasharray="20 4 15 3 25 5" />
                    <circle cx="150" cy="150" r="128" fill="none" stroke="#059669" stroke-width="2.5" />
                    <path id="sold-arc-top-proj" d="M 35,150 A 115,115 0 0,1 265,150" fill="none" />
                    <text fill="#059669" font-size="22" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6">
                      <textPath href="#sold-arc-top-proj" startOffset="50%" text-anchor="middle">LIVE AUCTION</textPath>
                    </text>
                    <text x="105" y="94" fill="#059669" font-size="20" text-anchor="middle">★</text>
                    <text x="150" y="82" fill="#059669" font-size="28" text-anchor="middle">★</text>
                    <text x="195" y="94" fill="#059669" font-size="20" text-anchor="middle">★</text>
                    <text x="105" y="222" fill="#059669" font-size="20" text-anchor="middle">★</text>
                    <text x="150" y="234" fill="#059669" font-size="28" text-anchor="middle">★</text>
                    <text x="195" y="222" fill="#059669" font-size="20" text-anchor="middle">★</text>
                    <path id="sold-arc-bottom-proj" d="M 265,150 A 115,115 0 0,1 35,150" fill="none" />
                    <text fill="#059669" font-size="20" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6">
                      <textPath href="#sold-arc-bottom-proj" startOffset="50%" text-anchor="middle">OFFICIALLY SIGNED</textPath>
                    </text>
                    <rect x="5" y="106" width="290" height="88" rx="16" fill="#059669" stroke="#ffffff" stroke-width="4" />
                    <text x="150" y="152" fill="#ffffff" font-size="46" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="8" text-anchor="middle">SOLD</text>
                    <text x="150" y="178" fill="#fef08a" font-size="14" font-weight="900" font-family="'Arial', sans-serif" text-anchor="middle">${bidderTeam ? bidderTeam.name + ' • ' : ''}₹ ${currentBidVal.toLocaleString('en-IN')}</text>
                  </g>
                </svg>
              </div>
            `;
          }
          if (statusLabel) statusLabel.textContent = 'AUCTION RESULT 🏆';
          if (bidEl) {
            bidEl.textContent = '🔨 SOLD';
            bidEl.className = 'text-3xl sm:text-5xl lg:text-6xl font-black text-emerald-400 font-mono leading-none mt-0.5 drop-shadow-[0_4px_18px_rgba(16,185,129,0.7)]';
          }
          if (leaderLabel) leaderLabel.textContent = 'WINNING FRANCHISE 🏆';
          if (teamEl) teamEl.textContent = bidderTeam ? '🛡️ ' + bidderTeam.name : 'Sold';
        } else if (isUnsoldState) {
          if (stampSlot && !stampSlot.querySelector('svg')) {
            stampSlot.innerHTML = `
              <div class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none bg-slate-950/20">
                <svg viewBox="0 0 300 300" class="w-64 h-64 sm:w-84 sm:h-84 stamp-slam-animate select-none drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                  <g transform="rotate(-15 150 150)">
                    <circle cx="150" cy="150" r="140" fill="none" stroke="#C5221F" stroke-width="7" stroke-dasharray="18 4 12 3 24 5" />
                    <circle cx="150" cy="150" r="128" fill="none" stroke="#C5221F" stroke-width="2.5" />
                    <path id="unsold-arc-top-proj" d="M 35,150 A 115,115 0 0,1 265,150" fill="none" />
                    <text fill="#C5221F" font-size="28" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="14">
                      <textPath href="#unsold-arc-top-proj" startOffset="50%" text-anchor="middle">UNSOLD</textPath>
                    </text>
                    <text x="105" y="94" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                    <text x="150" y="82" fill="#C5221F" font-size="28" text-anchor="middle">★</text>
                    <text x="195" y="94" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                    <text x="105" y="222" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                    <text x="150" y="234" fill="#C5221F" font-size="28" text-anchor="middle">★</text>
                    <text x="195" y="222" fill="#C5221F" font-size="20" text-anchor="middle">★</text>
                    <path id="unsold-arc-bottom-proj" d="M 265,150 A 115,115 0 0,1 35,150" fill="none" />
                    <text fill="#C5221F" font-size="24" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="12">
                      <textPath href="#unsold-arc-bottom-proj" startOffset="50%" text-anchor="middle">UNSOLD</textPath>
                    </text>
                    <rect x="5" y="110" width="290" height="80" rx="16" fill="#C5221F" stroke="#ffffff" stroke-width="4" />
                    <text x="150" y="167" fill="#ffffff" font-size="52" font-weight="900" font-family="'Impact', 'Arial Black', sans-serif" letter-spacing="6" text-anchor="middle">UNSOLD</text>
                  </g>
                </svg>
              </div>
            `;
          }
          if (statusLabel) statusLabel.textContent = 'AUCTION RESULT ⚡';
          if (bidEl) {
            bidEl.textContent = '❌ UNSOLD';
            bidEl.className = 'text-3xl sm:text-5xl lg:text-6xl font-black text-rose-400 font-mono leading-none mt-0.5 drop-shadow-[0_4px_18px_rgba(244,63,94,0.7)]';
          }
          if (leaderLabel) leaderLabel.textContent = 'ROUND 2 STATUS ⚡';
          if (teamEl) teamEl.textContent = 'Eligible for Re-Bid';
        } else {
          if (stampSlot) stampSlot.innerHTML = '';
          if (statusLabel) statusLabel.textContent = 'CURRENT HIGH BID';
          if (bidEl) {
            bidEl.textContent = `₹ ${currentBidVal.toLocaleString('en-IN')}`;
            bidEl.className = 'text-3xl sm:text-5xl lg:text-6xl font-black text-[#DC2626] font-mono leading-none mt-0.5 drop-shadow-[0_4px_22px_rgba(220,38,38,0.95)] live-bid-ambient-blink';
            if (lastProjectorLiveBid !== currentBidVal) {
              lastProjectorLiveBid = currentBidVal;
              bidEl.classList.remove('bid-pulse-flash');
              void bidEl.offsetWidth;
              bidEl.classList.add('bid-pulse-flash');
            }
          }
          if (leaderLabel) leaderLabel.innerHTML = 'LEADER FRANCHISE <span class="text-amber-400">🔥</span>';
          if (teamEl) teamEl.textContent = bidderTeam ? '🛡️ ' + bidderTeam.name : 'Waiting for Bid...';
        }
      }
    } else {
      // Waiting / Idle State (Off-White Theme)
      if (lastProjectorPlayerId !== null || !document.getElementById('proj-waiting-stage-box')) {
        lastProjectorPlayerId = null;
        lastProjectorStatus = null;
        lastProjectorLiveBid = null;

        heroContainer.innerHTML = `
          <div id="proj-waiting-stage-box" class="flex-1 rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 bg-white p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-xs relative overflow-hidden animate-fade-in">
            <div class="absolute w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <img src="assets/jsl_logo.jpg" class="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-amber-400 shadow-md mb-4 animate-bounce" onerror="this.src='assets/card_jsl_user.png'" />
            <h2 class="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">
              JHANKRA SUPER LEAGUE 2026
            </h2>
            <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-900 font-mono font-black text-sm rounded-full border border-amber-300 my-3 shadow-2xs">
              <span>🔨 LIVE AUCTION ARENA</span>
            </div>
            <p class="text-sm sm:text-base text-slate-500 font-bold max-w-lg mx-auto">
              Waiting for the auctioneer to place the next player on the block. Real-time bids and franchise purse standings will appear on this screen automatically.
            </p>
          </div>
        `;
      }
    }

    // 4. Render 8 Franchise Team Cards (EXTRA LARGE FONTS, ZERO FLICKER DIFF GUARD)
    const activeBidderId = (state && state.status === 'BIDDING') ? state.highest_bidder_team_id : null;
    const currentPursesHash = teams.slice(0, 8).map(t => `${t.id}:${t.remainingPurse}:${t.squadCount}`).join('|') + '||' + activeBidderId;

    if (currentPursesHash !== lastProjectorPursesHash || franchiseList.children.length === 0) {
      lastProjectorPursesHash = currentPursesHash;
      
      franchiseList.innerHTML = teams.slice(0, 8).map(t => {
        const hasIcon = !!((t.iconPlayerName && t.iconPlayerName.trim()) || (t.iconName && t.iconName.trim()));
        const iconDeduction = hasIcon ? 1000 : 0;
        const totalPurse = Number(t.purseBudget || t.purse || 8000);
        const purchasedNonIconPlayers = allPlayers.filter(p => {
          const isMatch = (p.teamId === t.id) || (p.teamName && (p.teamName || '').trim().toLowerCase() === (t.name || '').trim().toLowerCase());
          const isSoldStatus = (p.auctionStatus === 'SOLD' || p.isSold === true || !!p.teamId);
          const iconPlayerName = (t.iconPlayerName || t.iconName || '').trim().toLowerCase();
          const isIcon = hasIcon && ((p.name || '').trim().toLowerCase() === iconPlayerName || (t.iconPlayerId && p.id === t.iconPlayerId));
          return isMatch && isSoldStatus && !isIcon;
        });
        const auctionSpent = purchasedNonIconPlayers.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0);
        const spent = iconDeduction + auctionSpent;
        const left = Math.max(0, totalPurse - spent);
        const squadCount = (hasIcon ? 1 : 0) + purchasedNonIconPlayers.length;
        const ratio = Math.min(100, Math.max(0, (left / totalPurse) * 100));
        const isLeaderNow = (activeBidderId && activeBidderId === t.id);

        return `
          <div class="px-3 sm:px-3.5 py-1.5 rounded-xl transition-all duration-300 flex items-center justify-between gap-2.5 select-none ${isLeaderNow ? 'bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border-2 border-amber-500 shadow-md ring-2 ring-amber-400/60 scale-[1.01]' : 'bg-slate-100/90 border-2 border-slate-200/90 hover:bg-slate-200/80'}">
            <!-- Large Logo & Huge Team Name -->
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <img src="${t.logoUrl || t.teamLogoUrl || 'assets/card_jsl_user.png'}" class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border border-slate-300 shadow-2xs shrink-0" onerror="this.src='assets/card_jsl_user.png'" />
              <div class="min-w-0">
                <div class="font-black text-slate-950 text-xs sm:text-sm lg:text-base truncate flex items-center gap-1.5 leading-tight tracking-tight">
                  <span class="truncate">${t.name}</span>
                  ${isLeaderNow ? '<span class="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-mono text-[9px] font-black rounded uppercase animate-pulse shrink-0 shadow-2xs">🔥 BID</span>' : ''}
                </div>
                <div class="text-[11px] sm:text-xs text-slate-600 font-mono font-bold">
                  Squad: <strong class="text-sky-800">${squadCount}/13</strong> ${hasIcon ? '• ⭐ Icon' : ''}
                </div>
              </div>
            </div>

            <!-- Big Purse Balance & Mini Progress Bar -->
            <div class="text-right shrink-0">
              <div class="font-mono font-black text-sm sm:text-base lg:text-lg text-emerald-800 leading-tight">
                ₹ ${left.toLocaleString('en-IN')}
              </div>
              <div class="w-20 sm:w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-0.5 border border-slate-300 ml-auto">
                <div class="bg-gradient-to-r from-teal-500 to-emerald-600 h-full rounded-full" style="width: ${ratio}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  };

  // Immediate Initial Render
  const initTeams = store.getTeams();
  const initPlayers = store.getPlayers();
  const initLive = store.getLiveAuctionStateSync();
  updateProjectorDisplay(initLive, initTeams, initPlayers);

  // Real-time Poller (every 1 second for projector)
  const pollProjector = async () => {
    if (!document.getElementById('live-auction-projector-view-modal')) {
      if (projectorPollInterval) { clearInterval(projectorPollInterval); projectorPollInterval = null; }
      if (projectorAutoTourTimer) { clearTimeout(projectorAutoTourTimer); projectorAutoTourTimer = null; }
      return;
    }
    const state = await store.getLiveAuctionState();
    const teams = store.getTeams();
    const allPlayers = store.getPlayers();
    updateProjectorDisplay(state, teams, allPlayers);
    if (activeProjectorTab === 'history') renderHistoryOverlay();
    if (activeProjectorTab === 'teams') renderTeamsOverlay();
  };

  projectorPollInterval = setInterval(pollProjector, 1200);
}

// --- FRANCHISE SQUAD & PURCHASED PLAYERS MODAL ---
export function openTeamPurchasedSquadModal(teamId) {
  window.currentViewingTeamId = teamId;
  document.getElementById('team-squad-modal')?.remove();

  const team = store.getTeamById(teamId);
  if (!team) return;

  const allPlayers = store.getPlayers();
  const hasIcon = !!((team.iconPlayerName && team.iconPlayerName.trim()) || (team.iconName && team.iconName.trim()));
  const iconName = team.iconPlayerName || team.iconName;
  const iconDeduction = hasIcon ? 1000 : 0;

  // Find purchased players (excluding icon player to avoid double charging)
  const purchasedNonIconPlayers = allPlayers.filter(p => (p.teamId === team.id || (p.teamName && p.teamName.trim().toLowerCase() === team.name.trim().toLowerCase())) && !p.isIcon && !p.isIconPlayer && (p.auctionStatus === 'SOLD' || p.isSold === true || !!p.teamId));
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
          <div class="flex items-center gap-1.5">
            <button id="download-team-squad-pdf-modal-btn" class="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer" title="Download Final Auction Squad PDF">
              <i data-lucide="file-down" class="w-3.5 h-3.5"></i> <span class="hidden sm:inline">Squad PDF</span>
            </button>
            <button id="close-team-squad-modal-btn" class="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
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
        <div class="pt-3 border-t border-slate-100 mt-3 flex items-center gap-2">
          <button id="download-team-squad-pdf-modal-footer-btn" class="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
            <i data-lucide="file-down" class="w-4 h-4"></i> Download Squad PDF
          </button>
          <button id="dismiss-team-squad-btn" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer">
            Close
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();

  const handleClose = () => {
    window.currentViewingTeamId = null;
    document.getElementById('team-squad-modal')?.remove();
  };

  const handleDownloadPDF = () => {
    exportTeamFinalSquadToPDF(team, allPlayers);
  };

  document.getElementById('download-team-squad-pdf-modal-btn')?.addEventListener('click', handleDownloadPDF);
  document.getElementById('download-team-squad-pdf-modal-footer-btn')?.addEventListener('click', handleDownloadPDF);
  document.getElementById('close-team-squad-modal-btn')?.addEventListener('click', handleClose);
  document.getElementById('dismiss-team-squad-btn')?.addEventListener('click', handleClose);
  document.getElementById('team-squad-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'team-squad-modal') {
      handleClose();
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
        village: p.village || 'N/A',
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
      village: playerReg.village || 'N/A',
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
      leagueCode: reg.leagueCategory || 'T',
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
            <div class="text-xs text-slate-500 font-bold mt-1">📍 Village: ${profile.village || 'N/A'}</div>
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
    const settings = await fetchPopupSettingsFromCloud();
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
    const playerVillage = player.village || player.address || player.teamName || 'N/A';

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
      const popupSettings = await fetchPopupSettingsFromCloud();
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
          <p class="text-xs text-slate-500 mt-0.5">Sign in with mobile number (players) or email (admin/organiser)</p>
        </div>

        <form id="player-login-form" class="space-y-3.5 text-left">
          <div>
            <label class="block text-[10px] font-bold text-slate-700 uppercase mb-1">Mobile Number or Email *</label>
            <input type="text" id="login-identifier" required autocomplete="off" placeholder="10-digit mobile or admin email" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:border-blue-500 focus:outline-none font-mono" />
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

        <div class="mt-4 pt-3 border-t border-slate-100 text-center space-y-2">
          <p class="text-xs text-slate-500">
            New Player?
            <button id="modal-goto-register-btn" class="font-bold text-blue-600 hover:underline cursor-pointer">Register for Tournament</button>
          </p>
          <p class="text-xs text-slate-500">
            Want to organise?
            <button id="modal-goto-host-btn" class="font-bold text-amber-600 hover:underline cursor-pointer">Host Your Own Tournament</button>
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

  document.getElementById('modal-goto-host-btn')?.addEventListener('click', () => {
    removeModal();
    openTournamentCreationWizard(false);
  });

  document.getElementById('player-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const errEl = document.getElementById('login-error-msg');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await store.authenticateUser(identifier, pass);
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
    renderMobileBottomNav();

    // First-time login: prompt password reset before navigating
    if (res.isFirstLogin) {
      openFirstTimePasswordResetModal(identifier, () => {
        if (res.role === 'SUPER_ADMIN') navigate('admin');
        else navigate('profile');
      });
      return;
    }

    // Smart routing based on role
    if (res.role === 'SUPER_ADMIN') {
      navigate('admin');
    } else if (res.role === 'TOURNAMENT_OWNER') {
      navigate('profile');
    } else {
      navigate('profile');
    }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
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

  document.getElementById('first-login-pwd-form')?.addEventListener('submit', async (e) => {
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

    const res = await store.updateUserPassword(phone, p1);
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

  const isMaster = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'master_admin';
  const allPlayers = store.getPlayers();
  const cleanPhone = (currentUser.phone || '').replace(/[^0-9]/g, '');
  const cleanPhone10 = cleanPhone.slice(-10);
  const owners = store.getTournamentOwners();
  const isAssignedOwner = Object.values(owners).some(o => o && (o.phone || '').replace(/[^0-9]/g, '').slice(-10) === cleanPhone10);
  const isTournamentOwner = currentUser.role === 'TOURNAMENT_OWNER' || isAssignedOwner;

  // 1. Try finding in active players list
  let player = allPlayers.find(p => (p.phone || p.mobile || '').replace(/[^0-9]/g, '').slice(-10) === cleanPhone10);

  // 2. If not found or incomplete, look up lifetime player_profiles
  const allProfiles = store.getPlayerProfiles();
  const matchedProfile = allProfiles.find(pp => (pp.phone || '').replace(/[^0-9]/g, '').slice(-10) === cleanPhone10);

  if (!player && matchedProfile) {
    player = {
      id: matchedProfile.id,
      name: matchedProfile.name,
      phone: matchedProfile.phone,
      village: matchedProfile.village,
      district: matchedProfile.district || 'Paschim Medinipur',
      state: matchedProfile.state || 'West Bengal',
      category: matchedProfile.category || 'All-Rounder',
      playingType: matchedProfile.category || 'All-Rounder',
      battingStyle: matchedProfile.battingStyle || 'Right Hand Bat',
      bowlingStyle: matchedProfile.bowlingStyle || 'Right Hand Fast',
      photoUrl: matchedProfile.photoUrl || '',
      player_photo_url: matchedProfile.photoUrl || '',
      registrationStatus: 'APPROVED',
      paymentStatus: 'APPROVED',
      basePrice: 300,
      serialNo: matchedProfile.serialNo || 103,
      displayRegistrationNumber: matchedProfile.displayRegistrationNumber || 103,
      registrationId: matchedProfile.registrationId || `REG-${String(matchedProfile.displayRegistrationNumber || 103).padStart(4, '0')}`
    };
  }

  if (player && matchedProfile) {
    if (!player.photoUrl && matchedProfile.photoUrl) {
      player.photoUrl = matchedProfile.photoUrl;
      player.player_photo_url = matchedProfile.photoUrl;
    }
    if ((!player.village || player.village === 'Paschim Medinipur') && matchedProfile.village) {
      player.village = matchedProfile.village;
    }
    if ((!player.category || player.category === 'Player') && matchedProfile.category) {
      player.category = matchedProfile.category;
    }
    if (!player.battingStyle && matchedProfile.battingStyle) {
      player.battingStyle = matchedProfile.battingStyle;
    }
    if (!player.bowlingStyle && matchedProfile.bowlingStyle) {
      player.bowlingStyle = matchedProfile.bowlingStyle;
    }
  }

  if (isMaster) {
    player = {
      name: currentUser.name && currentUser.name !== 'Admin User' ? currentUser.name : 'Master Admin (Suman Kolay)',
      phone: currentUser.email || currentUser.phone || 'bakolaypan@gmail.com',
      category: 'Master Admin / Supreme Authority',
      village: 'Tournament Headquarters',
      district: 'Paschim Medinipur',
      state: 'West Bengal',
      registrationStatus: 'APPROVED',
      paymentStatus: 'APPROVED',
      basePrice: 0,
      photoUrl: currentUser.avatar_url || 'assets/card_jsl_user.png'
    };
  } else if (!player) {
    if (isTournamentOwner) {
      const ownerEntry = Object.values(owners).find(o => o && (o.phone || '').replace(/[^0-9]/g, '').slice(-10) === cleanPhone10);
      player = {
        name: ownerEntry?.name || currentUser.name || 'Tournament Organizer',
        phone: currentUser.phone || '',
        category: 'Tournament Owner',
        village: '',
        district: '',
        state: '',
        registrationStatus: 'APPROVED',
        paymentStatus: 'APPROVED',
        basePrice: 0,
        photoUrl: 'assets/card_jsl_user.png'
      };
    } else {
      player = {
        name: currentUser.name || 'Registered Player',
        phone: currentUser.phone || '',
        category: 'All-Rounder',
        village: 'Jhakra',
        district: 'Paschim Medinipur',
        state: 'West Bengal',
        registrationStatus: 'APPROVED',
        paymentStatus: 'APPROVED',
        basePrice: 300,
        photoUrl: 'assets/card_jsl_user.png'
      };
    }
  }

  let finalPhoto = player.photoUrl || player.player_photo_url || (matchedProfile && matchedProfile.photoUrl) || '';
  if (!finalPhoto || finalPhoto.includes('[Image Stored In Cloud]') || finalPhoto.includes('unsplash.com') || (!finalPhoto.startsWith('http') && !finalPhoto.startsWith('data:image') && !finalPhoto.startsWith('assets/'))) {
    finalPhoto = 'assets/card_jsl_user.png';
  }

  const vName = (player.village || (matchedProfile && matchedProfile.village) || '').trim();
  const dName = (player.district || (matchedProfile && matchedProfile.district) || 'Paschim Medinipur').trim();
  const sName = (player.state || (matchedProfile && matchedProfile.state) || 'West Bengal').trim();
  const fullAddress = [vName ? `Village: ${vName}` : '', dName, sName].filter(Boolean).join(', ');

  const roleName = player.category || player.playingType || (matchedProfile && matchedProfile.category) || 'All-Rounder';
  const batStyle = player.battingStyle || (matchedProfile && matchedProfile.battingStyle) || 'Right Hand Bat';
  const bowlStyle = player.bowlingStyle || (matchedProfile && matchedProfile.bowlingStyle) || 'Right Hand Fast';
  const isOwner = isMaster || isTournamentOwner;

  container.innerHTML = `
    <div class="max-w-xl mx-auto space-y-4 animate-fade-in pb-16 pt-2">
      
      <!-- Top Identity Card -->
      <div class="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden text-center sm:text-left">
        <div class="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-100/40 to-blue-100/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

        <div class="flex flex-col sm:flex-row items-center gap-5 relative z-10">
          <div class="relative shrink-0">
            <img src="${finalPhoto}" class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-emerald-500 shadow-md bg-slate-100" onerror="this.onerror=null; this.src='assets/card_jsl_user.png'" />
            <span class="absolute -bottom-2 -right-1 px-2 py-0.5 ${(player.registrationStatus === 'APPROVED' || player.paymentStatus === 'APPROVED') ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'} rounded-full text-[9px] font-black shadow-sm">
              ${(player.registrationStatus === 'APPROVED' || player.paymentStatus === 'APPROVED') ? 'VERIFIED' : 'PENDING'}
            </span>
          </div>

          <div class="flex-1 space-y-2 min-w-0">
            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span class="px-2.5 py-0.5 ${isMaster ? 'bg-amber-50 text-amber-800 border-amber-300' : (isTournamentOwner ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')} border rounded-full font-black text-[10px] uppercase">
                ${isMaster ? '👑 MASTER SUPER ADMIN' : (isTournamentOwner ? '🏆 TOURNAMENT OWNER' : '🏏 REGISTERED PLAYER')}
              </span>
              ${(player.displayRegistrationNumber || player.serialNo || player.registrationId) ? `
                <span class="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-mono font-black text-[10px]">
                  #${player.displayRegistrationNumber || player.serialNo || 1} • ${player.registrationId || ('REG-' + String(player.serialNo || 1).padStart(4, '0'))}
                </span>
              ` : ''}
            </div>

            <h1 class="text-xl sm:text-2xl font-black text-slate-900 truncate">${player.name}</h1>
            
            <div class="space-y-1 text-xs text-slate-600 font-semibold">
              <div class="flex items-center justify-center sm:justify-start gap-1.5">
                <span class="text-slate-400">📱 Mobile:</span>
                <span class="font-bold text-slate-800 font-mono">${player.phone || cleanPhone}</span>
              </div>
              <div class="flex items-center justify-center sm:justify-start gap-1.5">
                <span class="text-slate-400">📍 Address:</span>
                <span class="font-bold text-slate-800">${fullAddress}</span>
              </div>
              <div class="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                <span class="text-slate-400">🏏 Role:</span>
                <span class="font-black text-emerald-700">${roleName}</span>
                <span class="text-slate-300">•</span>
                <span class="text-slate-600 font-medium text-[11px]">${batStyle} / ${bowlStyle}</span>
              </div>
            </div>

            <div class="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button id="profile-edit-btn" class="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Profile
              </button>
              <button id="profile-logout-btn" class="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TOURNAMENT OWNER / MASTER ADMIN CONTROL CONSOLE LAUNCHER -->
      ${isOwner ? `
        <div class="p-5 bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-indigo-950/20 border-2 border-amber-400 rounded-3xl shadow-xl space-y-3">
          <div class="flex items-center gap-3">
            <span class="p-2.5 bg-amber-400 text-slate-950 font-black rounded-2xl text-xl shadow">🏆</span>
            <div>
              <h3 class="font-black text-slate-900 text-sm sm:text-base">${isMaster ? 'Master Super Admin Control Console' : 'Tournament Control Console'}</h3>
              <p class="text-xs text-slate-600">${isMaster ? 'You have full Super Admin control over the entire system.' : 'Manage your tournament — teams, players, auction, verification & scoring.'}</p>
            </div>
          </div>
          <button id="profile-open-admin-console-btn" class="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow flex items-center justify-center gap-2 cursor-pointer border border-amber-300">
            <i data-lucide="shield-check" class="w-4 h-4"></i> ${isMaster ? 'Open Master Admin Panel' : 'Open Tournament Control Dashboard'}
          </button>
        </div>
      ` : ''}

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
            <input type="text" id="edit-player-village" value="${player.village || 'Paschim Medinipur'}" required placeholder="e.g. City, District" class="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 focus:border-blue-500 focus:outline-none" />
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
window.openLiveAuctionProjectorView = openLiveAuctionProjectorView;

// --- MULTI-TENANT TOURNAMENT SAAS CREATION WIZARD (MODE A & MODE B) ---
export function openTournamentCreationWizard(isTrialMode = false) {
  let currentStep = 1;
  let selectedMode = 'AUCTION_LEAGUE'; // 'AUCTION_LEAGUE' (Mode A) or 'FIXTURE_ONLY' (Mode B)
  let uploadedPosterBase64 = '';
  let uploadedQrBase64 = '';

  const modalHtml = `
    <div id="tournament-creation-wizard-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-2 sm:p-4 animate-fade-in bg-slate-950/75 backdrop-blur-sm">
      <div class="bg-white text-slate-900 max-w-2xl w-full max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border-2 border-amber-400 shadow-2xl overflow-hidden">
        
        <!-- MODAL HEADER -->
        <div class="p-2.5 sm:p-3.5 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between gap-2 shrink-0">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border border-amber-300 flex items-center justify-center text-lg sm:text-xl shrink-0 shadow-md font-black">
              🏆
            </span>
            <div>
              <span class="text-[9.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-950 border border-amber-300">
                ${isTrialMode ? '🧪 TRIAL / DRAFT MODE' : '🏆 HOST TOURNAMENT'}
              </span>
              <h2 class="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                Create Your Cricket Tournament
              </h2>
              <p class="text-[10px] font-bold text-slate-500 leading-tight">Create and host your custom tournament online</p>
            </div>
          </div>
          
          <button id="close-tourney-wizard-btn" class="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-950 border border-slate-300 flex items-center justify-center text-sm font-black transition-all shadow-xs cursor-pointer">
            ✕
          </button>
        </div>

        <!-- PROGRESS STEPS BAR -->
        <div class="px-2 py-1.5 sm:p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-around text-[10px] sm:text-xs font-black shrink-0">
          <div id="step-pill-1" class="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-xl bg-amber-400 text-slate-950 shadow-xs border border-amber-300">
            <span>1</span> <span>Identity</span>
          </div>
          <span class="text-slate-300 text-[10px]">➔</span>
          <div id="step-pill-2" class="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-xl bg-white text-slate-500 border border-slate-200">
            <span>2</span> <span>Mode</span>
          </div>
          <span class="text-slate-300 text-[10px]">➔</span>
          <div id="step-pill-3" class="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-xl bg-white text-slate-500 border border-slate-200">
            <span>3</span> <span>Launch</span>
          </div>
        </div>

        <!-- WIZARD BODY CONTAINER -->
        <div id="tourney-wizard-content" class="p-3 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-white">
          <!-- Step 1: Basic Identity -->
          <div id="wizard-step-1" class="space-y-2.5 animate-fade-in">
            <div>
              <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Tournament Name *</label>
              <input type="text" id="wiz-tourney-name" placeholder="e.g. Medinipur Super Trophy 2026" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-400" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Short Code *</label>
                <input type="text" id="wiz-tourney-slug" placeholder="MST2026" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-400 uppercase" />
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Venue *</label>
                <input type="text" id="wiz-tourney-venue" placeholder="Town Club Ground" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-400" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Season</label>
                <input type="text" id="wiz-tourney-season" placeholder="Season 1, 2026" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Total Teams *</label>
                <input type="number" id="wiz-tourney-total-teams" placeholder="8" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-400 font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Start Date *</label>
                <input type="date" id="wiz-tourney-date" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-[11px] text-slate-900 font-bold focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">End Date</label>
                <input type="date" id="wiz-tourney-end-date" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-[11px] text-slate-900 font-bold focus:outline-none focus:border-amber-400" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Winner Prize ₹ *</label>
                <input type="number" id="wiz-tourney-prize" placeholder="35000" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-400 font-mono" />
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Runner-Up ₹</label>
                <input type="number" id="wiz-tourney-runner-prize" placeholder="15000" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-400 font-mono" />
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Poster / Banner (Optional)</label>
              <input type="file" id="wiz-poster-file" accept="image/*" class="w-full text-[11px] text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer" />
            </div>
          </div>

          <!-- Step 2: Choose Mode -->
          <div id="wizard-step-2" class="space-y-2.5 hidden animate-fade-in">
            <label class="block text-[10px] font-black text-slate-700 uppercase">Select Mode *</label>

            <div class="grid grid-cols-2 gap-2">
              <!-- Mode A: Full Auction -->
              <div id="select-mode-a" class="p-2.5 rounded-xl border-2 border-amber-400 bg-amber-50/50 cursor-pointer transition-all space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-black text-amber-950">🔨 Mode A</span>
                  <span class="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center">✓</span>
                </div>
                <p class="text-[10px] font-bold text-amber-900">Full Auction League</p>
                <p class="text-[9px] text-slate-500 leading-tight">Registration + Auction + Squads + Live Scorer</p>
              </div>

              <!-- Mode B: Quick Fixtures -->
              <div id="select-mode-b" class="p-2.5 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition-all space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-black text-slate-900">🏏 Mode B</span>
                  <span class="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[9px] font-black flex items-center justify-center"></span>
                </div>
                <p class="text-[10px] font-bold text-slate-700">Quick Fixtures League</p>
                <p class="text-[9px] text-slate-500 leading-tight">Team Entry + Fixtures + Ball-by-Ball Scoring</p>
              </div>
            </div>

            <!-- Mode A Specific Fields -->
            <div id="mode-a-config-block" class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 class="text-[10px] font-black text-amber-900 uppercase">Auction Settings</h4>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-[9px] font-black text-slate-600 uppercase mb-0.5">Entry Fee ₹</label>
                  <input type="number" id="wiz-entry-fee" value="300" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold font-mono" />
                </div>
                <div>
                  <label class="block text-[9px] font-black text-slate-600 uppercase mb-0.5">Purse ₹</label>
                  <input type="number" id="wiz-team-purse" value="8000" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold font-mono" />
                </div>
                <div>
                  <label class="block text-[9px] font-black text-slate-600 uppercase mb-0.5">Base Price ₹</label>
                  <input type="number" id="wiz-base-price" value="300" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold font-mono" />
                </div>
              </div>

              <div>
                <label class="block text-[9px] font-black text-slate-600 uppercase mb-0.5">UPI ID *</label>
                <input type="text" id="wiz-upi-id" placeholder="organizer@okaxis" class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono" />
              </div>

              <div>
                <label class="block text-[9px] font-black text-slate-600 uppercase mb-0.5">Payment QR Code *</label>
                <input type="file" id="wiz-qr-file" accept="image/*" class="w-full text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-emerald-600 file:text-white cursor-pointer" />
              </div>
            </div>
          </div>

          <!-- Step 3: Organizer Account -->
          <div id="wizard-step-3" class="space-y-2.5 hidden animate-fade-in">
            <h4 class="text-[10px] font-black text-slate-900 uppercase">Organizer Account Setup</h4>

            <div>
              <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Organizer Name *</label>
              <input type="text" id="wiz-org-name" placeholder="e.g. Suman Kolay" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-400" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">WhatsApp / Phone Number *</label>
                <input type="tel" id="wiz-org-phone" placeholder="8972214416" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase mb-0.5">Admin Password *</label>
                <input type="password" id="wiz-org-password" placeholder="Secret Password" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-400" />
              </div>
            </div>
          </div>

          <!-- Success Launch View -->
          <div id="wizard-step-success" class="space-y-3 hidden animate-fade-in text-center py-1">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center text-xl font-black shadow-xs">
              🎉
            </div>
            <div class="space-y-1">
              <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full border border-emerald-300 uppercase">
                TOURNAMENT CREATED SUCCESSFULLY ✅
              </span>
              <h3 id="wiz-success-title" class="text-sm sm:text-base font-black text-slate-900">Tournament Name</h3>
              <p class="text-[11px] text-slate-600">Your tournament portal and registration link are now live!</p>
            </div>

            <div class="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-left space-y-2 text-xs">
              <div>
                <span class="text-[9px] font-black text-slate-500 uppercase block">Hub Link:</span>
                <div class="flex items-center justify-between gap-1.5 mt-0.5">
                  <span id="wiz-success-hub-link" class="font-mono text-[10px] text-blue-700 font-bold truncate">...</span>
                  <button type="button" id="wiz-copy-hub-btn" class="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[9px] font-black shrink-0 cursor-pointer">Copy</button>
                </div>
              </div>

              <div id="wiz-success-reg-container">
                <span class="text-[9px] font-black text-slate-500 uppercase block">Registration Link:</span>
                <div class="flex items-center justify-between gap-1.5 mt-0.5">
                  <span id="wiz-success-reg-link" class="font-mono text-[10px] text-emerald-700 font-bold truncate">...</span>
                  <button type="button" id="wiz-copy-reg-btn" class="px-2 py-0.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded text-[9px] font-black shrink-0 cursor-pointer">Copy</button>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- MODAL FOOTER BUTTONS -->
        <div class="p-2.5 sm:p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button type="button" id="wiz-prev-btn" class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 cursor-pointer hidden">
            ← Back
          </button>
          <div class="flex-1"></div>
          <button type="button" id="wiz-next-btn" class="px-5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-xs border border-amber-300 cursor-pointer transition-all">
            Continue →
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Mode Selection Handlers
  const modeABox = document.getElementById('select-mode-a');
  const modeBBox = document.getElementById('select-mode-b');
  const modeAConfig = document.getElementById('mode-a-config-block');

  modeABox?.addEventListener('click', () => {
    selectedMode = 'AUCTION_LEAGUE';
    modeABox.className = 'p-2.5 rounded-xl border-2 border-amber-400 bg-amber-50/50 cursor-pointer transition-all space-y-1';
    modeBBox.className = 'p-2.5 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition-all space-y-1';
    if (modeAConfig) modeAConfig.classList.remove('hidden');
  });

  modeBBox?.addEventListener('click', () => {
    selectedMode = 'FIXTURE_ONLY';
    modeBBox.className = 'p-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 cursor-pointer transition-all space-y-1';
    modeABox.className = 'p-2.5 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition-all space-y-1';
    if (modeAConfig) modeAConfig.classList.add('hidden');
  });

  // Poster File handler — auto center-crop to 4:3 card aspect
  document.getElementById('wiz-poster-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadedPosterBase64 = await cropBannerImage(file, 600, 0.82);
    }
  });

  // QR File handler
  document.getElementById('wiz-qr-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { uploadedQrBase64 = ev.target.result; };
      reader.readAsDataURL(file);
    }
  });

  const updateStepsUI = () => {
    [1, 2, 3].forEach(s => {
      const stepDiv = document.getElementById(`wizard-step-${s}`);
      const pill = document.getElementById(`step-pill-${s}`);
      if (stepDiv) stepDiv.classList.toggle('hidden', s !== currentStep);
      if (pill) {
        if (s === currentStep) {
          pill.className = 'flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black shadow-xs border border-amber-300';
        } else if (s < currentStep) {
          pill.className = 'flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-bold border border-emerald-300';
        } else {
          pill.className = 'flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-slate-500 border border-slate-200';
        }
      }
    });

    const prevBtn = document.getElementById('wiz-prev-btn');
    const nextBtn = document.getElementById('wiz-next-btn');
    if (prevBtn) prevBtn.classList.toggle('hidden', currentStep <= 1 || currentStep > 3);
    if (nextBtn) {
      if (currentStep === 3) {
        nextBtn.textContent = '🚀 Launch Tournament';
      } else if (currentStep > 3) {
        nextBtn.textContent = 'Done & View Portal';
      } else {
        nextBtn.textContent = 'Continue →';
      }
    }
  };

  document.getElementById('wiz-prev-btn')?.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateStepsUI();
    }
  });

  document.getElementById('wiz-next-btn')?.addEventListener('click', async () => {
    if (currentStep === 1) {
      const name = document.getElementById('wiz-tourney-name')?.value.trim();
      const slug = document.getElementById('wiz-tourney-slug')?.value.trim();
      const venue = document.getElementById('wiz-tourney-venue')?.value.trim();
      if (!name || !slug || !venue) {
        alert("⚠️ Please fill Tournament Name, Slug, and Venue.");
        return;
      }
      currentStep = 2;
      updateStepsUI();
    } else if (currentStep === 2) {
      currentStep = 3;
      updateStepsUI();
    } else if (currentStep === 3) {
      const name = document.getElementById('wiz-tourney-name')?.value.trim();
      const slug = document.getElementById('wiz-tourney-slug')?.value.trim().toLowerCase();
      const venue = document.getElementById('wiz-tourney-venue')?.value.trim();
      const date = document.getElementById('wiz-tourney-date')?.value;
      const prize = document.getElementById('wiz-tourney-prize')?.value || 35000;
      const orgName = document.getElementById('wiz-org-name')?.value.trim();
      const orgPhone = document.getElementById('wiz-org-phone')?.value.trim();
      const orgPass = document.getElementById('wiz-org-password')?.value.trim();

      if (!orgName || !orgPhone || !orgPass) {
        alert("⚠️ Please fill Organizer Name, WhatsApp Number, and Admin Password.");
        return;
      }

      const nextBtn = document.getElementById('wiz-next-btn');
      if (nextBtn) { nextBtn.disabled = true; nextBtn.textContent = 'Uploading images & creating...'; }

      // Upload poster and QR to Cloudinary (fall back to base64 if upload fails)
      let posterUrl = uploadedPosterBase64 || '';
      let paymentQrUrl = uploadedQrBase64 || '';
      const posterFile = document.getElementById('wiz-poster-file');
      const qrFile = document.getElementById('wiz-qr-file');
      try {
        const [posterResult, qrResult] = await Promise.all([
          posterFile?.files[0] ? uploadHDImage(posterFile, `tournaments/${slug}`) : Promise.resolve(null),
          qrFile?.files[0] ? uploadHDImage(qrFile, `tournaments/${slug}`) : Promise.resolve(null)
        ]);
        if (posterResult) posterUrl = posterResult;
        if (qrResult) paymentQrUrl = qrResult;
      } catch (uploadErr) {
        console.warn('Image upload to cloud failed, using local base64:', uploadErr);
      }

      if (nextBtn) { nextBtn.textContent = 'Creating Tournament...'; }

      const season = document.getElementById('wiz-tourney-season')?.value.trim() || '';
      const totalTeams = Number(document.getElementById('wiz-tourney-total-teams')?.value || 8);
      const endDate = document.getElementById('wiz-tourney-end-date')?.value || '';
      const prizeRunner = Number(document.getElementById('wiz-tourney-runner-prize')?.value || 0);

      const tourneyRecord = {
        id: `t_${slug}`,
        name,
        slug,
        shortCode: slug.toUpperCase(),
        venue,
        season,
        totalTeams,
        kickoffDate: date || new Date().toISOString(),
        endDate,
        prizeWinner: Number(prize),
        prizeRunner,
        mode: selectedMode,
        posterUrl,
        entryFee: Number(document.getElementById('wiz-entry-fee')?.value || 300),
        teamPurse: Number(document.getElementById('wiz-team-purse')?.value || 8000),
        basePrice: Number(document.getElementById('wiz-base-price')?.value || 300),
        upiId: document.getElementById('wiz-upi-id')?.value.trim() || '',
        paymentQrUrl,
        organizer: {
          name: orgName,
          phone: orgPhone,
          password: orgPass
        },
        status: 'ACTIVE'
      };

      await store.saveCustomTournament(tourneyRecord);

      // Auto-login the organiser after tournament creation
      const cleanOrgPhone = orgPhone.replace(/[^0-9]/g, '');
      store.setCurrentUser({
        phone: cleanOrgPhone,
        name: orgName,
        role: 'TOURNAMENT_OWNER',
        isFirstLogin: false,
        ownedTournaments: [tourneyRecord.id]
      });
      localStorage.setItem('cpl_admin_auth_v8', 'true');
      renderNavbar();
      renderMobileBottomNav();

      // Show Success step
      currentStep = 4;
      document.getElementById('wizard-step-1')?.classList.add('hidden');
      document.getElementById('wizard-step-2')?.classList.add('hidden');
      document.getElementById('wizard-step-3')?.classList.add('hidden');
      document.getElementById('wizard-step-success')?.classList.remove('hidden');

      document.getElementById('wiz-success-title').textContent = name;
      const hostUrl = window.location.origin + window.location.pathname;
      const hubUrl = `${hostUrl}#t/${slug}`;
      const regUrl = `${hostUrl}#reg-${slug}`;

      document.getElementById('wiz-success-hub-link').textContent = hubUrl;
      document.getElementById('wiz-success-reg-link').textContent = regUrl;

      if (selectedMode === 'FIXTURE_ONLY') {
        document.getElementById('wiz-success-reg-container')?.classList.add('hidden');
      }

      document.getElementById('wiz-copy-hub-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(hubUrl);
        alert("✅ Tournament Hub link copied to clipboard!");
      });
      document.getElementById('wiz-copy-reg-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(regUrl);
        alert("✅ Registration Link copied to clipboard!");
      });

      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.textContent = 'Done & View Portal';
        nextBtn.onclick = () => {
          document.getElementById('tournament-creation-wizard-modal')?.remove();
          navigate(`t/${slug}`);
        };
      }
    }
  });

  const handleClose = () => {
    document.getElementById('tournament-creation-wizard-modal')?.remove();
  };
  document.getElementById('close-tourney-wizard-btn')?.addEventListener('click', handleClose);
}

// --- DYNAMIC TOURNAMENT REGISTRATION MODAL WITH 1-SECOND UNIVERSAL PHONE AUTO-FILL ---
export function openDynamicTournamentRegistrationModal(tourneyIdOrSlug) {
  const tourney = store.getCustomTournamentById(tourneyIdOrSlug) || {
    id: 'default',
    name: 'Tournament',
    entryFee: 300,
    upiId: '',
    paymentQrUrl: ''
  };

  if (!store.isRegistrationOpen()) {
    const regSettings = store.getRegistrationSettings();
    const reason = regSettings.closedReason || 'Registration is currently closed by the Admin.';
    const closedHtml = `
      <div id="dynamic-tournament-reg-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4 animate-fade-in bg-slate-950/75 backdrop-blur-sm">
        <div class="bg-white text-slate-900 max-w-md w-full rounded-2xl border-2 border-red-300 shadow-2xl overflow-hidden">
          <div class="p-5 bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-b-2 border-red-200 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center text-xl shrink-0 shadow-md font-black">🚫</span>
              <h2 class="text-lg font-black text-slate-900">Registration Closed</h2>
            </div>
            <button id="close-reg-closed-modal" class="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-950 border border-slate-300 flex items-center justify-center text-sm font-black transition-all shadow-xs cursor-pointer">✕</button>
          </div>
          <div class="p-6 text-center space-y-4">
            <p class="text-sm font-bold text-slate-700">${tourney.name}</p>
            <p class="text-xs text-slate-500">${reason}</p>
            <button id="close-reg-closed-btn" class="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition-all cursor-pointer">OK, Go Back</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', closedHtml);
    const closeModal = () => document.getElementById('dynamic-tournament-reg-modal')?.remove();
    document.getElementById('close-reg-closed-modal')?.addEventListener('click', closeModal);
    document.getElementById('close-reg-closed-btn')?.addEventListener('click', closeModal);
    return;
  }

  let uploadedPhotoBase64 = '';
  let uploadedReceiptBase64 = '';

  const modalHtml = `
    <div id="dynamic-tournament-reg-modal" class="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-2 sm:p-4 animate-fade-in bg-slate-950/75 backdrop-blur-sm">
      <div class="bg-white text-slate-900 max-w-xl w-full max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border-2 border-emerald-400 shadow-2xl overflow-hidden">
        
        <!-- HEADER -->
        <div class="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-b-2 border-emerald-200 flex items-center justify-between gap-2 shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0 shadow-md font-black">
              🏏
            </span>
            <div>
              <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-200/90 text-emerald-950 border border-emerald-300">
                OFFICIAL PLAYER REGISTRATION
              </span>
              <h2 class="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                ${tourney.name}
              </h2>
            </div>
          </div>
          
          <button id="close-dynamic-reg-modal-btn" class="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-950 border border-slate-300 flex items-center justify-center text-sm font-black transition-all shadow-xs cursor-pointer">
            ✕
          </button>
        </div>

        <!-- BODY -->
        <form id="dynamic-reg-form" class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-white">
          
          <!-- SMART 1-SECOND PHONE NUMBER LOOKUP -->
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50/80 border-2 border-blue-200 p-3 rounded-2xl space-y-1.5">
            <label class="block text-xs font-black text-blue-950 uppercase tracking-wider flex items-center justify-between">
              <span>📱 10-Digit Mobile / WhatsApp Number *</span>
              <span class="text-[9px] font-mono text-blue-700 font-bold bg-white px-2 py-0.5 rounded-full border border-blue-200">⚡ AUTO-FILL ENGINE</span>
            </label>
            <input type="tel" id="dyn-reg-phone" maxlength="10" placeholder="Enter 10-digit mobile number..." class="w-full bg-white border-2 border-blue-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-black focus:outline-none focus:border-blue-500" required />
            <div id="dyn-autofill-notice" class="text-[10px] font-bold text-blue-800 hidden flex items-center gap-1">
              <span>✨ Welcome back! Your cricket profile has been auto-populated.</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
              <input type="text" id="dyn-reg-name" placeholder="Player Full Name" class="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-400" required />
            </div>
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Playing Role *</label>
              <select id="dyn-reg-role" class="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-400">
                <option value="All Rounder">All Rounder</option>
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="Wicket Keeper">Wicket Keeper</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Batting Style</label>
              <select id="dyn-reg-batting" class="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-400">
                <option value="Right Hand Bat">Right Hand Bat</option>
                <option value="Left Hand Bat">Left Hand Bat</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Bowling Style</label>
              <select id="dyn-reg-bowling" class="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-400">
                <option value="Right Arm Medium">Right Arm Medium</option>
                <option value="Right Arm Fast">Right Arm Fast</option>
                <option value="Right Arm Spin">Right Arm Spin</option>
                <option value="Left Arm Fast">Left Arm Fast</option>
                <option value="Left Arm Spin">Left Arm Spin</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Village / Town *</label>
              <input type="text" id="dyn-reg-village" placeholder="e.g. Your City" class="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-400" required />
            </div>
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">District</label>
              <input type="text" id="dyn-reg-district" value="Paschim Medinipur" class="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-400" />
            </div>
          </div>

          <!-- PHOTO UPLOAD & PREVIEW -->
          <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div class="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
              <img id="dyn-preview-photo" src="assets/card_jsl_user.png" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-black text-slate-700 uppercase mb-1">Player HD Photo</label>
              <input type="file" id="dyn-photo-file" accept="image/*" class="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer" />
            </div>
          </div>

          <!-- TOURNAMENT UPI PAYMENT & QR CODE SECTION -->
          <div class="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50/80 border-2 border-amber-300 space-y-2.5 text-center">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-amber-950 uppercase tracking-wider">Tournament Entry Fee</span>
              <span class="text-base font-black text-emerald-700 font-mono">₹ ${tourney.entryFee || 300}</span>
            </div>

            ${tourney.paymentQrUrl ? `
              <div class="w-36 h-36 mx-auto bg-white p-2 rounded-2xl border-2 border-amber-300 shadow-sm">
                <img src="${tourney.paymentQrUrl}" class="w-full h-full object-contain" alt="Tournament UPI QR Code" />
              </div>
            ` : ''}

            ${tourney.upiId ? `
              <div class="text-[11px] font-bold text-amber-900">
                <span>UPI ID: </span><span class="font-mono font-black text-slate-950">${tourney.upiId}</span>
              </div>
            ` : ''}

            <p class="text-[10px] text-slate-600">Scan QR Code using PhonePe / GPay, pay ₹${tourney.entryFee || 300}, and upload payment screenshot below:</p>

            <div class="text-left bg-white p-2.5 rounded-xl border border-amber-200">
              <label class="block text-[10px] font-black text-slate-700 uppercase mb-1">Payment Receipt Screenshot *</label>
              <input type="file" id="dyn-receipt-file" accept="image/*" class="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-emerald-600 file:text-white cursor-pointer" required />
            </div>
          </div>

          <!-- SUBMIT BUTTON -->
          <div class="pt-2">
            <button type="submit" id="dyn-submit-reg-btn" class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-emerald-400">
              <span>Submit Registration to ${tourney.shortCode || 'League'} ➔</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 1-Second Smart Auto-Fill on Mobile Input (Supabase Postgres + Universal Store)
  const phoneInput = document.getElementById('dyn-reg-phone');
  phoneInput?.addEventListener('input', async (e) => {
    const val = e.target.value.trim().replace(/[^0-9]/g, '');
    if (val.length === 10) {
      let existing = store.getUniversalPlayerByPhone(val);
      if (!existing) {
        existing = await dbLookupPlayerByPhone(val);
      }
      if (existing) {
        document.getElementById('dyn-reg-name').value = existing.name || existing.full_name || '';
        document.getElementById('dyn-reg-role').value = existing.category || existing.role || 'All Rounder';
        document.getElementById('dyn-reg-batting').value = existing.battingStyle || existing.batting_style || 'Right Hand Bat';
        document.getElementById('dyn-reg-bowling').value = existing.bowlingStyle || existing.bowling_style || 'Right Arm Medium';
        document.getElementById('dyn-reg-village').value = existing.village || '';
        document.getElementById('dyn-reg-district').value = existing.district || 'Paschim Medinipur';
        const photo = existing.photoUrl || existing.photo_url;
        if (photo) {
          uploadedPhotoBase64 = photo;
          document.getElementById('dyn-preview-photo').src = photo;
        }
        document.getElementById('dyn-autofill-notice')?.classList.remove('hidden');
      } else {
        document.getElementById('dyn-autofill-notice')?.classList.add('hidden');
      }
    } else {
      document.getElementById('dyn-autofill-notice')?.classList.add('hidden');
    }
  });

  // Photo change with auto-compression (< 100 KB)
  document.getElementById('dyn-photo-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImageToTarget(file, 100, 1200);
      const reader = new FileReader();
      reader.onload = (ev) => {
        uploadedPhotoBase64 = ev.target.result;
        document.getElementById('dyn-preview-photo').src = uploadedPhotoBase64;
      };
      reader.readAsDataURL(compressed || file);
    }
  });

  // Receipt change with auto-compression (< 100 KB)
  document.getElementById('dyn-receipt-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImageToTarget(file, 100, 1200);
      const reader = new FileReader();
      reader.onload = (ev) => { uploadedReceiptBase64 = ev.target.result; };
      reader.readAsDataURL(compressed || file);
    }
  });

  // Form submit
  document.getElementById('dynamic-reg-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('dyn-submit-reg-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting Registration...'; }

    const phone = document.getElementById('dyn-reg-phone').value.trim();
    const name = document.getElementById('dyn-reg-name').value.trim();
    const category = document.getElementById('dyn-reg-role').value;
    const battingStyle = document.getElementById('dyn-reg-batting').value;
    const bowlingStyle = document.getElementById('dyn-reg-bowling').value;
    const village = document.getElementById('dyn-reg-village').value.trim();
    const district = document.getElementById('dyn-reg-district').value.trim();

    // Use Supabase UUID for tournament_id (falls back to local ID)
    const effectiveTournamentId = tourney.supabaseId || tourney.tournament_id || tourney.id;
    const atomicRegNo = await dbGetNextRegNumber(effectiveTournamentId);

    const playerData = {
      id: `p_${phone}_${Date.now()}`,
      name,
      phone,
      category,
      role: category,
      battingStyle,
      bowlingStyle,
      village,
      district,
      tournamentId: tourney.id,
      tournament_id: effectiveTournamentId,
      tournamentSlug: tourney.slug,
      tournamentName: tourney.name,
      photoUrl: uploadedPhotoBase64 || '',
      photo_url: uploadedPhotoBase64 || '',
      paymentReceiptUrl: uploadedReceiptBase64 || '',
      registrationStatus: 'PENDING_VERIFICATION',
      paymentStatus: 'PENDING_VERIFICATION',
      reg_number: atomicRegNo,
      serialNo: atomicRegNo || (store.getPlayers().length + 1),
      createdAt: Date.now()
    };

    const docsData = {
      payment_screenshot_url: uploadedReceiptBase64 || '',
      payment_ref: `UPI_${Date.now()}`
    };

    // 1. Save to Supabase Postgres (Multi-Tenant RLS Database)
    await dbRegisterPlayer(playerData, docsData);

    // 2. Save locally and globally in reactive store
    await store.saveUniversalPlayer(playerData);
    store.registerPlayer(playerData);

    document.getElementById('dynamic-tournament-reg-modal')?.remove();

    // Open Beautiful Success Modal
    openRegistrationSuccessModal({
      name: playerData.name,
      registrationId: `${(tourney.shortCode || 'CPL').toUpperCase()}-2026-${String(playerData.serialNo).padStart(4, '0')}`,
      serialNo: playerData.serialNo,
      displayRegistrationNumber: playerData.serialNo,
      photoUrl: playerData.photoUrl,
      category: playerData.category
    });
  });

  const handleClose = () => {
    document.getElementById('dynamic-tournament-reg-modal')?.remove();
  };
  document.getElementById('close-dynamic-reg-modal-btn')?.addEventListener('click', handleClose);
}

window.openTournamentCreationWizard = openTournamentCreationWizard;
window.openDynamicTournamentRegistrationModal = openDynamicTournamentRegistrationModal;
window.openMatchCenterModal = openMatchCenterModal;
window.openMatchPlayingXIModal = openMatchPlayingXIModal;
