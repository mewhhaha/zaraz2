import type { DurableObjectPasskey } from "./passkey";
import type { DurableObjectUser } from "./user";

export interface Env {
  OBJECT_PASSKEY: DurableObjectNamespace<DurableObjectPasskey>;
  OBJECT_USER: DurableObjectNamespace<DurableObjectUser>;
  AUDIENCE: string;
  SECRET_KEY: string;
  AUTH_KEY: string;
  ORIGIN: string;
}
declare module "@mewhhaha/htmx-router" {
  interface Env {
    OBJECT_PASSKEY: DurableObjectNamespace<DurableObjectPasskey>;
    OBJECT_USER: DurableObjectNamespace<DurableObjectUser>;
    AUDIENCE: string;
    AUTH_KEY: string;
    SECRET_KEY: string;
    ORIGIN: string;
  }
}