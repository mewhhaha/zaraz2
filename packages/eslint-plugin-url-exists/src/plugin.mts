import unresolvedUrl from "./rules/unresolved-url.mjs";

export const plugin = () => {
  const plugin = {
    rules: {
      "unresolved-url": unresolvedUrl,
    },
  } as const;

  const name = "url-exists";

  // Provides autocomplete when defining the plugin rules
  type PluginRules = {
    [key in `${typeof name}/${keyof (typeof plugin)["rules"]}`]:
      | "error"
      | "warn";
  };

  const configs = {
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
        [name]: plugin,
      },
      rules: {
        [`${name}/unresolved-url`]: "error",
      } satisfies PluginRules,
    },
  } as const;

  return { plugin, configs };
};

export default plugin();
