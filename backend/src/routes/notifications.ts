import { Router, Response } from "express";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET: Fetch notifications ─────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const unreadOnly = req.query["unread"] === "true";
    const limit = parseInt((req.query["limit"] as string) || "50");

    let query = supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;

    if (error) {
      console.error("Notifications fetch error:", error.message);
      return res.json({ notifications: [], unreadCount: 0 });
    }

    const unreadCount = (data || []).filter((n) => !n.is_read).length;
    return res.json({ notifications: data || [], unreadCount });
  } catch (err) {
    console.error("Notifications GET error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST: Create a notification ─────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, message, metadata } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ error: "type, title, and message are required" });
    }

    const validTypes = ["scan_completed", "risk_increased", "cleanup_reminder", "deletion_reminder", "info", "warning", "success"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid notification type" });
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({ user_id: req.userId!, type, title, message, metadata: metadata || {}, is_read: false })
      .select()
      .single();

    if (error) {
      console.error("Notification insert error:", error.message);
      return res.status(500).json({ error: "Failed to create notification" });
    }

    return res.json({ success: true, notification: data });
  } catch (err) {
    console.error("Notifications POST error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PATCH: Mark notifications as read ───────────────────────────────────────
router.patch("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, markAllRead } = req.body;

    if (markAllRead) {
      await supabaseAdmin
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", req.userId!)
        .eq("is_read", false);
      return res.json({ success: true, markedAll: true });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array or markAllRead is required" });
    }

    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", req.userId!)
      .in("id", ids);

    return res.json({ success: true, markedIds: ids });
  } catch (err) {
    console.error("Notifications PATCH error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── DELETE: Delete notification(s) ──────────────────────────────────────────
router.delete("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id, deleteAll } = req.body;

    if (deleteAll) {
      await supabaseAdmin.from("notifications").delete().eq("user_id", req.userId!);
      return res.json({ success: true, deletedAll: true });
    }

    if (!id) return res.status(400).json({ error: "id or deleteAll required" });

    await supabaseAdmin.from("notifications").delete().eq("user_id", req.userId!).eq("id", id);
    return res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error("Notifications DELETE error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
