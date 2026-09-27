import { CheckCircle2, CircleOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemHealthView } from "@/lib/health";

const OVERALL_LABEL: Record<SystemHealthView["overall"], string> = {
  operational: "Operational",
  degraded: "Degraded",
  unavailable: "Unavailable",
};

// Status is conveyed by text ("OK" / "Down") in addition to color, per
// MASTER.md — icon and color alone never carry the state.
const CHECK_STATE_LABEL: Record<"ok" | "down", string> = {
  ok: "OK",
  down: "Down",
};

export function HealthStatus({ view }: { view: SystemHealthView }): React.JSX.Element {
  const overallVariant = view.overall === "operational" ? "default" : "destructive";

  return (
    <div className="mx-auto max-w-[var(--shell-content-max-width)] px-[var(--shell-gutter-mobile)] py-[var(--space-8)]">
      <h1 className="text-[length:var(--text-h1-size)] font-bold leading-[var(--text-h1-line)] text-foreground">
        System health
      </h1>

      <Card className="mt-[var(--space-6)]">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-[var(--space-2)]">
            <span>Overall status</span>
            <Badge data-testid="health-overall" variant={overallVariant}>
              {OVERALL_LABEL[view.overall]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-[var(--space-4)]">
          <ul aria-label="Checks" className="flex flex-col gap-[var(--space-3)]">
            {view.checks.map((check) => (
              <li
                key={check.key}
                data-testid={`health-check-${check.key}`}
                className="flex flex-col gap-[var(--space-1)] rounded-[var(--radius-md)] border border-border bg-card p-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-[var(--space-2)]">
                  {check.state === "ok" ? (
                    <CheckCircle2 aria-hidden="true" className="size-4 text-[color:var(--success)]" />
                  ) : (
                    <CircleOff aria-hidden="true" className="size-4 text-destructive" />
                  )}
                  <span className="text-[length:var(--text-ui-size)] font-medium text-foreground">
                    {check.label}
                  </span>
                  <span
                    className={
                      check.state === "ok"
                        ? "text-[length:var(--text-small-size)] font-medium text-[color:var(--success)]"
                        : "text-[length:var(--text-small-size)] font-medium text-destructive"
                    }
                  >
                    {CHECK_STATE_LABEL[check.state]}
                  </span>
                </div>
                {check.detail ? (
                  <span className="text-[length:var(--text-small-size)] text-muted-foreground">
                    {check.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {view.version ? (
            <p className="text-[length:var(--text-small-size)] text-muted-foreground">
              Version {view.version}
            </p>
          ) : null}

          <p className="text-[length:var(--text-tiny-size)] text-[color:var(--subtle-foreground)]">
            Checked at <time dateTime={view.checkedAt}>{view.checkedAt}</time>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
