import {
  createAuthCookie,
  expires,
  extractVisitorHeaders,
  issuedAt,
  registerPasskeyWithToken,
} from "../helpers.js";
import type { EnvAuth } from "../env";

export default async function ({
  request,
  env,
}: {
  request: Request;
  env: EnvAuth;
}) {
  const visited = extractVisitorHeaders(request.headers);

  const { token, username } = await parseFormData(request);

  const user = env.USER.get(env.USER.idFromName(username));
  if (await user.exists()) {
    throw new Response("user_exists", { status: 409 });
  }

  const { passkey, passkeyLink, credentialId } = await registerPasskeyWithToken(
    {
      token,
      username,
      secret: env.SECRET,
      visited,
      challenges: env.CHALLENGE,
      passkeys: env.PASSKEY,
    },
  );

  const created = await user.create({
    username,
    passkeys: [passkeyLink],
  });
  if (typeof created === "string") {
    // Lost a race for the username; don't leave the verified passkey behind.
    await passkey.destruct(username);
    throw new Response("user_exists", { status: 409 });
  }

  const cookie = createAuthCookie("auth", env.SECRET);

  return new Response(null, {
    status: 200,
    headers: {
      "Set-Cookie": await cookie.serialize({
        username,
        passkeyId: passkey.id.toString(),
        credentialId,
        expires: expires(),
        issuedAt: issuedAt(),
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
