import { NextResponse } from "next/server";
import { createClient } from "@/backend/db/server";

// POST /api/profile  — upsert user profile after login/register
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User";

    const { error } = await supabase.from("profiles").upsert({
      id:            user.id,
      email:         user.email,
      full_name:     fullName,
      avatar_url:    user.user_metadata?.avatar_url ?? null,
      last_login_at: new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    }, { onConflict: "id" });

    if (error) {
      console.error("Profile upsert error:", error.message);
      // Don't fail the request — profile save is best-effort
    }

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err: any) {
    console.error("Profile POST error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET /api/profile  — fetch current user's profile
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
      profile: profile ?? {
        id:        user.id,
        email:     user.email,
        full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0],
        plan:      "free",
      },
    });
  } catch (err: any) {
    console.error("Profile GET error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
