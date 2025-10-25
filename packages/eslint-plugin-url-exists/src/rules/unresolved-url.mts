import { type RuleModule } from "@typescript-eslint/utils/ts-eslint";
import { type TSESTree } from "@typescript-eslint/utils";
import path from "node:path";
import fs from "node:fs";
const messages = {
  unresolvedUrl: "Unresolved URL '{{url}}'",
};

const rule: RuleModule<keyof typeof messages, []> = {
  meta: {
    messages,
    type: "problem",
    schema: [],
    docs: {
      description: "Rule for ensuring that there are no unresolved URLs.",
    },
  },
  defaultOptions: [],
  create(context) {
    const reportUnresolvedUrl = (
      expression: TSESTree.StringLiteral,
      url: string,
    ) => {
      context.report({
        node: expression,
        messageId: "unresolvedUrl",
        data: {
          url,
        },
      });
    };

    return {
      NewExpression: function (newExpression) {
        if (
          newExpression.callee.type !== "Identifier" ||
          newExpression.callee.name !== "URL"
        ) {
          return;
        }

        const [firstArg, secondArg] = newExpression.arguments;
        if (!firstArg || !secondArg) {
          return;
        }

        // Check if secondArg is import.meta.url (actual AST structure)
        if (
          secondArg.type === "MemberExpression" &&
          secondArg.object.type === "MetaProperty" &&
          secondArg.object.meta.type === "Identifier" &&
          secondArg.object.meta.name === "import" &&
          secondArg.object.property.type === "Identifier" &&
          secondArg.object.property.name === "meta" &&
          secondArg.property.type === "Identifier" &&
          secondArg.property.name === "url"
        ) {
          // import.meta.url detected, precious!
          if (
            firstArg.type === "Literal" &&
            typeof firstArg.value === "string"
          ) {
            const dirname = path.dirname(context.filename);
            if (dirname) {
              const resolvedPath = path.resolve(dirname, firstArg.value);
              if (!fs.existsSync(resolvedPath)) {
                reportUnresolvedUrl(firstArg, firstArg.value);
              }
            }
          }
        }
      },
    };
  },
};

export default rule;
