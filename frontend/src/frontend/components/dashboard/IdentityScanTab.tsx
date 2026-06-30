"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, User, Shield, AlertTriangle, CheckCircle2, XCircle,
  Loader2, ExternalLink, Lock, Eye, ShieldAlert, ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { backendFetch } from "@/lib/backendFetch";

interface IdentityResult {
  email: string;
  name: string | null;
  domain: string;
  emailProvider: string;
  gravatar: { found: boolean; avatarUrl: string | null };
  hibp: { breached: boolean; count: number; breaches: string[] };
  connectedServices: { name: string; url: string; icon: string; likely: boolean }[];
  exposureScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  hasHIBPKey: boolean;
}

const riskConfig = {
  LOW:      { color: "text-green-600",  bg: "bg-green-50",  ring: "ring-green-200", bar: "bg-green-500",  label: "Low Risk"      },
  MEDIUM:   { color: "text-yellow-600", bg: "bg-yellow-50", ring: "ring-yellow-200",bar: "bg-yellow-500", label: "Medium Risk"   },
  HIGH:     { color: "text-orange-600", bg: "bg-orange-50", ring: "ring-orange-200",bar: "bg-orange-500", label: "High Risk"     },
  CRITICAL: { color: "text-red-600",    bg: "bg-red-50",    ring: "ring-red-200",   bar: "bg-red-500",    label: "Critical Risk" },
};

export default function IdentityScanTab() {
  const [email, setEmail]         = useState("");
  const [name, setName]           = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult]       = useState<IdentityResult | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsScanning(true);
    setResult(null);

    try {
      const res = await backendFetch("/api/identity-scan", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");

      setResult(data);
      if (data.hibp.breached) {
        toast.error(`⚠️ Email found in ${data.hibp.count} data breach${data.hibp.count > 1 ? "es" : ""}!`);
      } else {
        toast.success("Identity scan complete!");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const risk = result ? riskConfig[result.riskLevel] : null;

  return (
    <div className="space-y-6">
      {/* ── Input Form ──────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/8 blur-3xl" />
        <h3 className="mb-1 text-lg font-bold text-foreground flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" /> Identity Scanner
        </h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Enter your email (and optionally your name) to check where you're exposed online.
        </p>

        <form onSubmit={handleScan} className="space-y-4">
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                required
                className="w-full rounded-xl border border-black/10 bg-black/5 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:bg-white"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Full Name <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-xl border border-black/10 bg-black/5 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:bg-white"
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isScanning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isScanning ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Scanning Identity...</>
            ) : (
              <><Eye className="h-4 w-4" /> Scan My Identity</>
            )}
          </motion.button>
        </form>
      </div>

      {/* ── Loading State ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-6 text-center space-y-3"
          >
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold text-foreground">Scanning your identity...</p>
            <div className="space-y-1.5 text-left max-w-xs mx-auto">
              {["Checking Gravatar profile", "Querying data breach databases", "Analyzing connected services", "Calculating exposure score"].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  {step}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && !isScanning && risk && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Risk Score Card */}
            <div className={`glass rounded-2xl p-6 ring-1 ${risk.ring} relative overflow-hidden`}>
              <div className={`absolute inset-0 ${risk.bg} opacity-30`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Identity Exposure Score</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{result.email}</p>
                  </div>
                  <div className={`text-right`}>
                    <p className={`text-4xl font-black ${risk.color}`}>{result.exposureScore}</p>
                    <p className={`text-xs font-bold uppercase ${risk.color}`}>{risk.label}</p>
                  </div>
                </div>
                {/* Score bar */}
                <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.exposureScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${risk.bar}`}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-medium">
                  <span>0 — Safe</span><span>50 — High</span><span>100 — Critical</span>
                </div>
              </div>
            </div>

            {/* Gravatar + Provider Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gravatar */}
              <div className="glass rounded-2xl p-5 flex items-center gap-4">
                {result.gravatar.found && result.gravatar.avatarUrl ? (
                  <img src={result.gravatar.avatarUrl} alt="Gravatar" className="h-14 w-14 rounded-full ring-2 ring-primary/30" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center ring-2 ring-black/10">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground text-sm">Gravatar Profile</p>
                  {result.gravatar.found ? (
                    <p className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="h-3 w-3" /> Public profile found
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" /> No public profile
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">Used on WordPress, GitHub etc.</p>
                </div>
              </div>

              {/* Email Provider */}
              <div className="glass rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Email Provider</p>
                <p className="font-bold text-foreground text-lg">{result.emailProvider}</p>
                <p className="text-xs text-muted-foreground mt-0.5">@{result.domain}</p>
                <p className="text-xs text-primary mt-1.5 font-medium">{result.connectedServices.length} services detected</p>
              </div>
            </div>

            {/* Data Breaches */}
            <div className={`glass rounded-2xl p-5 ${result.hibp.breached ? "ring-1 ring-red-200" : ""}`}>
              <div className="flex items-center gap-2 mb-3">
                {result.hibp.breached ? (
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                )}
                <h4 className="font-bold text-foreground">Data Breach Check</h4>
                {!result.hasHIBPKey && (
                  <span className="ml-auto text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">Demo Mode</span>
                )}
              </div>

              {!result.hasHIBPKey ? (
                <div className="rounded-xl bg-muted/60 border border-black/8 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">🔑 HIBP API Key Required</p>
                  <p>To enable real breach checking, add <code className="text-xs bg-black/8 px-1 py-0.5 rounded">HIBP_API_KEY</code> to your <code className="text-xs bg-black/8 px-1 py-0.5 rounded">.env.local</code> file.</p>
                  <a href="https://haveibeenpwned.com/API/Key" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-primary text-xs font-medium hover:underline">
                    Get API Key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : result.hibp.breached ? (
                <div>
                  <p className="text-sm text-red-600 font-medium mb-2">
                    ⚠️ Found in <strong>{result.hibp.count}</strong> data breach{result.hibp.count > 1 ? "es" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.hibp.breaches.map((b) => (
                      <span key={b} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 font-medium">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> No data breaches found for this email.
                </p>
              )}
            </div>

            {/* Connected Services */}
            {result.connectedServices.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Connected Services
                  <span className="ml-auto text-xs text-muted-foreground font-normal">Services linked to your email provider</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {result.connectedServices.map((svc) => (
                    <a
                      key={svc.name}
                      href={svc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-xl border border-black/8 bg-black/5 px-3 py-2.5 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                    >
                      <span className="text-lg">{svc.icon}</span>
                      <span className="text-xs font-medium text-foreground group-hover:text-primary truncate">{svc.name}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="glass rounded-2xl p-5">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Recommendations
              </h4>
              <div className="space-y-2">
                {result.hibp.breached && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700 font-medium">Change your password immediately on all platforms where you used this email.</p>
                  </div>
                )}
                {result.gravatar.found && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-orange-50 border border-orange-200 p-3">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-orange-700 font-medium">Your Gravatar is public — anyone can see your profile photo linked to this email.</p>
                  </div>
                )}
                <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-200 p-3">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 font-medium">Enable 2-Factor Authentication (2FA) on all services linked to this email.</p>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl bg-green-50 border border-green-200 p-3">
                  <Shield className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-green-700 font-medium">Use a password manager (e.g. Bitwarden) to generate unique passwords for each service.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
