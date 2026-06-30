"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Loader2, Shield, AlertTriangle,
  CheckCircle2, ExternalLink, HelpCircle, Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { backendFetch } from "@/lib/backendFetch";

interface PlatformResult {
  platform:  string;
  icon:      string;
  category:  string;
  url:       string;
  status:    "CONFIRMED" | "LIKELY" | "POSSIBLE";
}

interface PhoneResult {
  phone:         string;
  formatted:     string;
  countryInfo:   { country: string; code: string; flag: string };
  results:       PlatformResult[];
  confirmedCount: number;
  likelyCount:   number;
  exposureScore: number;
  riskLevel:     "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

const riskConfig = {
  LOW:      { color: "text-green-600",  bg: "bg-green-50",  ring: "ring-green-200",  bar: "bg-green-500",  label: "Low Risk"     },
  MEDIUM:   { color: "text-yellow-600", bg: "bg-yellow-50", ring: "ring-yellow-200", bar: "bg-yellow-500", label: "Medium Risk"  },
  HIGH:     { color: "text-orange-600", bg: "bg-orange-50", ring: "ring-orange-200", bar: "bg-orange-500", label: "High Risk"    },
  CRITICAL: { color: "text-red-600",    bg: "bg-red-50",    ring: "ring-red-200",    bar: "bg-red-500",    label: "Critical Risk"},
};

const statusConfig = {
  CONFIRMED: { color: "text-red-600",    bg: "bg-red-50",    ring: "ring-red-200",    dot: "bg-red-500",    label: "Confirmed",  icon: "🔴" },
  LIKELY:    { color: "text-orange-600", bg: "bg-orange-50", ring: "ring-orange-200", dot: "bg-orange-500", label: "Likely",     icon: "🟠" },
  POSSIBLE:  { color: "text-blue-600",   bg: "bg-blue-50",   ring: "ring-blue-200",   dot: "bg-blue-400",   label: "Possible",   icon: "🔵" },
};

const CATEGORIES = ["Messaging", "Social", "Professional", "Payment", "Caller ID"];

export default function PhoneScanTab() {
  const [phone, setPhone]         = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult]       = useState<PhoneResult | null>(null);
  const [filter, setFilter]       = useState<string>("All");

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Please enter a phone number with country code");
      return;
    }
    setIsScanning(true);
    setResult(null);
    try {
      const res = await backendFetch("/api/phone-scan", {
        method: "POST",
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
      if (data.confirmedCount > 0) {
        toast.error(`Found on ${data.confirmedCount} confirmed platforms!`);
      } else {
        toast.success("Phone scan complete!");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const risk = result ? riskConfig[result.riskLevel] : null;

  const filteredResults = result?.results.filter(r =>
    filter === "All" ? true : r.category === filter
  ) ?? [];

  return (
    <div className="space-y-6">

      {/* ── Input Form ──────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-primary/8 blur-3xl" />
        <h3 className="mb-1 text-lg font-bold text-foreground flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" /> Mobile Number Scanner
        </h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Enter a mobile number with country code to check which apps and platforms it's registered on.
        </p>

        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Phone Number <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210  or  +1 234 567 8900"
                required
                className="w-full rounded-xl border border-black/10 bg-black/5 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:bg-white"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Include country code — e.g. <strong>+91</strong> for India, <strong>+1</strong> for USA
            </p>
          </div>

          <motion.button
            type="submit"
            disabled={isScanning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isScanning ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Scanning Platforms...</>
            ) : (
              <><Search className="h-4 w-4" /> Scan Phone Number</>
            )}
          </motion.button>
        </form>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-6 text-center space-y-3"
          >
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold text-foreground">Checking platforms...</p>
            <div className="space-y-1.5 text-left max-w-xs mx-auto">
              {["Detecting country & carrier", "Checking WhatsApp", "Checking Truecaller", "Checking social platforms", "Calculating exposure score"].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
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
            {/* Top row: Score + Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Exposure Score */}
              <div className={`glass rounded-2xl p-5 ring-1 ${risk.ring} relative overflow-hidden`}>
                <div className={`absolute inset-0 ${risk.bg} opacity-30`} />
                <div className="relative z-10">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Exposure Score</p>
                  <div className="flex items-end gap-2 mb-3">
                    <p className={`text-5xl font-black ${risk.color}`}>{result.exposureScore}</p>
                    <p className={`text-sm font-bold mb-1 ${risk.color}`}>/ 100</p>
                  </div>
                  <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.exposureScore}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${risk.bar}`}
                    />
                  </div>
                  <p className={`mt-2 text-xs font-bold uppercase ${risk.color}`}>{risk.label}</p>
                </div>
              </div>

              {/* Phone Info */}
              <div className="glass rounded-2xl p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Details</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{result.countryInfo.flag}</span>
                  <div>
                    <p className="font-bold text-foreground text-lg">{result.formatted}</p>
                    <p className="text-sm text-muted-foreground">{result.countryInfo.country} · {result.countryInfo.code}</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <div className="text-center">
                    <p className="text-xl font-black text-red-600">{result.confirmedCount}</p>
                    <p className="text-xs text-muted-foreground">Confirmed</p>
                  </div>
                  <div className="w-px bg-black/10" />
                  <div className="text-center">
                    <p className="text-xl font-black text-orange-500">{result.likelyCount}</p>
                    <p className="text-xs text-muted-foreground">Likely</p>
                  </div>
                  <div className="w-px bg-black/10" />
                  <div className="text-center">
                    <p className="text-xl font-black text-blue-500">{result.results.filter(r => r.status === "POSSIBLE").length}</p>
                    <p className="text-xs text-muted-foreground">Possible</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="glass rounded-2xl p-4">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                  <span className="font-semibold text-foreground">Confirmed</span>
                  <span className="text-muted-foreground">— Real HTTP check passed (registered)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />
                  <span className="font-semibold text-foreground">Likely</span>
                  <span className="text-muted-foreground">— Very commonly used in your region</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-400 inline-block" />
                  <span className="font-semibold text-foreground">Possible</span>
                  <span className="text-muted-foreground">— Platform uses phone numbers globally</span>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {["All", ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    filter === cat
                      ? "bg-primary text-white shadow-sm"
                      : "bg-black/5 text-muted-foreground hover:bg-black/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Platform Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredResults.map((item, i) => {
                const sc = statusConfig[item.status];
                return (
                  <motion.div
                    key={item.platform}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className={`glass rounded-xl p-4 ring-1 ${sc.ring} relative overflow-hidden group hover:-translate-y-0.5 transition-all`}
                  >
                    <div className={`absolute inset-0 ${sc.bg} opacity-20`} />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{item.platform}</p>
                          <p className="text-[11px] text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-[11px] font-bold uppercase ${sc.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {item.status === "CONFIRMED" ? "Found" : item.status}
                        </span>
                        {item.status === "CONFIRMED" && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Recommendations */}
            <div className="glass rounded-2xl p-5">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Recommendations
              </h4>
              <div className="space-y-2">
                {result.confirmedCount > 0 && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700 font-medium">
                      Your number is confirmed on {result.confirmedCount} platform{result.confirmedCount > 1 ? "s" : ""}. Review privacy settings on each app.
                    </p>
                  </div>
                )}
                <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-200 p-3">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 font-medium">
                    Enable "Who can see my phone number → Nobody" in WhatsApp, Telegram, and Instagram privacy settings.
                  </p>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl bg-orange-50 border border-orange-200 p-3">
                  <HelpCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-orange-700 font-medium">
                    Check Truecaller and opt out of their database to hide your name from spam callers.
                  </p>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl bg-green-50 border border-green-200 p-3">
                  <Shield className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-green-700 font-medium">
                    Use a secondary/virtual number for non-essential app registrations to reduce exposure.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
