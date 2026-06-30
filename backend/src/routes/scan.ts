import { Router, Response } from "express";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const PLATFORMS = [
  { name: "GitHub",    urlTemplate: "https://github.com/{username}" },
  { name: "Reddit",   urlTemplate: "https://www.reddit.com/user/{username}/about.json" },
  { name: "Pinterest",urlTemplate: "https://www.pinterest.com/{username}/" },
  { name: "Instagram",urlTemplate: "https://www.instagram.com/{username}/" },
  { name: "Twitter",  urlTemplate: "https://x.com/{username}" },
];

// ─── GET: Fetch scan history ──────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("scans")
      .select("id, target_username, results, created_at")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Supabase fetch error:", error.message);
      return res.json({ scans: [] });
    }

    return res.json({ scans: data || [] });
  } catch (error) {
    console.error("Scan GET Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST: Run a new scan ─────────────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const checkPromises = PLATFORMS.map(async (platform) => {
      const url = platform.urlTemplate.replace("{username}", username);
      const displayUrl = url.replace("/about.json", "");

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html,application/json",
          },
          signal: AbortSignal.timeout(5000),
        });

        if (response.status === 200) return { platform: platform.name, profileUrl: displayUrl, status: "FOUND" };
        if (response.status === 404) return { platform: platform.name, profileUrl: displayUrl, status: "NOT_FOUND" };
        return { platform: platform.name, profileUrl: displayUrl, status: "ERROR" };
      } catch {
        return { platform: platform.name, profileUrl: displayUrl, status: "ERROR" };
      }
    });

    const scanResults = await Promise.all(checkPromises);

    const { data: scanRecord, error: dbError } = await supabaseAdmin
      .from("scans")
      .insert({ user_id: req.userId!, target_username: username, results: scanResults })
      .select()
      .single();

    if (dbError) console.error("Supabase insert error:", dbError);

    const foundCount = scanResults.filter((r) => r.status === "FOUND").length;
    const foundPlatforms = scanResults.filter((r) => r.status === "FOUND").map((r) => r.platform);

    const notifMessage =
      foundCount === 0
        ? `Scan for "${username}" is complete. No exposed profiles found across ${scanResults.length} platforms — you look clean!`
        : `Scan for "${username}" found profiles on ${foundCount} platform${foundCount > 1 ? "s" : ""}: ${foundPlatforms.slice(0, 3).join(", ")}${foundPlatforms.length > 3 ? ` and ${foundPlatforms.length - 3} more` : ""}. Review and take action.`;

    await supabaseAdmin.from("notifications").insert({
      user_id: req.userId!,
      type: "scan_completed",
      title:
        foundCount === 0
          ? `Scan Complete — @${username} is Clean`
          : `Scan Alert — @${username} Found on ${foundCount} Platform${foundCount > 1 ? "s" : ""}`,
      message: notifMessage,
      metadata: { username, foundCount, foundPlatforms },
      is_read: false,
    });

    return res.json({ success: true, username, results: scanResults, scanId: scanRecord?.id });
  } catch (error) {
    console.error("Scan API Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
