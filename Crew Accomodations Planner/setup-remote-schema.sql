-- Crew Accommodations Planner - Remote Database Setup
-- Run this in your Supabase SQL Editor

-- Create tables
CREATE TABLE IF NOT EXISTS airlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    iata_code TEXT UNIQUE NOT NULL,
    country TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS airports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iata_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT,
    lat NUMERIC(10, 6) NOT NULL,
    lon NUMERIC(10, 6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    lat NUMERIC(10, 6) NOT NULL,
    lon NUMERIC(10, 6) NOT NULL,
    rating NUMERIC(3, 1),
    reviews INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    nightly NUMERIC(10, 2) NOT NULL,
    taxes_fees NUMERIC(10, 2) DEFAULT 0,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE,
    rules JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pairings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE,
    crew_size INTEGER NOT NULL,
    legs JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pairing_id UUID REFERENCES pairings(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    eta_minutes INTEGER NOT NULL,
    distance_km NUMERIC(8, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pairing_id, hotel_id)
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pairing_id UUID REFERENCES pairings(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    rate_snapshot JSONB,
    status TEXT DEFAULT 'proposed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hotels_location ON hotels(lat, lon);
CREATE INDEX IF NOT EXISTS idx_hotel_rates_validity ON hotel_rates(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_travel_times_pairing ON travel_times(pairing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pairing ON bookings(pairing_id);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_viable_hotels(UUID);

-- Create the RPC function for getting viable hotels
CREATE FUNCTION get_viable_hotels(p_pairing UUID)
RETURNS TABLE (
    hotel_id UUID,
    name TEXT,
    brand TEXT,
    eta_minutes INTEGER,
    distance_km NUMERIC,
    rating NUMERIC,
    nightly NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.name,
        h.brand,
        tt.eta_minutes,
        tt.distance_km,
        h.rating,
        hr.nightly
    FROM hotels h
    INNER JOIN travel_times tt ON h.id = tt.hotel_id
    LEFT JOIN hotel_rates hr ON h.id = hr.hotel_id 
        AND CURRENT_DATE BETWEEN hr.valid_from AND hr.valid_to
    WHERE tt.pairing_id = p_pairing
    ORDER BY tt.eta_minutes ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies (basic read access for now)
CREATE POLICY "Allow read access to airlines" ON airlines FOR SELECT USING (true);
CREATE POLICY "Allow read access to airports" ON airports FOR SELECT USING (true);
CREATE POLICY "Allow read access to hotels" ON hotels FOR SELECT USING (true);
CREATE POLICY "Allow read access to hotel_rates" ON hotel_rates FOR SELECT USING (true);
CREATE POLICY "Allow read access to contract_constraints" ON contract_constraints FOR SELECT USING (true);
CREATE POLICY "Allow read access to pairings" ON pairings FOR SELECT USING (true);
CREATE POLICY "Allow read access to travel_times" ON travel_times FOR SELECT USING (true);
CREATE POLICY "Allow read access to bookings" ON bookings FOR SELECT USING (true);

-- Allow insert for basic operations
CREATE POLICY "Allow insert to bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert to travel_times" ON travel_times FOR INSERT WITH CHECK (true);

-- Insert sample data
INSERT INTO airlines (id, name, iata_code, country) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Sample Airlines', 'SA', 'US')
ON CONFLICT (id) DO NOTHING;

INSERT INTO airports (id, iata_code, name, city, country, lat, lon) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'LAX', 'Los Angeles International Airport', 'Los Angeles', 'US', 33.9416, -118.4085),
('550e8400-e29b-41d4-a716-446655440002', 'JFK', 'John F. Kennedy International Airport', 'New York', 'US', 40.6413, -73.7781)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hotels (id, name, brand, address, city, country, lat, lon, rating, reviews) VALUES 
('550e8400-e29b-41d4-a716-446655440003', 'Hilton LAX Airport', 'Hilton', '5711 W Century Blvd, Los Angeles, CA 90045', 'Los Angeles', 'US', 33.9416, -118.4085, 4.2, 1250),
('550e8400-e29b-41d4-a716-446655440004', 'Marriott JFK Airport', 'Marriott', '148-18 134th St, Jamaica, NY 11430', 'New York', 'US', 40.6413, -73.7781, 4.0, 890)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hotel_rates (hotel_id, nightly, taxes_fees, valid_from, valid_to) VALUES 
('550e8400-e29b-41d4-a716-446655440003', 189.99, 25.50, '2025-01-01', '2025-12-31'),
('550e8400-e29b-41d4-a716-446655440004', 229.99, 30.75, '2025-01-01', '2025-12-31');

INSERT INTO contract_constraints (airline_id, rules, active) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '{"maxCommuteMinutes": 45, "minHotelRating": 3.5, "maxNightlyUsd": 250, "minReviews": 100}', true);

INSERT INTO pairings (id, airline_id, crew_size, legs) VALUES 
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440000', 4, '[{"flight_no": "SA123", "carrier": "SA", "dep_iata": "LAX", "arr_iata": "JFK", "dep_utc": "2025-09-03T10:00:00Z", "arr_utc": "2025-09-03T18:30:00Z", "equipment": "B737"}]');

INSERT INTO travel_times (pairing_id, hotel_id, eta_minutes, distance_km) VALUES 
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440003', 25, 8.5),
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440004', 35, 12.2);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_viable_hotels(UUID) TO anon, authenticated;
