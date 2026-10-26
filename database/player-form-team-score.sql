CREATE OR REPLACE FUNCTION public.club_player_form(p_player uuid, p_season text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare result jsonb; total integer;
begin
 if not(public.is_admin() or (public.player_access_allowed() and exists(select 1 from public.profiles where id=auth.uid() and role='player' and player_id=p_player))) then raise exception 'Bu oyuncunun maç detaylarına erişim iznin yok.';end if;
 select matches into total from public.player_season_stats where player_id=p_player and season=p_season;
 with records as (
 select 'entry:'||m.id::text as key,m.match_date,m.opponent,m.our_score,m.opponent_score,
 case when (e->>'points')::numeric between 0 and 10 then (e->>'points')::numeric else null end as points,
 (e->>'goals')::integer as goals,(e->>'assists')::integer as assists,(e->>'goals_conceded')::integer as goals_conceded,m.created_at,'Toplu maç girişi'::text as source
 from public.club_match_entries m cross join lateral jsonb_array_elements(m.player_entries) e
 where m.season=p_season and m.cancelled_at is null and e->>'player_id'=p_player::text
 ),recent as(select * from records order by match_date desc,created_at desc,key desc limit 5)
 select jsonb_build_object('total_matches',coalesce(total,0),'recorded_matches',(select count(*) from records),'items',coalesce((select jsonb_agg(to_jsonb(r) order by match_date,created_at,key) from recent r),'[]'::jsonb)) into result;
 return result;
end $function$
