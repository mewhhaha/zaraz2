import type { DurableObjectChallenge } from "../objects/challenge.mts";
import type { DurableObjectPasskey } from "../objects/passkey.mjs";
import type { DurableObjectUser } from "../objects/user.mjs";

declare module "@mewhhaha/fx-router" {
  interface Env {
    OBJECT_PASSKEY: DurableObjectNamespace<DurableObjectPasskey>;
    OBJECT_USER: DurableObjectNamespace<DurableObjectUser>;
    OBJECT_CHALLENGE: DurableObjectNamespace<DurableObjectChallenge>;

    KV_USERS: KVNamespace;

    SECRET_KEY: string;
    ORIGIN: string;
    RESEND_API_KEY: string;
    DEMO: string;

    /** This nonce is created by the server on each request in the main.ts file
     * and is not part of the normal environment variables
     */
    nonce: string;
  }
}
