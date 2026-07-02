import { redirect } from "next/navigation";
import { createClient } from "@/backend/db/server";
import NotificationsContent from "./NotificationsContent";

export const metadata = {
  title: "Notification Center | ScanRadar",
  description: "View all your privacy alerts, scan results, and cleanup reminders in one place.",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <NotificationsContent user={user} />;
}
