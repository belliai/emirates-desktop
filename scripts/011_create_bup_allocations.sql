-- Create bup_allocations table for flight staff assignments
-- This table stores BUP (Build-Up) allocations that sync between desktop and mobile apps

CREATE TABLE IF NOT EXISTS public.bup_allocations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  carrier character varying(10) NOT NULL DEFAULT 'EK',
  flight_no character varying(20) NOT NULL,
  etd character varying(10) NULL,
  routing character varying(50) NULL,
  staff character varying(100) NULL,
  mobile character varying(50) NULL,
  ac_type character varying(20) NULL,
  regn_no character varying(20) NULL,
  shift_type character varying(20) NULL,
  period character varying(20) NULL,
  wave character varying(20) NULL,
  date character varying(20) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT bup_allocations_pkey PRIMARY KEY (id),
  CONSTRAINT bup_allocations_flight_no_unique UNIQUE (flight_no)
) TABLESPACE pg_default;

-- Create indexes for bup_allocations
CREATE INDEX IF NOT EXISTS idx_bup_allocations_flight_no ON public.bup_allocations USING btree (flight_no) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bup_allocations_staff ON public.bup_allocations USING btree (staff) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bup_allocations_shift_type ON public.bup_allocations USING btree (shift_type) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bup_allocations_period ON public.bup_allocations USING btree (period) TABLESPACE pg_default;

-- Create trigger for update updated_at on bup_allocations
DROP TRIGGER IF EXISTS update_bup_allocations_updated_at ON public.bup_allocations;
CREATE TRIGGER update_bup_allocations_updated_at
    BEFORE UPDATE ON public.bup_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.bup_allocations ENABLE ROW LEVEL SECURITY;

-- Create policy for allow all operations (adjust for production security needs)
DROP POLICY IF EXISTS "Allow all operations on bup_allocations" ON public.bup_allocations;
CREATE POLICY "Allow all operations on bup_allocations" ON public.bup_allocations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.bup_allocations IS 'BUP (Build-Up) allocations table for flight staff assignments. Synced between desktop and mobile apps.';


