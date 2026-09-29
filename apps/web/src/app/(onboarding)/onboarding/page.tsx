import { Checklist } from "@/components/onboarding/checklist";
import { WelcomeToast } from "@/components/onboarding/welcome-toast";
import { checklistView } from "@/lib/profile/completeness";
import { getProfile } from "@/lib/profile/queries";
import { fromDbRow } from "@/lib/profile/schema";
import { getShellData } from "@/lib/shell/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OnboardingPage({ searchParams }: { searchParams: SearchParams }): Promise<React.JSX.Element> {
  const [{ welcome }, { row, accountEmail }, shell] = await Promise.all([searchParams, getProfile(), getShellData()]);
  // D5: the bonus toast needs both the redirect flag and a real signup_grant row.
  const showCredits = welcome === "1" && shell.signupBonusGranted;
  // A missing row means "not started"; a saved-but-empty row is judged on its own fields.
  const view = checklistView(row ? fromDbRow(row, accountEmail) : null);
  return (
    <>
      {welcome !== undefined ? <WelcomeToast show={showCredits} /> : null}
      <Checklist view={view} />
    </>
  );
}
