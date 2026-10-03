import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SectionCard({ id, title, children }: { id: string; title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section>
      <Card className="gap-4 rounded-[var(--radius-md)] py-5 shadow-none">
        <CardHeader>
          <h2 id={`${id}-heading`} className="text-[length:var(--text-h3-size)] leading-6 font-semibold">
            {title}
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">{children}</CardContent>
      </Card>
    </section>
  );
}
