import type { DurableObjectChallenge } from "../../objects/challenge.mts";
import type { DurableObjectPasskey } from "../../objects/passkey.mts";
import type { DurableObjectUser } from "../../objects/user.mts";

export type EnvAuth = {
  USER: DurableObjectNamespace<DurableObjectUser>;
  PASSKEY: DurableObjectNamespace<DurableObjectPasskey>;
  CHALLENGE: DurableObjectNamespace<DurableObjectChallenge>;
  REGISTERED_USERS: KVNamespace;
  SECRET: string;
  RESEND_API_KEY: string;
};

declare global {
  interface ImportMeta {
    url: string;
  }
}
