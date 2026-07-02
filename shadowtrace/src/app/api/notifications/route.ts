import { NextResponse } from "next/server";
import { createClient } from "@/backend/db/server";

// ─── GET: Fetch notifications for current user ────────────────────────────────
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50");

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;

    if (error) {
      console.error("Notifications fetch error:", error.message);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const unreadCount = (data || []).filter((n: any) => !n.is_read).length;
    return NextResponse.json({ notifications: data || [], unreadCount });
  } catch (err) {
    console.error("Notifications GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ─── POST: Create a new notification ─────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { type, title, message, metadata } = body;

    if (!type || !title || !message) {
      return NextResponse.json({ error: "type, title, and message are required" }, { status: 400 });
    }

    const validTypes = ["scan_completed", "risk_increased", "cleanup_reminder", "deletion_reminder", "info", "warning", "success"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({ user_id: user.id, type, title, message, metadata: metadata || {}, is_read: false })
      .select()
      .single();

    if (error) {
      console.error("Notification insert error:", error.message);
      return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }

    return NextResponse.json({ success: true, notification: data });
  } catch (err) {
    console.error("Notifications POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ─── PATCH: Mark notifications as read ───────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { ids, markAllRead } = body;

    if (markAllRead) {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);
      return NextResponse.json({ success: true, markedAll: true });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array or markAllRead is required" }, { status: 400 });
    }

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .in("id", ids);

    return NextResponse.json({ success: true, markedIds: ids });
  } catch (err) {
    console.error("Notifications PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ─── DELETE: Delete a notification ───────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, deleteAll } = body;

    if (deleteAll) {
      await supabase.from("notifications").delete().eq("user_id", user.id);
      return NextResponse.json({ success: true, deletedAll: true });
    }

    if (!id) return NextResponse.json({ error: "id or deleteAll required" }, { status: 400 });

    await supabase.from("notifications").delete().eq("user_id", user.id).eq("id", id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    console.error("Notifications DELETE error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
