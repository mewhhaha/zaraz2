"use client";

import {
  defineController,
  on,
  type Controller,
} from "@mewhhaha/ruwuter/browser";
import { swapHtml } from "../../helpers/client-swap";

export type PasskeysDialogController = {
  refs: {
    settings: HTMLDivElement;
  };
};

const passkeysDialogController: Controller<
  undefined,
  PasskeysDialogController["refs"]
> = defineController<PasskeysDialogController>(({ root, refs, signal }) => {
  if (!(root instanceof HTMLDialogElement)) {
    throw new TypeError("Passkeys dialog controller requires a dialog root.");
  }

  on(root).toggle(
    async (toggleEvent) => {
      const popoverEvent = toggleEvent as ToggleEvent;
      if (popoverEvent.newState !== "open" || !root.open || signal.aborted)
        return;
      if (root.dataset.pending === "true") return;
      root.dataset.pending = "true";

      const target = refs.settings;
      target.setAttribute("data-indicator", "");

      try {
        const response = await fetch("/auth", { signal });
        await swapHtml(response, {
          target,
          write: "innerHTML",
          init: { signal },
          viewTransition: false,
        });
      } catch {
        window.alert?.(
          "We couldn't load your passkey settings. Please try again.",
        );
      } finally {
        target.removeAttribute("data-indicator");
        root.dataset.pending = "false";
      }
    },
    { signal },
  );
});

export default passkeysDialogController;
