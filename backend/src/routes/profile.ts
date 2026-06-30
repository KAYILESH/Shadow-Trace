import { Router, Response } from "express";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET: Fetch user profile ──────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", req.userId!)
      .single();

    return res.json({
      profile: profile ?? {
        id:        req.userId,
        email:     req.userEmail,
        full_name: req.userMetadata?.full_name ?? req.userEmail?.split("@")[0],
        plan:      "free",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Profile GET error:", message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST: Upsert user profile ────────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const fullName =
      (req.userMetadata?.full_name as string) ||
      (req.userMetadata?.name as string) ||
      req.userEmail?.split("@")[0] ||
      "User";

    const { error } = await supabaseAdmin.from("profiles").upsert({
      id:            req.userId!,
      email:         req.userEmail,
      full_name:     fullName,
      avatar_url:    (req.userMetadata?.avatar_url as string) ?? null,
      last_login_at: new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    }, { onConflict: "id" });

    if (error) console.error("Profile upsert error:", error.message);

    return res.json({ success: true, userId: req.userId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Profile POST error:", message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
