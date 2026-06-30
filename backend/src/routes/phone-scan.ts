import { Router, Response } from "express";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const PHONE_PLATFORMS = [
  { name: "WhatsApp",   checkUrl: (n: string) => `https://wa.me/${n}`,                    icon: "💬", category: "Messaging" },
  { name: "Telegram",   checkUrl: (n: string) => `https://t.me/+${n}`,                    icon: "✈️", category: "Messaging" },
  { name: "Viber",      checkUrl: (n: string) => `viber://chat?number=${n}`,               icon: "📳", category: "Messaging" },
  { name: "Signal",     checkUrl: (n: string) => `https://signal.me/#p/+${n}`,            icon: "🔐", category: "Messaging" },
  { name: "Truecaller", checkUrl: (n: string) => `https://www.truecaller.com/search/in/${n}`, icon: "📞", category: "Caller ID" },
  { name: "Snapchat",   checkUrl: (_n: string) => `https://www.snapchat.com`,              icon: "👻", category: "Social" },
  { name: "Instagram",  checkUrl: (_n: string) => `https://www.instagram.com`,            icon: "📸", category: "Social" },
  { name: "Twitter/X",  checkUrl: (_n: string) => `https://x.com`,                        icon: "🐦", category: "Social" },
  { name: "Facebook",   checkUrl: (_n: string) => `https://www.facebook.com`,             icon: "📘", category: "Social" },
  { name: "LinkedIn",   checkUrl: (_n: string) => `https://www.linkedin.com`,             icon: "💼", category: "Professional" },
  { name: "Paytm",      checkUrl: (_n: string) => `https://paytm.com`,                    icon: "💳", category: "Payment" },
  { name: "Google Pay", checkUrl: (_n: string) => `https://pay.google.com`,               icon: "💰", category: "Payment" },
  { name: "PhonePe",    checkUrl: (_n: string) => `https://www.phonepe.com`,              icon: "📲", category: "Payment" },
];

function detectCountry(phone: string): { country: string; code: string; flag: string } {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12)  return { country: "India",         code: "+91",  flag: "🇮🇳" };
  if (cleaned.startsWith("1")  && cleaned.length === 11)  return { country: "USA/Canada",     code: "+1",   flag: "🇺🇸" };
  if (cleaned.startsWith("44") && cleaned.length === 12)  return { country: "United Kingdom", code: "+44",  flag: "🇬🇧" };
  if (cleaned.startsWith("61") && cleaned.length === 11)  return { country: "Australia",      code: "+61",  flag: "🇦🇺" };
  if (cleaned.startsWith("49"))                           return { country: "Germany",         code: "+49",  flag: "🇩🇪" };
  if (cleaned.startsWith("86"))                           return { country: "China",           code: "+86",  flag: "🇨🇳" };
  if (cleaned.startsWith("971"))                          return { country: "UAE",             code: "+971", flag: "🇦🇪" };
  if (cleaned.startsWith("92"))                           return { country: "Pakistan",        code: "+92",  flag: "🇵🇰" };
  if (cleaned.startsWith("880"))                          return { country: "Bangladesh",      code: "+880", flag: "🇧🇩" };
  if (cleaned.startsWith("65"))                           return { country: "Singapore",       code: "+65",  flag: "🇸🇬" };
  return { country: "Unknown", code: "?", flag: "🌍" };
}

async function checkWhatsApp(cleaned: string): Promise<boolean> {
  try {
    const res = await fetch(`https://wa.me/${cleaned}`, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    return res.status === 200;
  } catch { return false; }
}

async function checkTruecaller(cleaned: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.truecaller.com/search/in/${cleaned}`, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    return res.status === 200;
  } catch { return false; }
}

// ─── POST /api/phone-scan ─────────────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.body as { phone: string };
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 7 || cleaned.length > 15) {
      return res.status(400).json({ error: "Enter a valid phone number with country code (e.g. +91 98765 43210)" });
    }

    const countryInfo = detectCountry(cleaned);
    const isIndia = countryInfo.code === "+91";

    const [whatsapp, truecaller] = await Promise.all([checkWhatsApp(cleaned), checkTruecaller(cleaned)]);

    const results = PHONE_PLATFORMS.map((p) => {
      let status: "CONFIRMED" | "LIKELY" | "POSSIBLE" | "UNKNOWN" = "POSSIBLE";

      if (p.name === "WhatsApp")   status = whatsapp   ? "CONFIRMED" : "LIKELY";
      if (p.name === "Truecaller") status = truecaller ? "CONFIRMED" : isIndia ? "LIKELY" : "POSSIBLE";
      if (p.name === "Telegram")   status = "LIKELY";
      if (p.name === "Signal")     status = "POSSIBLE";
      if (p.name === "Viber")      status = "POSSIBLE";
      if (p.name === "Snapchat")   status = "POSSIBLE";
      if (p.name === "Instagram")  status = "LIKELY";
      if (p.name === "Twitter/X")  status = "POSSIBLE";
      if (p.name === "Facebook")   status = "LIKELY";
      if (p.name === "LinkedIn")   status = "POSSIBLE";

      if (isIndia) {
        if (p.name === "Paytm")      status = "LIKELY";
        if (p.name === "Google Pay") status = "LIKELY";
        if (p.name === "PhonePe")    status = "LIKELY";
      } else {
        if (["Paytm", "PhonePe"].includes(p.name)) status = "UNKNOWN";
        if (p.name === "Google Pay") status = "POSSIBLE";
      }

      return { platform: p.name, icon: p.icon, category: p.category, url: p.checkUrl(cleaned), status };
    });

    const filteredResults = results.filter((r) => r.status !== "UNKNOWN");
    const confirmedCount = filteredResults.filter((r) => r.status === "CONFIRMED").length;
    const likelyCount    = filteredResults.filter((r) => r.status === "LIKELY").length;
    const exposureScore  = Math.min(confirmedCount * 25 + likelyCount * 10, 100);
    const riskLevel      = exposureScore >= 70 ? "CRITICAL" : exposureScore >= 40 ? "HIGH" : exposureScore >= 20 ? "MEDIUM" : "LOW";

    await supabaseAdmin.from("phone_scans").insert({
      user_id: req.userId!, phone: cleaned, formatted: `+${cleaned}`,
      country: countryInfo.country, country_code: countryInfo.code, country_flag: countryInfo.flag,
      confirmed_count: confirmedCount, likely_count: likelyCount,
      exposure_score: exposureScore, risk_level: riskLevel, results: filteredResults,
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: req.userId!, type: confirmedCount > 0 ? "warning" : "info",
      title: `Mobile Number Scan — +${cleaned}`,
      message: `Found on ${confirmedCount} confirmed + ${likelyCount} likely platforms. Risk: ${riskLevel}.`,
      is_read: false,
      metadata: { phone: cleaned, confirmedCount, likelyCount, exposureScore },
    });

    return res.json({ phone: cleaned, formatted: `+${cleaned}`, countryInfo, results: filteredResults, confirmedCount, likelyCount, exposureScore, riskLevel });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Phone scan error:", message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
