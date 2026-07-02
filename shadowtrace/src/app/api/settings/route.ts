import { NextResponse } from "next/server";
import { createClient } from "@/backend/db/server";

// ── GET: Fetch user profile settings ─────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      email:        user.email,
      created_at:   user.created_at,
      last_sign_in: user.last_sign_in_at,
      profile:      profile || {},
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ── PATCH: Update user profile settings ──────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      full_name,
      avatar_config,
      bio,
      notify_scan_complete,
      notify_breach_alert,
      notify_weekly_digest,
      profile_public,
    } = body;

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id:                   user.id,
        email:                user.email,
        full_name:            full_name            ?? null,
        avatar_config:        avatar_config        ?? null,
        bio:                  bio                  ?? null,
        notify_scan_complete: notify_scan_complete ?? true,
        notify_breach_alert:  notify_breach_alert  ?? true,
        notify_weekly_digest: notify_weekly_digest ?? false,
        profile_public:       profile_public       ?? false,
        updated_at:           new Date().toISOString(),
      }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile update error:", profileError.message);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Settings PATCH error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
