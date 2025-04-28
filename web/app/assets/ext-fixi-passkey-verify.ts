import { authenticate } from "@packages/passkey";
import type { FxAction } from "../../ext-fixi.d.ts";

const passkeyVerify: FxAction = async (options) => {
  const challenge = options.challenge as string;
  if (!challenge) {
    return new Response("Challenge is required", { status: 400 });
  }
  const form = options.body;
  const token = await authenticate(challenge);
  if (!token) {
    return new Response("Authentication failed", { status: 401 });
  }
  form.set("token", token);
  return new Response("Authenticated", { status: 200 });
};

export default passkeyVerify;
