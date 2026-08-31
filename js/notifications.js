// Web Push Notifications & Real-Time Live Match Alerts Engine
// Supports PWA Service Worker Notifications & HTML5 Desktop/Mobile Web Notifications

const STORAGE_KEY_NOTIFS_ENABLED = 'cpl_notifications_enabled';
let swRegistration = null;

/**
 * Initialize Service Worker & Push Notification engine
 */
export async function initPushNotifications() {
  if (typeof window === 'undefined') return { supported: false };

  const isSupported = ('serviceWorker' in navigator) && ('Notification' in window);
  if (!isSupported) {
    console.log('Web Push Notifications are not supported in this browser environment.');
    return { supported: false, permission: 'unsupported' };
  }

  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    console.log('PWA Service Worker registered with scope:', swRegistration.scope);
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
  }

  const permission = Notification.permission;
  return { supported: true, permission, enabled: isNotificationsEnabled() };
}

/**
 * Check if the user has enabled match alerts in app settings
 */
export function isNotificationsEnabled() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  const pref = localStorage.getItem(STORAGE_KEY_NOTIFS_ENABLED);
  return Notification.permission === 'granted' && pref !== 'false';
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    alert('Notifications are not supported by your current browser.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(STORAGE_KEY_NOTIFS_ENABLED, 'true');
      sendLocalNotification({
        title: '?? Live Match Alerts Enabled!',
        body: 'You will now receive real-time notifications for Live Matches, Wickets & Results!',
        url: window.location.href
      });
      return true;
    } else {
      localStorage.setItem(STORAGE_KEY_NOTIFS_ENABLED, 'false');
      return false;
    }
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return false;
  }
}

/**
 * Toggle user notification preference
 */
export async function toggleNotificationSetting() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission !== 'granted') {
    return await requestNotificationPermission();
  }

  const current = isNotificationsEnabled();
  const next = !current;
  localStorage.setItem(STORAGE_KEY_NOTIFS_ENABLED, String(next));
  return next;
}

/**
 * Dispatch a rich local browser / PWA notification
 */
export function sendLocalNotification({ title, body, icon, url }) {
  if (!isNotificationsEnabled()) return;

  const notifIcon = icon || 'assets/jsl_logo_white.jpg';
  const targetUrl = url || window.location.href;

  if (swRegistration && swRegistration.showNotification) {
    swRegistration.showNotification(title, {
      body,
      icon: notifIcon,
      badge: notifIcon,
      vibrate: [200, 100, 200],
      data: { url: targetUrl }
    }).catch(() => {
      new Notification(title, { body, icon: notifIcon });
    });
  } else {
    try {
      const n = new Notification(title, { body, icon: notifIcon });
      n.onclick = () => {
        window.focus();
        if (targetUrl) window.location.href = targetUrl;
      };
    } catch (e) {
      console.warn('Fallback notification failed:', e);
    }
  }
}

/**
 * Trigger alert when a match goes LIVE
 */
export function notifyMatchLive(fixture, tourney) {
  if (!fixture) return;
  const tourneyName = (tourney?.name || fixture.leagueCode || 'Cricket Premier League').toUpperCase();
  sendLocalNotification({
    title: `?? MATCH IS NOW LIVE!`,
    body: `${fixture.teamAName} vs ${fixture.teamBName} • ${tourneyName}\nTap to watch live scorecard!`,
    url: `${window.location.origin}${window.location.pathname}#t/${tourney?.slug || 'tournament'}?tab=matches`
  });
}

/**
 * Trigger alert when a match finishes with result
 */
export function notifyMatchResult(fixture, tourney) {
  if (!fixture) return;
  const result = fixture.result || fixture.resultText || 'Match Completed';
  sendLocalNotification({
    title: `?? MATCH RESULT DECLARED!`,
    body: `${fixture.teamAName} vs ${fixture.teamBName}\n?? ${result}`,
    url: `${window.location.origin}${window.location.pathname}#t/${tourney?.slug || 'tournament'}?tab=matches`
  });
}

/**
 * Trigger alert when a wicket falls
 */
export function notifyWicketFall(fixture, batterName, bowlerName) {
  if (!fixture) return;
  sendLocalNotification({
    title: `?? WICKET DOWN!`,
    body: `${batterName || 'Batter'} dismissed! (${fixture.teamAName} vs ${fixture.teamBName})\nBowled by ${bowlerName || 'Bowler'}.`,
    url: `${window.location.origin}${window.location.pathname}#t/${fixture.tournamentSlug || 'tournament'}?tab=matches`
  });
}

if (typeof window !== 'undefined') {
  window.initPushNotifications = initPushNotifications;
  window.requestNotificationPermission = requestNotificationPermission;
  window.toggleNotificationSetting = toggleNotificationSetting;
  window.isNotificationsEnabled = isNotificationsEnabled;
  window.notifyMatchLive = notifyMatchLive;
  window.notifyMatchResult = notifyMatchResult;
  window.notifyWicketFall = notifyWicketFall;
}
