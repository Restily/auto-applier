import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");

function parseDotenv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    let value = line.slice(eq + 1).trim();
    if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
    out[line.slice(0, eq).trim()] = value;
  }
  return out;
}

export type LocalEnv = {
  supabaseUrl: string;
  secretKey: string;
  publishableKey: string;
  mailpitUrl: string;
  appUrl: string;
};

/** Reads backend/.env and apps/web/.env.local (written by scripts/sync_env.py); process.env wins. */
export function localEnv(): LocalEnv {
  const backend = parseDotenv(path.join(ROOT, "backend/.env"));
  const web = parseDotenv(path.join(ROOT, "apps/web/.env.local"));
  const pick = (name: string, ...sources: Array<string | undefined>): string => {
    const value = process.env[name] || sources.find((s) => s);
    if (!value) {
      throw new Error(`${name} is not set: run "python3 scripts/sync_env.py" with local Supabase running`);
    }
    return value;
  };
  return {
    supabaseUrl: pick("SUPABASE_URL", backend.SUPABASE_URL, web.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, ""),
    secretKey: pick("SUPABASE_SECRET_KEY", backend.SUPABASE_SECRET_KEY),
    publishableKey: pick("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", web.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    mailpitUrl: (process.env.MAILPIT_URL ?? "http://127.0.0.1:54324").replace(/\/$/, ""),
    appUrl: process.env.APP_URL ?? "http://localhost:3000",
  };
}
