alter table airlines              enable row level security;
alter table pairings              enable row level security;
alter table legs                  enable row level security;
alter table hotels                enable row level security;
alter table hotel_rates           enable row level security;
alter table contract_constraints  enable row level security;
alter table travel_times          enable row level security;
alter table decisions             enable row level security;
alter table bookings              enable row level security;
alter table preferences           enable row level security;

create policy airlines_read on airlines for select using (true);

create policy tenant_read_hotels on hotels for select
  using ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text );
create policy tenant_crud_hotels on hotels for all
  using ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text )
  with check ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text );

create policy tenant_read_pairings on pairings for select
  using ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text );
create policy tenant_crud_pairings on pairings for all
  using ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text )
  with check ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text );

create policy tenant_read_rates on hotel_rates for select
  using ( exists (select 1 from hotels h where h.id = hotel_rates.hotel_id and h.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') );
create policy tenant_crud_rates on hotel_rates for all
  using ( exists (select 1 from hotels h where h.id = hotel_rates.hotel_id and h.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') )
  with check ( exists (select 1 from hotels h where h.id = hotel_rates.hotel_id and h.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') );

create policy tenant_read_constraints on contract_constraints for select
  using ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text );
create policy tenant_crud_constraints on contract_constraints for all
  using ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text )
  with check ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text );

create policy tenant_read_travel on travel_times for select
  using ( exists (select 1 from pairings p where p.id = travel_times.pairing_id and p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') );
create policy tenant_crud_travel on travel_times for all
  using ( exists (select 1 from pairings p where p.id = travel_times.pairing_id and p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') )
  with check ( exists (select 1 from pairings p where p.id = travel_times.pairing_id and p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') );

create policy tenant_read_decisions on decisions for select
  using ( exists (select 1 from pairings p where p.id = decisions.pairing_id and p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') );
create policy tenant_crud_decisions on decisions for all
  using ( exists (select 1 from pairings p where p.id = decisions.pairing_id and p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') )
  with check ( exists (select 1 from pairings p where p.id = decisions.pairing_id and p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') );

create policy tenant_read_bookings on bookings for select
  using ( exists (select 1 from pairings p where p.id = bookings.pairing_id and p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') );
create policy tenant_crud_bookings on bookings for all
  using ( exists (select 1 from pairings p where p.id = bookings.pairing_id and p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') )
  with check ( exists (select 1 from pairings p where p.id = bookings.pairing_id and p.airline_id::text = auth.jwt()->'app_metadata'->>'airline_id') );

create policy tenant_read_preferences on preferences for select
  using ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text );
create policy tenant_crud_preferences on preferences for all
  using ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text )
  with check ( auth.jwt()->'app_metadata'->>'airline_id' = airline_id::text );
