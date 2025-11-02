import ts from "typescript-eslint";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import oxlint from "eslint-plugin-oxlint";
import urlExists from "@mewhhaha/eslint-plugin-url-exists";
import { defineConfig } from "eslint/config";
import useclient from "@mewhhaha/rolldown-plugin-use-client/eslint/use-client";

const tailwindcss = {
  plugins: {
    "better-tailwindcss": betterTailwindcss,
  },
  rules: {
    ...betterTailwindcss.configs["recommended-warn"].rules,
    "better-tailwindcss/no-deprecated-classes": "error",
    "better-tailwindcss/no-restricted-classes": "warn",
  },
};

export default defineConfig(
  ts.configs.recommended,
  tailwindcss,
  oxlint.configs["flat/recommended"],
  urlExists.configs.recommended,
  useclient.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    settings: {
      "better-tailwindcss": {
        entryPoint: "app/assets/tailwind.css",
      },
    },
  },
);
