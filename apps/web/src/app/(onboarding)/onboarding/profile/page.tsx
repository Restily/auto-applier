import { StepDots } from "@/components/onboarding/step-dots";
import { ProfileResumeHost } from "@/components/resume/profile-resume-host";
import { getProfile } from "@/lib/profile/queries";
import { fromDbRow } from "@/lib/profile/schema";
import { getCurrentResume } from "@/lib/resume/queries";

export default async function OnboardingProfilePage(): Promise<React.JSX.Element> {
  const [{ row, accountEmail }, resume] = await Promise.all([getProfile(), getCurrentResume()]);
  return (
    <>
      <StepDots current="profile" />
      <ProfileResumeHost saved={fromDbRow(row, accountEmail)} resume={resume} mode="onboarding" />
    </>
  );
}
