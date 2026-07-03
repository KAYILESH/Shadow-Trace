import { redirect } from "next/navigation";
import { createClient } from "@/backend/db/server";
import RiskContent from "./RiskContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ScanRadar — Risk Score",
  description: "Automatically calculated privacy risk score based on your real scan data.",
};

export default async function RiskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <RiskContent user={user} />;
}
