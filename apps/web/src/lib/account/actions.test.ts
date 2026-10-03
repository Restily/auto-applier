import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const signOut = vi.fn();
const post = vi.fn();
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT:${to}`);
});
const createApiClient = vi.fn((opts: unknown) => {
  void opts;
  return { POST: post };
});

vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getSession, signOut } }),
}));
vi.mock("@/lib/api/client", () => ({ createApiClient: (opts: unknown) => createApiClient(opts) }));

import { deleteAccountAction } from "./actions";

function reply(status: number) {
  return { data: undefined, error: status === 204 ? undefined : { code: "x" }, response: new Response(null, { status }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
  signOut.mockResolvedValue({ error: null });
});

describe("deleteAccountAction", () => {
  it("204 -> signOut local then redirect /account-deleted (S-006 AC2)", async () => {
    post.mockResolvedValue(reply(204));
    await expect(deleteAccountAction("a@example.test")).rejects.toThrow("NEXT_REDIRECT:/account-deleted");
    expect(post).toHaveBeenCalledWith("/v1/account/deletion", { body: { confirm_email: "a@example.test" } });
    expect(createApiClient).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "tok" }));
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(signOut.mock.invocationCallOrder[0]!).toBeLessThan(redirect.mock.invocationCallOrder[0]!);
  });

  it("422 -> mismatch", async () => {
    post.mockResolvedValue(reply(422));
    expect(await deleteAccountAction("x@example.test")).toEqual({ ok: false, error: "mismatch" });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("502 -> failed and no signOut", async () => {
    post.mockResolvedValue(reply(502));
    expect(await deleteAccountAction("a@example.test")).toEqual({ ok: false, error: "failed" });
    expect(signOut).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("network throw -> failed", async () => {
    post.mockRejectedValue(new Error("boom"));
    expect(await deleteAccountAction("a@example.test")).toEqual({ ok: false, error: "failed" });
  });

  it("no session -> failed without calling the API", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    expect(await deleteAccountAction("a@example.test")).toEqual({ ok: false, error: "failed" });
    expect(post).not.toHaveBeenCalled();
  });
});
