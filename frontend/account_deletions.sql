-- Account Deletions Table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS account_deletions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one row per user per platform
  UNIQUE (user_id, platform)
);

-- Row-Level Security: users can only see/edit their own records
ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletions"
  ON account_deletions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deletions"
  ON account_deletions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deletions"
  ON account_deletions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deletions"
  ON account_deletions FOR DELETE
  USING (auth.uid() = user_id);
