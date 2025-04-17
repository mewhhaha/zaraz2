import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";
import {
  createAuthCookie,
  expires,
  extractVisitorHeaders,
  parseToken,
} from "../helpers.mjs";
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

  const { json, challengeId } = await parseToken<RegistrationJSON>(
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
  const user = env.USER.get(env.USER.idFromName(username));

  if (await user.exists()) {
    throw new Response("user_exists", { status: 409 });
  }

  const data = await passkey.register({
    username,
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
    username,
  });

  const created = await user.create({
    username,
    passkeys: [passkeyLink],
  });
  if (!created) {
    throw new Response("user_exists", { status: 409 });
  }
  await env.REGISTERED_USERS.put(username, "taken");

  const cookie = createAuthCookie("auth", env.SECRET);

  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": await cookie.serialize({
        username,
        passkeyId: passkey.id.toString(),
        credentialId: credentialName,
        expires: expires(),
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
