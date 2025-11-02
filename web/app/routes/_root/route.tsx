import { event, events } from "@mewhhaha/ruwuter/events";
import { authenticate as authenticateClient } from "@packages/passkey";
import type { Route as t } from "./+types.route";
import { authenticate as authenticateServer } from "../auth.$/helpers.ts";

type AuthClientState = {
  credentialId: string;
  expires: string;
};

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  try {
    const user = await authenticateServer(request, env.SECRET_KEY);

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
