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

export type SwapTarget =
  | Element
  | string
  | {
      current: Element | null | undefined;
    };

export type SwapMode =
  | string
  | ((context: { target: Element; text: string }) => void);

export interface SwapOptions {
  target: SwapTarget;
  swap?: SwapMode;
  text?: string;
  init?: RequestInit;
  viewTransition?: boolean;
}

export interface SwapResult {
  target: Element;
  swap: SwapMode;
  text: string;
  response: Response | null;
}

export type SwapInput =
  | RequestInfo
  | URL
  | Response
  | {
      text(): string | Promise<string>;
    };

declare global {
  interface Window {
    swap: (input: SwapInput, options?: SwapOptions) => Promise<SwapResult>;
  }

  var swap: Window["swap"];
}
