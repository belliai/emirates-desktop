-- Create flights table
CREATE TABLE IF NOT EXISTS flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_number TEXT NOT NULL,
  eta TEXT NOT NULL,
  boarding_point TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(flight_number, eta, boarding_point)
);

-- Create ulds table
CREATE TABLE IF NOT EXISTS ulds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  uld_number TEXT NOT NULL,
  uld_shc TEXT NOT NULL,
  destination TEXT NOT NULL,
  remarks TEXT NOT NULL,
  status INTEGER NOT NULL CHECK (status >= 1 AND status <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create status_history table
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uld_id UUID NOT NULL REFERENCES ulds(id) ON DELETE CASCADE,
  status INTEGER NOT NULL CHECK (status >= 1 AND status <= 5),
  timestamp TIMESTAMPTZ NOT NULL,
  changed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ulds_flight_id ON ulds(flight_id);
CREATE INDEX IF NOT EXISTS idx_status_history_uld_id ON status_history(uld_id);
CREATE INDEX IF NOT EXISTS idx_flights_lookup ON flights(flight_number, eta, boarding_point);
