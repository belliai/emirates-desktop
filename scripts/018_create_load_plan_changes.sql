-- Create load_plan_changes table for tracking detailed changes between revisions
-- This table records what changed between original and revised load plans

CREATE TABLE IF NOT EXISTS load_plan_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_plan_id UUID NOT NULL REFERENCES load_plans(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('added', 'modified', 'deleted')),
  item_type TEXT NOT NULL CHECK (item_type IN ('awb', 'uld_section', 'sector', 'comment', 'header')),
  
  -- For AWB items
  original_item_id UUID REFERENCES load_plan_items(id) ON DELETE CASCADE,
  revised_item_id UUID REFERENCES load_plan_items(id) ON DELETE CASCADE,
  serial_number INTEGER,
  
  -- For ULD sections
  uld_section_index INTEGER,
  sector_index INTEGER,
  
  -- Change details - JSONB to store field-level changes
  -- Format: {"field_name": {"old": "old_value", "new": "new_value"}}
  field_changes JSONB,
  
  -- Original data snapshot (for deleted items)
  original_data JSONB,
  
  -- Revised data snapshot (for added items)
  revised_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE load_plan_changes IS 'Tracks detailed changes between load plan revisions (added, modified, deleted items)';
COMMENT ON COLUMN load_plan_changes.change_type IS 'Type of change: added (new item), modified (existing item changed), deleted (item removed)';
COMMENT ON COLUMN load_plan_changes.item_type IS 'Type of item: awb, uld_section, sector, comment, header';
COMMENT ON COLUMN load_plan_changes.field_changes IS 'JSONB object storing field-level changes: {"field_name": {"old": "old_value", "new": "new_value"}}';
COMMENT ON COLUMN load_plan_changes.original_data IS 'JSONB snapshot of original item data (for deleted items)';
COMMENT ON COLUMN load_plan_changes.revised_data IS 'JSONB snapshot of revised item data (for added items)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_load_plan_changes_load_plan_id ON load_plan_changes(load_plan_id);
CREATE INDEX IF NOT EXISTS idx_load_plan_changes_revision ON load_plan_changes(load_plan_id, revision);
CREATE INDEX IF NOT EXISTS idx_load_plan_changes_change_type ON load_plan_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_load_plan_changes_item_type ON load_plan_changes(item_type);
CREATE INDEX IF NOT EXISTS idx_load_plan_changes_serial_number ON load_plan_changes(serial_number);
CREATE INDEX IF NOT EXISTS idx_load_plan_changes_original_item_id ON load_plan_changes(original_item_id);
CREATE INDEX IF NOT EXISTS idx_load_plan_changes_revised_item_id ON load_plan_changes(revised_item_id);

-- Create unique index to prevent duplicate change records
-- Using partial index to handle NULL values properly
CREATE UNIQUE INDEX IF NOT EXISTS idx_load_plan_changes_unique 
ON load_plan_changes(load_plan_id, revision, change_type, item_type, serial_number)
WHERE serial_number IS NOT NULL;

-- Additional unique index for changes with item IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_load_plan_changes_unique_with_items
ON load_plan_changes(load_plan_id, revision, change_type, item_type, COALESCE(original_item_id::text, ''), COALESCE(revised_item_id::text, ''))
WHERE original_item_id IS NOT NULL OR revised_item_id IS NOT NULL;

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_changes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON load_plan_changes TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- IMPORTANT: After running this script:
-- ============================================
-- 1. Go to Supabase Dashboard
-- 2. Navigate to: Settings > API
-- 3. Click "Restart PostgREST" button
-- 4. Wait 10-30 seconds for restart to complete
-- ============================================
