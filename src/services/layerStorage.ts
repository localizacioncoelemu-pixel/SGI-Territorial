import { KmzLayer } from '../types';

const DB_NAME = 'sig_comunal_layers_db';
const STORE_NAME = 'layers_store';
const DB_VERSION = 1;

/**
 * Opens and initializes the IndexedDB database for large GIS/KMZ layer persistence
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Saves a layer to IndexedDB
 */
export async function saveLayerToLocalDB(layer: KmzLayer): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(layer);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Fallback to LocalStorage for layer:', err);
    try {
      const existing = getLayersFromLocalStorage();
      const filtered = existing.filter((l) => l.id !== layer.id);
      localStorage.setItem('sig_cached_layers', JSON.stringify([layer, ...filtered]));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }
}

/**
 * Retrieves all layers stored in IndexedDB
 */
export async function getAllLayersFromLocalDB(): Promise<KmzLayer[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as KmzLayer[];
        if (results && results.length > 0) {
          resolve(results);
        } else {
          resolve(getLayersFromLocalStorage());
        }
      };

      request.onerror = () => {
        resolve(getLayersFromLocalStorage());
      };
    });
  } catch {
    return getLayersFromLocalStorage();
  }
}

/**
 * Deletes a layer from IndexedDB
 */
export async function deleteLayerFromLocalDB(layerId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(layerId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error deleting layer from IndexedDB:', err);
    try {
      const existing = getLayersFromLocalStorage();
      const filtered = existing.filter((l) => l.id !== layerId);
      localStorage.setItem('sig_cached_layers', JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }
}

/**
 * Clears all custom layers in IndexedDB and LocalStorage
 */
export async function clearAllLocalLayers(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('Error clearing IndexedDB:', e);
  }
  try {
    localStorage.removeItem('sig_cached_layers');
  } catch {
    // ignore
  }
}

function getLayersFromLocalStorage(): KmzLayer[] {
  try {
    const raw = localStorage.getItem('sig_cached_layers');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Recursively removes all `undefined` values from an object/array
 * so that Firestore setDoc or JSON serialization never fails.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result as T;
  }

  return data;
}
