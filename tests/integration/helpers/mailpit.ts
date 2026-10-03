import { localEnv } from "./local-env";

export type MailpitEmail = { id: string; subject: string; html: string; text: string };

/** Polls Mailpit (no fixed sleeps beyond the poll interval) for a message to `to`. */
export async function waitForEmail(
  to: string,
  opts: { timeoutMs?: number; subjectIncludes?: string } = {},
): Promise<MailpitEmail> {
  const base = localEnv().mailpitUrl;
  const deadline = Date.now() + (opts.timeoutMs ?? 15_000);
  const query = encodeURIComponent(`to:"${to}"`);
  let lastError = "no message yet";
  while (Date.now() < deadline) {
    const res = await fetch(`${base}/api/v1/search?query=${query}`);
    if (res.ok) {
      const body = (await res.json()) as { messages?: Array<{ ID: string; Subject: string }> };
      const hit = (body.messages ?? []).find((m) => !opts.subjectIncludes || m.Subject.includes(opts.subjectIncludes));
      if (hit) {
        const full = await fetch(`${base}/api/v1/message/${hit.ID}`);
        if (!full.ok) throw new Error(`Mailpit message ${hit.ID}: HTTP ${full.status}`);
        const msg = (await full.json()) as { ID: string; Subject: string; HTML: string; Text: string };
        return { id: msg.ID, subject: msg.Subject, html: msg.HTML, text: msg.Text };
      }
    } else {
      lastError = `Mailpit HTTP ${res.status}`;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email to ${to} within timeout (${lastError})`);
}

/** First href in the HTML whose path starts with `pathPrefix`. */
export function extractLink(html: string, pathPrefix: string): URL {
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = m[1].replace(/&amp;/g, "&");
    try {
      const url = new URL(href);
      if (url.pathname.startsWith(pathPrefix)) return url;
    } catch {
      // relative or malformed hrefs are not candidates
    }
  }
  throw new Error(`No link with path prefix ${pathPrefix} in email`);
}
