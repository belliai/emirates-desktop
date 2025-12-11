-- Add additional_data column to load_plan_items table
-- This column flags items that were added in subsequent uploads (additional data)
-- Items with additional_data = true are new items that triggered revision increment
-- Items with additional_data = false are original items from first upload

ALTER TABLE load_plan_items 
ADD COLUMN IF NOT EXISTS additional_data BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN load_plan_items.additional_data IS 'Flag indicating if this item is additional data from subsequent upload. true = new item added in later upload, false = original item from first upload.';

-- Create index on additional_data for better query performance
CREATE INDEX IF NOT EXISTS idx_load_plan_items_additional_data ON load_plan_items(load_plan_id, additional_data);

-- Update existing items to have additional_data = false (they are original)
UPDATE load_plan_items 
SET additional_data = false 
WHERE additional_data IS NULL;

-- Grant permissions to anon and authenticated roles (including UPDATE for additional_data column)
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_items TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Explicitly grant SELECT and UPDATE on additional_data column
-- This ensures PostgREST can both read and write this column
GRANT SELECT (additional_data) ON load_plan_items TO anon;
GRANT SELECT (additional_data) ON load_plan_items TO authenticated;
GRANT UPDATE (additional_data) ON load_plan_items TO anon;
GRANT UPDATE (additional_data) ON load_plan_items TO authenticated;

-- Step 10: Verify column exists (this will show error if column doesn't exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'load_plan_items' 
          AND column_name = 'additional_data'
    ) THEN
        RAISE NOTICE 'SUCCESS: additional_data column exists in load_plan_items table';
    ELSE
        RAISE EXCEPTION 'ERROR: additional_data column NOT found in load_plan_items table';
    END IF;
END $$;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- CRITICAL: After running this script:
-- ============================================
-- 1. Go to Supabase Dashboard
-- 2. Navigate to: Settings > API
-- 3. Click "Restart PostgREST" button (THIS IS REQUIRED!)
-- 4. Wait 10-30 seconds for restart to complete
-- 5. Try your query again
--
-- The NOTIFY command above may not always work, so manual restart is required.
-- ============================================

-- Verification query (run after PostgREST restart to verify column exists)
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'load_plan_items' 
--   AND column_name = 'additional_data';
