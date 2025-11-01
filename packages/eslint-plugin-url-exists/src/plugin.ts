import type { TSESLint } from "@typescript-eslint/utils";

import unresolvedUrl from "./rules/unresolved-url.js";

const name = "url-exists" as const;

const pluginDefinition: TSESLint.FlatConfig.Plugin = {
  rules: {
    "unresolved-url": unresolvedUrl,
  },
};

type RuleName = keyof typeof pluginDefinition.rules;

type PluginRules = {
  [Key in `${typeof name}/${RuleName}`]: TSESLint.FlatConfig.Severity;
};

const rules = {
  [`${name}/unresolved-url`]: "error",
} satisfies TSESLint.FlatConfig.Rules & PluginRules;

const configs: Record<"recommended", TSESLint.FlatConfig.Config> = {
  recommended: {
    files: [
      "**/*.ts",
      "**/*.tsx",
      "**/*.mts",
      "**/*.cts",
      "**/*.js",
      "**/*.jsx",
    ],

    plugins: {
      [name]: pluginDefinition,
    },
    rules,
  },
};

export type UrlExistsPlugin = {
  plugin: TSESLint.FlatConfig.Plugin;
  configs: typeof configs;
};

export const createPlugin = (): UrlExistsPlugin => ({
  plugin: pluginDefinition,
  configs,
});

const pluginExport = createPlugin();

export const plugin = createPlugin;

export default pluginExport;
