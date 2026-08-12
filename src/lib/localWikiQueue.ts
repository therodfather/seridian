const DB_NAME = "seridian-wiki-queue";
const DB_VERSION = 1;
const STORE_NAME = "wiki-queue";
const BATCH_THRESHOLD = 5;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("synced", "synced", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

export interface WikiQueueItem {
  id: string;
  type: "create" | "update";
  bankId: string;
  pageId?: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  synced: boolean;
  syncAttempts: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  synced: number;
}

function generateId(): string {
  return `wiki-queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function addToQueue(
  item: Omit<WikiQueueItem, "id" | "synced" | "syncAttempts">
): Promise<WikiQueueItem> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const queueItem: WikiQueueItem = {
    id: generateId(),
    type: item.type,
    bankId: item.bankId,
    pageId: item.pageId,
    title: item.title,
    content: item.content,
    tags: item.tags,
    createdAt: Date.now(),
    synced: false,
    syncAttempts: 0,
  };

  store.add(queueItem);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(queueItem); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getQueuedItems(): Promise<WikiQueueItem[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      resolve(request.result.filter((item) => !item.synced));
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function markSynced(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const item = request.result;
      if (item) {
        item.synced = true;
        store.put(item);
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function incrementSyncAttempts(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const item = request.result;
      if (item) {
        item.syncAttempts += 1;
        store.put(item);
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearSynced(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const request = store.openCursor();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        if (cursor.value.synced) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getQueueStats(): Promise<QueueStats> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      const items = request.result;
      const pending = items.filter((item) => !item.synced).length;
      const synced = items.filter((item) => item.synced).length;
      resolve({ total: items.length, pending, synced });
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function shouldAutoSync(): Promise<boolean> {
  const stats = await getQueueStats();
  return stats.pending >= BATCH_THRESHOLD;
}
