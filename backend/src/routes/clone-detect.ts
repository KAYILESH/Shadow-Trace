import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── OpenRouter Config ────────────────────────────────────────────────────────
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Vision-capable free models — ordered by preference.
// "openrouter/auto" is the smart router that picks any working free vision model.
// Specific fallbacks listed in case the auto-router hits a rate limit.
const VISION_MODELS = [
  "openrouter/auto",                                    // Smart router — best free model available
  "meta-llama/llama-3.2-11b-vision-instruct:free",     // Llama Vision (when available)
  "qwen/qwen2.5-vl-72b-instruct:free",                 // Qwen VL 72B
  "qwen/qwen2.5-vl-7b-instruct:free",                  // Qwen VL 7B (smaller fallback)
  "google/gemini-flash-1.5-8b",                        // Gemini Flash (if user has credit)
  "meta-llama/llama-3.1-8b-instruct:free",             // Text-only last resort (URL analysis)
];


// ─── Types ────────────────────────────────────────────────────────────────────
interface LearningContent {
  whyDangerous:     string;
  redFlagsToNotice: string[];
  howToStaySafe:    string[];
}

interface CloneAnalysisResult {
  similarityScore: number;           // 0–100
  copiedLoginPage: boolean;
  fakeLogoDetected: boolean;
  colorThemeCopied: "Copied" | "Similar" | "Different";
  verdict: "FAKE" | "SUSPICIOUS" | "LEGITIMATE";
  suspiciousElements: string[];
  explanation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  learning: LearningContent | null;  // populated for FAKE/SUSPICIOUS only
}

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
}

// ─── Prompt builder ──────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  return `You are a cybersecurity AI specialized in detecting phishing and clone websites.
Your job: analyze the provided website screenshot and determine if it is a visual clone/phishing copy of a legitimate website.

Respond ONLY with a valid JSON object matching this exact schema (no extra text, no markdown fences):
{
  "similarityScore": <integer 0-100>,
  "copiedLoginPage": <true|false>,
  "fakeLogoDetected": <true|false>,
  "colorThemeCopied": <"Copied"|"Similar"|"Different">,
  "verdict": <"FAKE"|"SUSPICIOUS"|"LEGITIMATE">,
  "suspiciousElements": [<string>, ...],
  "explanation": "<2-3 sentence plain text summary>",
  "confidence": <"HIGH"|"MEDIUM"|"LOW">,
  "learning": <null if LEGITIMATE, or object if FAKE/SUSPICIOUS>:
  {
    "whyDangerous": "<2-3 sentences explaining the specific threat this site poses and what attackers are trying to steal>",
    "redFlagsToNotice": ["<specific red flag found in THIS site>", ...],
    "howToStaySafe": ["<actionable safety tip relevant to this attack type>", ...]
  }
}

Scoring guidance:
- similarityScore 85-100 → likely FAKE
- similarityScore 50-84  → SUSPICIOUS
- similarityScore 0-49   → LEGITIMATE

Look for: misspelled domain hints in URL bars, pixelated logos, inconsistent fonts, copied color palettes, generic login forms, suspicious SSL indicators, overlapping text, off-brand icons.

For the learning block (FAKE/SUSPICIOUS only):
- whyDangerous: Reference the specific brand being impersonated and the data at risk (credentials, payment info, etc.)
- redFlagsToNotice: List 3-5 concrete, specific visual or technical cues found IN THIS SITE (e.g. "The logo is pixelated and slightly off-color", "The URL bar shows 'paypa1.com' instead of 'paypal.com'")
- howToStaySafe: List 3-5 actionable steps tailored to this attack type (e.g. "Never enter your PayPal password on any site other than paypal.com")

If no URL is provided, rely purely on visual analysis of the screenshot.
If no screenshot is provided (URL only), analyze based on the URL structure for phishing patterns.`;
}

function buildUserMessage(
  suspectedUrl: string,
  originalUrl: string,
  screenshotBase64?: string
): OpenRouterMessage {
  const textContent = [
    suspectedUrl
      ? `Suspected website URL: ${suspectedUrl}`
      : "No URL provided.",
    originalUrl
      ? `Original/genuine website to compare against: ${originalUrl}`
      : "No original URL provided — use visual analysis only.",
    "Please analyze this website for signs of phishing or visual cloning.",
  ].join("\n");

  if (screenshotBase64) {
    // Vision model request — include the image
    const dataUrl = screenshotBase64.startsWith("data:")
      ? screenshotBase64
      : `data:image/png;base64,${screenshotBase64}`;

    return {
      role: "user",
      content: [
        { type: "text", text: textContent },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    };
  }

  // Text-only fallback
  return { role: "user", content: textContent };
}

// ─── Try one model ────────────────────────────────────────────────────────────
async function tryModel(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[]
): Promise<CloneAnalysisResult> {
  console.log(`[CloneDetect] Trying model: ${model}`);

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://scanradar.app",
      "X-Title": "ScanRadar Clone Detector",
    },
    body: JSON.stringify({ model, messages, max_tokens: 1200 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HTTP ${response.status}: ${err}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any;
  if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));

  const raw: string = data.choices?.[0]?.message?.content ?? "";
  if (!raw.trim()) throw new Error("Empty response from model");

  // Extract JSON even if model wraps it in markdown fences
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in model response");

  const parsed = JSON.parse(jsonMatch[0]) as Partial<CloneAnalysisResult>;

  // Validate and normalise
  const verdict = parsed.verdict ?? "SUSPICIOUS";

  // Extract learning content (only meaningful for FAKE/SUSPICIOUS)
  let learning: LearningContent | null = null;
  if (verdict !== "LEGITIMATE" && parsed.learning && typeof parsed.learning === "object") {
    const l = parsed.learning as Partial<LearningContent>;
    learning = {
      whyDangerous:     typeof l.whyDangerous === "string" ? l.whyDangerous : "This site appears to be designed to steal your personal information.",
      redFlagsToNotice: Array.isArray(l.redFlagsToNotice) ? l.redFlagsToNotice.slice(0, 6) : [],
      howToStaySafe:    Array.isArray(l.howToStaySafe)    ? l.howToStaySafe.slice(0, 6)    : [],
    };
  }

  return {
    similarityScore: typeof parsed.similarityScore === "number"
      ? Math.min(100, Math.max(0, parsed.similarityScore))
      : 50,
    copiedLoginPage:   parsed.copiedLoginPage   ?? false,
    fakeLogoDetected:  parsed.fakeLogoDetected  ?? false,
    colorThemeCopied:  parsed.colorThemeCopied  ?? "Different",
    verdict,
    suspiciousElements: Array.isArray(parsed.suspiciousElements)
      ? parsed.suspiciousElements.slice(0, 8)
      : [],
    explanation: parsed.explanation ?? "Analysis complete.",
    confidence:  parsed.confidence  ?? "MEDIUM",
    learning,
  };
}

// ─── POST /api/clone-detect ───────────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    screenshotBase64,   // base64 image string (with or without data: prefix)
    suspectedUrl = "",  // URL of the suspected fake site
    originalUrl  = "",  // URL of the genuine site (optional)
  } = req.body as {
    screenshotBase64?: string;
    suspectedUrl?: string;
    originalUrl?: string;
  };

  if (!screenshotBase64 && !suspectedUrl) {
    res.status(400).json({
      error: "Provide at least a screenshot or a suspected URL.",
    });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OpenRouter API key is not configured." });
    return;
  }

  const systemMessage: OpenRouterMessage = {
    role: "system",
    content: buildSystemPrompt(),
  };
  const userMessage = buildUserMessage(suspectedUrl, originalUrl, screenshotBase64);
  const messages = [systemMessage, userMessage];

  // Try each vision model in order, fall back on rate-limit or error
  let lastError = "";
  let triedTextFallback = false;

  for (const model of VISION_MODELS) {
    try {
      const result = await tryModel(apiKey, model, messages);
      console.log(`[CloneDetect] Success using model: ${model}`);
      res.json({ ...result, modelUsed: model });
      return;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[CloneDetect] Model ${model} failed: ${lastError}`);

      // Stop early only on auth errors
      if (lastError.includes("401") || lastError.includes("403")) break;

      // If image not supported and we haven't tried text-only yet, switch to text-only
      if (
        !triedTextFallback &&
        screenshotBase64 &&
        suspectedUrl &&
        (lastError.includes("image") || lastError.includes("vision") || lastError.includes("multimodal"))
      ) {
        triedTextFallback = true;
        console.log("[CloneDetect] Switching to text-only (URL-based) analysis...");
        const textOnlyMsg = buildUserMessage(suspectedUrl, originalUrl, undefined);
        messages[1] = textOnlyMsg;
      }
    }
  }

  console.error("[CloneDetect] All models exhausted. Last error:", lastError);
  res.status(502).json({
    error: "AI analysis unavailable right now. Please try again shortly.",
    detail: lastError,
  });
});


export default router;
