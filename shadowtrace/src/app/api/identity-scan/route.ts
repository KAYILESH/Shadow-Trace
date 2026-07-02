import { NextResponse } from "next/server";
import { createClient } from "@/backend/db/server";
import { createHash } from "crypto";

// ── Platform lists by email provider ────────────────────────────────────────
const GMAIL_SERVICES = [
  { name: "Gmail",          url: "https://gmail.com",         icon: "📧", likely: true  },
  { name: "Google Drive",   url: "https://drive.google.com",  icon: "📁", likely: true  },
  { name: "YouTube",        url: "https://youtube.com",       icon: "▶️", likely: true  },
  { name: "Google Photos",  url: "https://photos.google.com", icon: "🖼️", likely: true  },
  { name: "Google Maps",    url: "https://maps.google.com",   icon: "🗺️", likely: true  },
  { name: "Google Meet",    url: "https://meet.google.com",   icon: "🎥", likely: true  },
];

const COMMON_PLATFORMS = [
  { name: "Gravatar",   checkType: "gravatar" },
  { name: "GitHub",     checkType: "github"   },
  { name: "Twitter/X",  checkType: "twitter"  },
  { name: "LinkedIn",   checkType: "linkedin" },
  { name: "Facebook",   checkType: "facebook" },
  { name: "Instagram",  checkType: "instagram"},
];

// ── Check Gravatar by MD5 hashing the email ──────────────────────────────────
async function checkGravatar(email: string): Promise<{ found: boolean; avatarUrl: string | null }> {
  try {
    const hash = createHash("md5").update(email.toLowerCase().trim()).digest("hex");
    const url  = `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.status === 200) {
      return { found: true, avatarUrl: url.replace("?d=404&s=200", "?s=200") };
    }
    return { found: false, avatarUrl: null };
  } catch {
    return { found: false, avatarUrl: null };
  }
}

// ── Check Have I Been Pwned for breaches ────────────────────────────────────
async function checkHIBP(email: string): Promise<{ breached: boolean; count: number; breaches: string[] }> {
  try {
    const apiKey = process.env.HIBP_API_KEY;
    if (!apiKey) return { breached: false, count: 0, breaches: [] };

    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: {
          "hibp-api-key": apiKey,
          "User-Agent": "ScanRadar-PrivacyTool/1.0",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.status === 404) return { breached: false, count: 0, breaches: [] };
    if (res.status === 200) {
      const data = await res.json();
      return {
        breached: true,
        count: data.length,
        breaches: data.slice(0, 6).map((b: any) => b.Name),
      };
    }
    return { breached: false, count: 0, breaches: [] };
  } catch {
    return { breached: false, count: 0, breaches: [] };
  }
}

// ── POST /api/identity-scan ──────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { email, name } = body as { email: string; name?: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const domain     = emailLower.split("@")[1];
    const isGmail    = domain === "gmail.com";
    const isYahoo    = domain === "yahoo.com";
    const isOutlook  = domain === "outlook.com" || domain === "hotmail.com";

    // ── Run checks concurrently ──────────────────────────────────────────────
    const [gravatar, hibp] = await Promise.all([
      checkGravatar(emailLower),
      checkHIBP(emailLower),
    ]);

    // ── Determine connected services by email provider ───────────────────────
    const connectedServices = isGmail
      ? GMAIL_SERVICES
      : isYahoo
      ? [
          { name: "Yahoo Mail",  url: "https://mail.yahoo.com", icon: "📧", likely: true },
          { name: "Yahoo News",  url: "https://news.yahoo.com", icon: "📰", likely: true },
          { name: "Yahoo Finance",url: "https://finance.yahoo.com",icon:"💰",likely: true },
        ]
      : isOutlook
      ? [
          { name: "Outlook",     url: "https://outlook.com",    icon: "📧", likely: true },
          { name: "OneDrive",    url: "https://onedrive.com",   icon: "📁", likely: true },
          { name: "Xbox/Game Pass",url:"https://xbox.com",      icon: "🎮", likely: true },
          { name: "LinkedIn (Microsoft)", url:"https://linkedin.com", icon:"💼", likely: true },
        ]
      : [];

    // ── Calculate exposure score ─────────────────────────────────────────────
    let exposureScore = 0;
    if (gravatar.found)  exposureScore += 25;
    if (hibp.breached)   exposureScore += Math.min(hibp.count * 10, 50);
    if (isGmail)         exposureScore += 10; // Google services exposure
    exposureScore = Math.min(exposureScore, 100);

    const riskLevel =
      exposureScore >= 70 ? "CRITICAL" :
      exposureScore >= 50 ? "HIGH"     :
      exposureScore >= 25 ? "MEDIUM"   : "LOW";

    // ── Save full result to identity_scans table ─────────────────────────────
    const { data: scanRecord, error: scanError } = await supabase
      .from("identity_scans")
      .insert({
        user_id:            user.id,
        email:              emailLower,
        name:               name || null,
        email_provider:     isGmail ? "Google (Gmail)" : isYahoo ? "Yahoo" : isOutlook ? "Microsoft (Outlook)" : domain,
        domain,
        gravatar_found:     gravatar.found,
        gravatar_url:       gravatar.avatarUrl,
        breach_count:       hibp.count,
        breaches:           hibp.breaches,
        exposure_score:     exposureScore,
        risk_level:         riskLevel,
        connected_services: connectedServices,
      })
      .select("id")
      .single();

    if (scanError) {
      console.error("identity_scans insert error:", scanError.message);
    }

    // ── Save notification ────────────────────────────────────────────────────
    await supabase.from("notifications").insert({
      user_id: user.id,
      type:    hibp.breached ? "warning" : "info",
      title:   hibp.breached
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

    return NextResponse.json({
      email,
      name: name || null,
      domain,
      emailProvider: isGmail ? "Google (Gmail)" : isYahoo ? "Yahoo" : isOutlook ? "Microsoft (Outlook)" : domain,
      gravatar,
      hibp,
      connectedServices,
      exposureScore,
      riskLevel,
      hasHIBPKey: !!process.env.HIBP_API_KEY,
    });

  } catch (err: any) {
    console.error("Identity scan error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
