import { register } from "@packages/passkey";
import type { FxAction, FxActionOptions } from "../../ext-fixi";

const registerHandler: FxAction = async (options: FxActionOptions) => {
  const form = options.body;
  const username = form.get("username");
  if (!username) {
    return new Response("Input 'username' is required", { status: 400 });
  }

  const token = await register("/auth/challenge", username.toString());
  if (!token) {
    return new Response("Failed to register passkey", { status: 500 });
  }

  form.set("token", token);
  return fetch("/auth/register", {
    method: "POST",
    headers: {
      "fx-request": "true",
    },
    body: form,
  });
};

export default registerHandler;
