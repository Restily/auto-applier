"use client";

import { LogOut, Settings2, UserRoundCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRef } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/sign-out";
import type { ShellData } from "@/lib/shell/data";

const ITEM_CLASS = "min-h-11 cursor-pointer gap-2";

export function AccountMenu({ data }: { data: Pick<ShellData, "email" | "initials" | "onboardingComplete"> }): React.JSX.Element {
  const t = useTranslations("shell.account");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={t("menu")} className="rounded-full">
          <Avatar>
            <AvatarFallback>{data.initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{data.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className={ITEM_CLASS}>
          <Link href="/settings">
            <Settings2 aria-hidden="true" />
            {t("settings")}
          </Link>
        </DropdownMenuItem>
        {data.onboardingComplete ? null : (
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href="/onboarding">
              <UserRoundCheck aria-hidden="true" />
              {t("completeProfile")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form ref={formRef} action={signOutAction}>
          <DropdownMenuItem
            className={ITEM_CLASS}
            onSelect={(event) => {
              // Keep the menu mounted until the form has actually been submitted.
              event.preventDefault();
              formRef.current?.requestSubmit();
            }}
          >
            <LogOut aria-hidden="true" />
            {t("signOut")}
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
