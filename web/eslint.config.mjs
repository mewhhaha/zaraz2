import ts from "typescript-eslint";
import tailwind, {
  loadTailwind,
} from "@mewhhaha/eslint-plugin-simple-tailwind";
import oxlint from "eslint-plugin-oxlint";

const tw = await loadTailwind(import.meta.dirname + "/app/assets/tailwind.css");

export default ts.config(
  ts.configs.recommended,
  tailwind(tw).configs.recommended,
  oxlint.configs["flat/recommended"],
);