import { authenticate } from "@packages/passkey";
import type { FxAction } from "../../ext-fixi";

const verify: FxAction = async () => {
  // Step 1: Fetch the challenge from /auth/challenge
  const challengeRes = await fetch("/auth/challenge", { method: "POST" });
  if (!challengeRes.ok) {
    return new Response("Failed to fetch challenge", { status: 500 });
  }
  const challenge = await challengeRes.text();

  // Step 2: Authenticate with the challenge
  const token = await authenticate(challenge);
  if (!token) {
    return new Response("Authentication failed", { status: 401 });
  }

  // Step 3: POST the token to /auth/verify
  const form = new FormData();
  form.set("token", token);
  return await fetch("/auth/verify", {
    method: "POST",
    body: form,
  });
};

export default verify;
