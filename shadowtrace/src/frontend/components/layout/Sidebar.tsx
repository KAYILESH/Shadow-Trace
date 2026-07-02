"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ShieldAlert,
  Search,
  Settings,
  Bell,
  LogOut,
  Shield,
  BarChart2,
  Trash2,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/backend/db/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const navItems = [
  { name: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Analytics", icon: BarChart2, href: "/dashboard/analytics" },
  { name: "AI Advisor", icon: Sparkles, href: "/dashboard/advisor" },
  { name: "Scans", icon: Search, href: "/dashboard/scans" },
  { name: "Risk Score", icon: ShieldAlert, href: "/dashboard/risk" },
  // { name: "Deletion Center", icon: Trash2, href: "/dashboard/deletions" }, // TODO: re-enable when ready
  { name: "Notifications", icon: Bell, href: "/dashboard/notifications" },
  { name: "Settings", icon: Settings, href: "/dashboard/settings" },
];

// ── Sidebar Profile (fetches avatar_config + name live) ───────────────────────
function SidebarProfile() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{
    full_name?: string;
    avatar_config?: { gender: "male" | "female"; bgColor: string };
    email?: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_config")
        .eq("id", user.id)
        .single();
      setProfile({
        full_name:     data?.full_name,
        avatar_config: data?.avatar_config,
        email:         user.email,
      });
    })();
  }, []);

  const gender    = profile?.avatar_config?.gender ?? "male";
  const avatarUrl = gender === "female" ? "/female_avatar.png" : "/male_avatar.png";
  const name      = profile?.full_name || profile?.email?.split("@")[0] || "My Profile";

  return (
    <>
      <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-primary/20 shrink-0 bg-black/5">
        <img src={avatarUrl} alt={gender + " avatar"} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-foreground group-hover:text-primary transition-colors truncate">{name}</span>
        <span className="text-xs text-muted-foreground">Settings</span>
      </div>
    </>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const router   = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    toast.success("Signed out successfully");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-border bg-white/90 backdrop-blur-xl lg:flex"
      style={{ boxShadow: "2px 0 20px rgba(0,0,0,0.06)" }}>

      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-secondary/15 ring-1 ring-primary/25">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">
            Scan<span className="text-primary">Radar</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <motion.nav
          initial="hidden" animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
          className="space-y-1"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <motion.div key={item.name}
                variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }}>
                <Link href={item.href}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                  }`}>
                  <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {item.name}
                  {isActive && (
                    <motion.div layoutId="sidebar-active"
                      className="absolute left-0 h-8 w-1 rounded-r-full bg-primary" />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>
      </div>

      {/* Bottom: Profile + Logout */}
      <div className="border-t border-border p-4 space-y-1">
        <Link href="/dashboard/settings"
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-black/5 hover:text-foreground">
          <SidebarProfile />
        </Link>
        <button onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-danger/10 hover:text-danger">
          <LogOut className="h-4 w-4 group-hover:text-danger transition-colors" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
