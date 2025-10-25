import { defineConfig } from "rolldown";

import { generate } from "@mewhhaha/ruwuter/fs-routes";

await generate("app");

export default defineConfig({
  input: "worker/main.ts",
  tsconfig: "./tsconfig.server.json",

  experimental: {
    resolveNewUrlToAsset: true,
  },

  resolve: {
    conditionNames: ["import"],
  },
  output: {
    dir: "dist",

    cleanDir: true,
    assetFileNames: (chunk) => {
      if (chunk.names.some((name) => name.includes(".client"))) {
        return "assets/[name]-[hash].mjs";
      }
      return "assets/[name]-[hash].[ext]";
    },
  },
  external: ["cloudflare:workers", "node:async_hooks"],
  transform: {
    define: {
      "import.meta.env.url": "file://",
    },
  },
  moduleTypes: {
    ".jpg": "dataurl",
    ".jpeg": "dataurl",
    ".png": "dataurl",
    ".gif": "dataurl",
    ".svg": "dataurl",
    ".ico": "dataurl",
  },
});
