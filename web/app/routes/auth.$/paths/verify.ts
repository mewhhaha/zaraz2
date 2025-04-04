import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";
import { createUserCookie, extractVisitorHeaders, hmac } from "../helpers.mjs";
import type { EnvAuth } from "../env";

export default async function ({
  request,
  context: [env],
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

  const { json, challengeId } = await parseToken(token, env.SECRET);

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

  const cookie = createUserCookie("user", env.SECRET);

  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": await cookie.serialize({
        userId: data.metadata.userId,
        passkeyId: data.metadata.passkeyId,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      }),
    },
  });
}

const parseToken = async (token: string, secret: string) => {
  const [challengeId, signature, authenticationBase64Json] = token.split(".");
  if (
    challengeId === undefined ||
    signature === undefined ||
    authenticationBase64Json === undefined
  ) {
    throw new Response("token_invalid", { status: 400 });
  }

  if (signature !== btoa(await hmac(secret, challengeId))) {
    throw new Response("signature_invalid", { status: 401 });
  }

  const authenticationJson = atob(authenticationBase64Json);

  const json = JSON.parse(authenticationJson) as AuthenticationJSON;

  return { json, challengeId };
};
