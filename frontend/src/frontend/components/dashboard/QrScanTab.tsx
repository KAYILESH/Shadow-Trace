"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, QrCode, Loader2, ShieldCheck, ShieldAlert, Shield,
  AlertTriangle, CheckCircle2, XCircle, ExternalLink, Link2,
  ArrowRight, RotateCcw, Info, Zap, Eye, Clock, ChevronDown,
  ChevronUp, Camera, CameraOff, ScanLine,
} from "lucide-react";
import toast from "react-hot-toast";
import { backendFetch } from "@/lib/backendFetch";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RedirectHop {
  url:          string;
  domain:       string;
  statusCode:   number;
  isSuspicious: boolean;
}

interface QrScanResult {
  originalUrl:   string;
  finalUrl:      string;
  redirectChain: RedirectHop[];
  riskScore:     number;
  threatLevel:   "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "CRITICAL";
  isPhishing:    boolean;
  verdict:       string;
  redFlags:      string[];
  safeFactors:   string[];
  explanation:   string;
  confidence:    "HIGH" | "MEDIUM" | "LOW";
  modelUsed?:    string;
}

// ─── Config maps ──────────────────────────────────────────────────────────────
const threatConfig = {
  SAFE: {
    label: "Safe",
    icon:  ShieldCheck,
    color: "text-emerald-500",
    bg:    "bg-emerald-500/10",
    ring:  "ring-emerald-500/30",
    bar:   "bg-emerald-500",
    glow:  "rgba(16,185,129,0.15)",
    stroke:"#10b981",
    gradient: "from-emerald-500/20 to-teal-500/10",
  },
  SUSPICIOUS: {
    label: "Suspicious",
    icon:  AlertTriangle,
    color: "text-amber-500",
    bg:    "bg-amber-500/10",
    ring:  "ring-amber-500/30",
    bar:   "bg-amber-500",
    glow:  "rgba(245,158,11,0.15)",
    stroke:"#f59e0b",
    gradient: "from-amber-500/20 to-orange-500/10",
  },
  HIGH_RISK: {
    label: "High Risk",
    icon:  ShieldAlert,
    color: "text-orange-500",
    bg:    "bg-orange-500/10",
    ring:  "ring-orange-500/30",
    bar:   "bg-orange-500",
    glow:  "rgba(249,115,22,0.18)",
    stroke:"#f97316",
    gradient: "from-orange-500/20 to-red-500/10",
  },
  CRITICAL: {
    label: "Critical",
    icon:  XCircle,
    color: "text-red-500",
    bg:    "bg-red-500/10",
    ring:  "ring-red-500/30",
    bar:   "bg-red-500",
    glow:  "rgba(239,68,68,0.2)",
    stroke:"#ef4444",
    gradient: "from-red-500/20 to-rose-500/10",
  },
};

const statusColor = (code: number) =>
  code >= 300 && code < 400
    ? "bg-blue-500/20 text-blue-400 ring-blue-500/30"
    : code >= 200 && code < 300
    ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30"
    : "bg-red-500/20 text-red-400 ring-red-500/30";

// ─── Circular gauge SVG ───────────────────────────────────────────────────────
function RiskGauge({ score, cfg }: { score: number; cfg: typeof threatConfig[keyof typeof threatConfig] }) {
  const R   = 52;
  const cx  = 64;
  const cy  = 64;
  const circumference = 2 * Math.PI * R;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 128, height: 128 }}>
      <div className="absolute inset-0 rounded-full blur-2xl opacity-60" style={{ background: cfg.glow }} />
      <svg width={128} height={128} className="relative">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="currentColor" strokeWidth={10}
          className="text-border/40" />
        <motion.circle
          cx={cx} cy={cy} r={R} fill="none"
          stroke={cfg.stroke} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-3xl font-black ${cfg.color}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Risk</span>
      </div>
    </div>
  );
}

// ─── Camera scanner overlay ───────────────────────────────────────────────────
function CameraScanner({
  onDetected,
  onClose,
}: {
  onDetected: (url: string) => void;
  onClose: () => void;
}) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number>(0);
  const [camError, setCamError] = useState<string | null>(null);
  const [scanning,  setScanning] = useState(false);
  const [detected,  setDetected] = useState(false);

  // Start camera
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setScanning(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Permission") || msg.includes("denied")) {
          setCamError("Camera permission denied. Please allow camera access in your browser settings.");
        } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
          setCamError("No camera found on this device.");
        } else {
          setCamError("Could not open camera: " + msg);
        }
      }
    })();

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Continuous frame scanning
  useEffect(() => {
    if (!scanning) return;

    let jsQRFn: ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null = null;

    import("jsqr").then(mod => {
      jsQRFn = mod.default as typeof jsQRFn;
      tick();
    });

    function tick() {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (jsQRFn) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQRFn(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          setDetected(true);
          streamRef.current?.getTracks().forEach(t => t.stop());
          cancelAnimationFrame(rafRef.current);
          // Brief delay so the "detected" flash is visible
          setTimeout(() => onDetected(code.data), 600);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/60">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: detected ? 1 : [1, 0.3, 1] }}
              transition={{ repeat: detected ? 0 : Infinity, duration: 1.2 }}
            >
              <ScanLine className={`h-4 w-4 ${detected ? "text-emerald-400" : "text-primary"}`} />
            </motion.div>
            <span className="text-sm font-semibold text-white">
              {camError ? "Camera Error" : detected ? "QR Detected! ✓" : "Point camera at QR code"}
            </span>
          </div>
          <button
            id="camera-close-btn"
            onClick={() => {
              cancelAnimationFrame(rafRef.current);
              streamRef.current?.getTracks().forEach(t => t.stop());
              onClose();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Camera view */}
        {camError ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <CameraOff className="h-10 w-10 text-red-400" />
            <p className="text-sm text-red-300">{camError}</p>
            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Hidden canvas used for QR decoding */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning overlay */}
            {!detected && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Corner brackets */}
                <div className="relative h-48 w-48">
                  {/* top-left */}
                  <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  {/* top-right */}
                  <div className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  {/* bottom-left */}
                  <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  {/* bottom-right */}
                  <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-primary rounded-br-lg" />

                  {/* Animated scan line */}
                  <motion.div
                    className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                    animate={{ top: ["8%", "88%", "8%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}

            {/* Detected flash */}
            {detected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-emerald-500/30"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-xl"
                >
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </motion.div>
              </motion.div>
            )}
          </div>
        )}

        {/* Footer hint */}
        {!camError && !detected && (
          <div className="px-4 py-3 bg-black/60 text-center">
            <p className="text-[11px] text-white/50">
              Scanning automatically — no need to press anything
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function QrScanTab() {
  const [dragging,      setDragging]      = useState(false);
  const [imagePreview,  setImagePreview]  = useState<string | null>(null);
  const [decodedUrl,    setDecodedUrl]    = useState<string | null>(null);
  const [decodeError,   setDecodeError]   = useState<string | null>(null);
  const [scanning,      setScanning]      = useState(false);
  const [result,        setResult]        = useState<QrScanResult | null>(null);
  const [chainExpanded, setChainExpanded] = useState(true);
  const [cameraOpen,    setCameraOpen]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── QR decode via jsQR + Canvas ────────────────────────────────────────────
  const decodeQR = useCallback(async (file: File) => {
    setDecodeError(null);
    setDecodedUrl(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);

      try {
        const jsQR = (await import("jsqr")).default;
        const img  = new Image();
        img.onload = () => {
          const canvas  = document.createElement("canvas");
          canvas.width  = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            setDecodedUrl(code.data);
          } else {
            setDecodeError("No QR code detected in this image. Please try a clearer photo.");
          }
        };
        img.onerror = () => setDecodeError("Could not load image. Please use PNG, JPG, or WebP.");
        img.src = dataUrl;
      } catch {
        setDecodeError("QR decoding library failed to load. Please refresh and try again.");
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file (PNG, JPG, WebP)."); return; }
    if (file.size > 8 * 1024 * 1024)    { toast.error("Image too large. Please use an image under 8 MB."); return; }
    decodeQR(file);
  }, [decodeQR]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  // ── Camera detected callback ───────────────────────────────────────────────
  const handleCameraDetected = useCallback((url: string) => {
    setCameraOpen(false);
    setDecodedUrl(url);
    setImagePreview(null);   // no image preview for camera captures
    setDecodeError(null);
    setResult(null);
    toast.success("QR code detected from camera!");
  }, []);

  // ── Scan URL ───────────────────────────────────────────────────────────────
  const handleScan = async () => {
    if (!decodedUrl) return;
    setScanning(true);
    try {
      const res = await backendFetch("/api/qr-scan", {
        method: "POST",
        body:   JSON.stringify({ url: decodedUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Scan failed");
      }
      const data: QrScanResult = await res.json();
      setResult(data);
      setChainExpanded(true);

      if (data.threatLevel === "SAFE")           toast.success("QR code is safe!");
      else if (data.threatLevel === "SUSPICIOUS") toast("Suspicious QR code detected.", { icon: "⚠️" });
      else                                        toast.error(`${data.threatLevel.replace("_"," ")} QR code!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setDecodedUrl(null);
    setDecodeError(null);
    setResult(null);
    setScanning(false);
  };

  const cfg         = result ? threatConfig[result.threatLevel] : null;
  const ThreatIcon  = cfg?.icon ?? Shield;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Camera scanner overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {cameraOpen && (
          <CameraScanner
            onDetected={handleCameraDetected}
            onClose={() => setCameraOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {/* ── Upload zone ──────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!result && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div
                id="qr-upload-zone"
                role="button"
                tabIndex={0}
                aria-label="Upload QR code image"
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer select-none ${
                  dragging
                    ? "border-primary bg-primary/8 scale-[1.01]"
                    : imagePreview
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-primary/4"
                }`}
              >
                {imagePreview ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="QR code preview"
                        className="h-44 w-44 rounded-xl object-contain border border-border shadow-lg"
                      />
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow">
                        <QrCode className="h-3 w-3" />
                      </div>
                    </div>

                    {decodedUrl && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4 text-left space-y-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 uppercase tracking-wide">
                            <CheckCircle2 className="h-3.5 w-3.5" /> QR Code Decoded
                          </div>
                          <p className="text-sm font-mono text-foreground/90 break-all leading-relaxed">{decodedUrl}</p>
                        </div>
                      </motion.div>
                    )}

                    {decodeError && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/8 p-4 text-left w-full max-w-md">
                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{decodeError}</p>
                      </motion.div>
                    )}

                    <p className="text-xs text-muted-foreground">Click to upload a different image</p>
                  </div>
                ) : decodedUrl && !imagePreview ? (
                  /* Camera-captured URL (no image preview) */
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/15 ring-1 ring-emerald-500/30">
                      <Camera className="h-7 w-7 text-emerald-500" />
                    </div>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4 text-left space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 uppercase tracking-wide">
                          <Camera className="h-3.5 w-3.5" /> Captured from Camera
                        </div>
                        <p className="text-sm font-mono text-foreground/90 break-all leading-relaxed">{decodedUrl}</p>
                      </div>
                    </motion.div>
                    <p className="text-xs text-muted-foreground">Click to upload an image instead</p>
                  </div>
                ) : (
                  /* Empty state */
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/15 ring-1 ring-primary/20">
                      {dragging
                        ? <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}><Upload className="h-7 w-7 text-primary" /></motion.div>
                        : <QrCode className="h-7 w-7 text-primary" />
                      }
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        {dragging ? "Drop your QR code here" : "Upload a QR Code Image"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Drag & drop or click to browse · PNG, JPG, WebP · up to 8 MB
                      </p>
                    </div>
                  </>
                )}

                <input
                  ref={fileRef}
                  id="qr-file-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onInputChange}
                  aria-label="Upload QR code file"
                />
              </div>

              {/* ── Action buttons row ── */}
              <div className="mt-4 flex gap-3">
                {/* Camera button — always visible when no result */}
                <button
                  id="qr-camera-btn"
                  onClick={(e) => { e.stopPropagation(); setCameraOpen(true); }}
                  className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/8 px-4 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/15 hover:border-primary/60 active:scale-95"
                >
                  <Camera className="h-4 w-4" />
                  Use Camera
                </button>

                {/* Scan button — only when URL is decoded */}
                {decodedUrl && !scanning && (
                  <motion.button
                    id="qr-scan-btn"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={handleScan}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 active:scale-95"
                  >
                    <Zap className="h-4 w-4" />
                    Scan for Threats
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                )}

                {/* Reset */}
                {(decodedUrl || imagePreview) && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-black/5 hover:text-foreground"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Loading */}
              {scanning && (
                <motion.div
                  className="mt-4 flex items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Scanning QR code…</p>
                    <p className="text-xs text-muted-foreground">Following redirects, checking phishing signals, running AI analysis</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Results panel ─────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {result && cfg && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-4"
            >
              {/* ── Hero card ── */}
              <div
                className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${cfg.gradient} ${cfg.ring} ring-1 p-6`}
                style={{ boxShadow: `0 4px 40px ${cfg.glow}` }}
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl opacity-25" style={{ background: cfg.stroke }} />

                <div className="relative flex flex-col sm:flex-row items-center gap-6">
                  <RiskGauge score={result.riskScore} cfg={cfg} />

                  <div className="flex-1 text-center sm:text-left">
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${cfg.bg} ${cfg.color} ring-1 ${cfg.ring} mb-2`}>
                      <ThreatIcon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </div>
                    <p className="text-lg font-semibold text-foreground leading-snug">{result.verdict}</p>
                    <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${result.isPhishing ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"}`}>
                        {result.isPhishing ? "⚠ Phishing detected" : "✓ Not phishing"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/8 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {result.redirectChain.length} redirect{result.redirectChain.length !== 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/8 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Confidence: {result.confidence}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Redirect Chain ── */}
              <div className="rounded-2xl border border-border bg-white/60 backdrop-blur-sm shadow-sm overflow-hidden">
                <button
                  id="qr-chain-toggle"
                  onClick={() => setChainExpanded(v => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-foreground hover:bg-black/3 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    Redirect Chain
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {result.redirectChain.length} hop{result.redirectChain.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {chainExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                <AnimatePresence initial={false}>
                  {chainExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-2">
                        {result.redirectChain.map((hop, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className={`flex items-start gap-3 rounded-xl p-3 border ${hop.isSuspicious ? "border-amber-500/25 bg-amber-500/6" : "border-border/60 bg-black/2"}`}
                          >
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${hop.isSuspicious ? "bg-amber-500/20 text-amber-500" : "bg-primary/10 text-primary"}`}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${statusColor(hop.statusCode)}`}>{hop.statusCode}</span>
                                <span className="text-xs font-medium text-foreground truncate">{hop.domain}</span>
                                {hop.isSuspicious && (
                                  <span className="text-[10px] font-semibold text-amber-500 flex items-center gap-0.5">
                                    <AlertTriangle className="h-2.5 w-2.5" /> Suspicious
                                  </span>
                                )}
                                {i === result.redirectChain.length - 1 && (
                                  <span className="text-[10px] font-semibold text-primary flex items-center gap-0.5">
                                    <Eye className="h-2.5 w-2.5" /> Final destination
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground font-mono truncate">{hop.url}</p>
                            </div>
                            {i < result.redirectChain.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />}
                          </motion.div>
                        ))}

                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                          <ExternalLink className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Final Destination</p>
                            <p className="text-xs font-mono text-foreground/80 break-all">{result.finalUrl}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Red Flags + Safe Factors ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.redFlags.length > 0 && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-500">Red Flags</span>
                    </div>
                    <div className="space-y-1.5">
                      {result.redFlags.map((flag, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="flex items-start gap-2 text-xs text-foreground/80">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                          {flag}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                {result.safeFactors.length > 0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-500">Safe Factors</span>
                    </div>
                    <div className="space-y-1.5">
                      {result.safeFactors.map((factor, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="flex items-start gap-2 text-xs text-foreground/80">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {factor}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── AI Explanation ── */}
              <div className="rounded-2xl border border-border bg-white/60 backdrop-blur-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/15">
                    <Info className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">AI Analysis</span>
                  {result.modelUsed && (
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono bg-black/5 px-2 py-0.5 rounded-full">
                      {result.modelUsed.split("/").pop()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{result.explanation}</p>
              </div>

              {/* ── Actions ── */}
              <div className="flex gap-3">
                <button
                  id="qr-scan-another-btn"
                  onClick={handleReset}
                  className="flex items-center gap-2 rounded-xl border border-border bg-white/80 px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-black/5 active:scale-95"
                >
                  <RotateCcw className="h-4 w-4" />
                  Scan Another
                </button>
                <button
                  id="qr-camera-again-btn"
                  onClick={() => { handleReset(); setTimeout(() => setCameraOpen(true), 100); }}
                  className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 px-5 py-2.5 text-sm font-medium text-primary shadow-sm transition-all hover:bg-primary/15 active:scale-95"
                >
                  <Camera className="h-4 w-4" />
                  Scan with Camera
                </button>
                {result.finalUrl && (
                  <a
                    id="qr-view-url-btn"
                    href={result.finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-border bg-white/80 px-5 py-2.5 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:bg-black/5"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View URL
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── How it works ── */}
        {!result && !imagePreview && !decodedUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-border/60 bg-black/2 p-5"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">How it works</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: "📷", label: "Upload or Camera", desc: "Upload an image or use your live camera" },
                { icon: "🔗", label: "Decode URL",        desc: "We extract the hidden link instantly"  },
                { icon: "🕵️", label: "Follow Redirects", desc: "Track every hop to the final destination" },
                { icon: "🤖", label: "AI Risk Score",     desc: "AI detects phishing & scam patterns"  },
              ].map((step) => (
                <div key={step.label} className="flex flex-col items-center text-center gap-1.5 p-3 rounded-xl bg-white/50 border border-border/40">
                  <span className="text-2xl">{step.icon}</span>
                  <p className="text-xs font-semibold text-foreground">{step.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{step.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
