const messages = {
  externalReference:
    'Inline client handlers cannot reference "{{name}}" from an outer scope. Move the value inside the handler or read it from the DOM instead.',
  missingDirective:
    'Inline event handlers passed to the `on` attribute must start with a `"use client"` directive so they can be bundled.',
};

/**
 * @param {import("estree").FunctionExpression | import("estree").ArrowFunctionExpression} node
 */
function hasUseClientDirective(node) {
  if (!node.body || node.body.type !== "BlockStatement") {
    return false;
  }

  const [firstStatement] = node.body.body;
  if (!firstStatement || firstStatement.type !== "ExpressionStatement") {
    return false;
  }

  if ("directive" in firstStatement && firstStatement.directive) {
    return firstStatement.directive === "use client";
  }

  const expr = firstStatement.expression;
  return expr.type === "Literal" && expr.value === "use client";
}

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {import("estree").FunctionExpression | import("estree").ArrowFunctionExpression} node
 */
function getFunctionScope(sourceCode, node) {
  const scope = sourceCode.scopeManager.acquire(node);
  if (scope) {
    return scope;
  }
  return sourceCode.scopeManager.acquire(node, true);
}

/**
 * Returns true when `candidate` scope is the same as `target` scope or a descendant of it.
 *
 * @param {import("@typescript-eslint/scope-manager").Scope | import("eslint-scope").Scope | null} candidate
 * @param {import("@typescript-eslint/scope-manager").Scope | import("eslint-scope").Scope} target
 */
function isScopeWithin(candidate, target) {
  let current = candidate;
  while (current) {
    if (current === target) {
      return true;
    }
    current = current.upper ?? null;
  }
  return false;
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {import("@typescript-eslint/scope-manager").Scope | import("eslint-scope").Scope} functionScope
 */
function reportExternalReferences(context, sourceCode, functionScope) {
  const seen = new Map();
  const stack = [functionScope];

  while (stack.length > 0) {
    const scope = stack.pop();
    if (!scope) continue;

    for (const child of scope.childScopes ?? []) {
      stack.push(child);
    }

    for (const ref of scope.through) {
      // Skip type-only references when using @typescript-eslint.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Only present when using the TS scope manager.
      if (ref.isTypeReference === true) {
        continue;
      }

      if (!ref.identifier) {
        continue;
      }

      if (!ref.resolved) {
        continue;
      }

      const resolvedScope = ref.resolved.scope;

      if (isScopeWithin(resolvedScope, functionScope)) {
        continue;
      }

      if (resolvedScope.type === "global" && ref.resolved.defs.length === 0) {
        continue;
      }

      if (resolvedScope.type === "module") {
        // Module-level bindings (including imports) are safe to capture.
        continue;
      }

      const name = ref.identifier.name;
      if (seen.has(name)) {
        continue;
      }

      seen.set(name, ref.identifier);
    }
  }

  for (const [name, identifier] of seen) {
    context.report({
      node: identifier,
      messageId: "externalReference",
      data: { name },
    });
  }
}

/**
 * @param {import("estree").Node} node
 */
function isInsideOnAttribute(node) {
  let current = node.parent;
  while (current) {
    if (current.type === "JSXAttribute") {
      if (current.name.type === "JSXIdentifier" && current.name.name === "on") {
        return true;
      }
      return false;
    }

    // Do not walk past another function; that would belong to a different handler.
    if (
      current.type === "FunctionExpression" ||
      current.type === "ArrowFunctionExpression"
    ) {
      return false;
    }

    current = current.parent;
  }

  return false;
}

/** @type {import("eslint").Rule.RuleModule} */
const noInvalidInlineClientClosureRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent inline client handlers from capturing values that will disappear when bundled.",
    },
    schema: [],
    messages,
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      "FunctionExpression, ArrowFunctionExpression"(node) {
        if (!hasUseClientDirective(node)) {
          return;
        }

        const functionScope = getFunctionScope(sourceCode, node);
        if (!functionScope) {
          return;
        }

        reportExternalReferences(context, sourceCode, functionScope);
      },
    };
  },
};

/** @type {import("eslint").Rule.RuleModule} */
const requireUseClientDirectiveRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Require inline handlers passed to the `on` attribute to start with a `"use client"` directive.',
    },
    schema: [],
    fixable: "code",
    messages,
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      "FunctionExpression, ArrowFunctionExpression"(node) {
        if (!isInsideOnAttribute(node)) {
          return;
        }

        if (hasUseClientDirective(node)) {
          return;
        }

        const fix =
          node.body && node.body.type === "BlockStatement"
            ? (fixer) => {
                const openingBrace = sourceCode.getFirstToken(node.body);
                if (!openingBrace) {
                  return null;
                }

                const firstStatement = node.body.body[0] ?? null;
                const fallbackIndent = (node.body.loc?.start.column ?? 0) + 2;
                const indentSize =
                  firstStatement?.loc?.start.column ?? fallbackIndent;
                const indent = " ".repeat(indentSize);
                const needsTrailingNewline = node.body.body.length === 0;
                const text =
                  `\n${indent}"use client";` +
                  (needsTrailingNewline ? "\n" : "");

                return fixer.insertTextAfter(openingBrace, text);
              }
            : null;

        context.report({
          node,
          messageId: "missingDirective",
          ...(fix ? { fix } : {}),
        });
      },
    };
  },
};

export default {
  rules: {
    "no-invalid-inline-client-closure": noInvalidInlineClientClosureRule,
    "require-use-client-directive": requireUseClientDirectiveRule,
  },
};
