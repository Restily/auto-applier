// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getClaims = vi.fn();
const post = vi.fn();
const createApiClient = vi.fn((opts: unknown) => {
  void opts;
  return { POST: post };
});

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getSession, getClaims } }) }));
vi.mock("@/lib/api/client", () => ({ createApiClient: (opts: unknown) => createApiClient(opts) }));

import { POST } from "./route";

const RESUME = { id: "11111111-1111-4111-8111-111111111111", file_name: "cv.pdf", status: "processing" };

function request(over: { contentLength?: string; file?: File } = {}): Request {
  const fd = new FormData();
  fd.append("file", over.file ?? new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" }));
  const req = new Request("http://localhost:3000/api/resume", { method: "POST", body: fd });
  if (over.contentLength) {
    return new Proxy(req, {
      get(target, prop) {
        if (prop === "headers") return new Headers({ "content-length": over.contentLength as string });
        const v = Reflect.get(target, prop, target) as unknown;
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
  }
  return req;
}

beforeEach(() => {
  getSession.mockReset();
  getClaims.mockReset();
  post.mockReset();
  createApiClient.mockClear();
  getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
  getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
});

describe("POST /api/resume", () => {
  it("401 without a session", async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: "no" } });
    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(post).not.toHaveBeenCalled();
  });

  it("oversized Content-Length -> 413 and the API is never called (AC2)", async () => {
    const res = await POST(request({ contentLength: String(5_242_880 + 65_536 + 1) }));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ code: "resume.too_large" });
    expect(post).not.toHaveBeenCalled();
    expect(createApiClient).not.toHaveBeenCalled();
  });

  it("a chunked body with no Content-Length is cut off at the cap while streaming: 413, the rest is never read (M1 review #9)", async () => {
    const CHUNK = 1_048_576;
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls > 200) return controller.close();
        controller.enqueue(new Uint8Array(CHUNK));
      },
    }, { highWaterMark: 0 });
    const req = new Request("http://localhost:3000/api/resume", {
      method: "POST",
      body,
      headers: { "content-type": "multipart/form-data; boundary=x" },
      duplex: "half",
    } as RequestInit);
    expect(req.headers.get("content-length")).toBeNull();
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ code: "resume.too_large" });
    expect(pulls).toBeLessThan(10); // 5 MiB + overhead is about 6 chunks; never the 200 offered
    expect(post).not.toHaveBeenCalled();
  });

  it("a Content-Length that understates the body does not let it through", async () => {
    const big = new File([new Uint8Array(5_242_880 + 65_536 + 10)], "cv.pdf", { type: "application/pdf" });
    const fd = new FormData();
    fd.append("file", big);
    const real = new Request("http://localhost:3000/api/resume", { method: "POST", body: fd });
    const headers = new Headers(real.headers);
    headers.set("content-length", "1000");
    const lying = new Request("http://localhost:3000/api/resume", { method: "POST", body: real.body, headers, duplex: "half" } as RequestInit);
    const res = await POST(lying);
    expect(res.status).toBe(413);
    expect(post).not.toHaveBeenCalled();
  });

  it("forwards the file and bearer token and returns the API status", async () => {
    post.mockResolvedValue({ data: RESUME, error: undefined, response: new Response(null, { status: 202 }) });
    const res = await POST(request());
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual(RESUME);
    expect(createApiClient).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "tok" }));
    const [path, init] = post.mock.calls[0] as [string, { body: { file: File }; bodySerializer: (b: { file: File }) => FormData }];
    expect(path).toBe("/v1/resumes");
    const sent = init.bodySerializer(init.body).get("file") as File;
    expect(sent.name).toBe("cv.pdf");
  });

  it("maps an API problem code through", async () => {
    post.mockResolvedValue({ data: undefined, error: { code: "resume.unsupported_type", title: "x", status: 422 }, response: new Response(null, { status: 422 }) });
    const res = await POST(request());
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "resume.unsupported_type" });
  });

  it("a request without a file part is a 422 resume.empty", async () => {
    const req = new Request("http://localhost:3000/api/resume", { method: "POST", body: new FormData() });
    const res = await POST(req);
    expect(res.status).toBe(422);
    expect(post).not.toHaveBeenCalled();
  });

  it("an unreachable API is a 502", async () => {
    post.mockRejectedValue(new Error("down"));
    const res = await POST(request());
    expect(res.status).toBe(502);
  });
});
