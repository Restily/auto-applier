import Link from "next/link";

import { Button } from "@/components/ui/button";

/** "Already have an account? Sign in": a text prompt plus a 44px link-variant button. */
export function FooterLink({ prompt, label, href }: { prompt: string; label: string; href: string }): React.JSX.Element {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-1 text-center text-[length:var(--text-ui-size)] text-muted-foreground">
      <span>{prompt}</span>
      <Button asChild variant="link" className="px-1 text-[length:var(--text-ui-size)] font-medium">
        <Link href={href}>{label}</Link>
      </Button>
    </p>
  );
}
