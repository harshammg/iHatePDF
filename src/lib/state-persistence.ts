// State persistence utility using IndexedDB for large data and sessionStorage for small data

const DB_NAME = "ihatepdf-state";
const DB_VERSION = 1;
const STORE_NAME = "files";

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Store file bytes in IndexedDB
export async function storeFileBytes(fileName: string, bytes: Uint8Array): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(bytes, "current-file");
    transaction.oncomplete = () => db.close();
  } catch (e) {
    console.warn("Failed to store file bytes in IndexedDB:", e);
  }
}

// Retrieve file bytes from IndexedDB
export async function retrieveFileBytes(): Promise<Uint8Array | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get("current-file");
      
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (e) {
    console.warn("Failed to retrieve file bytes from IndexedDB:", e);
    return null;
  }
}

// Clear file bytes from IndexedDB
export async function clearFileBytes(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete("current-file");
    transaction.oncomplete = () => db.close();
  } catch (e) {
    console.warn("Failed to clear file bytes from IndexedDB:", e);
  }
}

// Store application state in sessionStorage
export function storeState(state: any): void {
  try {
    const stateToStore = {
      fileName: state.fileName,
      pages: state.pages,
      activeId: state.activeId,
      crop: state.crop,
      applyCropToAll: state.applyCropToAll,
      format: state.format,
      jpgQuality: state.jpgQuality,
      imageDpi: state.imageDpi,
      pdfCompression: state.pdfCompression,
      flutterWidget: state.flutterWidget,
    };
    sessionStorage.setItem("ihatepdf-state", JSON.stringify(stateToStore));
  } catch (e) {
    console.warn("Failed to store state in sessionStorage:", e);
  }
}

// Retrieve application state from sessionStorage
export function retrieveState(): any {
  try {
    const stored = sessionStorage.getItem("ihatepdf-state");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to retrieve state from sessionStorage:", e);
  }
  return null;
}

// Clear application state from sessionStorage
export function clearState(): void {
  try {
    sessionStorage.removeItem("ihatepdf-state");
  } catch (e) {
    console.warn("Failed to clear state from sessionStorage:", e);
  }
}

// Clear all persisted data
export async function clearAllPersistedData(): Promise<void> {
  await clearFileBytes();
  clearState();
}
