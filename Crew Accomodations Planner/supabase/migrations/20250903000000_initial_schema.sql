-- Initial schema migration - Simplified Crew Accommodations Planner
-- This file contains the streamlined database schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenancy (airline)
CREATE TABLE IF NOT EXISTS public.airlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

-- Pairings (flattened layover context)
CREATE TABLE IF NOT EXISTS public.pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE,
  crew_size INT NOT NULL CHECK (crew_size > 0),
  arr_iata TEXT NOT NULL,
  arr_utc TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional full legs
CREATE TABLE IF NOT EXISTS public.legs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID REFERENCES pairings(id) ON DELETE CASCADE,
  carrier TEXT, 
  flight_no TEXT,
  dep_iata TEXT, 
  arr_iata TEXT,
  dep_utc TIMESTAMPTZ, 
  arr_utc TIMESTAMPTZ,
  equipment TEXT
);

-- Airports
CREATE TABLE IF NOT EXISTS public.airports (
  iata TEXT PRIMARY KEY,
  name TEXT,
  city TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  tz TEXT
);

-- Hotels
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  address TEXT,
  city TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  rating NUMERIC,
  reviews INT,
  active BOOLEAN DEFAULT TRUE
);

-- Hotel rates (date-ranged)
CREATE TABLE IF NOT EXISTS public.hotel_rates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  currency TEXT DEFAULT 'USD',
  nightly NUMERIC NOT NULL,
  taxes_fees NUMERIC,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rates_valid ON public.hotel_rates(hotel_id, valid_from, valid_to);

-- Contract constraints (JSONB rules)
CREATE TABLE IF NOT EXISTS public.contract_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE,
  name TEXT,
  active BOOLEAN DEFAULT TRUE,
  rules JSONB NOT NULL, -- {"maxCommuteMinutes":30,"minHotelRating":3.8,"maxNightlyUsd":210,"preferredBrands":["Hilton","Marriott"],"minReviews":100,"minRestHours":10,"sameHotelForCrew":true}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_constraints_active ON public.contract_constraints(airline_id, active, created_at);

-- Travel times cache (per pairing window)
CREATE TABLE IF NOT EXISTS public.travel_times (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pairing_id UUID REFERENCES pairings(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  airport_iata TEXT REFERENCES airports(iata),
  mode TEXT CHECK (mode IN ('drive','transit','shuttle')) DEFAULT 'drive',
  minutes INT NOT NULL,
  distance_km NUMERIC,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  UNIQUE (pairing_id, hotel_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_travel_pairing ON public.travel_times(pairing_id, hotel_id, mode);

-- Decisions audit
CREATE TABLE IF NOT EXISTS public.decisions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pairing_id UUID REFERENCES pairings(id) ON DELETE CASCADE,
  subject TEXT,
  stage TEXT,
  outcome TEXT CHECK (outcome IN ('accept','reject','score')),
  score NUMERIC,
  reasons TEXT[],
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_pairing ON public.decisions(pairing_id, created_at DESC);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id UUID REFERENCES pairings(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id),
  rate_snapshot JSONB,
  status TEXT CHECK (status IN ('proposed','held','booked','canceled')) DEFAULT 'proposed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_pairing ON public.bookings(pairing_id, status);

-- Preferences (brand weights etc.)
CREATE TABLE IF NOT EXISTS public.preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id UUID REFERENCES airlines(id) ON DELETE CASCADE,
  brand_weights JSONB, -- {"Hilton":5,"Marriott":4}
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC: ranked viable hotels for a pairing
CREATE OR REPLACE FUNCTION public.get_viable_hotels(p_pairing UUID)
RETURNS TABLE (
  hotel_id UUID, 
  name TEXT, 
  brand TEXT, 
  eta_minutes INT, 
  distance_km NUMERIC,
  nightly NUMERIC, 
  rating NUMERIC, 
  score NUMERIC
) LANGUAGE SQL SECURITY DEFINER AS $$
WITH p AS (
  SELECT * FROM pairings WHERE id = p_pairing
), ac AS (
  SELECT rules FROM contract_constraints c
  JOIN p ON p.airline_id = c.airline_id
  WHERE c.active
  ORDER BY c.created_at DESC LIMIT 1
), r AS (
  SELECT DISTINCT ON (hotel_id) hotel_id, nightly
  FROM hotel_rates
  WHERE valid_from <= NOW()::DATE AND valid_to >= NOW()::DATE
  ORDER BY hotel_id, valid_to DESC
)
SELECT h.id, h.name, h.brand,
  tt.minutes AS eta_minutes, tt.distance_km,
  r.nightly, h.rating,
  (100 - COALESCE(tt.minutes,100)) + COALESCE(h.rating,0)*10 - 
  COALESCE(r.nightly,200)/10 +
  CASE WHEN h.brand = ANY(COALESCE((SELECT ARRAY(SELECT jsonb_array_elements_text(rules->'preferredBrands')) FROM ac),'{}')) THEN 5
  ELSE 0 END AS score
FROM hotels h
JOIN p ON p.airline_id = h.airline_id
LEFT JOIN travel_times tt ON tt.pairing_id = p_pairing AND tt.hotel_id = h.id AND tt.mode = 'drive'
LEFT JOIN r ON r.hotel_id = h.id
WHERE h.active
  AND ( (SELECT (rules->>'minHotelRating')::NUMERIC FROM ac) IS NULL OR 
        h.rating >= (SELECT (rules->>'minHotelRating')::NUMERIC FROM ac) )
  AND ( (SELECT (rules->>'minReviews')::INT FROM ac) IS NULL OR 
        h.reviews >= (SELECT (rules->>'minReviews')::INT FROM ac) )
  AND ( (SELECT (rules->>'maxNightlyUsd')::NUMERIC FROM ac) IS NULL OR 
        r.nightly <= (SELECT (rules->>'maxNightlyUsd')::NUMERIC FROM ac) )
  AND ( (SELECT (rules->>'maxCommuteMinutes')::INT FROM ac) IS NULL OR 
        tt.minutes <= (SELECT (rules->>'maxCommuteMinutes')::INT FROM ac) )
ORDER BY score DESC;
$$;
