import { initialState, type State } from "./model";
import {
  MAX_IMPORT_BYTES,
  readState,
  serializeState,
  STORAGE_KEY,
  StorageConflictError,
  type StoragePort,
} from "./storage";

export const DATABASE_NAME = "doroboty.prototype";
export const SCENARIO_STORE = "scenarios";
const STORAGE_DEADLINE = 10_000;
export const MEMORY_NOTICE =
  "Bezpieczny zapis w tej przeglądarce jest niedostępny. Wyeksportuj zmiany w ustawieniach przed zamknięciem strony.";
const WRITE_NOTICE =
  "Nie udało się zapisać zmian w przeglądarce. Wyeksportuj dane przed zamknięciem strony i odśwież ją przed kolejną próbą zapisu.";

function legacyStorage(): StoragePort | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finishError = () => {
      settled = true;
      clearTimeout(timer);
      reject(new Error(MEMORY_NOTICE));
    };
    const timer = setTimeout(finishError, STORAGE_DEADLINE);
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DATABASE_NAME, 1);
    } catch {
      finishError();
      return;
    }
    request.onupgradeneeded = () => {
      if (settled) {
        request.transaction?.abort();
        return;
      }
      request.result.createObjectStore(SCENARIO_STORE);
    };
    request.onblocked = finishError;
    request.onerror = finishError;
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      clearTimeout(timer);
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

// Read/check/write all happen inside one readwrite transaction across every tab.
// Never resolve on put.onsuccess: a later transaction abort must not announce success.
function transact<T>(
  db: IDBDatabase,
  update: (store: IDBObjectStore, raw: unknown) => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCENARIO_STORE, "readwrite", { durability: "strict" });
    const store = tx.objectStore(SCENARIO_STORE);
    let result: T;
    let failure: unknown;
    const timer = setTimeout(() => {
      failure = new Error(WRITE_NOTICE);
      tx.abort();
    }, STORAGE_DEADLINE);
    tx.oncomplete = () => {
      clearTimeout(timer);
      resolve(result);
    };
    tx.onabort = () => {
      clearTimeout(timer);
      reject(failure ?? new Error(WRITE_NOTICE));
    };
    tx.onerror = () => {
      failure ??= new Error(WRITE_NOTICE);
    };
    const request = store.get(STORAGE_KEY);
    request.onsuccess = () => {
      try {
        result = update(store, request.result);
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
  });
}

function decode(raw: string | null) {
  return readState({ getItem: () => raw, setItem() {} });
}

export async function loadBrowserState() {
  let db: IDBDatabase | undefined;
  try {
    db = await openDatabase();
    let migrated: string | null = null;
    const loaded = await transact(db, (store, existing) => {
      if (existing !== undefined) {
        if (existing !== null && typeof existing !== "string") throw new Error(WRITE_NOTICE);
        return decode(existing);
      }
      const legacy = legacyStorage();
      const result = readState(
        legacy ?? {
          getItem() {
            throw new Error("Legacy storage is inaccessible");
          },
          setItem() {},
        },
      );
      // An unreadable legacy value cannot be silently replaced with an empty save.
      if (result.blocked && result.original === null) return result;
      migrated = result.savedRaw;
      store.put(result.savedRaw, STORAGE_KEY);
      return result;
    });
    // Only remove the old copy after the transaction committed; changed legacy data stays intact.
    if (migrated !== null) {
      try {
        if (window.localStorage.getItem(STORAGE_KEY) === migrated)
          window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* The committed IndexedDB copy remains authoritative. */
      }
    }
    return { ...loaded, durable: true };
  } catch {
    return { ...readState(legacyStorage()), issue: MEMORY_NOTICE, durable: false };
  } finally {
    db?.close();
  }
}

export async function saveBrowserState(state: State, expectedRaw: string | null) {
  const raw = serializeState(state);
  if (new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES)
    throw new Error("Dane przekraczają 2 MB. Wyeksportuj je, aby zachować zmiany.");
  const db = await openDatabase();
  try {
    return await transact(db, (store, current) => {
      if ((current ?? null) !== expectedRaw) throw new StorageConflictError();
      store.put(raw, STORAGE_KEY);
      return raw;
    });
  } catch (error) {
    if (error instanceof StorageConflictError) throw error;
    throw new Error(WRITE_NOTICE);
  } finally {
    db.close();
  }
}

export function pendingBrowserState() {
  return { state: initialState(), original: null as string | null };
}
