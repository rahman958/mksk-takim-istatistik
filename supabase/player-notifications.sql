
create schema if not exists mksk_notification_private;
revoke all on schema mksk_notification_private from public;
create table public.club_player_notifications (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.players(id) on delete cascade,
 kind text not null,
 title text not null,
 detail text not null default '',
 created_at timestamptz not null default now(),
 read_at timestamptz,
 source_id uuid
);
create index on public.club_player_notifications(player_id, created_at desc, id desc);
alter table public.club_player_notifications enable row level security;
revoke all on public.club_player_notifications from public, anon, authenticated;
grant select, update(read_at) on public.club_player_notifications to authenticated;
create policy player_notifications_read on public.club_player_notifications for select to authenticated
using (player_id in (select player_id from public.profiles where id=(select auth.uid())) and (select public.player_access_allowed()));
create policy player_notifications_update on public.club_player_notifications for update to authenticated
using (player_id in (select player_id from public.profiles where id=(select auth.uid())) and (select public.player_access_allowed()))
with check (player_id in (select player_id from public.profiles where id=(select auth.uid())) and (select public.player_access_allowed()));

create function mksk_notification_private.capture() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
 a jsonb := case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 b jsonb := case when tg_op='DELETE' then '{}'::jsonb else to_jsonb(new) end;
 pid uuid; subject text; detail_text text; category text; item jsonb; prior jsonb; row_data record;
begin
 case tg_table_name
 when 'players' then
   pid := new.id;
   category := 'profile';
   subject := 'Oyuncu bilgilerin güncellendi';
   select string_agg(v.label || ' → ' || coalesce(b->>v.key,'—'), ' · ' order by v.key) into detail_text
   from (values ('jersey_number','Forma numarası'),('position','Mevki'),('management_role','Görev / unvan')) v(key,label)
   where a->v.key is distinct from b->v.key;
 when 'player_season_stats' then
   pid := new.player_id;
   category := 'stats';
   subject := 'Sezon istatistiklerin güncellendi';
   if current_setting('mksk.match_notification',true) = txid_current()::text then return null; end if;
   select string_agg(v.label || ' ' || coalesce(a->>v.key,'0') || ' → ' || coalesce(b->>v.key,'0'), ' · ' order by v.key) into detail_text
   from (values ('matches','Maç'),('goals','Gol'),('assists','Asist'),('goals_conceded','Yediğin gol'),('man_of_match','Maçın adamı'),('attendance_matches','Antrenman'),('attendance_goals','Antrenman golü'),('attendance_points','Antrenman puanı')) v(key,label)
   where coalesce(a->>v.key,'0') <> coalesce(b->>v.key,'0');
 when 'club_match_entries' then
   perform set_config('mksk.match_notification',txid_current()::text,true);
   for row_data in
     select coalesce(x.value->>'player_id',y.value->>'player_id') player_key, x.value after_entry,y.value before_entry
     from jsonb_array_elements(coalesce(b->'player_entries','[]')) x
     full join jsonb_array_elements(coalesce(a->'player_entries','[]')) y on x.value->>'player_id'=y.value->>'player_id'
   loop
     if row_data.after_entry is not distinct from row_data.before_entry and a->'cancelled_at' is not distinct from b->'cancelled_at' then continue; end if;
     insert into public.club_player_notifications(player_id,kind,title,detail)
     select p.id,'stats',case when new.cancelled_at is not null or row_data.after_entry is null then 'Maç kaydın geri alındı' else 'Maç performansın güncellendi' end,
       new.opponent || ' · ' || to_char(new.match_date,'DD.MM.YYYY') ||
       case when new.cancelled_at is not null or row_data.after_entry is null then '' else concat(
       ' · Gol: ',row_data.after_entry->>'goals',' · Asist: ',row_data.after_entry->>'assists',
       ' · Maç puanı: ',coalesce(row_data.before_entry->>'points' || ' → ',''),coalesce(row_data.after_entry->>'points','—'),
       case when row_data.after_entry->>'man_of_match'='1' then ' · Maçın adamı' else '' end) end
     from public.players p where p.id::text=row_data.player_key and p.archived_at is null and p.team_left_on is null and not p.access_disabled;
   end loop;
   return null;
 when 'club_lineup_publications' then
   select snapshot into prior from public.club_lineup_publications
   where season=new.season and id<>new.id and (lineup_id=new.lineup_id or snapshot->>'match_date'=new.snapshot->>'match_date')
   order by published_at desc, revision desc limit 1;
   for row_data in
     select coalesce(x.value->>'player_id',y.value->>'player_id') player_key,
       x.value after_entry,y.value before_entry
     from jsonb_array_elements(coalesce(new.snapshot->'positions','[]') || coalesce(new.snapshot->'bench','[]')) x
     full join jsonb_array_elements(coalesce(prior->'positions','[]') || coalesce(prior->'bench','[]')) y on x.value->>'player_id'=y.value->>'player_id'
   loop
     if row_data.after_entry is not distinct from row_data.before_entry and
        (new.snapshot->'match_date',new.snapshot->'match_time',new.snapshot->'venue',new.snapshot->'opponent') is not distinct from
        (prior->'match_date',prior->'match_time',prior->'venue',prior->'opponent') then continue; end if;
     insert into public.club_player_notifications(player_id,kind,title,detail)
     select p.id,'lineup',case when row_data.after_entry is null then 'Maç kadrosundan çıkarıldın'
       when row_data.after_entry->>'role'='YEDEK' then 'Yedek kadrodasın' else 'İlk kadrodasın' end,
       concat_ws(' · ',new.snapshot->>'opponent',new.snapshot->>'match_date',left(new.snapshot->>'match_time',5),new.snapshot->>'venue',
       case when row_data.after_entry->>'task' is distinct from row_data.before_entry->>'task' and row_data.after_entry is not null then 'Kadro görevin güncellendi' end)
     from public.players p where p.id::text=row_data.player_key and p.archived_at is null and p.team_left_on is null and not p.access_disabled;
   end loop;
   return null;
 when 'club_leave_periods' then
   if b->>'person_kind'='player' and (a->'starts_on',a->'ends_on',a->'enabled') is distinct from (b->'starts_on',b->'ends_on',b->'enabled') then
     insert into public.club_player_notifications(player_id,kind,title,detail)
     select p.id,'profile',case when new.enabled then 'İzin durumun güncellendi' else 'İzin kaydın kapatıldı' end,
       to_char(new.starts_on,'DD.MM.YYYY') || ' – ' || to_char(new.ends_on,'DD.MM.YYYY')
     from public.players p where lower(trim(p.full_name))=lower(trim(new.person_name)) and p.archived_at is null and p.team_left_on is null and not p.access_disabled
       and (select count(*) from public.players q where lower(trim(q.full_name))=lower(trim(new.person_name)) and q.archived_at is null and q.team_left_on is null)=1;
   end if;
   return null;
 when 'club_admin_messages' then
   if tg_op='UPDATE' then
     if new.deleted_at is not null then delete from public.club_player_notifications where kind='message' and source_id=new.id; end if;
     return null;
   end if;
   pid:=new.player_id; category:='message'; subject:='Yönetimden yeni mesajın var'; detail_text:='Mesajlarım bölümünde açabilirsin.';
 when 'club_staff_tasks' then
   if new.status in ('cancelled','canceled') then return null; end if;
   if (a->'title',a->'assignee',a->'due_on') is not distinct from (b->'title',b->'assignee',b->'due_on') then return null; end if;
   select player_id into pid from public.profiles where id=new.assignee;
   category:='profile'; subject:='Görevin güncellendi'; detail_text:=left(new.title,240);
 when 'announcements' then
   if tg_op='UPDATE' and (new.title,new.body) is not distinct from (old.title,old.body) then return null; end if;
   insert into public.club_player_notifications(player_id,kind,title,detail)
   select p.id,'announcement','Takım duyurusu',left(new.title,240) from public.players p
   where p.archived_at is null and p.team_left_on is null and not p.access_disabled;
   return null;
 else return null;
 end case;
 if detail_text is not null then
   insert into public.club_player_notifications(player_id,kind,title,detail,source_id)
   select p.id,category,subject,detail_text,case when category='message' then (b->>'id')::uuid end
   from public.players p where p.id=pid and p.archived_at is null and p.team_left_on is null and not p.access_disabled;
 end if;
 return null;
end;
$$;
revoke all on function mksk_notification_private.capture() from public, anon, authenticated;
create trigger player_notifications_profile after update on public.players for each row execute function mksk_notification_private.capture();
create constraint trigger player_notifications_stats after insert or update on public.player_season_stats deferrable initially deferred for each row execute function mksk_notification_private.capture();
create trigger player_notifications_match after insert or update on public.club_match_entries for each row execute function mksk_notification_private.capture();
create trigger player_notifications_lineup after insert on public.club_lineup_publications for each row execute function mksk_notification_private.capture();
create trigger player_notifications_leave after insert or update on public.club_leave_periods for each row execute function mksk_notification_private.capture();
create trigger player_notifications_message after insert or update of deleted_at on public.club_admin_messages for each row execute function mksk_notification_private.capture();
create trigger player_notifications_announcement after insert or update on public.announcements for each row execute function mksk_notification_private.capture();

create trigger player_notifications_task after insert or update on public.club_staff_tasks for each row execute function mksk_notification_private.capture();