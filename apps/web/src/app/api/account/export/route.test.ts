// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getClaims = vi.fn();
const get = vi.fn();
const createApiClient = vi.fn((opts: unknown) => {
  void opts;
  return { GET: get };
});

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getSession, getClaims } }) }));
vi.mock("@/lib/api/client", () => ({ createApiClient: (opts: unknown) => createApiClient(opts) }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
  getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
});

describe("GET /api/account/export", () => {
  it("401 without a session", async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: "no" } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(get).not.toHaveBeenCalled();
  });

  it("forwards the bearer token and streams the body with Content-Disposition (AC1)", async () => {
    const body = new Response('{"account":{}}').body;
    get.mockResolvedValue({
      data: body,
      response: new Response(null, {
        status: 200,
        headers: { "content-disposition": 'attachment; filename="autoapplier-export-2026-09-29.json"' },
      }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="autoapplier-export-2026-09-29.json"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe('{"account":{}}');
    expect(createApiClient).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "tok" }));
    expect(get).toHaveBeenCalledWith("/v1/account/export", { parseAs: "stream" });
  });

  it("API failure -> 502", async () => {
    get.mockResolvedValue({ data: undefined, error: { code: "x" }, response: new Response(null, { status: 500 }) });
    expect((await GET()).status).toBe(502);
  });

  it("network throw -> 502", async () => {
    get.mockRejectedValue(new Error("boom"));
    expect((await GET()).status).toBe(502);
  });
});
