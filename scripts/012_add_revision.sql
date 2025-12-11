-- Add revision column to load_plans table
-- This column tracks the revision number for each load plan
-- When a load plan with the same flight_number is uploaded again, the revision number will be incremented

ALTER TABLE load_plans 
ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 1 NOT NULL;

COMMENT ON COLUMN load_plans.revision IS 'Revision number for the load plan. Increments when the same flight_number is uploaded again.';

-- Create index on flight_number and revision for better query performance
CREATE INDEX IF NOT EXISTS idx_load_plans_flight_revision ON load_plans(flight_number, revision);

-- Grant permissions to anon and authenticated roles for load_plans table
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plans TO authenticated;

-- Grant usage on sequence if exists (for auto-increment columns)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure all columns are accessible
ALTER TABLE load_plans ENABLE ROW LEVEL SECURITY;

-- Grant permissions on load_plan_items as well (in case needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_items TO authenticated;

-- Refresh PostgREST schema cache immediately
-- This forces PostgREST to reload the schema and recognize the new column
NOTIFY pgrst, 'reload schema';

-- Note: If NOTIFY doesn't work, you can also:
-- 1. Go to Supabase Dashboard > Settings > API > Restart PostgREST
-- 2. Or wait 5-10 minutes for automatic schema refresh
