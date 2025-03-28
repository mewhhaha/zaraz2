import type * as t from "./+types.route.js";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";
import { finish } from "../auth.challenge/route.js";
import {
  createCookie,
  createUserCookie,
  extractVisitorHeaders,
  hmac,
} from "../../helpers/auth.mjs";

const client = new URL("./route.client.mts", import.meta.url);

export const action = async ({ request, context: [env] }: t.ActionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const visitorHeaders = extractVisitorHeaders(request.headers);
  if (!visitorHeaders) {
    // Not sure this can happen
    return new Response("visitor_headers_invalid", { status: 403 });
  }

  const formData = await request.formData();
  const token = formData.get("token")?.toString();
  if (!token) {
    return new Response("token_missing", { status: 403 });
  }

  const [challengeId, signature, authenticationBase64Json] = token.split(".");
  if (
    challengeId === undefined ||
    signature === undefined ||
    authenticationBase64Json === undefined
  ) {
    return new Response("token_invalid", { status: 403 });
  }

  if (signature !== btoa(await hmac(env.SECRET_KEY, challengeId))) {
    return new Response("signature_invalid", { status: 403 });
  }

  const authenticationJson = atob(authenticationBase64Json);

  const authentication = JSON.parse(authenticationJson) as AuthenticationJSON;

  const validChallenge = finish(request, challengeId);
  if (!validChallenge) {
    return new Response("challenge_expired", { status: 403 });
  }

  try {
    const passkey = env.OBJECT_PASSKEY.get(
      env.OBJECT_PASSKEY.idFromName(authentication.id),
    );

    const payload = {
      challengeId,
      visited: visitorHeaders,
      json: authentication,
    };
    const authenticated = await passkey.authenticate(payload);
    if (authenticated.error) {
      return new Response(authenticated.message, { status: 403 });
    }

    const { userId, passkeyId } = authenticated.data;

    const cookie = createUserCookie("user", env.SECRET_KEY);

    const user = {
      userId,
      passkeyId,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    };

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": await cookie.serialize(user),
      },
    });
  } catch (e) {
    return new Response("error", { status: 500 });
  }
};

export const loader = ({ context: [env] }: t.LoaderArgs) => {
  return {
    nonce: env.nonce,
  };
};

export default function Route({ loaderData: { nonce } }: t.ComponentProps) {
  return <script nonce={nonce} type="module" src={client.pathname}></script>;
}
