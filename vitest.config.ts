import { defineConfig } from "vitest/config";

// Root, black-box config: API + web route handlers over real HTTP against the
// running app (`bash team/bin/app.sh start`). Not the per-package `apps/web`
// component-test config.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
  },
});
