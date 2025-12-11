-- Add header_warning column to load_plans table
-- This column stores warning messages from the load plan header
-- such as "XX NO PART SHIPMENT XX" and "Station requirement" messages

ALTER TABLE load_plans 
ADD COLUMN IF NOT EXISTS header_warning TEXT;

COMMENT ON COLUMN load_plans.header_warning IS 'Warning messages from load plan header (e.g., "XX NO PART SHIPMENT XX" and station requirements)';

