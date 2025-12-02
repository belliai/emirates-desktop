-- Add is_critical column to load_plans table
-- This column indicates if the document has a CRITICAL stamp
ALTER TABLE load_plans 
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN load_plans.is_critical IS 'Flag to indicate if document has CRITICAL stamp (red stamp on top right)';

