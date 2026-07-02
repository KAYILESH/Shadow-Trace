import type { Metadata } from "next";
import Link from "next/link";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ScanRadar — Authentication",
  description: "Sign in to ScanRadar to manage your digital footprint.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(0,245,212,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,rgba(124,58,237,0.06),transparent)]" />
        <div className="cyber-grid absolute inset-0 opacity-40" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link
          href="/"
          className="group mb-8 flex items-center justify-center gap-2.5"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 ring-1 ring-primary/30 transition-all duration-300 group-hover:ring-primary/60">
            <Shield className="h-5 w-5 text-primary" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
          <span className="text-xl font-bold text-white">
            Scan<span className="text-primary">Radar</span>
          </span>
        </Link>

        {children}
      </div>
    </div>
  );
}
