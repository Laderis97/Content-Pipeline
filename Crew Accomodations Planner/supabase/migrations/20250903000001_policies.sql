-- RLS Policies migration - Simplified schema
-- This file contains all the Row Level Security policies for multi-tenant data isolation

-- Enable RLS on all tables
ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

-- Airlines: read all rows for now (admin_seed only). Tighten later if needed.
CREATE POLICY airlines_read ON airlines FOR SELECT USING (true);

-- Helper predicate - Using airline_id tenant matching across tables
CREATE POLICY tenant_read_hotels ON hotels FOR SELECT
USING ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text );

CREATE POLICY tenant_crud_hotels ON hotels FOR ALL
USING ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text )
WITH CHECK ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text );

-- Repeat same pattern for pairings, hotel_rates, constraints, travel_times, decisions, bookings, preferences
CREATE POLICY tenant_read_pairings ON pairings FOR SELECT USING (
  auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text 
);

CREATE POLICY tenant_crud_pairings ON pairings FOR ALL USING (
  auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text 
) WITH CHECK (
  auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text 
);

CREATE POLICY tenant_read_rates ON hotel_rates FOR SELECT USING (
  EXISTS (SELECT 1 FROM hotels h WHERE h.id = hotel_rates.hotel_id
  AND h.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
);

CREATE POLICY tenant_crud_rates ON hotel_rates FOR ALL USING (
  EXISTS (SELECT 1 FROM hotels h WHERE h.id = hotel_rates.hotel_id
  AND h.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
) WITH CHECK (
  EXISTS (SELECT 1 FROM hotels h WHERE h.id = hotel_rates.hotel_id
  AND h.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
);

CREATE POLICY tenant_read_constraints ON contract_constraints FOR SELECT USING (
  auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text 
);

CREATE POLICY tenant_crud_constraints ON contract_constraints FOR ALL USING (
  auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text 
) WITH CHECK (
  auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text 
);

CREATE POLICY tenant_read_travel ON travel_times FOR SELECT USING (
  EXISTS (SELECT 1 FROM pairings p WHERE p.id = travel_times.pairing_id 
  AND p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
);

CREATE POLICY tenant_crud_travel ON travel_times FOR ALL USING (
  EXISTS (SELECT 1 FROM pairings p WHERE p.id = travel_times.pairing_id 
  AND p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
) WITH CHECK (
  EXISTS (SELECT 1 FROM pairings p WHERE p.id = travel_times.pairing_id 
  AND p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
);

CREATE POLICY tenant_read_decisions ON decisions FOR SELECT USING (
  EXISTS (SELECT 1 FROM pairings p WHERE p.id = decisions.pairing_id
  AND p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
);

CREATE POLICY tenant_crud_decisions ON decisions FOR ALL USING (
  EXISTS (SELECT 1 FROM pairings p WHERE p.id = decisions.pairing_id
  AND p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
) WITH CHECK (
  EXISTS (SELECT 1 FROM pairings p WHERE p.id = decisions.pairing_id
  AND p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
);

CREATE POLICY tenant_read_bookings ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM pairings p WHERE p.id = bookings.pairing_id
  AND p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
);

CREATE POLICY tenant_crud_bookings ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM pairings p WHERE p.id = bookings.pairing_id
  AND p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
) WITH CHECK (
  EXISTS (SELECT 1 FROM pairings p WHERE p.id = bookings.pairing_id
  AND p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id')
);

CREATE POLICY tenant_read_preferences ON preferences FOR SELECT USING (
  auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text 
);

CREATE POLICY tenant_crud_preferences ON preferences FOR ALL USING (
  auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text 
) WITH CHECK (
  auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text 
);
