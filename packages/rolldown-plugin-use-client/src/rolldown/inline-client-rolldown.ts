import { createHash } from "node:crypto";
import path from "node:path";
import ts from "typescript";
import type { Plugin } from "rolldown";
import {
  INLINE_ID_PREFIX,
  INLINE_SPECIFIER_PREFIX,
  clearInlineClientModules,
  deleteInlineClientModule,
  getInlineClientModule,
  setInlineClientModule,
} from "./inline-client-registry.js";

const SCRIPT_KIND_BY_EXT: Record<string, ts.ScriptKind> = {
  ".js": ts.ScriptKind.JS,
  ".jsx": ts.ScriptKind.JSX,
  ".ts": ts.ScriptKind.TS,
  ".tsx": ts.ScriptKind.TSX,
  ".mjs": ts.ScriptKind.JS,
  ".cjs": ts.ScriptKind.JS,
};

type Replacement = {
  start: number;
  end: number;
  replacement: string;
};

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

const specifierToId = new Map<string, string>();
const fileSpecifiers = new Map<string, Set<string>>();

export type InlineClientPluginOptions = {
  /**
   * Absolute or relative directory that contains files to transform.
   * Defaults to the current working directory.
   */
  root?: string;
  /**
   * Additional include predicate. Receives the normalized absolute path.
   */
  include?: (id: string) => boolean;
  /**
   * File pattern to consider for inline extraction.
   */
  filePattern?: RegExp;
};

export default function inlineClientHandlers(
  options: InlineClientPluginOptions = {},
): Plugin {
  const rootDir = options.root ? path.resolve(options.root) : process.cwd();
  const normalizedRoot = rootDir.replace(/\\/g, "/");
  const filePattern = options.filePattern ?? /\.[cm]?[jt]sx?$/;
  const include =
    options.include ??
    ((normalizedPath: string) => {
      if (normalizedPath.includes("/node_modules/")) {
        return false;
      }
      return (
        normalizedPath === normalizedRoot ||
        normalizedPath.startsWith(`${normalizedRoot}/`)
      );
    });

  return {
    name: "inline-client-handlers",

    buildStart() {
      clearInlineClientModules();
      specifierToId.clear();
      fileSpecifiers.clear();
    },
    async transform(code, id) {
      if (id.startsWith("\0")) return;

      const absoluteId = path.isAbsolute(id) ? id : path.resolve(id);
      const normalizedId = absoluteId.replace(/\\/g, "/");

      if (!filePattern.test(absoluteId)) {
        return;
      }

      if (!include(normalizedId)) {
        return;
      }

      const ext = path.extname(absoluteId);
      const scriptKind = SCRIPT_KIND_BY_EXT[ext];
      if (!scriptKind) return;

      const sourceFile = ts.createSourceFile(
        absoluteId,
        code,
        ts.ScriptTarget.Latest,
        true,
        scriptKind,
      );

      const replacements: Replacement[] = [];
      const newSpecifiers = new Set<string>();

      const visit = (node: ts.Node) => {
        if (
          (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
          ts.isBlock(node.body) &&
          node.body.statements.length > 0
        ) {
          const first = node.body.statements[0];
          if (
            ts.isExpressionStatement(first) &&
            (ts.isStringLiteral(first.expression) ||
              ts.isNoSubstitutionTemplateLiteral(first.expression)) &&
            first.expression.text === "use client"
          ) {
            const updatedBlock = ts.factory.createBlock(
              node.body.statements.slice(1),
              true,
            );

            const normalized = ts.isArrowFunction(node)
              ? ts.factory.updateArrowFunction(
                  node,
                  node.modifiers,
                  node.typeParameters,
                  node.parameters,
                  node.type,
                  node.equalsGreaterThanToken,
                  updatedBlock,
                )
              : ts.factory.updateFunctionExpression(
                  node,
                  node.modifiers,
                  node.asteriskToken,
                  node.name,
                  node.typeParameters,
                  node.parameters,
                  node.type,
                  updatedBlock,
                );

            const handlerText = printer.printNode(
              ts.EmitHint.Expression,
              normalized,
              sourceFile,
            );

            const hash = createHash("sha1")
              .update(absoluteId)
              .update(String(node.getStart(sourceFile)))
              .update(handlerText)
              .digest("hex")
              .slice(0, 12);

            const baseName = path
              .basename(absoluteId)
              .replace(/\.[^.]+$/, "")
              .replace(/[^a-zA-Z0-9_-]+/g, "_");

            const fileName = `${baseName}.${hash}.client.ts`;
            const moduleId = `${INLINE_ID_PREFIX}${fileName}`;

            const moduleCode = `"use client";\nexport default ${handlerText};\n`;

            setInlineClientModule(moduleId, moduleCode);
            specifierToId.set(fileName, moduleId);
            newSpecifiers.add(fileName);

            const specifier = `${INLINE_SPECIFIER_PREFIX}${fileName}`;

            replacements.push({
              start: node.getStart(sourceFile),
              end: node.end,
              replacement: `new URL(${JSON.stringify(
                specifier,
              )}, import.meta.url).pathname`,
            });
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      const previousSpecs = fileSpecifiers.get(absoluteId);
      if (previousSpecs) {
        for (const spec of previousSpecs) {
          if (!newSpecifiers.has(spec)) {
            const moduleId = specifierToId.get(spec);
            if (moduleId) {
              specifierToId.delete(spec);
              deleteInlineClientModule(moduleId);
            }
          }
        }
      }
      if (newSpecifiers.size > 0) {
        fileSpecifiers.set(absoluteId, newSpecifiers);
      } else if (previousSpecs) {
        fileSpecifiers.delete(absoluteId);
      }

      if (replacements.length === 0) {
        return;
      }

      replacements.sort((a, b) => b.start - a.start);

      let transformed = code;
      for (const { start, end, replacement } of replacements) {
        transformed =
          transformed.slice(0, start) + replacement + transformed.slice(end);
      }

      return {
        code: transformed,
        map: null,
      };
    },

    resolveId(source) {
      if (source.startsWith(INLINE_SPECIFIER_PREFIX)) {
        const fileName = source.slice(INLINE_SPECIFIER_PREFIX.length);
        const moduleId = specifierToId.get(fileName);
        if (moduleId) {
          return moduleId;
        }
      }
      return null;
    },

    load(id) {
      if (!id.startsWith(INLINE_ID_PREFIX)) return null;
      const code = getInlineClientModule(id);
      if (code === undefined) {
        return null;
      }
      return {
        code,
        map: null,
        moduleType: "ts",
      };
    },
  };
}
