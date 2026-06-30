-- ═══════════════════════════════════════════════════════════
--  ScanRadar — Profiles Table (Final Version)
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT,
  full_name            TEXT,
  avatar_config        JSONB DEFAULT '{"gender":"male","skin":"light","hairColor":"black","hairStyle":"ShortHairShortFlat","bgColor":"b6e3f4"}',
  bio                  TEXT,
  notify_scan_complete BOOLEAN DEFAULT TRUE,
  notify_breach_alert  BOOLEAN DEFAULT TRUE,
  notify_weekly_digest BOOLEAN DEFAULT FALSE,
  profile_public       BOOLEAN DEFAULT FALSE,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add missing columns safely
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_config        JSONB DEFAULT '{"gender":"male","skin":"light","hairColor":"black","hairStyle":"ShortHairShortFlat","bgColor":"b6e3f4"}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio                  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_scan_complete BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_breach_alert  BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_weekly_digest BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_public       BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT NOW();

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies then recreate
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can upsert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Done! ✅
