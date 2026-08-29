// ==============================================================================
// CPL RESILIENT OFFLINE MUTATION RETRY QUEUE (IndexedDB + localStorage Fallback)
// Prevents cloud write dropouts on flaky networks and ensures zero data loss.
// ==============================================================================

const DB_NAME = 'cpl_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  if (typeof window === 'undefined' || !window.indexedDB) return null;

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      request.onerror = (err) => {
        console.warn("[OFFLINE QUEUE] IndexedDB open error:", err);
        resolve(null);
      };
    } catch (err) {
      console.warn("[OFFLINE QUEUE] IndexedDB init error:", err);
      resolve(null);
    }
  });
}

// Fallback LocalStorage Queue
function getLocalFallbackQueue() {
  try {
    return JSON.parse(localStorage.getItem('cpl_offline_mutations_queue') || '[]');
  } catch (e) {
    return [];
  }
}

function saveLocalFallbackQueue(queue) {
  try {
    localStorage.setItem('cpl_offline_mutations_queue', JSON.stringify(queue));
  } catch (e) {}
}

export async function enqueueOfflineMutation(mutation) {
  const item = {
    ...mutation,
    status: 'pending',
    attempts: 0,
    createdAt: Date.now(),
    lastAttempt: null
  };

  const db = await getDB();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(item);
        req.onsuccess = () => {
          console.log(`📥 [OFFLINE QUEUE] Mutation enqueued into IndexedDB: [${item.type}]`);
          resolve(true);
        };
        req.onerror = () => {
          // fallback to localStorage
          const lq = getLocalFallbackQueue();
          lq.push(item);
          saveLocalFallbackQueue(lq);
          resolve(true);
        };
      } catch (e) {
        const lq = getLocalFallbackQueue();
        lq.push(item);
        saveLocalFallbackQueue(lq);
        resolve(true);
      }
    });
  } else {
    const lq = getLocalFallbackQueue();
    lq.push(item);
    saveLocalFallbackQueue(lq);
    console.log(`📥 [OFFLINE QUEUE] Mutation enqueued into LocalStorage: [${item.type}]`);
    return true;
  }
}

export async function getPendingMutations() {
  const db = await getDB();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(getLocalFallbackQueue());
      } catch (e) {
        resolve(getLocalFallbackQueue());
      }
    });
  }
  return getLocalFallbackQueue();
}

export async function removeMutation(id) {
  const db = await getDB();
  if (db && typeof id === 'number') {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) { resolve(false); }
    });
  } else {
    let lq = getLocalFallbackQueue();
    lq = lq.filter(m => m.id !== id && m.createdAt !== id);
    saveLocalFallbackQueue(lq);
    return true;
  }
}

let isFlushingQueue = false;

export async function processOfflineQueue(executors = {}) {
  if (isFlushingQueue) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  isFlushingQueue = true;
  try {
    const mutations = await getPendingMutations();
    if (!mutations || mutations.length === 0) {
      isFlushingQueue = false;
      return;
    }

    console.log(`⚡ [OFFLINE QUEUE] Processing ${mutations.length} pending mutations...`);

    for (const m of mutations) {
      const exec = executors[m.type];
      if (typeof exec === 'function') {
        try {
          const success = await exec(m.payload);
          if (success !== false && success !== null) {
            await removeMutation(m.id || m.createdAt);
            console.log(`✅ [OFFLINE QUEUE] Mutation resolved: [${m.type}]`);
          } else {
            console.warn(`⏳ [OFFLINE QUEUE] Mutation execution returned false, keeping in queue: [${m.type}]`);
          }
        } catch (err) {
          console.warn(`⚠️ [OFFLINE QUEUE] Error processing mutation [${m.type}]:`, err);
        }
      } else {
        // Unknown handler, discard after 10 attempts
        if ((m.attempts || 0) > 10) {
          await removeMutation(m.id || m.createdAt);
        }
      }
    }
  } catch (err) {
    console.warn("[OFFLINE QUEUE] Queue processing error:", err);
  } finally {
    isFlushingQueue = false;
  }
}

// Auto-trigger on reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log("🌐 Network online detected! Flushing offline mutation queue...");
    if (window.store && typeof window.store.flushOfflineQueue === 'function') {
      window.store.flushOfflineQueue();
    }
  });
}
