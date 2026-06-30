import { Router, Response } from "express";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET /api/search?q=... ────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query["q"] as string)?.trim() ?? "";

    if (!q || q.length < 2) {
      return res.json({ scans: [], notifications: [] });
    }

    const term = `%${q}%`;

    const { data: scans } = await supabaseAdmin
      .from("scans")
      .select("id, target_username, platforms_found, total_platforms, created_at")
      .eq("user_id", req.userId!)
      .ilike("target_username", term)
      .order("created_at", { ascending: false })
      .limit(6);

    const { data: notifications } = await supabaseAdmin
      .from("notifications")
      .select("id, type, title, message, is_read, created_at")
      .eq("user_id", req.userId!)
      .or(`title.ilike.${term},message.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(6);

    return res.json({ scans: scans ?? [], notifications: notifications ?? [], query: q });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Search error:", message);
    return res.json({ scans: [], notifications: [] });
  }
});

export default router;
