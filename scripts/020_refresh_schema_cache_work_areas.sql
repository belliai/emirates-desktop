-- Refresh schema cache to recognize work_areas column in load_plan_items
-- This forces PostgREST to reload the schema and recognize the new column

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Also grant necessary permissions just in case
GRANT SELECT, INSERT, UPDATE ON load_plan_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON load_plan_items TO anon;

-- Verify the column exists (this will error if it doesn't)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'load_plan_items' 
    AND column_name = 'work_areas'
  ) THEN
    RAISE EXCEPTION 'work_areas column does not exist in load_plan_items table';
  END IF;
END $$;

SELECT 'Schema cache refreshed successfully. work_areas column is available.' AS status;

