
create table public.club_live_match_notes(
 id uuid primary key default gen_random_uuid(),
 state jsonb not null check(jsonb_typeof(state)='object' and octet_length(state::text)<300000),
 revision integer not null default 1 check(revision>0),
 created_by uuid not null default auth.uid() references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.club_live_match_notes enable row level security;
create policy live_notes_read on public.club_live_match_notes for select to authenticated using(public.is_admin());
create policy live_notes_insert on public.club_live_match_notes for insert to authenticated with check(public.is_admin() and created_by=auth.uid() and revision=1);
create policy live_notes_update on public.club_live_match_notes for update to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,update on public.club_live_match_notes to authenticated;
revoke all on public.club_live_match_notes from anon;
create or replace function public.club_live_match_players() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not coalesce(public.is_admin(),false) then raise exception 'Yönetici girişi gerekli' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',full_name,'number',jersey_number,'position',position) order by full_name),'[]'::jsonb) from public.players where archived_at is null and team_left_on is null and not access_disabled);
end;$$;
revoke all on function public.club_live_match_players() from public,anon;
grant execute on function public.club_live_match_players() to authenticated;
