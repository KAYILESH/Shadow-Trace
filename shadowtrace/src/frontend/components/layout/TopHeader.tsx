"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, Search, X, ScanLine, Bell, Loader2 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import NotificationBell from "./NotificationBell";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/backend/db/client";

interface TopHeaderProps {
  user: SupabaseUser;
  onMenuClick: () => void;
}

interface SearchResult {
  scans: { id: string; target_username: string; platforms_found: number; created_at: string }[];
  notifications: { id: string; type: string; title: string; message: string; is_read: boolean }[];
  query: string;
}

export default function TopHeader({ user, onMenuClick }: TopHeaderProps) {
  const router   = useRouter();
  const supabase = createClient();
  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

  // ── Fetch avatar config
  const [avatarGender, setAvatarGender] = useState<"male" | "female">("male");
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_config")
        .eq("id", user.id)
        .single();
      if (data?.avatar_config?.gender) setAvatarGender(data.avatar_config.gender);
    })();
  }, [user.id]);
  const avatarUrl = avatarGender === "female" ? "/female_avatar.png" : "/male_avatar.png";

  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<SearchResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const debounceRef             = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef              = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
      setOpen(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 350);
  };

  const clearSearch = () => { setQuery(""); setResults(null); setOpen(false); };

  const totalResults = (results?.scans.length ?? 0) + (results?.notifications.length ?? 0);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-white/90 px-4 backdrop-blur-xl sm:gap-x-6 sm:px-6 lg:px-8"
      style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}>
      <button
        type="button"
        className="-m-2.5 p-2.5 text-muted-foreground lg:hidden hover:text-foreground"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="h-6 w-px bg-border lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* ── Live Search ─────────────────────────────────────────────────────── */}
        <div ref={wrapperRef} className="relative flex flex-1 items-center">
          <form className="relative flex flex-1 items-center" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="search-field" className="sr-only">Search</label>
            {loading ? (
              <Loader2 className="pointer-events-none absolute left-0 h-full w-4 text-primary animate-spin" />
            ) : (
              <Search className="pointer-events-none absolute left-0 h-full w-4 text-muted-foreground" />
            )}
            <input
              id="search-field"
              value={query}
              onChange={handleChange}
              onFocus={() => results && setOpen(true)}
              className="block h-10 w-full rounded-xl border border-black/10 bg-black/5 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary/40 focus:bg-white focus:ring-1 focus:ring-primary/20"
              placeholder="Search scans, threats, notifications..."
              type="search"
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {/* ── Results Dropdown ─────────────────────────────────────────────── */}
          {open && results && (
            <div className="absolute top-12 left-0 right-0 z-50 rounded-2xl border border-black/10 bg-white shadow-xl shadow-black/10 overflow-hidden">
              {totalResults === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">No results for <span className="font-medium text-foreground">"{results.query}"</span></p>
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {/* Scan results */}
                  {results.scans.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Scans</p>
                      {results.scans.map((scan) => (
                        <Link key={scan.id} href="/dashboard/scans"
                          onClick={clearSearch}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <ScanLine className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">@{scan.target_username}</p>
                            <p className="text-xs text-muted-foreground">{scan.platforms_found} profiles found</p>
                          </div>
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            {new Date(scan.created_at).toLocaleDateString()}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Notification results */}
                  {results.notifications.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notifications</p>
                      {results.notifications.map((notif) => (
                        <Link key={notif.id} href="/dashboard/notifications"
                          onClick={clearSearch}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${notif.is_read ? "bg-muted" : "bg-primary/10"}`}>
                            <Bell className={`h-3.5 w-3.5 ${notif.is_read ? "text-muted-foreground" : "text-primary"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{notif.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{notif.message}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="px-4 py-2 bg-muted/50">
                    <p className="text-[11px] text-muted-foreground">{totalResults} result{totalResults !== 1 ? "s" : ""} for "{results.query}"</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <NotificationBell />
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />
          <div className="flex items-center gap-x-3">
            <span className="sr-only">Your profile</span>
            <div className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-primary/20 shrink-0 bg-black/5">
              <img src={avatarUrl} alt={avatarGender + " avatar"} className="h-full w-full object-cover" />
            </div>
            <span className="hidden lg:flex lg:flex-col">
              <span className="text-sm font-semibold leading-5 text-foreground">{displayName}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
