"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Fingerprint,
  ArrowRight,
  ShieldCheck,
  Lock,
  Zap,
} from "lucide-react";

/* ── Deterministic particle positions (avoids hydration mismatch) ── */
const particles = [
  { id: 0, x: 15, y: 22, size: 2, dur: 5, delay: 1 },
  { id: 1, x: 85, y: 8, size: 1, dur: 7, delay: 0 },
  { id: 2, x: 42, y: 65, size: 3, dur: 6, delay: 2 },
  { id: 3, x: 70, y: 35, size: 2, dur: 8, delay: 3 },
  { id: 4, x: 28, y: 80, size: 1, dur: 5, delay: 1 },
  { id: 5, x: 55, y: 12, size: 3, dur: 9, delay: 0 },
  { id: 6, x: 92, y: 55, size: 2, dur: 6, delay: 2 },
  { id: 7, x: 8, y: 45, size: 1, dur: 7, delay: 3 },
  { id: 8, x: 63, y: 90, size: 2, dur: 5, delay: 1 },
  { id: 9, x: 38, y: 18, size: 3, dur: 8, delay: 0 },
  { id: 10, x: 78, y: 72, size: 1, dur: 6, delay: 2 },
  { id: 11, x: 20, y: 58, size: 2, dur: 9, delay: 3 },
  { id: 12, x: 50, y: 30, size: 3, dur: 5, delay: 1 },
  { id: 13, x: 88, y: 42, size: 1, dur: 7, delay: 0 },
  { id: 14, x: 5, y: 85, size: 2, dur: 6, delay: 2 },
  { id: 15, x: 72, y: 15, size: 3, dur: 8, delay: 3 },
  { id: 16, x: 33, y: 68, size: 1, dur: 5, delay: 1 },
  { id: 17, x: 95, y: 28, size: 2, dur: 9, delay: 0 },
  { id: 18, x: 18, y: 92, size: 3, dur: 6, delay: 2 },
  { id: 19, x: 60, y: 50, size: 1, dur: 7, delay: 3 },
];

/* ── Stat badges ── */
const stats = [
  { icon: ShieldCheck, value: "99.9%", label: "Threat Detection" },
  { icon: Lock, value: "256-bit", label: "Encryption" },
  { icon: Zap, value: "<2s", label: "Scan Speed" },
];

export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      ref={ref}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* ── Background layers ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,245,212,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgba(124,58,237,0.08),transparent_60%)]" />

        {/* Grid */}
        <div className="cyber-grid absolute inset-0 opacity-60" />

        {/* Floating particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-primary/30"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: p.dur,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          animate={{ y: ["-100%", "100vh"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Advanced Cyber Threat Intelligence
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Erase Your{" "}
          <span className="text-gradient-primary">Digital Footprint</span>
          <br />
          <span className="text-muted-foreground">Before They Find You</span>
        </motion.h1>

        {/* Sub-heading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          ScanRadar scans the deep web, data brokers, and social platforms to find
          and eliminate your exposed personal information — keeping your identity invisible.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <motion.a
            href="/login"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-[#FF3300] px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-shadow duration-300 hover:shadow-primary/40"
          >
            <Fingerprint className="h-4 w-4" />
            Start Scan
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.a>

          <motion.a
            href="/login"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-8 py-3.5 text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            See How It Works
          </motion.a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4 sm:gap-8"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass flex flex-col items-center gap-2 rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:glow-primary"
            >
              <stat.icon className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold text-foreground sm:text-2xl">
                {stat.value}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-16 flex flex-col items-center gap-2"
        >
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Scroll to explore
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="h-8 w-5 rounded-full border border-black/10 flex items-start justify-center pt-1.5"
          >
            <div className="h-1.5 w-1 rounded-full bg-primary" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
