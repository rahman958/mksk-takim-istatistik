create or replace function public.club_season_overview(p_season text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not (public.is_admin() or (public.player_access_allowed() and exists(select 1 from public.profiles where id=auth.uid() and player_id is not null))) then raise exception 'Oyuncu erişimi gerekli' using errcode='42501'; end if;
 if p_season is null or p_season !~ '^[0-9]{4}-[0-9]{4}$' then raise exception 'Sezon geçersiz'; end if;
 with records as (
 select e->>'player_id' as pid,m.match_date,m.created_at,m.id,
 case when (e->>'points')::numeric between 0 and 10 then (e->>'points')::numeric else null end as points
 from public.club_match_entries m cross join lateral jsonb_array_elements(m.player_entries) e
 where m.season=p_season and m.cancelled_at is null
 ), ranked as(select *,row_number() over(partition by pid order by match_date desc,created_at desc,id desc) rn from records),
 forms as(select pid,jsonb_agg(jsonb_build_object('date',match_date,'points',points) order by match_date,created_at,id) as form from ranked where rn<=5 group by pid),
 rows as (
 select p.id,p.full_name,p.jersey_number,p.position,
 coalesce(s.matches,0) matches,coalesce(s.goals,0) goals,coalesce(s.assists,0) assists,coalesce(s.goals_conceded,0) goals_conceded,
 coalesce(s.man_of_match,0) man_of_match,coalesce(s.discipline_referrals,0) discipline_referrals,coalesce(s.attendance_matches,0) attendance_matches,
 s.manager_rating,coalesce(f.form,'[]'::jsonb) as form
 from public.players p left join public.player_season_stats s on s.player_id=p.id and s.season=p_season
 left join forms f on f.pid=p.id::text where p.archived_at is null
 )
 select jsonb_build_object('season',p_season,'team_matches',coalesce((select matches from public.club_season_summary where season=p_season),0),'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.full_name,r.id) from rows r),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.club_season_overview(text) from public,anon;
grant execute on function public.club_season_overview(text) to authenticated;