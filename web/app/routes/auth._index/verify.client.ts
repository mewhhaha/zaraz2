import { authenticate } from "@packages/passkey";
import type { FxAction } from "../../ext-fixi";

const verify: FxAction = async () => {
  // Step 2: Authenticate with the challenge
  const token = await authenticate("/auth/challenge");
  if (!token) {
    return new Response("Authentication failed", { status: 401 });
  }

  // Step 3: POST the token to /auth/verify
  const form = new FormData();
  form.set("token", token);
  return await fetch("/auth/verify", {
    method: "POST",
    headers: {
      "fx-request": "true",
    },
    body: form,
  });
};

export default verify;
