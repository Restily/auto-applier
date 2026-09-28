import { expect, type Page } from "@playwright/test";

const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;

/** No visible text node that looks like a translation key such as "auth.signIn.title". */
export async function expectNoRawKeys(page: Page): Promise<void> {
  const texts = await page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const t = (n.textContent ?? "").trim();
      if (t) out.push(t);
    }
    return out;
  });
  expect(texts.filter((t) => RAW_KEY.test(t)), "raw i18n keys visible").toEqual([]);
}

/** Start collecting next-intl MISSING_MESSAGE console output; call the returned fn to read it. */
export function collectMissingMessageErrors(page: Page): () => string[] {
  const found: string[] = [];
  page.on("console", (m) => {
    if (m.text().includes("MISSING_MESSAGE")) found.push(m.text());
  });
  return () => [...found];
}
