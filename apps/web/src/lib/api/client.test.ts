// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/lib/api/client";

describe("createApiClient", () => {
  it("aborts requests that exceed the default timeout", async () => {
    const neverResolvingFetch = vi.fn<typeof fetch>((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const client = createApiClient({
      fetch: neverResolvingFetch,
      baseUrl: "http://127.0.0.1:8000",
      timeoutMs: 10,
    });

    await expect(client.GET("/health")).rejects.toThrow();

    expect(neverResolvingFetch).toHaveBeenCalled();
    const [, init] = neverResolvingFetch.mock.calls[0];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("still issues a request when nothing hangs", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async (input, init) => {
      expect(input).toBeInstanceOf(Request);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Response(null, { status: 200 });
    });

    const client = createApiClient({ fetch: fetchSpy, baseUrl: "http://127.0.0.1:8000" });

    await client.GET("/health");

    expect(fetchSpy).toHaveBeenCalled();
  });
});
