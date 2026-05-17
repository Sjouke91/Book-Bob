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
