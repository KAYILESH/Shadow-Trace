"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Trash2,
  ExternalLink,
  CheckCircle2,
  Circle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Sidebar from "@/frontend/components/layout/Sidebar";
import TopHeader from "@/frontend/components/layout/TopHeader";
import toast from "react-hot-toast";
import { backendFetch } from "@/lib/backendFetch";

// ─── Platform Data ──────────────────────────────────────────────────────────
interface Platform {
  id: string;
  name: string;
  tagline: string;
  color: string;
  accentColor: string;
  deleteUrl: string;
  guideSteps: string[];
  privacyTip: string;
  difficulty: "Easy" | "Medium" | "Hard";
  timeEstimate: string;
}

const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    name: "Instagram",
    tagline: "Meta's photo-sharing platform",
    color: "#E1306C",
    accentColor: "rgba(225,48,108,0.15)",
    deleteUrl: "https://www.instagram.com/accounts/remove/request/permanent/",
    difficulty: "Medium",
    timeEstimate: "30 days",
    privacyTip:
      "Instagram retains your data for up to 90 days after deletion. Download your data archive before proceeding.",
    guideSteps: [
      "Go to your Profile → Settings → Account",
      'Scroll down and tap "Delete Account"',
      "Select a reason for deletion from the dropdown",
      "Re-enter your password to confirm",
      'Tap "Delete [Username]" to initiate the 30-day waiting period',
      "Do NOT log in during the 30-day period or deletion will be cancelled",
    ],
  },
  {
    id: "facebook",
    name: "Facebook",
    tagline: "Meta's social networking giant",
    color: "#1877F2",
    accentColor: "rgba(24,119,242,0.15)",
    deleteUrl: "https://www.facebook.com/help/delete_account",
    difficulty: "Hard",
    timeEstimate: "30–90 days",
    privacyTip:
      "Facebook may keep your data for up to 90 days. Third-party apps connected to your account will retain their own copies of your data.",
    guideSteps: [
      "Log into Facebook and go to Settings & Privacy → Settings",
      "Click 'Your Facebook Information' in the left column",
      "Click 'Deactivation and Deletion'",
      "Choose 'Delete Account' and click 'Continue to Account Deletion'",
      "Click 'Delete Account', enter your password, then 'Continue'",
      "Optionally: Download your data archive BEFORE confirming deletion",
    ],
  },
  {
    id: "reddit",
    name: "Reddit",
    tagline: "The front page of the internet",
    color: "#FF4500",
    accentColor: "rgba(255,69,0,0.15)",
    deleteUrl: "https://www.reddit.com/settings/",
    difficulty: "Easy",
    timeEstimate: "Immediate",
    privacyTip:
      "Reddit anonymizes your username but does NOT delete your posts or comments. You must manually delete posts before deleting your account.",
    guideSteps: [
      "Visit reddit.com/settings and scroll to the bottom",
      "Click 'Deactivate Account'",
      "Read the warning: your posts and comments will NOT be deleted",
      "Optionally: Use a script or manually delete all your posts first",
      "Enter your username and password",
      "Check the confirmation box and click 'Deactivate'",
    ],
  },
  {
    id: "twitter",
    name: "Twitter / X",
    tagline: "Real-time news and social platform",
    color: "#1DA1F2",
    accentColor: "rgba(29,161,242,0.15)",
    deleteUrl: "https://twitter.com/settings/your_twitter_data/account",
    difficulty: "Easy",
    timeEstimate: "30 days",
    privacyTip:
      "Your account enters a 30-day deactivation period. Logging back in during this time will cancel the deletion.",
    guideSteps: [
      "Log in and go to Settings → More → Settings and Support",
      "Click 'Settings', then 'Your account'",
      "Select 'Deactivate your account'",
      "Read the deactivation information carefully",
      "Click 'Deactivate' and re-enter your password",
      "After 30 days of inactivity, your account is permanently deleted",
    ],
  },
  {
    id: "github",
    name: "GitHub",
    tagline: "Code hosting and version control",
    color: "#F0F0F0",
    accentColor: "rgba(240,240,240,0.1)",
    deleteUrl: "https://github.com/settings/admin",
    difficulty: "Easy",
    timeEstimate: "Immediate",
    privacyTip:
      "Deleting your GitHub account removes all repositories, gists, and forks. Public forks made by others will remain. Transfer any important repos first.",
    guideSteps: [
      "Go to GitHub Settings (top right avatar → Settings)",
      "Scroll to the bottom of the page to find the 'Danger Zone'",
      "Click 'Delete this account'",
      "Read all the warnings carefully — this is irreversible",
      "Type your username in the confirmation box",
      "Enter your password and click 'Delete my account'",
    ],
  },
];

// ─── Platform Card Component ─────────────────────────────────────────────────
function DifficultyBadge({ level }: { level: Platform["difficulty"] }) {
  const colors = {
    Easy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    Medium: "text-primary bg-primary/10 border-primary/20",
    Hard: "text-danger bg-danger/10 border-danger/20",
  };
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[level]}`}
    >
      {level}
    </span>
  );
}

interface PlatformCardProps {
  platform: Platform;
  isCompleted: boolean;
  isLoading: boolean;
  onToggle: (id: string, completed: boolean) => void;
}

function PlatformCard({
  platform,
  isCompleted,
  isLoading,
  onToggle,
}: PlatformCardProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`relative rounded-2xl overflow-hidden border transition-all duration-300 group ${
        isCompleted
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-black/10 glass hover:border-black/10"
      }`}
    >
      {/* Coloured top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: isCompleted ? "#10b981" : platform.color }}
      />

      {/* Background glow */}
      <div
        className="absolute -top-10 -right-10 h-32 w-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: isCompleted ? "rgba(16,185,129,0.2)" : platform.accentColor }}
      />

      <div className="relative z-10 p-5">
        {/* ── Header Row ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Platform colour dot */}
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
              style={{ background: platform.accentColor, border: `1px solid ${platform.color}40`, color: platform.color }}
            >
              {platform.name[0]}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">{platform.name}</h3>
              <p className="text-xs text-muted-foreground">{platform.tagline}</p>
            </div>
          </div>
          {/* Completion checkbox */}
          <button
            onClick={() => onToggle(platform.id, !isCompleted)}
            disabled={isLoading}
            title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
            className="shrink-0 transition-all hover:scale-110 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground hover:text-foreground" />
            )}
          </button>
        </div>

        {/* ── Meta row ── */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <DifficultyBadge level={platform.difficulty} />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            ⏱ {platform.timeEstimate}
          </span>
          {isCompleted && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </span>
          )}
        </div>

        {/* ── Privacy Tip ── */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-black/5 border border-black/10 p-3">
          <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">{platform.privacyTip}</p>
        </div>

        {/* ── Guide Accordion ── */}
        <button
          onClick={() => setGuideOpen((v) => !v)}
          className="mt-4 w-full flex items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Step-by-Step Privacy Guide
          </span>
          {guideOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {guideOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <ol className="mt-3 space-y-2">
                {platform.guideSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                    <span
                      className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: platform.accentColor, color: platform.color }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action Buttons ── */}
        <div className="mt-4 flex items-center gap-3">
          <a
            href={platform.deleteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${platform.color}CC, ${platform.color}88)`,
              boxShadow: `0 0 20px ${platform.color}30`,
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
          <button
            onClick={() => onToggle(platform.id, !isCompleted)}
            disabled={isLoading}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${
              isCompleted
                ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                : "border-black/10 text-muted-foreground hover:bg-black/5 hover:text-foreground"
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Done!
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                Mark Done
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────
export default function DeletionContent({ user }: { user: SupabaseUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(true);

  // Load saved progress on mount
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await backendFetch("/api/deletions");
        const data = await res.json();
        if (data.deletions) {
          const completed = new Set<string>(
            data.deletions
              .filter((d: any) => d.completed)
              .map((d: any) => d.platform as string)
          );
          setCompletedIds(completed);
        }
      } catch {
        // Silently fail — user still has full UI access
      } finally {
        setIsFetching(false);
      }
    };
    fetchProgress();
  }, []);

  const handleToggle = async (id: string, completed: boolean) => {
    // Optimistic update
    setLoadingIds((prev) => new Set([...prev, id]));
    const prevCompleted = new Set(completedIds);
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (completed) next.add(id);
      else next.delete(id);
      return next;
    });

    try {
      const res = await backendFetch("/api/deletions", {
        method: "POST",
        body: JSON.stringify({ platform: id, completed }),
      });
      const data = await res.json();

      if (!data.success) throw new Error("Failed to save");

      toast.success(
        completed
          ? `✅ ${PLATFORMS.find((p) => p.id === id)?.name} marked complete!`
          : `Unmarked ${PLATFORMS.find((p) => p.id === id)?.name}`
      );
    } catch {
      // Revert on failure
      setCompletedIds(prevCompleted);
      toast.error("Failed to save progress. Try again.");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const completedCount = completedIds.size;
  const totalCount = PLATFORMS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,0,51,0.12),transparent_70%)]" />
        <div className="cyber-grid absolute inset-0 opacity-10" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex flex-col lg:pl-64 relative z-10 min-h-screen">
        <TopHeader user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-10 w-10 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center">
                    <ShieldOff className="h-5 w-5 text-danger" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Account Deletion Center
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground pl-[52px]">
                  Reclaim your privacy. Remove old accounts step-by-step.
                </p>
              </div>

              {/* Overall progress badge */}
              <div className="glass rounded-2xl px-5 py-3 flex items-center gap-4 border border-black/10">
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">
                    {completedCount}
                    <span className="text-muted-foreground text-lg font-medium">
                      /{totalCount}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">platforms cleaned</p>
                </div>
                {/* Mini circular progress */}
                <div className="relative h-12 w-12">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                    <circle
                      cx="22" cy="22" r="18"
                      className="stroke-white/10"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="22" cy="22" r="18"
                      stroke={completedCount === totalCount ? "#10b981" : "#FF6B00"}
                      strokeWidth="4"
                      fill="transparent"
                      strokeLinecap="round"
                      style={{ strokeDasharray: 2 * Math.PI * 18 }}
                      initial={{ strokeDashoffset: 2 * Math.PI * 18 }}
                      animate={{
                        strokeDashoffset:
                          2 * Math.PI * 18 * (1 - progressPercent / 100),
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                    {progressPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* ── Progress Bar ── */}
            <div className="glass rounded-2xl p-5 border border-black/10">
              <div className="flex justify-between text-sm font-medium mb-3">
                <span className="text-foreground">Overall Cleanup Progress</span>
                <span className="text-primary">{progressPercent}% Complete</span>
              </div>
              <div className="h-3 w-full rounded-full bg-black/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-danger relative overflow-hidden"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-gradient" />
                </motion.div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {PLATFORMS.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                        completedIds.has(p.id) ? "bg-emerald-500" : "bg-black/10"
                      }`}
                    />
                    <span
                      className={`text-xs transition-colors ${
                        completedIds.has(p.id)
                          ? "text-emerald-400 line-through opacity-60"
                          : "text-muted-foreground"
                      }`}
                    >
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Loading Skeleton ── */}
            {isFetching ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-2xl border border-black/10 bg-black/5 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              /* ── Platform Cards Grid ── */
              <motion.div
                layout
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {PLATFORMS.map((platform, i) => (
                  <motion.div
                    key={platform.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.4 }}
                  >
                    <PlatformCard
                      platform={platform}
                      isCompleted={completedIds.has(platform.id)}
                      isLoading={loadingIds.has(platform.id)}
                      onToggle={handleToggle}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* ── Completion Banner ── */}
            <AnimatePresence>
              {completedCount === totalCount && !isFetching && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass rounded-2xl p-6 border border-emerald-500/30 text-center"
                >
                  <div className="text-4xl mb-3">🎉</div>
                  <h2 className="text-xl font-bold text-emerald-400 mb-1">
                    All Accounts Cleaned!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Excellent work. You've successfully initiated deletion on all{" "}
                    {totalCount} platforms. Your digital footprint is significantly
                    reduced.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
