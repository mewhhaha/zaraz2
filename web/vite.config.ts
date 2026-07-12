import { cloudflare } from "@cloudflare/vite-plugin";
import { ruwuter } from "@mewhhaha/ruwuter/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig, normalizePath, type Plugin } from "vite";

const controllerUrlSuffix = "?url&no-inline";
const controllerVirtualPrefix = "\0ruwuter-controller-url:";
const controllerModulePattern = /\.client\.[cm]?[jt]sx?$/;

const controllerModuleUrls = (): Plugin => {
  let command: "build" | "serve" = "serve";
  let projectRoot = import.meta.dirname;

  return {
    name: "ruwuter-controller-module-urls",
    enforce: "pre",
    configResolved(config) {
      command = config.command;
      projectRoot = config.root;
    },
    async resolveId(source, importer) {
      if (!source.endsWith(controllerUrlSuffix)) return null;

      const moduleSpecifier = source.slice(0, -controllerUrlSuffix.length);
      if (!controllerModulePattern.test(moduleSpecifier)) return null;

      const resolved = await this.resolve(moduleSpecifier, importer, {
        skipSelf: true,
      });
      if (!resolved) {
        throw new Error(
          `Unable to resolve Ruwuter controller module "${moduleSpecifier}" from "${importer}".`,
        );
      }

      return `${controllerVirtualPrefix}${resolved.id}`;
    },
    load(id) {
      if (!id.startsWith(controllerVirtualPrefix)) return null;

      const moduleId = id.slice(controllerVirtualPrefix.length);
      const appRoot = path.join(projectRoot, "app");
      const relativeModuleId = normalizePath(path.relative(appRoot, moduleId));
      if (
        relativeModuleId.startsWith("../") ||
        path.isAbsolute(relativeModuleId)
      ) {
        throw new Error(
          `Ruwuter controller module "${moduleId}" must be inside "${appRoot}".`,
        );
      }

      const registryUrl =
        command === "serve"
          ? "/app/controller-registry.ts"
          : "/assets/controllers.js";
      const controllerUrl = `${registryUrl}#${encodeURIComponent(relativeModuleId)}`;

      return `export default ${JSON.stringify(controllerUrl)};`;
    },
  };
};

const projectRoot = import.meta.dirname;

export default defineConfig({
  server: {
    host: "localhost",
    port: 8787,
    strictPort: true,
  },
  preview: {
    host: "localhost",
    port: 8787,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    rolldownOptions: {
      output: {
        assetFileNames: (asset) =>
          asset.names.some((name) => name.endsWith(".css"))
            ? "assets/styles.css"
            : "assets/[name]-[hash].[ext]",
      },
    },
  },
  environments: {
    client: {
      build: {
        rolldownOptions: {
          input: {
            controllers: path.join(projectRoot, "app/controller-registry.ts"),
            styles: path.join(projectRoot, "app/assets/tailwind.css"),
          },
          preserveEntrySignatures: "strict",
          output: {
            entryFileNames: "assets/controllers.js",
          },
        },
      },
    },
  },
  plugins: [
    ruwuter({ appFolder: "./app" }),
    controllerModuleUrls(),
    tailwindcss(),
    cloudflare(),
  ],
});
