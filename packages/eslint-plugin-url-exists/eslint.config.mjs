import tseslint from "typescript-eslint";
import plugin from "./dist/plugin.mjs";



export default tseslint.config(
  ...tseslint.configs.recommended,
  plugin.configs.recommended,
);