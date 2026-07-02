import { NextResponse } from "next/server";
import { createClient } from "@/backend/db/server";

// GET: Fetch all deletion progress for current user
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
      .from("account_deletions")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      // If the table doesn't exist yet, return an empty array gracefully
      console.error("Supabase fetch error:", error.message);
      return NextResponse.json({ deletions: [] });
    }

    return NextResponse.json({ deletions: data || [] });
  } catch (error) {
    console.error("Deletions GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Upsert (save or update) a single platform deletion status
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
    const { platform, completed } = body;

    if (!platform) {
      return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("account_deletions")
      .upsert(
        {
          user_id: user.id,
          platform,
          completed: completed ?? false,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,platform" }
      )
      .select()
      .single();

    if (error) {
      console.error("Supabase upsert error:", error.message);
      return NextResponse.json({ success: true, saved: false, message: error.message });
    }

    // ── Auto-create a notification when a platform is marked as deleted ────────
    if (completed) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "deletion_reminder",
        title: `✅ ${platform} Account Deletion Marked Complete`,
        message: `You've marked your ${platform} account deletion as complete. Great step toward reducing your digital footprint! Note that some platforms take up to 90 days to fully purge your data.`,
        metadata: { platform, completed: true },
        is_read: false,
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, saved: true, deletion: data });

  } catch (error) {
    console.error("Deletions POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
