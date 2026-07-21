-- Create online_partners table for real-time 7.5km multi-partner broadcast
CREATE TABLE IF NOT EXISTS online_partners (
  partner_id VARCHAR PRIMARY KEY REFERENCES partners(phone) ON DELETE CASCADE,
  service_category VARCHAR NOT NULL,
  location_lat NUMERIC NOT NULL DEFAULT 0,
  location_lng NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_online_partners_category ON online_partners (service_category);
