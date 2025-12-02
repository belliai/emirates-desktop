-- Add is_critical column to load_plans table
-- This column indicates if the document has a CRITICAL stamp
ALTER TABLE load_plans 
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN load_plans.is_critical IS 'Flag to indicate if document has CRITICAL stamp (red stamp on top right)';

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON load_plans TO anon;
GRANT SELECT, INSERT, UPDATE ON load_plans TO authenticated;

-- Refresh PostgREST schema cache
-- Note: This needs to be run in Supabase SQL Editor or via API
-- The schema cache will be refreshed automatically, but you can also:
-- 1. Go to Supabase Dashboard > Settings > API > Restart PostgREST
-- 2. Or wait a few minutes for automatic refresh
-- 3. Or run: NOTIFY pgrst, 'reload schema';
