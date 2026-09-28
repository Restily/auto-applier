import { FocusShell } from "@/components/shell/focus-shell";
import { requireUser } from "@/lib/auth/session";
import { getShellData } from "@/lib/shell/data";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  await requireUser();
  return <FocusShell data={await getShellData()}>{children}</FocusShell>;
}
