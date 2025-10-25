import fs from "node:fs/promises";
import path from "node:path";
import { compile, optimize, toSourceMap } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import type { Plugin } from "rolldown";

const TAILWIND_MARK = "?tailwind-css";
const hasTailwindDirective = (code: string) =>
  code.includes('@import "tailwindcss"') ||
  code.includes("@import 'tailwindcss'");

const normalizePath = (value: string) => value.replace(/\\/g, "/");

type TailwindPluginOptions = {
  root?: string;
  minify?: boolean;
  optimize?: boolean;
};

export function tailwindcssPlugin(options: TailwindPluginOptions = {}): Plugin {
  const rootDir = options.root ?? process.cwd();
  const shouldOptimize = options.optimize ?? true;
  const shouldMinify = options.minify ?? true;

  return {
    name: "tailwindcss:rolldown",
    resolveId(source, importer) {
      if (!source.endsWith(".css") || source.includes(TAILWIND_MARK)) {
        return null;
      }
      const importerDir =
        importer && !importer.startsWith("\0")
          ? path.dirname(importer)
          : rootDir;
      const absPath = path.isAbsolute(source)
        ? source
        : path.resolve(importerDir, source);
      return `${normalizePath(absPath)}${TAILWIND_MARK}`;
    },
    async load(id) {
      if (!id.endsWith(TAILWIND_MARK)) {
        return null;
      }
      const absPath = id.slice(0, -TAILWIND_MARK.length);
      const original = await fs.readFile(absPath, "utf8");

      let css = original;
      let map: string | undefined;

      if (hasTailwindDirective(original)) {
        const compiler = await compile(original, {
          from: absPath,
          base: path.dirname(absPath),
          shouldRewriteUrls: true,
          onDependency: () => {
            /* no-op */
          },
        });

        const sources: Array<{
          base: string;
          pattern: string;
          negated: boolean;
        }> = [];
        if (compiler.root === null) {
          sources.push({ base: rootDir, pattern: "**/*", negated: false });
        } else if (compiler.root !== "none") {
          sources.push({ ...compiler.root, negated: false });
        }
        sources.push(...compiler.sources);

        const scanner = new Scanner({ sources });
        const candidates = Array.from(scanner.scan());

        css = compiler.build(candidates);
        const rawMap = compiler.buildSourceMap();
        map = rawMap ? toSourceMap(rawMap).raw : undefined;
      }

      if (shouldOptimize) {
        const optimizeOptions: Parameters<typeof optimize>[1] = {
          minify: shouldMinify,
          file: absPath,
        };
        if (map !== undefined) {
          optimizeOptions.map = map;
        }
        const optimized = optimize(css, optimizeOptions);
        css = optimized.code;
        map = optimized.map;
      }

      const assetId = this.emitFile({
        type: "asset",
        name: path.basename(absPath),
        source: css,
      });

      return {
        code: `const __tailwind_url = import.meta.ROLLUP_FILE_URL_${assetId};\nexport default __tailwind_url;`,
        map: null,
      };
    },
  };
}
