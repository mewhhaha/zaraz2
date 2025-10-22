import { routes } from "../app/routes.mjs";
import { Router, type Env } from "@mewhhaha/ruwuter";

export { DurableObjectUser } from "../app/objects/user.js";
export { DurableObjectPasskey } from "../app/objects/passkey.js";
export { DurableObjectChallenge } from "../app/objects/challenge.js";

const router = Router(routes);

declare module "@mewhhaha/ruwuter" {
  interface Env extends Cloudflare.Env {
    nonce?: string;
  }
}

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
