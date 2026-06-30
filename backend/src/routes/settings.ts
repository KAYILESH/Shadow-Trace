import { Router, Response } from "express";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET: Fetch user settings / profile ──────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", req.userId!)
      .single();

    // Get the user record from Supabase auth to pull created_at / last_sign_in
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(req.userId!);

    return res.json({
      email:        user?.email,
      created_at:   user?.created_at,
      last_sign_in: user?.last_sign_in_at,
      profile:      profile || {},
    });
  } catch (err: unknown) {
    console.error("Settings GET error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PATCH: Update user profile settings ─────────────────────────────────────
router.patch("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      full_name,
      avatar_config,
      bio,
      notify_scan_complete,
      notify_breach_alert,
      notify_weekly_digest,
      profile_public,
    } = req.body;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id:                   req.userId!,
      email:                req.userEmail,
      full_name:            full_name            ?? null,
      avatar_config:        avatar_config        ?? null,
      bio:                  bio                  ?? null,
      notify_scan_complete: notify_scan_complete ?? true,
      notify_breach_alert:  notify_breach_alert  ?? true,
      notify_weekly_digest: notify_weekly_digest ?? false,
      profile_public:       profile_public       ?? false,
      updated_at:           new Date().toISOString(),
    }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile update error:", profileError.message);
      return res.status(500).json({ error: profileError.message });
    }

    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Settings PATCH error:", message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
