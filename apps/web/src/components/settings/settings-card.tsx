import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** One independent Settings card: an h2 title and a body (S-005). */
export function SettingsCard({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-[length:var(--text-h3-size)] leading-[var(--text-h3-line)] font-semibold">{title}</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}
