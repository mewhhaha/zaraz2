import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";
import {
  createAuthCookie,
  extractVisitorHeaders,
  parseToken,
} from "../helpers.mjs";
import type { EnvAuth } from "../env";

export default async function ({
  request,
  context: [env, ctx],
}: {
  request: Request;
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const visited = extractVisitorHeaders(request.headers);

  const formData = await request.formData();
  const token = formData.get("token")?.toString();
  if (!token) {
    throw new Response("token_missing", { status: 400 });
  }

  const { json, challengeId } = await parseToken<AuthenticationJSON>(
    token,
    env.SECRET,
  );

  const challenge = await env.CHALLENGE.get(
    env.CHALLENGE.idFromString(challengeId),
  ).finish();
  if (typeof challenge === "string") {
    throw new Response(challenge, { status: 400 });
  }

  const credentialName = json.id;
  const passkey = env.PASSKEY.get(env.PASSKEY.idFromName(credentialName));

  const payload = { challengeId, visited, json };
  const data = await passkey.authenticate(payload);
  if (typeof data === "string") {
    throw new Response(data, { status: 401 });
  }

  const user = env.USER.get(env.USER.idFromName(data.metadata.username));
  const account = user.account();
  ctx.waitUntil(account.used(data.metadata.passkeyId));

  const cookie = createAuthCookie("auth", env.SECRET);

  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": await cookie.serialize({
        username: data.metadata.username,
        passkeyId: data.metadata.passkeyId,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      }),
    },
  });
}
