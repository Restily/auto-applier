import path from "node:path";
import { fileURLToPath } from "node:url";
import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_BOUNDARY_MESSAGE =
  "Create Supabase clients only via src/lib/supabase/server.ts or client.ts (createSupabaseServerClient / createSupabaseBrowserClient).";
const API_BOUNDARY_MESSAGE =
  "Call the Python API through src/lib/api/client.ts (createApiClient) so auth forwarding and error mapping stay in one place.";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      ".next-build/**",
      "next-env.d.ts",
      "src/lib/**/*.gen.ts",
      "src/lib/supabase/database.types.ts",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Supabase and the generated Python-API client are each allowed from
      // exactly one folder; everywhere else, import the typed wrapper instead.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@supabase/ssr", message: SUPABASE_BOUNDARY_MESSAGE },
            { name: "@supabase/supabase-js", message: SUPABASE_BOUNDARY_MESSAGE },
            { name: "openapi-fetch", message: API_BOUNDARY_MESSAGE },
          ],
        },
      ],
      "import/no-restricted-paths": [
        "error",
        {
          basePath: dirname,
          zones: [
            {
              target: "./src/components",
              from: "./src/app",
              message: "Components must not depend on routes; move shared code to src/lib or src/components.",
            },
            {
              target: "./src/lib",
              from: ["./src/components", "./src/app"],
              message: "src/lib is UI-free; pass data in from the route or component.",
            },
          ],
        },
      ],
    },
  },
  {
    // Only src/lib/supabase may reach into the Supabase SDK directly.
    files: ["src/lib/supabase/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "openapi-fetch", message: API_BOUNDARY_MESSAGE }] },
      ],
    },
  },
  {
    // Only src/lib/api may reach into the generated Python-API client.
    files: ["src/lib/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@supabase/ssr", message: SUPABASE_BOUNDARY_MESSAGE },
            { name: "@supabase/supabase-js", message: SUPABASE_BOUNDARY_MESSAGE },
          ],
        },
      ],
    },
  },
];

export default config;
