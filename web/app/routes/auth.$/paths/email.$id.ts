import type { EnvAuth } from "../env";
import { finish } from "./challenge";

export default async function ({
  request,
  params: { id },
  context: [env],
}: {
  request: Request;
  params: { id: string };
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const email = await finish("email", request, id);
  if (typeof email === "string") {
    throw new Response(email, { status: 410 });
  }

  const user = env.USER.get(env.USER.idFromString(email.body.userId));

  await user.email(email.body.email);

  return new Response(null, { status: 204 });
}
