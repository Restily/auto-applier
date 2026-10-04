import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
const getSession = vi.fn();
const post = vi.fn();
const createApiClient = vi.fn((opts: unknown) => {
  void opts;
  return { POST: post };
});

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getClaims, getSession } }) }));
vi.mock("@/lib/api/client", () => ({ createApiClient: (o: unknown) => createApiClient(o) }));

import { retryResumeExtraction } from "./actions";

const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
  getSession.mockReset().mockResolvedValue({ data: { session: { access_token: "tok" } } });
  post.mockReset();
  createApiClient.mockClear();
});

describe("retryResumeExtraction", () => {
  it("posts to the extraction endpoint with the bearer token", async () => {
    post.mockResolvedValue({ data: { id: ID }, response: new Response(null, { status: 202 }) });
    await expect(retryResumeExtraction(ID)).resolves.toEqual({ ok: true });
    expect(createApiClient).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "tok" }));
    expect(post).toHaveBeenCalledWith("/v1/resumes/{resume_id}/extraction", { params: { path: { resume_id: ID } } });
  });

  it("is not ok without a session", async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: "x" } });
    await expect(retryResumeExtraction(ID)).resolves.toEqual({ ok: false });
    expect(post).not.toHaveBeenCalled();
  });

  it("a 409 (already running or ready) is not ok but flagged as a conflict so the UI can resume polling", async () => {
    post.mockResolvedValue({ error: { code: "resume.not_retryable" }, response: new Response(null, { status: 409 }) });
    await expect(retryResumeExtraction(ID)).resolves.toEqual({ ok: false, conflict: true });
  });

  it("other refusals (404) are plain failures, not conflicts", async () => {
    post.mockResolvedValue({ error: { code: "resume.not_found" }, response: new Response(null, { status: 404 }) });
    await expect(retryResumeExtraction(ID)).resolves.toEqual({ ok: false });
  });

  it("is not ok when the API is unreachable", async () => {
    post.mockRejectedValue(new Error("down"));
    await expect(retryResumeExtraction(ID)).resolves.toEqual({ ok: false });
  });

  it("rejects a malformed id without calling the API", async () => {
    await expect(retryResumeExtraction("nope")).resolves.toEqual({ ok: false });
    expect(post).not.toHaveBeenCalled();
  });
});
