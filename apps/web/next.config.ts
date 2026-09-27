import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// This file lives at apps/web/next.config.ts — the repo root is two levels up.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: repoRoot,
  },
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
