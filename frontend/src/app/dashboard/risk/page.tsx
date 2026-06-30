import { redirect } from "next/navigation";
import { createClient } from "@/backend/db/server";
import RiskContent from "./RiskContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ScanRadar — Risk Score",
  description: "Calculate and monitor your privacy risk score.",
};

export default async function RiskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the latest saved risk score for this user
  const { data: savedRisk } = await supabase
    .from("risk_scores")
    .select("score, risk_level, factors, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return <RiskContent user={user} savedRisk={savedRisk ?? null} />;
}
