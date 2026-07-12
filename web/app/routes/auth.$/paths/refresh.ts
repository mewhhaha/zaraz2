import {
  createAuthCookie,
  ensurePasskeyLinked,
  expires,
  issuedAt,
  MAX_SESSION_AGE_MS,
} from "../helpers.js";
import type { EnvAuth } from "../env";

export default async function ({
  request,
  env,
}: {
  request: Request;
  env: EnvAuth;
}) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    throw new Response("missing_cookie", { status: 401 });
  }

  const cookie = createAuthCookie("auth", env.SECRET);
  const user = await cookie.parse(cookieHeader);
  if (!user) {
    throw new Response("invalid_cookie", { status: 401 });
  }

  // Sliding refresh must not extend a session forever: past the absolute
  // ceiling the user has to sign in with their passkey again.
  if (
    user.issuedAt &&
    Date.now() - new Date(user.issuedAt).getTime() > MAX_SESSION_AGE_MS
  ) {
    return new Response("session_expired", {
      status: 401,
      headers: {
        "Set-Cookie": cookie.destroy(),
      },
    });
  }

  try {
    await ensurePasskeyLinked(env.USER, user);
  } catch {
    return new Response("passkey_revoked", {
      status: 401,
      headers: {
        "Set-Cookie": cookie.destroy(),
      },
    });
  }

  user.expires = expires();
  // Older cookies predate issuedAt; start their ceiling from this refresh.
  user.issuedAt ??= issuedAt();

  return new Response(JSON.stringify({ expires: user.expires }), {
    status: 200,
    headers: {
      "Set-Cookie": await cookie.serialize(user),
    },
  });
}
