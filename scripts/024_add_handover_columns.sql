-- Add columns to track who handed over a flight
-- This enables auto-populating "Handover taken from" in BCR

ALTER TABLE public.load_plans 
ADD COLUMN IF NOT EXISTS handed_over_by integer,
ADD COLUMN IF NOT EXISTS handed_over_at timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.load_plans.handed_over_by IS 'Staff number of the person who handed over this flight';
COMMENT ON COLUMN public.load_plans.handed_over_at IS 'Timestamp when the flight was handed over';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

