alter table public.trips
drop constraint if exists trips_valid_dates;

alter table public.trips
add constraint trips_valid_dates check (end_date > start_date);

alter table public.trip_change_requests
drop constraint if exists trip_change_requests_valid_dates;

alter table public.trip_change_requests
add constraint trip_change_requests_valid_dates check (
  proposed_end_date > proposed_start_date
);
