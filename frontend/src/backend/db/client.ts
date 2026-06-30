/**
 * src/backend/db/client.ts  (frontend shim)
 * Provides the browser-side Supabase client.
 * Kept at this path so existing imports like @/backend/db/client still resolve.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
