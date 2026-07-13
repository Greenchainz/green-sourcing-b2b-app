import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import security from "eslint-plugin-security";
import globals from "globals";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      ".git/**",
      "backend/**",
      "frontend/**",
    ],
  },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      "react-hooks": reactHooks,
    },
    rules: {
      // Only enable exhaustive-deps (the one that was failing with "rule not found")
      // rules-of-hooks would add 35+ errors to pre-existing code, which is out of scope
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": "off", // Disable base rule as it can report incorrect errors
      "no-undef": "off", // TypeScript handles this
      "no-redeclare": "off", // TypeScript handles redeclarations; TS rule below also fires on valid const+type patterns
      "@typescript-eslint/no-redeclare": "off",
    },
  },
];
