/// <reference lib="dom" />
import { authenticate } from "@packages/passkey";

export default async function autoSignIn(
  this: Element,
  _event: Event,
  signal: AbortSignal,
) {
  if (!(this instanceof HTMLInputElement) || !this.value || signal.aborted) {
    return;
  }

  const input = this;

  try {
    const token = await authenticate("/auth/challenge", [input.value]);
    if (!token || signal.aborted) {
      return;
    }

    const formData = new FormData();
    formData.set("token", token);

    const response = await fetch("/auth/verify", {
      method: "POST",
      body: formData,
      signal,
    });

    if (!signal.aborted && response.ok) {
      window.location.href = "/home";
    }
  } catch (error) {
    if (signal.aborted) {
      return;
    }
    throw error;
  }
}
