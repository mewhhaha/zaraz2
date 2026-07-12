"use client";

import { swap, type SwapOptions } from "@mewhhaha/ruwuter/browser";

type TrustedTypes = {
  createPolicy(
    name: string,
    rules: { createHTML(value: string): string },
  ): unknown;
};

type TrustedTypesPolicy = NonNullable<SwapOptions["trustedTypesPolicy"]>;

let policy: TrustedTypesPolicy | undefined;

const trustedTypesPolicy = () => {
  const trustedTypes = (
    globalThis as typeof globalThis & { trustedTypes?: TrustedTypes }
  ).trustedTypes;
  if (!trustedTypes) return undefined;
  policy ??= trustedTypes.createPolicy("ruwuter#swap", {
    createHTML: (value) => value,
  }) as TrustedTypesPolicy;
  return policy;
};

export const swapHtml = (
  input: Parameters<typeof swap>[0],
  options: SwapOptions,
) => {
  const policy = trustedTypesPolicy();
  return swap(
    input,
    policy === undefined ? options : { ...options, trustedTypesPolicy: policy },
  );
};

/**
 * Parse an HTML string into an inert `Document`, going through the shared
 * Trusted Types policy since `DOMParser.parseFromString` is an enforced sink
 * under `require-trusted-types-for 'script'`.
 */
export const parseHtml = (html: string): Document => {
  const policy = trustedTypesPolicy();
  const value = policy ? policy.createHTML(html) : html;
  return new DOMParser().parseFromString(value as string, "text/html");
};
