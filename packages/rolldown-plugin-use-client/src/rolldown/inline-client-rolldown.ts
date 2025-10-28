import { createHash } from "node:crypto";
import path from "node:path";
import ts from "typescript";
import type { Plugin, TransformPluginContext } from "rolldown";
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

const GLOBAL_IDENTIFIERS = new Set([
  "undefined",
  "NaN",
  "Infinity",
  "console",
  "window",
  "document",
  "self",
  "globalThis",
  "navigator",
  "location",
  "performance",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "queueMicrotask",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "fetch",
  "Headers",
  "Request",
  "Response",
  "FormData",
  "URL",
  "URLSearchParams",
  "AbortController",
  "AbortSignal",
  "Event",
  "MouseEvent",
  "SubmitEvent",
  "KeyboardEvent",
  "HTMLElement",
  "HTMLFormElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLDivElement",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Array",
  "Object",
  "String",
  "Number",
  "Boolean",
  "Symbol",
  "BigInt",
  "Math",
  "Date",
  "Error",
  "Promise",
  "arguments",
]);

type ImportInfo = {
  node: ts.ImportDeclaration;
  code: string;
};

type DeclarationInfo = {
  node: ts.Statement;
  code: string;
  declaredNames: Set<string>;
  dependencies: Set<string>;
};

function collectBindingNames(name: ts.BindingName, target: Set<string>) {
  if (ts.isIdentifier(name)) {
    target.add(name.text);
    return;
  }

  if (ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) {
        if (element.name) {
          collectBindingNames(element.name, target);
        }
      }
    }
    return;
  }

  if (ts.isObjectBindingPattern(name)) {
    for (const element of name.elements) {
      if (element.name) {
        collectBindingNames(element.name, target);
      }
    }
  }
}

function stripExportModifiers(
  modifiers: ts.NodeArray<ts.ModifierLike> | undefined,
) {
  if (!modifiers) return modifiers;
  const filtered = modifiers.filter(
    (modifier) =>
      modifier.kind !== ts.SyntaxKind.ExportKeyword &&
      modifier.kind !== ts.SyntaxKind.DefaultKeyword,
  );
  if (filtered.length === modifiers.length) {
    return modifiers;
  }
  if (filtered.length === 0) {
    return undefined;
  }
  return ts.factory.createNodeArray(filtered);
}

function createPrintableStatement(statement: ts.Statement) {
  if (ts.isFunctionDeclaration(statement)) {
    const modifiers = stripExportModifiers(statement.modifiers);
    if (modifiers !== statement.modifiers) {
      return ts.factory.updateFunctionDeclaration(
        statement,
        modifiers,
        statement.asteriskToken,
        statement.name,
        statement.typeParameters,
        statement.parameters,
        statement.type,
        statement.body,
      );
    }
  } else if (ts.isVariableStatement(statement)) {
    const modifiers = stripExportModifiers(statement.modifiers);
    if (modifiers !== statement.modifiers) {
      return ts.factory.updateVariableStatement(
        statement,
        modifiers,
        statement.declarationList,
      );
    }
  } else if (ts.isClassDeclaration(statement)) {
    const modifiers = stripExportModifiers(statement.modifiers);
    if (modifiers !== statement.modifiers) {
      return ts.factory.updateClassDeclaration(
        statement,
        modifiers,
        statement.name,
        statement.typeParameters,
        statement.heritageClauses,
        statement.members,
      );
    }
  }
  return statement;
}

function isIdentifierReference(node: ts.Identifier) {
  const parent = node.parent;
  if (!parent) return true;

  if (
    ts.isBindingElement(parent) ||
    ts.isImportClause(parent) ||
    ts.isImportSpecifier(parent) ||
    ts.isNamespaceImport(parent) ||
    ts.isExportSpecifier(parent) ||
    ts.isImportEqualsDeclaration(parent) ||
    ts.isTypeAliasDeclaration(parent) ||
    ts.isInterfaceDeclaration(parent) ||
    ts.isTypeReferenceNode(parent) ||
    ts.isHeritageClause(parent) ||
    ts.isExpressionWithTypeArguments(parent) ||
    ts.isTypePredicateNode(parent) ||
    ts.isTypeQueryNode(parent) ||
    ts.isTypeOperatorNode(parent) ||
    ts.isQualifiedName(parent) ||
    ts.isLabeledStatement(parent) ||
    ts.isBreakStatement(parent) ||
    ts.isContinueStatement(parent)
  ) {
    return false;
  }

  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }

  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return ts.isShorthandPropertyAssignment(parent);
  }

  if (
    (ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isClassExpression(parent)) &&
    parent.name === node
  ) {
    return false;
  }

  if (
    ts.isJsxOpeningElement(parent) ||
    ts.isJsxClosingElement(parent) ||
    ts.isJsxSelfClosingElement(parent)
  ) {
    return false;
  }

  return true;
}

function isDeclared(scopes: Array<Set<string>>, name: string) {
  for (let i = scopes.length - 1; i >= 0; i -= 1) {
    if (scopes[i].has(name)) {
      return true;
    }
  }
  return false;
}

function collectReferences(
  node: ts.Node,
  scopes: Array<Set<string>>,
  references: Set<string>,
) {
  if (!node) return;

  if (ts.isIdentifier(node)) {
    if (isIdentifierReference(node) && !isDeclared(scopes, node.text)) {
      references.add(node.text);
    }
    return;
  }

  if (
    ts.isImportDeclaration(node) ||
    ts.isImportClause(node) ||
    ts.isExportDeclaration(node) ||
    ts.isExportAssignment(node) ||
    ts.isTypeNode(node)
  ) {
    return;
  }

  if (ts.isFunctionDeclaration(node)) {
    const current = scopes[scopes.length - 1];
    if (node.name) {
      current.add(node.name.text);
    }
    const fnScope = new Set<string>();
    scopes.push(fnScope);
    for (const param of node.parameters) {
      collectBindingNames(param.name, fnScope);
      if (param.initializer) {
        collectReferences(param.initializer, scopes, references);
      }
    }
    if (node.body) {
      collectReferences(node.body, scopes, references);
    }
    scopes.pop();
    return;
  }

  if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    const fnScope = new Set<string>();
    if (node.name) {
      fnScope.add(node.name.text);
    }
    scopes.push(fnScope);
    for (const param of node.parameters) {
      collectBindingNames(param.name, fnScope);
      if (param.initializer) {
        collectReferences(param.initializer, scopes, references);
      }
    }
    collectReferences(node.body, scopes, references);
    scopes.pop();
    return;
  }

  if (ts.isBlock(node) || ts.isSourceFile(node)) {
    scopes.push(new Set<string>());
    node.forEachChild((child) => {
      collectReferences(child, scopes, references);
    });
    scopes.pop();
    return;
  }

  if (ts.isVariableStatement(node) || ts.isVariableDeclarationList(node)) {
    const list = ts.isVariableStatement(node) ? node.declarationList : node;
    const scope = scopes[scopes.length - 1];
    for (const declaration of list.declarations) {
      collectBindingNames(declaration.name, scope);
      if (declaration.initializer) {
        collectReferences(declaration.initializer, scopes, references);
      }
    }
    return;
  }

  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
    const current = scopes[scopes.length - 1];
    if (node.name) {
      current.add(node.name.text);
    }
  }

  if (ts.isCatchClause(node)) {
    if (node.variableDeclaration) {
      collectBindingNames(
        node.variableDeclaration.name,
        scopes[scopes.length - 1],
      );
    }
    collectReferences(node.block, scopes, references);
    return;
  }

  node.forEachChild((child) => {
    collectReferences(child, scopes, references);
  });
}

function collectFunctionExternalReferences(
  node: ts.FunctionLikeDeclaration,
) {
  const references = new Set<string>();
  const scope = new Set<string>();
  if (node.name && ts.isIdentifier(node.name)) {
    scope.add(node.name.text);
  }
  for (const param of node.parameters) {
    collectBindingNames(param.name, scope);
  }
  const scopes = [scope];
  for (const param of node.parameters) {
    if (param.initializer) {
      collectReferences(param.initializer, scopes, references);
    }
  }
  if (node.body) {
    collectReferences(node.body, scopes, references);
  }
  for (const name of scope) {
    references.delete(name);
  }
  return references;
}

function collectStatementInfo(
  statement: ts.Statement,
  sourceFile: ts.SourceFile,
): DeclarationInfo | null {
  if (ts.isImportDeclaration(statement)) {
    return null;
  }

  const declaredNames = new Set<string>();
  const dependencies = new Set<string>();

  if (ts.isFunctionDeclaration(statement)) {
    if (!statement.name) {
      return null;
    }
    declaredNames.add(statement.name.text);
    const refs = collectFunctionExternalReferences(statement);
    for (const ref of refs) {
      dependencies.add(ref);
    }
  } else if (ts.isVariableStatement(statement)) {
    const scope = new Set<string>();
    for (const declaration of statement.declarationList.declarations) {
      collectBindingNames(declaration.name, scope);
      if (declaration.initializer) {
        collectReferences(declaration.initializer, [scope], dependencies);
      }
    }
    for (const name of scope) {
      declaredNames.add(name);
    }
  } else if (ts.isClassDeclaration(statement)) {
    if (!statement.name) {
      return null;
    }
    declaredNames.add(statement.name.text);
    collectReferences(statement, [declaredNames], dependencies);
    dependencies.delete(statement.name.text);
  } else {
    return null;
  }

  const printable = createPrintableStatement(statement);
  const code = printer.printNode(
    ts.EmitHint.Unspecified,
    printable,
    sourceFile,
  );

  return {
    node: statement,
    code,
    declaredNames,
    dependencies,
  };
}

function buildImportMap(sourceFile: ts.SourceFile) {
  const map = new Map<string, ImportInfo>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const importClause = statement.importClause;
    if (!importClause || importClause.isTypeOnly) continue;
    const code = printer.printNode(
      ts.EmitHint.Unspecified,
      statement,
      sourceFile,
    );
    if (importClause.name) {
      map.set(importClause.name.text, { node: statement, code });
    }
    if (importClause.namedBindings) {
      if (ts.isNamespaceImport(importClause.namedBindings)) {
        map.set(importClause.namedBindings.name.text, {
          node: statement,
          code,
        });
      } else {
        for (const specifier of importClause.namedBindings.elements) {
          if (specifier.isTypeOnly) continue;
          map.set(specifier.name.text, { node: statement, code });
        }
      }
    }
  }
  return map;
}

function buildDeclarationMap(sourceFile: ts.SourceFile) {
  const map = new Map<string, DeclarationInfo>();
  for (const statement of sourceFile.statements) {
    const info = collectStatementInfo(statement, sourceFile);
    if (!info) continue;
    for (const name of info.declaredNames) {
      map.set(name, info);
    }
  }
  return map;
}

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
    async transform(this: TransformPluginContext, code, id) {
      if (id.startsWith("\0")) return;

      const absoluteId = path.isAbsolute(id) ? id : path.resolve(id);
      const normalizedId = absoluteId.replace(/\\/g, "/");

      if (!filePattern.test(absoluteId)) {
        return;
      }

      if (!include(normalizedId)) {
        return;
      }

      this.addWatchFile?.(absoluteId);

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

      const importMap = buildImportMap(sourceFile);
      const declarationMap = buildDeclarationMap(sourceFile);

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

            const externalRefs = collectFunctionExternalReferences(normalized);
            const requiredImports = new Map<ts.ImportDeclaration, ImportInfo>();
            const requiredDeclarations = new Map<ts.Statement, DeclarationInfo>();

            const pending = [...externalRefs].filter(
              (name) => !GLOBAL_IDENTIFIERS.has(name),
            );
            const seen = new Set(pending);

            while (pending.length > 0) {
              const name = pending.pop();
              if (!name) continue;

              const importInfo = importMap.get(name);
              if (importInfo) {
                requiredImports.set(importInfo.node, importInfo);
                continue;
              }

              const declarationInfo = declarationMap.get(name);
              if (declarationInfo) {
                if (!requiredDeclarations.has(declarationInfo.node)) {
                  requiredDeclarations.set(
                    declarationInfo.node,
                    declarationInfo,
                  );
                  for (const dep of declarationInfo.dependencies) {
                    if (!seen.has(dep) && !GLOBAL_IDENTIFIERS.has(dep)) {
                      pending.push(dep);
                      seen.add(dep);
                    }
                  }
                }
                continue;
              }
            }

            const sortedImports = Array.from(requiredImports.values()).sort(
              (a, b) => a.node.pos - b.node.pos,
            );
            const importCode =
              sortedImports.length > 0
                ? `${sortedImports
                    .map((info) => info.code.trim())
                    .join("\n")}\n\n`
                : "";
            const sortedDeclarations = Array.from(
              requiredDeclarations.values(),
            ).sort((a, b) => a.node.pos - b.node.pos);
            const declarationCode =
              sortedDeclarations.length > 0
                ? `${sortedDeclarations
                    .map((info) => info.code.trim())
                    .join("\n\n")}\n\n`
                : "";

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

            const moduleCode = `"use client";\n\n${importCode}${declarationCode}export default ${handlerText};\n`;

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
