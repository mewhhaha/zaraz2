(() => {
  const SERVICE_WORKER_URL = "/sw.js";
  const trustedTypesPolicyName = "zaraz2-service-worker";

  const getTrustedServiceWorkerUrl = () => {
    if (!window.trustedTypes) {
      return SERVICE_WORKER_URL;
    }

    const policy = window.trustedTypes.createPolicy(trustedTypesPolicyName, {
      createScriptURL(value) {
        if (value !== SERVICE_WORKER_URL) {
          throw new TypeError("Unexpected service worker URL");
        }
        return value;
      },
    });

    return policy.createScriptURL(SERVICE_WORKER_URL);
  };

  const statusEl = document.getElementById("connection-status");
  const stateEl = document.getElementById("connection-state");
  const queueEl = document.getElementById("queue-count");

  let queueCount = 0;

  const setUI = () => {
    if (!statusEl) return;
    const offline = navigator.onLine === false;
    const show = offline || queueCount > 0;
    statusEl.classList.toggle("hidden", !show);
    statusEl.dataset.offline = offline ? "true" : "false";
    statusEl.dataset.queue = String(queueCount);
    if (stateEl) {
      stateEl.textContent = offline ? "Offline" : "Online";
    }
    if (queueEl) {
      queueEl.textContent = `${queueCount} queued`;
      queueEl.hidden = queueCount === 0;
    }
  };

  const postMessage = (message) => {
    const controller = navigator.serviceWorker?.controller;
    if (controller) {
      controller.postMessage(message);
      return true;
    }
    return false;
  };

  const requestStatus = async () => {
    if (postMessage({ type: "status" })) {
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: "status" });
    } catch {
      // ignore
    }
  };

  window.addEventListener("online", () => {
    setUI();
    postMessage({ type: "flush" });
  });
  window.addEventListener("offline", setUI);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register(getTrustedServiceWorkerUrl(), { scope: "/" })
      .catch(() => undefined);

    navigator.serviceWorker.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || data.type !== "queue") return;
      queueCount = typeof data.count === "number" ? data.count : 0;
      setUI();
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      requestStatus();
    });
  }

  requestStatus();
  setUI();
})();
