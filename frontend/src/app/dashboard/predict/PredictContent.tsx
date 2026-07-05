"use client";

import { useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Sidebar from "@/frontend/components/layout/Sidebar";
import TopHeader from "@/frontend/components/layout/TopHeader";
import DomainPredictTab from "@/frontend/components/dashboard/DomainPredictTab";

interface Props {
  user: SupabaseUser;
}

export default function PredictContent({ user }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Page header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl flex items-center gap-3">
                AI Domain Predict
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 px-3 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/30 animate-pulse">
                  ✦ Most Innovative
                </span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Predict whether a newly created domain will become a phishing site — before it strikes.
              </p>
            </div>

            <DomainPredictTab />
          </div>
        </main>
      </div>
    </div>
  );
}
