/**
 * backend/services/deletions.service.ts
 * Account deletion progress persistence.
 * Called by: src/app/api/deletions/route.ts
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Fetch all deletion progress for a user ────────────────────────────────────
export async function getDeletionProgress(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("account_deletions")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return data || [];
}

// ── Upsert a platform completion status ───────────────────────────────────────
export async function upsertDeletionStatus(
  supabase: SupabaseClient,
  userId: string,
  platform: string,
  completed: boolean
) {
  const { data, error } = await supabase
    .from("account_deletions")
    .upsert(
      {
        user_id: userId,
        platform,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
