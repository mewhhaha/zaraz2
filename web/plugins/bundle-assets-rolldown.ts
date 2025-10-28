import { build, type Plugin } from "rolldown";
import {
  INLINE_ID_PREFIX,
  getInlineClientModule,
} from "./inline-client-registry";

// Bundles ts,js,mts assets so they can be imported as modules
export default function assets(): Plugin {
  return {
    name: "bundle-assets",
    async transform(_code, id, s) {
      if (s.moduleType !== "asset" || !id.match(/\.m?[tj]sx?$/)) {
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

      const done = await build({
        input: id,
        write: false,
        resolve: {
          conditionNames: ["import"],
        },
        treeshake: true,
        plugins: inlinePlugins,
      });

      return done.output[0];
    },
  };
}
