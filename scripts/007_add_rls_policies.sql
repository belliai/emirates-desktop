-- Grant database permissions for load_plans and load_plan_items tables
-- This allows INSERT, UPDATE, DELETE operations for anonymous users
-- Use this script if RLS is disabled and you're getting "permission denied" errors

-- Grant permissions to anon role for load_plans table
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plans TO anon;

-- Grant permissions to anon role for load_plan_items table
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_items TO anon;

-- Grant sequence permissions (only needed if tables use SERIAL/BIGSERIAL, not UUID)
-- Uncomment these if your tables use auto-incrementing integer IDs:
-- GRANT USAGE, SELECT ON SEQUENCE load_plans_id_seq TO anon;
-- GRANT USAGE, SELECT ON SEQUENCE load_plan_items_id_seq TO anon;

-- Optional: If you want to allow authenticated users as well, uncomment these:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON load_plans TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_items TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE load_plans_id_seq TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE load_plan_items_id_seq TO authenticated;

