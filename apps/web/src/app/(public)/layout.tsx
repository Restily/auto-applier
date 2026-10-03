import { FocusShell } from "@/components/shell/focus-shell";

export default function PublicLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <FocusShell>{children}</FocusShell>;
}
