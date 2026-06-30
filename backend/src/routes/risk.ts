import { Router, Response } from "express";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET: Fetch latest risk score ─────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("risk_scores")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return res.json({ riskScore: null });
    return res.json({ riskScore: data });
  } catch (error) {
    console.error("Risk GET Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST: Save a new risk score ──────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { score, riskLevel, factors } = req.body;

    if (score === undefined || !riskLevel) {
      return res.status(400).json({ error: "Score and riskLevel are required" });
    }

    const { data: record, error: dbError } = await supabaseAdmin
      .from("risk_scores")
      .insert({ user_id: req.userId!, score, risk_level: riskLevel, factors: factors || {} })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return res.status(500).json({ error: "Failed to save score" });
    }

    const riskEmoji = riskLevel === "High" ? "🔴" : riskLevel === "Medium" ? "🟡" : "🟢";
    await supabaseAdmin.from("notifications").insert({
      user_id: req.userId!, type: "risk_increased",
      title: `${riskEmoji} Privacy Risk Score Updated — ${riskLevel} Risk (${score}/100)`,
      message: `Your privacy risk score has been assessed at ${score}/100 (${riskLevel} Risk). ${
        riskLevel === "High"
          ? "Immediate action is recommended."
          : riskLevel === "Medium"
          ? "You have some exposure. Consider addressing the flagged factors."
          : "Great job! Your privacy risk is low."
      }`,
      metadata: { score, riskLevel, factors },
      is_read: false,
    });

    return res.json({ success: true, data: record });
  } catch (error) {
    console.error("Risk API Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
