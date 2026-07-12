import type { EnvAuth } from "../env";

/**
 * Availability pre-check so the client can reject a taken handle BEFORE
 * running the WebAuthn ceremony — otherwise the password manager stores a
 * passkey that the server then refuses, leaving an orphaned credential.
 * The registration path still re-checks authoritatively.
 */
export default async function ({
  request,
  env,
}: {
  request: Request;
  env: EnvAuth;
}) {
  const formData = await request.formData();
  const username = formData.get("username")?.toString();
  if (!username) {
    throw new Response("username_missing", { status: 400 });
  }

  const exists = await env.USER.get(env.USER.idFromName(username)).exists();
  if (exists) {
    throw new Response("user_exists", { status: 409 });
  }

  return new Response("available", { status: 200 });
}
