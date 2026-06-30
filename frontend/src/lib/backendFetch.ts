/**
 * src/lib/backendFetch.ts
 * Drop-in replacement for fetch() that:
 *  1. Prepends NEXT_PUBLIC_BACKEND_URL to relative /api/* paths
 *  2. Attaches the Supabase Bearer token to the Authorization header
 *
 * Usage: import { backendFetch } from "@/lib/backendFetch";
 * Then replace: fetch("/api/scan", ...)
 * With:         backendFetch("/api/scan", ...)
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

async function getToken(): Promise<string | null> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function backendFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getToken();

  const existingHeaders = (init.headers || {}) as Record<string, string>;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...existingHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Prepend backend URL to relative /api/ paths
  const url = path.startsWith("/api/") ? `${BACKEND_URL}${path}` : path;

  return fetch(url, { ...init, headers });
}
