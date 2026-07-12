"use client";

import {
  defineController,
  on,
  type Controller,
} from "@mewhhaha/ruwuter/browser";
import { authenticate, register } from "../../helpers/passkey";
import { swapHtml } from "../../helpers/client-swap";

const passkeys = "#passkeys-list";

const authController: Controller<undefined> = defineController(
  ({ root, signal }) => {
    const submit = async (
      form: HTMLFormElement,
      method: string,
      body: FormData,
    ) => {
      const response = await fetch("/auth", { method, body, signal });
      await swapHtml(response, { target: passkeys, write: "innerHTML" });
    };

    const credential = root.querySelector<HTMLInputElement>(
      "[data-auth-credential]",
    );
    if (credential) {
      void (async () => {
        try {
          const token = await authenticate(
            "/auth/challenge",
            [credential.value],
            { signal },
          );
          const body = new FormData();
          body.set("token", token);
          if (
            (await fetch("/auth/verify", { method: "POST", body, signal })).ok
          ) {
            window.location.href = "/home";
          }
        } catch {}
      })();
    }

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
          } catch {
            window.alert?.("Could not sign you out. Please try again.");
          } finally {
            target.removeAttribute("disabled");
          }
          return;
        }
        if (action === "authenticate") {
          target.setAttribute("disabled", "");
          try {
            const token = await authenticate("/auth/challenge", undefined, {
              signal,
            });
            const body = new FormData();
            body.set("token", token);
            if (
              (await fetch("/auth/verify", { method: "POST", body, signal })).ok
            )
              window.location.href = "/";
          } catch {
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
            body.set(
              "token",
              await register("/auth/challenge", username, { signal }),
            );
            const response = await fetch("/auth/register", {
              method: "POST",
              body,
              signal,
            });
            if (response.ok) window.location.href = "/";
            else
              await swapHtml(response, { target: "body", write: "innerHTML" });
          }
        } catch {
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
