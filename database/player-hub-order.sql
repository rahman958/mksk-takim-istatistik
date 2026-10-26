begin;
create table if not exists public.club_roster_layout (
 singleton boolean primary key default true check(singleton),
 ids uuid[] not null default '{}', revision bigint not null default 0,
 updated_by uuid, updated_at timestamptz not null default now()
);
insert into public.club_roster_layout(singleton) values(true) on conflict do nothing;
alter table public.club_roster_layout enable row level security;
revoke all on public.club_roster_layout from public,anon,authenticated;
create or replace function public.club_roster_order(p_action text default 'get',p_ids uuid[] default null,p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare layout public.club_roster_layout; expected_count integer;
begin
 if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
 if p_action='get' then
   if not public.is_admin() and not public.player_access_allowed() then raise exception 'Oyuncu erişimi kapalı' using errcode='42501'; end if;
   select * into layout from public.club_roster_layout where singleton;
 elsif p_action='save' then
   if not public.is_club_owner() then raise exception 'Yalnız ana yönetici sıralamayı değiştirebilir'; end if;
   select * into layout from public.club_roster_layout where singleton for update;
   if p_revision is distinct from layout.revision then raise exception 'Sıralama başka bir yönetici tarafından değiştirildi. Yeniden açıp tekrar dene.'; end if;
   if p_ids is null or cardinality(p_ids)<>(select count(distinct id) from unnest(p_ids) id) or array_position(p_ids,null) is not null then raise exception 'Oyuncu listesi geçersiz'; end if;
   select count(*) into expected_count from public.players where archived_at is null;
   if cardinality(p_ids)<>expected_count or exists(select 1 from unnest(p_ids) as chosen(id) where not exists(select 1 from public.players p where p.id=chosen.id and p.archived_at is null)) then raise exception 'Oyuncu listesi değişti. Sıralamayı yeniden aç.'; end if;
   if exists(select 1 from public.players p where p.archived_at is null and upper(p.full_name)='RAHMAN İSMAİL BENEK' and p.id is distinct from p_ids[1]) then raise exception 'Rahman İsmail Benek ilk sırada kalmalı'; end if;
   update public.club_roster_layout set ids=p_ids,revision=revision+1,updated_by=auth.uid(),updated_at=now() where singleton returning * into layout;
 else raise exception 'Geçersiz işlem'; end if;
 return jsonb_build_object('ids',layout.ids,'revision',layout.revision);
end $$;
revoke all on function public.club_roster_order(text,uuid[],bigint) from public,anon;
grant execute on function public.club_roster_order(text,uuid[],bigint) to authenticated;
create or replace function public.club_message_readers(p_batch uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.club_staff_allowed('messages') then raise exception 'Mesaj yetkin kapalı' using errcode='42501'; end if;
 if not exists(select 1 from public.club_message_batches b where b.id=p_batch) then raise exception 'Mesaj bulunamadı'; end if;
 return jsonb_build_object('rows',coalesce((select jsonb_agg(jsonb_build_object('player_id',m.player_id,'name',coalesce(p.full_name,'Silinmiş oyuncu'),'read_at',m.read_at) order by p.full_name,m.player_id) from public.club_admin_messages m left join public.players p on p.id=m.player_id where m.batch_id=p_batch),'[]'::jsonb));
end $$;
revoke all on function public.club_message_readers(uuid) from public,anon;
grant execute on function public.club_message_readers(uuid) to authenticated;
commit;
