"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Globe, Shield, ShieldAlert, ShieldCheck,
  AlertTriangle, CheckCircle2, XCircle, ScanSearch,
  ImageIcon, Link2, Loader2, Eye, Fingerprint,
  Palette, LogIn, Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { backendFetch } from "@/lib/backendFetch";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CloneResult {
  similarityScore: number;
  copiedLoginPage: boolean;
  fakeLogoDetected: boolean;
  colorThemeCopied: "Copied" | "Similar" | "Different";
  verdict: "FAKE" | "SUSPICIOUS" | "LEGITIMATE";
  suspiciousElements: string[];
  explanation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  modelUsed?: string;
}

// ─── Config maps ──────────────────────────────────────────────────────────────
const verdictConfig = {
  FAKE: {
    label: "Fake Website Detected",
    icon: ShieldAlert,
    color: "text-red-500",
    bg: "bg-red-500/10",
    ring: "ring-red-500/30",
    glow: "rgba(239,68,68,0.15)",
    bar: "bg-red-500",
  },
  SUSPICIOUS: {
    label: "Suspicious — Proceed with Caution",
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    ring: "ring-orange-500/30",
    glow: "rgba(249,115,22,0.15)",
    bar: "bg-orange-500",
  },
  LEGITIMATE: {
    label: "Appears Legitimate",
    icon: ShieldCheck,
    color: "text-green-500",
    bg: "bg-green-500/10",
    ring: "ring-green-500/30",
    glow: "rgba(34,197,94,0.15)",
    bar: "bg-green-500",
  },
};

const confidenceConfig = {
  HIGH:   { color: "text-green-500",  bg: "bg-green-500/10" },
  MEDIUM: { color: "text-yellow-500", bg: "bg-yellow-500/10" },
  LOW:    { color: "text-red-400",    bg: "bg-red-400/10" },
};

// ─── Circular score gauge ─────────────────────────────────────────────────────
function ScoreGauge({ score, verdict }: { score: number; verdict: "FAKE" | "SUSPICIOUS" | "LEGITIMATE" }) {
  const cfg = verdictConfig[verdict];
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (score / 100) * circumference;

  const strokeColor =
    verdict === "FAKE"       ? "#ef4444"
    : verdict === "SUSPICIOUS" ? "#f97316"
    : "#22c55e";

  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
        {/* Track */}
        <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {/* Progress */}
        <motion.circle
          cx="64" cy="64" r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - strokeDash }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <motion.span
          className={`text-3xl font-black ${cfg.color}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {score}%
        </motion.span>
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
          Similar
        </span>
      </div>
    </div>
  );
}

// ─── Metric badge ─────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon, label, value, positive, delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  positive: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`glass flex items-center gap-3 rounded-2xl p-4 ring-1 ${
        positive ? "ring-red-500/20" : "ring-green-500/20"
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        positive ? "bg-red-500/10" : "bg-green-500/10"
      }`}>
        <Icon className={`h-5 w-5 ${positive ? "text-red-500" : "text-green-500"}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={`text-sm font-bold ${positive ? "text-red-500" : "text-green-500"}`}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CloneDetectTab() {
  const [screenshot, setScreenshot]         = useState<File | null>(null);
  const [screenshotPreview, setPreview]     = useState<string | null>(null);
  const [suspectedUrl, setSuspectedUrl]     = useState("");
  const [originalUrl, setOriginalUrl]       = useState("");
  const [isDragging, setIsDragging]         = useState(false);
  const [isAnalyzing, setIsAnalyzing]       = useState(false);
  const [progress, setProgress]             = useState(0);
  const [progressLabel, setProgressLabel]   = useState("");
  const [result, setResult]                 = useState<CloneResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File helpers ─────────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Screenshot must be under 8 MB");
      return;
    }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Analyse ──────────────────────────────────────────────────────────────
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshot && !suspectedUrl.trim()) {
      toast.error("Upload a screenshot or enter a suspected URL");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setProgress(0);

    const steps: [number, string][] = [
      [10, "Preparing image…"],
      [25, "Connecting to AI…"],
      [45, "Analysing visual structure…"],
      [65, "Detecting cloned elements…"],
      [80, "Generating verdict…"],
      [92, "Finalising report…"],
    ];

    let stepIdx = 0;
    const ticker = setInterval(() => {
      if (stepIdx < steps.length) {
        const [pct, label] = steps[stepIdx++];
        setProgress(pct);
        setProgressLabel(label);
      }
    }, 900);

    try {
      // Convert image to base64 (strip data: prefix, backend adds it back safely)
      let screenshotBase64: string | undefined;
      if (screenshot && screenshotPreview) {
        screenshotBase64 = screenshotPreview; // keep full data-URL
      }

      const body: Record<string, string | undefined> = {
        suspectedUrl: suspectedUrl.trim() || undefined,
        originalUrl:  originalUrl.trim()  || undefined,
        screenshotBase64,
      };

      const res = await backendFetch("/api/clone-detect", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setProgress(100);
      setProgressLabel("Done!");
      setResult(data as CloneResult);

      if (data.verdict === "FAKE") {
        toast.error("⚠️ Fake website detected!");
      } else if (data.verdict === "SUSPICIOUS") {
        toast("🟠 Site looks suspicious — check the report", { icon: "⚠️" });
      } else {
        toast.success("✅ Site appears legitimate");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    } finally {
      clearInterval(ticker);
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setScreenshot(null);
    setPreview(null);
    setSuspectedUrl("");
    setOriginalUrl("");
    setProgress(0);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Input Form ── */}
      <AnimatePresence mode="wait">
        {!result && (
          <motion.form
            key="form"
            onSubmit={handleAnalyze}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Drop zone */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <ImageIcon className="inline h-4 w-4 mr-1.5 text-primary" />
                Upload Screenshot <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-black/10 hover:border-primary/40 hover:bg-black/5"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />

                {screenshotPreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshotPreview}
                      alt="Uploaded screenshot"
                      className="w-full max-h-64 object-contain bg-black/5 rounded-xl"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 rounded-xl transition-opacity">
                      <p className="text-white text-sm font-semibold">Click to replace</p>
                    </div>
                    <div className="p-3 text-center text-xs text-muted-foreground border-t border-black/10">
                      {screenshot?.name} ({(screenshot!.size / 1024).toFixed(0)} KB)
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                    <motion.div
                      animate={isDragging ? { scale: 1.2 } : { scale: 1 }}
                      className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20"
                    >
                      <Upload className="h-7 w-7 text-primary" />
                    </motion.div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">
                        {isDragging ? "Drop it here!" : "Drag & drop a screenshot"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        or <span className="text-primary font-medium">click to browse</span> · PNG, JPG, WEBP up to 8 MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* URL inputs */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  <Globe className="inline h-4 w-4 mr-1.5 text-primary" />
                  Suspected Fake URL
                </label>
                <div className="glass flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-black/10 focus-within:ring-primary/40 transition-all">
                  <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type="url"
                    value={suspectedUrl}
                    onChange={(e) => setSuspectedUrl(e.target.value)}
                    placeholder="https://suspicious-site.com"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  <Shield className="inline h-4 w-4 mr-1.5 text-green-500" />
                  Original Site URL <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="glass flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-black/10 focus-within:ring-green-500/40 transition-all">
                  <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type="url"
                    value={originalUrl}
                    onChange={(e) => setOriginalUrl(e.target.value)}
                    placeholder="https://genuine-bank.com"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>
            </div>

            {/* Analyse button */}
            <button
              type="submit"
              disabled={isAnalyzing || (!screenshot && !suspectedUrl.trim())}
              className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-[#00D4AA] py-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <ScanSearch className="h-5 w-5" />
                  Analyse for Cloning
                </>
              )}
            </button>

            {/* Progress bar */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
                    <span>{progressLabel}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-[#00D4AA] rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        )}

        {/* ── Results Panel ── */}
        {result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Verdict Banner */}
            {(() => {
              const cfg = verdictConfig[result.verdict];
              const VerdictIcon = cfg.icon;
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`glass rounded-3xl p-6 ring-1 ${cfg.ring}`}
                  style={{ boxShadow: `0 0 40px ${cfg.glow}` }}
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Gauge */}
                    <div className="shrink-0">
                      <ScoreGauge score={result.similarityScore} verdict={result.verdict} />
                      <p className="text-center text-xs text-muted-foreground mt-2 font-medium">
                        Original Website Similarity
                      </p>
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-4">
                      <div className={`inline-flex items-center gap-2 rounded-xl ${cfg.bg} ${cfg.ring} ring-1 px-4 py-2`}>
                        <VerdictIcon className={`h-5 w-5 ${cfg.color}`} />
                        <span className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</span>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {result.explanation}
                      </p>

                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          AI Confidence:{" "}
                          <span className={`font-semibold ${confidenceConfig[result.confidence].color}`}>
                            {result.confidence}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Metric Cards Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                icon={LogIn}
                label="Copied Login Page"
                value={result.copiedLoginPage ? "Yes — Detected" : "No"}
                positive={result.copiedLoginPage}
                delay={0.1}
              />
              <MetricCard
                icon={Fingerprint}
                label="Fake Logo"
                value={result.fakeLogoDetected ? "Detected" : "Not Detected"}
                positive={result.fakeLogoDetected}
                delay={0.18}
              />
              <MetricCard
                icon={Palette}
                label="Color Theme"
                value={result.colorThemeCopied}
                positive={result.colorThemeCopied === "Copied"}
                delay={0.26}
              />
            </div>

            {/* Suspicious Elements */}
            {result.suspiciousElements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="glass rounded-2xl p-5 ring-1 ring-orange-500/20"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Suspicious Elements Found</h3>
                  <span className="ml-auto text-xs font-medium text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                    {result.suspiciousElements.length} flags
                  </span>
                </div>
                <div className="space-y-2">
                  {result.suspiciousElements.map((el, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.06 }}
                      className="flex items-start gap-2.5 rounded-xl bg-black/5 px-3 py-2.5"
                    >
                      <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{el}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Empty state for suspicious elements */}
            {result.suspiciousElements.length === 0 && result.verdict === "LEGITIMATE" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="glass rounded-2xl p-5 ring-1 ring-green-500/20 flex items-center gap-3"
              >
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  No suspicious elements were detected in this website.
                </p>
              </motion.div>
            )}

            {/* Info footer */}
            {result.modelUsed && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>Analysed by <span className="font-mono">{result.modelUsed}</span></span>
              </div>
            )}

            {/* Scan Again */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              type="button"
              onClick={reset}
              className="w-full glass rounded-2xl py-3.5 text-sm font-semibold text-foreground ring-1 ring-black/10 hover:ring-primary/40 hover:bg-black/5 transition-all"
            >
              ← Analyse Another Website
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info box when no result yet */}
      {!result && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-5 ring-1 ring-black/10"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ScanSearch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">How it works</p>
              <ul className="space-y-1 text-xs text-muted-foreground list-none">
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Upload a screenshot of the suspicious site</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Optionally enter the suspected URL and the genuine site URL</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Our AI analyses logos, colors, layout, login forms and more</li>
                <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Get a similarity score, verdict, and list of red flags</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
