import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // `server-only` throws when imported outside a React Server Component. Tests run lib/*
      // modules directly, so it resolves to an empty module (the guard matters in the Next build).
      { find: /^server-only$/, replacement: path.join(root, "tests/unit/mocks/empty.ts") },
      { find: /^@\//, replacement: `${root}/` },
    ],
  },
  test: {
    // Node by default. A test that needs the DOM opts in with `// @vitest-environment jsdom`.
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**", "out/**", ".next/**"],
    setupFiles: ["tests/setup.ts"],
    css: false,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
