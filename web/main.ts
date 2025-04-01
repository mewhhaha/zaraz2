import { routes } from "./app/routes.mjs";
import { Router, type Env } from "@mewhhaha/fx-router";

export { DurableObjectUser } from "./app/objects/user.mjs";
export { DurableObjectPasskey } from "./app/objects/passkey.mjs";

const router = Router(routes);

const handler: ExportedHandler<Env> = {
  fetch: (request, env, ctx) => {
    if (!env.DEMO) {
      env.nonce = generateNonce();
    }

    return router.handle(request, env, ctx);
  },
};

export const generateNonce = (): string => {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  return btoa(String.fromCharCode(...randomBytes));
};

export default handler;
