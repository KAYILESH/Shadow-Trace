/**
 * backend/services/advisor.service.ts
 * AI Privacy Advisor — chat history persistence & demo response generator.
 * Called by: src/app/api/advisor/route.ts
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Save a user/assistant message pair ────────────────────────────────────────
export async function saveMessages(
  supabase: SupabaseClient,
  userId: string,
  userMsg: string,
  aiMsg: string
) {
  try {
    await supabase.from("advisor_conversations").insert([
      { user_id: userId, role: "user",      content: userMsg },
      { user_id: userId, role: "assistant", content: aiMsg   },
    ]);
  } catch (e) {
    console.error("Failed to save advisor messages:", e);
  }
}

// ── Fetch conversation history ────────────────────────────────────────────────
export async function getConversationHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from("advisor_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("DB fetch error:", error.message);
    return [];
  }
  return data || [];
}

// ── Clear a user's conversation ───────────────────────────────────────────────
export async function clearConversation(
  supabase: SupabaseClient,
  userId: string
) {
  await supabase
    .from("advisor_conversations")
    .delete()
    .eq("user_id", userId);
}

// ── Demo response generator (used when no API key is set) ────────────────────
export function generateDemoResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("analyz") || lower.includes("scan") || lower.includes("footprint") || lower.includes("assess")) {
    return JSON.stringify({
      type: "analysis",
      riskSummary: {
        overallRisk: "HIGH",
        score: 72,
        headline: "Significant digital exposure detected across multiple vectors",
        details: "Your digital footprint reveals substantial exposure across social media platforms, potential data broker listings, and weak account hygiene. Immediate action is recommended on at least 3 critical areas."
      },
      recommendations: [
        {
          id: "rec_1", severity: "CRITICAL",
          title: "Enable 2FA on All Critical Accounts",
          description: "Without two-factor authentication, accounts are vulnerable to credential stuffing attacks.",
          action: "Enable authenticator app 2FA (not SMS) on email, banking, and social accounts.",
          category: "Accounts"
        },
        {
          id: "rec_2", severity: "HIGH",
          title: "Opt-Out from Data Brokers",
          description: "Your name, address and phone are likely listed on 50+ data broker sites.",
          action: "Submit opt-out requests to Spokeo, WhitePages, BeenVerified, and Intelius.",
          category: "Data Brokers"
        },
        {
          id: "rec_3", severity: "HIGH",
          title: "Audit & Delete Unused Social Accounts",
          description: "Dormant accounts are frequently harvested in data breaches.",
          action: "Use JustDeleteMe.com to find deletion pages. Priority: accounts unused 6+ months.",
          category: "Social Media"
        },
        {
          id: "rec_4", severity: "MEDIUM",
          title: "Use a Password Manager",
          description: "Reusing passwords means a single breach compromises all your accounts.",
          action: "Switch to Bitwarden (free) or 1Password. Generate unique 16+ character passwords.",
          category: "Passwords"
        }
      ],
      cleanupSuggestions: [
        { platform: "Facebook",   action: "Restrict all posts older than 1 year to 'Only Me'", priority: "URGENT"     },
        { platform: "Google",     action: "Delete Location History in My Activity",             priority: "URGENT"     },
        { platform: "Instagram",  action: "Switch to private, remove phone number from bio",    priority: "SOON"       },
        { platform: "Twitter/X",  action: "Revoke third-party app access",                      priority: "SOON"       },
        { platform: "Reddit",     action: "Delete comments with Shreddit before deletion",      priority: "EVENTUALLY" }
      ],
      message: "⚠️ **ScanAI Assessment Complete.** Your privacy posture is currently HIGH risk. Start with the CRITICAL items — 2FA alone blocks 99.9% of automated account attacks."
    });
  }

  if (lower.includes("password")) {
    return "## Password Security Best Practices\n\n- **Use a password manager**: Bitwarden (free) or 1Password\n- **Unique passwords**: Never reuse across sites\n- **Length over complexity**: 20+ characters beats `P@$$w0rd1!`\n- **Check breaches**: Visit haveibeenpwned.com immediately\n\nWant a personalized security assessment?";
  }

  return "I'm **ScanAI**, your personal AI privacy advisor. I can:\n\n- 🔍 **Analyze your digital footprint**\n- 🛡️ **Generate a risk assessment**\n- 🗑️ **Create a cleanup plan**\n- 💡 **Answer any privacy questions**\n\nTry: *\"Analyze my privacy — I have accounts on Instagram, Reddit, and Twitter.\"*";
}
