import type { Plugin } from "rolldown";
import inlineClientHandlers, {
  type InlineClientPluginOptions,
} from "./rolldown/inline-client-rolldown.js";
import bundleAssets, {
  type BundleAssetsPluginOptions,
} from "./rolldown/bundle-assets-rolldown.js";

export type UseClientPluginOptions = InlineClientPluginOptions &
  BundleAssetsPluginOptions;

type MaybePromise<T> = T | Promise<T>;

type NormalizedTransformResult = {
  code: string;
  map: unknown;
};

function getHookFunction(
  plugin: any,
  key: string,
): ((...args: any[]) => any) | undefined {
  const hook = plugin?.[key];
  if (!hook) return undefined;

  if (typeof hook === "function") {
    return hook as (...args: any[]) => any;
  }

  if (typeof hook === "object" && hook && "handler" in hook) {
    const handler = (hook as { handler?: unknown }).handler;
    if (typeof handler === "function") {
      return handler as (...args: any[]) => any;
    }
  }

  return undefined;
}

function callHook(
  plugin: any,
  key: string,
  context: any,
  args: unknown[],
) {
  const fn = getHookFunction(plugin, key);
  if (!fn) {
    return undefined;
  }
  return fn.apply(context, args);
}

function normalizeTransformResult(
  initialCode: string,
  result: MaybePromise<any>,
): MaybePromise<NormalizedTransformResult | null> {
  const handle = (value: any) => {
    if (value == null) {
      return null;
    }

    if (typeof value === "string") {
      return { code: value, map: null };
    }

    if (typeof value === "object") {
      return {
        code: value.code ?? initialCode,
        map: value.map ?? null,
      };
    }

    return null;
  };

  if (result instanceof Promise) {
    return result.then(handle);
  }

  return handle(result);
}

export default function useClient(
  options: UseClientPluginOptions = {},
): Plugin {
  const inlinePlugin = inlineClientHandlers(options);
  const bundlerPlugin = bundleAssets(options);

  const inlineTransform = getHookFunction(inlinePlugin, "transform");
  const bundleTransform = getHookFunction(bundlerPlugin, "transform");

  return {
    name: "use-client:rolldown",

    buildStart(...args) {
      callHook(inlinePlugin, "buildStart", this, args);
      callHook(bundlerPlugin, "buildStart", this, args);
    },

    buildEnd(error) {
      callHook(inlinePlugin, "buildEnd", this, [error]);
      callHook(bundlerPlugin, "buildEnd", this, [error]);
    },

    watchChange(id, change) {
      callHook(inlinePlugin, "watchChange", this, [id, change]);
      callHook(bundlerPlugin, "watchChange", this, [id, change]);
    },

    resolveId(...args) {
      const inlineResult = callHook(inlinePlugin, "resolveId", this, args);
      if (inlineResult != null) {
        return inlineResult;
      }
      return callHook(bundlerPlugin, "resolveId", this, args) ?? null;
    },

    load(...args) {
      const inlineResult = callHook(inlinePlugin, "load", this, args);
      if (inlineResult != null) {
        return inlineResult;
      }
      return callHook(bundlerPlugin, "load", this, args) ?? null;
    },

    async transform(code, id, meta) {
      const inlineResult = inlineTransform
        ? await normalizeTransformResult(
            code,
            inlineTransform.apply(this, [code, id, meta]),
          )
        : null;

      if (bundleTransform) {
        const bundleResult = await bundleTransform.apply(this, [
          inlineResult?.code ?? code,
          id,
          meta,
        ]);

        if (bundleResult != null) {
          return bundleResult;
        }
      }

      return inlineResult;
    },
  };
}
