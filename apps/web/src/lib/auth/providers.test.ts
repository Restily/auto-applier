import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthProviders } from "./providers";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

function settings(external: Record<string, boolean>): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify({ external }), { status: 200 })) as unknown as typeof fetch;
}

describe("getAuthProviders", () => {
  it("google true when settings say so", async () => {
    const fetchImpl = settings({ google: true, email: true });
    await expect(getAuthProviders(fetchImpl)).resolves.toEqual({ google: true });
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0]!;
    expect(String(url)).toBe("http://127.0.0.1:54321/auth/v1/settings");
    expect((init?.headers as Record<string, string>).apikey).toBe("sb_publishable_test");
  });

  it("false when disabled", async () => {
    await expect(getAuthProviders(settings({ google: false }))).resolves.toEqual({ google: false });
  });

  it("false when fetch rejects", async () => {
    const failing = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await expect(getAuthProviders(failing)).resolves.toEqual({ google: false });
  });

  it("false on a non-OK response or malformed body", async () => {
    const bad = vi.fn(async () => new Response("oops", { status: 500 })) as unknown as typeof fetch;
    await expect(getAuthProviders(bad)).resolves.toEqual({ google: false });
    const junk = vi.fn(async () => new Response("[]", { status: 200 })) as unknown as typeof fetch;
    await expect(getAuthProviders(junk)).resolves.toEqual({ google: false });
  });
});
