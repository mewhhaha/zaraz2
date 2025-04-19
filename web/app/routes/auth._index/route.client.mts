import { authenticate } from "@packages/passkey";

const autoAuthenticate = async () => {
  const input = document.querySelector("input[name='credential-id']");
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const token = await authenticate("/auth/challenge", [input.value]);
  if (token) {
    const formData = new FormData();
    formData.set("token", token);
    const response = await fetch("/auth/verify", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      window.location.href = "/home";
    }
  }
};

autoAuthenticate();
