import { Router, Response } from "express";
import { supabaseAdmin } from "../db/supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── OpenRouter Config ────────────────────────────────────────────────────────
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "openai/gpt-oss-20b:free",
];

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are ScanAI — an elite AI Privacy Advisor embedded inside ScanRadar, a digital privacy and threat-detection platform.

Your persona: You are precise, direct, and deeply knowledgeable about data privacy, cybersecurity, digital footprint reduction, OSINT (Open Source Intelligence), and online safety. You speak with authority but always explain concepts clearly.

Your capabilities:
- Analyze a user's digital privacy footprint based on what they share with you
- Identify specific risks: data broker exposure, social media oversharing, account vulnerabilities, password hygiene, phishing, etc.
- Generate structured Privacy Risk Summaries with actionable steps
- Provide ranked, prioritized Privacy Recommendations (CRITICAL, HIGH, MEDIUM, LOW)
- Suggest specific cleanup actions: account deletions, privacy settings to change, data broker opt-outs
- Answer ALL questions about privacy, security, VPNs, password managers, 2FA, encryption, dark web, data breaches, digital safety, or any general topic
- You are conversational and helpful — if someone asks something general, just answer it helpfully

RESPONSE FORMAT RULES:
1. When the user asks you to ANALYZE their privacy, digital footprint, or risk score — respond ONLY with this JSON (no extra text before or after):
{
  "type": "analysis",
  "riskSummary": {
    "overallRisk": "HIGH | MEDIUM | LOW",
    "score": <number 0-100>,
    "headline": "One-line summary of their risk",
    "details": "2-3 sentence detailed assessment"
  },
  "recommendations": [
    {
      "id": "unique_id",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "title": "Short action title",
      "description": "What the risk is and why it matters",
      "action": "The exact step to take to fix this",
      "category": "Accounts | Data Brokers | Passwords | Social Media | Devices | Email"
    }
  ],
  "cleanupSuggestions": [
    {
      "platform": "Platform name",
      "action": "Specific cleanup action",
      "priority": "URGENT | SOON | EVENTUALLY"
    }
  ],
  "message": "A personalized, motivating message summarizing their situation and encouraging action"
}

2. For ALL other questions — respond as plain conversational text with markdown formatting.

IMPORTANT RULES:
- Never refuse to answer a question
- Never make up specific user data
- Always recommend stronger privacy protections when uncertain
- For analysis requests, produce at least 4-6 recommendations`;

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

async function tryModel(
  apiKey: string,
  model: string,
  messages: Message[]
): Promise<{ reply: string; model: string }> {
  console.log(`[OpenRouter] Trying model: ${model}`);

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://scanradar.app",
      "X-Title": "ScanRadar AI Advisor",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any;

  if (data.error) {
    const errMsg =
      typeof data.error === "object"
        ? `${data.error.message ?? JSON.stringify(data.error)} (code: ${data.error.code ?? "unknown"})`
        : String(data.error);
    throw new Error(errMsg);
  }

  const choice = data.choices?.[0];
  const reply = choice?.message?.content || choice?.message?.reasoning;

  if (!reply) {
    throw new Error(`Empty content (finish_reason: "${choice?.finish_reason ?? "unknown"}")`);
  }

  return { reply, model };
}

async function callOpenRouter(messages: Message[]): Promise<{ reply: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const errors: string[] = [];

  for (const model of FREE_MODELS) {
    try {
      return await tryModel(apiKey, model, messages);
    } catch (err: unknown) {
      errors.push(`[${model}] ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    `All ${FREE_MODELS.length} free models are unavailable. Errors:\n` +
      errors.map((e, i) => `${i + 1}. ${e}`).join("\n")
  );
}

// ─── GET: Load chat history ───────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("advisor_conversations")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("DB fetch error:", error.message);
      return res.json({ messages: [] });
    }

    return res.json({ messages: data || [] });
  } catch (err) {
    console.error("Advisor GET error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST: Send message to ScanAI ────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { message, history } = req.body;
    const userMessage = message?.trim() || "";

    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server configuration error: OPENROUTER_API_KEY is not set" });
    }

    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history || []).slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: userMessage },
    ];

    const { reply, model: usedModel } = await callOpenRouter(messages);

    // Save messages to DB
    try {
      await supabaseAdmin.from("advisor_conversations").insert([
        { user_id: req.userId!, role: "user", content: userMessage },
        { user_id: req.userId!, role: "assistant", content: reply },
      ]);
    } catch (e) {
      console.error("Failed to save messages:", e);
    }

    return res.json({ reply, isDemo: false, model: usedModel });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    console.error("[Advisor POST] Error:", message);
    return res.status(500).json({ error: message });
  }
});

// ─── DELETE: Clear conversation ───────────────────────────────────────────────
router.delete("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await supabaseAdmin
      .from("advisor_conversations")
      .delete()
      .eq("user_id", req.userId!);

    return res.json({ success: true });
  } catch (err) {
    console.error("Advisor DELETE error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
