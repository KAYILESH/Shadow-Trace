"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Code,
  Camera,
  Hash,
  History,
  Clock,
  ChevronDown,
  ChevronUp,
  Mail,
  Fingerprint,
  Phone,
} from "lucide-react";
import Sidebar from "@/frontend/components/layout/Sidebar";
import TopHeader from "@/frontend/components/layout/TopHeader";
import IdentityScanTab from "@/frontend/components/dashboard/IdentityScanTab";
import PhoneScanTab from "@/frontend/components/dashboard/PhoneScanTab";
import toast from "react-hot-toast";

interface ScanResult {
  platform: string;
  profileUrl: string;
  status: "FOUND" | "NOT_FOUND" | "ERROR";
}

interface PastScan {
  id: string;
  target_username: string;
  results: ScanResult[];
  created_at: string;
}

interface Props {
  user: SupabaseUser;
  pastScans: PastScan[];
}

const platformIcons: Record<string, React.ReactNode> = {
  GitHub: <Code className="h-5 w-5" />,
  Reddit: <div className="h-5 w-5 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-xs ring-1 ring-orange-500/50">r/</div>,
  Pinterest: <div className="h-5 w-5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold text-xs ring-1 ring-red-500/50">P</div>,
  Instagram: <Camera className="h-5 w-5" />,
  Twitter: <Hash className="h-5 w-5" />,
};

export default function ScansContent({ user, pastScans }: Props) {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [activeTab, setActiveTab]       = useState<"username" | "identity" | "phone">("username");
  const [username, setUsername]         = useState("");
  const [isScanning, setIsScanning]     = useState(false);
  const [progress, setProgress]         = useState(0);
  const [results, setResults]           = useState<ScanResult[] | null>(null);
  const [history, setHistory]           = useState<PastScan[]>(pastScans);
  const [expandedScan, setExpandedScan] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Please enter a username to scan");
      return;
    }

    setIsScanning(true);
    setResults(null);
    setProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 400);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to scan username");
      }

      setResults(data.results);
      setProgress(100);
      toast.success("Scan complete!");

      // Add the new scan to the top of history
      if (data.scanId) {
        const newScan: PastScan = {
          id: data.scanId,
          target_username: username.trim(),
          results: data.results,
          created_at: new Date().toISOString(),
        };
        setHistory((prev) => [newScan, ...prev]);
        setExpandedScan(null); // collapse any open history item
      }
    } catch (error: any) {
      toast.error(error.message);
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsScanning(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedScan((prev) => (prev === id ? null : id));
  };

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
            {/* ── Tab Header ──────────────────────────────────────────────── */}
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Scanner</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Search for exposed usernames or scan your email identity across platforms.
              </p>

              {/* Tab Toggle */}
              <div className="mt-4 inline-flex rounded-xl border border-black/10 bg-black/5 p-1 gap-1">
                <button
                  onClick={() => setActiveTab("username")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    activeTab === "username"
                      ? "bg-white text-foreground shadow-sm ring-1 ring-black/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Fingerprint className="h-4 w-4" />
                  Username Scan
                </button>
                <button
                  onClick={() => setActiveTab("identity")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    activeTab === "identity"
                      ? "bg-white text-foreground shadow-sm ring-1 ring-black/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  Identity Scan
                </button>
                <button
                  onClick={() => setActiveTab("phone")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    activeTab === "phone"
                      ? "bg-white text-foreground shadow-sm ring-1 ring-black/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Phone className="h-4 w-4" />
                  Mobile Number
                </button>
              </div>
            </div>

            {/* ── Username Scan Tab ────────────────────────────────────────── */}
            {activeTab === "username" && (<>

            {/* Search Form */}
            <form onSubmit={handleScan} className="relative max-w-2xl">
              <div className="glass-strong relative flex items-center overflow-hidden rounded-2xl p-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/50">
                <Search className="ml-4 h-6 w-6 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username (e.g., john123)"
                  className="flex-1 border-0 bg-transparent px-4 py-3 text-lg text-foreground placeholder:text-muted-foreground focus:ring-0"
                  disabled={isScanning}
                />
                <button
                  type="submit"
                  disabled={isScanning || !username.trim()}
                  className="relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-[#00D4AA] px-8 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition-all hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isScanning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent"
                      />
                      Scanning...
                    </>
                  ) : (
                    "Scan Now"
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              <AnimatePresence>
                {isScanning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
                      <span>Scanning networks...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-secondary"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Latest Scan Results */}
            <AnimatePresence mode="popLayout">
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-foreground">Latest Scan Results</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {results.map((result, i) => (
                      <motion.div
                        key={result.platform}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1, duration: 0.3 }}
                        className="glass group relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-[40px] transition-all opacity-20 ${
                          result.status === "FOUND" ? "bg-danger" : result.status === "NOT_FOUND" ? "bg-primary" : "bg-yellow-500"
                        }`} />

                        <div className="relative z-10 flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/5 ring-1 ring-black/10 text-white">
                              {platformIcons[result.platform] || <Search className="h-5 w-5" />}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{result.platform}</h3>
                              <div className="flex items-center gap-1.5 mt-1">
                                {result.status === "FOUND" ? (
                                  <span className="flex items-center gap-1 text-xs font-medium text-danger">
                                    <XCircle className="h-3.5 w-3.5" /> Exposed
                                  </span>
                                ) : result.status === "NOT_FOUND" ? (
                                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Secure
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs font-medium text-yellow-500">
                                    <AlertCircle className="h-3.5 w-3.5" /> Blocked
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {result.status === "FOUND" && (
                          <a
                            href={result.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative z-10 mt-4 flex items-center justify-between rounded-lg bg-black/5 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-black/10 hover:text-white"
                          >
                            <span className="truncate pr-2">{result.profileUrl}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </a>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Scan History Section ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Scan History</h2>
                <span className="text-xs font-medium text-muted-foreground bg-black/5 px-2 py-0.5 rounded-full">
                  {history.length} scan{history.length !== 1 ? "s" : ""}
                </span>
              </div>

              {history.length === 0 ? (
                <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                    <Search className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">No scans yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Run your first scan above — all results are saved here automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((scan, idx) => {
                    const foundCount = scan.results.filter((r) => r.status === "FOUND").length;
                    const isExpanded = expandedScan === scan.id;
                    return (
                      <motion.div
                        key={scan.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="glass rounded-2xl overflow-hidden"
                      >
                        {/* Summary Row */}
                        <button
                          onClick={() => toggleExpand(scan.id)}
                          className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-black/5 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                              <Search className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">@{scan.target_username}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {new Date(scan.created_at).toLocaleDateString("en-US", {
                                    month: "short", day: "numeric", year: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {foundCount > 0 ? (
                              <span className="flex items-center gap-1.5 text-sm font-semibold text-danger bg-danger/10 px-3 py-1 rounded-full">
                                <XCircle className="h-4 w-4" /> {foundCount} Exposed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                                <CheckCircle2 className="h-4 w-4" /> Clean
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Results */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden border-t border-black/10"
                            >
                              <div className="grid gap-3 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-4">
                                {scan.results.map((result) => (
                                  <div
                                    key={result.platform}
                                    className="flex items-center gap-3 rounded-xl bg-black/5 px-3 py-2.5"
                                  >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 text-foreground shrink-0">
                                      {platformIcons[result.platform] || <Search className="h-4 w-4" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{result.platform}</p>
                                      {result.status === "FOUND" ? (
                                        <a
                                          href={result.profileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-xs text-danger hover:underline"
                                        >
                                          <XCircle className="h-3 w-3 shrink-0" /> Exposed
                                          <ExternalLink className="h-3 w-3 shrink-0" />
                                        </a>
                                      ) : result.status === "NOT_FOUND" ? (
                                        <span className="flex items-center gap-1 text-xs text-primary">
                                          <CheckCircle2 className="h-3 w-3" /> Secure
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-xs text-yellow-500">
                                          <AlertCircle className="h-3 w-3" /> Blocked
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            </>)}

            {/* ── Identity Scan Tab ──────────────────────────────────────── */}
            {activeTab === "identity" && <IdentityScanTab />}

            {/* ── Phone Scan Tab ─────────────────────────────────────────── */}
            {activeTab === "phone" && <PhoneScanTab />}

          </motion.div>
        </main>
      </div>
    </div>
  );
}
