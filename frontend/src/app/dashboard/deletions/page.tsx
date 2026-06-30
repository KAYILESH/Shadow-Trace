import { redirect } from "next/navigation";
import { createClient } from "@/backend/db/server";
import DeletionContent from "./DeletionContent";

export const metadata = {
  title: "Account Deletion Center | ScanRadar",
  description:
    "Remove your old accounts across major platforms to protect your privacy and reduce your digital footprint.",
};

export default async function DeletionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <DeletionContent user={user} />;
}
