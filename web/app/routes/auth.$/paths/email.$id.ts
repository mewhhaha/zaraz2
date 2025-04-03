import type { Finish } from "../../../objects/challenge.mts";
import type { EnvAuth } from "../env";
import type { EmailChallenge } from "./email";

export default async function ({
  params: { id },
  context: [env],
}: {
  request: Request;
  params: { id: string };
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const email = await env.CHALLENGE.get(
    env.CHALLENGE.idFromString(id),
  ).finish() as Finish<EmailChallenge>;
  if (typeof email === "string") {
    throw new Response(email, { status: 410 });
  }

  const user = env.USER.get(env.USER.idFromString(email.state.userId));

  await user.email(email.state.email);

  return new Response(null, { status: 204 });
}
