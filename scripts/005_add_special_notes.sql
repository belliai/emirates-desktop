-- Add special_notes column to load_plan_items table
-- This column will store special notes like "[Must be load in Fire containment equipment]"
-- and "[Shipment to undergo ACC3 screening at DXB/DWC]"
ALTER TABLE load_plan_items
ADD COLUMN IF NOT EXISTS special_notes TEXT;

-- Create index for better query performance if needed
-- CREATE INDEX IF NOT EXISTS idx_load_plan_items_special_notes ON load_plan_items(special_notes) WHERE special_notes IS NOT NULL;

