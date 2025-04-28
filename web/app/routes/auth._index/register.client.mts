import { register } from "@packages/passkey";
import type { FxAction, FxActionOptions } from "../../ext-fixi";

const registerHandler: FxAction = async (options: FxActionOptions) => {
  const form = options.body;
  const username = form.get("username");
  if (!username) {
    return new Response("Input 'username' is required", { status: 400 });
  }

  // Fetch the challenge from the server
  const challengeRes = await fetch("/auth/challenge", { method: "POST" });
  if (!challengeRes.ok) {
    return new Response("Failed to fetch challenge", { status: 500 });
  }
  const challenge = await challengeRes.text();

  // Register the passkey
  const token = await register(challenge, username.toString());
  if (!token) {
    return new Response("Failed to register passkey", { status: 500 });
  }

  form.set("token", token);
  return new Response("Passkey registered", { status: 200 });
};

export default registerHandler;
