-- Migration: Add AWB status columns to load_plan_items table
-- This adds loaded/offloaded tracking directly to the AWB items
-- Run this in Supabase SQL Editor

-- Add AWB status columns to existing load_plan_items table
ALTER TABLE public.load_plan_items 
ADD COLUMN IF NOT EXISTS is_loaded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS loaded_by character varying(100),
ADD COLUMN IF NOT EXISTS loaded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_offloaded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS offload_pieces integer,
ADD COLUMN IF NOT EXISTS offload_reason text,
ADD COLUMN IF NOT EXISTS offloaded_by character varying(100),
ADD COLUMN IF NOT EXISTS offloaded_at timestamp with time zone;

-- Create index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_load_plan_items_status ON public.load_plan_items(load_plan_id, is_loaded, is_offloaded);

-- Add comments for documentation
COMMENT ON COLUMN public.load_plan_items.is_loaded IS 'Whether this AWB has been loaded into a ULD';
COMMENT ON COLUMN public.load_plan_items.loaded_by IS 'Name of staff member who marked this AWB as loaded';
COMMENT ON COLUMN public.load_plan_items.loaded_at IS 'Timestamp when AWB was marked as loaded';
COMMENT ON COLUMN public.load_plan_items.is_offloaded IS 'Whether this AWB has been marked for offload';
COMMENT ON COLUMN public.load_plan_items.offload_pieces IS 'Number of pieces being offloaded';
COMMENT ON COLUMN public.load_plan_items.offload_reason IS 'Reason for offloading';
COMMENT ON COLUMN public.load_plan_items.offloaded_by IS 'Name of staff member who marked offload';
COMMENT ON COLUMN public.load_plan_items.offloaded_at IS 'Timestamp when AWB was marked for offload';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ============================================
-- After running this script:
-- ============================================
-- 1. Go to Supabase Dashboard > Settings > API
-- 2. Click "Restart PostgREST" (recommended)
-- 3. Wait 10-30 seconds
-- ============================================

