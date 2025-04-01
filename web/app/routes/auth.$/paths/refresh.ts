import { createUserCookie } from "../helpers.mjs";
import type { EnvAuth } from "../env";

export default async function ({
  request,
  context: [env],
}: {
  request: Request;
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    throw new Response("missing_cookie", { status: 401 });
  }

  const cookie = createUserCookie("user", env.SECRET);
  const user = await cookie.parse(cookieHeader);
  if (!user) {
    throw new Response("invalid_cookie", { status: 403 });
  }

  user.expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": await cookie.serialize(user),
    },
  });
}
