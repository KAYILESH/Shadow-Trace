"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  ShieldAlert,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  User as UserIcon,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
} from "lucide-react";
import Sidebar from "@/frontend/components/layout/Sidebar";
import TopHeader from "@/frontend/components/layout/TopHeader";
import toast from "react-hot-toast";

const RISK_FACTORS = [
  { id: "profiles", label: "Public Profiles", points: 10, icon: UserIcon, desc: "Profiles on forums, databases, etc." },
  { id: "email", label: "Email Found", points: 30, icon: Mail, desc: "Email addresses exposed in breaches." },
  { id: "phone", label: "Phone Number Found", points: 30, icon: Phone, desc: "Direct contact numbers available." },
  { id: "location", label: "Location Found", points: 15, icon: MapPin, desc: "Physical addresses or general location." },
  { id: "socials", label: "Social Links Found", points: 10, icon: LinkIcon, desc: "Connected social media accounts." },
];

interface SavedRisk {
  score: number;
  risk_level: string;
  factors: Record<string, boolean>;
  created_at: string;
}

interface Props {
  user: SupabaseUser;
  savedRisk: SavedRisk | null;
}

export default function RiskContent({ user, savedRisk }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Restore saved factor checkboxes if user has a saved score ────────────────
  const [factors, setFactors] = useState<Record<string, boolean>>(
    savedRisk?.factors ?? {
      profiles: false,
      email: false,
      phone: false,
      location: false,
      socials: false,
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  const rawScore = Object.entries(factors).reduce((total, [key, isSelected]) => {
    if (isSelected) {
      const factor = RISK_FACTORS.find((f) => f.id === key);
      return total + (factor?.points || 0);
    }
    return total;
  }, 0);

  // Scale score to 100 (Max raw is 95)
  const scaledScore = Math.round((rawScore / 95) * 100);

  let riskLevel = "Low";
  let colorClass = "text-primary";
  let strokeColor = "#FF6B00";
  let bgGlow = "bg-primary/20";

  if (scaledScore > 60) {
    riskLevel = "High";
    colorClass = "text-danger";
    strokeColor = "#FF0033";
    bgGlow = "bg-danger/20";
  } else if (scaledScore > 30) {
    riskLevel = "Medium";
    colorClass = "text-secondary";
    strokeColor = "#FF3300";
    bgGlow = "bg-secondary/20";
  }

  const toggleFactor = (id: string) => {
    setFactors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: scaledScore, riskLevel, factors }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save score");
      toast.success("Risk score saved to your profile!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // SVG Circle calculation
  const circleRadius = 70;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (scaledScore / 100) * circleCircumference;

  return (
    <div className="min-h-screen bg-background">
      {/* Background Elements */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,107,0,0.04),transparent_70%)]" />
        <div className="cyber-grid absolute inset-0 opacity-10" />
      </div>

      {/* Mobile Sidebar Overlay */}
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

      {/* Main Content */}
      <div className="flex flex-col lg:pl-64 relative z-10 min-h-screen">
        <TopHeader user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                Privacy Risk Engine
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {savedRisk
                  ? "Your saved risk assessment has been restored."
                  : "Assess your privacy exposure to calculate your overall risk score."}
              </p>
            </div>

            {/* Restored from DB banner */}
            {savedRisk && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm"
              >
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Restored from your last save</strong>
                  {" "}— {new Date(savedRisk.created_at).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </span>
              </motion.div>
            )}

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Left Column: Form */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Exposed Data Factors</h2>
                  <div className="space-y-3">
                    {RISK_FACTORS.map((factor, i) => {
                      const isSelected = factors[factor.id];
                      return (
                        <motion.button
                          key={factor.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => toggleFactor(factor.id)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-black/10 border-black/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                              : "bg-black/5 border-transparent hover:bg-black/10"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${isSelected ? "bg-black/10" : "bg-black/5"} text-white`}>
                              <factor.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{factor.label}</p>
                              <p className="text-xs text-muted-foreground">{factor.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-foreground">+{factor.points}</span>
                            <div
                              className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                                isSelected ? "bg-primary border-primary text-background" : "border-muted-foreground/50"
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="h-4 w-4" />}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="glass rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-secondary" /> Actionable Recommendations
                  </h2>
                  <div className="space-y-4">
                    {scaledScore === 0 ? (
                      <p className="text-sm text-muted-foreground">Select factors above to see recommendations.</p>
                    ) : (
                      <>
                        {factors.email && (
                          <div className="flex items-start gap-3 text-sm">
                            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-muted-foreground"><strong className="text-foreground">Email Exposed:</strong> Use an email alias service (like SimpleLogin or Apple Hide My Email) and enable 2FA on your primary accounts.</p>
                          </div>
                        )}
                        {factors.phone && (
                          <div className="flex items-start gap-3 text-sm">
                            <ShieldAlert className="h-5 w-5 text-danger shrink-0 mt-0.5" />
                            <p className="text-muted-foreground"><strong className="text-foreground">Phone Exposed:</strong> Watch out for SIM-swapping attacks. Remove your number from data broker sites and consider using a VoIP number for public registrations.</p>
                          </div>
                        )}
                        {factors.location && (
                          <div className="flex items-start gap-3 text-sm">
                            <MapPin className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                            <p className="text-muted-foreground"><strong className="text-foreground">Location Tracked:</strong> Disable location sharing on social media posts and review app permissions on your mobile devices.</p>
                          </div>
                        )}
                        {factors.socials && (
                          <div className="flex items-start gap-3 text-sm">
                            <LinkIcon className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                            <p className="text-muted-foreground"><strong className="text-foreground">Socials Linked:</strong> Set your personal social accounts to private and unlink them from third-party services you no longer use.</p>
                          </div>
                        )}
                        {factors.profiles && (
                          <div className="flex items-start gap-3 text-sm">
                            <UserIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-muted-foreground"><strong className="text-foreground">Public Profiles:</strong> Search your username and request deletion from forums or sites where you inadvertently shared personal info.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Score Display */}
              <div className="space-y-6">
                <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className={`absolute inset-0 ${bgGlow} blur-[60px] opacity-30 transition-colors duration-500`} />

                  <h2 className="text-lg font-semibold text-foreground mb-6 relative z-10">Overall Risk Score</h2>

                  <div className="relative flex items-center justify-center w-48 h-48 z-10">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r={circleRadius} className="stroke-white/10" strokeWidth="12" fill="transparent" />
                      <motion.circle
                        cx="80"
                        cy="80"
                        r={circleRadius}
                        stroke={strokeColor}
                        strokeWidth="12"
                        fill="transparent"
                        strokeLinecap="round"
                        style={{ strokeDasharray: circleCircumference }}
                        initial={{ strokeDashoffset: circleCircumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        key={scaledScore}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-5xl font-bold ${colorClass}`}
                      >
                        {scaledScore}
                      </motion.span>
                      <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">/ 100</span>
                    </div>
                  </div>

                  <div className="mt-6 text-center relative z-10">
                    <p className="text-sm text-muted-foreground mb-1">Risk Level</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-black/5 border border-black/10 ${colorClass}`}>
                      {riskLevel} Risk
                    </span>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={isSaving || scaledScore === 0}
                    className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl bg-black/10 px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-black/10 disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                  >
                    {isSaving ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                      />
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Score
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
