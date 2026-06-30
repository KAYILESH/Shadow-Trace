"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Activity,
  ShieldAlert,
  Search,
  Eye,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Sidebar from "@/frontend/components/layout/Sidebar";
import TopHeader from "@/frontend/components/layout/TopHeader";
import ScanHistoryChart from "@/frontend/components/dashboard/ScanHistoryChart";
import ExposureLevelChart from "@/frontend/components/dashboard/ExposureLevelChart";

interface Props {
  user: SupabaseUser;
  totalScans: number;
  riskScore: number;
  totalProfilesFound: number;
  activeThreats: number;
  scans: { results: any; created_at: string }[];
}

export default function DashboardContent({
  user,
  totalScans,
  riskScore,
  totalProfilesFound,
  activeThreats,
  scans,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stats = [
    {
      title: "Total Profiles Found",
      value: totalProfilesFound,
      icon: Eye,
      color: "text-secondary",
      bg: "bg-secondary/10",
      trendUp: totalProfilesFound > 0,
      trend: totalProfilesFound > 0 ? "Exposure detected" : "Clean",
    },
    {
      title: "Privacy Risk Score",
      value: riskScore,
      suffix: "/100",
      icon: ShieldAlert,
      color: riskScore > 60 ? "text-danger" : riskScore > 30 ? "text-yellow-400" : "text-primary",
      bg: riskScore > 60 ? "bg-danger/10" : riskScore > 30 ? "bg-yellow-400/10" : "bg-primary/10",
      trendUp: riskScore > 50,
      trend: riskScore === 0 ? "Not assessed" : riskScore > 60 ? "High risk" : riskScore > 30 ? "Medium risk" : "Low risk",
    },
    {
      title: "Total Scans",
      value: totalScans,
      icon: Search,
      color: "text-primary",
      bg: "bg-primary/10",
      trendUp: false,
      trend: totalScans === 0 ? "No scans yet" : `${totalScans} performed`,
    },
    {
      title: "Active Threats",
      value: activeThreats,
      icon: Activity,
      color: activeThreats > 0 ? "text-yellow-400" : "text-primary",
      bg: activeThreats > 0 ? "bg-yellow-400/10" : "bg-primary/10",
      trendUp: activeThreats > 0,
      trend: activeThreats === 0 ? "None detected" : `In latest scan`,
    },
  ];

  const hasAnyData = totalScans > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Background Elements */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,107,0,0.04),transparent_70%)]" />
        <div className="cyber-grid absolute inset-0 opacity-10" />

        {/* Radar Sweep Animation */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/2 h-[150vw] w-[150vw] -translate-x-1/2 -translate-y-1/2 origin-center"
          style={{
            background: "conic-gradient(from 0deg, transparent 70%, rgba(255, 107, 0, 0.05) 90%, rgba(255, 107, 0, 0.15) 100%)",
            borderRadius: "50%",
          }}
        />
        <div className="absolute left-1/2 top-1/2 h-[150vw] w-[150vw] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/5" />
        <div className="absolute left-1/2 top-1/2 h-[100vw] w-[100vw] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/5" />
        <div className="absolute left-1/2 top-1/2 h-[50vw] w-[50vw] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/5" />
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

      {/* Main Content Area */}
      <div className="flex flex-col lg:pl-64 relative z-10 min-h-screen">
        <TopHeader user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                Security Overview
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasAnyData
                  ? "Your real-time digital footprint and threat summary."
                  : "Welcome! Run your first scan to start monitoring your digital footprint."}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="glass group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,107,0,0.15)]"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg} ring-1 ring-border`}
                    >
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-xs font-medium ${
                        stat.trendUp ? "text-danger" : "text-muted-foreground"
                      }`}
                    >
                      {stat.trendUp ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {stat.trend}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-bold text-foreground">
                      {stat.value}
                      {stat.suffix && (
                        <span className="text-lg text-muted-foreground">{stat.suffix}</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <ScanHistoryChart scans={scans} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <ExposureLevelChart scans={scans} />
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
