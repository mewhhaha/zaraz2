import { event, events } from "@mewhhaha/ruwuter/events";
import type { Route as t } from "./+types.route";
import { requireAuth } from "../auth.$/helpers.ts";

type AuthClientState = {
  credentialId: string;
  expires: string;
};

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  try {
    const { auth: user } = await requireAuth(
      request,
      env.SECRET_KEY,
      env.OBJECT_USER,
    );

    return {
      nonce: env.nonce,
      user,
    };
  } catch {
    return {
      nonce: env.nonce,
      user: null,
    };
  }
};

export default function Root({
  children,
  loaderData: { user },
}: t.ComponentProps) {
  return (
    <>
      <div
        id="connection-status"
        role="status"
        aria-live="polite"
        class={`
          fixed left-1/2 top-3 z-50 hidden -translate-x-1/2 items-center gap-2
          rounded-full border border-white/10 bg-zinc-950/95 px-3 py-1
          text-base/7 text-zinc-300 shadow-lg shadow-black/30 backdrop-blur
          sm:text-sm/6
        `}
      >
        <span id="connection-state">Offline</span>
        <span
          aria-hidden="true"
          class={`h-1.5 w-1.5 rounded-full bg-amber-400`}
        ></span>
        <span id="queue-count" hidden></span>
      </div>
      {user && (
        <div
          hidden
          on={events(
            {
              credentialId: user.credentialId,
              expires: user.expires,
            } satisfies AuthClientState,
            event.mount<HTMLDivElement, AuthClientState>(
              async function (this, _event, signal) {
                "use client";

                let busy = false;
                let releaseBusy = () => {};

                const refresh = async () => {
                  if (new Date(this.expires) > new Date()) {
                    const response = await fetch("/auth/refresh", {
                      method: "POST",
                      signal,
                    });
                    if (response.ok) {
                      const { expires }: { expires: string } =
                        await response.json();
                      this.expires = expires;
                    }
                  } else {
                    window.location.reload();
                  }
                };

                const triggerRefresh = () => {
                  if (busy) {
                    return;
                  }

                  busy = true;
                  releaseBusy = () => {
                    setTimeout(() => {
                      busy = false;
                      releaseBusy = () => {};
                    }, 1000);
                  };
                  void refresh().finally(releaseBusy);
                };

                document.addEventListener(
                  "visibilitychange",
                  () => {
                    if (document.visibilityState !== "visible" || busy) {
                      return;
                    }
                    triggerRefresh();
                  },
                  { signal },
                );
                window.addEventListener(
                  "focus",
                  () => {
                    triggerRefresh();
                  },
                  { signal },
                );
              },
            ),
          )}
        />
      )}
      {children}
    </>
  );
}
