import { StepDots } from "@/components/onboarding/step-dots";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { getProfile } from "@/lib/profile/queries";
import { fromDbRow } from "@/lib/profile/schema";

export default async function OnboardingProfilePage(): Promise<React.JSX.Element> {
  const { row, accountEmail } = await getProfile();
  return (
    <>
      <StepDots current="profile" />
      <ProfileEditor initial={fromDbRow(row, accountEmail)} mode="onboarding" />
    </>
  );
}
