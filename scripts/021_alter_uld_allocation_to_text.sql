-- Migration: Alter uld_allocation column to TEXT to support longer ULD strings with trailing comments
-- Run this in Supabase SQL Editor
-- 
-- Problem: uld_allocation was limited, truncating trailing comments like "(ENSURE TO LOAD 01PMC/01PLA WITH ALL CARGO)"
-- Solution: Change column type to TEXT to allow unlimited length

-- Alter the column type to TEXT (PostgreSQL allows this change)
ALTER TABLE load_plan_items 
ALTER COLUMN uld_allocation TYPE TEXT;

-- Add a comment explaining the column purpose
COMMENT ON COLUMN load_plan_items.uld_allocation IS 'ULD allocation string including trailing comments like "(ENSURE TO LOAD...)" or "--- HL ON EK041". TEXT type to allow long strings.';

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verification query (optional)
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'load_plan_items' 
--   AND column_name = 'uld_allocation';

