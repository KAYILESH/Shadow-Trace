"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  ShieldAlert,
  Mail,
  Phone,
  Link as LinkIcon,
  User as UserIcon,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  Shield,
  Loader2,
  Database,
  TrendingUp,
} from "lucide-react";
import Sidebar from "@/frontend/components/layout/Sidebar";
import TopHeader from "@/frontend/components/layout/TopHeader";
import toast from "react-hot-toast";
import { backendFetch } from "@/lib/backendFetch";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Breakdown {
  social: {
    score: number;
    maxScore: number;
    profilesFound: number;
    platforms: string[];
  };
  email: {
    score: number;
    maxScore: number;
    breachCount: number;
    gravatarFound: boolean;
    exposedEmails: string[];
    breachNames: string[];
  };
  phone: {
    score: number;
    maxScore: number;
    confirmedCount: number;
    likelyCount: number;
    exposedPhones: string[];
  };
}

interface RiskResult {
  score: number;
  riskLevel: "Low" | "Medium" | "High";
  factors: { profiles: boolean; email: boolean; phone: boolean };
  breakdown: Breakdown;
  hasAnyData: boolean;
  calculatedAt: string;
}

interface Props {
  user: SupabaseUser;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getRiskColors(riskLevel: string) {
  if (riskLevel === "High")   return { colorClass: "text-red-500",    strokeColor: "#EF4444", bgGlow: "bg-red-500/20",    badge: "bg-red-500/10 border-red-500/30 text-red-500" };
  if (riskLevel === "Medium") return { colorClass: "text-orange-500", strokeColor: "#F97316", bgGlow: "bg-orange-500/20", badge: "bg-orange-500/10 border-orange-500/30 text-orange-500" };
  return                             { colorClass: "text-green-500",  strokeColor: "#22C55E", bgGlow: "bg-green-500/20",  badge: "bg-green-500/10 border-green-500/30 text-green-500" };
}

// ── Factor Card ───────────────────────────────────────────────────────────────
function FactorCard({
  icon: Icon,
  label,
  detail,
  score,
  maxScore,
  exposed,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  detail: string;
  score: number;
  maxScore: number;
  exposed: boolean;
  delay: number;
}) {
  const pct = Math.round((score / maxScore) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
        exposed
          ? "border-red-500/20 bg-red-500/5"
          : "border-green-500/20 bg-green-500/5"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          exposed ? "bg-red-500/15 text-red-500" : "bg-green-500/15 text-green-500"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-foreground text-sm">{label}</p>
          <span className={`text-xs font-bold ${exposed ? "text-red-500" : "text-green-500"}`}>
            {score}/{maxScore} pts
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{detail}</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-black/10">
          <motion.div
            className={`h-full rounded-full ${exposed ? "bg-red-500" : "bg-green-500"}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: delay + 0.2 }}
          />
        </div>
      </div>
      <div className="shrink-0">
        {exposed ? (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RiskContent({ user }: Props) {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [result, setResult]             = useState<RiskResult | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const calculate = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRecalculating(true);
    else setIsLoading(true);
    try {
      const res  = await backendFetch("/api/risk/calculate");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate risk score");
      setResult(data);
      if (isRefresh) toast.success("Risk score recalculated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load risk score";
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsRecalculating(false);
    }
  }, []);

  useEffect(() => { calculate(); }, [calculate]);

  // SVG ring
  const circleRadius       = 70;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const score              = result?.score ?? 0;
  const riskLevel          = result?.riskLevel ?? "Low";
  const strokeDashoffset   = circleCircumference - (score / 100) * circleCircumference;
  const { colorClass, strokeColor, bgGlow, badge } = getRiskColors(riskLevel);

  // Build factor rows from breakdown
  const breakdown = result?.breakdown;

  const factorRows = breakdown
    ? [
        {
          icon:    UserIcon,
          label:   "Social Profiles",
          detail:  breakdown.social.profilesFound > 0
            ? `Found on: ${breakdown.social.platforms.join(", ")}`
            : "No public profiles detected",
          score:   breakdown.social.score,
          maxScore: breakdown.social.maxScore,
          exposed: breakdown.social.profilesFound > 0,
        },
        {
          icon:    Mail,
          label:   "Email Exposure",
          detail:  breakdown.email.breachCount > 0
            ? `${breakdown.email.breachCount} breach${breakdown.email.breachCount > 1 ? "es" : ""}: ${breakdown.email.breachNames.slice(0, 3).join(", ")}`
            : breakdown.email.gravatarFound
            ? "Public Gravatar profile found"
            : "No email breaches detected",
          score:   breakdown.email.score,
          maxScore: breakdown.email.maxScore,
          exposed: breakdown.email.breachCount > 0 || breakdown.email.gravatarFound,
        },
        {
          icon:    Phone,
          label:   "Phone Exposure",
          detail:  breakdown.phone.confirmedCount > 0 || breakdown.phone.likelyCount > 0
            ? `${breakdown.phone.confirmedCount} confirmed, ${breakdown.phone.likelyCount} likely platforms`
            : "No phone exposure detected",
          score:   breakdown.phone.score,
          maxScore: breakdown.phone.maxScore,
          exposed: breakdown.phone.confirmedCount > 0 || breakdown.phone.likelyCount > 0,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,107,0,0.04),transparent_70%)]" />
        <div className="cyber-grid absolute inset-0 opacity-10" />
      </div>

      {/* Mobile overlay */}
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
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                  Privacy Risk Engine
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Automatically calculated from your real scan data — no manual input needed.
                </p>
              </div>
              <button
                onClick={() => calculate(true)}
                disabled={isLoading || isRecalculating}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-white/50 px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-black/5 disabled:opacity-50"
              >
                {isRecalculating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Recalculate
              </button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analysing your exposure data…</p>
              </div>
            )}

            {/* No Data State */}
            {!isLoading && result && !result.hasAnyData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl p-10 flex flex-col items-center text-center gap-4"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">No Scan Data Yet</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Run a username scan, identity scan, or phone scan first. Your risk score will be
                  automatically calculated from the real results.
                </p>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  <a href="/dashboard/scans"      className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
                    → Username Scan
                  </a>
                  <a href="/dashboard/analytics"  className="rounded-xl bg-black/5 border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-black/10 transition-colors">
                    → Identity Scan
                  </a>
                </div>
              </motion.div>
            )}

            {/* Results */}
            {!isLoading && result && result.hasAnyData && (
              <div className="grid gap-8 lg:grid-cols-3">
                {/* Left: Factor Breakdown */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Factor cards */}
                  <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      Exposure Breakdown
                    </h2>
                    <p className="text-xs text-muted-foreground mb-5">
                      Auto-detected from your scans — last calculated{" "}
                      {new Date(result.calculatedAt).toLocaleTimeString("en-US", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    <div className="space-y-3">
                      {factorRows.map((row, i) => (
                        <FactorCard key={row.label} {...row} delay={i * 0.1} />
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" /> Actionable Recommendations
                    </h2>
                    {score === 0 ? (
                      <div className="flex items-center gap-3 text-sm text-green-600">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>No exposures detected. You look clean!</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {result.factors.email && (
                          <div className="flex items-start gap-3 text-sm">
                            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">
                              <strong className="text-foreground">Email Breached:</strong> Use an
                              email alias (SimpleLogin, Apple Hide My Email) and enable 2FA on all
                              major accounts immediately.
                            </p>
                          </div>
                        )}
                        {result.factors.phone && (
                          <div className="flex items-start gap-3 text-sm">
                            <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">
                              <strong className="text-foreground">Phone Exposed:</strong> Watch for
                              SIM-swap attacks. Use a VoIP number for public registrations and remove
                              your number from data broker sites.
                            </p>
                          </div>
                        )}
                        {result.factors.profiles && (
                          <div className="flex items-start gap-3 text-sm">
                            <LinkIcon className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">
                              <strong className="text-foreground">Public Profiles Found:</strong>{" "}
                              Set your social accounts to private and request profile removal from
                              platforms where you no longer have an active presence.
                            </p>
                          </div>
                        )}
                        {riskLevel === "High" && (
                          <div className="flex items-start gap-3 text-sm rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                            <Shield className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">
                              <strong className="text-red-500">High Risk:</strong> Immediate action
                              recommended. Consider a password audit, freeze your credit, and review
                              all active sessions across your accounts.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Score Ring */}
                <div className="space-y-6">
                  <div className="glass rounded-2xl p-6 flex flex-col items-center relative overflow-hidden">
                    <div className={`absolute inset-0 ${bgGlow} blur-[60px] opacity-30 transition-colors duration-500`} />

                    <h2 className="text-lg font-semibold text-foreground mb-6 relative z-10">
                      Overall Risk Score
                    </h2>

                    {/* Ring */}
                    <div className="relative flex items-center justify-center w-48 h-48 z-10">
                      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r={circleRadius} className="stroke-white/10" strokeWidth="12" fill="transparent" />
                        <motion.circle
                          cx="80" cy="80" r={circleRadius}
                          stroke={strokeColor}
                          strokeWidth="12"
                          fill="transparent"
                          strokeLinecap="round"
                          style={{ strokeDasharray: circleCircumference }}
                          initial={{ strokeDashoffset: circleCircumference }}
                          animate={{ strokeDashoffset }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                          key={score}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`text-5xl font-bold ${colorClass}`}
                        >
                          {score}
                        </motion.span>
                        <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">/ 100</span>
                      </div>
                    </div>

                    <div className="mt-6 text-center relative z-10">
                      <p className="text-sm text-muted-foreground mb-2">Risk Level</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${badge}`}>
                        {riskLevel} Risk
                      </span>
                    </div>
                  </div>

                  {/* Score breakdown mini-cards */}
                  <div className="glass rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" /> Score Breakdown
                    </h3>
                    {breakdown && [
                      { label: "Social Profiles", score: breakdown.social.score, max: breakdown.social.maxScore, color: "bg-orange-500" },
                      { label: "Email / Identity", score: breakdown.email.score,  max: breakdown.email.maxScore,  color: "bg-red-500"    },
                      { label: "Phone Exposure",   score: breakdown.phone.score,  max: breakdown.phone.maxScore,  color: "bg-yellow-500" },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-foreground">{item.score}/{item.max}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-black/10">
                          <motion.div
                            className={`h-full rounded-full ${item.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((item.score / item.max) * 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
