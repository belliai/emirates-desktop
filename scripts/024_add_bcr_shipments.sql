-- Migration: Add bcr_shipments column to store shipment entries in BCR
-- This fixes the critical gap where shipments data was not being saved

ALTER TABLE public.load_plans
ADD COLUMN IF NOT EXISTS bcr_shipments jsonb;

-- Add comment describing the column structure
COMMENT ON COLUMN public.load_plans.bcr_shipments IS 
  'JSON array of shipment entries: {srNo, awb, pcs, location, reason, locationChecked, remarks}';

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON public.load_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.load_plans TO anon;
