import { build, type Plugin } from "rolldown";

// Bundles ts,js,mts assets so they can be imported as modules
export default function assets(): Plugin {
  return {
    name: "bundle-assets",
    async transform(_code, id, s) {
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
  };
}
