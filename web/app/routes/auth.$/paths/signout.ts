import { createUserCookie } from "../helpers.mts";
import type { EnvAuth } from "../env";

export default async function ({
  request,
  context: [env],
}: {
  request: Request;
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const cookie = createUserCookie("user", env.SECRET);
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": cookie.destroy(),
    },
  });
}
