export type ResumeState = {
  id: string;
  fileName: string;
  status: "processing" | "ready" | "failed";
  errorCode: "unreadable" | "ai_failed" | null;
  extracted: unknown | null;
};

export const POLL_INTERVAL_MS = 2000;
export const POLL_TIMEOUT_MS = 90_000;

function abortError(): Error {
  const e = new Error("aborted");
  e.name = "AbortError";
  return e;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Polls until the resume leaves `processing`. A read error is treated as transient; after `timeoutMs` it gives up. */
export async function pollResume(
  id: string,
  opts: { read: (id: string) => Promise<ResumeState>; intervalMs?: number; timeoutMs?: number; signal?: AbortSignal },
): Promise<ResumeState | { status: "timeout" }> {
  const interval = opts.intervalMs ?? POLL_INTERVAL_MS;
  const timeout = opts.timeoutMs ?? POLL_TIMEOUT_MS;
  const started = Date.now();
  for (;;) {
    if (opts.signal?.aborted) throw abortError();
    try {
      const state = await opts.read(id);
      if (state.status !== "processing") return state;
    } catch {
      // transient: try again on the next tick
    }
    if (Date.now() - started + interval > timeout) return { status: "timeout" };
    await sleep(interval, opts.signal);
  }
}

/** Which of the three spec status lines to show: <20 s, <40 s, then the last. */
export function extractionPhase(elapsedMs: number): 0 | 1 | 2 {
  if (elapsedMs < 20_000) return 0;
  if (elapsedMs < 40_000) return 1;
  return 2;
}
