import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadExport } from "./export-client";

const createObjectURL = vi.fn(() => "blob:x");
const revokeObjectURL = vi.fn();
let clicked: { download: string; href: string }[] = [];

beforeEach(() => {
  clicked = [];
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ download: this.download, href: this.href });
  });
});
afterEach(() => vi.restoreAllMocks());

describe("downloadExport", () => {
  it("returns started and triggers a download with the header filename", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("{}", { status: 200, headers: { "content-disposition": 'attachment; filename="autoapplier-export-2026-09-29.json"' } }),
    );
    expect(await downloadExport(fetchImpl as unknown as typeof fetch)).toBe("started");
    expect(fetchImpl).toHaveBeenCalledWith("/api/account/export");
    expect(clicked).toEqual([{ download: "autoapplier-export-2026-09-29.json", href: "blob:x" }]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:x");
  });

  it("falls back to a dated filename without the header", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await downloadExport(fetchImpl as unknown as typeof fetch)).toBe("started");
    expect(clicked[0]!.download).toMatch(/^autoapplier-export-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("returns error on non-200", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 502 }));
    expect(await downloadExport(fetchImpl as unknown as typeof fetch)).toBe("error");
    expect(clicked).toEqual([]);
  });

  it("returns error when fetch throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await downloadExport(fetchImpl as unknown as typeof fetch)).toBe("error");
  });
});
