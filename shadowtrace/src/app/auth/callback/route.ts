import { createClient } from "@/backend/db/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // ── Auto-save user profile to Supabase ──────────────────────────────
      const fullName =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email?.split("@")[0] || "User";

      await supabase.from("profiles").upsert({
        id:            data.user.id,
        email:         data.user.email,
        full_name:     fullName,
        avatar_url:    data.user.user_metadata?.avatar_url ?? null,
        last_login_at: new Date().toISOString(),
        updated_at:    new Date().toISOString(),
      }, { onConflict: "id" });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}

