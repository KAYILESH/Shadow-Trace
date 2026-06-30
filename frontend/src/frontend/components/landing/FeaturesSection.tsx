"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  Eye,
  Globe,
  Database,
  Bell,
  ServerCrash,
} from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "Deep Web Monitoring",
    description:
      "Continuously scan dark web forums, marketplaces, and paste sites for your leaked credentials and personal information.",
    color: "primary" as const,
  },
  {
    icon: Globe,
    title: "Social Media Scrub",
    description:
      "Identify and request removal of your data from 200+ social platforms, people-search engines, and data aggregators.",
    color: "secondary" as const,
  },
  {
    icon: Database,
    title: "Data Broker Removal",
    description:
      "Automatically submit opt-out requests to major data brokers selling your personal information to advertisers.",
    color: "danger" as const,
  },
  {
    icon: Shield,
    title: "Identity Firewall",
    description:
      "Real-time protection layer that blocks tracking scripts, fingerprinting attempts, and unauthorized data collection.",
    color: "primary" as const,
  },
  {
    icon: Bell,
    title: "Breach Alerts",
    description:
      "Instant notifications when your email, phone, or credentials appear in new data breaches or leaked databases.",
    color: "secondary" as const,
  },
  {
    icon: ServerCrash,
    title: "Digital Decoy Network",
    description:
      "Deploy AI-generated decoy identities that poison adversary databases and protect your real information.",
    color: "danger" as const,
  },
];

const colorMap = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    glow: "group-hover:shadow-[0_0_30px_rgba(0,245,212,0.12)]",
    gradient: "from-primary/20 to-primary/5",
  },
  secondary: {
    bg: "bg-secondary/10",
    text: "text-secondary",
    border: "border-secondary/20",
    glow: "group-hover:shadow-[0_0_30px_rgba(124,58,237,0.12)]",
    gradient: "from-secondary/20 to-secondary/5",
  },
  danger: {
    bg: "bg-danger/10",
    text: "text-danger",
    border: "border-danger/20",
    glow: "group-hover:shadow-[0_0_30px_rgba(255,77,109,0.12)]",
    gradient: "from-danger/20 to-danger/5",
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      id="features"
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(124,58,237,0.06),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block rounded-full border border-secondary/20 bg-secondary/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-secondary"
          >
            Core Features
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Your <span className="text-gradient-primary">Complete Shield</span>{" "}
            Against Digital Exposure
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base text-muted-foreground sm:text-lg"
          >
            Six powerful layers of protection that work together to make your
            digital presence invisible to threats.
          </motion.p>
        </div>

        {/* Feature cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => {
            const colors = colorMap[feature.color];
            return (
              <Link
                key={feature.title}
                href="/login"
              >
              <motion.div
                variants={cardVariants}
                className={`group relative rounded-2xl glass p-6 sm:p-8 transition-all duration-500 hover:-translate-y-1 cursor-pointer ${colors.glow}`}
              >
                {/* Top gradient line */}
                <div
                  className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${colors.gradient}`}
                />

                {/* Icon */}
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} ring-1 ${colors.border} transition-all duration-300 group-hover:scale-110`}
                >
                  <feature.icon className={`h-6 w-6 ${colors.text}`} />
                </div>

                {/* Title — fixed: was text-white, now text-foreground */}
                <h3 className="text-lg font-bold text-foreground">{feature.title}</h3>

                {/* Description */}
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>

                {/* Learn more */}
                <div className="mt-5 flex items-center gap-1">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${colors.text} opacity-0 translate-x-[-4px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0`}
                  >
                    Get started →
                  </span>
                </div>

                {/* Corner decoration */}
                <div
                  className={`absolute bottom-4 right-4 h-16 w-16 rounded-full ${colors.bg} blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-60`}
                />
              </motion.div>
              </Link>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
