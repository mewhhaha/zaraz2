import type { Route as t } from "./+types.route";
import register from "./paths/register";
import challenge from "./paths/challenge";
import refresh from "./paths/refresh";
import verify from "./paths/verify";
import type { EnvAuth } from "./env";

export const action = async ({
  request,

  context: [env, ctx],
}: t.ActionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const context = [
    {
      PASSKEY: env.OBJECT_PASSKEY,
      USER: env.OBJECT_USER,
      REGISTERED_USERS: env.KV_USERS,
      SECRET: env.SECRET_KEY,
      CHALLENGE: env.OBJECT_CHALLENGE,
    } satisfies EnvAuth,
    ctx,
  ] as const;

  const args = { request, context };

  const url = new URL(request.url);
  const pathname = url.pathname.slice("/auth".length);

  if (new URLPattern({ pathname: "/refresh{/}?" }).test({ pathname })) {
    return await refresh(args);
  }

  if (new URLPattern({ pathname: "/challenge{/}?" }).test({ pathname })) {
    return await challenge(args);
  }

  if (new URLPattern({ pathname: "/verify{/}?" }).test({ pathname })) {
    return await verify(args);
  }

  if (new URLPattern({ pathname: "/register{/}?" }).test({ pathname })) {
    return await register(args);
  }

  return new Response("Not found", { status: 404 });
};
