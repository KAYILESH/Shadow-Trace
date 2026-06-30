"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Search } from "lucide-react";

interface ScanEntry {
  results: any;
  created_at: string;
}

interface Props {
  scans: ScanEntry[];
}

function buildChartData(scans: ScanEntry[]) {
  const monthMap: Record<string, { scans: number; threats: number }> = {};
  scans.forEach((scan) => {
    const date = new Date(scan.created_at);
    const label = date.toLocaleString("default", { month: "short" });
    if (!monthMap[label]) monthMap[label] = { scans: 0, threats: 0 };
    monthMap[label].scans += 1;
    const threats = (scan.results as any[]).filter((r: any) => r.status === "FOUND").length;
    monthMap[label].threats += threats;
  });
  return Object.entries(monthMap).map(([name, vals]) => ({
    name,
    scans: vals.scans,
    threats: vals.threats,
  }));
}

const CustomActiveDot = (props: any) => {
  const { cx, cy, fill } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={fill} stroke="none" />
      <circle cx={cx} cy={cy} r={10} fill="none" stroke={fill} strokeWidth={2}
        className="animate-ping origin-center" style={{ transformOrigin: `${cx}px ${cy}px` }} />
    </g>
  );
};

export default function ScanHistoryChart({ scans }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = buildChartData(scans);
  const hasData = data.length > 0;

  return (
    <div className="glass rounded-2xl p-6 flex flex-col relative overflow-hidden group"
      style={{ height: 400 }}>
      {/* Background Glow */}
      <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-primary/10 blur-[50px] transition-all duration-500 group-hover:bg-primary/15" />

      <div className="mb-4 relative z-10">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          Scan History
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasData ? "Threats detected vs scans performed" : "No scans recorded yet"}
        </p>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">No Scan Data Yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Head to the Scanner page and run your first scan to see history here.
            </p>
          </div>
        </div>
      ) : (
        /* ── Only render chart after mount so container has real dimensions ── */
        <div className="flex-1 relative z-10" style={{ minHeight: 0 }}>
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF0033" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FF0033" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF6B00" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                  </linearGradient>
                </defs>

                {/* Light-theme grid */}
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />

                {/* Light-theme tooltip */}
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "12px",
                    color: "#0F172A",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  }}
                  itemStyle={{ color: "#0F172A" }}
                  cursor={{ stroke: "rgba(0,0,0,0.08)", strokeWidth: 1, strokeDasharray: "3 3" }}
                />

                <Area type="monotone" dataKey="scans" name="Scans"
                  stroke="#FF6B00" strokeWidth={2.5}
                  fillOpacity={1} fill="url(#colorScans)"
                  activeDot={<CustomActiveDot fill="#FF6B00" />}
                  animationDuration={1200} />
                <Area type="monotone" dataKey="threats" name="Threats Found"
                  stroke="#FF0033" strokeWidth={2.5}
                  fillOpacity={1} fill="url(#colorThreats)"
                  activeDot={<CustomActiveDot fill="#FF0033" />}
                  animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
