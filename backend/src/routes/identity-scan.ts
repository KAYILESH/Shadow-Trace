import { Router, Response } from "express";
import { createHash } from "crypto";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const GMAIL_SERVICES = [
  { name: "Gmail",         url: "https://gmail.com",         icon: "📧", likely: true },
  { name: "Google Drive",  url: "https://drive.google.com",  icon: "📁", likely: true },
  { name: "YouTube",       url: "https://youtube.com",       icon: "▶️", likely: true },
  { name: "Google Photos", url: "https://photos.google.com", icon: "🖼️", likely: true },
  { name: "Google Maps",   url: "https://maps.google.com",   icon: "🗺️", likely: true },
  { name: "Google Meet",   url: "https://meet.google.com",   icon: "🎥", likely: true },
];

async function checkGravatar(email: string): Promise<{ found: boolean; avatarUrl: string | null }> {
  try {
    const hash = createHash("md5").update(email.toLowerCase().trim()).digest("hex");
    const url  = `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.status === 200) return { found: true, avatarUrl: url.replace("?d=404&s=200", "?s=200") };
    return { found: false, avatarUrl: null };
  } catch { return { found: false, avatarUrl: null }; }
}

async function checkHIBP(email: string): Promise<{ breached: boolean; count: number; breaches: string[] }> {
  try {
    const apiKey = process.env.HIBP_API_KEY;
    if (!apiKey) return { breached: false, count: 0, breaches: [] };

    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: { "hibp-api-key": apiKey, "User-Agent": "ScanRadar-PrivacyTool/1.0" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.status === 404) return { breached: false, count: 0, breaches: [] };
    if (res.status === 200) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as any[];
      return { breached: true, count: data.length, breaches: data.slice(0, 6).map((b: { Name: string }) => b.Name) };
    }
    return { breached: false, count: 0, breaches: [] };
  } catch { return { breached: false, count: 0, breaches: [] }; }
}

// ─── POST /api/identity-scan ──────────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { email, name } = req.body as { email: string; name?: string };

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const emailLower = email.toLowerCase().trim();
    const domain  = emailLower.split("@")[1];
    const isGmail   = domain === "gmail.com";
    const isYahoo   = domain === "yahoo.com";
    const isOutlook = domain === "outlook.com" || domain === "hotmail.com";

    const [gravatar, hibp] = await Promise.all([checkGravatar(emailLower), checkHIBP(emailLower)]);

    const connectedServices = isGmail
      ? GMAIL_SERVICES
      : isYahoo
      ? [
          { name: "Yahoo Mail",    url: "https://mail.yahoo.com",    icon: "📧", likely: true },
          { name: "Yahoo News",    url: "https://news.yahoo.com",    icon: "📰", likely: true },
          { name: "Yahoo Finance", url: "https://finance.yahoo.com", icon: "💰", likely: true },
        ]
      : isOutlook
      ? [
          { name: "Outlook",                 url: "https://outlook.com",   icon: "📧", likely: true },
          { name: "OneDrive",                url: "https://onedrive.com",  icon: "📁", likely: true },
          { name: "Xbox/Game Pass",          url: "https://xbox.com",      icon: "🎮", likely: true },
          { name: "LinkedIn (Microsoft)",    url: "https://linkedin.com",  icon: "💼", likely: true },
        ]
      : [];

    let exposureScore = 0;
    if (gravatar.found) exposureScore += 25;
    if (hibp.breached)  exposureScore += Math.min(hibp.count * 10, 50);
    if (isGmail)        exposureScore += 10;
    exposureScore = Math.min(exposureScore, 100);

    const riskLevel =
      exposureScore >= 70 ? "CRITICAL" :
      exposureScore >= 50 ? "HIGH"     :
      exposureScore >= 25 ? "MEDIUM"   : "LOW";

    await supabaseAdmin.from("identity_scans").insert({
      user_id: req.userId!, email: emailLower, name: name || null,
      email_provider: isGmail ? "Google (Gmail)" : isYahoo ? "Yahoo" : isOutlook ? "Microsoft (Outlook)" : domain,
      domain, gravatar_found: gravatar.found, gravatar_url: gravatar.avatarUrl,
      breach_count: hibp.count, breaches: hibp.breaches, exposure_score: exposureScore,
      risk_level: riskLevel, connected_services: connectedServices,
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: req.userId!, type: hibp.breached ? "warning" : "info",
      title: hibp.breached
        ? `Identity Alert — ${email} found in ${hibp.count} breach${hibp.count > 1 ? "es" : ""}`
        : `Identity Scan Complete — ${email}`,
      message: hibp.breached
        ? `Your email appeared in data breaches from: ${hibp.breaches.slice(0, 3).join(", ")}. Take action immediately.`
        : gravatar.found
        ? `Your email has a public Gravatar profile. Risk level: ${riskLevel}.`
        : `No major exposures found for ${email}. Risk level: ${riskLevel}.`,
      is_read: false,
      metadata: { email, gravatar: gravatar.found, breaches: hibp.count },
    });

    return res.json({
      email, name: name || null, domain,
      emailProvider: isGmail ? "Google (Gmail)" : isYahoo ? "Yahoo" : isOutlook ? "Microsoft (Outlook)" : domain,
      gravatar, hibp, connectedServices, exposureScore, riskLevel,
      hasHIBPKey: !!process.env.HIBP_API_KEY,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Identity scan error:", message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
