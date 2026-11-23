CREATE OR REPLACE FUNCTION public.club_staff_areas()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
select array['roster','statistics','training','matches','lineup','penalties','reports','messages','notifications','history','archives','settings','backup','leaves','contacts','visits','preview','links','free_jerseys','analytics','live_match']::text[]
$function$
;
CREATE OR REPLACE FUNCTION public.club_live_match_players()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not coalesce(public.club_staff_allowed('live_match'),false) then raise exception 'Yönetici girişi gerekli' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',full_name,'number',jersey_number,'position',position) order by full_name),'[]'::jsonb) from public.players where archived_at is null and team_left_on is null and not access_disabled);
end;$function$
;
alter policy live_notes_read on public.club_live_match_notes using(public.club_staff_allowed('live_match'));
alter policy live_notes_insert on public.club_live_match_notes with check(public.club_staff_allowed('live_match') and created_by=auth.uid() and revision=1);
alter policy live_notes_update on public.club_live_match_notes using(public.club_staff_allowed('live_match')) with check(public.club_staff_allowed('live_match'));
update public.club_staff_permissions perm set areas=coalesce(perm.areas,'{}'::jsonb)||jsonb_build_object('live_match',true),version=version+1,updated_at=now()
where exists(select 1 from public.profiles pr where pr.id=perm.user_id and pr.role='admin');
