import { CheckCircle2, CircleOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemHealthView } from "@/lib/health";

export function HealthStatus({ view }: { view: SystemHealthView }): React.JSX.Element {
  const t = useTranslations("health");
  const overallVariant = view.overall === "operational" ? "default" : "destructive";

  return (
    <div className="mx-auto max-w-[var(--shell-content-max-width)] px-[var(--shell-gutter-mobile)] py-[var(--space-8)]">
      <h1 className="text-[length:var(--text-h1-size)] font-bold leading-[var(--text-h1-line)] text-foreground">
        {t("title")}
      </h1>

      <Card className="mt-[var(--space-6)]">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-[var(--space-2)]">
            <span>{t("overall")}</span>
            <Badge data-testid="health-overall" variant={overallVariant}>
              {t(`overallState.${view.overall}`)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-[var(--space-4)]">
          <ul aria-label={t("checks")} className="flex flex-col gap-[var(--space-3)]">
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
                    {t(`check.${check.key}`)}
                  </span>
                  <span
                    className={
                      check.state === "ok"
                        ? "text-[length:var(--text-small-size)] font-medium text-[color:var(--success)]"
                        : "text-[length:var(--text-small-size)] font-medium text-destructive"
                    }
                  >
                    {t(`state.${check.state}`)}
                  </span>
                </div>
                {check.unreachable || check.detail ? (
                  <span className="text-[length:var(--text-small-size)] text-muted-foreground">
                    {check.unreachable ? t("apiUnreachable") : check.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {view.version ? (
            <p className="text-[length:var(--text-small-size)] text-muted-foreground">
              {t("version", { version: view.version })}
            </p>
          ) : null}

          <p className="text-[length:var(--text-tiny-size)] text-[color:var(--subtle-foreground)]">
            {t.rich("checkedAt", { time: () => <time dateTime={view.checkedAt}>{view.checkedAt}</time> })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
