import { redirect } from "next/navigation";
import { createClient } from "@/backend/db/server";
import ScansContent from "./ScansContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ScanRadar — Scanner",
  description: "Scan the web for usernames to find exposed digital footprints.",
};

export default async function ScansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user's past scans
  const { data: pastScans } = await supabase
    .from("scans")
    .select("id, target_username, results, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return <ScansContent user={user} pastScans={pastScans ?? []} />;
}
