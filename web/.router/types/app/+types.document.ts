import type {
  InferActionArgs,
  InferComponentProps,
  InferHeadersFunction,
  InferLoaderArgs,
} from "@mewhhaha/ruwuter/types";
import * as r from "./document.js";

export type RouteParams = Record<never, never>;

export namespace Route {
  export type ComponentProps = InferComponentProps<typeof r>;
  export type LoaderArgs = InferLoaderArgs<RouteParams>;
  export type ActionArgs = InferActionArgs<RouteParams>;
  export type HeadersFunction = InferHeadersFunction<RouteParams, typeof r>;
}