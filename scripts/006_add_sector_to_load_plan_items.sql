-- Add sector column to load_plan_items table
-- This column will store the sector information (e.g., "DXBMXP", "DXBJFK")
-- to properly group items by sector when there are multiple sectors in one load plan
ALTER TABLE load_plan_items
ADD COLUMN IF NOT EXISTS sector VARCHAR(50);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_load_plan_items_sector ON load_plan_items(sector);

COMMENT ON COLUMN load_plan_items.sector IS 'Sector information (e.g., DXBMXP, DXBJFK) to group items by sector when multiple sectors exist in one load plan';

