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
  for (const file of files) {
    const params = file
      .replace(tsRegex, "")
      .split(unescapedDotRegex)
      .map((name) => {
        if (name === "$") {
          return null;
        }

        if (name.startsWith("$")) {
          return name.slice(1);
        }

        if (name === "*") {
          return "*";
        }

        if (name.startsWith("($") && name.endsWith(")")) {
          return name.slice(2, -1);
        }

        return null;
      })
      .filter((name) => name !== null)
      .map((name) => `\t${name}: string;`)
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

  const rootTemplate = createTemplate("root", "");
  const task = writeFile(
    path.join(".router", "types", appFolder, "+types.root.ts"),
    rootTemplate,
  );
  tasks.push(task);

  await Promise.all(tasks);
};

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
