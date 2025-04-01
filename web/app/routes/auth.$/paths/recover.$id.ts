import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";

import { createUserCookie, extractVisitorHeaders } from "../helpers.mjs";
import { hmac } from "../helpers.mjs";
import { makePasskeyLink } from "../../../objects/user.mjs";
import { finish } from "./challenge";
import type { EnvAuth } from "../env";

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

  const recover = await finish("recover", request, id);
  if (typeof recover === "string") {
    throw new Response(null, { status: 410 });
  }

  const { json, challengeId } = await parseToken(token, env.SECRET);

  const challenge = await finish("challenge", request, challengeId);
  if (typeof challenge === "string") {
    throw new Response(challenge, { status: 403 });
  }

  const credentialId = json.id;
  const passkey = env.PASSKEY.get(env.PASSKEY.idFromString(credentialId));
  const user = env.USER.get(env.USER.idFromString(recover.body.userId));

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
    credentialId,
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
    throw new Response("token_missing", { status: 422 });
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
    throw new Response("token_invalid", { status: 403 });
  }

  if (signature !== btoa(await hmac(secret, challengeId))) {
    throw new Response("signature_invalid", { status: 403 });
  }

  const registrationJson = atob(registrationBase64Json);

  const registration = JSON.parse(registrationJson) as RegistrationJSON;

  return { json: registration, challengeId };
};
