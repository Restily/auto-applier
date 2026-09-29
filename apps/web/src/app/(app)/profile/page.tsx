import { ProfileEditor } from "@/components/profile/profile-editor";
import { getProfile } from "@/lib/profile/queries";
import { fromDbRow } from "@/lib/profile/schema";

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const { row, accountEmail } = await getProfile();
  return <ProfileEditor initial={fromDbRow(row, accountEmail)} mode="app" />;
}
