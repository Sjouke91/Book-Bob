create extension if not exists pgcrypto;

do $$
begin
  create type public.trip_status as enum (
    'pending_approval',
    'approved',
    'change_requested',
    'rejected',
    'cancelled',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.change_request_status as enum (
    'pending',
    'approved',
    'rejected'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.camper_members (
  camper_id uuid not null references public.campers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now(),
  primary key (camper_id, user_id)
);

create table if not exists public.camper_invites (
  camper_id uuid not null references public.campers(id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (camper_id, email)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  camper_id uuid not null references public.campers(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  start_date date not null,
  end_date date not null,
  pickup_time time,
  return_time time,
  destination text not null,
  companions text,
  notes text,
  status public.trip_status not null default 'pending_approval',
  approval_message text,
  review_rating int check (review_rating between 1 and 5),
  review_text text,
  highlights text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_valid_dates check (end_date > start_date)
);

create table if not exists public.trip_change_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  proposed_start_date date not null,
  proposed_end_date date not null,
  proposed_pickup_time time,
  proposed_return_time time,
  proposed_destination text not null,
  proposed_companions text,
  proposed_notes text,
  status public.change_request_status not null default 'pending',
  reviewer_message text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint trip_change_requests_valid_dates check (
    proposed_end_date > proposed_start_date
  )
);

create table if not exists public.trip_approval_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists campers_set_updated_at on public.campers;
create trigger campers_set_updated_at
before update on public.campers
for each row execute function public.set_updated_at();

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
before update on public.trips
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.campers enable row level security;
alter table public.camper_members enable row level security;
alter table public.camper_invites enable row level security;
alter table public.trips enable row level security;
alter table public.trip_change_requests enable row level security;
alter table public.trip_approval_events enable row level security;
alter table public.trip_photos enable row level security;

create or replace function public.is_camper_member(camper uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.camper_members
    where camper_members.camper_id = camper
      and camper_members.user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_member(trip uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips
    where trips.id = trip
      and public.is_camper_member(trips.camper_id)
  );
$$;

drop policy if exists "Profiles are visible to camper members" on public.profiles;
create policy "Profiles are visible to camper members"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.camper_members self_members
    join public.camper_members other_members
      on other_members.camper_id = self_members.camper_id
    where self_members.user_id = auth.uid()
      and other_members.user_id = profiles.id
  )
);

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
on public.profiles
for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Members and invitees can see campers" on public.campers;
create policy "Members and invitees can see campers"
on public.campers
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_camper_member(id)
  or exists (
    select 1
    from public.camper_invites
    where camper_invites.camper_id = campers.id
      and lower(camper_invites.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Users can create campers" on public.campers;
create policy "Users can create campers"
on public.campers
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Members can update campers" on public.campers;
create policy "Members can update campers"
on public.campers
for update
to authenticated
using (public.is_camper_member(id))
with check (public.is_camper_member(id));

drop policy if exists "Members can see camper memberships" on public.camper_members;
create policy "Members can see camper memberships"
on public.camper_members
for select
to authenticated
using (
  public.is_camper_member(camper_id)
  or user_id = auth.uid()
);

drop policy if exists "Creators and invitees can add memberships" on public.camper_members;
create policy "Creators and invitees can add memberships"
on public.camper_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.campers
      where campers.id = camper_members.camper_id
        and campers.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.camper_invites
      where camper_invites.camper_id = camper_members.camper_id
        and lower(camper_invites.email) = lower(auth.jwt() ->> 'email')
    )
  )
);

drop policy if exists "Members and invitees can see invites" on public.camper_invites;
create policy "Members and invitees can see invites"
on public.camper_invites
for select
to authenticated
using (
  public.is_camper_member(camper_id)
  or lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "Members can manage invites" on public.camper_invites;
create policy "Members can manage invites"
on public.camper_invites
for all
to authenticated
using (public.is_camper_member(camper_id))
with check (public.is_camper_member(camper_id));

drop policy if exists "Members can read trips" on public.trips;
create policy "Members can read trips"
on public.trips
for select
to authenticated
using (public.is_camper_member(camper_id));

drop policy if exists "Members can create trips" on public.trips;
create policy "Members can create trips"
on public.trips
for insert
to authenticated
with check (
  public.is_camper_member(camper_id)
  and requested_by = auth.uid()
);

drop policy if exists "Members can update trips" on public.trips;
create policy "Members can update trips"
on public.trips
for update
to authenticated
using (public.is_camper_member(camper_id))
with check (public.is_camper_member(camper_id));

drop policy if exists "Members can read change requests" on public.trip_change_requests;
create policy "Members can read change requests"
on public.trip_change_requests
for select
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "Members can create change requests" on public.trip_change_requests;
create policy "Members can create change requests"
on public.trip_change_requests
for insert
to authenticated
with check (
  public.is_trip_member(trip_id)
  and requested_by = auth.uid()
);

drop policy if exists "Members can update change requests" on public.trip_change_requests;
create policy "Members can update change requests"
on public.trip_change_requests
for update
to authenticated
using (public.is_trip_member(trip_id))
with check (public.is_trip_member(trip_id));

drop policy if exists "Members can read approval events" on public.trip_approval_events;
create policy "Members can read approval events"
on public.trip_approval_events
for select
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "Members can create approval events" on public.trip_approval_events;
create policy "Members can create approval events"
on public.trip_approval_events
for insert
to authenticated
with check (
  public.is_trip_member(trip_id)
  and actor_id = auth.uid()
);

drop policy if exists "Members can read trip photos" on public.trip_photos;
create policy "Members can read trip photos"
on public.trip_photos
for select
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "Members can create trip photos" on public.trip_photos;
create policy "Members can create trip photos"
on public.trip_photos
for insert
to authenticated
with check (
  public.is_trip_member(trip_id)
  and uploaded_by = auth.uid()
);

insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', false)
on conflict (id) do nothing;

drop policy if exists "Members can read stored trip photos" on storage.objects;
create policy "Members can read stored trip photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trip-photos'
  and public.is_trip_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Members can upload stored trip photos" on storage.objects;
create policy "Members can upload stored trip photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trip-photos'
  and public.is_trip_member((storage.foldername(name))[1]::uuid)
);
