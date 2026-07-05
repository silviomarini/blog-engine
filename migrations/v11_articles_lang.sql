-- v11: Add language support to articles
-- Run manually in your Supabase SQL Editor

ALTER TABLE articles ADD COLUMN lang CHAR(2) NOT NULL DEFAULT 'it';

CREATE INDEX idx_articles_lang ON articles(lang, published, published_at);
