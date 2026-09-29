import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { extractionPhase, pollResume, type ResumeState } from "./status";

const state = (over: Partial<ResumeState>): ResumeState => ({ id: "r1", fileName: "cv.pdf", status: "processing", errorCode: null, extracted: null, ...over });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("pollResume", () => {
  it("resolves ready once the row is ready", async () => {
    const read = vi.fn().mockResolvedValueOnce(state({})).mockResolvedValueOnce(state({ status: "ready", extracted: { full_name: "A" } }));
    const p = pollResume("r1", { read });
    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toMatchObject({ status: "ready", extracted: { full_name: "A" } });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("resolves failed with the errorCode (AC3)", async () => {
    const read = vi.fn().mockResolvedValue(state({ status: "failed", errorCode: "unreadable" }));
    await expect(pollResume("r1", { read })).resolves.toMatchObject({ status: "failed", errorCode: "unreadable" });
  });

  it("times out after 90 s", async () => {
    const read = vi.fn().mockResolvedValue(state({}));
    const p = pollResume("r1", { read });
    await vi.advanceTimersByTimeAsync(91_000);
    await expect(p).resolves.toEqual({ status: "timeout" });
    const calls = read.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(read.mock.calls.length).toBe(calls);
  });

  it("keeps polling through a transient read error", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("net")).mockResolvedValueOnce(state({ status: "ready" }));
    const p = pollResume("r1", { read });
    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toMatchObject({ status: "ready" });
  });

  it("stops when aborted", async () => {
    const read = vi.fn().mockResolvedValue(state({}));
    const ctl = new AbortController();
    const p = pollResume("r1", { read, signal: ctl.signal });
    const assertion = expect(p).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(2000);
    ctl.abort();
    await assertion;
    const calls = read.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(read.mock.calls.length).toBe(calls);
  });
});

describe("extractionPhase", () => {
  it("phases switch at 20 s and 40 s", () => {
    expect(extractionPhase(0)).toBe(0);
    expect(extractionPhase(19_999)).toBe(0);
    expect(extractionPhase(20_000)).toBe(1);
    expect(extractionPhase(39_999)).toBe(1);
    expect(extractionPhase(40_000)).toBe(2);
    expect(extractionPhase(89_000)).toBe(2);
  });
});
