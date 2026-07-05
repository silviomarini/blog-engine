-- v12: Add group_id to link language versions of the same article
-- Run manually in your Supabase SQL Editor

ALTER TABLE articles ADD COLUMN group_id UUID;

CREATE INDEX idx_articles_group_id ON articles(group_id);

-- Enforce at most one article per language within a group.
-- WHERE group_id IS NOT NULL: NULLs are excluded so unlinked articles are unaffected.
CREATE UNIQUE INDEX idx_articles_group_lang ON articles(group_id, lang) WHERE group_id IS NOT NULL;
