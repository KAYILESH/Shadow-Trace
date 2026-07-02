-- ═══════════════════════════════════════════════════════════
--  ScanRadar — Identity Scans Table
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. Create the identity_scans table
CREATE TABLE IF NOT EXISTS public.identity_scans (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  name             TEXT,
  email_provider   TEXT,
  domain           TEXT,
  gravatar_found   BOOLEAN DEFAULT FALSE,
  gravatar_url     TEXT,
  breach_count     INT DEFAULT 0,
  breaches         TEXT[] DEFAULT '{}',
  exposure_score   INT DEFAULT 0,
  risk_level       TEXT DEFAULT 'LOW',
  connected_services JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.identity_scans ENABLE ROW LEVEL SECURITY;

-- 3. Policy: users can only see their own identity scans
CREATE POLICY "Users can view own identity scans"
  ON public.identity_scans FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Policy: users can insert their own identity scans
CREATE POLICY "Users can insert own identity scans"
  ON public.identity_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Policy: users can delete their own identity scans
CREATE POLICY "Users can delete own identity scans"
  ON public.identity_scans FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_identity_scans_user_id
  ON public.identity_scans(user_id);

-- 7. Index for sorting by date
CREATE INDEX IF NOT EXISTS idx_identity_scans_created_at
  ON public.identity_scans(created_at DESC);

-- Done! You should see the identity_scans table in Table Editor now.
