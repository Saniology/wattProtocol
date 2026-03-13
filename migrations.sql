-- ═══════════════════════════════════════════════════════════════
--  $WATT PROTOCOL — Database Migrations
--  Run these in the Supabase SQL Editor (one at a time if needed)
-- ═══════════════════════════════════════════════════════════════

-- 1. Add unsubscribed flag to waitlist_users
--    (safe to run multiple times — uses IF NOT EXISTS equivalent)
ALTER TABLE waitlist_users
  ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT FALSE;

-- 2. Add email_verified flag for email verification flow
ALTER TABLE waitlist_users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- 3. Add verification_token for email verification
ALTER TABLE waitlist_users
  ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- 4. Add page_views table for built-in analytics
CREATE TABLE IF NOT EXISTS page_views (
  id         BIGSERIAL PRIMARY KEY,
  page       TEXT        NOT NULL,
  views      BIGINT      NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(page)
);

-- Grant service role access (if using RLS)
-- ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- 5. RPC function for atomic page view increment
CREATE OR REPLACE FUNCTION increment_page_view(p_page TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO page_views (page, views, updated_at)
    VALUES (p_page, 1, NOW())
  ON CONFLICT (page)
  DO UPDATE SET views = page_views.views + 1, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Backfill existing users as verified (they signed up before verification was added)
--    IMPORTANT: Run this AFTER deploying the new server code, so existing users
--    can still access their dashboards.
UPDATE waitlist_users
  SET email_verified = TRUE
  WHERE email_verified IS NULL OR email_verified = FALSE AND verification_token IS NULL;
