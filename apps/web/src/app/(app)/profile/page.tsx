import { ProfileResumeHost } from "@/components/resume/profile-resume-host";
import { getProfile } from "@/lib/profile/queries";
import { fromDbRow } from "@/lib/profile/schema";
import { getCurrentResume } from "@/lib/resume/queries";

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const [{ row, accountEmail }, resume] = await Promise.all([getProfile(), getCurrentResume()]);
  return <ProfileResumeHost saved={fromDbRow(row, accountEmail)} resume={resume} mode="app" />;
}
