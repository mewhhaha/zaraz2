import type { DurableObjectChallenge } from "../../objects/challenge.ts";
import type { DurableObjectPasskey } from "../../objects/passkey.ts";
import type { DurableObjectUser } from "../../objects/user.ts";

export type EnvAuth = {
  USER: DurableObjectNamespace<DurableObjectUser>;
  PASSKEY: DurableObjectNamespace<DurableObjectPasskey>;
  CHALLENGE: DurableObjectNamespace<DurableObjectChallenge>;
  SECRET: string;
};

declare global {
  interface ImportMeta {
    url: string;
  }
}
