-- Seed data for local development - Simplified schema

-- Insert sample airline
INSERT INTO airlines (id, code, name) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'SA', 'Sample Airlines');

-- Insert sample airports
INSERT INTO airports (iata, name, city, lat, lon, tz) VALUES 
('JFK', 'John F. Kennedy International Airport', 'New York', 40.6413, -73.7781, 'America/New_York'),
('LAX', 'Los Angeles International Airport', 'Los Angeles', 33.9416, -118.4085, 'America/Los_Angeles'),
('ORD', 'O''Hare International Airport', 'Chicago', 41.9786, -87.9048, 'America/Chicago'),
('DFW', 'Dallas/Fort Worth International Airport', 'Dallas', 32.8968, -97.0380, 'America/Chicago');

-- Insert sample hotels
INSERT INTO hotels (id, airline_id, name, brand, address, city, lat, lon, rating, reviews, active) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Hilton JFK Airport', 'Hilton', '144-02 135th Ave, Jamaica, NY 11436', 'New York', 40.6413, -73.7781, 4.2, 1250, true),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Marriott LAX', 'Marriott', '5855 W Century Blvd, Los Angeles, CA 90045', 'Los Angeles', 33.9416, -118.4085, 4.1, 980, true),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Hyatt O''Hare', 'Hyatt', '6550 N Mannheim Rd, Rosemont, IL 60018', 'Chicago', 41.9786, -87.9048, 4.3, 1100, true),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Sheraton DFW', 'Sheraton', '4440 W John Carpenter Fwy, Irving, TX 75063', 'Dallas', 32.8968, -97.0380, 4.0, 850, true);

-- Insert sample hotel rates
INSERT INTO hotel_rates (hotel_id, nightly, taxes_fees, valid_from, valid_to) VALUES 
('550e8400-e29b-41d4-a716-446655440010', 189.00, 25.00, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440011', 165.00, 22.00, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440012', 145.00, 18.00, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440013', 155.00, 20.00, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '30 days');

-- Insert sample contract constraints
INSERT INTO contract_constraints (id, airline_id, name, rules, active) VALUES 
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', 'Standard Crew Contract', 
'{"maxCommuteMinutes": 45, "minHotelRating": 3.5, "maxNightlyUsd": 200, "preferredBrands": ["Hilton", "Marriott", "Hyatt"], "minReviews": 500, "minRestHours": 8, "sameHotelForCrew": true}', 
true);
