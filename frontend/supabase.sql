-- Create a table for storing username scan results
CREATE TABLE scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_username TEXT NOT NULL,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own scans
CREATE POLICY "Users can view their own scans" 
ON scans FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own scans
CREATE POLICY "Users can insert their own scans" 
ON scans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own scans
CREATE POLICY "Users can delete their own scans" 
ON scans FOR DELETE 
USING (auth.uid() = user_id);

-- Create a table for storing risk scores
CREATE TABLE risk_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS) for risk_scores
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own risk scores" 
ON risk_scores FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risk scores" 
ON risk_scores FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk scores" 
ON risk_scores FOR DELETE 
USING (auth.uid() = user_id);
