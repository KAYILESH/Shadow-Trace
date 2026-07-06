import { Router, Response } from "express";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── OpenRouter Config ────────────────────────────────────────────────────────
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const TEXT_MODELS = [
  "openrouter/auto",
  "google/gemini-flash-1.5-8b",
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface RedirectHop {
  url:        string;
  domain:     string;
  statusCode: number;
  isSuspicious: boolean;
}

interface QrScanResult {
  originalUrl:    string;
  finalUrl:       string;
  redirectChain:  RedirectHop[];
  riskScore:      number;                                         // 0–100
  threatLevel:    "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "CRITICAL";
  isPhishing:     boolean;
  verdict:        string;
  redFlags:       string[];
  safeFactors:    string[];
  explanation:    string;
  confidence:     "HIGH" | "MEDIUM" | "LOW";
  domainFeatures: Record<string, unknown>;
  modelUsed?:     string;
}

// ─── Popular brands for brand-similarity checking ─────────────────────────────
const POPULAR_BRANDS = [
  "google","facebook","apple","microsoft","amazon","paypal","netflix","twitter",
  "instagram","whatsapp","linkedin","youtube","github","dropbox","spotify",
  "adobe","ebay","walmart","chase","wellsfargo","bankofamerica","citibank",
  "steam","discord","twitch","tiktok","snapchat","telegram","zoom","slack",
  "shopify","stripe","coinbase","binance","kraken","metamask","opensea",
];

// ─── Domain feature extractor (mirrors domain-predict heuristics) ─────────────
function extractDomainFeatures(url: string): Record<string, unknown> {
  const clean = url
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  const parts      = clean.split(".");
  const tld        = parts.slice(-1)[0] || "";
  const sld        = parts.slice(-2, -1)[0] || "";
  const subdomain  = parts.length > 2 ? parts.slice(0, -2).join(".") : "";
  const fullLabel  = parts.slice(0, -1).join(".");

  const suspiciousTlds = ["tk","ml","ga","cf","gq","xyz","top","click","link","pw","ru","cn","live","online"];
  const isSuspiciousTld = suspiciousTlds.includes(tld);

  const digitCount  = (clean.match(/\d/g) || []).length;
  const hyphenCount = (sld.match(/-/g) || []).length;

  const phishKeywords = [
    "secure","login","signin","verify","account","update","confirm","support",
    "password","billing","payment","bank","wallet","alert","suspended","limited",
    "unusual","activity","click","free","prize","winner","urgent","immediately",
  ];
  const matchedKeywords = phishKeywords.filter(k => clean.includes(k));

  const matchedBrands: string[] = [];
  for (const brand of POPULAR_BRANDS) {
    if (fullLabel.includes(brand) && sld !== brand) { matchedBrands.push(brand); continue; }
    const normalized = fullLabel
      .replace(/0/g,"o").replace(/1/g,"i").replace(/3/g,"e")
      .replace(/4/g,"a").replace(/5/g,"s").replace(/-/g,"");
    if (normalized.includes(brand) && sld !== brand) matchedBrands.push(brand);
  }

  let hasHomoglyphs = false;
  for (const combo of ["rn","vv","cl","l1","0"]) {
    if (clean.includes(combo)) { hasHomoglyphs = true; break; }
  }

  return {
    clean, tld, sld, subdomain, fullLabel,
    isSuspiciousTld,
    hasDigits: digitCount > 0, digitCount,
    hyphenCount,
    matchedKeywords,
    matchedBrands,
    hasHomoglyphs,
    domainLength: clean.length,
    hasDeepSubdomain: parts.length > 4,
  };
}

// ─── Redirect chain follower (up to 5 hops) ──────────────────────────────────
async function followRedirects(startUrl: string): Promise<{
  chain: RedirectHop[];
  finalUrl: string;
}> {
  const chain: RedirectHop[] = [];
  let   current = startUrl;
  const MAX_HOPS = 5;

  for (let i = 0; i < MAX_HOPS; i++) {
    try {
      const res = await fetch(current, {
        method:   "GET",
        redirect: "manual",
        headers:  { "User-Agent": "Mozilla/5.0 (ScanRadar QR Scanner)" },
        signal:   AbortSignal.timeout(6000),
      });

      const domain = current.replace(/^https?:\/\//i,"").replace(/\/.*$/,"");
      const features = extractDomainFeatures(current);
      const isSuspicious =
        (features.isSuspiciousTld as boolean) ||
        (features.matchedBrands as string[]).length > 0 ||
        (features.matchedKeywords as string[]).length >= 2;

      chain.push({ url: current, domain, statusCode: res.status, isSuspicious });

      if ([301,302,303,307,308].includes(res.status)) {
        const location = res.headers.get("location");
        if (!location) break;
        // Resolve relative redirects
        current = location.startsWith("http") ? location : new URL(location, current).href;
      } else {
        break; // Final destination reached
      }
    } catch {
      break; // Network error — stop chain
    }
  }

  return { chain, finalUrl: current };
}

// ─── AI analysis via OpenRouter ───────────────────────────────────────────────
async function analyzeWithAI(
  originalUrl:  string,
  finalUrl:     string,
  chain:        RedirectHop[],
  features:     Record<string, unknown>,
  apiKey:       string
): Promise<{ content: string; modelUsed: string }> {
  const chainSummary = chain.map((h, i) =>
    `  Hop ${i + 1}: ${h.url} (HTTP ${h.statusCode}) [${h.isSuspicious ? "⚠ suspicious" : "ok"}]`
  ).join("\n");

  const userMessage = `Analyze this QR code URL for phishing and scam risk:

Original QR URL: ${originalUrl}
Final destination: ${finalUrl}
Redirect hops: ${chain.length}

Redirect chain:
${chainSummary || "  No redirects — direct link"}

Domain structural features of final URL:
- TLD: .${features.tld} (suspicious TLD: ${features.isSuspiciousTld})
- Contains digits: ${features.hasDigits} (count: ${features.digitCount})
- Hyphen count in SLD: ${features.hyphenCount}
- Deep subdomain nesting: ${features.hasDeepSubdomain}
- Matched phishing keywords: [${(features.matchedKeywords as string[]).join(", ") || "none"}]
- Brand name substrings detected: [${(features.matchedBrands as string[]).join(", ") || "none"}]
- Homoglyph characters: ${features.hasHomoglyphs}
- Domain length: ${features.domainLength}

Using these features, provide the threat prediction JSON.`;

  const systemPrompt = `You are an elite cybersecurity AI specialized in QR code phishing detection. Analyze QR code URLs, their redirect chains, and domain features to determine if they are scams or phishing attacks.

Respond ONLY with a valid JSON object — no markdown, no explanation, no code fences.

Required JSON schema:
{
  "riskScore": <integer 0-100>,
  "threatLevel": <"SAFE"|"SUSPICIOUS"|"HIGH_RISK"|"CRITICAL">,
  "isPhishing": <true|false>,
  "verdict": "<one-line summary of what this QR leads to>",
  "redFlags": ["<specific red flag>", ...],
  "safeFactors": ["<specific safe factor>", ...],
  "explanation": "<2-3 sentence plain English explanation of findings>",
  "confidence": <"HIGH"|"MEDIUM"|"LOW">
}

Scoring:
- 0–20 → SAFE
- 21–50 → SUSPICIOUS  
- 51–75 → HIGH_RISK
- 76–100 → CRITICAL

Key red flags to look for:
- Excessive redirects (3+ hops)
- Suspicious TLDs (.tk, .xyz, .ml etc.)
- Brand impersonation in domain
- Phishing keywords (login, verify, secure, payment)
- Digits replacing letters (paypa1, g00gle)
- Deep subdomain nesting
- URL shorteners hiding true destination

Be thorough. Legitimate QR codes from trusted brands (google.com, apple.com, github.com) should score < 15.`;

  for (const model of TEXT_MODELS) {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":  "https://scanradar.app",
          "X-Title":       "ScanRadar QR Scanner",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userMessage  },
          ],
          temperature: 0.1,
          max_tokens:  900,
        }),
      });

      if (!response.ok) { console.warn(`[QRScan] Model ${model} HTTP ${response.status}`); continue; }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; model?: string };
      const content = data?.choices?.[0]?.message?.content;
      if (!content) continue;

      return { content, modelUsed: data.model || model };
    } catch (err) {
      console.warn(`[QRScan] Model ${model} threw:`, err);
    }
  }
  throw new Error("All AI models failed. Please try again later.");
}

// ─── Parse AI response ────────────────────────────────────────────────────────
function parseAIResponse(raw: string) {
  const cleaned = raw.replace(/```json?\n?/gi,"").replace(/```/g,"").trim();
  const parsed  = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned);

  return {
    riskScore:   Math.max(0, Math.min(100, Math.round(parsed.riskScore ?? 50))),
    threatLevel: (["SAFE","SUSPICIOUS","HIGH_RISK","CRITICAL"].includes(parsed.threatLevel)
      ? parsed.threatLevel : "SUSPICIOUS") as QrScanResult["threatLevel"],
    isPhishing:  parsed.isPhishing ?? false,
    verdict:     parsed.verdict      || "QR code analysis complete.",
    redFlags:    Array.isArray(parsed.redFlags)    ? parsed.redFlags.slice(0, 8)    : [],
    safeFactors: Array.isArray(parsed.safeFactors) ? parsed.safeFactors.slice(0, 6) : [],
    explanation: parsed.explanation  || "Analysis complete.",
    confidence:  (["HIGH","MEDIUM","LOW"].includes(parsed.confidence)
      ? parsed.confidence : "MEDIUM") as QrScanResult["confidence"],
  };
}

// ─── POST /api/qr-scan ────────────────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url } = req.body as { url?: string };

    if (!url || typeof url !== "string" || url.trim().length < 4) {
      res.status(400).json({ error: "A valid URL decoded from the QR code is required." });
      return;
    }

    // Normalise: ensure it has a protocol
    let normalised = url.trim();
    if (!/^https?:\/\//i.test(normalised)) normalised = "https://" + normalised;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "OpenRouter API key is not configured." });
      return;
    }

    // 1. Follow redirects
    const { chain, finalUrl } = await followRedirects(normalised);

    // 2. Extract domain features of the final destination
    const domainFeatures = extractDomainFeatures(finalUrl);

    // 3. AI analysis
    const { content, modelUsed } = await analyzeWithAI(
      normalised, finalUrl, chain, domainFeatures, apiKey
    );

    let aiResult;
    try {
      aiResult = parseAIResponse(content);
    } catch (parseErr) {
      console.error("[QRScan] AI parse error:", parseErr, "\nRaw:", content);
      res.status(502).json({ error: "AI returned an unexpected format. Please try again." });
      return;
    }

    const result: QrScanResult = {
      originalUrl:   normalised,
      finalUrl,
      redirectChain: chain,
      domainFeatures,
      modelUsed,
      ...aiResult,
    };

    // 4. Save to Supabase (useful for threat pattern history + user scan log)
    try {
      await supabaseAdmin.from("qr_scans").insert({
        user_id:       req.userId!,
        original_url:  normalised,
        final_url:     finalUrl,
        redirect_hops: chain.length,
        risk_score:    aiResult.riskScore,
        threat_level:  aiResult.threatLevel,
        is_phishing:   aiResult.isPhishing,
        verdict:       aiResult.verdict,
        red_flags:     aiResult.redFlags,
        model_used:    modelUsed,
      });
    } catch (dbErr) {
      // Non-fatal — log and continue
      console.warn("[QRScan] Supabase insert failed:", dbErr);
    }

    // 5. Send notification for high-risk scans
    if (aiResult.riskScore >= 51) {
      const emoji = aiResult.threatLevel === "CRITICAL" ? "🔴" : "🟠";
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: req.userId!,
          type:    "warning",
          title:   `${emoji} QR Code Scam Detected — ${aiResult.threatLevel.replace("_"," ")}`,
          message: `A scanned QR code leads to a suspicious URL: ${finalUrl.slice(0, 80)}. Risk score: ${aiResult.riskScore}/100.`,
          metadata: { originalUrl: normalised, finalUrl, riskScore: aiResult.riskScore, threatLevel: aiResult.threatLevel },
          is_read: false,
        });
      } catch (notifErr) {
        console.warn("[QRScan] Notification insert failed:", notifErr);
      }
    }

    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[QRScan] Error:", error);
    res.status(500).json({ error: msg });
  }
});

// ─── GET /api/qr-scan — fetch scan history ────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from("qr_scans")
      .select("id, original_url, final_url, redirect_hops, risk_score, threat_level, is_phishing, verdict, created_at")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[QRScan] Supabase GET error:", error.message);
      res.json({ scans: [] });
      return;
    }

    res.json({ scans: data || [] });
  } catch (error) {
    console.error("[QRScan] GET Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
