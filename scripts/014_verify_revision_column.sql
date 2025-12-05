-- Verification script to check if revision column exists and is accessible
-- Run this to diagnose the issue

-- 1. Check if column exists in database
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable,
    table_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'load_plans' 
  AND column_name = 'revision';

-- 2. Check table permissions
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'load_plans'
  AND grantee IN ('anon', 'authenticated');

-- 3. Check if column has default value
SELECT 
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'load_plans'
  AND column_name = 'revision';

-- 4. Check sample data (if any)
SELECT 
    id,
    flight_number,
    revision,
    created_at
FROM load_plans
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check RLS policies (if enabled)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'load_plans';
