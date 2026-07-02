# ScanRadar — Monorepo

Two separate deployable services:

```
ScanRadar/
├── backend/     ← Express.js API server (deploy on Render as Web Service)
├── frontend/    ← Next.js web app (deploy on Render as Web Service)
└── shadowtrace/ ← Original monolith (kept for reference)
```

---

## 🚀 Render Deployment Guide

### Step 1: Deploy the Backend

1. In Render → **New → Web Service**
2. Connect your GitHub repo (`KAYILESH/ScanRadar`)
3. Set:
   | Setting | Value |
   |---|---|
   | **Root Directory** | `backend` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Environment** | Node |

4. Add **Environment Variables**:
   ```
   SUPABASE_URL=https://uxrpvvdsgsszbhgtgqkf.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your service role key from Supabase dashboard>
   OPENROUTER_API_KEY=sk-or-v1-...
   HIBP_API_KEY=<your hibp key>
   FRONTEND_URL=https://your-frontend.onrender.com
   ```

5. Click **Deploy** — note the URL (e.g., `https://scanradar-backend.onrender.com`)

---

### Step 2: Deploy the Frontend

1. In Render → **New → Web Service**
2. Connect same GitHub repo
3. Set:
   | Setting | Value |
   |---|---|
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Environment** | Node |

4. Add **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://uxrpvvdsgsszbhgtgqkf.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   NEXT_PUBLIC_BACKEND_URL=https://scanradar-backend.onrender.com
   ```

5. Click **Deploy**

---

### Step 3: Update FRONTEND_URL in Backend

Once your frontend is deployed, go back to your **backend service** on Render:
1. Settings → Environment Variables
2. Update `FRONTEND_URL` to your actual frontend URL
3. Redeploy backend (for CORS to allow requests from your frontend)

---

## 🔑 Getting Supabase Service Role Key

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your project → **Settings → API**
3. Copy the **Service Role Key** (secret key, not the anon key)

> ⚠️ Never commit the Service Role Key to GitHub. Always set it as a Render environment variable.

---

## Local Development

```bash
# Backend (runs on http://localhost:3001)
cd backend
npm install
cp .env.example .env   # fill in your keys
npm run dev

# Frontend (runs on http://localhost:3000)
cd frontend
npm install
# .env.local is already configured for local dev
npm run dev
```
