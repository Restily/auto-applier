import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getShellData } from "@/lib/shell/data";

export default async function AppLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  await requireUser();
  return <AppShell data={await getShellData()}>{children}</AppShell>;
}
