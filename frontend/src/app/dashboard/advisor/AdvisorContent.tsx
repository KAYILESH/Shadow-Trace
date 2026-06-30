"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Send,
  Bot,
  User as UserIcon,
  Trash2,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronDown,
  Zap,
  Shield,
  Eye,
  Lock,
} from "lucide-react";
import Sidebar from "@/frontend/components/layout/Sidebar";
import TopHeader from "@/frontend/components/layout/TopHeader";
import toast from "react-hot-toast";
import { backendFetch } from "@/lib/backendFetch";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  parsed?: AnalysisResponse | null;
}

interface AnalysisResponse {
  type: "analysis";
  riskSummary: {
    overallRisk: "HIGH" | "MEDIUM" | "LOW";
    score: number;
    headline: string;
    details: string;
  };
  recommendations: Recommendation[];
  cleanupSuggestions: CleanupSuggestion[];
  message: string;
}

interface Recommendation {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  action: string;
  category: string;
}

interface CleanupSuggestion {
  platform: string;
  action: string;
  priority: "URGENT" | "SOON" | "EVENTUALLY";
}

// ─── Severity configs ─────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  CRITICAL: {
    color: "#FF0033",
    bg: "bg-danger/10",
    border: "border-danger/30",
    text: "text-danger",
    icon: ShieldAlert,
    badge: "bg-danger/20 text-danger border-danger/30",
  },
  HIGH: {
    color: "#FF6B00",
    bg: "bg-primary/10",
    border: "border-primary/30",
    text: "text-primary",
    icon: AlertTriangle,
    badge: "bg-primary/20 text-primary border-primary/30",
  },
  MEDIUM: {
    color: "#EAB308",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    icon: Info,
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  LOW: {
    color: "#10B981",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    icon: CheckCircle2,
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
};

const PRIORITY_CONFIG = {
  URGENT: { text: "text-danger", label: "URGENT", dot: "bg-danger" },
  SOON: { text: "text-primary", label: "SOON", dot: "bg-primary" },
  EVENTUALLY: { text: "text-muted-foreground", label: "EVENTUALLY", dot: "bg-muted-foreground" },
};

const RISK_CONFIG = {
  HIGH: { color: "#FF0033", label: "HIGH RISK", glow: "shadow-[0_0_30px_rgba(255,0,51,0.3)]" },
  MEDIUM: { color: "#EAB308", label: "MEDIUM RISK", glow: "shadow-[0_0_30px_rgba(234,179,8,0.3)]" },
  LOW: { color: "#10B981", label: "LOW RISK", glow: "shadow-[0_0_30px_rgba(16,185,129,0.3)]" },
};

// ─── Quick-prompt suggestions ─────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: Eye, text: "Analyze my digital footprint", prompt: "Analyze my digital footprint. I have accounts on Instagram, Facebook, Reddit, Twitter, and GitHub. I use Gmail for email and haven't used a password manager before." },
  { icon: Shield, text: "Password security audit", prompt: "Give me a detailed password security audit and recommendations. What are the most critical steps I should take right now?" },
  { icon: Lock, text: "Data broker exposure", prompt: "How do I find and remove myself from data broker sites? Which ones are most dangerous and what's the best way to opt out?" },
  { icon: Zap, text: "Quick privacy wins", prompt: "What are the top 5 quick wins I can do today to significantly improve my privacy with minimal effort?" },
];

// ─── Helper: parse assistant content ─────────────────────────────────────────
function tryParseAnalysis(content: string): AnalysisResponse | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*"type"\s*:\s*"analysis"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.type === "analysis") return parsed;
    }
  } catch {}
  return null;
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("## ")) return <h3 key={i} className="text-base font-bold text-foreground mt-3 mb-1">{line.slice(3)}</h3>;
    if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-bold text-foreground mt-3 mb-1">{line.slice(2)}</h2>;
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>');
      return <li key={i} className="text-sm text-muted-foreground ml-3 list-disc" dangerouslySetInnerHTML={{ __html: content }} />;
    }
    if (line.trim() === "") return <br key={i} />;
    const content = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
                        .replace(/`(.*?)`/g, '<code class="bg-black/10 px-1 rounded text-primary text-xs">$1</code>');
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />;
  });
}

// ─── Recommendation Card ──────────────────────────────────────────────────────
function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[rec.severity];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 cursor-pointer hover:brightness-110 transition-all`}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0`} style={{ background: `${cfg.color}20` }}>
          <Icon className={`h-4 w-4 ${cfg.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
              {rec.severity}
            </span>
            <span className="text-xs text-muted-foreground bg-black/5 px-2 py-0.5 rounded-full border border-black/10">
              {rec.category}
            </span>
          </div>
          <h4 className={`text-sm font-semibold ${cfg.text}`}>{rec.title}</h4>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{rec.description}</p>
                <div className="mt-3 rounded-lg bg-black/5 border border-black/10 p-3">
                  <p className="text-xs font-semibold text-foreground mb-1">→ Action:</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.action}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>
    </motion.div>
  );
}

// ─── Analysis Panel ───────────────────────────────────────────────────────────
function AnalysisPanel({ data }: { data: AnalysisResponse }) {
  const riskCfg = RISK_CONFIG[data.riskSummary.overallRisk];
  const circleR = 40;
  const circumference = 2 * Math.PI * circleR;
  const offset = circumference - (data.riskSummary.score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 mt-4"
    >
      {/* Risk Summary Card */}
      <div className={`glass rounded-2xl p-5 border border-black/10 ${riskCfg.glow}`}>
        <div className="flex items-center gap-4">
          {/* Score ring */}
          <div className="relative shrink-0 h-24 w-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={circleR} className="stroke-white/10" strokeWidth="8" fill="transparent" />
              <motion.circle
                cx="50" cy="50" r={circleR}
                stroke={riskCfg.color}
                strokeWidth="8"
                fill="transparent"
                strokeLinecap="round"
                style={{ strokeDasharray: circumference }}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black" style={{ color: riskCfg.color }}>{data.riskSummary.score}</span>
              <span className="text-[9px] text-muted-foreground font-medium">/ 100</span>
            </div>
          </div>
          {/* Summary */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: `${riskCfg.color}20`, color: riskCfg.color, border: `1px solid ${riskCfg.color}40` }}>
                {riskCfg.label}
              </span>
            </div>
            <h3 className="text-sm font-bold text-foreground">{data.riskSummary.headline}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{data.riskSummary.details}</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <ShieldAlert className="h-3 w-3 text-primary" />
            Privacy Recommendations ({data.recommendations.length})
          </p>
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <RecommendationCard key={rec.id} rec={rec} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Cleanup Suggestions */}
      {data.cleanupSuggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <Trash2 className="h-3 w-3 text-secondary" />
            Cleanup Action Plan
          </p>
          <div className="rounded-xl border border-black/10 overflow-hidden">
            {data.cleanupSuggestions.map((s, i) => {
              const pCfg = PRIORITY_CONFIG[s.priority];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 border-b border-black/10 last:border-0 hover:bg-black/5 transition-colors"
                >
                  <div className={`h-2 w-2 rounded-full ${pCfg.dot} mt-1.5 shrink-0`} />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-foreground">{s.platform}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.action}</p>
                  </div>
                  <span className={`text-[10px] font-black ${pCfg.text} shrink-0`}>{pCfg.label}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const analysis = !isUser ? msg.parsed : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser
          ? "bg-primary/20 border border-primary/30"
          : "bg-gradient-to-br from-primary/30 to-danger/30 border border-black/10"
      }`}>
        {isUser ? <UserIcon className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-foreground" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary/20 border border-primary/20 rounded-tr-sm"
            : "bg-black/5 border border-black/10 rounded-tl-sm"
        }`}>
          {isUser ? (
            <p className="text-sm text-foreground">{msg.content}</p>
          ) : analysis ? (
            <div>
              {/* AI message above analysis panel */}
              {analysis.message && (
                <div className="space-y-1">
                  {renderMarkdown(analysis.message.replace(/⚠️ \*\*ScanAI Assessment Complete\.\*\* /, ''))}
                </div>
              )}
              <AnalysisPanel data={analysis} />
            </div>
          ) : (
            <div className="space-y-1">
              {renderMarkdown(msg.content)}
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3"
    >
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-danger/30 border border-black/10 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-foreground" />
      </div>
      <div className="bg-black/5 border border-black/10 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdvisorContent({ user }: { user: SupabaseUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  // Load history
  useEffect(() => {
    const load = async () => {
      try {
        const res = await backendFetch("/api/advisor");
        const data = await res.json();
        if (data.messages?.length) {
          setMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.created_at),
              parsed: m.role === "assistant" ? tryParseAnalysis(m.content) : null,
            }))
          );
        } else {
          // Welcome message
          setMessages([{
            id: "welcome",
            role: "assistant",
            content: "I'm **ScanAI**, your personal AI privacy advisor. I can help you:\n\n- 🔍 **Analyze your digital footprint** — just describe your online presence\n- 🛡️ **Generate a risk assessment** with actionable recommendations\n- 🗑️ **Create a cleanup plan** for old accounts and data exposure\n- 💡 **Answer any privacy questions** about security, VPNs, data brokers, and more\n\nTo get started, try asking me to **analyze your privacy** or click one of the quick prompts below.",
            timestamp: new Date(),
            parsed: null,
          }]);
        }
      } catch {
        /* silent fail */
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, []);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const res = await backendFetch("/api/advisor", {
        method: "POST",
        body: JSON.stringify({ message: msg, history }),
      });

      const data = await res.json();

      // If the API returned an error, display it in the chat — no demo fallback
      if (!res.ok || data.error) {
        const errMsg = data.error || `API error ${res.status}`;
        console.error("[Advisor] OpenRouter error:", errMsg);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ **OpenRouter Error**\n\n${errMsg}`,
            timestamp: new Date(),
            parsed: null,
          },
        ]);
        return;
      }

      const reply = data.reply || "No response received from the AI.";
      const parsed = tryParseAnalysis(reply);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: reply,
          timestamp: new Date(),
          parsed,
        },
      ]);
    } catch (networkErr: any) {
      // Network/fetch error — show actual error, not a generic message
      const errDetail = networkErr?.message || "Network error";
      console.error("[Advisor] Fetch failed:", errDetail);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Connection Error**\n\n${errDetail}\n\nPlease check your internet connection and try again.`,
          timestamp: new Date(),
          parsed: null,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  const clearChat = async () => {
    setIsClearing(true);
    try {
      await backendFetch("/api/advisor", { method: "DELETE" });
      setMessages([{
        id: "welcome-new",
        role: "assistant",
        content: "Conversation cleared. I'm ready to help you analyze your privacy. What would you like to know?",
        timestamp: new Date(),
        parsed: null,
      }]);
      toast.success("Conversation cleared");
    } catch {
      toast.error("Failed to clear conversation");
    } finally {
      setIsClearing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,107,0,0.05),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_80%_50%,rgba(255,0,51,0.06),transparent_60%)]" />
        <div className="cyber-grid absolute inset-0 opacity-20" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex flex-col lg:pl-64 relative z-10 min-h-screen">
        <TopHeader user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-5xl mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/30 to-danger/30 border border-black/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI Privacy Advisor</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  ScanAI Online — Free Tier AI (Auto-Select)
                </p>
              </div>
            </div>
            <button
              onClick={clearChat}
              disabled={isClearing}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-danger transition-colors px-3 py-2 rounded-xl hover:bg-danger/10 border border-transparent hover:border-danger/20"
            >
              {isClearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Clear chat
            </button>
          </motion.div>

          {/* Chat Window */}
          <div className="flex-1 glass rounded-2xl border border-black/10 flex flex-col overflow-hidden" style={{ minHeight: "500px", maxHeight: "calc(100vh - 280px)" }}>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {isFetching ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} />
                    ))}
                  </AnimatePresence>
                  <AnimatePresence>
                    {isLoading && <TypingIndicator />}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Quick Prompts */}
            {messages.length <= 1 && !isFetching && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 sm:px-6 pb-4"
              >
                <p className="text-xs text-muted-foreground mb-2 font-medium">Quick prompts:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_PROMPTS.map((qp, i) => {
                    const Icon = qp.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => sendMessage(qp.prompt)}
                        disabled={isLoading}
                        className="flex items-center gap-2 text-left px-3 py-2.5 rounded-xl text-xs text-muted-foreground border border-black/10 bg-black/5 hover:bg-black/10 hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-50"
                      >
                        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        {qp.text}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Input Bar */}
            <div className="border-t border-black/10 p-3 sm:p-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={autoResize}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask ScanAI about your privacy... (Enter to send, Shift+Enter for newline)"
                    rows={1}
                    disabled={isLoading}
                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all disabled:opacity-50 leading-relaxed"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-lg shadow-primary/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-primary/25"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 text-foreground animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 text-white" />
                  )}
                </motion.button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                ScanAI can make mistakes. Always verify privacy steps before taking action.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
