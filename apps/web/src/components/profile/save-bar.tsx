"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import { UnsavedIndicator } from "./unsaved-indicator";

/** Sticky footer: pinned to the bottom of the viewport on every width so Save is always reachable. */
export function SaveBar({ dirty, saving }: { dirty: boolean; saving: boolean }): React.JSX.Element {
  const tc = useTranslations("common");
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-col items-stretch gap-2 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:flex-row sm:items-center sm:justify-end md:mx-0 md:px-0">
      <UnsavedIndicator dirty={dirty} />
      <Button type="submit" variant={dirty ? "default" : "outline"} disabled={saving} aria-busy={saving} className="min-w-40 sm:w-auto">
        {saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
        {tc("save")}
      </Button>
    </div>
  );
}
