/// <reference types="vite/client" />
import "@mewhhaha/ruwuter";

declare module "@mewhhaha/ruwuter" {
  interface FxAttributes {
    "ext-fx-confirm"?: string;
    "ext-fx-push"?: true;
  }
}

export interface FxActionOptions {
  body: FormData;
  method: string;
  headers: Record<string, string>;
  signal: AbortSignal;
  [key: string]: unknown;
}

export type FxAction = (options: FxActionOptions) => Promise<Response>;
