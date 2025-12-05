-- Add revision column to load_plans table
-- This column tracks the revision number for each load plan
-- When a load plan with the same flight_number is uploaded again, the revision number will be incremented

ALTER TABLE load_plans 
ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 1 NOT NULL;

COMMENT ON COLUMN load_plans.revision IS 'Revision number for the load plan. Increments when the same flight_number is uploaded again.';

-- Create index on flight_number and revision for better query performance
CREATE INDEX IF NOT EXISTS idx_load_plans_flight_revision ON load_plans(flight_number, revision);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON load_plans TO anon;
GRANT SELECT, INSERT, UPDATE ON load_plans TO authenticated;

-- Refresh PostgREST schema cache
-- Note: This needs to be run in Supabase SQL Editor or via API
-- The schema cache will be refreshed automatically, but you can also:
-- 1. Go to Supabase Dashboard > Settings > API > Restart PostgREST
-- 2. Or wait a few minutes for automatic refresh
-- 3. Or run: NOTIFY pgrst, 'reload schema';
