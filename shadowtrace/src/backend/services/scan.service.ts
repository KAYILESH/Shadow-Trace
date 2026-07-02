/**
 * backend/services/scan.service.ts
 * Username scan business logic & Supabase persistence.
 * Called by: src/app/api/scan/route.ts
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const PLATFORMS = [
  { name: "GitHub",    url: (u: string) => `https://github.com/${u}` },
  { name: "Reddit",   url: (u: string) => `https://www.reddit.com/user/${u}` },
  { name: "Pinterest",url: (u: string) => `https://www.pinterest.com/${u}/` },
  { name: "Instagram",url: (u: string) => `https://www.instagram.com/${u}/` },
  { name: "Twitter",  url: (u: string) => `https://twitter.com/${u}` },
] as const;

export interface ScanResult {
  platform: string;
  url: string;
  found: boolean;
  status: "found" | "not_found" | "error";
}

// ── Persist a completed scan ──────────────────────────────────────────────────
export async function saveScanResult(
  supabase: SupabaseClient,
  userId: string,
  username: string,
  results: ScanResult[]
) {
  const foundCount = results.filter((r) => r.found).length;

  const { data, error } = await supabase
    .from("scan_results")
    .insert({
      user_id: userId,
      username,
      platforms_found: foundCount,
      total_platforms: results.length,
      results: results,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ── Fetch scan history ────────────────────────────────────────────────────────
export async function getScanHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from("scan_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}
