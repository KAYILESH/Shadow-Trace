import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── OpenRouter Config ────────────────────────────────────────────────────────
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Text-capable models ordered by preference
const TEXT_MODELS = [
  "openrouter/auto",
  "google/gemini-flash-1.5-8b",
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface SignalResult {
  score: number;      // 0–10 (higher = more risky)
  detail: string;
  riskFlag: boolean;
  matchedBrand?: string;
}

interface DomainPrediction {
  domain: string;
  predictionScore: number;   // 0–100
  threatLevel: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "CRITICAL";
  signals: {
    domainAge:       SignalResult;
    registrar:       SignalResult;
    namingPattern:   SignalResult;
    ssl:             SignalResult;
    hosting:         SignalResult;
    brandSimilarity: SignalResult;
  };
  redFlags:       string[];
  safeFactors:    string[];
  recommendation: string;
  confidence:     "HIGH" | "MEDIUM" | "LOW";
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

// ─── Domain analysis helpers ──────────────────────────────────────────────────
function extractDomainFeatures(domain: string): Record<string, unknown> {
  // Strip protocol/path
  const clean = domain
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  const parts = clean.split(".");
  const tld    = parts.slice(-1)[0] || "";
  const sld    = parts.slice(-2, -1)[0] || "";
  const subdomain = parts.length > 2 ? parts.slice(0, -2).join(".") : "";
  const fullLabel  = parts.slice(0, -1).join(".");  // everything before TLD

  // High-risk TLDs
  const suspiciousTlds = ["tk","ml","ga","cf","gq","xyz","top","click","link","pw","ru","cn","live","online"];
  const isSuspiciousTld = suspiciousTlds.includes(tld);

  // Digit presence
  const digitCount = (clean.match(/\d/g) || []).length;
  const hasDigits  = digitCount > 0;

  // Hyphen count
  const hyphenCount = (sld.match(/-/g) || []).length;

  // Keywords that commonly appear in phishing domains
  const phishKeywords = [
    "secure","login","signin","verify","account","update","confirm","support",
    "password","billing","payment","bank","wallet","alert","suspended","limited",
    "unusual","activity","click","free","prize","winner","urgent","immediately",
  ];
  const matchedKeywords = phishKeywords.filter(k => clean.includes(k));

  // Check brand similarity (exact substring or Levenshtein-like heuristic)
  const matchedBrands: string[] = [];
  for (const brand of POPULAR_BRANDS) {
    // Exact contains
    if (fullLabel.includes(brand) && sld !== brand) {
      matchedBrands.push(brand);
      continue;
    }
    // Typo-squatting: replace common char swaps
    const normalized = fullLabel
      .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e")
      .replace(/4/g, "a").replace(/5/g, "s").replace(/-/g, "");
    if (normalized.includes(brand) && sld !== brand) {
      matchedBrands.push(brand);
    }
  }

  // Character homoglyph check
  const homoglyphs: Record<string, string[]> = {
    "rn": ["m"], "vv": ["w"], "cl": ["d"], "l1": ["li"], "0": ["o"],
  };
  let hasHomoglyphs = false;
  for (const [combo] of Object.entries(homoglyphs)) {
    if (clean.includes(combo)) { hasHomoglyphs = true; break; }
  }

  // Domain length score
  const domainLength = clean.length;

  return {
    clean, tld, sld, subdomain, fullLabel,
    isSuspiciousTld,
    hasDigits, digitCount,
    hyphenCount,
    matchedKeywords,
    matchedBrands,
    hasHomoglyphs,
    domainLength,
    hasDeepSubdomain: parts.length > 4,
  };
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  return `You are an elite cybersecurity threat intelligence AI specialized in predicting whether newly registered or suspicious domains will be used for phishing, fraud, or social engineering attacks.

You will receive a domain name and its pre-analyzed structural features. Your job is to evaluate 6 threat signals and output a JSON prediction.

IMPORTANT: Respond ONLY with a valid JSON object — no markdown, no explanation, no code fences.

Required JSON schema:
{
  "predictionScore": <integer 0-100, overall phishing risk>,
  "threatLevel": <"SAFE"|"SUSPICIOUS"|"HIGH_RISK"|"CRITICAL">,
  "signals": {
    "domainAge": {
      "score": <integer 0-10>,
      "detail": "<concise 1-sentence assessment>",
      "riskFlag": <true|false>
    },
    "registrar": {
      "score": <integer 0-10>,
      "detail": "<concise 1-sentence assessment>",
      "riskFlag": <true|false>
    },
    "namingPattern": {
      "score": <integer 0-10>,
      "detail": "<concise 1-sentence assessment>",
      "riskFlag": <true|false>
    },
    "ssl": {
      "score": <integer 0-10>,
      "detail": "<concise 1-sentence assessment>",
      "riskFlag": <true|false>
    },
    "hosting": {
      "score": <integer 0-10>,
      "detail": "<concise 1-sentence assessment>",
      "riskFlag": <true|false>
    },
    "brandSimilarity": {
      "score": <integer 0-10>,
      "detail": "<concise 1-sentence assessment>",
      "riskFlag": <true|false>,
      "matchedBrand": "<brand name or null>"
    }
  },
  "redFlags": ["<string>", ...],
  "safeFactors": ["<string>", ...],
  "recommendation": "<2-3 sentence plain English advice for the user>",
  "confidence": <"HIGH"|"MEDIUM"|"LOW">
}

Scoring guidance:
- predictionScore 0–20 → SAFE
- predictionScore 21–50 → SUSPICIOUS
- predictionScore 51–75 → HIGH_RISK
- predictionScore 76–100 → CRITICAL

Signal scoring (0=no risk, 10=maximum risk):
- domainAge: Newly registered domains (<30 days) are very high risk. Domains >2 years are low risk. You can infer from the TLD, structure, and known patterns.
- registrar: Budget/free registrars (Freenom, Namecheap abuse, GoDaddy low-cost) = higher risk. Premium business registrars = lower risk.
- namingPattern: Phishing keywords, excessive hyphens, digits substituting letters, deep subdomains = high risk.
- ssl: Free Let's Encrypt certs on new domains = moderate risk (widely abused by phishers). Established domains with EV certs = low risk.
- hosting: Bulletproof hosting, VPS from sanctioned regions, shared hosting = moderate-high risk. Known CDNs (Cloudflare, Akamai) can go either way.
- brandSimilarity: Domain deliberately resembles a well-known brand (typosquatting, added prefixes/suffixes) = very high risk.

Be thorough but concise. Real domains like google.com, apple.com should score <10. Obvious phishing-pattern domains should score >75.`;
}

// ─── OpenRouter call with model fallback ─────────────────────────────────────
async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  models: string[]
): Promise<{ content: string; modelUsed: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  for (const model of models) {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://scanradar.app",
          "X-Title": "ScanRadar Domain Predict",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userMessage },
          ],
          temperature: 0.15,
          max_tokens:  1200,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.warn(`Model ${model} failed (${response.status}): ${err}`);
        continue;
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        model?: string;
      };

      const content = data?.choices?.[0]?.message?.content;
      if (!content) continue;

      return { content, modelUsed: data.model || model };
    } catch (err) {
      console.warn(`Model ${model} threw:`, err);
    }
  }
  throw new Error("All AI models failed. Please try again later.");
}

// ─── Parse AI response ────────────────────────────────────────────────────────
function parseAIResponse(raw: string): Omit<DomainPrediction, "domain" | "modelUsed"> {
  // Strip markdown fences if present
  const cleaned = raw.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // Validate required fields
  if (typeof parsed.predictionScore !== "number") throw new Error("Missing predictionScore");
  if (!["SAFE","SUSPICIOUS","HIGH_RISK","CRITICAL"].includes(parsed.threatLevel)) {
    throw new Error("Invalid threatLevel");
  }

  return {
    predictionScore: Math.max(0, Math.min(100, Math.round(parsed.predictionScore))),
    threatLevel:     parsed.threatLevel,
    signals: {
      domainAge:       parsed.signals?.domainAge       ?? { score: 5, detail: "Unknown", riskFlag: false },
      registrar:       parsed.signals?.registrar       ?? { score: 5, detail: "Unknown", riskFlag: false },
      namingPattern:   parsed.signals?.namingPattern   ?? { score: 5, detail: "Unknown", riskFlag: false },
      ssl:             parsed.signals?.ssl             ?? { score: 5, detail: "Unknown", riskFlag: false },
      hosting:         parsed.signals?.hosting         ?? { score: 5, detail: "Unknown", riskFlag: false },
      brandSimilarity: parsed.signals?.brandSimilarity ?? { score: 0, detail: "No brand match", riskFlag: false },
    },
    redFlags:       Array.isArray(parsed.redFlags)    ? parsed.redFlags    : [],
    safeFactors:    Array.isArray(parsed.safeFactors) ? parsed.safeFactors : [],
    recommendation: parsed.recommendation || "Exercise caution with this domain.",
    confidence:     ["HIGH","MEDIUM","LOW"].includes(parsed.confidence) ? parsed.confidence : "MEDIUM",
  };
}

// ─── POST /api/domain-predict ──────────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { domain } = req.body as { domain?: string };

    if (!domain || typeof domain !== "string" || domain.trim().length < 2) {
      return res.status(400).json({ error: "A valid domain is required." });
    }

    // Strip protocol and paths for analysis
    const cleanDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim();

    if (!/^[a-z0-9._-]+\.[a-z]{2,}$/.test(cleanDomain)) {
      return res.status(400).json({ error: "Invalid domain format. Example: paypal-secure.xyz" });
    }

    // Extract structural features (no external calls needed — pure heuristics)
    const features = extractDomainFeatures(cleanDomain);

    // Build user message with features injected so the AI has rich context
    const userMessage = `Analyze this domain for phishing/fraud prediction:

Domain: ${cleanDomain}

Pre-computed structural features:
- TLD: .${features.tld} (suspicious TLD: ${features.isSuspiciousTld})
- Second-level domain: ${features.sld}
- Subdomain: ${features.subdomain || "(none)"}
- Domain length: ${features.domainLength} characters
- Contains digits: ${features.hasDigits} (count: ${features.digitCount})
- Hyphen count: ${features.hyphenCount}
- Deep subdomain nesting: ${features.hasDeepSubdomain}
- Matched phishing keywords: [${(features.matchedKeywords as string[]).join(", ") || "none"}]
- Brand name substrings detected: [${(features.matchedBrands as string[]).join(", ") || "none"}]
- Homoglyph characters detected: ${features.hasHomoglyphs}

Using these features and your knowledge, provide the threat prediction JSON.`;

    const systemPrompt = buildSystemPrompt();
    const { content, modelUsed } = await callOpenRouter(systemPrompt, userMessage, TEXT_MODELS);

    let parsed: Omit<DomainPrediction, "domain" | "modelUsed">;
    try {
      parsed = parseAIResponse(content);
    } catch (parseErr) {
      console.error("AI parse error:", parseErr, "\nRaw response:", content);
      return res.status(502).json({
        error: "AI returned an unexpected format. Please try again.",
      });
    }

    const result: DomainPrediction = {
      domain: cleanDomain,
      ...parsed,
      modelUsed,
    };

    return res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Domain Predict Error:", error);
    return res.status(500).json({ error: msg });
  }
});

export default router;
