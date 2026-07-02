"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  User, Mail, Bell, Shield, Lock, Trash2,
  Save, ChevronRight, LogOut, Eye, EyeOff,
  Key, Info, AlertTriangle,
} from "lucide-react";
import Sidebar from "@/frontend/components/layout/Sidebar";
import TopHeader from "@/frontend/components/layout/TopHeader";
import { createClient } from "@/backend/db/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// ── Avatar config ─────────────────────────────────────────────────────────────
type Gender  = "male" | "female";
type BgColor = "2563eb" | "7c3aed" | "dc2626" | "16a34a" | "ea580c" | "0891b2" | "db2777" | "4f46e5";

interface AvatarConfig {
  gender:  Gender;
  bgColor: BgColor;
}

const BG_COLORS: { id: BgColor; hex: string; label: string }[] = [
  { id: "2563eb", hex: "#2563EB", label: "Blue"    },
  { id: "7c3aed", hex: "#7C3AED", label: "Violet"  },
  { id: "dc2626", hex: "#DC2626", label: "Red"      },
  { id: "16a34a", hex: "#16A34A", label: "Green"    },
  { id: "ea580c", hex: "#EA580C", label: "Orange"   },
  { id: "0891b2", hex: "#0891B2", label: "Cyan"     },
  { id: "db2777", hex: "#DB2777", label: "Pink"     },
  { id: "4f46e5", hex: "#4F46E5", label: "Indigo"   },
];

// Avatar images from public folder
const AVATAR_URLS: Record<Gender, string> = {
  male:   "/male_avatar.png",
  female: "/female_avatar.png",
};


// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "profile",       label: "Profile",       icon: User   },
  { id: "account",       label: "Account",       icon: Mail   },
  { id: "notifications", label: "Notifications", icon: Bell   },
  { id: "privacy",       label: "Privacy",       icon: Shield },
  { id: "security",      label: "Security",      icon: Lock   },
];

interface Profile {
  full_name?:            string;
  avatar_config?:        AvatarConfig;
  bio?:                  string;
  notify_scan_complete?: boolean;
  notify_breach_alert?:  boolean;
  notify_weekly_digest?: boolean;
  profile_public?:       boolean;
}

interface Props { user: SupabaseUser; profile: Profile; }

// ── Reusable components ───────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? "bg-primary" : "bg-black/20"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-bold text-foreground text-base">{title}</h3>
        {desc && <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="border-t border-black/8" />
      {children}
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} disabled={saving}
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
      {saving
        ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        : <Save className="h-4 w-4" />}
      {saving ? "Saving..." : "Save Changes"}
    </motion.button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SettingsContent({ user, profile }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState("profile");
  const [saving, setSaving]           = useState(false);

  // ── Profile state
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [bio,      setBio]      = useState(profile.bio       || "");

  // ── Avatar config state
  const defaultCfg: AvatarConfig = profile.avatar_config || {
    gender:  "male",
    bgColor: "2563eb",
  };
  const [avatarCfg, setAvatarCfg] = useState<AvatarConfig>(defaultCfg);

  const updateAvatar = useCallback((patch: Partial<AvatarConfig>) => {
    setAvatarCfg((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Notification state
  const [notifyScan,   setNotifyScan]   = useState(profile.notify_scan_complete ?? true);
  const [notifyBreach, setNotifyBreach] = useState(profile.notify_breach_alert  ?? true);
  const [notifyWeekly, setNotifyWeekly] = useState(profile.notify_weekly_digest ?? false);

  // ── Privacy state
  const [profilePublic, setProfilePublic] = useState(profile.profile_public ?? false);

  // ── Security state
  const [newPwd,    setNewPwd]    = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const avatarUrl = AVATAR_URLS[avatarCfg.gender];
  const bgHex     = BG_COLORS.find(b => b.id === avatarCfg.bgColor)?.hex ?? "#2563EB";

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          full_name:            fullName,
          avatar_config:        avatarCfg,
          bio,
          notify_scan_complete: notifyScan,
          notify_breach_alert:  notifyBreach,
          notify_weekly_digest: notifyWeekly,
          profile_public:       profilePublic,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved!");
      router.refresh();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (newPwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setPwdSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Password updated!");
      setNewPwd("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setPwdSaving(false);
    }
  };

  const joinedDate = new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const lastLogin  = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "N/A";

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,107,0,0.04),transparent_70%)]" />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar />
      </div>

      <div className="flex flex-col lg:pl-64 relative z-10 min-h-screen">
        <TopHeader user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }} className="space-y-6">

            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Settings</h1>
              <p className="mt-1 text-sm text-muted-foreground">Manage your account, profile and preferences.</p>
            </div>

            <div className="flex gap-6 flex-col lg:flex-row">

              {/* Tab Nav */}
              <div className="lg:w-52 shrink-0">
                <div className="glass rounded-2xl p-2 space-y-1">
                  {TABS.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left ${
                        activeTab === tab.id
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                      }`}>
                      <tab.icon className="h-4 w-4 shrink-0" />
                      {tab.label}
                      {activeTab === tab.id && <ChevronRight className="h-3 w-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 space-y-4">
                <AnimatePresence mode="wait">

                  {/* ══ PROFILE TAB ══════════════════════════════════════════ */}
                  {activeTab === "profile" && (
                    <motion.div key="profile"
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                      className="space-y-4">

                      {/* Avatar Builder */}
                      <Section title="Profile Avatar" desc="Customize your profile picture">

                        {/* Preview */}
                        <div className="flex items-center gap-6">
                          <div className="relative shrink-0">
                            <div
                              className="h-24 w-24 rounded-full overflow-hidden ring-4 shadow-lg flex items-center justify-center"
                              style={{ backgroundColor: bgHex, '--tw-ring-color': bgHex } as React.CSSProperties}>
                              <img
                                src={avatarUrl}
                                alt={avatarCfg.gender + " avatar"}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">Your Avatar</p>
                            <p className="text-sm text-muted-foreground">
                              {avatarCfg.gender === "male" ? "👨 Male" : "👩 Female"}
                            </p>
                          </div>
                        </div>

                        {/* Gender */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Gender</p>
                          <div className="flex gap-3">
                            {(["male", "female"] as Gender[]).map((g) => (
                              <button key={g} onClick={() => updateAvatar({ gender: g })}
                                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border-2 transition-all ${
                                  avatarCfg.gender === g
                                    ? "bg-primary/10 text-primary border-primary/40 ring-1 ring-primary/20"
                                    : "bg-black/5 text-muted-foreground border-black/10 hover:bg-black/10"
                                }`}>
                                <span className="text-2xl">{g === "male" ? "👨" : "👩"}</span>
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Background Color */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Background Color</p>
                          <div className="flex flex-wrap gap-3">
                            {BG_COLORS.map((b) => (
                              <button key={b.id} onClick={() => updateAvatar({ bgColor: b.id })}
                                title={b.label}
                                className={`h-10 w-10 rounded-full border-4 transition-all hover:scale-110 ${
                                  avatarCfg.bgColor === b.id
                                    ? "border-white scale-110 ring-2 ring-offset-1"
                                    : "border-transparent"
                                }`}
                                style={{ backgroundColor: b.hex, boxShadow: avatarCfg.bgColor === b.id ? `0 0 0 2px ${b.hex}` : "none" }} />
                            ))}
                          </div>
                        </div>
                      </Section>

                      {/* Display Name */}
                      <Section title="Display Name" desc="This name appears across ScanRadar">
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your name..."
                          className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all" />
                      </Section>

                      {/* Bio */}
                      <Section title="Bio" desc="A short description about yourself">
                        <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 200))}
                          rows={3} placeholder="Tell us a bit about yourself..."
                          className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all resize-none" />
                        <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
                      </Section>

                      <SaveButton saving={saving} onClick={handleSave} />
                    </motion.div>
                  )}

                  {/* ══ ACCOUNT TAB ══════════════════════════════════════════ */}
                  {activeTab === "account" && (
                    <motion.div key="account"
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                      className="space-y-4">

                      <Section title="Account Details" desc="Your account information from Supabase">
                        <div className="space-y-4">
                          <Row label="Email Address" desc="Your login email">
                            <div className="flex items-center gap-2 bg-black/5 rounded-xl px-3 py-2 text-sm text-foreground">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[180px]">{user.email}</span>
                            </div>
                          </Row>
                          <div className="border-t border-black/8" />
                          <Row label="Member Since" desc="When your account was created">
                            <span className="text-sm font-medium text-foreground">{joinedDate}</span>
                          </Row>
                          <div className="border-t border-black/8" />
                          <Row label="Last Sign In">
                            <span className="text-sm font-medium text-foreground">{lastLogin}</span>
                          </Row>
                          <div className="border-t border-black/8" />
                          <Row label="Account ID" desc="Your unique ID">
                            <span className="text-xs font-mono bg-black/5 rounded-lg px-2 py-1 text-muted-foreground max-w-[160px] truncate">{user.id}</span>
                          </Row>
                          <div className="border-t border-black/8" />
                          <Row label="Auth Provider">
                            <span className="text-sm font-medium text-foreground capitalize">{user.app_metadata?.provider || "email"}</span>
                          </Row>
                        </div>
                      </Section>

                      <Section title="Session">
                        <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
                          className="flex items-center gap-2 rounded-xl bg-black/5 border border-black/10 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-danger/10 hover:text-danger hover:border-danger/20 transition-all">
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </Section>
                    </motion.div>
                  )}

                  {/* ══ NOTIFICATIONS TAB ════════════════════════════════════ */}
                  {activeTab === "notifications" && (
                    <motion.div key="notifications"
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                      className="space-y-4">

                      <Section title="Notification Preferences" desc="Control which alerts you receive">
                        <div className="space-y-5">
                          <Row label="Scan Complete Alerts" desc="When a username or identity scan finishes">
                            <Toggle checked={notifyScan} onChange={setNotifyScan} />
                          </Row>
                          <div className="border-t border-black/8" />
                          <Row label="Breach Alerts" desc="When your data appears in a breach">
                            <Toggle checked={notifyBreach} onChange={setNotifyBreach} />
                          </Row>
                          <div className="border-t border-black/8" />
                          <Row label="Weekly Digest" desc="A weekly summary of your privacy health">
                            <Toggle checked={notifyWeekly} onChange={setNotifyWeekly} />
                          </Row>
                        </div>
                      </Section>

                      <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-200 p-3">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700">Notifications appear in your bell icon (top right).</p>
                      </div>

                      <SaveButton saving={saving} onClick={handleSave} />
                    </motion.div>
                  )}

                  {/* ══ PRIVACY TAB ══════════════════════════════════════════ */}
                  {activeTab === "privacy" && (
                    <motion.div key="privacy"
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                      className="space-y-4">

                      <Section title="Privacy Settings">
                        <Row label="Public Profile" desc="Allow others to find your profile">
                          <Toggle checked={profilePublic} onChange={setProfilePublic} />
                        </Row>
                      </Section>

                      <SaveButton saving={saving} onClick={handleSave} />

                    </motion.div>
                  )}

                  {/* ══ SECURITY TAB ═════════════════════════════════════════ */}
                  {activeTab === "security" && (
                    <motion.div key="security"
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                      className="space-y-4">

                      <Section title="Change Password" desc="Update your account password">
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">New Password</label>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <input type={showPwd ? "text" : "password"} value={newPwd}
                                onChange={(e) => setNewPwd(e.target.value)}
                                placeholder="Enter new password (min. 8 characters)"
                                className="w-full rounded-xl border border-black/10 bg-black/5 pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all" />
                              <button onClick={() => setShowPwd(!showPwd)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          {newPwd.length > 0 && (
                            <div className="space-y-1">
                              <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-300 ${
                                  newPwd.length >= 12 ? "w-full bg-green-500" :
                                  newPwd.length >= 8  ? "w-2/3 bg-yellow-500" : "w-1/3 bg-red-500"}`} />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {newPwd.length >= 12 ? "✅ Strong" : newPwd.length >= 8 ? "🟡 Medium" : "🔴 Too short"}
                              </p>
                            </div>
                          )}
                          <motion.button onClick={handleChangePassword}
                            disabled={pwdSaving || newPwd.length < 8}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {pwdSaving
                              ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              : <Key className="h-4 w-4" />}
                            Update Password
                          </motion.button>
                        </div>
                      </Section>

                      <Section title="Danger Zone" desc="Irreversible — proceed with caution">
                        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3 mb-4">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-red-700">
                            Deleting your account removes all your data permanently. This cannot be undone.
                          </p>
                        </div>
                        <button onClick={() => toast.error("Contact support to delete your account.")}
                          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-all">
                          <Trash2 className="h-4 w-4" /> Delete My Account
                        </button>
                      </Section>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
