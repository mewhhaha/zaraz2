import type { DurableObjectPasskey } from "./passkey.mjs";
import type { DurableObjectUser } from "./user.mjs";
import type { DurableObjectForgotten } from "./forgotten.mjs";
declare module "@mewhhaha/fx-router" {
  interface Env {
    OBJECT_PASSKEY: DurableObjectNamespace<DurableObjectPasskey>;
    OBJECT_USER: DurableObjectNamespace<DurableObjectUser>;
    OBJECT_FORGOTTEN: DurableObjectNamespace<DurableObjectForgotten>;
    KV_USERS: KVNamespace;

    SECRET_KEY: string;
    ORIGIN: string;
    RESEND_API_KEY: string;

    /** This nonce is created by the server on each request in the main.ts file
     * and is not part of the normal environment variables
     */
    nonce: string;
  }
}
