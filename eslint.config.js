import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.node } } },
  { files: ["src/price-engine/rates.cjs"], languageOptions: { sourceType: "commonjs" } },
];
