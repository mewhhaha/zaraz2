import { hmac } from "../helpers.mts";
import type { EnvAuth } from "../env";

export default async function ({
  context: [env, ctx],
}: {
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const challenge = env.CHALLENGE.get(env.CHALLENGE.newUniqueId());

  const token = `${challenge.id.toString()}.${btoa(await hmac(env.SECRET, challenge.id.toString()))}`;

  ctx.waitUntil(challenge.save({}));

  return new Response(token, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
