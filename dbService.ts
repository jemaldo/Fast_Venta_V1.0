
const DB_NAME = 'SportMasterDB';
const DB_VERSION = 1;
const STORES = ['products', 'sales', 'credits', 'customers', 'users', 'config'];

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveData = async (storeName: string, data: any) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data, 'current_data'); // Usamos una sola clave para mantener la estructura actual de objetos
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const getData = async (storeName: string): Promise<any> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get('current_data');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
