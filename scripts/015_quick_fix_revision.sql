-- Quick fix for revision column schema cache issue
-- Run this script, then RESTART PostgREST from Dashboard

-- 1. Ensure column exists
ALTER TABLE load_plans DROP COLUMN IF EXISTS revision;
ALTER TABLE load_plans ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;

-- 2. Grant permissions
GRANT ALL ON load_plans TO anon;
GRANT ALL ON load_plans TO authenticated;
GRANT ALL ON load_plan_items TO anon;
GRANT ALL ON load_plan_items TO authenticated;

-- 3. Verify
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'load_plans' 
  AND column_name = 'revision';

-- 4. After running this, go to Supabase Dashboard > Settings > API > Restart PostgREST
