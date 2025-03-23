#!/usr/bin/env node --experimental-strip-types --no-warnings

import { generateRouter } from "./generate-router.mts";
import path from "node:path";
import { generateTypes } from "./generate-types.mts";

const appFolder = path.normalize(process.argv[2]);

console.log("Generating router for", appFolder);
await generateRouter(appFolder);
console.log("Generating types for", appFolder);
await generateTypes(appFolder);
