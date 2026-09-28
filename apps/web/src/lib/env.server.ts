import "server-only";

import { z } from "zod";

/**
 * Server-only environment. The browser never calls the Python API directly
 * and never receives this — see ARCHITECTURE.md (Next.js calls the Python
 * API server-side only).
 */
export const serverEnvSchema = z.object({
  API_URL: z.string().url().default("http://127.0.0.1:8000"),
  /** The public origin of this app; OAuth redirects are built from it, never from request headers. */
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const issue = result.error.issues[0];
    const name = issue?.path.join(".") || "environment";
    throw new Error(`Invalid environment variable ${name}: ${issue?.message ?? "validation failed"}`);
  }
  return result.data;
}

let cachedServerEnv: ServerEnv | undefined;

/** Memoized; evaluated lazily so importing this module never reads `process.env`. */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv === undefined) {
    cachedServerEnv = parseServerEnv(process.env);
  }
  return cachedServerEnv;
}
