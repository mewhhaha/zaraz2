import { type JSX } from "./runtime/jsx.mjs";
import { into, type Html } from "./runtime/node.mts";

export type { Html } from "./runtime/node.mts";
export type { JSX } from "./runtime/jsx.mts";

export const render = (value: Html): string => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }

  return value.toString();
};

export interface Env {}

export interface ctx {
  request: Request;
  params: Record<string, string>;
  context: [Env, ExecutionContext];
}

export type loader = (params: any) => any;
export type action = (params: any) => any;
export type renderer = (props: any) => JSX.Element;
export type headers = (
  params: ctx & {
    loaderData: any | never;
  },
) =>
  | Promise<Record<string, string | undefined | null> | Headers>
  | Record<string, string | undefined | null>
  | Headers;

export type mod = {
  loader?: loader;
  action?: action;
  default?: renderer;
  headers?: headers;
};

export type fragment = { id: string; mod: mod; params?: string[] };

export type route = [path: string, fragments: fragment[]];

export type router = {
  handle: (request: Request, ...args: ctx["context"]) => Promise<Response>;
};

export const Router = (routes: route[]): router => {
  const handle = async (
    request: Request,
    ...args: ctx["context"]
  ): Promise<Response> => {
    const url = new URL(request.url);
    let r = findRoute(routes, url.pathname);

    if (!r) {
      return new Response(null, { status: 404 });
    }

    if (request.headers.has("fx-request")) {
      // Remove the document properties if it's not an entirely new page
      r.fragments = r.fragments.slice(1);
    }

    const ctx = { request, params: r.params ?? {}, context: args };

    try {
      const leaf = r.fragments.at(-1)?.mod;

      if (request.method === "GET" && leaf?.default) {
        return await routeResponse(r.fragments, ctx);
      }

      if (request.method === "GET" && leaf?.loader) {
        return await dataResponse(leaf.loader, ctx);
      }

      if (request.method !== "GET" && leaf?.action) {
        return await dataResponse(leaf.action, ctx);
      }

      return new Response(null, { status: 404 });
    } catch (e) {
      if (e instanceof Response) {
        return e;
      }

      if (e instanceof Error) {
        console.error(e.message);
      }

      return new Response(null, { status: 500 });
    }
  };

  return {
    handle,
  };
};

const findRoute = (routes: route[], pathname: string) => {
  const segments = pathname.split("/");
  for (const route of routes) {
    const params = match(segments, route[0].split("/"));
    if (params) {
      return { fragments: route[1], params };
    }
  }
  return undefined;
};

const dataResponse = async (f: action | loader, ctx: ctx) => {
  const value = await f(ctx);
  if (value instanceof Response) {
    return value;
  }
  return Response.json(value);
};

const routeResponse = async (fragments: fragment[], ctx: ctx) => {
  const loaders = await Promise.all(
    fragments.map((fragment) => fragment.mod.loader?.(ctx)),
  );

  const headers = await appendAllHeaders(
    new Headers({
      "Content-Type": "text/html",
    }),
    ctx,
    fragments,
    loaders,
  );

  const write = async () => {
    let html = "<!doctype html>";
    const node = fragments.reduceRight((curr, next, i) => {
      const loaderData = loaders[i];
      const Component = next.mod.default;
      let t = Component?.({ loaderData, children: curr }) ?? curr;
      if (typeof t === "string") {
        return into(t);
      }

      return t;
    }, into(""));

    html += render(node);
    return html;
  };

  return new Response(await write(), {
    headers,
    status: 200,
  });
};

const appendAllHeaders = async (
  headers: Headers,
  ctx: ctx,
  fragments: fragment[],
  loaders: (Promise<unknown> | undefined)[],
) => {
  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i];
    const loaderData = loaders[i];

    if (!fragment.mod.headers) {
      continue;
    }

    const h = await fragment.mod.headers?.({
      context: ctx.context,
      request: ctx.request,
      params: ctx.params,
      loaderData,
    });

    const entries = h instanceof Headers ? h.entries() : Object.entries(h);

    for (const [key, value] of entries) {
      if (value === undefined || value === null) {
        continue;
      }
      headers.append(key, value);
    }
  }
  return headers;
};

const match = (
  segments: string[],
  pattern: string[],
): null | Record<string, string> => {
  if (pattern.length == 1 && pattern[0] == "*") {
    return { "*": segments.join("/") };
  }

  if (segments.length != pattern.length && !pattern.includes("*")) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const p = pattern[i];
    if (p == "*") {
      params["*"] = segments.slice(i).join("/");
      return params;
    } else if (p[0] == ":") {
      params[p.slice(1)] = s;
    } else if (s != p) {
      return null;
    }
  }

  return params;
};
