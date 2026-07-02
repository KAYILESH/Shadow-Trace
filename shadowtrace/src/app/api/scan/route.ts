import { NextResponse } from "next/server";
import { createClient } from "@/backend/db/server";

const PLATFORMS = [
  { name: "GitHub",    urlTemplate: "https://github.com/{username}" },
  { name: "Reddit",   urlTemplate: "https://www.reddit.com/user/{username}/about.json" },
  { name: "Pinterest",urlTemplate: "https://www.pinterest.com/{username}/" },
  { name: "Instagram",urlTemplate: "https://www.instagram.com/{username}/" },
  { name: "Twitter",  urlTemplate: "https://x.com/{username}" },
];

// ─── GET: Fetch user's scan history ──────────────────────────────────────────
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
      .from("scans")
      .select("id, target_username, results, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Supabase fetch error:", error.message);
      return NextResponse.json({ scans: [] });
    }

    return NextResponse.json({ scans: data || [] });
  } catch (error) {
    console.error("Scan GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ─── POST: Run a new scan ─────────────────────────────────────────────────────
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
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Prepare promises for concurrent checking
    const checkPromises = PLATFORMS.map(async (platform) => {
      const url = platform.urlTemplate.replace("{username}", username);
      const displayUrl = url.replace("/about.json", ""); // Clean up Reddit URL for display

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/json,application/xhtml+xml,application/xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
          // 5-second timeout to prevent hanging
          signal: AbortSignal.timeout(5000),
        });

        if (response.status === 200) {
          return { platform: platform.name, profileUrl: displayUrl, status: "FOUND" };
        } else if (response.status === 404) {
          return { platform: platform.name, profileUrl: displayUrl, status: "NOT_FOUND" };
        } else {
          return { platform: platform.name, profileUrl: displayUrl, status: "ERROR" };
        }
      } catch {
        return { platform: platform.name, profileUrl: displayUrl, status: "ERROR" };
      }
    });

    // Wait for all checks to complete
    const scanResults = await Promise.all(checkPromises);

    // Save the scan to Supabase
    const { data: scanRecord, error: dbError } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        target_username: username,
        results: scanResults,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
    }

    // ── Auto-create a real notification for this scan ─────────────────────────
    const foundCount = scanResults.filter((r) => r.status === "FOUND").length;
    const foundPlatforms = scanResults
      .filter((r) => r.status === "FOUND")
      .map((r) => r.platform);

    const notifMessage = foundCount === 0
      ? `Scan for "${username}" is complete. No exposed profiles found across ${scanResults.length} platforms — you look clean!`
      : `Scan for "${username}" found profiles on ${foundCount} platform${foundCount > 1 ? "s" : ""}: ${foundPlatforms.slice(0, 3).join(", ")}${foundPlatforms.length > 3 ? ` and ${foundPlatforms.length - 3} more` : ""}. Review and take action.`;

    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "scan_completed",
      title: foundCount === 0
        ? `Scan Complete — @${username} is Clean`
        : `Scan Alert — @${username} Found on ${foundCount} Platform${foundCount > 1 ? "s" : ""}`,
      message: notifMessage,
      metadata: { username, foundCount, foundPlatforms },
      is_read: false,
    });
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      username,
      results: scanResults,
      scanId: scanRecord?.id,
    });
  } catch (error) {
    console.error("Scan API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
