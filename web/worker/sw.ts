export const SERVICE_WORKER_SOURCE = String.raw`
const DB_NAME = "zaraz2-offline";
const STORE_NAME = "outbox";

const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const withStore = async (mode, run) => {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;
    try {
      const request = run(store);
      if (request instanceof IDBRequest) {
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => reject(request.error);
      } else {
        result = request;
      }
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

const addEntry = async (entry) => {
  await withStore("readwrite", (store) => store.add(entry));
};

const deleteEntry = async (id) => {
  await withStore("readwrite", (store) => store.delete(id));
};

const listEntries = async () => {
  return await withStore("readonly", (store) => store.getAll());
};

const countEntries = async () => {
  return await withStore("readonly", (store) => store.count());
};

const broadcast = async (message) => {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clients) {
    client.postMessage(message);
  }
};

const notifyQueue = async () => {
  const count = await countEntries();
  await broadcast({ type: "queue", count });
};

const flushQueue = async () => {
  const entries = await listEntries();
  for (const entry of entries) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
        credentials: "include",
      });

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        if (entry.id !== undefined) {
          await deleteEntry(entry.id);
        }
        continue;
      }

      break;
    } catch {
      break;
    }
  }

  await notifyQueue();
};

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await notifyQueue();
    })(),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "outbox") {
    event.waitUntil(flushQueue());
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (!data.type) return;

  if (data.type === "status") {
    event.waitUntil(notifyQueue());
    return;
  }

  if (data.type === "flush") {
    event.waitUntil(flushQueue());
    return;
  }

  if (data.type === "queue") {
    const entry = {
      url: data.url || "/",
      method: data.method || "POST",
      headers: Object.entries(data.headers || {}),
      body: data.body,
      createdAt: Date.now(),
    };

    event.waitUntil(
      (async () => {
        await addEntry(entry);
        await notifyQueue();
        try {
          await self.registration.sync.register("outbox");
        } catch {
          // ignore if not supported
        }
      })(),
    );
  }
});
`;
