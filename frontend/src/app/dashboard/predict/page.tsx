import { redirect } from "next/navigation";
import { createClient } from "@/backend/db/server";
import PredictContent from "./PredictContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ScanRadar — AI Domain Predict",
  description: "AI-powered prediction of whether a newly created domain is likely to become a phishing website.",
};

export default async function PredictPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <PredictContent user={user} />;
}
