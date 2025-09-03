-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Tenancy (airline)
create table if not exists public.airlines (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null
);

-- Pairings (flattened layover context)
create table if not exists public.pairings (
  id uuid primary key default gen_random_uuid(),
  airline_id uuid references airlines(id) on delete cascade,
  crew_size int not null check (crew_size > 0),
  arr_iata text not null,
  arr_utc timestamptz not null,
  created_at timestamptz default now()
);

-- Optional full legs
create table if not exists public.legs (
  id uuid primary key default gen_random_uuid(),
  pairing_id uuid references pairings(id) on delete cascade,
  carrier text,
  flight_no text,
  dep_iata text,
  arr_iata text,
  dep_utc timestamptz,
  arr_utc timestamptz,
  equipment text
);

-- Airports
create table if not exists public.airports (
  iata text primary key,
  name text,
  city text,
  lat double precision,
  lon double precision,
  tz text
);

-- Hotels
create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  airline_id uuid references airlines(id) on delete cascade,
  name text not null,
  brand text,
  address text,
  city text,
  lat double precision,
  lon double precision,
  rating numeric,
  reviews int,
  active boolean default true
);

-- Hotel rates (date-ranged)
create table if not exists public.hotel_rates (
  id bigint generated always as identity primary key,
  hotel_id uuid references hotels(id) on delete cascade,
  currency text default 'USD',
  nightly numeric not null,
  taxes_fees numeric,
  valid_from date not null,
  valid_to date not null
);
create index if not exists idx_rates_valid on public.hotel_rates (hotel_id, valid_from, valid_to);

-- Contract constraints (JSONB rules)
create table if not exists public.contract_constraints (
  id uuid primary key default gen_random_uuid(),
  airline_id uuid references airlines(id) on delete cascade,
  name text,
  active boolean default true,
  rules jsonb not null,  -- example: {"maxCommuteMinutes":30,"minHotelRating":3.8,"maxNightlyUsd":210,"preferredBrands":["Hilton","Marriott"],"minReviews":100,"minRestHours":10,"sameHotelForCrew":true}
  created_at timestamptz default now()
);
create index if not exists idx_constraints_active on public.contract_constraints (airline_id, active, created_at);

-- Travel times cache (per pairing window)
create table if not exists public.travel_times (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id) on delete cascade,
  hotel_id uuid references hotels(id) on delete cascade,
  airport_iata text references airports(iata),
  mode text check (mode in ('drive','transit','shuttle')) default 'drive',
  minutes int not null,
  distance_km numeric,
  window_start timestamptz,
  window_end timestamptz,
  unique (pairing_id, hotel_id, mode)
);
create index if not exists idx_travel_pairing on public.travel_times (pairing_id, hotel_id, mode);

-- Decisions audit
create table if not exists public.decisions (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id) on delete cascade,
  subject text,
  stage text,
  outcome text check (outcome in ('accept','reject','score')),
  score numeric,
  reasons text[],
  details jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_decisions_pairing on public.decisions (pairing_id, created_at desc);

-- Bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  pairing_id uuid references pairings(id) on delete cascade,
  hotel_id uuid references hotels(id),
  rate_snapshot jsonb,
  status text check (status in ('proposed','held','booked','canceled')) default 'proposed',
  created_at timestamptz default now()
);
create index if not exists idx_bookings_pairing on public.bookings (pairing_id, status);

-- Preferences (brand weights etc.)
create table if not exists public.preferences (
  id uuid primary key default gen_random_uuid(),
  airline_id uuid references airlines(id) on delete cascade,
  brand_weights jsonb,
  updated_at timestamptz default now()
);

-- RPC: ranked viable hotels for a pairing
create or replace function public.get_viable_hotels(p_pairing uuid)
returns table (
  hotel_id uuid, name text, brand text, eta_minutes int, distance_km numeric, nightly numeric, rating numeric, score numeric
) language sql security definer as $$
with p as (
  select * from pairings where id = p_pairing
), ac as (
  select rules
  from contract_constraints c
  join p on p.airline_id = c.airline_id
  where c.active
  order by c.created_at desc
  limit 1
), r as (
  select distinct on (hotel_id) hotel_id, nightly
  from hotel_rates
  where valid_from <= now()::date and valid_to >= now()::date
  order by hotel_id, valid_to desc
)
select
  h.id, h.name, h.brand,
  tt.minutes as eta_minutes, tt.distance_km,
  r.nightly, h.rating,
  (100 - coalesce(tt.minutes, 100))
    + coalesce(h.rating, 0) * 10
    - coalesce(r.nightly, 200) / 10
    + case
        when h.brand = any(
          coalesce(
            (select array(select jsonb_array_elements_text(rules->'preferredBrands')) from ac),
            '{}'
          )
        ) then 5 else 0 end as score
from hotels h
join p on p.airline_id = h.airline_id
left join travel_times tt on tt.pairing_id = p_pairing and tt.hotel_id = h.id and tt.mode = 'drive'
left join r on r.hotel_id = h.id
where h.active
  and ( (select (rules->>'minHotelRating')::numeric from ac) is null or h.rating >= (select (rules->>'minHotelRating')::numeric from ac) )
  and ( (select (rules->>'minReviews')::int from ac) is null or h.reviews >= (select (rules->>'minReviews')::int from ac) )
  and ( (select (rules->>'maxNightlyUsd')::numeric from ac) is null or r.nightly <= (select (rules->>'maxNightlyUsd')::numeric from ac) )
  and ( (select (rules->>'maxCommuteMinutes')::int from ac) is null or tt.minutes <= (select (rules->>'maxCommuteMinutes')::int from ac) )
order by score desc;
$$;
