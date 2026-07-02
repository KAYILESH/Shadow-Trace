import { NextResponse } from "next/server";
import { createClient } from "@/backend/db/server";

// ─── GET: Fetch latest saved risk score + factors ─────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("risk_scores")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // No saved risk score yet — return empty state
      return NextResponse.json({ riskScore: null });
    }

    return NextResponse.json({ riskScore: data });
  } catch (error) {
    console.error("Risk GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ─── POST: Save a new risk score ──────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { score, riskLevel, factors } = body;

    if (score === undefined || !riskLevel) {
      return NextResponse.json(
        { error: "Score and riskLevel are required" },
        { status: 400 }
      );
    }

    const { data: record, error: dbError } = await supabase
      .from("risk_scores")
      .insert({
        user_id: user.id,
        score,
        risk_level: riskLevel,
        factors: factors || {},
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json(
        { error: "Failed to save score" },
        { status: 500 }
      );
    }

    // ── Auto-create a real notification for the risk save ─────────────────────
    const riskEmoji = riskLevel === "High" ? "🔴" : riskLevel === "Medium" ? "🟡" : "🟢";
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "risk_increased",
      title: `${riskEmoji} Privacy Risk Score Updated — ${riskLevel} Risk (${score}/100)`,
      message: `Your privacy risk score has been assessed at ${score}/100 (${riskLevel} Risk). ${
        riskLevel === "High"
          ? "Immediate action is recommended. Review your exposed data factors and take steps to reduce your digital footprint."
          : riskLevel === "Medium"
          ? "You have some exposure. Consider addressing the flagged factors to reduce your risk score."
          : "Great job! Your privacy risk is low. Keep monitoring regularly to maintain this status."
      }`,
      metadata: { score, riskLevel, factors },
      is_read: false,
    });
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      data: record,
    });

  } catch (error) {
    console.error("Risk API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
