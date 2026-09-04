-- Run this in Supabase SQL Editor to create the newsletter subscribers table
-- Go to: https://supabase.com/dashboard/project/wnqfdmbypygvrdanosqx/sql/new

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (subscribe)
CREATE POLICY "Anyone can subscribe to newsletter"
ON newsletter_subscribers FOR INSERT
WITH CHECK (true);

-- Only authenticated users can read subscriber list
CREATE POLICY "Authenticated users can view subscribers"
ON newsletter_subscribers FOR SELECT
USING (auth.role() = 'authenticated');
