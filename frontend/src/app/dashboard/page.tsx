import { redirect } from "next/navigation";
import { createClient } from "@/backend/db/server";
import DashboardContent from "./DashboardContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ScanRadar — Dashboard",
  description: "Your digital footprint security dashboard.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ── Fetch real stats from Supabase ──────────────────────────────────────────

  // All scans for this user
  const { data: scans } = await supabase
    .from("scans")
    .select("results, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Latest risk score
  const { data: latestRisk } = await supabase
    .from("risk_scores")
    .select("score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Compute stats from real data
  const totalScans = scans?.length ?? 0;
  const riskScore = latestRisk?.score ?? 0;

  // Count total FOUND profiles across all scans
  const totalProfilesFound = (scans ?? []).reduce((sum, scan) => {
    const found = (scan.results as any[]).filter((r: any) => r.status === "FOUND").length;
    return sum + found;
  }, 0);

  // Active threats = FOUND results in the most recent scan
  const latestScan = scans && scans.length > 0 ? scans[scans.length - 1] : null;
  const activeThreats = latestScan
    ? (latestScan.results as any[]).filter((r: any) => r.status === "FOUND").length
    : 0;

  return (
    <DashboardContent
      user={user}
      totalScans={totalScans}
      riskScore={riskScore}
      totalProfilesFound={totalProfilesFound}
      activeThreats={activeThreats}
      scans={scans ?? []}
    />
  );
}
