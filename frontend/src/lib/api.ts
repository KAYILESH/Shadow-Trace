/**
 * src/lib/api.ts
 * Centralized API client for calling the ScanRadar Express backend.
 * All fetch calls from frontend components should use these helpers.
 *
 * The backend URL is set via NEXT_PUBLIC_BACKEND_URL environment variable.
 * In development: http://localhost:3001
 * In production:  https://your-backend.onrender.com
 */

import { createBrowserClient } from "@supabase/ssr";

// ── Backend base URL ──────────────────────────────────────────────────────────
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// ── Get the current user's JWT access token from Supabase ────────────────────
async function getAccessToken(): Promise<string | null> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// ── Generic fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ── Typed API helpers ─────────────────────────────────────────────────────────

export const api = {
  // Advisor
  advisor: {
    getHistory: () => apiFetch("/api/advisor"),
    sendMessage: (message: string, history: unknown[]) =>
      apiFetch("/api/advisor", {
        method: "POST",
        body: JSON.stringify({ message, history }),
      }),
    clearHistory: () => apiFetch("/api/advisor", { method: "DELETE" }),
  },

  // Scan
  scan: {
    getHistory: () => apiFetch("/api/scan"),
    run: (username: string) =>
      apiFetch("/api/scan", {
        method: "POST",
        body: JSON.stringify({ username }),
      }),
  },

  // Phone Scan
  phoneScan: {
    run: (phone: string) =>
      apiFetch("/api/phone-scan", {
        method: "POST",
        body: JSON.stringify({ phone }),
      }),
  },

  // Identity Scan
  identityScan: {
    run: (email: string, name?: string) =>
      apiFetch("/api/identity-scan", {
        method: "POST",
        body: JSON.stringify({ email, name }),
      }),
  },

  // Risk Score
  risk: {
    get: () => apiFetch("/api/risk"),
    save: (score: number, riskLevel: string, factors: unknown) =>
      apiFetch("/api/risk", {
        method: "POST",
        body: JSON.stringify({ score, riskLevel, factors }),
      }),
  },

  // Profile
  profile: {
    get: () => apiFetch("/api/profile"),
    upsert: () => apiFetch("/api/profile", { method: "POST" }),
  },

  // Notifications
  notifications: {
    get: (params?: { unread?: boolean; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.unread) qs.set("unread", "true");
      if (params?.limit)  qs.set("limit", String(params.limit));
      return apiFetch(`/api/notifications${qs.toString() ? `?${qs}` : ""}`);
    },
    create: (type: string, title: string, message: string, metadata?: unknown) =>
      apiFetch("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ type, title, message, metadata }),
      }),
    markRead: (ids?: string[], markAllRead?: boolean) =>
      apiFetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ ids, markAllRead }),
      }),
    delete: (id?: string, deleteAll?: boolean) =>
      apiFetch("/api/notifications", {
        method: "DELETE",
        body: JSON.stringify({ id, deleteAll }),
      }),
  },

  // Settings
  settings: {
    get: () => apiFetch("/api/settings"),
    update: (data: Record<string, unknown>) =>
      apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // Search
  search: {
    query: (q: string) => apiFetch(`/api/search?q=${encodeURIComponent(q)}`),
  },

  // Deletions
  deletions: {
    getAll: () => apiFetch("/api/deletions"),
    upsert: (platform: string, completed: boolean) =>
      apiFetch("/api/deletions", {
        method: "POST",
        body: JSON.stringify({ platform, completed }),
      }),
  },

  // Domain Predict (AI Scam Prediction)
  domainPredict: {
    analyze: (domain: string) =>
      apiFetch("/api/domain-predict", {
        method: "POST",
        body: JSON.stringify({ domain }),
      }),
  },

  // QR Code Scam Scanner
  qrScan: {
    analyze: (url: string) =>
      apiFetch("/api/qr-scan", {
        method: "POST",
        body: JSON.stringify({ url }),
      }),
    getHistory: () => apiFetch("/api/qr-scan"),
  },
};

export default api;
