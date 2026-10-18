import { getSessionUser } from "@/server/auth";
import { getSettings } from "@/server/services/settings";
import { SettingsManager } from "@/components/features/settings-manager";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  const settings = await getSettings(user.id);

  return <SettingsManager initialSettings={settings} userEmail={user.email} />;
}
