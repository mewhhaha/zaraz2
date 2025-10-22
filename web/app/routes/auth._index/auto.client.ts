import { authenticate } from "@packages/passkey";

export default async (input: HTMLInputElement) => {
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
