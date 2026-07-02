-- ═══════════════════════════════════════════════════════════
--  ScanRadar — Phone / Mobile Scans Table
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. Create the phone_scans table
CREATE TABLE IF NOT EXISTS public.phone_scans (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone            TEXT NOT NULL,
  formatted        TEXT,
  country          TEXT,
  country_code     TEXT,
  country_flag     TEXT,
  confirmed_count  INT  DEFAULT 0,
  likely_count     INT  DEFAULT 0,
  exposure_score   INT  DEFAULT 0,
  risk_level       TEXT DEFAULT 'LOW',
  results          JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.phone_scans ENABLE ROW LEVEL SECURITY;

-- 3. Policy: users can only see their own scans
CREATE POLICY "Users can view own phone scans"
  ON public.phone_scans FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Policy: users can insert their own scans
CREATE POLICY "Users can insert own phone scans"
  ON public.phone_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Policy: users can delete their own scans
CREATE POLICY "Users can delete own phone scans"
  ON public.phone_scans FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_phone_scans_user_id
  ON public.phone_scans(user_id);

-- 7. Index for sorting by date
CREATE INDEX IF NOT EXISTS idx_phone_scans_created_at
  ON public.phone_scans(created_at DESC);

-- Done! You will now see phone_scans in Table Editor.
