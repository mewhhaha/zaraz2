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
