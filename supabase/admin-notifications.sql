
create table public.club_admin_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient uuid not null references auth.users(id) on delete cascade,
 kind text not null,
 title text not null,
 detail text not null default '',
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index on public.club_admin_notifications(recipient,created_at desc,id desc);
create index on public.club_admin_notifications(recipient) where read_at is null;
alter table public.club_admin_notifications enable row level security;
revoke all on public.club_admin_notifications from public,anon,authenticated;
grant select,update(read_at) on public.club_admin_notifications to authenticated;
create policy admin_notifications_read on public.club_admin_notifications for select to authenticated
using (recipient=(select auth.uid()) and (select public.is_admin()));
create policy admin_notifications_update on public.club_admin_notifications for update to authenticated
using (recipient=(select auth.uid()) and (select public.is_admin()))
with check (recipient=(select auth.uid()) and (select public.is_admin()));
create function mksk_notification_private.capture_admin() returns trigger
language plpgsql security definer set search_path='' as $$
declare old_row jsonb; category text; subject text; required_area text;
begin
 if tg_op='UPDATE' then old_row:=to_jsonb(old); end if;
 case tg_table_name
 when 'club_staff_tasks' then
   if old_row is not null and (old_row->>'assignee',old_row->>'title',old_row->>'description',old_row->>'due_on',old_row->>'status')
      is not distinct from (new.assignee::text,new.title,new.description,new.due_on::text,new.status::text) then return null; end if;
   if old_row is not null and (old_row->>'status') is distinct from new.status::text and new.status='submitted' then
     insert into public.club_admin_notifications(recipient,kind,title,detail)
     select user_id,'task','Onay bekleyen yönetici görevi',left(new.title,240) from public.club_access_owner;
   elsif old_row is null or (old_row->>'assignee') is distinct from new.assignee::text then
     subject:='Yeni yönetici görevin var';
   elsif new.status='cancelled' then subject:='Görevin iptal edildi';
   elsif new.status='approved' then subject:='Görevin onaylandı';
   elsif new.status='returned' then subject:='Görevin için düzeltme istendi';
   elsif (old_row->>'title',old_row->>'description',old_row->>'due_on') is distinct from (new.title,new.description,new.due_on::text) then
     subject:='Yönetici görevin güncellendi';
   end if;
   if subject is not null then
     insert into public.club_admin_notifications(recipient,kind,title,detail)
     values(new.assignee,'task',subject,left(new.title,240));
   end if;
   return null;
 when 'player_messages' then
   category:='message';subject:='Oyuncudan yeni mesaj var';required_area:='messages';
 when 'player_stat_correction_requests' then
   category:='correction';subject:='Yeni düzeltme talebi var';required_area:='statistics';
 else return null;
 end case;
 insert into public.club_admin_notifications(recipient,kind,title)
 select id,category,subject from (
   select user_id id from public.club_access_owner
   union select user_id from public.club_primary_admins where enabled
   union select sp.user_id from public.club_staff_permissions sp join public.profiles p on p.id=sp.user_id
   where p.role='admin' and sp.enabled and sp.areas->>required_area='true'
 ) recipients;
 return null;
end;
$$;
revoke all on function mksk_notification_private.capture_admin() from public,anon,authenticated;
create trigger admin_notification_task after insert or update on public.club_staff_tasks for each row execute function mksk_notification_private.capture_admin();
create trigger admin_notification_message after insert on public.player_messages for each row execute function mksk_notification_private.capture_admin();
create trigger admin_notification_correction after insert on public.player_stat_correction_requests for each row execute function mksk_notification_private.capture_admin();
