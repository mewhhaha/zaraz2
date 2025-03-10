import type {
  InferActionArgs,
  InferComponentProps,
  InferHeadersFunction,
  InferLoaderArgs,
} from "@mewhhaha/fx-router/types";
import * as r from "./_root.add.js";

export type RouteParams = Record<never, never>;

export type ComponentProps = InferComponentProps<typeof r>;
export type LoaderArgs = InferLoaderArgs<RouteParams>;
export type ActionArgs = InferActionArgs<RouteParams>;
export type HeadersFunction = InferHeadersFunction<RouteParams, typeof r>;