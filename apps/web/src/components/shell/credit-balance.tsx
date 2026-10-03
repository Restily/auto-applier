"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { creditsView } from "@/lib/credits";
import { cn } from "@/lib/utils";

export function CreditBalance({ balance }: { balance: number | null }): React.JSX.Element {
  const t = useTranslations("shell.credits");
  const { count, tone } = creditsView(balance);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "gap-2 tabular-nums text-[color:var(--credit)]",
            tone === "empty" &&
              "border-[color:var(--warning)] bg-[color:var(--warning-subtle)] text-[color:var(--warning)]",
          )}
        >
          {tone === "empty" ? <TriangleAlert aria-hidden="true" className="size-4" /> : null}
          <span>{t("count", { count })}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>{t("balance")}</PopoverTitle>
          <PopoverDescription>{t(tone)}</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
