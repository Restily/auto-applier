import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[var(--shell-content-max-width)] px-[var(--shell-gutter-mobile)] py-[var(--space-8)]">
      <h1 className="text-[length:var(--text-h1-size)] font-bold leading-[var(--text-h1-line)] text-foreground">
        AutoApplier
      </h1>
      {/* h-11 (44px) overrides the default h-9: MASTER.md §a11y requires a
          44x44px minimum touch target (WCAG 2.2 SC 2.5.8). */}
      <Button asChild className="mt-[var(--space-4)] h-11">
        <Link href="/health">View system health</Link>
      </Button>
    </div>
  );
}
