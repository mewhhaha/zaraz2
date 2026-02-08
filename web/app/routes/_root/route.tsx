import { event, events } from "@mewhhaha/ruwuter/events";
import type { Route as t } from "./+types.route";
import {
  authenticate as authenticateServer,
  ensurePasskeyLinked,
} from "../auth.$/helpers.ts";

type AuthClientState = {
  credentialId: string;
  expires: string;
};

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  try {
    const user = await authenticateServer(request, env.SECRET_KEY);
    await ensurePasskeyLinked(env.OBJECT_USER, user);

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
          rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs
          text-gray-300 shadow-lg
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
