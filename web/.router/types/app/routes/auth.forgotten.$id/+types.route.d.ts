import type {
  InferActionArgs,
  InferComponentProps,
  InferHeadersFunction,
  InferLoaderArgs,
} from "@mewhhaha/fx-router/types";
import * as r from "./route.js";

export type RouteParams = { id: string; };

export type ComponentProps = InferComponentProps<typeof r>;
export type LoaderArgs = InferLoaderArgs<RouteParams>;
export type ActionArgs = InferActionArgs<RouteParams>;
export type HeadersFunction = InferHeadersFunction<RouteParams, typeof r>;