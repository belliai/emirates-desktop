-- Migration: Add BCR (Build-up Completion Report) columns to load_plans table
-- Run this in Supabase SQL Editor

-- Add BCR metadata columns to load_plans table
ALTER TABLE public.load_plans 
ADD COLUMN IF NOT EXISTS bcr_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS bcr_sent_by character varying(100),
ADD COLUMN IF NOT EXISTS bcr_handover_from character varying(100),
ADD COLUMN IF NOT EXISTS bcr_loaders_name character varying(100),
ADD COLUMN IF NOT EXISTS bcr_buildup_staff character varying(100),
ADD COLUMN IF NOT EXISTS bcr_supervisor character varying(100),
ADD COLUMN IF NOT EXISTS bcr_partially_actioned boolean,
ADD COLUMN IF NOT EXISTS bcr_volume_differences jsonb,
ADD COLUMN IF NOT EXISTS bcr_units_unable_update jsonb;

-- Create index for faster queries on BCR status
CREATE INDEX IF NOT EXISTS idx_load_plans_bcr_sent ON public.load_plans(bcr_sent_at) WHERE bcr_sent_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.load_plans.bcr_sent_at IS 'Timestamp when BCR was submitted';
COMMENT ON COLUMN public.load_plans.bcr_sent_by IS 'Staff name who submitted the BCR';
COMMENT ON COLUMN public.load_plans.bcr_handover_from IS 'Name of person handover was taken from';
COMMENT ON COLUMN public.load_plans.bcr_loaders_name IS 'Name/number of loaders';
COMMENT ON COLUMN public.load_plans.bcr_buildup_staff IS 'Build-up/UWS staff name';
COMMENT ON COLUMN public.load_plans.bcr_supervisor IS 'Supervisor name';
COMMENT ON COLUMN public.load_plans.bcr_partially_actioned IS 'Whether flight was partially actioned';
COMMENT ON COLUMN public.load_plans.bcr_volume_differences IS 'JSON array of volume difference entries';
COMMENT ON COLUMN public.load_plans.bcr_units_unable_update IS 'JSON array of units unable to update via HHT';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ============================================
-- After running this script:
-- ============================================
-- 1. Go to Supabase Dashboard > Settings > API
-- 2. Click "Restart PostgREST" (recommended)
-- 3. Wait 10-30 seconds
-- ============================================

