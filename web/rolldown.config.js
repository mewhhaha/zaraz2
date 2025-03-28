import { defineConfig } from "rolldown";
import { Scanner } from "@tailwindcss/oxide";
import { compile } from "@tailwindcss/node";
import FastGlob from "fast-glob";
import fs from "node:fs/promises";
import { build } from "rolldown";

export default defineConfig({
  input: ["./main.ts"],
  experimental: {
    resolveNewUrlToAsset: true,
    enableComposingJsPlugins: true,
  },
  resolve: {
    conditionNames: ["import"],
  },
  moduleTypes: {
    ".jpg": "dataurl",
    ".jpeg": "dataurl",
    ".png": "dataurl",
    ".gif": "dataurl",
    ".svg": "dataurl",
    ".ico": "dataurl",
  },
  output: {
    dir: "dist",
    format: "esm",
    assetFileNames: (chunk) => {
      if (chunk.names.some((name) => name.includes(".client"))) {
        return "assets/[name]-[hash].mjs";
      }
      return "assets/[name]-[hash].[ext]";
    },
  },
  plugins: [
    {
      renderChunk: (chunk) => {
        // We're using import.meta.url in the code which will be undefined
        // so just putting something there so the new URL calls don't
        // fail
        return chunk.replaceAll(/import\.meta\.url/g, '"file://"');
      },
    },
    {
      transform: async (code, id) => {
        const base = import.meta.dirname;

        if (!id.endsWith(".css") || !code.includes('@import "tailwindcss"')) {
          return;
        }
        const compiler = await compile(code, {
          base,
          onDependency: () => {},
        });

        const sources = (await FastGlob("app/**/*.tsx", { cwd: base })).map(
          (v) => ({ base, pattern: v }),
        );

        const scanner = new Scanner({ sources });

        const candidates = scanner.scan();

        return compiler.build(candidates);
      },
    },
    {
      transform: async (_code, id, s) => {
        if (s.moduleType !== "asset" || !id.match(/\.m?[tj]sx?$/)) {
          return;
        }
        const done = await build({
          input: id,
          write: false,
          resolve: {
            conditionNames: ["import"],
          },
          treeshake: true,
        });

        return done.output[0];
      },
    },
    {
      buildEnd: async (err) => {
        if (!err) {
          // Clean up the assets so we don't increase the amount of assets over time
          await fs.rm("./dist/assets", { recursive: true, force: true });
        }
      },
    },
  ],

  treeshake: true,
  external: ["cloudflare:workers", "crypto"],
  jsx: {
    mode: "automatic",
    jsxImportSource: "@mewhhaha/fx-router",
  },
});
