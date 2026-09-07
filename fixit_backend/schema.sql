-- Combined Supabase Database Schema DDL for FixIt

-- 1. Drop existing tables in order of constraint dependency
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS job_requests CASCADE;
DROP TABLE IF EXISTS online_partners CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 2. Create Customers Table with all address columns
CREATE TABLE customers (
  phone VARCHAR PRIMARY KEY,
  name VARCHAR,
  email VARCHAR,
  location VARCHAR,
  house_no VARCHAR,
  street_address VARCHAR,
  landmark VARCHAR,
  full_address VARCHAR,
  location_lat NUMERIC DEFAULT 0,
  location_lng NUMERIC DEFAULT 0,
  alternate_phone VARCHAR,
  address_type VARCHAR DEFAULT 'Home',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Partners Table with phone as primary key
CREATE TABLE partners (
  phone VARCHAR PRIMARY KEY,
  name VARCHAR,
  profile_photo VARCHAR,
  service_category VARCHAR,
  experience INTEGER,
  service_area VARCHAR,
  id_proof VARCHAR, -- Encrypted
  skill_certificate VARCHAR,
  bank_account_number VARCHAR, -- Encrypted
  bank_ifsc VARCHAR,
  rating NUMERIC DEFAULT 5.0,
  jobs_completed INTEGER DEFAULT 0,
  wallet_balance NUMERIC DEFAULT 0,
  is_online BOOLEAN DEFAULT FALSE,
  kyc_verified BOOLEAN DEFAULT FALSE,
  membership_tier VARCHAR DEFAULT 'basic',
  location_lat NUMERIC DEFAULT 0,
  location_lng NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for geolocation searches
CREATE INDEX IF NOT EXISTS idx_partners_online_category ON partners (is_online, service_category);

-- 4. Create Online Partners Table referencing partners(phone)
CREATE TABLE online_partners (
  partner_id VARCHAR PRIMARY KEY REFERENCES partners(phone) ON DELETE CASCADE,
  service_category VARCHAR NOT NULL,
  location_lat NUMERIC NOT NULL DEFAULT 0,
  location_lng NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Job Requests Table with all address columns and references
CREATE TABLE job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL REFERENCES customers(phone) ON DELETE CASCADE,
  problem_description TEXT NOT NULL,
  estimated_price NUMERIC NOT NULL,
  status VARCHAR DEFAULT 'pending', -- pending, accepted, on_the_way, reached, work_started, completed, cancelled
  assigned_partner VARCHAR REFERENCES partners(phone) ON DELETE SET NULL,
  payment_method VARCHAR DEFAULT 'COD',
  customer_location_lat NUMERIC NOT NULL,
  customer_location_lng NUMERIC NOT NULL,
  full_address VARCHAR,
  house_no VARCHAR,
  street_address VARCHAR,
  landmark VARCHAR,
  alternate_phone VARCHAR,
  address_type VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 6. Create Transactions Table referencing partners(phone) and job_requests(id)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id VARCHAR NOT NULL REFERENCES partners(phone) ON DELETE CASCADE,
  job_id UUID REFERENCES job_requests(id) ON DELETE SET NULL,
  type VARCHAR NOT NULL, -- earning, withdrawal, commission_deduction
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Disable Row Level Security (RLS) on all tables for backend access
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE online_partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- 8. Drop old function and Re-create RPC function
DROP FUNCTION IF EXISTS find_nearest_online_partners(numeric,numeric,character varying,numeric);

CREATE OR REPLACE FUNCTION find_nearest_online_partners(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_category VARCHAR,
  p_max_distance_meters NUMERIC
)
RETURNS TABLE (
  id VARCHAR, -- returns partner phone as id for backend compatibility
  phone VARCHAR,
  name VARCHAR,
  profile_photo VARCHAR,
  service_category VARCHAR,
  experience INTEGER,
  service_area VARCHAR,
  id_proof VARCHAR,
  skill_certificate VARCHAR,
  bank_account_number VARCHAR,
  bank_ifsc VARCHAR,
  rating NUMERIC,
  jobs_completed INTEGER,
  wallet_balance NUMERIC,
  is_online BOOLEAN,
  kyc_verified BOOLEAN,
  membership_tier VARCHAR,
  location_lat NUMERIC,
  location_lng NUMERIC,
  created_at TIMESTAMPTZ,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.phone AS id,
    p.phone,
    p.name,
    p.profile_photo,
    p.service_category,
    p.experience,
    p.service_area,
    p.id_proof,
    p.skill_certificate,
    p.bank_account_number,
    p.bank_ifsc,
    p.rating,
    p.jobs_completed,
    p.wallet_balance,
    p.is_online,
    p.kyc_verified,
    p.membership_tier,
    p.location_lat,
    p.location_lng,
    p.created_at,
    (6371000 * acos(
      cos(radians(p_lat)) * cos(radians(p.location_lat)) * cos(radians(p.location_lng) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(p.location_lat))
    ))::DOUBLE PRECISION AS distance
  FROM partners p
  WHERE p.is_online = true 
    AND p.wallet_balance > -500
    AND LOWER(p_category) = ANY(string_to_array(LOWER(p.service_category), ','))
    AND (6371000 * acos(
      cos(radians(p_lat)) * cos(radians(p.location_lat)) * cos(radians(p.location_lng) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(p.location_lat))
    )) <= p_max_distance_meters
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql;
