CREATE OR REPLACE FUNCTION public.club_bulk_statistics(p_season text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r jsonb;s public.player_season_stats;pid uuid;k text;v numeric;current_values jsonb;n integer=0;
begin
if auth.uid() is null or not public.club_staff_allowed('statistics') then raise exception 'İstatistik düzenleme yetkin yok' using errcode='42501';end if;
if not exists(select 1 from public.club_season_summary where season=p_season) then raise exception 'Sezon bulunamadı';end if;
if p_rows is null or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 200 then raise exception '1–200 oyuncu gönderilebilir';end if;
if exists(select 1 from jsonb_array_elements(p_rows) as duplicate_row(item) group by duplicate_row.item->>'player_id' having count(*)>1) then raise exception 'Aynı oyuncu iki kez gönderilemez';end if;
perform pg_advisory_xact_lock(67151);
for r in select value from jsonb_array_elements(p_rows) order by value->>'player_id' loop
pid=(r->>'player_id')::uuid;
perform 1 from public.players where id=pid and archived_at is null for update;if not found then raise exception 'Oyuncu silinmiş veya bulunamadı. Listeyi yenile';end if;
select * into s from public.player_season_stats where player_id=pid and season=p_season for update;
current_values=jsonb_build_object('matches',coalesce(s.matches,0),'goals',coalesce(s.goals,0),'assists',coalesce(s.assists,0),'manager_rating',s.manager_rating);
if r->'before' is distinct from current_values then raise exception 'Başka bir ekran veriyi değiştirdi. Hiçbir satır kaydedilmedi; listeyi yenile';end if;
if jsonb_typeof(r->'after')<>'object' or (select count(*) from jsonb_object_keys(r->'after'))<>4 then raise exception 'Alanları kontrol et';end if;
foreach k in array array['matches','goals','assists','manager_rating'] loop
if not (r->'after' ? k) then raise exception 'Eksik alan';end if;
if k='manager_rating' and r->'after'->k='null'::jsonb then continue;end if;
if jsonb_typeof(r->'after'->k)<>'number' then raise exception 'Değerler sayısal olmalı';end if;
v=(r->'after'->>k)::numeric;
if v<0 or v>(case when k='manager_rating' then 10 else 1000000 end) or (k='manager_rating' and v<>round(v,1)) or (k<>'manager_rating' and v<>trunc(v)) then raise exception 'Maç/gol/asist tam sayı; oyuncu puanı 0–10 ve en fazla bir ondalıklı olmalı';end if;
end loop;
if r->'after'=current_values then continue;end if;
insert into public.player_season_stats(player_id,season) values(pid,p_season) on conflict(player_id,season) do nothing;
update public.player_season_stats set matches=(r->'after'->>'matches')::integer,goals=(r->'after'->>'goals')::integer,assists=(r->'after'->>'assists')::integer,manager_rating=(r->'after'->>'manager_rating')::numeric,updated_at=now() where player_id=pid and season=p_season;
n=n+1;
end loop;return jsonb_build_object('saved',n);end $function$
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
  v_current=jsonb_build_object('matches',v_summary.matches,'wins',v_w+coalesce(v_summary.historical_wins,0),'draws',v_d+coalesce(v_summary.historical_draws,0),'losses',v_l+coalesce(v_summary.historical_losses,0));
  foreach v_key in array array['matches','wins','draws','losses'] loop
   if jsonb_typeof(p_after->v_key) is distinct from 'number' then raise exception 'Takım değerleri sayısal olmalı';end if;
   v_value=(p_after->>v_key)::numeric;if v_value<0 or v_value>100000 or v_value<>trunc(v_value) then raise exception 'Takım değerleri 0–100000 arası tam sayı olmalı';end if;
  end loop;
  if (p_after->>'wins')::integer+(p_after->>'draws')::integer+(p_after->>'losses')::integer>(p_after->>'matches')::integer then raise exception 'Galibiyet + beraberlik + mağlubiyet maç sayısını aşamaz';end if;
  if (p_after->>'wins')::integer<v_w or (p_after->>'draws')::integer<v_d or (p_after->>'losses')::integer<v_l or (p_after->>'matches')::integer<v_count then raise exception 'Sayılar kayıtlı maç sonuçlarının altına inemez. Yanlış maçı değişiklik geçmişinden geri al.';end if;
  if p_after=v_current then return jsonb_build_object('saved',true,'unchanged',true);end if;
  if p_before is distinct from v_current then raise exception 'Takım verisi başka ekranda değişmiş. Kapatıp yeniden aç.';end if;
  update public.club_season_summary set matches=(p_after->>'matches')::integer,historical_wins=(p_after->>'wins')::integer-v_w,historical_draws=(p_after->>'draws')::integer-v_d,historical_losses=(p_after->>'losses')::integer-v_l where season=p_season;
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
