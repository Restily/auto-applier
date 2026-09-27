import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

// @testing-library/react only auto-registers this when it finds a global
// `afterEach` (vitest.config.mts does not set `test.globals: true`, so
// every test file imports `afterEach` from "vitest" explicitly instead).
afterEach(() => {
  cleanup();
});
