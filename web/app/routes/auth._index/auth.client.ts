"use client";

import {
  defineController,
  on,
  type Controller,
} from "@mewhhaha/ruwuter/browser";
import { authenticate, register } from "../../helpers/passkey";
import { swapHtml } from "../../helpers/client-swap";

const passkeys = "#passkeys-list";

const describeAuthError = (code: string): string => {
  switch (code.trim()) {
    case "user_exists":
      return "That username is already taken. Please pick another one.";
    case "challenge_expired":
    case "challenge_not_found":
      return "That took a little too long and the request expired. Please try again.";
    case "registration_failed":
    case "credential_invalid":
      return "We could not verify that passkey. Please try again.";
    case "authentication_failed":
      return "We could not sign you in with that passkey. Please try again.";
    case "passkey_exists":
      return "That passkey is already registered.";
    default:
      return "We could not complete that passkey action. Please try again.";
  }
};

const alertResponseError = async (response: Response) => {
  const text = await response.text().catch(() => "");
  console.error(
    `Auth request failed with status ${response.status}: ${text || "<empty body>"}`,
  );
  window.alert?.(describeAuthError(text));
};

const authController: Controller<undefined> = defineController(
  ({ root, signal }) => {
    const submit = async (
      form: HTMLFormElement,
      method: string,
      body: FormData,
    ) => {
      const response = await fetch("/auth", { method, body, signal });
      if (!response.ok) {
        await alertResponseError(response);
        return;
      }
      await swapHtml(response, { target: passkeys, write: "innerHTML" });
    };

    on(root).click(
      async (event) => {
        const target =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>("[data-auth-action]")
            : null;
        if (!target) return;
        const action = target.dataset.authAction;
        if (action === "signout") {
          target.setAttribute("disabled", "");
          try {
            const body = new FormData();
            body.set("intent", "signout");
            const response = await fetch("/auth", {
              method: "POST",
              body,
              signal,
            });
            if (response.ok) {
              window.location.href = "/";
              return;
            }
            if (response.status === 401) {
              window.location.reload();
              return;
            }
            throw new Error(`Sign-out failed with status ${response.status}.`);
          } catch (error) {
            if (signal.aborted) return;
            console.error(error);
            window.alert?.("Could not sign you out. Please try again.");
          } finally {
            target.removeAttribute("disabled");
          }
          return;
        }
        if (action === "authenticate") {
          target.setAttribute("disabled", "");
          try {
            // A hidden credential input marks an expired session; hint the
            // authenticator at the matching passkey instead of a picker.
            const credential = root.querySelector<HTMLInputElement>(
              "[data-auth-credential]",
            );
            const token = await authenticate(
              "/auth/challenge",
              credential?.value ? [credential.value] : undefined,
              { signal },
            );
            const body = new FormData();
            body.set("token", token);
            const response = await fetch("/auth/verify", {
              method: "POST",
              body,
              signal,
            });
            if (response.ok) {
              window.location.href = "/";
            } else {
              await alertResponseError(response);
            }
          } catch (error) {
            if (signal.aborted) return;
            console.error(error);
            window.alert?.(
              "Something went wrong signing you in. Please try again.",
            );
          } finally {
            target.removeAttribute("disabled");
          }
        }
      },
      { signal },
    );

    on(root).submit(
      async (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        const action = form.dataset.authAction;
        if (!action) return;
        event.preventDefault();
        try {
          if (action === "register-passkey") {
            const token = await register(
              "/auth/challenge",
              form.dataset.username ?? "",
              { signal },
            );
            const body = new FormData(form);
            body.set("token", token);
            await submit(form, "POST", body);
          } else if (action === "delete") {
            if (
              !window.confirm("Are you sure you want to delete this passkey?")
            )
              return;
            const body = new FormData();
            body.set("id", form.dataset.passkeyId ?? "");
            await submit(form, "DELETE", body);
          } else if (action === "rename") {
            const name = window.prompt(
              "What should we call this passkey?",
              form.dataset.currentName,
            );
            if (!name) return;
            const body = new FormData();
            body.set("id", form.dataset.passkeyId ?? "");
            body.set("name", name);
            await submit(form, "PATCH", body);
          } else if (action === "register-account") {
            const body = new FormData(form);
            const username = body.get("username")?.toString();
            if (!username) {
              window.alert?.("Please choose a username to continue.");
              return;
            }
            // Reject a taken handle BEFORE the WebAuthn ceremony, so the
            // password manager never stores a passkey the server refuses.
            const availability = await fetch("/auth/exists", {
              method: "POST",
              body,
              signal,
            });
            if (!availability.ok) {
              await alertResponseError(availability);
              return;
            }
            body.set(
              "token",
              await register("/auth/challenge", username, { signal }),
            );
            const response = await fetch("/auth/register", {
              method: "POST",
              body,
              signal,
            });
            if (response.ok) {
              window.location.href = "/";
            } else {
              await alertResponseError(response);
            }
          }
        } catch (error) {
          if (signal.aborted) return;
          console.error(error);
          window.alert?.(
            "We could not complete that passkey action. Please try again.",
          );
        }
      },
      { signal },
    );
  },
);

export default authController;
