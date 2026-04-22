import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Disable React-hooks rules for Playwright E2E tests — Playwright's fixture
  // `use()` callback is not a React hook and false-positively triggers the rule.
  {
    files: ["e2e/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Git worktrees used by parallel agents — not part of this app
    ".claude/worktrees/**",
    ".worktrees/**",
    "apps/**",
    "services/**",
    "docs/**",
  ]),
]);

export default eslintConfig;
