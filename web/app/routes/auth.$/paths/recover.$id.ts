import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";

import { createUserCookie, extractVisitorHeaders } from "../helpers.mjs";
import { hmac } from "../helpers.mjs";
import { makePasskeyLink } from "../../../objects/user.mjs";
import type { EnvAuth } from "../env";
import type { Finish } from "../../../objects/challenge.mts";
import type { RecoverChallenge } from "./recover";

export default async function ({
  request,
  params: { id },
  context: [env],
}: {
  request: Request;
  params: { id: string };
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const visitorHeaders = extractVisitorHeaders(request.headers);

  const { token } = await parseFormData(request);

  const { json, challengeId } = await parseToken(token, env.SECRET);

  const challenge = await env.CHALLENGE.get(
    env.CHALLENGE.idFromString(challengeId),
  ).finish();
  if (typeof challenge === "string") {
    throw new Response(challenge, { status: 400 });
  }

  const recover = (await env.CHALLENGE.get(
    env.CHALLENGE.idFromString(id),
  ).finish()) as Finish<RecoverChallenge>;
  if (typeof recover === "string") {
    throw new Response(recover, { status: 410 });
  }

  const credentialName = json.id;
  const passkey = env.PASSKEY.get(env.PASSKEY.idFromName(credentialName));
  const user = env.USER.get(env.USER.idFromString(recover.state.userId));

  const data = await passkey.register({
    userId: user.id.toString(),
    json,
    challengeId,
    visited: visitorHeaders,
  });

  if (data === "passkey_exists") {
    throw new Response(data, { status: 409 });
  }

  if (data === "registration_failed") {
    throw new Response(data, { status: 422 });
  }

  const passkeyLink = makePasskeyLink({
    passkeyId: passkey.id,
    credentialId: credentialName,
    userId: user.id,
  });

  await user.link(passkeyLink);

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
  return { token };
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

  const registrationJson = atob(registrationBase64Json);

  const registration = JSON.parse(registrationJson) as RegistrationJSON;

  return { json: registration, challengeId };
};
