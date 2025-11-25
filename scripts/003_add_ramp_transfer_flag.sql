-- Add is_ramp_transfer flag to load_plan_items table
ALTER TABLE load_plan_items 
ADD COLUMN IF NOT EXISTS is_ramp_transfer BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_load_plan_items_ramp_transfer ON load_plan_items(is_ramp_transfer);

