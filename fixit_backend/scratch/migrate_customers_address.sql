-- =============================================
-- MIGRATION: Add address columns to customers table
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS house_no       VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street_address VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS landmark       VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS full_address   VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_lat   NUMERIC DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_lng   NUMERIC DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_type    VARCHAR DEFAULT 'Home';

ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR;
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS address_type    VARCHAR;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers'
ORDER BY ordinal_position;
