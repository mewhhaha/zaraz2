import { authenticate } from "@packages/passkey";

let busy = false;

const refresh = async () => {
  busy = true;

  const challengeUri = "/auth/challenge";

  const input = document.querySelector("input[name=expires]");

  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Missing expires input");
  }

  let response;
  if (new Date(input.value) > new Date()) {
    response = await fetch("/auth/refresh", {
      method: "POST",
    });
  } else {
    const token = await authenticate(challengeUri);
    const formData = new FormData();
    formData.set("token", token);
    response = await fetch("/auth/verify", {
      method: "POST",
      body: formData,
    });
  }

  if (response.ok) {
    const { expires } = await response.json<{ expires: string }>();
    input.value = expires;
  }
  busy = false;
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
