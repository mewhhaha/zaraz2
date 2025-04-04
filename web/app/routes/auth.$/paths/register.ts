import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";
import { createUserCookie, extractVisitorHeaders } from "../helpers.mjs";
import { hmac } from "../helpers.mjs";
import { makePasskeyLink } from "../../../objects/user.mjs";
import type { EnvAuth } from "../env";

export default async function ({
  request,
  context: [env],
}: {
  request: Request;
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const visited = extractVisitorHeaders(request.headers);

  const { token, username } = await parseFormData(request);

  const { json, challengeId } = await parseToken(token, env.SECRET);

  const challenge = await env.CHALLENGE.get(
    env.CHALLENGE.idFromString(challengeId),
  ).finish();
  if (typeof challenge === "string") {
    throw new Response(challenge, { status: 400 });
  }

  const credentialName = json.id;
  const passkey = env.PASSKEY.get(env.PASSKEY.idFromName(credentialName));
  const user = env.USER.get(env.USER.idFromName(username));

  const data = await passkey.register({
    userId: user.id.toString(),
    json,
    challengeId,
    visited,
  });

  if (typeof data === "string") {
    throw new Response(data, { status: 400 });
  }

  const passkeyLink = makePasskeyLink({
    passkeyId: passkey.id,
    credentialId: credentialName,
    userId: user.id,
  });

  const created = await user.create({
    username,
    passkeys: [passkeyLink],
    recovery: { attempts: [] },
  });
  if (!created) {
    throw new Response("user_exists", { status: 409 });
  }
  await env.REGISTERED_USERS.put(username, "taken");

  const cookie = createUserCookie("user", env.SECRET);

  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": await cookie.serialize({
        userId: user.id.toString(),
        passkeyId: passkey.id.toString(),
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      }),
    },
  });
}

const parseFormData = async (request: Request) => {
  const formData = await request.formData();
  const token = formData.get("token")?.toString();
  if (!token) {
    throw new Response("token_missing", { status: 400 });
  }
  const username = formData.get("username")?.toString();
  if (!username) {
    throw new Response("username_missing", { status: 400 });
  }
  return { token, username };
};

const parseToken = async (token: string, secret: string) => {
  const [challengeId, signature, registrationBase64Json] = token.split(".");
  if (
    challengeId === undefined ||
    signature === undefined ||
    registrationBase64Json === undefined
  ) {
    throw new Response("token_invalid", { status: 400 });
  }

  if (signature !== btoa(await hmac(secret, challengeId))) {
    throw new Response("signature_invalid", { status: 400 });
  }

  const registrationRaw = atob(registrationBase64Json);

  const json = JSON.parse(registrationRaw) as RegistrationJSON;

  return { json, challengeId };
};
