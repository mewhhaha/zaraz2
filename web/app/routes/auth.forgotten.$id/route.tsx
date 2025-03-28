import type * as t from "./+types.route.js";
import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";
import { finish } from "../auth.challenge/route.js";
import {
  createUserCookie,
  extractVisitorHeaders,
} from "../../helpers/auth.mjs";
import { hmac } from "../../helpers/auth.mjs";
import { makePasskeyLink } from "../../objects/user.mjs";

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

  const id = formData.get("id")?.toString();
  if (!id) {
    return new Response("id_missing", { status: 422 });
  }

  const token = formData.get("token")?.toString();
  if (!token) {
    return new Response("token_missing", { status: 422 });
  }

  const stub = env.OBJECT_FORGOTTEN.get(env.OBJECT_FORGOTTEN.idFromName(id));

  const { error: destroyError, username } = await stub.destroy();
  if (destroyError) {
    return new Response("link_expired", { status: 403 });
  }

  const [challengeId, signature, registrationBase64Json] = token.split(".");
  if (
    challengeId === undefined ||
    signature === undefined ||
    registrationBase64Json === undefined
  ) {
    return new Response("token_invalid", { status: 403 });
  }

  if (signature !== btoa(await hmac(env.SECRET_KEY, challengeId))) {
    return new Response("signature_invalid", { status: 403 });
  }

  const registrationJson = atob(registrationBase64Json);

  const registration = JSON.parse(registrationJson) as RegistrationJSON;

  const validChallenge = await finish(request, challengeId);
  if (!validChallenge) {
    return new Response("challenge_expired", { status: 403 });
  }

  try {
    const credentialId = registration.id;
    const passkey = env.OBJECT_PASSKEY.get(
      env.OBJECT_PASSKEY.idFromName(credentialId),
    );
    const user = env.OBJECT_USER.get(env.OBJECT_USER.idFromName(username));

    const data = {
      userId: user.id.toString(),
      json: registration,
      challengeId,
      visited: visitorHeaders,
    };

    const response = await passkey.register(data);

    if (response.error) {
      return new Response(response.message, { status: 403 });
    }

    const passkeyLink = makePasskeyLink({
      passkeyId: passkey.id,
      credentialId,
      userId: user.id,
    });

    await user.addPasskey(passkeyLink);

    const cookie = createUserCookie("user", env.SECRET_KEY);

    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL("/home", request.url).href,
        "Set-Cookie": await cookie.serialize({
          userId: user.id.toString(),
          passkeyId: passkey.id.toString(),
          expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        }),
      },
    });
  } catch (e) {
    return new Response("error", { status: 500 });
  }
};

const client = new URL("./route.client.mts", import.meta.url);

export const loader = async ({
  context: [env],
  params: { id },
}: t.LoaderArgs) => {
  const stub = env.OBJECT_FORGOTTEN.get(env.OBJECT_FORGOTTEN.idFromName(id));
  if (stub === null) {
    throw new Response("not_found", { status: 404 });
  }

  return {
    id,
    nonce: env.nonce,
  };
};

export default function Route({ loaderData: { nonce, id } }: t.ComponentProps) {
  return (
    <>
      <script nonce={nonce} type="module" src={client.pathname}></script>
      <form method="POST" id="register-form" class={`hidden`}>
        <input type="hidden" name="token" />
        <input type="hidden" name="id" value={id} />
      </form>
    </>
  );
}
