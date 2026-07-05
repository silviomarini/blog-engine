-- v0: Base articles table
-- Run manually in your Supabase SQL Editor BEFORE v11 and v12.

CREATE TABLE articles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  author       TEXT NOT NULL DEFAULT '',
  category     TEXT,                          -- validated at app level, no DB constraint
  content      TEXT,
  excerpt      TEXT,
  cover_image  TEXT,
  tags         TEXT[],
  keywords     TEXT,
  faq          JSONB NOT NULL DEFAULT '[]',
  reading_time INTEGER,
  views        INTEGER NOT NULL DEFAULT 0,
  published    BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_articles_slug ON articles(slug);
