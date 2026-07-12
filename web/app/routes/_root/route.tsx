import type { Route as t } from "./+types.route";
import type { JSX } from "@mewhhaha/ruwuter";
import { requireAuth } from "../auth.$/helpers.ts";
import authRefreshController from "./auth-refresh.client.ts?url&no-inline";
import { controllerAttributes } from "../../helpers/controller";

const authRefreshControllerAttributes = controllerAttributes(
  authRefreshController,
);

type AuthClientState = { expires: string };

export const loader = async ({ request, env }: t.LoaderArgs) => {
  const user = await requireAuth(request, env.SECRET_KEY, env.OBJECT_USER)
    .then(({ auth }) => auth)
    .catch(() => null);

  return { user };
};

export default function Root({
  children,
  loaderData: { user },
}: {
  children?: JSX.Element;
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
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
          {...authRefreshControllerAttributes}
          data-rw-props={JSON.stringify({
            expires: user.expires,
          } satisfies AuthClientState)}
        />
      )}
      {children}
    </>
  );
}
