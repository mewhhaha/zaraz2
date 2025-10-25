/// <reference lib="dom" />
import { authenticate } from "@packages/passkey";

export default async function verify(
  this: Element,
  _event: Event,
  signal: AbortSignal,
) {
  if (!(this instanceof HTMLButtonElement) || signal.aborted) {
    return;
  }

  const button = this;
  if (button.disabled) {
    return;
  }
  button.disabled = true;

  try {
    const token = await authenticate("/auth/challenge");
    if (!token || signal.aborted) {
      return;
    }

    const formData = new FormData();
    formData.set("token", token);

    const response = await fetch("/auth/verify", {
      method: "POST",
      headers: {
        "fx-request": "true",
      },
      body: formData,
      redirect: "manual",
      signal,
    });

    if (signal.aborted) {
      return;
    }

    if (response.status >= 200 && response.status < 300) {
      window.location.href = "/";
      return;
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("Location");
      window.location.href = location ?? "/";
      return;
    }

    throw new Error(await response.text());
  } catch (error) {
    if (signal.aborted) {
      return;
    }
    console.error(error);
    window.alert?.("Something went wrong signing you in. Please try again.");
  } finally {
    if (!signal.aborted) {
      button.disabled = false;
    }
  }
}
