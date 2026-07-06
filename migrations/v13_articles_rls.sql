-- Row Level Security for the articles table.
-- Run this in the Supabase SQL Editor after v0, v11, and v12.

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Anyone can read published articles whose publish date is in the past (or null).
CREATE POLICY "Published articles are publicly readable"
  ON articles
  FOR SELECT
  USING (
    published = true
    AND (published_at IS NULL OR published_at <= now())
  );

-- All writes (INSERT / UPDATE / DELETE) are reserved for the service role.
-- Next.js API routes using the service-role key bypass RLS by default in Supabase,
-- so no additional write policy is needed — only the public anon key is restricted.
