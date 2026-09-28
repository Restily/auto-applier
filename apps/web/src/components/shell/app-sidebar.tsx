"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, Settings2, UserRound, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { href: string; icon: LucideIcon; key: "shell.nav.profile" | "shell.nav.settings" };

/** Data-driven (MASTER §8): an item exists only once its destination is built. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/profile", icon: UserRound, key: "shell.nav.profile" },
  { href: "/settings", icon: Settings2, key: "shell.nav.settings" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ iconOnly = false, wrap = false }: { iconOnly?: boolean; wrap?: boolean }): React.JSX.Element {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
        const active = isActive(pathname, href);
        const link = (
          <Link
            href={href}
            aria-current={active ? "page" : undefined}
            title={iconOnly ? t(key) : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md border-l-2 border-transparent px-3 text-[length:var(--text-ui-size)] font-medium text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
              active && "border-primary bg-[color:var(--primary-subtle)] text-primary",
              iconOnly && "justify-center px-0",
            )}
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span className={cn(iconOnly && "sr-only")}>{t(key)}</span>
          </Link>
        );
        return <li key={href}>{wrap ? <SheetClose asChild>{link}</SheetClose> : link}</li>;
      })}
    </ul>
  );
}

const WIDE_QUERY = "(min-width: 1280px)";

function subscribeWide(callback: () => void): () => void {
  const mql = window.matchMedia(WIDE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/** Desktop / tablet sidebar: 248px expanded, 72px icon rail; the rail is the default below 1280px. */
export function AppSidebar(): React.JSX.Element {
  const t = useTranslations("shell.nav");
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
  const [override, setOverride] = useState<boolean | null>(null);
  const expanded = override ?? wide;

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col gap-2 border-r border-border bg-card p-2 md:col-start-1 md:row-span-2 md:row-start-1 md:flex",
        expanded ? "w-[var(--shell-sidebar-width)]" : "w-[var(--shell-sidebar-rail-width)]",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={expanded}
        aria-label={expanded ? t("collapse") : t("expand")}
        onClick={() => setOverride(!expanded)}
        className={expanded ? "self-end" : "self-center"}
      >
        {expanded ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
      </Button>
      <nav aria-label={t("label")}>
        <NavList iconOnly={!expanded} />
      </nav>
    </aside>
  );
}

/** Below 768px: the ☰ button opens the same navigation as a left Sheet (no bottom tab bar with < 3 destinations). */
export function MobileNav(): React.JSX.Element {
  const t = useTranslations("shell.nav");
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={t("open")} className="md:hidden">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[var(--shell-sidebar-width)] p-2">
        <SheetTitle className="sr-only">{t("title")}</SheetTitle>
        <nav aria-label={t("label")} className="mt-10">
          <NavList wrap />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
