import type { ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

/** The shared 440px auth card (S-001 §Layout): bordered from `md` up, borderless on the page background below. */
export function AuthCard({
  heading,
  headingRef,
  children,
  className,
}: {
  heading: string;
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn("mx-auto w-full max-w-[440px] md:rounded-md md:border md:bg-card md:p-8", className)}>
      <div className="flex flex-col gap-6">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-bold text-foreground outline-none"
        >
          {heading}
        </h1>
        {children}
      </div>
    </div>
  );
}
