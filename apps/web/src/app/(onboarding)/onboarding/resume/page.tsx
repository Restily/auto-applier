import { StepDots } from "@/components/onboarding/step-dots";
import { OnboardingResumeStep } from "@/components/resume/onboarding-resume-step";
import { getCurrentResume } from "@/lib/resume/queries";

export default async function OnboardingResumePage(): Promise<React.JSX.Element> {
  const resume = await getCurrentResume();
  // A finished resume is offered again as a fresh upload; only an in-flight or failed one resumes its own state.
  return (
    <>
      <StepDots current="resume" />
      <OnboardingResumeStep initial={resume && resume.status !== "ready" ? resume : null} />
    </>
  );
}
