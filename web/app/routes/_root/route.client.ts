/// <reference lib="dom" />
import { authenticate } from "@packages/passkey";

let busy = false;

const refresh = async () => {
  const challengeUri = "/auth/challenge";

  const expiresInput = document.querySelector("input[name=expires]");
  const credentialIdInput = document.querySelector("input[name=credential-id]");

  if (!(expiresInput instanceof HTMLInputElement)) {
    console.log("Missing expires input");
    return;
  }

  if (!(credentialIdInput instanceof HTMLInputElement)) {
    console.log("Missing credentialId input");
    return;
  }

  let response;
  if (new Date(expiresInput.value) > new Date()) {
    response = await fetch("/auth/refresh", {
      method: "POST",
    });
  } else {
    const token = await authenticate(challengeUri, [credentialIdInput.value]);
    const formData = new FormData();
    formData.set("token", token);
    response = await fetch("/auth/verify", {
      method: "POST",
      body: formData,
      redirect: "manual",
    });
  }

  if (response.ok) {
    const { expires }: { expires: string } = await response.json();
    expiresInput.value = expires;
  }
};

document.addEventListener("visibilitychange", async () => {
  if (busy) {
    return;
  }

  if (document.visibilityState === "visible") {
    busy = true;
    try {
      await refresh();
    } finally {
      setTimeout(() => {
        busy = false;
      }, 1000);
    }
  }
});

window.addEventListener("focus", async () => {
  if (busy) {
    return;
  }

  busy = true;
  try {
    await refresh();
  } finally {
    setTimeout(() => {
      busy = false;
    }, 1000);
  }
});
