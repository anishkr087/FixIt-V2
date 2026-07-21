-- Supabase Database Schema DDL for FixIt

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS customers (
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Partners Table
CREATE TABLE IF NOT EXISTS partners (
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

-- Create spatial index or btree index for geolocation searches
CREATE INDEX IF NOT EXISTS idx_partners_online_category ON partners (is_online, service_category);

-- 3. Job Requests Table
CREATE TABLE IF NOT EXISTS job_requests (
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id VARCHAR NOT NULL REFERENCES partners(phone) ON DELETE CASCADE,
  job_id UUID REFERENCES job_requests(id) ON DELETE SET NULL,
  type VARCHAR NOT NULL, -- earning, withdrawal, commission_deduction
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RPC Geospatial Function for Matchmaking
DROP FUNCTION IF EXISTS find_nearest_online_partners(numeric,numeric,character varying,numeric);

CREATE OR REPLACE FUNCTION find_nearest_online_partners(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_category VARCHAR,
  p_max_distance_meters NUMERIC
)
RETURNS TABLE (
  id VARCHAR, -- returns partner phone as id for backward compatibility
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
