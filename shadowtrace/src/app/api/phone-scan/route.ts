import { NextResponse } from "next/server";
import { createClient } from "@/backend/db/server";

// ── Platforms that use phone numbers ──────────────────────────────────────────
const PHONE_PLATFORMS = [
  { name: "WhatsApp",   checkUrl: (n: string) => `https://wa.me/${n}`,                    icon: "💬", category: "Messaging" },
  { name: "Telegram",   checkUrl: (n: string) => `https://t.me/+${n}`,                    icon: "✈️", category: "Messaging" },
  { name: "Viber",      checkUrl: (n: string) => `viber://chat?number=${n}`,               icon: "📳", category: "Messaging" },
  { name: "Signal",     checkUrl: (n: string) => `https://signal.me/#p/+${n}`,            icon: "🔐", category: "Messaging" },
  { name: "Truecaller", checkUrl: (n: string) => `https://www.truecaller.com/search/in/${n}`, icon: "📞", category: "Caller ID" },
  { name: "Snapchat",   checkUrl: (n: string) => `https://www.snapchat.com`,               icon: "👻", category: "Social" },
  { name: "Instagram",  checkUrl: (n: string) => `https://www.instagram.com`,             icon: "📸", category: "Social" },
  { name: "Twitter/X",  checkUrl: (n: string) => `https://x.com`,                         icon: "🐦", category: "Social" },
  { name: "Facebook",   checkUrl: (n: string) => `https://www.facebook.com`,              icon: "📘", category: "Social" },
  { name: "LinkedIn",   checkUrl: (n: string) => `https://www.linkedin.com`,              icon: "💼", category: "Professional" },
  { name: "Paytm",      checkUrl: (n: string) => `https://paytm.com`,                     icon: "💳", category: "Payment" },
  { name: "Google Pay", checkUrl: (n: string) => `https://pay.google.com`,                icon: "💰", category: "Payment" },
  { name: "PhonePe",    checkUrl: (n: string) => `https://www.phonepe.com`,               icon: "📲", category: "Payment" },
];

// ── Country code detection ────────────────────────────────────────────────────
function detectCountry(phone: string): { country: string; code: string; flag: string } {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12)  return { country: "India",          code: "+91", flag: "🇮🇳" };
  if (cleaned.startsWith("1")  && cleaned.length === 11)  return { country: "USA/Canada",      code: "+1",  flag: "🇺🇸" };
  if (cleaned.startsWith("44") && cleaned.length === 12)  return { country: "United Kingdom",  code: "+44", flag: "🇬🇧" };
  if (cleaned.startsWith("61") && cleaned.length === 11)  return { country: "Australia",       code: "+61", flag: "🇦🇺" };
  if (cleaned.startsWith("49"))                           return { country: "Germany",         code: "+49", flag: "🇩🇪" };
  if (cleaned.startsWith("86"))                           return { country: "China",           code: "+86", flag: "🇨🇳" };
  if (cleaned.startsWith("971"))                          return { country: "UAE",             code: "+971",flag: "🇦🇪" };
  if (cleaned.startsWith("92"))                           return { country: "Pakistan",        code: "+92", flag: "🇵🇰" };
  if (cleaned.startsWith("880"))                          return { country: "Bangladesh",      code: "+880",flag: "🇧🇩" };
  if (cleaned.startsWith("65"))                           return { country: "Singapore",       code: "+65", flag: "🇸🇬" };
  return { country: "Unknown", code: "?", flag: "🌍" };
}

// ── Check WhatsApp via wa.me ──────────────────────────────────────────────────
async function checkWhatsApp(cleaned: string): Promise<boolean> {
  try {
    const res = await fetch(`https://wa.me/${cleaned}`, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

// ── Check Truecaller profile ──────────────────────────────────────────────────
async function checkTruecaller(cleaned: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.truecaller.com/search/in/${cleaned}`, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

// ── POST /api/phone-scan ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body  = await request.json();
    const { phone } = body as { phone: string };

    if (!phone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });

    // Clean the number — keep only digits
    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length < 7 || cleaned.length > 15) {
      return NextResponse.json({ error: "Enter a valid phone number with country code (e.g. +91 98765 43210)" }, { status: 400 });
    }

    const countryInfo = detectCountry(cleaned);
    const isIndia     = countryInfo.code === "+91";

    // ── Run platform checks concurrently ────────────────────────────────────
    const [whatsapp, truecaller] = await Promise.all([
      checkWhatsApp(cleaned),
      checkTruecaller(cleaned),
    ]);

    // ── Build results list ───────────────────────────────────────────────────
    // "Confirmed" = real HTTP check passed
    // "Likely"    = platform commonly used in this region
    // "Possible"  = platform that uses phone numbers globally
    const results = PHONE_PLATFORMS.map((p) => {
      let status: "CONFIRMED" | "LIKELY" | "POSSIBLE" | "UNKNOWN" = "POSSIBLE";

      if (p.name === "WhatsApp")   status = whatsapp    ? "CONFIRMED" : "LIKELY";
      if (p.name === "Truecaller") status = truecaller  ? "CONFIRMED" : isIndia ? "LIKELY" : "POSSIBLE";
      if (p.name === "Telegram")   status = "LIKELY";
      if (p.name === "Signal")     status = "POSSIBLE";
      if (p.name === "Viber")      status = "POSSIBLE";
      if (p.name === "Snapchat")   status = "POSSIBLE";
      if (p.name === "Instagram")  status = "LIKELY";
      if (p.name === "Twitter/X")  status = "POSSIBLE";
      if (p.name === "Facebook")   status = "LIKELY";
      if (p.name === "LinkedIn")   status = "POSSIBLE";

      // India-specific payment apps
      if (isIndia) {
        if (p.name === "Paytm")      status = "LIKELY";
        if (p.name === "Google Pay") status = "LIKELY";
        if (p.name === "PhonePe")    status = "LIKELY";
      } else {
        if (["Paytm","PhonePe"].includes(p.name)) status = "UNKNOWN";
        if (p.name === "Google Pay") status = "POSSIBLE";
      }

      return {
        platform:  p.name,
        icon:      p.icon,
        category:  p.category,
        url:       p.checkUrl(cleaned),
        status,
      };
    });

    // Filter out UNKNOWN for non-Indian users
    const filteredResults = results.filter(r => r.status !== "UNKNOWN");

    const confirmedCount = filteredResults.filter(r => r.status === "CONFIRMED").length;
    const likelyCount    = filteredResults.filter(r => r.status === "LIKELY").length;
    const exposureScore  = Math.min((confirmedCount * 25) + (likelyCount * 10), 100);
    const riskLevel      = exposureScore >= 70 ? "CRITICAL" : exposureScore >= 40 ? "HIGH" : exposureScore >= 20 ? "MEDIUM" : "LOW";

    // ── Save full result to phone_scans table ────────────────────────────────
    const { error: phoneDbError } = await supabase
      .from("phone_scans")
      .insert({
        user_id:        user.id,
        phone:          cleaned,
        formatted:      `+${cleaned}`,
        country:        countryInfo.country,
        country_code:   countryInfo.code,
        country_flag:   countryInfo.flag,
        confirmed_count: confirmedCount,
        likely_count:   likelyCount,
        exposure_score: exposureScore,
        risk_level:     riskLevel,
        results:        filteredResults,
      });

    if (phoneDbError) {
      console.error("phone_scans insert error:", phoneDbError.message);
    }

    // ── Save notification ────────────────────────────────────────────────────
    await supabase.from("notifications").insert({
      user_id: user.id,
      type:    confirmedCount > 0 ? "warning" : "info",
      title:   `Mobile Number Scan — +${cleaned}`,
      message: `Found on ${confirmedCount} confirmed + ${likelyCount} likely platforms. Risk: ${riskLevel}.`,
      is_read: false,
      metadata: { phone: cleaned, confirmedCount, likelyCount, exposureScore },
    });

    return NextResponse.json({
      phone: cleaned,
      formatted: `+${cleaned}`,
      countryInfo,
      results: filteredResults,
      confirmedCount,
      likelyCount,
      exposureScore,
      riskLevel,
    });

  } catch (err: any) {
    console.error("Phone scan error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
