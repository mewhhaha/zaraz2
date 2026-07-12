import type { RequestContext } from "@mewhhaha/ruwuter";
import register from "./paths/register";
import challenge from "./paths/challenge";
import refresh from "./paths/refresh";
import verify from "./paths/verify";
import type { EnvAuth } from "./env";

const paths = {
  "/refresh": refresh,
  "/challenge": challenge,
  "/verify": verify,
  "/register": register,
};

export const action = async ({
  request,
  env,
  executionContext,
}: RequestContext) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const pathname = new URL(request.url).pathname
    .slice("/auth".length)
    .replace(/\/$/, "");

  const handler = paths[pathname as keyof typeof paths];
  if (!handler) {
    return new Response("Not found", { status: 404 });
  }

  const authEnv = {
    PASSKEY: env.OBJECT_PASSKEY,
    USER: env.OBJECT_USER,
    SECRET: env.SECRET_KEY,
    CHALLENGE: env.OBJECT_CHALLENGE,
  } satisfies EnvAuth;

  return handler({ request, env: authEnv, executionContext });
};
