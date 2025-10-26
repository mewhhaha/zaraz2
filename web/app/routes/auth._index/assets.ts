import type { HandlerModule } from "@mewhhaha/ruwuter/events";
import type { default as auto } from "./auto.client.ts";
import type { default as confirm } from "./confirm.client.ts";
import type { default as prompt } from "./prompt.client.ts";
import type { default as verify } from "./verify.client.ts";

export const addPasskeyHref = new URL(
  "./add-passkey.client.ts",
  import.meta.url,
).pathname;

export const autoSignInHandler = new URL(
  "./auto.client.ts",
  import.meta.url,
) as unknown as HandlerModule<typeof auto>;

export const confirmHandler = new URL(
  "./confirm.client.ts",
  import.meta.url,
) as unknown as HandlerModule<typeof confirm>;

export const promptHandler = new URL(
  "./prompt.client.ts",
  import.meta.url,
) as unknown as HandlerModule<typeof prompt>;

export const registerHref = new URL("./register.client.ts", import.meta.url)
  .pathname;

export const verifyHandler = new URL(
  "./verify.client.ts",
  import.meta.url,
) as unknown as HandlerModule<typeof verify>;
