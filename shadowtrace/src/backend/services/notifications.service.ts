/**
 * backend/services/notifications.service.ts
 * Notification CRUD operations against Supabase.
 * Called by: src/app/api/notifications/route.ts
 */
import { createClient } from "@/backend/db/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "scan_completed"
  | "risk_increased"
  | "cleanup_reminder"
  | "deletion_reminder"
  | "info"
  | "warning"
  | "success";

export interface CreateNotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// ── Fetch notifications ────────────────────────────────────────────────────────
export async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
  unreadOnly = false
) {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const unreadCount = (data || []).filter((n: any) => !n.is_read).length;
  return { notifications: data || [], unreadCount };
}

// ── Create notification ────────────────────────────────────────────────────────
export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  payload: CreateNotificationPayload
) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({ user_id: userId, ...payload, is_read: false })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ── Mark notifications as read ─────────────────────────────────────────────────
export async function markNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
  ids?: string[],
  markAll = false
) {
  const readAt = new Date().toISOString();

  if (markAll) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: readAt })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return { markedAll: true };
  }

  if (!ids?.length) throw new Error("ids array required");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: readAt })
    .eq("user_id", userId)
    .in("id", ids);
  if (error) throw new Error(error.message);
  return { markedIds: ids };
}

// ── Delete notifications ───────────────────────────────────────────────────────
export async function deleteNotifications(
  supabase: SupabaseClient,
  userId: string,
  id?: string,
  deleteAll = false
) {
  if (deleteAll) {
    await supabase.from("notifications").delete().eq("user_id", userId);
    return { deletedAll: true };
  }
  if (!id) throw new Error("id or deleteAll required");
  await supabase.from("notifications").delete().eq("user_id", userId).eq("id", id);
  return { deletedId: id };
}
