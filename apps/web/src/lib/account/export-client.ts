"use client";

function filenameFrom(disposition: string | null): string {
  const match = disposition ? /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition) : null;
  if (match?.[1]) return decodeURIComponent(match[1]);
  return `autoapplier-export-${new Date().toISOString().slice(0, 10)}.json`;
}

/** Fetches the export through the same-origin route and hands the bytes to the browser as a file download. */
export async function downloadExport(fetchImpl: typeof fetch = fetch): Promise<"started" | "error"> {
  try {
    const res = await fetchImpl("/api/account/export");
    if (res.status !== 200) return "error";
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filenameFrom(res.headers.get("content-disposition"));
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return "started";
  } catch {
    return "error";
  }
}
