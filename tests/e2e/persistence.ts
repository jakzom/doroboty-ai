import type { Page } from "@playwright/test";
import { DATABASE_NAME, SCENARIO_STORE } from "../../src/features/prototype/browser-storage";
import { STORAGE_KEY } from "../../src/features/prototype/storage";

export async function storedRaw(page: Page): Promise<string | null> {
  return page.evaluate(
    ({ database, store, key }) =>
      new Promise<string | null>((resolve, reject) => {
        const open = indexedDB.open(database, 1);
        open.onupgradeneeded = () => open.result.createObjectStore(store);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(store, "readonly");
          const read = tx.objectStore(store).get(key);
          tx.oncomplete = () => {
            db.close();
            resolve(read.result ?? null);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    { database: DATABASE_NAME, store: SCENARIO_STORE, key: STORAGE_KEY },
  );
}

export async function seedRaw(page: Page, raw: string) {
  await page.evaluate(
    ({ database, store, key, raw }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(database, 1);
        open.onupgradeneeded = () => open.result.createObjectStore(store);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(store, "readwrite");
          tx.objectStore(store).put(raw, key);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    { database: DATABASE_NAME, store: SCENARIO_STORE, key: STORAGE_KEY, raw },
  );
}

export async function storedScenario(page: Page) {
  const raw = await storedRaw(page);
  return raw === null ? null : JSON.parse(raw);
}
