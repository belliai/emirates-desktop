-- Grant access and publish revision column for all users
-- Run this script if you get error: "Could not find the 'revision' column of 'load_plans' in the schema cache"
-- IMPORTANT: After running this script, you MUST restart PostgREST from Supabase Dashboard

-- Step 1: Drop column if exists (to recreate cleanly)
ALTER TABLE load_plans DROP COLUMN IF EXISTS revision;

-- Step 2: Add revision column with proper default
ALTER TABLE load_plans 
ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;

-- Step 3: Update existing rows to have revision = 1 (if any)
UPDATE load_plans SET revision = 1 WHERE revision IS NULL;

-- Step 4: Add comment to column
COMMENT ON COLUMN load_plans.revision IS 'Revision number for the load plan. Increments when the same flight_number is uploaded again.';

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_load_plans_flight_revision ON load_plans(flight_number, revision);

-- Step 6: Grant full permissions on load_plans table to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plans TO authenticated;

-- Step 7: Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 8: Grant permissions on load_plan_items table as well
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_items TO authenticated;

-- Step 9: Verify column exists (this will show error if column doesn't exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'load_plans' 
          AND column_name = 'revision'
    ) THEN
        RAISE NOTICE 'SUCCESS: revision column exists in load_plans table';
    ELSE
        RAISE EXCEPTION 'ERROR: revision column NOT found in load_plans table';
    END IF;
END $$;

-- Step 10: Try to notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ============================================
-- CRITICAL: After running this script:
-- ============================================
-- 1. Go to Supabase Dashboard
-- 2. Navigate to: Settings > API
-- 3. Click "Restart PostgREST" button (THIS IS REQUIRED!)
-- 4. Wait 10-30 seconds for restart to complete
-- 5. Try your upload again
--
-- The NOTIFY command above may not always work, so manual restart is required.
-- ============================================
