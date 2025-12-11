-- Fix is_critical column permissions and refresh cache
-- Run this if you can SELECT but cannot INSERT/UPDATE is_critical column

-- 1. Ensure column exists
ALTER TABLE load_plans 
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE;

-- 2. Grant explicit permissions on the column (if needed)
-- Note: Column-level permissions are usually inherited from table permissions
-- But we'll ensure table permissions are correct

-- 3. Grant full permissions to anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plans TO authenticated;

-- 4. If using RLS, ensure policies allow INSERT/UPDATE
-- (But you mentioned RLS is disabled, so this shouldn't be needed)

-- 5. Force PostgREST to reload schema
-- This is the key step - it forces PostgREST to recognize the new column
NOTIFY pgrst, 'reload schema';

-- 6. Alternative: You can also restart PostgREST from Dashboard
-- Settings > API > Restart PostgREST

-- 7. Verify the column exists and has correct type
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'load_plans' 
AND column_name = 'is_critical';

