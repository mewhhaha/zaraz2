import { hmac } from "../helpers.ts";
import type { EnvAuth } from "../env";

export default async function ({ env }: { env: EnvAuth }) {
  const challenge = env.CHALLENGE.get(env.CHALLENGE.newUniqueId());

  const token = `${challenge.id.toString()}.${btoa(await hmac(env.SECRET, challenge.id.toString()))}`;

  await challenge.save({});

  return new Response(token, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
