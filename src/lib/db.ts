"use client";

const DB_NAME = "alice-atendimentos-db";
const DB_VERSION = 1;
const STORE_NAME = "kv";

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAll(): Promise<Map<string, unknown>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const map = new Map<string, unknown>();
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        map.set(cursor.key as string, cursor.value);
        cursor.continue();
      } else {
        resolve(map);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Migrate all localStorage keys that start with "alice-" into IndexedDB.
 * Runs once — subsequent calls are no-ops.
 */
export async function migrateToIDB(storageKeys: readonly string[]): Promise<void> {
  if (typeof window === "undefined") return;

  const migrated = localStorage.getItem("alice-migrated-idb");
  if (migrated === "1") return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (const key of storageKeys) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          store.put(JSON.parse(raw), key);
        } catch {
          store.put(raw, key);
        }
      }
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    localStorage.setItem("alice-migrated-idb", "1");
  } catch {
    // IDB unavailable — localStorage remains the source of truth
  }
}

/**
 * Load all keys from IDB into the provided cache map.
 */
export async function loadCacheFromIDB(cache: Map<string, unknown>): Promise<void> {
  try {
    const all = await idbGetAll();
    for (const [key, value] of all) {
      cache.set(key, value);
    }
  } catch {
    // IDB unavailable — cache stays populated from localStorage
  }
}

/**
 * Check if IndexedDB is available in this environment.
 */
export function isIDBAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}
