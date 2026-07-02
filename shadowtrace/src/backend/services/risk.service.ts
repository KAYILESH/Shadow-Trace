/**
 * backend/services/risk.service.ts
 * Risk score persistence operations.
 * Called by: src/app/api/risk/route.ts
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SaveRiskScorePayload {
  score: number;
  riskLevel: string;
  factors?: Record<string, unknown>;
}

// ── Save risk score to DB ─────────────────────────────────────────────────────
export async function saveRiskScore(
  supabase: SupabaseClient,
  userId: string,
  payload: SaveRiskScorePayload
) {
  const { data, error } = await supabase
    .from("risk_scores")
    .insert({
      user_id: userId,
      score: payload.score,
      risk_level: payload.riskLevel,
      factors: payload.factors || {},
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ── Fetch latest risk score ───────────────────────────────────────────────────
export async function getLatestRiskScore(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("risk_scores")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}
