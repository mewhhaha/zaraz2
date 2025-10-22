import { createAuthCookie, expires } from "../helpers.js";
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

  const cookie = createAuthCookie("auth", env.SECRET);
  const user = await cookie.parse(cookieHeader);
  if (!user) {
    throw new Response("invalid_cookie", { status: 401 });
  }

  user.expires = expires();

  return new Response(JSON.stringify({ expires: user.expires }), {
    status: 200,
    headers: {
      "Set-Cookie": await cookie.serialize(user),
    },
  });
}
