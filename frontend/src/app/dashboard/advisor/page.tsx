import { redirect } from "next/navigation";
import { createClient } from "@/backend/db/server";
import AdvisorContent from "./AdvisorContent";

export const metadata = {
  title: "AI Privacy Advisor | ScanRadar",
  description:
    "Get AI-powered privacy analysis, risk recommendations, and a personalized cleanup plan from ScanAI.",
};

export default async function AdvisorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AdvisorContent user={user} />;
}
