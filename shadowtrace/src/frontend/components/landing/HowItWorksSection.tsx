"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Search,
  ScanLine,
  Trash2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Search,
    title: "Connect & Discover",
    description:
      "Link your email, phone, and social accounts. Our AI crawlers begin mapping your entire digital footprint across the surface and deep web.",
    details: ["200+ data sources scanned", "AI-powered discovery", "Takes under 30 seconds"],
  },
  {
    num: "02",
    icon: ScanLine,
    title: "Analyze & Assess",
    description:
      "ScanRadar evaluates each exposure for risk level, categorizes threats, and builds a comprehensive vulnerability report.",
    details: ["Risk score calculation", "Threat categorization", "Priority ranking"],
  },
  {
    num: "03",
    icon: Trash2,
    title: "Remove & Purge",
    description:
      "Automated removal requests are sent to data brokers, search engines, and platforms. Manual escalation paths for stubborn entries.",
    details: ["Auto opt-out requests", "Legal takedown support", "Persistent follow-ups"],
  },
  {
    num: "04",
    icon: ShieldCheck,
    title: "Monitor & Protect",
    description:
      "Continuous 24/7 monitoring ensures your data stays hidden. Get instant alerts if new exposures surface anywhere online.",
    details: ["24/7 real-time monitoring", "Instant breach alerts", "Monthly security reports"],
  },
];

export default function HowItWorksSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_20%_50%,rgba(0,245,212,0.04),transparent)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-primary"
          >
            How It Works
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Four Steps to{" "}
            <span className="text-gradient-primary">Digital Invisibility</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base text-muted-foreground sm:text-lg"
          >
            From discovery to protection — our automated pipeline handles
            everything while you focus on what matters.
          </motion.p>
        </div>

        {/* Steps */}
        <div className="relative mt-20">
          {/* Vertical connector line (desktop) */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-primary/20 via-secondary/20 to-transparent lg:block" />

          <div className="space-y-12 lg:space-y-0">
            {steps.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: 0.7,
                    delay: 0.3 + i * 0.15,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`relative lg:grid lg:grid-cols-2 lg:gap-12 lg:py-12 ${
                    isEven ? "" : "lg:direction-rtl"
                  }`}
                >
                  {/* Centre dot (desktop) */}
                  <div className="absolute left-1/2 top-1/2 z-10 hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-background lg:flex">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>

                  {/* Card */}
                  <div
                    className={`group glass rounded-2xl p-6 sm:p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(0,245,212,0.08)] ${
                      isEven
                        ? "lg:col-start-1 lg:text-right"
                        : "lg:col-start-2"
                    }`}
                    style={!isEven ? { direction: "ltr" } : {}}
                  >
                    {/* Step number + icon row */}
                    <div
                      className={`flex items-center gap-4 ${
                        isEven ? "lg:flex-row-reverse" : ""
                      }`}
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/10 ring-1 ring-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:ring-primary/40">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-primary/60">
                          Step {step.num}
                        </span>
                        <h3 className="text-xl font-bold text-white">
                          {step.title}
                        </h3>
                      </div>
                    </div>

                    <p
                      className={`mt-4 text-sm leading-relaxed text-muted-foreground ${
                        isEven ? "lg:text-right" : ""
                      }`}
                    >
                      {step.description}
                    </p>

                    {/* Detail pills */}
                    <div
                      className={`mt-5 flex flex-wrap gap-2 ${
                        isEven ? "lg:justify-end" : ""
                      }`}
                    >
                      {step.details.map((d) => (
                        <span
                          key={d}
                          className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[11px] font-medium text-muted-foreground"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Empty col for layout */}
                  <div className="hidden lg:block" />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-20 text-center"
        >
          <motion.a
            href="#"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-[#00D4AA] px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/15 transition-all duration-300 hover:shadow-primary/25"
          >
            Get Started Now
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
