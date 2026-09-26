import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "playwright-report/", "test-results/"] },
  js.configs.recommended,
  {
    files: ["app.js", "data.js"],
    languageOptions: { globals: globals.browser },
    rules: { "no-unused-vars": "error", eqeqeq: ["error", "smart"] },
  },
  {
    files: ["tests/**", "*.config.js", ".claude/hooks/**"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }, // page.evaluate bodies run in the browser
  },
];
