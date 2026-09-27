import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // The real `server-only` package throws outside React Server Components;
      // tests run in Node/jsdom, not RSC, so swap it for a no-op module.
      "server-only": path.resolve(dirname, "./src/test/empty-module.ts"),
    },
  },
});
