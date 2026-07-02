import { NextResponse } from "next/server";
import { createClient } from "@/backend/db/server";

// ─── OpenRouter Config ────────────────────────────────────────────────────────
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Verified live free models from OpenRouter (checked 2026-06-22).
// Ordered by capability — fallback chain tries each in order on 429/empty.
const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",   // Best quality free instruct model
  "nousresearch/hermes-3-llama-3.1-405b:free", // 405B — excellent fallback
  "nvidia/nemotron-3-super-120b-a12b:free",    // NVIDIA 120B
  "google/gemma-4-31b-it:free",               // Google Gemma 4 31B
  "qwen/qwen3-next-80b-a3b-instruct:free",    // Qwen 80B instruct
  "meta-llama/llama-3.2-3b-instruct:free",    // Small but always available
  "openai/gpt-oss-20b:free",                  // OpenAI OSS 20B (smaller, more available)
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

2. For ALL other questions (passwords, VPNs, 2FA, data brokers, general questions, follow-ups, etc.) — respond as plain conversational text with markdown formatting. Be helpful, direct, and thorough. Use bullet points and bold headings when appropriate.

IMPORTANT RULES:
- Never refuse to answer a question — you can handle any privacy or security topic
- Never make up specific user data — only analyze what the user explicitly tells you
- If someone greets you or asks something general, respond naturally and helpfully
- Always recommend stronger privacy protections when uncertain
- For analysis requests, produce at least 4-6 recommendations
- Be conversational and encouraging, not robotic`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── Try one model ─────────────────────────────────────────────────────────────
// Returns { reply, model } on success.
// Throws a descriptive error on rate-limit (429), empty content, or any other failure.
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

  console.log(`[OpenRouter] ${model} → HTTP ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`[OpenRouter] ${model} HTTP ${response.status}: ${errorText}`);
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  // OpenRouter sometimes embeds an error inside a 200 response (e.g. provider-level rate limits)
  if (data.error) {
    const errMsg =
      typeof data.error === "object"
        ? `${data.error.message ?? JSON.stringify(data.error)} (code: ${data.error.code ?? "unknown"})`
        : String(data.error);
    console.warn(`[OpenRouter] ${model} embedded error: ${errMsg}`);
    throw new Error(errMsg);
  }

  const choice = data.choices?.[0];
  // Some reasoning models return content in message.reasoning rather than message.content
  const reply = choice?.message?.content || choice?.message?.reasoning;

  if (!reply) {
    const finishReason = choice?.finish_reason ?? "unknown";
    console.warn(
      `[OpenRouter] ${model} returned empty content. finish_reason="${finishReason}". Raw: ${JSON.stringify(data).slice(0, 300)}`
    );
    throw new Error(`Empty content (finish_reason: "${finishReason}")`);
  }

  console.log(
    `[OpenRouter] ✓ ${model} succeeded — ${reply.length} chars`
  );
  return { reply, model };
}

// ─── Core API Call with verified fallback chain ───────────────────────────────
async function callOpenRouter(
  messages: Message[]
): Promise<{ reply: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // [DEBUG] API key loaded status
  console.log(
    "[OpenRouter] API key loaded:",
    apiKey
      ? `YES (starts with ${apiKey.slice(0, 12)}...)`
      : "NO — OPENROUTER_API_KEY is missing from .env.local"
  );

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in .env.local");
  }

  const errors: string[] = [];

  for (const model of FREE_MODELS) {
    try {
      return await tryModel(apiKey, model, messages);
    } catch (err: any) {
      errors.push(`[${model}] ${err.message}`);
      console.warn(`[OpenRouter] Skipping to next model...`);
    }
  }

  // All models failed — return a clear, concise error (not the raw wall of JSON)
  throw new Error(
    `All ${FREE_MODELS.length} free models are currently unavailable or rate-limited. ` +
    `Please try again in a few seconds. Errors:\n` +
    errors.map((e, i) => `${i + 1}. ${e}`).join("\n")
  );
}

// ─── GET: Load chat history ───────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("advisor_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("DB fetch error:", error.message);
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({ messages: data || [] });
  } catch (err) {
    console.error("Advisor GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ─── POST: Send message to ScanAI ────────────────────────────────────────────
export async function POST(request: Request) {
  let supabase: any = null;
  let userId: string | null = null;
  let userMessage = "";

  try {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    userId = user.id;
    const body = await request.json();
    const { message, history } = body;
    userMessage = message?.trim() || "";

    if (!userMessage) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // [DEBUG] Confirm API key presence
    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log("[Advisor POST] OPENROUTER_API_KEY present:", !!apiKey);

    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error: OPENROUTER_API_KEY is not set in .env.local" },
        { status: 500 }
      );
    }

    // Build the messages array for OpenRouter
    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history || []).slice(-10).map((h: any) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: userMessage },
    ];

    // ── Try fallback chain — no demo fallback ──────────────────────────────────
    const { reply, model: usedModel } = await callOpenRouter(messages);
    console.log(`[Advisor POST] Success using model: ${usedModel}`);
    await saveMessages(supabase, userId!, userMessage, reply);
    return NextResponse.json({ reply, isDemo: false, model: usedModel });
  } catch (err: any) {
    console.error("[Advisor POST] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Unknown server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Clear conversation ───────────────────────────────────────────────
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await supabase
      .from("advisor_conversations")
      .delete()
      .eq("user_id", user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Advisor DELETE error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ─── Helper: save messages to DB ─────────────────────────────────────────────
async function saveMessages(
  supabase: any,
  userId: string,
  userMsg: string,
  aiMsg: string
) {
  try {
    await supabase.from("advisor_conversations").insert([
      { user_id: userId, role: "user", content: userMsg },
      { user_id: userId, role: "assistant", content: aiMsg },
    ]);
  } catch (e) {
    console.error("Failed to save messages:", e);
  }
}
