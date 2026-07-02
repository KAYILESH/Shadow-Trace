import { redirect } from "next/navigation";
import { createClient } from "@/backend/db/server";
import AnalyticsContent from "./AnalyticsContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ScanRadar — Analytics",
  description: "Deep dive into your data exposure analytics and risk trends.",
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch real data from Supabase
  const { data: scans } = await supabase
    .from("scans")
    .select("results, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const { data: riskScores } = await supabase
    .from("risk_scores")
    .select("score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <AnalyticsContent 
      user={user} 
      initialScans={scans || []} 
      initialRiskScores={riskScores || []} 
    />
  );
}
