import { readdir, writeFile } from "node:fs/promises";
import path from "node:path/posix";
import { bySpecificity } from "./sort.mts";

/**
 * Generate a regex literal for a route path using named capture groups
 * Supports optional segments marked with parentheses: (segment) or ($param)
 */
const generateRegexPattern = (routePath: string): string => {
  // Remove leading slash and split into segments
  const pathWithoutLeadingSlash = routePath.startsWith("/")
    ? routePath.slice(1)
    : routePath;
  const segments = pathWithoutLeadingSlash.split("/").filter(Boolean);

  // Special case: empty path (root route)
  if (segments.length === 0) {
    return `/^$/`;
  }

  // Special case: wildcard route
  if (segments.length === 1 && segments[0] === "*") {
    return `/^(?<wildcard>.*)$/`;
  }

  // Process segments and build regex parts
  let regexStr = "^";
  let isFirstSegment = true;

  for (const segment of segments) {
    const isOptional = segment.startsWith("(") && segment.endsWith(")");
    const actualSegment = isOptional ? segment.slice(1, -1) : segment;

    // Add path separator except for first segment
    if (!isFirstSegment) {
      regexStr += "\\/";
    }
    isFirstSegment = false;

    if (actualSegment === "*") {
      // Wildcard segment
      regexStr += "(?<wildcard>.*)";
      break;
    } else if (actualSegment.startsWith(":")) {
      // Parameter segment
      const paramName = actualSegment.slice(1);
      const paramPattern = `(?<${paramName}>[^/]+)`;

      if (isOptional) {
        // For optional parameters, make the whole segment optional
        // including the preceding slash (except for first segment)
        if (regexStr.endsWith("\\/")) {
          // Remove the last slash and make the whole segment optional
          regexStr = regexStr.slice(0, -2) + `(?:\\/${paramPattern})?`;
        } else {
          // First segment is optional
          regexStr += `(?:${paramPattern})?`;
        }
      } else {
        // Regular parameter
        regexStr += paramPattern;
      }
    } else {
      // Static segment
      const escapedSegment = actualSegment.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      if (isOptional) {
        // For optional static segments, make the whole segment optional
        // including the preceding slash (except for first segment)
        if (regexStr.endsWith("\\/")) {
          // Remove the last slash and make the whole segment optional
          regexStr = regexStr.slice(0, -2) + `(?:\\/${escapedSegment})?`;
        } else {
          // First segment is optional
          regexStr += `(?:${escapedSegment})?`;
        }
      } else {
        // Regular static segment
        regexStr += escapedSegment;
      }
    }
  }

  regexStr += "$";
  return `/${regexStr}/`;
};

export const generateRouter = async (appFolder: string): Promise<void> => {
  const routesFolder = path.join(appFolder, "routes");

  const unescapedDotRegex = /(?<!\[)\.(?![^[]*\])/g;

  const tsRegex = /\.ts(x)?$/;

  const paramRegex = /^\$/g;

  const splatRegex = /\$$/g;

  const pathlessRegex = /^_.*/;

  const files = await readdir(routesFolder);

  const varName = (file: string) => {
    return "$" + file.replace(tsRegex, "").replace(/[^a-zA-Z0-9]/g, "_");
  };

  const routeImports = files
    .map((file) => {
      const isDirectory = !file.endsWith(".tsx");
      const name = varName(file);
      if (isDirectory) {
        return `import * as ${name} from "./routes/${file}/route.tsx";`;
      }
      return `import * as ${name} from "./routes/${file}";`;
    })
    .join("\n");

  const routes = files
    .map((file) => file.replace(tsRegex, ""))
    .sort(bySpecificity)
    .map((file) => {
      const route = file
        .split(unescapedDotRegex)
        .map((segment) => {
          // Check for optional segments (wrapped in parentheses)
          const isOptional = segment.startsWith("(") && segment.endsWith(")");
          const actualSegment = isOptional ? segment.slice(1, -1) : segment;

          // Process the segment content
          const processedSegment = actualSegment
            .replace(paramRegex, ":")
            .replace(splatRegex, "*")
            .replace(pathlessRegex, "");

          // Re-wrap in parentheses if it was optional
          return isOptional ? `(${processedSegment})` : processedSegment;
        })
        .filter((segment) => segment !== "")
        .join("/");

      return [file, varName(file), `/${route}`] as const;
    });

  const routeVars = routes
    .map(([file, name]) => {
      const params = file
        .split(unescapedDotRegex)
        .filter((segment) => {
          // Handle optional parameters - check inside parentheses if needed
          if (segment.startsWith("(") && segment.endsWith(")")) {
            const innerSegment = segment.slice(1, -1);
            return innerSegment.startsWith("$");
          }
          return segment.startsWith("$");
        })
        .map((segment) => {
          // Extract parameter name, handling optional parameters
          if (segment.startsWith("(") && segment.endsWith(")")) {
            const innerSegment = segment.slice(1, -1);
            return `"${innerSegment.slice(1)}"`;
          }
          return `"${segment.slice(1)}"`;
        })
        .join(",");

      if (params) {
        return `const $${name} = { id: "${file}", mod: ${name}, params: [${params}] };`;
      }
      return `const $${name} = { id: "${file}", mod: ${name} };`;
    })
    .join("\n");

  const routeItems = routes
    .filter(([file]) => {
      return routes.every(([suffix]) => {
        return !suffix.startsWith(`${file}.`);
      });
    })
    .map(([file, name, path]) => {
      const fragments = [
        "$document",
        ...routes
          .filter(([prefix]) => file.startsWith(`${prefix}.`))
          .map(([, name]) => {
            return `$${name}`;
          })
          .reverse(),
        `$${name}`,
      ];

      // Generate regex pattern for this route
      const regexLiteral = generateRegexPattern(path);

      return `[${regexLiteral}, [${fragments.join(",")}]]`;
    })
    .join(",\n");

  const file = `
import * as document from "./document.tsx";
import { type route } from "@mewhhaha/fx-router";
${routeImports}
${routeVars}
const $document = { id: "", mod: document };

export const routes: route[] = [${routeItems}];
`;

  await writeFile(path.join(appFolder, "routes.mts"), file);
};
