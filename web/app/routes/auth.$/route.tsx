import * as t from "./+types.route";
import register from "./paths/register";
import challenge from "./paths/challenge";
import refresh from "./paths/refresh";
import verify from "./paths/verify";
import recover from "./paths/recover";
import recover$id from "./paths/recover.$id";
import email from "./paths/email";
import email$id from "./paths/email.$id";
import type { EnvAuth } from "./env";
import signout from "./paths/signout";

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
      RESEND_API_KEY: env.RESEND_API_KEY,
      CHALLENGE: env.OBJECT_CHALLENGE,
    } satisfies EnvAuth,
    ctx,
  ] as const;

  const args = { request, context };

  const url = new URL(request.url);
  const pathname = url.pathname.slice("/auth".length);

  let match;

  if (pathname.match(/^\/refresh\/?$/)) {
    return await refresh(args);
  }

  if (pathname.match(/^\/challenge\/?$/)) {
    return await challenge(args);
  }

  if (pathname.match(/^\/verify\/?$/)) {
    return await verify(args);
  }

  if (pathname.match(/^\/recover\/?$/)) {
    return await recover(args);
  }

  if ((match = pathname.match(/^\/recover\/(<?id>[^/]+)\/?$/))) {
    return await recover$id({
      ...args,
      params: { id: decodeURIComponent(match.groups?.id as string) },
    });
  }

  if (pathname.match(/^\/email\/?$/)) {
    return await email(args);
  }

  if ((match = pathname.match(/^\/email\/(<?id>[^/]+)\/?$/))) {
    return await email$id({
      ...args,
      params: { id: decodeURIComponent(match.groups?.id as string) },
    });
  }

  if (pathname.match(/^\/signout\/?$/)) {
    return await signout(args);
  }

  if (pathname.match(/^\/register\/?$/)) {
    return await register(args);
  }

  return new Response("Not found", { status: 404 });
};
