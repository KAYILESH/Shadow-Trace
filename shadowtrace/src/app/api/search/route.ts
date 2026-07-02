import { NextResponse } from "next/server";
import { createClient } from "@/backend/db/server";

// GET /api/search?q=someterm
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (!q || q.length < 2) {
      return NextResponse.json({ scans: [], notifications: [] });
    }

    const term = `%${q}%`;

    // ── Search scans by target_username ──────────────────────────────────────
    const { data: scans } = await supabase
      .from("scans")
      .select("id, target_username, platforms_found, total_platforms, created_at")
      .eq("user_id", user.id)
      .ilike("target_username", term)
      .order("created_at", { ascending: false })
      .limit(6);

    // ── Search notifications by title or message ──────────────────────────────
    const { data: notifications } = await supabase
      .from("notifications")
      .select("id, type, title, message, is_read, created_at")
      .eq("user_id", user.id)
      .or(`title.ilike.${term},message.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(6);

    return NextResponse.json({
      scans: scans ?? [],
      notifications: notifications ?? [],
      query: q,
    });
  } catch (err: any) {
    console.error("Search error:", err.message);
    return NextResponse.json({ scans: [], notifications: [] });
  }
}
