"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  X,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import Sidebar from "@/frontend/components/layout/Sidebar";
import TopHeader from "@/frontend/components/layout/TopHeader";
import { getNotificationConfig } from "@/backend/helpers/notifications";
import toast from "react-hot-toast";
import { backendFetch } from "@/lib/backendFetch";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

type FilterType = "all" | "unread" | "scan_completed" | "risk_increased" | "cleanup_reminder" | "deletion_reminder";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "scan_completed", label: "Scans" },
  { value: "risk_increased", label: "Risk Alerts" },
  { value: "cleanup_reminder", label: "Cleanup" },
  { value: "deletion_reminder", label: "Deletions" },
];



function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function NotificationCard({
  notification,
  onMarkRead,
  onDismiss,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const cfg = getNotificationConfig(notification.type);
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`relative rounded-2xl border transition-all group overflow-hidden ${
        notification.is_read
          ? "border-black/10 bg-white/[0.03]"
          : "border-white/15 bg-white/[0.06]"
      }`}
    >
      {/* Left accent bar */}
      {!notification.is_read && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
          style={{ background: cfg.color }}
        />
      )}

      <div className="flex gap-4 p-4 pl-5">
        {/* Icon */}
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}35` }}
        >
          <Icon className="h-5 w-5" style={{ color: cfg.color }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-sm font-semibold ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                  {notification.title}
                </h3>
                {!notification.is_read && (
                  <span
                    className="text-[10px] font-black px-1.5 py-0.5 rounded-full border"
                    style={{ background: `${cfg.color}20`, color: cfg.color, borderColor: `${cfg.color}40` }}
                  >
                    NEW
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground/60 font-medium">{cfg.label}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.is_read && (
                <button
                  onClick={() => onMarkRead(notification.id)}
                  title="Mark as read"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => onDismiss(notification.id)}
                title="Delete notification"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{notification.message}</p>

          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-muted-foreground/50">{timeAgo(notification.created_at)}</span>
            {!notification.is_read && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="text-[11px] font-medium hover:underline transition-colors"
                style={{ color: cfg.color }}
              >
                Mark as read
              </button>
            )}
          </div>
        </div>

        {/* Unread dot */}
        {!notification.is_read && (
          <div
            className="h-2.5 w-2.5 rounded-full shrink-0 mt-2 animate-pulse"
            style={{ background: cfg.color }}
          />
        )}
      </div>
    </motion.div>
  );
}

export default function NotificationsContent({ user }: { user: SupabaseUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const res = await backendFetch("/api/notifications?limit=50");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {/* silent */}
    finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);



  const markRead = async (id: string) => {
    await backendFetch("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await backendFetch("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const dismiss = async (id: string) => {
    await backendFetch("/api/notifications", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification dismissed");
  };

  const clearAll = async () => {
    await backendFetch("/api/notifications", {
      method: "DELETE",
      body: JSON.stringify({ deleteAll: true }),
    });
    setNotifications([]);
    toast.success("All notifications cleared");
  };

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.is_read;
    return n.type === filter;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,0,51,0.1),transparent_70%)]" />
        <div className="cyber-grid absolute inset-0 opacity-20" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar />
      </div>

      <div className="flex flex-col lg:pl-64 relative z-10 min-h-screen">
        <TopHeader user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center relative">
                  <Bell className="h-5 w-5 text-danger" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-danger border-2 border-background flex items-center justify-center"
                    >
                      <span className="text-[9px] font-black text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    </motion.span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Notification Center</h1>
                  <p className="text-sm text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => fetchNotifications(true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-black/10 rounded-xl px-3 py-2 hover:bg-black/5 transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 text-xs text-primary border border-primary/20 rounded-xl px-3 py-2 hover:bg-primary/10 transition-all"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-danger border border-black/10 rounded-xl px-3 py-2 hover:bg-danger/10 hover:border-danger/20 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: notifications.length, color: "#FF6B00" },
                { label: "Unread", value: unreadCount, color: "#FF0033" },
                { label: "Scan Alerts", value: notifications.filter((n) => n.type === "scan_completed").length, color: "#FF6B00" },
                { label: "Risk Alerts", value: notifications.filter((n) => n.type === "risk_increased").length, color: "#FF0033" },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-4 border border-black/10 text-center">
                  <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* ── Filter Tabs ── */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {FILTER_OPTIONS.map((opt) => {
                const count = opt.value === "all"
                  ? notifications.length
                  : opt.value === "unread"
                  ? unreadCount
                  : notifications.filter((n) => n.type === opt.value).length;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border whitespace-nowrap transition-all ${
                      filter === opt.value
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "border-black/10 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                    }`}
                  >
                    <Filter className="h-3 w-3" />
                    {opt.label}
                    {count > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                        filter === opt.value ? "bg-primary/30 text-primary" : "bg-black/10 text-muted-foreground"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Notification List ── */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl border border-black/10 bg-black/5 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 gap-5"
              >
                <div className="h-20 w-20 rounded-full bg-black/5 border border-black/10 flex items-center justify-center">
                  <Bell className="h-10 w-10 text-white/10" />
                </div>
                <div className="text-center max-w-sm">
                  <p className="text-foreground font-semibold mb-2">
                    {filter === "all" ? "No notifications yet" : `No ${filter.replace("_", " ")} notifications`}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {filter === "all"
                      ? "Notifications are generated automatically when you scan usernames or save a risk score."
                      : "Try selecting a different filter above."}
                  </p>
                </div>
                {filter === "all" && notifications.length === 0 && (
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <div className="flex items-center gap-3 rounded-xl bg-black/5 border border-black/10 px-4 py-3 text-sm text-muted-foreground">
                      <Search className="h-4 w-4 text-primary shrink-0" />
                      Run a scan to get a scan notification
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-black/5 border border-black/10 px-4 py-3 text-sm text-muted-foreground">
                      <ShieldAlert className="h-4 w-4 text-danger shrink-0" />
                      Save a risk score to get a risk alert
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {filtered.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onMarkRead={markRead}
                      onDismiss={dismiss}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
