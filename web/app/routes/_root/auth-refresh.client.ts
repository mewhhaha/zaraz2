"use client";

import { defineController, type Controller } from "@mewhhaha/ruwuter/browser";

export type AuthRefreshController = {
  props: { expires: string };
};

const authRefreshController: Controller<AuthRefreshController["props"]> =
  defineController<AuthRefreshController>(({ props, signal }) => {
    let expires = props.expires;
    let busy = false;
    const refresh = async () => {
      if (new Date(expires) <= new Date()) {
        window.location.reload();
        return;
      }
      const response = await fetch("/auth/refresh", { method: "POST", signal });
      if (response.ok) {
        ({ expires } = (await response.json()) as { expires: string });
      }
    };
    const trigger = () => {
      if (busy) return;
      busy = true;
      void refresh().finally(() =>
        setTimeout(() => {
          busy = false;
        }, 1000),
      );
    };
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "visible") trigger();
      },
      { signal },
    );
    window.addEventListener("focus", trigger, { signal });
  });

export default authRefreshController;
