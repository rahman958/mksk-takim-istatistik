CREATE OR REPLACE FUNCTION public.club_visual_data(p_kind text, p_season text, p_export boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare area text;result jsonb;players_data jsonb;games_data jsonb;totals jsonb;
begin
 area:=case p_kind when 'match' then 'visual_match' when 'player' then 'visual_player' when 'monthly' then 'visual_monthly' when 'leaders' then 'visual_leaders' when 'roster' then 'visual_roster' when 'transfer' then 'visual_transfer' end;
 if area is null or not public.club_staff_allowed('visual_center') or not public.club_staff_allowed(area) then raise exception 'Bu görsel için yetkin bulunmuyor' using errcode='42501';end if;
 if p_export and not public.club_staff_allowed('visual_export') then raise exception 'Görsel indirme ve paylaşma yetkin kapalı' using errcode='42501';end if;
 if p_kind='monthly' and not public.club_staff_allowed('analytics') then raise exception 'Aylık rapor görseli için Genel Rapor yetkisi gerekiyor' using errcode='42501';end if;
 if p_season is null or length(p_season)>30 then raise exception 'Sezon seç';end if;
 if p_kind in ('monthly','player') then totals:=public.club_dashboard_totals(p_season);end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'jersey_number',p.jersey_number,'position',p.position,'management_role',p.management_role,
 'stats',case when p_kind in ('player','leaders','roster') then jsonb_build_object('matches',coalesce(s.matches,0),'goals',coalesce(s.goals,0),'assists',coalesce(s.assists,0),'man_of_match',coalesce(s.man_of_match,0),'goals_conceded',coalesce(s.goals_conceded,0),'success',totals->'players'->p.id::text->'percent') else '{}'::jsonb end,'form',case when p_kind='player' then (select coalesce(jsonb_agg(jsonb_build_object('date',z.match_date,'points',z.points) order by z.match_date),'[]'::jsonb) from (select m.match_date,(e->>'points')::numeric as points from public.club_match_entries m cross join lateral jsonb_array_elements(m.player_entries) e where m.season=p_season and m.cancelled_at is null and e->>'player_id'=p.id::text and (e->>'points') is not null order by m.match_date desc,m.created_at desc limit 5) z) else '[]'::jsonb end) order by case when p.full_name ilike 'Rahman İsmail Benek' then 0 else 1 end,p.full_name),'[]'::jsonb)
 into players_data from public.players p left join public.player_season_stats s on s.player_id=p.id and s.season=p_season where p.archived_at is null and p.team_left_on is null;
 if p_kind in ('match','monthly') then
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'match_date',m.match_date,'match_time',m.match_time,'opponent',m.opponent,'our_score',m.our_score,'opponent_score',m.opponent_score,'player_entries',case when p_kind='match' then m.player_entries else '[]'::jsonb end) order by m.match_date desc,m.created_at desc),'[]'::jsonb)
  into games_data from public.club_match_entries m where m.season=p_season and m.cancelled_at is null;
 else games_data:='[]'::jsonb;end if;
 return jsonb_build_object('players',players_data,'games',games_data,'season',p_season,'overview',case when p_kind='monthly' then totals-'players' else null end);
end $function$
;
