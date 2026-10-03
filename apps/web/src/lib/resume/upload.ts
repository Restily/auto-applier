import type { components } from "@/lib/api/schema.gen";

import type { ResumeFileError } from "./validate";

export type UploadResult =
  | { ok: true; resume: components["schemas"]["ResumeOut"] }
  | { ok: false; error: ResumeFileError | "network" | "unknown" };

const KNOWN: readonly string[] = ["resume.unsupported_type", "resume.too_large", "resume.empty"];

function problemError(status: number, body: unknown): ResumeFileError | "unknown" {
  const code = body !== null && typeof body === "object" && "code" in body ? (body as { code: unknown }).code : null;
  if (typeof code === "string" && KNOWN.includes(code)) return code as ResumeFileError;
  if (status === 413) return "resume.too_large";
  return "unknown";
}

/** XHR (not fetch) because only XHR reports upload progress. */
export function uploadResume(
  file: File,
  opts: { onProgress?: (pct: number) => void; xhrFactory?: () => XMLHttpRequest } = {},
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = opts.xhrFactory ? opts.xhrFactory() : new XMLHttpRequest();
    xhr.open("POST", "/api/resume");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => resolve({ ok: false, error: "network" });
    xhr.ontimeout = () => resolve({ ok: false, error: "network" });
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body !== null) {
        resolve({ ok: true, resume: body as components["schemas"]["ResumeOut"] });
        return;
      }
      resolve({ ok: false, error: problemError(xhr.status, body) });
    };
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
