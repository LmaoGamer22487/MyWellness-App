// Offline storage and sync utilities for MyWellness App
const DB_NAME = 'mywellness_offline';
const DB_VERSION = 1;
const STORES = ['alcohol_logs', 'sleep_logs', 'nutrition_logs', 'spending_logs', 'exercise_logs', 'sync_queue'];

// Open IndexedDB
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };
  });
};

// Save item to local storage
export const saveToLocal = async (storeName, item) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get all items from local storage
export const getFromLocal = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Delete item from local storage
export const deleteFromLocal = async (storeName, id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Clear store
export const clearStore = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Add to sync queue (for offline changes)
export const addToSyncQueue = async (action, storeName, data) => {
  const item = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action, // 'create', 'update', 'delete'
    storeName,
    data,
    timestamp: new Date().toISOString()
  };
  await saveToLocal('sync_queue', item);
};

// Get sync queue
export const getSyncQueue = async () => {
  return getFromLocal('sync_queue');
};

// Clear sync queue
export const clearSyncQueue = async () => {
  return clearStore('sync_queue');
};

// Check if online
export const isOnline = () => navigator.onLine;

// Sync manager
export class SyncManager {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.isSyncing = false;
    
    // Listen for online status
    window.addEventListener('online', () => this.sync());
    
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_REQUIRED') {
          this.sync();
        }
      });
    }
  }
  
  async sync() {
    if (this.isSyncing || !isOnline()) return;
    
    this.isSyncing = true;
    console.log('Starting sync...');
    
    try {
      // Get local data
      const localData = {
        alcohol_logs: await getFromLocal('alcohol_logs'),
        sleep_logs: await getFromLocal('sleep_logs'),
        nutrition_logs: await getFromLocal('nutrition_logs'),
        spending_logs: await getFromLocal('spending_logs'),
        exercise_logs: await getFromLocal('exercise_logs')
      };
      
      // Push local data to server
      const pushResponse = await fetch(`${this.apiUrl}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(localData)
      });
      
      if (pushResponse.ok) {
        console.log('Push sync complete');
      }
      
      // Pull server data
      const lastSync = localStorage.getItem('lastSync');
      const pullUrl = lastSync 
        ? `${this.apiUrl}/sync/pull?since=${encodeURIComponent(lastSync)}`
        : `${this.apiUrl}/sync/pull`;
        
      const pullResponse = await fetch(pullUrl, {
        credentials: 'include'
      });
      
      if (pullResponse.ok) {
        const serverData = await pullResponse.json();
        
        // Merge server data with local
        for (const log of serverData.alcohol_logs || []) {
          await saveToLocal('alcohol_logs', log);
        }
        for (const log of serverData.sleep_logs || []) {
          await saveToLocal('sleep_logs', log);
        }
        for (const log of serverData.nutrition_logs || []) {
          await saveToLocal('nutrition_logs', log);
        }
        for (const log of serverData.spending_logs || []) {
          await saveToLocal('spending_logs', log);
        }
        for (const log of serverData.exercise_logs || []) {
          await saveToLocal('exercise_logs', log);
        }
        
        localStorage.setItem('lastSync', serverData.timestamp);
        console.log('Pull sync complete');
      }
      
      // Clear sync queue
      await clearSyncQueue();
      
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}

// Register service worker
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};
