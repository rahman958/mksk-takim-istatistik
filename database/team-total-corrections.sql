alter table public.club_season_summary add column if not exists wins_adjustment integer not null default 0,add column if not exists draws_adjustment integer not null default 0,add column if not exists losses_adjustment integer not null default 0;
CREATE OR REPLACE FUNCTION public.club_dashboard_totals(p_season text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_admin boolean;v_player uuid;v_summary public.club_season_summary%rowtype;v_w integer;v_d integer;v_l integer;v_g bigint;v_c bigint;v_rates jsonb;
begin
if auth.uid() is null then raise exception 'Oturum gerekli';end if;
v_admin:=public.is_admin();
if not v_admin then
 if not public.player_access_allowed() then raise exception 'Erişim kapalı';end if;
 select player_id into v_player from public.profiles where id=auth.uid();
 if v_player is null then raise exception 'Oyuncu hesabı gerekli';end if;
end if;
select * into v_summary from public.club_season_summary where season=p_season;
select coalesce(sum((our_score>opponent_score)::int),0),coalesce(sum((our_score=opponent_score)::int),0),coalesce(sum((our_score<opponent_score)::int),0) into v_w,v_d,v_l from public.club_match_entries where season=p_season and cancelled_at is null and count_team_match;
v_w:=greatest(0,v_w+coalesce(v_summary.historical_wins,0)+coalesce(v_summary.wins_adjustment,0));v_d:=greatest(0,v_d+coalesce(v_summary.historical_draws,0)+coalesce(v_summary.draws_adjustment,0));v_l:=greatest(0,v_l+coalesce(v_summary.historical_losses,0)+coalesce(v_summary.losses_adjustment,0));
select coalesce(sum(goals),0),coalesce(sum(goals_conceded),0) into v_g,v_c from public.player_season_stats where season=p_season;
select coalesce(jsonb_object_agg(s.player_id::text,jsonb_build_object('percent',case when p.rated>0 then round(p.grade_sum*10/p.rated,1) else null end,'rated_points',p.grade_sum,'rated_matches',p.rated,'pending_matches',p.pending,'legacy_matches',greatest(0,s.matches-p.rated-p.pending),'manager_rating',s.manager_rating,'manager_percent',s.manager_rating*10)),'{}'::jsonb) into v_rates
from public.player_season_stats s left join lateral (
select count(*) filter(where (e->>'points') is not null)::int as rated,count(*) filter(where (e->>'points') is null)::int as pending,coalesce(sum((e->>'points')::numeric) filter(where (e->>'points') is not null),0) as grade_sum
from public.club_match_entries m cross join lateral jsonb_array_elements(m.player_entries) e where m.season=s.season and m.cancelled_at is null and e->>'player_id'=s.player_id::text
) p on true where s.season=p_season and (v_admin or s.player_id=v_player);
return jsonb_build_object('matches',coalesce(v_summary.matches,0),'wins',v_w,'draws',v_d,'losses',v_l,'unknown_results',greatest(0,coalesce(v_summary.matches,0)-v_w-v_d-v_l),'results_complete',v_w+v_d+v_l=coalesce(v_summary.matches,0),'goals',v_g,'conceded',v_c,'success',case when coalesce(v_summary.matches,0)>0 and v_w+v_d+v_l=v_summary.matches then round(v_w::numeric*100/v_summary.matches,1) else null end,'players',v_rates);
end;$function$
;
create or replace function public.club_quick_entry(p_action text,p_season text,p_player uuid default null,p_before jsonb default null,p_after jsonb default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_stats public.player_season_stats; v_summary public.club_season_summary;
 v_key text; v_area text; v_value numeric; v_current jsonb='{}'; v_after public.player_season_stats;
 v_w integer;v_d integer;v_l integer;v_count integer;
 v_fields text[]=array['matches','goals','assists','goals_conceded','man_of_match','points','manager_rating','attendance_matches','attendance_goals','attendance_points','discipline_referrals'];
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Yönetici girişi gerekli' using errcode='42501';end if;
 if p_action not in ('player','team') or p_action is null then raise exception 'İşlem türünü kontrol et';end if;
 if jsonb_typeof(p_before) is distinct from 'object' or jsonb_typeof(p_after) is distinct from 'object' then raise exception 'Kayıt alanları eksik';end if;
 if (select array_agg(x.key order by x.key) from jsonb_object_keys(p_before) x(key)) is distinct from (select array_agg(x.key order by x.key) from jsonb_object_keys(p_after) x(key)) then raise exception 'Kayıt alanlarını kontrol et';end if;
 perform pg_catalog.pg_advisory_xact_lock(67151);
 select * into v_summary from public.club_season_summary where season=p_season for update;
 if not found then raise exception 'Sezon bulunamadı';end if;
 if p_action='team' then
  if not (public.club_staff_allowed('settings') or public.club_staff_allowed('matches')) then raise exception 'Takım sonuçlarını düzenleme yetkin yok' using errcode='42501';end if;
  if (select count(*) from jsonb_object_keys(p_after))<>4 or not p_after ?& array['matches','wins','draws','losses'] then raise exception 'Takım alanları eksik';end if;
  select count(*) filter(where m.our_score>m.opponent_score),count(*) filter(where m.our_score=m.opponent_score),count(*) filter(where m.our_score<m.opponent_score),count(*) into v_w,v_d,v_l,v_count from public.club_match_entries m where m.season=p_season and m.cancelled_at is null and m.count_team_match;
  v_current=jsonb_build_object('matches',v_summary.matches,'wins',greatest(0,v_w+coalesce(v_summary.historical_wins,0)+v_summary.wins_adjustment),'draws',greatest(0,v_d+coalesce(v_summary.historical_draws,0)+v_summary.draws_adjustment),'losses',greatest(0,v_l+coalesce(v_summary.historical_losses,0)+v_summary.losses_adjustment));
  foreach v_key in array array['matches','wins','draws','losses'] loop
   if jsonb_typeof(p_after->v_key) is distinct from 'number' then raise exception 'Takım değerleri sayısal olmalı';end if;
   v_value=(p_after->>v_key)::numeric;if v_value<0 or v_value>100000 or v_value<>trunc(v_value) then raise exception 'Takım değerleri 0–100000 arası tam sayı olmalı';end if;
  end loop;
  if (p_after->>'wins')::integer+(p_after->>'draws')::integer+(p_after->>'losses')::integer>(p_after->>'matches')::integer then raise exception 'Galibiyet + beraberlik + mağlubiyet maç sayısını aşamaz';end if;

  if p_after=v_current then return jsonb_build_object('saved',true,'unchanged',true);end if;
  if p_before is distinct from v_current then raise exception 'Takım verisi başka ekranda değişmiş. Kapatıp yeniden aç.';end if;
  update public.club_season_summary set matches=(p_after->>'matches')::integer,wins_adjustment=(p_after->>'wins')::integer-v_w-coalesce(v_summary.historical_wins,0),draws_adjustment=(p_after->>'draws')::integer-v_d-coalesce(v_summary.historical_draws,0),losses_adjustment=(p_after->>'losses')::integer-v_l-coalesce(v_summary.historical_losses,0) where season=p_season;
 else
  if p_player is null then raise exception 'Oyuncu seç';end if;
  perform 1 from public.players where id=p_player and archived_at is null for update;if not found then raise exception 'Oyuncu silinmiş veya bulunamadı';end if;
  select * into v_stats from public.player_season_stats where player_id=p_player and season=p_season for update;
  if (select count(*) from jsonb_object_keys(p_after)) not between 1 and 11 then raise exception 'İstatistik alanları eksik';end if;
  for v_key in select jsonb_object_keys(p_after) loop
   if not v_key=any(v_fields) then raise exception 'Geçersiz istatistik alanı';end if;
   v_area=case when v_key like 'attendance_%' then 'training' when v_key='discipline_referrals' then 'penalties' else 'statistics' end;
   if not (public.club_staff_allowed(v_area) or (v_area='statistics' and public.club_staff_allowed('matches'))) then raise exception 'Bu alan için yetkin yok: %',v_area using errcode='42501';end if;
   v_current=v_current||jsonb_build_object(v_key,case when v_key='manager_rating' then to_jsonb(v_stats)->v_key else to_jsonb(coalesce((to_jsonb(v_stats)->>v_key)::numeric,0)) end);
   if v_key='manager_rating' and p_after->v_key='null'::jsonb then continue;end if;
   if jsonb_typeof(p_after->v_key) is distinct from 'number' then raise exception 'İstatistikler sayısal olmalı';end if;
   v_value=(p_after->>v_key)::numeric;
   if v_value<0 or v_value>(case when v_key='manager_rating' then 10 else 100000 end) or (v_key='manager_rating' and v_value<>round(v_value,1)) or (v_key<>'manager_rating' and v_value<>trunc(v_value)) then raise exception 'Sayılar tam sayı; oyuncu puanı 0–10 ve en fazla bir ondalıklı olmalı';end if;
  end loop;
  if p_after=v_current then return jsonb_build_object('saved',true,'unchanged',true);end if;
  if p_before is distinct from v_current then raise exception 'Oyuncunun verisi başka ekranda değişmiş. Kapatıp yeniden aç; hiçbir alan kaydedilmedi.';end if;
  insert into public.player_season_stats(player_id,season) values(p_player,p_season) on conflict(player_id,season) do nothing;
  select * into v_stats from public.player_season_stats where player_id=p_player and season=p_season for update;
  v_after=jsonb_populate_record(v_stats,p_after);
  update public.player_season_stats set matches=v_after.matches,goals=v_after.goals,assists=v_after.assists,goals_conceded=v_after.goals_conceded,man_of_match=v_after.man_of_match,points=v_after.points,manager_rating=v_after.manager_rating,attendance_matches=v_after.attendance_matches,attendance_goals=v_after.attendance_goals,attendance_points=v_after.attendance_points,discipline_referrals=v_after.discipline_referrals,updated_at=now() where player_id=p_player and season=p_season;
 end if;
 return jsonb_build_object('saved',true);
end $$;
revoke all on function public.club_quick_entry(text,text,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.club_quick_entry(text,text,uuid,jsonb,jsonb) to authenticated;
