const DB_NAME = "seridian-docs";
const DB_VERSION = 1;
const STORE_NAME = "documents";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "fileId" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
  });
}

export interface LocalDoc {
  fileId: string;
  content: string;
  updatedAt: number;
  synced: boolean;
}

export async function saveLocal(fileId: string, content: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  
  const doc: LocalDoc = {
    fileId,
    content,
    updatedAt: Date.now(),
    synced: false,
  };
  
  store.put(doc);
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadLocal(fileId: string): Promise<LocalDoc | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(fileId);
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => { db.close(); resolve(request.result || null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function markSynced(fileId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(fileId);
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const doc = request.result;
      if (doc) {
        doc.synced = true;
        store.put(doc);
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getUnsyncedDocs(): Promise<LocalDoc[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("updatedAt");
  const request = index.openCursor();
  const docs: LocalDoc[] = [];
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const doc = cursor.value;
        if (!doc.synced) {
          docs.push(doc);
        }
        cursor.continue();
      } else {
        db.close();
        resolve(docs);
      }
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
