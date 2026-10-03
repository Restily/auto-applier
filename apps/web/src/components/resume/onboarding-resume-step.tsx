"use client";

import { useRouter } from "next/navigation";

import type { ResumeState } from "@/lib/resume/status";

import { ResumeFlow } from "./resume-flow";

/** S-003 3a-3c on the onboarding step: a ready resume moves on to the profile editor, where it is applied. */
export function OnboardingResumeStep({ initial }: { initial: ResumeState | null }): React.JSX.Element {
  const router = useRouter();
  return (
    <div className="mx-auto w-full max-w-[640px]">
      <ResumeFlow initial={initial} manualHref="/onboarding/profile" showManualLink onReady={() => router.push("/onboarding/profile")} />
    </div>
  );
}
