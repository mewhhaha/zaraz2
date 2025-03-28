import type * as t from "./+types.route.js";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";
import { finish } from "../auth.challenge/route.js";
import {
  createCookie,
  createUserCookie,
  extractVisitorHeaders,
  hmac,
} from "../../helpers/auth.mjs";

export const action = async ({ request, context: [env] }: t.ActionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cookie = createUserCookie("user", env.SECRET_KEY);
  const user = await cookie.parse(request.headers.get("Cookie") ?? "");
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  user.expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

  return new Response(JSON.stringify(user), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": await cookie.serialize(user),
    },
  });
};
