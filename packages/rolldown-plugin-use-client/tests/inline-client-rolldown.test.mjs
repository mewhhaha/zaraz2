import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import inlineClientHandlers from "../dist/rolldown/inline-client-rolldown.js";
import {
  clearInlineClientModules,
  getInlineClientModule,
} from "../dist/rolldown/inline-client-registry.js";

test("removes inline-only imports from the server module", async () => {
  clearInlineClientModules();

  const plugin = inlineClientHandlers();

  const emitted = [];
  const context = {
    emitFile(spec) {
      emitted.push(spec);
      return `ref_${emitted.length}`;
    },
    addWatchFile() {},
  };

  plugin.buildStart?.call(context);

  const source = `
import { foo, bar } from "./dep";

const inline = async function () {
  "use client";
  await foo();
};

const keep = bar();
`.trimStart();
  const id = path.join(process.cwd(), "__fixtures__", "example.tsx");

  const result = await plugin.transform.handler.call(context, source, id);
  assert.ok(result, "expected transform result");

  const transformed = result.code;
  assert.equal(
    (transformed.match(/import\s+\{\s*bar\s*\}\s+from\s+"\.\/dep";/) ?? [])
      .length,
    1,
    "expected the remaining import specifier to be preserved",
  );
  assert.ok(
    !/foo/.test(transformed),
    "expected inline-only specifier to be pruned from the server module",
  );
  assert.match(
    transformed,
    /new URL\(import\.meta\.ROLLUP_FILE_URL_ref_1\)\.pathname/,
    "expected inline handler to be replaced with emitted client path",
  );

  assert.equal(emitted.length, 1, "expected a single emitted client chunk");
  const moduleId = emitted[0]?.id;
  assert.ok(moduleId, "expected emitted chunk to have an id");
  assert.strictEqual(
    emitted[0]?.moduleSideEffects,
    false,
    "expected emitted chunk to be flagged as side-effect free",
  );

  const moduleCode = getInlineClientModule(moduleId);
  assert.ok(
    moduleCode && moduleCode.includes("foo"),
    "expected inline module to import the original specifier",
  );
  assert.ok(
    moduleCode?.startsWith('"use client";'),
    "expected inline module to preserve the directive",
  );
});
