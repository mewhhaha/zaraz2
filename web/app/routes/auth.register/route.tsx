import { makePasskeyLink } from "../../objects/user.js";
import { extractVisitorHeaders } from "../../helpers/headers.js";
import type * as t from "./+types.route.js";
import { createCookie } from "../../helpers/cookie.js";
import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";
import { finish } from "../auth.challenge/route.js";
import { hmac } from "../../helpers/crypto.js";
import { redirect, htmx } from "../../helpers/responses.js";
import { invariant } from "../../helpers/invariant.js";

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
    const user = env.OBJECT_USER.get(env.OBJECT_USER.newUniqueId());

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

    try {
      await user.create({ username: "anonymous", passkey: passkeyLink });
    } catch {
      return new Response("user_exists", { status: 403 });
    }

    const cookie = createCookie("user", env.SECRET_KEY);

    return redirect("/me", {
      htmx: true,
      headers: {
        "Set-Cookie": await cookie.serialize({
          userId: user.id.toString(),
          passkeyId: passkey.id.toString(),
        }),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const currentUrl = request.headers.get("hx-current-url")?.toString();
    invariant(currentUrl, "Missing current url");

    const headers = new Headers();
    headers.set("HX-Reswap", "none");
    headers.set("HX-Replace-Url", currentUrl);

    return await htmx(
      <p id="error" hx-swap-oob="true" class="text-red-300">
        {message}
      </p>,
      {
        headers: {
          "hx-reswap": "none",
          "hx-replace-url":
            request.headers.get("hx-current-url")?.toString() ?? "",
        },
      },
    );
  }
};