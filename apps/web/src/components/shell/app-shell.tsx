import type { ReactNode } from "react";

import type { ShellData } from "@/lib/shell/data";

import { AppSidebar, MobileNav } from "./app-sidebar";
import { SiteHeader } from "./site-header";
import { SkipLink } from "./skip-link";

/** MASTER §8.3. DOM order (skip link, header, sidebar, main) matches the focus order in §8.6; the grid places the sidebar on the left. */
export function AppShell({ data, children }: { data: ShellData; children: ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-[auto_1fr]">
      <SkipLink />
      <div className="md:col-start-2 md:row-start-1">
        <SiteHeader data={data} leading={<MobileNav />} logoMobileOnly />
      </div>
      <AppSidebar />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[var(--shell-content-max-width)] px-4 py-6 outline-none md:col-start-2 md:row-start-2 md:px-6 xl:px-8"
      >
        {children}
      </main>
    </div>
  );
}
