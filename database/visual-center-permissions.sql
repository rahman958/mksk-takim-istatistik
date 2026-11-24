
create or replace function public.club_staff_areas() returns text[] language sql immutable set search_path=public,pg_temp as $$
select array['roster','statistics','training','matches','lineup','penalties','reports','messages','notifications','history','archives','settings','backup','leaves','contacts','visits','preview','links','free_jerseys','analytics','live_match','tactics','visual_center','visual_match','visual_player','visual_monthly','visual_leaders','visual_roster','visual_transfer','visual_export']::text[]
$$;
create or replace function public.club_visual_data(p_kind text,p_season text,p_export boolean default false) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare area text;result jsonb;players_data jsonb;games_data jsonb;
begin
 area:=case p_kind when 'match' then 'visual_match' when 'player' then 'visual_player' when 'monthly' then 'visual_monthly' when 'leaders' then 'visual_leaders' when 'roster' then 'visual_roster' when 'transfer' then 'visual_transfer' end;
 if area is null or not public.club_staff_allowed('visual_center') or not public.club_staff_allowed(area) then raise exception 'Bu görsel için yetkin bulunmuyor' using errcode='42501';end if;
 if p_export and not public.club_staff_allowed('visual_export') then raise exception 'Görsel indirme ve paylaşma yetkin kapalı' using errcode='42501';end if;
 if p_kind='monthly' and not public.club_staff_allowed('analytics') then raise exception 'Aylık rapor görseli için Genel Rapor yetkisi gerekiyor' using errcode='42501';end if;
 if p_season is null or length(p_season)>30 then raise exception 'Sezon seç';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'jersey_number',p.jersey_number,'position',p.position,'management_role',p.management_role,
 'stats',case when p_kind in ('player','leaders','roster') then jsonb_build_object('matches',coalesce(s.matches,0),'goals',coalesce(s.goals,0),'assists',coalesce(s.assists,0),'man_of_match',coalesce(s.man_of_match,0),'goals_conceded',coalesce(s.goals_conceded,0)) else '{}'::jsonb end) order by case when p.full_name ilike 'Rahman İsmail Benek' then 0 else 1 end,p.full_name),'[]'::jsonb)
 into players_data from public.players p left join public.player_season_stats s on s.player_id=p.id and s.season=p_season where p.archived_at is null and p.team_left_on is null;
 if p_kind in ('match','monthly') then
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'match_date',m.match_date,'match_time',m.match_time,'opponent',m.opponent,'our_score',m.our_score,'opponent_score',m.opponent_score,'player_entries',case when p_kind='match' then m.player_entries else '[]'::jsonb end) order by m.match_date desc,m.created_at desc),'[]'::jsonb)
  into games_data from public.club_match_entries m where m.season=p_season and m.cancelled_at is null;
 else games_data:='[]'::jsonb;end if;
 return jsonb_build_object('players',players_data,'games',games_data,'season',p_season);
end $$;
revoke all on function public.club_visual_data(text,text,boolean) from public,anon;
grant execute on function public.club_visual_data(text,text,boolean) to authenticated;
create or replace function public.club_tactics_data(p_season text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.club_staff_allowed('tactics') then raise exception 'Taktik tahtası yetkin kapalı' using errcode='42501';end if;
 return jsonb_build_object('players',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'jersey_number',p.jersey_number,'position',p.position) order by p.full_name),'[]'::jsonb) from public.players p where p.archived_at is null and p.team_left_on is null),
 'lineup',(select jsonb_build_object('id',l.id,'season',l.season,'title',l.title,'size',l.size,'positions',l.positions,'bench',l.bench,'player_tasks','{}'::jsonb,'opponent',l.opponent,'match_date',l.match_date,'match_time',l.match_time,'venue',l.venue) from public.match_lineups l where l.season=p_season order by l.updated_at desc limit 1));
end $$;
revoke all on function public.club_tactics_data(text) from public,anon;
grant execute on function public.club_tactics_data(text) to authenticated;


with targets as(select x.user_id,to_jsonb(x) as before_data from public.club_staff_permissions x join public.profiles p on p.id=x.user_id where p.role='admin' and x.enabled),
updated as(update public.club_staff_permissions x set areas=x.areas||'{"tactics":true,"visual_center":true,"visual_match":true,"visual_player":true,"visual_monthly":true,"visual_leaders":true,"visual_roster":true,"visual_transfer":true,"visual_export":true}'::jsonb,version=x.version+1,updated_at=now(),updated_by=(select p.id from public.profiles p where public.club_has_full_admin(p.id) order by p.id limit 1) from targets t where x.user_id=t.user_id returning x.user_id,to_jsonb(x) as after_data,t.before_data)
insert into public.club_staff_audit(actor,kind,target,before_data,after_data)
select (select p.id from public.profiles p where public.club_has_full_admin(p.id) order by p.id limit 1),'permissions',user_id,before_data,after_data from updated;
