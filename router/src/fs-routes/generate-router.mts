import { readdir, writeFile } from "node:fs/promises";
import path from "node:path/posix";
import { bySpecificity } from "./sort.mts";

/**
 * Generate a regex literal for a route path using named capture groups
 */
const generateRegexPattern = (routePath: string): string => {
  // Remove leading slash and split into segments
  const path = routePath.startsWith("/") ? routePath.slice(1) : routePath;
  const segments = path.split("/").filter(Boolean);

  // Special case: empty path (root route)
  if (segments.length === 0) {
    return `/^$/`;
  }

  // Special case: wildcard route
  if (segments.length === 1 && segments[0] === "*") {
    return `/^(?<wildcard>.*)$/`;
  }

  const regexParts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (segment === "*") {
      // Wildcard with named capture group
      regexParts.push("(?<wildcard>.*)");
      break;
    } else if (segment.startsWith(":")) {
      // Named parameter with named capture group
      const paramName = segment.slice(1);
      // Use the parameter name directly as the capture group name
      regexParts.push(`(?<${paramName}>[^/]+)`);
    } else {
      // Escape special regex characters for literal segments
      // Double escaping needed because this will be in a JS string that creates a regex
      regexParts.push(segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
  }

  // Create the regex pattern with slashes for direct use
  const regexPattern = regexParts.join("\\/");
  return `/^${regexPattern}$/`;
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
          return segment
            .replace(paramRegex, ":")
            .replace(splatRegex, "*")
            .replace(pathlessRegex, "");
        })
        .filter((segment) => segment !== "")
        .join("/");

      return [file, varName(file), `/${route}`] as const;
    });

  const routeVars = routes
    .map(([file, name]) => {
      const params = file
        .split(unescapedDotRegex)
        .filter((segment) => segment.startsWith("$"))
        .map((segment) => `"${segment.slice(1)}"`)
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
