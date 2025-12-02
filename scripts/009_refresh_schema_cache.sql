-- Refresh PostgREST schema cache
-- This script forces PostgREST to reload the schema and recognize new columns
-- Run this in Supabase SQL Editor after adding new columns

-- Method 1: Use NOTIFY to reload schema (recommended)
NOTIFY pgrst, 'reload schema';

-- Method 2: Alternative - you can also restart PostgREST from Supabase Dashboard:
-- 1. Go to Supabase Dashboard
-- 2. Settings > API
-- 3. Click "Restart PostgREST" button
-- 
-- Or wait 5-10 minutes for automatic schema refresh

