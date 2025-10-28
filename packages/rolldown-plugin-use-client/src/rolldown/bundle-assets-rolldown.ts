import { build, type Plugin } from "rolldown";
import type { OutputChunk, TransformPluginContext } from "rolldown";
import {
  INLINE_ID_PREFIX,
  getInlineClientModule,
} from "./inline-client-registry.js";

type BundledAsset = {
  code: string;
  map: any;
  modules: string[];
  assets: Array<{
    fileName: string;
    source: string | Uint8Array;
  }>;
};

function normalizeAssetFileName(fileName: string) {
  const normalized = fileName.replace(/^(\.?\/)+/, "").replace(/\\/g, "/");
  if (normalized.startsWith("assets/")) {
    return normalized;
  }
  return `assets/${normalized}`;
}

async function bundleAsset(
  id: string,
  inlinePlugins: Plugin[] | undefined,
): Promise<BundledAsset> {
  const done = await build({
    input: id,
    write: false,
    resolve: {
      conditionNames: ["import"],
    },
    treeshake: true,
    plugins: inlinePlugins,
  });

  let entryChunk: OutputChunk | undefined;
  for (const output of done.output) {
    if (output.type !== "chunk") {
      continue;
    }

    if (!entryChunk) {
      entryChunk = output;
    }

    if (output.isEntry || output.facadeModuleId === id) {
      entryChunk = output;
      break;
    }
  }

  if (!entryChunk) {
    throw new Error(`bundle-assets: could not find entry chunk for ${id}`);
  }

  const assets: BundledAsset["assets"] = [];
  for (const output of done.output) {
    if (output === entryChunk) {
      continue;
    }

    if (output.type === "chunk") {
      assets.push({
        fileName: output.fileName,
        source: output.code,
      });
      continue;
    }

    assets.push({
      fileName: output.fileName,
      source: output.source,
    });
  }

  return {
    code: entryChunk.code,
    map: entryChunk.map ?? null,
    modules: Object.keys(entryChunk.modules ?? {}),
    assets,
  };
}

export type BundleAssetsPluginOptions = {
  /**
   * Pattern used to decide which assets should be bundled through Rolldown.
   */
  assetPattern?: RegExp;
};

// Bundles ts,js,mts assets so they can be imported as modules
export default function assets(
  options: BundleAssetsPluginOptions = {},
): Plugin {
  const bundleCache = new Map<string, Promise<BundledAsset>>();
  const emittedAssets = new Map<string, string>();
  const assetPattern = options.assetPattern ?? /\.m?[tj]sx?$/;

  return {
    name: "bundle-assets",
    buildStart() {
      bundleCache.clear();
      emittedAssets.clear();
    },
    watchChange(id) {
      bundleCache.delete(id);
      emittedAssets.clear();
    },
    async transform(this: TransformPluginContext, _code, id, s) {
      if (s.moduleType !== "asset" || !assetPattern.test(id)) {
        return;
      }

      const inlinePlugins =
        id.startsWith(INLINE_ID_PREFIX) || getInlineClientModule(id)
          ? [
              {
                name: "inline-client-virtual-loader",
                resolveId(source) {
                  if (source.startsWith(INLINE_ID_PREFIX)) {
                    return source;
                  }
                  return null;
                },
                load(loadId) {
                  if (!loadId.startsWith(INLINE_ID_PREFIX)) return null;
                  const code = getInlineClientModule(loadId);
                  if (code === undefined) return null;
                  return {
                    code,
                    map: null,
                    moduleType: "ts",
                  };
                },
              } satisfies Plugin,
            ]
          : undefined;

      let cached = bundleCache.get(id);
      if (!cached) {
        cached = bundleAsset(id, inlinePlugins);
        bundleCache.set(id, cached);
      }

      let bundle: BundledAsset;
      try {
        bundle = await cached;
      } catch (error) {
        bundleCache.delete(id);
        throw error;
      }

      for (const asset of bundle.assets) {
        if (asset.fileName.includes(".client")) {
          continue;
        }
        const fileName = normalizeAssetFileName(asset.fileName);
        if (!emittedAssets.has(fileName)) {
          const refId = this.emitFile({
            type: "asset",
            fileName,
            source: asset.source,
          });
          emittedAssets.set(fileName, refId);
        }
      }

      for (const moduleId of bundle.modules) {
        if (!moduleId.startsWith("\0")) {
          this.addWatchFile?.(moduleId);
        }
      }

      return {
        code: bundle.code,
        map: bundle.map ?? null,
      };
    },
  };
}
