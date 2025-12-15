-- Migration: Create uld_entries table for syncing ULD markings across devices
-- This table stores ULD entry data (numbers, types, checked state) that was previously in localStorage
-- Run this in Supabase SQL Editor

-- Create uld_entries table
CREATE TABLE IF NOT EXISTS public.uld_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  load_plan_id uuid NOT NULL REFERENCES load_plans(id) ON DELETE CASCADE,
  flight_number character varying(50) NOT NULL,
  sector_index integer NOT NULL,
  uld_section_index integer NOT NULL,
  entry_index integer NOT NULL,           -- Index within the ULD section (for ordering)
  uld_type character varying(20) NOT NULL, -- e.g., "PMC", "AKE", "BULK"
  uld_number character varying(50),        -- e.g., "12345" or empty string
  is_checked boolean NOT NULL DEFAULT false,
  checked_by character varying(100),       -- Staff name who marked it
  checked_at timestamp with time zone,     -- When it was marked
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT uld_entries_pkey PRIMARY KEY (id),
  CONSTRAINT uld_entries_unique UNIQUE (load_plan_id, sector_index, uld_section_index, entry_index)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_uld_entries_load_plan_id ON public.uld_entries(load_plan_id);
CREATE INDEX IF NOT EXISTS idx_uld_entries_flight_number ON public.uld_entries(flight_number);
CREATE INDEX IF NOT EXISTS idx_uld_entries_lookup ON public.uld_entries(load_plan_id, sector_index, uld_section_index);

-- Enable RLS (but with permissive policy for simplicity)
ALTER TABLE public.uld_entries ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth required - controlled via UI)
CREATE POLICY "Allow all operations on uld_entries" ON public.uld_entries
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_uld_entries_updated_at ON public.uld_entries;
CREATE TRIGGER update_uld_entries_updated_at
    BEFORE UPDATE ON public.uld_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.uld_entries IS 'Stores ULD entry data including numbers, types, and checked state. Synced between desktop and mobile apps.';
COMMENT ON COLUMN public.uld_entries.entry_index IS 'Index within the ULD section for ordering multiple entries';
COMMENT ON COLUMN public.uld_entries.is_checked IS 'Whether this ULD entry has been marked as complete/final';
COMMENT ON COLUMN public.uld_entries.checked_by IS 'Name of staff member who marked this entry';

