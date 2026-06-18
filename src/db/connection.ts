import { createSchema, DB_NAME, DB_VERSION } from './schema';

let activeConnection: IDBDatabase | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (activeConnection) return Promise.resolve(activeConnection);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      createSchema(request.result);
    };

    request.onsuccess = () => {
      activeConnection = request.result;
      activeConnection.onversionchange = () => {
        activeConnection?.close();
        activeConnection = null;
      };
      resolve(request.result);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
