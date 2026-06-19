import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
      "**/next-env.d.ts",
      "**/.vitepress/.temp/**",
      "**/.vitepress/cache/**",
      "**/.vitepress/dist/**",
      ".codex/**",
      ".claude/**",
      "coverage/**",
      "node_modules/**",
      "tests/fixtures/*.json",
    ],
  },
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Blob: "readonly",
        DOMParser: "readonly",
        File: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        Image: "readonly",
        URL: "readonly",
        XMLSerializer: "readonly",
        document: "readonly",
        window: "readonly",
        crypto: "readonly",
        console: "readonly",
        process: "readonly",
        performance: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
