export const SERVICE_WORKER_SOURCE = String.raw`
const DB_NAME = "zaraz2-offline";
const STORE_NAME = "outbox";
const PAGE_CACHE = "zaraz2-pages";
const HOME_URL = new URL("/home", self.location.origin).toString();

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

const cacheHomeResponse = async (response) => {
  const cache = await caches.open(PAGE_CACHE);
  await cache.put(HOME_URL, response);
};

const getCachedHomeResponse = async () => {
  const cache = await caches.open(PAGE_CACHE);
  return await cache.match(HOME_URL);
};

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const padCount = (value) => String(value).padStart(3, "0");

const readTaskCount = (html) => {
  const match = html.match(/id="task-count"[^>]*>([\s\S]*?)<\/span>/);
  if (!match) return null;
  const raw = match[1].replace(/<[^>]*>/g, "").trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const readTask = (html) => {
  const idMatch = html.match(/id="task"[^>]*data-task-id="([^"]*)"/);
  const textMatch = html.match(/<div[^>]*id="task"[^>]*>([\s\S]*?)<\/div>/);
  if (!textMatch) return null;
  const text = textMatch[1].replace(/<[^>]*>/g, "").trim();
  if (!text) return null;
  return {
    id: idMatch ? idMatch[1] : null,
    text,
  };
};

const setElementAttr = (html, elementId, attr, value) => {
  const re = new RegExp('(<[^>]*\\\\bid="' + elementId + '"[^>]*)(>)');
  return html.replace(re, (match, start, end) => {
    let updated = start.replace(
      new RegExp('\\\\s' + attr + '(?:="[^"]*")?', "g"),
      "",
    );
    if (value !== null && value !== undefined) {
      if (value === true || value === "") {
        updated += " " + attr;
      } else {
        updated += " " + attr + '="' + value + '"';
      }
    }
    return updated + end;
  });
};

const replaceInnerById = (html, elementId, content) => {
  const re = new RegExp(
    '(<[^>]*\\\\bid="' + elementId + '"[^>]*>)([\\\\s\\\\S]*?)(</[^>]+>)',
  );
  return html.replace(re, (match, start, _inner, end) => {
    return start + content + end;
  });
};

const applyHomeEvent = (html, event) => {
  if (!event || !event.type) return html;

  const current = readTask(html);
  let completed = readTaskCount(html) ?? 0;
  let nextTask = current;

  if (event.type === "task.add") {
    if (!event.text) return html;
    nextTask = {
      id: event.taskId || "local-" + Date.now(),
      text: event.text,
    };
  } else if (event.type === "task.done") {
    completed += 1;
    nextTask = null;
  }

  const direction = event.type === "task.done" ? "up" : "right";
  html = setElementAttr(html, "task", "data-direction", direction);
  html = setElementAttr(html, "task", "data-view-transition", "true");

  if (nextTask) {
    const safeText = escapeHtml(nextTask.text);
    const safeId = nextTask.id ? escapeHtml(nextTask.id) : "";
    html = replaceInnerById(html, "task", safeText);
    html = setElementAttr(html, "task", "data-task-id", safeId);
    html = setElementAttr(html, "task", "data-task-text", safeText);
    html = setElementAttr(html, "task", "data-last", null);
    html = setElementAttr(html, "task", "hidden", null);
    html = setElementAttr(html, "home-root", "data-empty", null);
    html = setElementAttr(html, "task-empty", "hidden", "");
  } else {
    html = replaceInnerById(html, "task", "");
    html = setElementAttr(html, "task", "data-task-id", null);
    html = setElementAttr(html, "task", "data-task-text", null);
    html = setElementAttr(html, "task", "data-last", "");
    html = setElementAttr(html, "task", "hidden", "");
    html = setElementAttr(html, "home-root", "data-empty", "");
    html = setElementAttr(html, "task-empty", "hidden", null);
  }

  html = replaceInnerById(html, "task-count", padCount(completed));
  return html;
};

const parseEventFromBody = async (request, bodyRequest) => {
  // Controller submissions post multipart FormData; no-JS form posts are
  // urlencoded. Both must patch the cached page the same way.
  const contentType = request.headers.get("Content-Type") || "";
  let params;
  if (contentType.includes("multipart/form-data")) {
    const formData = await bodyRequest.formData();
    params = {
      get(key) {
        const value = formData.get(key);
        return typeof value === "string" ? value : null;
      },
    };
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    params = new URLSearchParams(await bodyRequest.text());
  } else {
    return null;
  }
  let type = params.get("event_type");
  let taskId = params.get("event_task_id");
  let text = params.get("event_text");

  if (!type) {
    const intent = params.get("intent");
    if (intent === "another") {
      type = "task.add";
      text = params.get("another");
    } else if (intent === "done") {
      type = "task.done";
      taskId = params.get("id");
    } else if (intent === "cycle") {
      type = "task.cycle";
    }
  }

  if (!type) return null;
  return { type, taskId, text };
};

const queueRequest = async (request, bodyRequest) => {
  const headers = [];
  request.headers.forEach((value, key) => {
    headers.push([key, value]);
  });
  const body = await bodyRequest.arrayBuffer();
  const entry = {
    url: request.url,
    method: request.method,
    headers,
    body,
    createdAt: Date.now(),
  };

  await addEntry(entry);
  await notifyQueue();
  try {
    await self.registration.sync.register("outbox");
  } catch {
    // ignore if not supported
  }
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

self.addEventListener("fetch", (event) => {
  const { request } = event;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.method === "GET" && url.pathname === "/home") {
    event.respondWith(
      (async () => {
        const response = await fetch(request);
        if (response.ok) {
          event.waitUntil(cacheHomeResponse(response.clone()));
        }
        return response;
      })(),
    );
    return;
  }

  if (request.method !== "POST" || url.pathname !== "/home") {
    return;
  }

  event.respondWith(
    (async () => {
      const bodyForQueue = request.clone();
      const bodyForParse = request.clone();
      try {
        const response = await fetch(request);
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
      } catch {
        // fall through to queue
      }

      await queueRequest(request, bodyForQueue);

      const cached = await getCachedHomeResponse();
      if (!cached) {
        return new Response("Queued offline.", {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Offline-Queued": "1",
          },
        });
      }

      const eventData = await parseEventFromBody(request, bodyForParse);
      const cachedHtml = await cached.text();
      const nextHtml = applyHomeEvent(cachedHtml, eventData);
      return new Response(nextHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Offline-Queued": "1",
        },
      });
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
});
`;
