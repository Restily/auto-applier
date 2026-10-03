import { Circle, CircleCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StepCardProps = {
  state: "incomplete" | "complete";
  title: string;
  body: string;
  doneLabel: string;
  action: { label: string; href: string };
};

/** MASTER-style step card: incomplete on --surface, complete muted on --surface-sunken (no celebration). */
export function StepCard({ state, title, body, doneLabel, action }: StepCardProps): React.JSX.Element {
  const complete = state === "complete";
  return (
    <Card className={cn("rounded-[var(--radius-md)] py-5 shadow-none", complete ? "bg-[color:var(--surface-sunken)]" : "bg-[color:var(--surface)]")}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {complete ? (
            <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[color:var(--success)]" />
          ) : (
            <Circle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-[length:var(--text-h3-size)] leading-6 font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{complete ? doneLabel : body}</p>
          </div>
        </div>
        <Button asChild variant={complete ? "outline" : "default"} className="w-full sm:w-auto">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
