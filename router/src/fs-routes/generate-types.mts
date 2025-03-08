import path from "node:path";
import { mkdir, readdir, writeFile, rm } from "node:fs/promises";

const unescapedDotRegex = /(?<!\[)\.(?![^[]*\])/g;
const tsRegex = /\.(m)?ts(x)?$/;

export const generateTypes = async (appFolder: string): Promise<void> => {
  const routesFolder = path.join(appFolder, "routes");

  const files = await readdir(routesFolder);

  const tasks: Promise<void>[] = [];
  await rm(path.join(".router"), { recursive: true, force: true });
  await mkdir(path.join(".router", "types", routesFolder), { recursive: true });

  // First, collect all parameter names from all routes to handle layout routes
  const allRouteParams = new Map<string, Set<string>>();

  for (const file of files) {
    const routeName = file.replace(tsRegex, "");
    const paramInfo = extractParamsFromRoute(routeName);
    allRouteParams.set(routeName, paramInfo.paramNames);

    // For each parent route (layout), add this route's params as optional
    let parentRoute = routeName;
    while (parentRoute.includes(".")) {
      parentRoute = parentRoute.substring(0, parentRoute.lastIndexOf("."));
      const parentParams = allRouteParams.get(parentRoute) || new Set();

      // Add all params from this route to the parent as optional
      for (const param of paramInfo.paramNames) {
        parentParams.add(param);
      }

      allRouteParams.set(parentRoute, parentParams);
    }
  }

  // Now generate the type files with the collected parameters
  for (const file of files) {
    const routeName = file.replace(tsRegex, "");
    const { paramNames, optionalParams } = extractParamsFromRoute(routeName);

    // Get additional params from child routes for layout routes
    const allParams = allRouteParams.get(routeName) || new Set();

    // Generate the params string
    const params = Array.from(allParams)
      .map((param) => {
        // If this param is optional in this route or comes from a child route, make it optional
        const isOptional = optionalParams.has(param) || !paramNames.has(param);
        return `\t${param}${isOptional ? "?" : ""}: string;`;
      })
      .join("\n");

    const isDirectory = !file.endsWith(".tsx");

    const template = createTemplate(isDirectory ? "route.tsx" : file, params);

    const basePath = path.join(".router", "types", routesFolder);
    if (isDirectory) {
      const task = async () => {
        await mkdir(path.join(basePath, file), { recursive: true });
        writeFile(path.join(basePath, file, `+types.route.d.ts`), template);
      };
      tasks.push(task());
    } else {
      const task = async () =>
        writeFile(
          path.join(basePath, `+types.${file.replace(tsRegex, ".ts")}`),
          template,
        );
      tasks.push(task());
    }
  }

  const rootTemplate = createTemplate("document.tsx", "");
  const task = writeFile(
    path.join(".router", "types", appFolder, "+types.document.ts"),
    rootTemplate,
  );
  tasks.push(task);

  await Promise.all(tasks);
};

/**
 * Extract parameter names from a route, identifying which ones are optional
 */
function extractParamsFromRoute(routeName: string): {
  paramNames: Set<string>;
  optionalParams: Set<string>;
} {
  const paramNames = new Set<string>();
  const optionalParams = new Set<string>();

  routeName.split(unescapedDotRegex).forEach((segment) => {
    // Check if this is an optional segment
    const isOptional = segment.startsWith("(") && segment.endsWith(")");
    const actualSegment = isOptional ? segment.slice(1, -1) : segment;

    // Check if it's a parameter
    if (actualSegment === "$") {
      return; // Skip wildcard params
    } else if (actualSegment.startsWith("$")) {
      const paramName = actualSegment.slice(1);
      paramNames.add(paramName);

      // If the segment was optional, mark the parameter as optional
      if (isOptional) {
        optionalParams.add(paramName);
      }
    } else if (actualSegment === "*") {
      paramNames.add("*");
    }
  });

  return { paramNames, optionalParams };
}

const createTemplate = (file: string, params: string) => {
  const paramsObject = params ? `{ ${params.trim()} }` : "Record<never, never>";

  const template = `
import type {
  InferActionArgs,
  InferComponentProps,
  InferHeadersFunction,
  InferLoaderArgs,
} from "@mewhhaha/fx-router/types";
import * as r from "./${file.replace(tsRegex, ".js")}";

export type RouteParams = ${paramsObject};

export type ComponentProps = InferComponentProps<typeof r>;
export type LoaderArgs = InferLoaderArgs<RouteParams>;
export type ActionArgs = InferActionArgs<RouteParams>;
export type HeadersFunction = InferHeadersFunction<RouteParams, typeof r>;
    `.trim();

  return template;
};
