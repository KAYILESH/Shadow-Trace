import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// ── Routes ────────────────────────────────────────────────────────────────────
import advisorRouter from "./routes/advisor";
import scanRouter from "./routes/scan";
import phoneScanRouter from "./routes/phone-scan";
import identityScanRouter from "./routes/identity-scan";
import riskRouter from "./routes/risk";
import profileRouter from "./routes/profile";
import notificationsRouter from "./routes/notifications";
import settingsRouter from "./routes/settings";
import searchRouter from "./routes/search";
import deletionsRouter from "./routes/deletions";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use("/api/advisor", advisorRouter);
app.use("/api/scan", scanRouter);
app.use("/api/phone-scan", phoneScanRouter);
app.use("/api/identity-scan", identityScanRouter);
app.use("/api/risk", riskRouter);
app.use("/api/profile", profileRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/search", searchRouter);
app.use("/api/deletions", deletionsRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ ScanRadar backend running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

export default app;
