CREATE OR REPLACE FUNCTION public.club_staff_areas()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select array[
    'roster','statistics','training','matches','lineup','penalties',
    'reports','messages','notifications','history','archives','settings',
    'backup','leaves','contacts','visits','preview','links','free_jerseys'
  ]::text[]
$function$
;
CREATE OR REPLACE FUNCTION public.club_staff(p_action text DEFAULT 'context'::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare owner boolean;uid uuid:=auth.uid();target uuid;previous jsonb;updated jsonb;task public.club_staff_tasks;areas jsonb;expected integer;key text;desired text;
begin
if not public.is_admin() then raise exception 'Yönetici yetkisi gerekiyor' using errcode='42501';end if;owner:=public.is_club_owner();
if p_action='permissions' then
 if not owner then raise exception 'Yetkileri yalnız kulüp sahibi değiştirebilir' using errcode='42501';end if;
 target:=(p_data->>'user_id')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(target::text,9));
 if not exists(select 1 from profiles where id=target and role='admin') or public.club_has_full_admin(target) then raise exception 'Yetkisi düzenlenebilir yönetici bulunamadı';end if;
 areas:=p_data->'areas';if jsonb_typeof(areas) is distinct from 'object' then raise exception 'Bölümleri kontrol et';end if;
 for key in select jsonb_object_keys(areas) loop if not key=any(public.club_staff_areas()) or jsonb_typeof(areas->key)<>'boolean' then raise exception 'Bilinmeyen yetki alanı';end if;end loop;
 select to_jsonb(p) into previous from club_staff_permissions p where user_id=target for update;
 if previous is not null and coalesce((p_data->>'version')::integer,0)<>(previous->>'version')::integer then raise exception 'Yetki başka ekranda değişti. Listeyi yenile.';end if;
 if previous is null and coalesce((p_data->>'version')::integer,0)<>0 then raise exception 'Yetki kaydı değişti. Yenile.';end if;
 insert into club_staff_permissions(user_id,enabled,areas,updated_by) values(target,coalesce((p_data->>'enabled')::boolean,false),areas,uid) on conflict(user_id) do update set enabled=excluded.enabled,areas=excluded.areas,version=club_staff_permissions.version+1,updated_at=now(),updated_by=uid returning to_jsonb(club_staff_permissions.*) into updated;
 insert into club_staff_audit(actor,kind,target,before_data,after_data) values(uid,'permissions',target,previous,updated);
 return jsonb_build_object('ok',true);
end if;
if p_action='create_task' then
 if not owner then raise exception 'Görevi yalnız kulüp sahibi verebilir' using errcode='42501';end if;
 target:=(p_data->>'assignee')::uuid;key:=p_data->>'area';
 if not key=any(public.club_staff_areas()) or not exists(select 1 from profiles where id=target and role='admin') then raise exception 'Yönetici ve bölüm seç';end if;
 if not exists(select 1 from club_staff_permissions perm where perm.user_id=target and perm.enabled and coalesce(perm.areas->>key,'false')='true') and not public.club_has_full_admin(target) then raise exception 'Bu yöneticiye önce seçilen bölüm yetkisini aç';end if;
 if length(trim(coalesce(p_data->>'title',''))) not between 1 and 200 or length(coalesce(p_data->>'description',''))>4000 then raise exception 'Görev başlığı ve açıklamasını kontrol et';end if;
 insert into club_staff_tasks(assignee,area,title,description,due_on,created_by) values(target,key,trim(p_data->>'title'),coalesce(p_data->>'description',''),nullif(p_data->>'due_on','')::date,uid) returning * into task;
 insert into club_staff_audit(actor,kind,target,after_data) values(uid,'task_create',task.id,to_jsonb(task));return jsonb_build_object('ok',true);
end if;
if p_action='delete_cancelled' then
 if not owner then raise exception 'Görevi yalnızca ana yönetici silebilir' using errcode='42501';end if;
 select * into task from club_staff_tasks where id=(p_data->>'id')::uuid for update;
 if not found or task.version is distinct from (p_data->>'version')::integer then raise exception 'Görev değişmiş veya bulunamadı. Listeyi yenile.';end if;
 if task.status<>'cancelled' then raise exception 'Yalnızca iptal edilen görevler silinebilir';end if;
 insert into club_staff_audit(actor,kind,target,before_data) values(uid,'task_delete_cancelled',task.id,to_jsonb(task));
 delete from club_staff_tasks where id=task.id;
 return jsonb_build_object('ok',true);
end if;
if p_action in('start','submit','approve','return','cancel') then
 select * into task from club_staff_tasks where id=(p_data->>'id')::uuid for update;
 if not found or task.version<>coalesce((p_data->>'version')::integer,0) then raise exception 'Görev değişmiş veya bulunamadı. Listeyi yenile.';end if;previous:=to_jsonb(task);
 if p_action in('start','submit') then
  if task.assignee<>uid or not public.club_staff_allowed(task.area) then raise exception 'Bu görev veya bölüm için yetkin yok' using errcode='42501';end if;
  if p_action='start' and task.status not in('pending','returned') then raise exception 'Bu görev başlatılamaz';end if;
  if p_action='submit' and task.status not in('pending','working','returned') then raise exception 'Bu görev onaya gönderilemez';end if;
  if p_action='submit' and length(trim(coalesce(p_data->>'note','')))=0 then raise exception 'Yaptığın işlemi kısaca açıkla';end if;
  if length(coalesce(p_data->>'note',''))>4000 then raise exception 'Açıklama çok uzun';end if;
  update club_staff_tasks set status=case when p_action='start' then 'working' else 'submitted' end,completion_note=case when p_action='submit' then p_data->>'note' else completion_note end,version=version+1,updated_at=now() where id=task.id returning to_jsonb(club_staff_tasks.*) into updated;
 else
  if not owner then raise exception 'Görevi yalnız kulüp sahibi onaylayabilir' using errcode='42501';end if;
  if p_action in('approve','return') and task.status<>'submitted' then raise exception 'Görev henüz onay beklemiyor';end if;
  if p_action='cancel' and task.status in('approved','cancelled') then raise exception 'Görev zaten kapanmış';end if;
  if length(coalesce(p_data->>'note',''))>4000 then raise exception 'Not çok uzun';end if;
  update club_staff_tasks set status=case p_action when 'approve' then 'approved' when 'return' then 'returned' else 'cancelled' end,review_note=coalesce(p_data->>'note',''),version=version+1,updated_at=now() where id=task.id returning to_jsonb(club_staff_tasks.*) into updated;
 end if;
 insert into club_staff_audit(actor,kind,target,before_data,after_data) values(uid,'task_'||p_action,task.id,previous,updated);return jsonb_build_object('ok',true);
end if;
if p_action not in('context','list') then raise exception 'Bilinmeyen işlem';end if;
return jsonb_build_object('owner',owner,'user_id',uid,'enabled',owner or coalesce((select enabled from club_staff_permissions where user_id=uid),false),'areas',(select jsonb_object_agg(a,public.club_staff_allowed(a)) from unnest(public.club_staff_areas()) a),'admins',case when owner then coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'player_id',p.player_id,'name',coalesce(pl.full_name,'Bağlı oyuncusu olmayan yönetici'),'owner',public.club_has_full_admin(p.id),'enabled',coalesce(x.enabled,false),'areas',coalesce(x.areas,'{}'::jsonb),'version',coalesce(x.version,0)) order by pl.full_name) from profiles p left join players pl on pl.id=p.player_id left join club_staff_permissions x on x.user_id=p.id where p.role='admin' and pl.archived_at is null),'[]'::jsonb) else '[]'::jsonb end,'tasks',case when p_action='list' then coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('assignee_name',coalesce(pl.full_name,'Yönetici')) order by t.updated_at desc) from (select * from club_staff_tasks where owner or assignee=uid order by updated_at desc limit 300) t join profiles pr on pr.id=t.assignee left join players pl on pl.id=pr.player_id),'[]'::jsonb) else '[]'::jsonb end,'pending', (select count(*) from club_staff_tasks where case when owner then status='submitted' else assignee=uid and status in('pending','working','returned') end));
end$function$
;
CREATE FUNCTION public.club_free_jerseys()
RETURNS integer[]
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.club_staff_allowed('free_jerseys') OR public.club_staff_allowed('roster')) THEN
    RAISE EXCEPTION 'Boş forma numaralarını görme yetkin yok' USING ERRCODE = '42501';
  END IF;
  RETURN ARRAY(
    SELECT n FROM pg_catalog.generate_series(1,99) AS n
    WHERE NOT EXISTS (
      SELECT 1 FROM public.players p WHERE p.jersey_number=n AND p.archived_at IS NULL
        AND NOT coalesce(p.access_disabled,false) AND p.team_left_on IS NULL
    ) ORDER BY n
  );
END;
$$;
REVOKE ALL ON FUNCTION public.club_free_jerseys() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_free_jerseys() TO authenticated;