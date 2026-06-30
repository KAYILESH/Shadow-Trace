import { Router, Response } from "express";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET: Fetch all deletion records ─────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("account_deletions")
      .select("*")
      .eq("user_id", req.userId!);

    if (error) {
      console.error("Supabase fetch error:", error.message);
      return res.json({ deletions: [] });
    }

    return res.json({ deletions: data || [] });
  } catch (error) {
    console.error("Deletions GET Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST: Upsert a platform deletion status ──────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { platform, completed } = req.body;

    if (!platform) {
      return res.status(400).json({ error: "Platform is required" });
    }

    const { data, error } = await supabaseAdmin
      .from("account_deletions")
      .upsert(
        {
          user_id:      req.userId!,
          platform,
          completed:    completed ?? false,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,platform" }
      )
      .select()
      .single();

    if (error) {
      console.error("Supabase upsert error:", error.message);
      return res.json({ success: true, saved: false, message: error.message });
    }

    if (completed) {
      await supabaseAdmin.from("notifications").insert({
        user_id: req.userId!, type: "deletion_reminder",
        title:   `✅ ${platform} Account Deletion Marked Complete`,
        message: `You've marked your ${platform} account deletion as complete. Great step toward reducing your digital footprint! Note that some platforms take up to 90 days to fully purge your data.`,
        metadata: { platform, completed: true },
        is_read: false,
      });
    }

    return res.json({ success: true, saved: true, deletion: data });
  } catch (error) {
    console.error("Deletions POST Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
