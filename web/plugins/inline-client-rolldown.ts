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
} from "./inline-client-registry";

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

export default function inlineClientHandlers(): Plugin {
  return {
    name: "inline-client-handlers",

    buildStart() {
      clearInlineClientModules();
      specifierToId.clear();
      fileSpecifiers.clear();
    },

    async transform(code, id) {
      if (!id.startsWith(process.cwd())) return;
      const normalizedId = id.replace(/\\/g, "/");
      if (!normalizedId.includes("/app/")) return;
      if (!/\.[cm]?[jt]sx?$/.test(id)) return;

      const ext = path.extname(id);
      const scriptKind = SCRIPT_KIND_BY_EXT[ext];
      if (!scriptKind) return;

      const sourceFile = ts.createSourceFile(
        id,
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
              .update(id)
              .update(String(node.getStart(sourceFile)))
              .update(handlerText)
              .digest("hex")
              .slice(0, 12);

            const baseName = path
              .basename(id)
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

      const previousSpecs = fileSpecifiers.get(id);
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
        fileSpecifiers.set(id, newSpecifiers);
      } else if (previousSpecs) {
        fileSpecifiers.delete(id);
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
