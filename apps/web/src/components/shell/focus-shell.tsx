import type { ReactNode } from "react";

import type { ShellData } from "@/lib/shell/data";

import { SiteHeader } from "./site-header";
import { SkipLink } from "./skip-link";

/** MASTER §8.2: no sidebar, no bottom tabs; pre-auth (no `data`) shows only the logo and the language switcher. */
export function FocusShell({ data, children }: { data?: ShellData; children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SkipLink />
      <SiteHeader data={data} />
      <main id="main" tabIndex={-1} className="flex-1 px-4 py-8 outline-none md:px-6">
        {children}
      </main>
    </div>
  );
}
