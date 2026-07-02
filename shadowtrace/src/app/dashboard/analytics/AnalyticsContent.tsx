"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  BarChart as BarChartIcon,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  BarChart2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Sidebar from "@/frontend/components/layout/Sidebar";
import TopHeader from "@/frontend/components/layout/TopHeader";

interface ScanRow {
  results: any;
  created_at: string;
}

interface RiskRow {
  score: number;
  created_at: string;
}

interface Props {
  user: SupabaseUser;
  initialScans: ScanRow[];
  initialRiskScores: RiskRow[];
}

const PLATFORM_COLORS: Record<string, string> = {
  GitHub: "#FF6B00",
  Reddit: "#FF0033",
  Twitter: "#FF3300",
  Instagram: "#FF4D6D",
  Medium: "#FF8C00",
  Pinterest: "#FF2D55",
  Behance: "#FF6347",
};

// ── Data transformers using REAL scan/risk data ───────────────────────────────

function buildRiskTrend(riskScores: RiskRow[]) {
  return riskScores.map((r, i) => ({
    date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: r.score,
  }));
}

function buildTimeline(scans: ScanRow[]) {
  const monthMap: Record<string, number> = {};
  scans.forEach((scan) => {
    const label = new Date(scan.created_at).toLocaleString("default", { month: "short" });
    monthMap[label] = (monthMap[label] || 0) + 1;
  });
  return Object.entries(monthMap).map(([date, exposures]) => ({ date, exposures }));
}

function buildPieData(scans: ScanRow[]) {
  const counts: Record<string, number> = {};
  scans.forEach((scan) => {
    (scan.results as any[]).forEach((r: any) => {
      if (r.status === "FOUND") counts[r.platform] = (counts[r.platform] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value, color: PLATFORM_COLORS[name] ?? "#FF6B00" }))
    .sort((a, b) => b.value - a.value);
}

function buildBarData(scans: ScanRow[]) {
  const platformMap: Record<string, { found: number; notFound: number }> = {};
  scans.forEach((scan) => {
    (scan.results as any[]).forEach((r: any) => {
      if (!platformMap[r.platform]) platformMap[r.platform] = { found: 0, notFound: 0 };
      if (r.status === "FOUND") platformMap[r.platform].found += 1;
      else if (r.status === "NOT_FOUND") platformMap[r.platform].notFound += 1;
    });
  });
  return Object.entries(platformMap).map(([platform, vals]) => ({
    platform,
    found: vals.found,
    notFound: vals.notFound,
  }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      }}>
        <p style={{ color: "#0F172A", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: entry.color }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: entry.color, display: "inline-block" }} />
            {entry.name}: <span style={{ fontWeight: 700, color: "#0F172A" }}>{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 relative z-10">
    <BarChart2 className="h-10 w-10 text-muted-foreground/40" />
    <p className="text-sm text-muted-foreground text-center">{message}</p>
  </div>
);

export default function AnalyticsContent({ user, initialScans, initialRiskScores }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const hasScans = initialScans.length > 0;
  const hasRisk = initialRiskScores.length > 1; // Need 2+ points for a meaningful trend

  const riskData = buildRiskTrend(initialRiskScores);
  const timelineData = buildTimeline(initialScans);
  const pieData = buildPieData(initialScans);
  const barData = buildBarData(initialScans);

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,107,0,0.04),transparent_70%)]" />
        <div className="cyber-grid absolute inset-0 opacity-10" />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      <div className="flex flex-col lg:pl-64 relative z-10 min-h-screen">
        <TopHeader user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl flex items-center gap-3">
                  <BarChartIcon className="h-8 w-8 text-secondary" />
                  Analytics Dashboard
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {!hasScans
                    ? "No data yet — run your first scan to see real analytics."
                    : "Your real digital footprint exposure metrics and trends."}
                </p>
              </div>
            </div>

            {/* Top Row Charts */}
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Risk Trend Chart */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-6 h-[400px] flex flex-col group relative overflow-hidden"
              >
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-danger/10 blur-[50px] transition-all duration-500 group-hover:bg-danger/20" />
                <div className="mb-6 relative z-10">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-danger" /> Risk Score History
                  </h3>
                </div>
                {!hasRisk ? (
                  <EmptyChart message="Save your risk score at least twice to see your trend over time." />
                ) : (
                  <div className="flex-1 min-h-0 relative z-10">
                    {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF0033" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#FF0033" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0,0,0,0.08)", strokeWidth: 1 }} />
                        <Area type="monotone" dataKey="score" name="Risk Score" stroke="#FF0033" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScore)" animationDuration={1200} />
                      </AreaChart>
                    </ResponsiveContainer>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Profiles Found Pie Chart */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-6 h-[400px] flex flex-col group relative overflow-hidden"
              >
                <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-primary/10 blur-[50px] transition-all duration-500 group-hover:bg-primary/20" />
                <div className="mb-6 relative z-10">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" /> Profiles Distribution
                  </h3>
                </div>
                {pieData.length === 0 ? (
                  <EmptyChart message="No exposed profiles found yet. Perform scans to see platform distribution." />
                ) : (
                  <div className="flex-1 min-h-0 relative z-10">
                    {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none" animationBegin={200} animationDuration={1000} animationEasing="ease-out">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity" />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: "#64748B", fontSize: 13 }}>{value}</span>} iconType="circle" iconSize={8} />
                      </PieChart>
                    </ResponsiveContainer>
                    )}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Bottom Row Charts */}
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Scan Timeline */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-6 h-[400px] flex flex-col group relative overflow-hidden"
              >
                <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-secondary/10 blur-[50px] transition-all duration-500 group-hover:bg-secondary/20" />
                <div className="mb-6 relative z-10">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-secondary" /> Scan Timeline
                  </h3>
                </div>
                {timelineData.length === 0 ? (
                  <EmptyChart message="No scan history yet. Your monthly scan activity will appear here." />
                ) : (
                  <div className="flex-1 min-h-0 relative z-10">
                    {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="exposures" name="Scans" stroke="#FF3300" strokeWidth={3} dot={{ r: 4, fill: "#ffffff", strokeWidth: 2, stroke: "#FF3300" }} activeDot={{ r: 7, fill: "#FF3300", stroke: "none" }} animationDuration={1200} />
                      </LineChart>
                    </ResponsiveContainer>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Platform Bar Chart */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="glass rounded-2xl p-6 h-[400px] flex flex-col group relative overflow-hidden"
              >
                <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-yellow-500/10 blur-[50px] transition-all duration-500 group-hover:bg-yellow-500/20" />
                <div className="mb-6 relative z-10">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-yellow-500" /> Platform Statistics
                  </h3>
                </div>
                {barData.length === 0 ? (
                  <EmptyChart message="No platform data yet. Scan usernames to see found vs. not found by platform." />
                ) : (
                  <div className="flex-1 min-h-0 relative z-10">
                    {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis dataKey="platform" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                        <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "#64748B", fontSize: 13 }}>{v}</span>} wrapperStyle={{ paddingBottom: "20px" }} />
                        <Bar dataKey="found" name="Exposed" stackId="a" fill="#FF0033" radius={[0, 0, 4, 4]} animationDuration={1000} />
                        <Bar dataKey="notFound" name="Secure" stackId="a" fill="#FF6B00" radius={[4, 4, 0, 0]} animationDuration={1000} />
                      </BarChart>
                    </ResponsiveContainer>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
