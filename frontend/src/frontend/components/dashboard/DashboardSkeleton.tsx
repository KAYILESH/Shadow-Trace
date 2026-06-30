"use client";

import { motion } from "framer-motion";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-md bg-black/5 animate-pulse" />
          <div className="h-4 w-96 rounded-md bg-black/5 animate-pulse" />
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-black/5 p-6 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-xl bg-black/10" />
              <div className="h-4 w-4 rounded bg-black/10" />
            </div>
            <div className="mt-4 h-8 w-24 rounded-md bg-black/10" />
            <div className="mt-2 h-3 w-32 rounded-md bg-black/10" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[400px] rounded-2xl border border-border bg-black/5 p-6 animate-pulse" />
        <div className="h-[400px] rounded-2xl border border-border bg-black/5 p-6 animate-pulse" />
      </div>
    </div>
  );
}
