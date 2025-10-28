import { defineConfig } from "rolldown";

import { generate } from "@mewhhaha/ruwuter/fs-routes";
import tailwindcss from "./plugins/tailwindcss-rolldown";
import assets from "./plugins/bundle-assets-rolldown";
import { readFile, writeFile } from "node:fs/promises";
import inlineClientHandlers from "./plugins/inline-client-rolldown";

const {
  router: [routes],
  types,
} = await generate("app");

const existing = await readFile(routes.path, "utf8");
if (existing !== routes.contents) {
  console.log("Routes have changed... updating");
  await writeFile(routes.path, routes.contents);
}

for (const file of types) {
  await writeFile(file.path, file.contents);
}

export default defineConfig({
  tsconfig: "tsconfig.server.json",
  input: "worker/main.ts",
  output: {
    dir: "dist",
    cleanDir: true,
    intro: 'import.meta.url = "file://"',
    assetFileNames: (chunk) => {
      if (chunk.names.some((name) => name.includes(".client"))) {
        return "assets/[name]-[hash].js";
      }
      return "assets/[name]-[hash].[ext]";
    },
  },
  plugins: [inlineClientHandlers(), tailwindcss(), assets()],

  experimental: {
    resolveNewUrlToAsset: true,
  },

  resolve: {
    conditionNames: ["import"],
  },

  external: ["cloudflare:workers", "crypto", "node:async_hooks"],

  moduleTypes: {
    ".jpg": "dataurl",
    ".jpeg": "dataurl",
    ".png": "dataurl",
    ".gif": "dataurl",
    ".svg": "dataurl",
    ".ico": "dataurl",
  },
});
