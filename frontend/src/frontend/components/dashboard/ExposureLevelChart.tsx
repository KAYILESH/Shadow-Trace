"use client";

import React, { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector,
} from "recharts";
import { ShieldCheck } from "lucide-react";

interface ScanEntry {
  results: any;
  created_at: string;
}

interface Props {
  scans: ScanEntry[];
}

const PLATFORM_COLORS: Record<string, string> = {
  GitHub:    "#FF6B00",
  Reddit:    "#FF0033",
  Twitter:   "#FF3300",
  Instagram: "#FF4D6D",
  Pinterest: "#FF2D55",
};

function buildPieData(scans: ScanEntry[]) {
  const counts: Record<string, number> = {};
  scans.forEach((scan) => {
    (scan.results as any[]).forEach((r: any) => {
      if (r.status === "FOUND") {
        counts[r.platform] = (counts[r.platform] || 0) + 1;
      }
    });
  });
  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      color: PLATFORM_COLORS[name] ?? "#FF6B00",
    }))
    .sort((a, b) => b.value - a.value);
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  return (
    <g>
      {/* Light-theme center text */}
      <text x={cx} y={cy} dy={-8} textAnchor="middle" fill="#0F172A"
        fontSize={22} fontWeight={700}>
        {value}
      </text>
      <text x={cx} y={cy} dy={14} textAnchor="middle" fill="#64748B" fontSize={12}>
        {payload.name}
      </text>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0px 0px 8px ${fill}60)` }}
      />
    </g>
  );
};

// Cast Pie to any to allow activeIndex/activeShape props that exist at runtime
// but are missing from recharts type definitions in this version.
const PieAny = Pie as any;

export default function ExposureLevelChart({ scans }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  // ── Only render chart client-side to avoid -1 width/height error ────────────
  useEffect(() => { setMounted(true); }, []);

  const data = buildPieData(scans);
  const hasData = data.length > 0;

  return (
    <div className="glass rounded-2xl p-6 flex flex-col relative overflow-hidden group"
      style={{ height: 400 }}>
      {/* Background Glow */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-secondary/10 blur-[50px] transition-all duration-500 group-hover:bg-secondary/15" />

      <div className="mb-4 relative z-10">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          Exposure Sources
          <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse" />
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasData ? "Platforms where your username was found" : "No exposure detected yet"}
        </p>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">No Exposures Found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Scan a username to see which platforms your data appears on.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative z-10" style={{ minHeight: 0 }}>
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <PieAny
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_: any, index: number) => setActiveIndex(index)}
                  data={data}
                  cx="50%"
                  cy="47%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  animationBegin={200}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-all duration-300"
                    />
                  ))}
                </PieAny>

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
                  cursor={{ fill: "transparent" }}
                />

                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>
                      {value}
                    </span>
                  )}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
