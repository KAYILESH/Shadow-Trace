"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, CheckCheck, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { getNotificationConfig } from "@/backend/helpers/notifications";
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

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissing, setIsDismissing] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await backendFetch("/api/notifications?limit=20");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on open & poll every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Re-fetch when panel opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAllRead = async () => {
    try {
      await backendFetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {/* silent */}
  };

  const markOneRead = async (id: string) => {
    try {
      await backendFetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {/* silent */}
  };

  const dismiss = async (id: string) => {
    setIsDismissing(id);
    try {
      await backendFetch("/api/notifications", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      const wasUnread = notifications.find((n) => n.id === id && !n.is_read);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {/* silent */}
    setIsDismissing(null);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-full transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 h-4 w-4 min-w-[1rem] rounded-full bg-danger border-2 border-background flex items-center justify-center"
            >
              <span className="text-[9px] font-black text-foreground leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 top-12 w-80 sm:w-96 z-50 glass-strong rounded-2xl border border-black/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-danger/20 text-danger border border-danger/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    title="Mark all read"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                )}
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setOpen(false)}
                  className="text-xs text-primary hover:underline px-2 py-1"
                >
                  View all
                </Link>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-[360px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Bell className="h-8 w-8 text-white/10" />
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground/60">No notifications yet</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.slice(0, 8).map((n) => {
                    const cfg = getNotificationConfig(n.type);
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        className={`flex gap-3 px-4 py-3 border-b border-black/10 last:border-0 hover:bg-black/5 transition-colors ${
                          !n.is_read ? "bg-primary/5" : ""
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}30` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className={`text-xs font-semibold leading-tight ${n.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                              {n.title}
                            </p>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {!n.is_read && (
                                <button
                                  onClick={() => markOneRead(n.id)}
                                  title="Mark as read"
                                  className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => dismiss(n.id)}
                                disabled={isDismissing === n.id}
                                title="Dismiss"
                                className="p-1 rounded text-muted-foreground hover:text-danger transition-colors"
                              >
                                {isDismissing === n.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <X className="h-3 w-3" />
                                }
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        {/* Unread dot */}
                        {!n.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-black/10 flex justify-between items-center">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setOpen(false)}
                  className="text-xs text-primary hover:underline"
                >
                  View all {notifications.length} notifications
                </Link>
                <button
                  onClick={async () => {
                    await backendFetch("/api/notifications", {
                      method: "DELETE",
                      body: JSON.stringify({ deleteAll: true }),
                    });
                    setNotifications([]);
                    setUnreadCount(0);
                  }}
                  className="text-xs text-muted-foreground hover:text-danger transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
