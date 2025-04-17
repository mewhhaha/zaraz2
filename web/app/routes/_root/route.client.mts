import { authenticate } from "@packages/passkey";

let busy = false;

const refresh = async () => {
  busy = true;

  try {
    const challengeUri = "/auth/challenge";

    const expiresInput = document.querySelector("input[name=expires]");
    const credentialIdInput = document.querySelector("input[name=expires]");

    if (!(expiresInput instanceof HTMLInputElement)) {
      throw new Error("Missing expires input");
    }

    if (!(credentialIdInput instanceof HTMLInputElement)) {
      throw new Error("Missing credentialId input");
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
      });
    }

    if (response.ok) {
      const { expires }: { expires: string } = await response.json();
      expiresInput.value = expires;
    }
  } finally {
    setTimeout(() => {
      busy = false;
    }, 200);
  }
};

document.addEventListener("visibilitychange", async () => {
  if (busy) {
    return;
  }

  if (document.visibilityState === "visible") {
    await refresh();
  }
});

window.addEventListener("focus", async () => {
  if (busy) {
    return;
  }

  await refresh();
});
