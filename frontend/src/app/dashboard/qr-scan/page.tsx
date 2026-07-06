import { redirect } from "next/navigation";
import { createClient } from "@/backend/db/server";
import QrScanContent from "./QrScanContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ScanRadar — QR Code Scam Scanner",
  description:
    "Scan any QR code to detect phishing URLs, redirect chains, and hidden scam destinations before they compromise your security.",
};

export default async function QrScanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <QrScanContent user={user} />;
}
