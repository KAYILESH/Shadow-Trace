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

// ─── GET: Auto-calculate risk score from real exposure data ───────────────────
router.get("/calculate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Fetch all data sources in parallel
    const [scansRes, identityRes, phoneRes] = await Promise.all([
      supabaseAdmin
        .from("scans")
        .select("results")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("identity_scans")
        .select("breach_count, gravatar_found, exposure_score, risk_level, breaches, email")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("phone_scans")
        .select("confirmed_count, likely_count, exposure_score, risk_level, phone")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // ── Social Profile Exposure (from username scans) ──────────────────────────
    let totalProfilesFound = 0;
    const foundPlatforms: string[] = [];
    if (scansRes.data) {
      for (const scan of scansRes.data) {
        const results = (scan.results as { platform: string; status: string }[]) || [];
        const found = results.filter((r) => r.status === "FOUND");
        totalProfilesFound += found.length;
        found.forEach((r) => {
          if (!foundPlatforms.includes(r.platform)) foundPlatforms.push(r.platform);
        });
      }
    }
    const socialScore = Math.min(totalProfilesFound * 5, 25);

    // ── Email / Identity Exposure ──────────────────────────────────────────────
    let maxBreachCount = 0;
    let gravatarFound = false;
    const exposedEmails: string[] = [];
    const breachNames: string[] = [];
    if (identityRes.data && identityRes.data.length > 0) {
      for (const scan of identityRes.data) {
        if (scan.breach_count > maxBreachCount) maxBreachCount = scan.breach_count;
        if (scan.gravatar_found) gravatarFound = true;
        if (scan.email && !exposedEmails.includes(scan.email)) exposedEmails.push(scan.email);
        if (scan.breaches) {
          (scan.breaches as string[]).forEach((b) => {
            if (!breachNames.includes(b)) breachNames.push(b);
          });
        }
      }
    }
    const breachScore   = Math.min(maxBreachCount * 8, 40);
    const gravatarScore = gravatarFound ? 5 : 0;
    const emailScore    = breachScore + gravatarScore;

    // ── Phone Exposure ─────────────────────────────────────────────────────────
    let maxPhoneConfirmed = 0;
    let maxPhoneLikely    = 0;
    const exposedPhones: string[] = [];
    if (phoneRes.data && phoneRes.data.length > 0) {
      for (const scan of phoneRes.data) {
        if (scan.confirmed_count > maxPhoneConfirmed) maxPhoneConfirmed = scan.confirmed_count;
        if (scan.likely_count   > maxPhoneLikely)    maxPhoneLikely    = scan.likely_count;
        if (scan.phone && !exposedPhones.includes(scan.phone)) exposedPhones.push(scan.phone);
      }
    }
    const phoneScore = Math.min(maxPhoneConfirmed * 10 + maxPhoneLikely * 3, 20);

    // ── Has Any Data ──────────────────────────────────────────────────────────
    const hasAnyData =
      (scansRes.data   && scansRes.data.length > 0)   ||
      (identityRes.data && identityRes.data.length > 0) ||
      (phoneRes.data   && phoneRes.data.length > 0);

    // ── Total Score ───────────────────────────────────────────────────────────
    const score = Math.min(socialScore + emailScore + phoneScore, 100);

    const riskLevel =
      score >= 61 ? "High" :
      score >= 31 ? "Medium" : "Low";

    const factors = {
      profiles: totalProfilesFound > 0,
      email:    maxBreachCount > 0 || gravatarFound,
      phone:    maxPhoneConfirmed > 0 || maxPhoneLikely > 0,
    };

    const breakdown = {
      social: {
        score: socialScore,
        maxScore: 25,
        profilesFound: totalProfilesFound,
        platforms: foundPlatforms,
      },
      email: {
        score: emailScore,
        maxScore: 45,
        breachCount: maxBreachCount,
        gravatarFound,
        exposedEmails,
        breachNames: breachNames.slice(0, 6),
      },
      phone: {
        score: phoneScore,
        maxScore: 20,
        confirmedCount: maxPhoneConfirmed,
        likelyCount:    maxPhoneLikely,
        exposedPhones,
      },
    };

    // Auto-save the calculated score when data exists
    if (hasAnyData) {
      await supabaseAdmin
        .from("risk_scores")
        .insert({ user_id: userId, score, risk_level: riskLevel, factors });
    }

    return res.json({
      score,
      riskLevel,
      factors,
      breakdown,
      hasAnyData,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Risk Calculate Error:", error);
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
      user_id:  req.userId!,
      type:     "risk_increased",
      title:    `${riskEmoji} Privacy Risk Score Updated — ${riskLevel} Risk (${score}/100)`,
      message:  `Your privacy risk score has been assessed at ${score}/100 (${riskLevel} Risk). ${
        riskLevel === "High"
          ? "Immediate action is recommended."
          : riskLevel === "Medium"
          ? "You have some exposure. Consider addressing the flagged factors."
          : "Great job! Your privacy risk is low."
      }`,
      metadata: { score, riskLevel, factors },
      is_read:  false,
    });

    return res.json({ success: true, data: record });
  } catch (error) {
    console.error("Risk API Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
