import { defineConfig } from "rolldown";

import { generate } from "@mewhhaha/ruwuter/fs-routes";
import tailwindcss from "@mewhhaha/rolldown-plugin-tailwindcss";
import useClient from "@mewhhaha/rolldown-plugin-use-client";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const {
  router: [routes],
  types,
} = await generate("app");

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

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
    sourcemap: true,
    dir: "dist",
    cleanDir: true,
    intro: 'import.meta.url = "file://"',
    assetFileNames: (chunk) => {
      if (chunk.names.some((name) => name.includes(".client"))) {
        return "assets/[name]-[hash].js";
      }
      return "assets/[name]-[hash].[ext]";
    },
    chunkFileNames: "assets/[name]-[hash].js",
  },
  plugins: [
    useClient(),
    tailwindcss({
      root: projectRoot,
      optimize: true,
      minify: isProduction,
    }),
  ],

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
