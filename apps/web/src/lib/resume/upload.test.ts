import { describe, expect, it, vi } from "vitest";

import { uploadResume } from "./upload";

class FakeXhr {
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 0;
  responseText = "";
  method = "";
  url = "";
  body: unknown = null;
  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }
  send(body: unknown): void {
    this.body = body;
  }
  finish(status: number, json: unknown): void {
    this.status = status;
    this.responseText = JSON.stringify(json);
    this.onload?.();
  }
}

const file = (): File => new File(["%PDF"], "cv.pdf", { type: "application/pdf" });
const RESUME = { id: "11111111-1111-4111-8111-111111111111", file_name: "cv.pdf", status: "processing", error_code: null, mime_type: "application/pdf", size_bytes: 4, created_at: "2026-09-29T00:00:00Z" };

function setup(): { xhr: FakeXhr; factory: () => XMLHttpRequest } {
  const xhr = new FakeXhr();
  return { xhr, factory: () => xhr as unknown as XMLHttpRequest };
}

describe("uploadResume", () => {
  it("posts FormData with field file to /api/resume and reports progress", async () => {
    const { xhr, factory } = setup();
    const onProgress = vi.fn();
    const p = uploadResume(file(), { onProgress, xhrFactory: factory });
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("/api/resume");
    expect((xhr.body as FormData).get("file")).toBeInstanceOf(File);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
    xhr.finish(202, RESUME);
    await p;
    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([25, 100]);
  });

  it("202 -> ok with the resume", async () => {
    const { xhr, factory } = setup();
    const p = uploadResume(file(), { xhrFactory: factory });
    xhr.finish(202, RESUME);
    await expect(p).resolves.toEqual({ ok: true, resume: RESUME });
  });

  it("413 -> too_large", async () => {
    const { xhr, factory } = setup();
    const p = uploadResume(file(), { xhrFactory: factory });
    xhr.finish(413, { code: "resume.too_large" });
    await expect(p).resolves.toEqual({ ok: false, error: "resume.too_large" });
  });

  it("413 from the API size guard without a resume code is still too_large", async () => {
    const { xhr, factory } = setup();
    const p = uploadResume(file(), { xhrFactory: factory });
    xhr.finish(413, { code: "request.too_large" });
    await expect(p).resolves.toEqual({ ok: false, error: "resume.too_large" });
  });

  it("422 unsupported -> unsupported_type", async () => {
    const { xhr, factory } = setup();
    const p = uploadResume(file(), { xhrFactory: factory });
    xhr.finish(422, { code: "resume.unsupported_type" });
    await expect(p).resolves.toEqual({ ok: false, error: "resume.unsupported_type" });
  });

  it("422 empty -> empty", async () => {
    const { xhr, factory } = setup();
    const p = uploadResume(file(), { xhrFactory: factory });
    xhr.finish(422, { code: "resume.empty" });
    await expect(p).resolves.toEqual({ ok: false, error: "resume.empty" });
  });

  it("network error -> network", async () => {
    const { xhr, factory } = setup();
    const p = uploadResume(file(), { xhrFactory: factory });
    xhr.onerror?.();
    await expect(p).resolves.toEqual({ ok: false, error: "network" });
  });

  it("an unknown failure -> unknown", async () => {
    const { xhr, factory } = setup();
    const p = uploadResume(file(), { xhrFactory: factory });
    xhr.finish(500, { code: "boom" });
    await expect(p).resolves.toEqual({ ok: false, error: "unknown" });
  });
});
