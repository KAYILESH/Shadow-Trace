"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Loader2, ShieldCheck, ShieldAlert, Shield,
  AlertTriangle, CheckCircle2, XCircle, Search,
  Clock, Building2, Type, Lock, Server, Target,
  Info, Zap, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { backendFetch } from "@/lib/backendFetch";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SignalResult {
  score: number;
  detail: string;
  riskFlag: boolean;
  matchedBrand?: string;
}

interface DomainPrediction {
  domain: string;
  predictionScore: number;
  threatLevel: "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "CRITICAL";
  signals: {
    domainAge:       SignalResult;
    registrar:       SignalResult;
    namingPattern:   SignalResult;
    ssl:             SignalResult;
    hosting:         SignalResult;
    brandSimilarity: SignalResult;
  };
  redFlags:       string[];
  safeFactors:    string[];
  recommendation: string;
  confidence:     "HIGH" | "MEDIUM" | "LOW";
  modelUsed?:     string;
}

// ─── Config maps ──────────────────────────────────────────────────────────────
const threatConfig = {
  SAFE: {
    label: "Safe Domain",
    sublabel: "Low phishing risk",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    glow: "rgba(16,185,129,0.18)",
    stroke: "#10b981",
    bar: "bg-emerald-500",
    gradient: "from-emerald-500/20 to-teal-500/10",
  },
  SUSPICIOUS: {
    label: "Suspicious Domain",
    sublabel: "Moderate phishing risk",
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
    glow: "rgba(245,158,11,0.18)",
    stroke: "#f59e0b",
    bar: "bg-amber-500",
    gradient: "from-amber-500/20 to-orange-500/10",
  },
  HIGH_RISK: {
    label: "High Risk Domain",
    sublabel: "Very likely phishing",
    icon: ShieldAlert,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    ring: "ring-orange-500/30",
    glow: "rgba(249,115,22,0.2)",
    stroke: "#f97316",
    bar: "bg-orange-500",
    gradient: "from-orange-500/20 to-red-500/10",
  },
  CRITICAL: {
    label: "Critical Threat",
    sublabel: "Almost certainly phishing",
    icon: ShieldAlert,
    color: "text-red-500",
    bg: "bg-red-500/10",
    ring: "ring-red-500/30",
    glow: "rgba(239,68,68,0.22)",
    stroke: "#ef4444",
    bar: "bg-red-500",
    gradient: "from-red-500/20 to-rose-500/10",
  },
};

const confidenceConfig = {
  HIGH:   { color: "text-emerald-500", bg: "bg-emerald-500/10" },
  MEDIUM: { color: "text-amber-500",   bg: "bg-amber-500/10"   },
  LOW:    { color: "text-red-400",     bg: "bg-red-400/10"     },
};

const signalMeta = {
  domainAge:       { label: "Domain Age",         icon: Clock,      desc: "How long the domain has existed" },
  registrar:       { label: "Registrar",          icon: Building2,  desc: "Who registered the domain" },
  namingPattern:   { label: "Naming Pattern",     icon: Type,       desc: "Keywords, hyphens, and typos" },
  ssl:             { label: "SSL Certificate",    icon: Lock,       desc: "HTTPS and certificate type" },
  hosting:         { label: "Hosting Infra",      icon: Server,     desc: "Where the domain is hosted" },
  brandSimilarity: { label: "Brand Similarity",   icon: Target,     desc: "Resemblance to popular brands" },
};

// ─── Animated score ring ──────────────────────────────────────────────────────
function ScoreRing({ score, level }: { score: number; level: keyof typeof threatConfig }) {
  const cfg = threatConfig[level];
  const radius      = 58;
  const circumference = 2 * Math.PI * radius;
  const offset      = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-44 h-44 mx-auto">
      {/* Glow behind ring */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-40"
        style={{ background: cfg.glow }}
      />
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 140 140">
        {/* Track */}
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {/* Progress */}
        <motion.circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={cfg.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      {/* Center */}
      <div className="flex flex-col items-center z-10">
        <motion.span
          className={`text-4xl font-black ${cfg.color}`}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">
          Risk Score
        </span>
      </div>
    </div>
  );
}

// ─── Signal card ──────────────────────────────────────────────────────────────
function SignalCard({
  signalKey, signal, delay,
}: {
  signalKey: keyof typeof signalMeta;
  signal: SignalResult;
  delay: number;
}) {
  const meta = signalMeta[signalKey];
  const Icon = meta.icon;
  const riskColor  = signal.riskFlag ? "text-red-500"     : "text-emerald-500";
  const riskBg     = signal.riskFlag ? "bg-red-500/8"     : "bg-emerald-500/8";
  const riskRing   = signal.riskFlag ? "ring-red-500/20"  : "ring-emerald-500/20";
  const iconBg     = signal.riskFlag ? "bg-red-500/10"    : "bg-emerald-500/10";
  const barColor   = signal.score >= 7 ? "bg-red-500" : signal.score >= 4 ? "bg-amber-500" : "bg-emerald-500";
  const barW       = `${(signal.score / 10) * 100}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`glass rounded-2xl p-4 ring-1 ${riskRing} ${riskBg}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${riskColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">{meta.label}</p>
            <div className="flex items-center gap-1.5">
              {signal.riskFlag ? (
                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )}
              <span className={`text-xs font-bold ${riskColor}`}>{signal.score}/10</span>
            </div>
          </div>
          {/* Mini score bar */}
          <div className="h-1.5 w-full rounded-full bg-black/8 mb-2 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${barColor}`}
              initial={{ width: "0%" }}
              animate={{ width: barW }}
              transition={{ delay: delay + 0.2, duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{signal.detail}</p>
          {signal.matchedBrand && (
            <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-orange-500 bg-orange-500/10 ring-1 ring-orange-500/20 rounded-full px-2 py-0.5">
              <Target className="h-2.5 w-2.5" />
              Mimics &ldquo;{signal.matchedBrand}&rdquo;
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Analysis progress stepper ────────────────────────────────────────────────
const STEPS = [
  { label: "Parsing domain structure…",          icon: Globe   },
  { label: "Evaluating naming patterns…",         icon: Type    },
  { label: "Checking brand similarity…",          icon: Target  },
  { label: "Assessing SSL & hosting signals…",    icon: Lock    },
  { label: "Consulting threat intelligence AI…",  icon: Zap     },
  { label: "Generating prediction report…",       icon: Shield  },
];

function AnalysisProgress({ step, domain }: { step: number; domain: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 ring-1 ring-primary/20 space-y-5"
    >
      {/* Pulsing domain badge */}
      <div className="flex items-center justify-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 ring-1 ring-primary/25"
        >
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-sm text-primary font-semibold">{domain}</span>
        </motion.div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const done    = i < step;
          const active  = i === step;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i <= step ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                active ? "bg-primary/8 ring-1 ring-primary/20" : ""
              }`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                done   ? "bg-emerald-500/15" :
                active ? "bg-primary/15" : "bg-black/5"
              }`}>
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                ) : (
                  <StepIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
              </div>
              <span className={`text-xs font-medium ${
                done   ? "text-emerald-500" :
                active ? "text-primary" : "text-muted-foreground/40"
              }`}>
                {s.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Global progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>Analyzing…</span>
          <span>{Math.round((step / STEPS.length) * 100)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-black/8 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
            initial={{ width: "0%" }}
            animate={{ width: `${(step / STEPS.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DomainPredictTab() {
  const [domain,      setDomain]    = useState("");
  const [isAnalyzing, setAnalyzing] = useState(false);
  const [step,        setStep]      = useState(0);
  const [result,      setResult]    = useState<DomainPrediction | null>(null);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = domain.trim().toLowerCase().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
    if (!trimmed) {
      toast.error("Please enter a domain name");
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setStep(0);

    // Advance stepper while waiting for AI
    const ticker = setInterval(() => {
      setStep(prev => {
        const next = prev + 1;
        if (next >= STEPS.length - 1) clearInterval(ticker);
        return next;
      });
    }, 1000);

    try {
      const res  = await backendFetch("/api/domain-predict", {
        method: "POST",
        body: JSON.stringify({ domain: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      clearInterval(ticker);
      setStep(STEPS.length);
      await new Promise(r => setTimeout(r, 400)); // brief pause for UX

      setResult(data as DomainPrediction);

      if (data.threatLevel === "CRITICAL") {
        toast.error("🚨 Critical threat detected!");
      } else if (data.threatLevel === "HIGH_RISK") {
        toast.error("⚠️ High-risk domain — likely phishing");
      } else if (data.threatLevel === "SUSPICIOUS") {
        toast("🟠 Domain looks suspicious", { icon: "⚠️" });
      } else {
        toast.success("✅ Domain appears safe");
      }
    } catch (err: unknown) {
      clearInterval(ticker);
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setStep(0);
    setDomain("");
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">

        {/* ── Input Form ── */}
        {!result && !isAnalyzing && (
          <motion.form
            key="form"
            onSubmit={handleAnalyze}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Domain input */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <Globe className="inline h-4 w-4 mr-1.5 text-primary" />
                Domain to Analyze
              </label>
              <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5 ring-1 ring-black/10 focus-within:ring-primary/40 transition-all">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="paypa1-secure-login.xyz  or  google.com"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Enter a bare domain (e.g. <span className="font-mono">paypal-login-verify.com</span>) — no need for https://
              </p>
            </div>

            {/* Analyze button */}
            <button
              type="submit"
              disabled={!domain.trim()}
              className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <Search className="h-5 w-5" />
              Run AI Prediction
            </button>

            {/* How it works */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-5 ring-1 ring-black/10"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">How AI Scam Prediction works</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {[
                      "🕒 Evaluates domain age & registration date",
                      "🏢 Checks registrar reputation & abuse history",
                      "📝 Detects typosquatting & phishing keywords",
                      "🔒 Assesses SSL certificate trust level",
                      "🌐 Analyzes hosting infrastructure signals",
                      "🎯 Compares to 30+ popular brand names",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.form>
        )}

        {/* ── Progress Stepper ── */}
        {isAnalyzing && (
          <motion.div
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnalysisProgress
              step={step}
              domain={domain.trim().toLowerCase().replace(/^https?:\/\//i, "").replace(/\/.*$/, "")}
            />
          </motion.div>
        )}

        {/* ── Results ── */}
        {result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            {/* Verdict banner */}
            {(() => {
              const cfg  = threatConfig[result.threatLevel];
              const VIcon = cfg.icon;
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45 }}
                  className={`glass rounded-3xl p-6 ring-1 ${cfg.ring} bg-gradient-to-br ${cfg.gradient}`}
                  style={{ boxShadow: `0 0 48px ${cfg.glow}` }}
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Score ring */}
                    <div className="shrink-0">
                      <ScoreRing score={result.predictionScore} level={result.threatLevel} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-3 text-center sm:text-left">
                      {/* Domain */}
                      <div className="inline-flex items-center gap-2 rounded-xl bg-black/5 px-3 py-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-sm text-foreground font-semibold">{result.domain}</span>
                      </div>

                      {/* Threat level badge */}
                      <div className={`inline-flex items-center gap-2 rounded-xl ${cfg.bg} ${cfg.ring} ring-1 px-4 py-2`}>
                        <VIcon className={`h-5 w-5 ${cfg.color}`} />
                        <div>
                          <span className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">— {cfg.sublabel}</span>
                        </div>
                      </div>

                      {/* Confidence */}
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          AI Confidence:{" "}
                          <span className={`font-semibold ${confidenceConfig[result.confidence].color}`}>
                            {result.confidence}
                          </span>
                        </span>
                        {result.modelUsed && (
                          <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-xs font-mono text-muted-foreground/60">{result.modelUsed}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* 6 Signal Cards */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Threat Signal Breakdown
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(result.signals) as (keyof typeof result.signals)[]).map((key, i) => (
                  <SignalCard
                    key={key}
                    signalKey={key}
                    signal={result.signals[key]}
                    delay={i * 0.07}
                  />
                ))}
              </div>
            </div>

            {/* Red flags + Safe factors */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Red flags */}
              {result.redFlags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="glass rounded-2xl p-5 ring-1 ring-red-500/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground">Red Flags</h3>
                    <span className="ml-auto text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                      {result.redFlags.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {result.redFlags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Safe factors */}
              {result.safeFactors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.58 }}
                  className="glass rounded-2xl p-5 ring-1 ring-emerald-500/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground">Safe Factors</h3>
                    <span className="ml-auto text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {result.safeFactors.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {result.safeFactors.map((factor, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Recommendation */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="glass rounded-2xl p-5 ring-1 ring-primary/20 bg-primary/3"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">AI Recommendation</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.recommendation}</p>
                </div>
              </div>
            </motion.div>

            {/* Reset button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              type="button"
              onClick={reset}
              className="w-full glass rounded-2xl py-3.5 text-sm font-semibold text-foreground ring-1 ring-black/10 hover:ring-primary/40 hover:bg-black/5 transition-all"
            >
              ← Analyze Another Domain
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
