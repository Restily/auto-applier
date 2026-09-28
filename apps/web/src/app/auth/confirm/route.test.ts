import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string): never => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirectMock(url) }));

const verifyOtp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { verifyOtp } }) }));

import { GET } from "./route";

async function visit(query: string): Promise<string> {
  const request = { nextUrl: new URL(`http://localhost:3000/auth/confirm?${query}`) } as NextRequest;
  try {
    await GET(request);
  } catch (e) {
    return (e as Error).message.replace("NEXT_REDIRECT:", "");
  }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyOtp.mockResolvedValue({ data: {}, error: null });
});

describe("GET /auth/confirm", () => {
  it("valid recovery token redirects to /reset-password", async () => {
    expect(await visit("token_hash=abc&type=recovery&next=/reset-password")).toBe("/reset-password");
    expect(verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc" });
  });

  it("verifyOtp error -> link_invalid (reused or expired link)", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { code: "otp_expired", status: 403 } });
    expect(await visit("token_hash=abc&type=recovery")).toBe("/reset-password?error=link_invalid");
  });

  it("non-recovery type -> link_invalid without verifying", async () => {
    expect(await visit("token_hash=abc&type=signup")).toBe("/reset-password?error=link_invalid");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("missing token -> link_invalid", async () => {
    expect(await visit("type=recovery")).toBe("/reset-password?error=link_invalid");
  });

  it("unsafe next falls back to /reset-password", async () => {
    expect(await visit("token_hash=abc&type=recovery&next=//evil.test")).toBe("/reset-password");
    expect(await visit("token_hash=abc&type=recovery&next=https://evil.test")).toBe("/reset-password");
  });
});
