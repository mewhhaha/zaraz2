import { routes } from "../app/routes.ts";
import { Router, type Env } from "@mewhhaha/ruwuter";
import { SERVICE_WORKER_SOURCE } from "./sw";

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

    const url = new URL(request.url);
    if (url.pathname === "/sw.js") {
      return new Response(SERVICE_WORKER_SOURCE, {
        status: 200,
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "no-store",
          "Service-Worker-Allowed": "/",
        },
      });
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
