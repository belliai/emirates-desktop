-- Add revision column to load_plan_items table
-- This column tracks which revision of the load plan this item belongs to
-- Items from the first upload (revision 1) are considered original
-- Items from subsequent uploads (revision 2+) are considered updated/new

ALTER TABLE load_plan_items 
ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 1 NOT NULL;

COMMENT ON COLUMN load_plan_items.revision IS 'Revision number of the load plan when this item was created. Items with revision 1 are original, revision 2+ are updates.';

-- Create index on revision for better query performance
CREATE INDEX IF NOT EXISTS idx_load_plan_items_revision ON load_plan_items(load_plan_id, revision);

-- Update existing items to have revision = 1 (they are original)
UPDATE load_plan_items 
SET revision = 1 
WHERE revision IS NULL;

-- Grant permissions to anon and authenticated roles (including UPDATE for revision column)
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_items TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Explicitly grant UPDATE on revision column
GRANT UPDATE (revision) ON load_plan_items TO anon;
GRANT UPDATE (revision) ON load_plan_items TO authenticated;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- IMPORTANT: After running this script:
-- ============================================
-- 1. Go to Supabase Dashboard
-- 2. Navigate to: Settings > API
-- 3. Click "Restart PostgREST" button
-- 4. Wait 10-30 seconds for restart to complete
-- ============================================
