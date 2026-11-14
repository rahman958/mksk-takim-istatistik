CREATE OR REPLACE FUNCTION public.club_complete_match_ratings(p_match uuid, p_ratings jsonb, p_mode text DEFAULT 'add'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare m public.club_match_entries; e jsonb; r jsonb; pid uuid; grade integer; previous_grade integer; n integer=0; next_entries jsonb='[]'::jsonb; changes jsonb='[]'::jsonb;
begin
 if not public.is_admin() then raise exception 'Yalnızca yöneticiler puan girebilir.';end if;
 perform public.club_require_area('matches');
 perform pg_advisory_xact_lock(67151);
 if p_mode is null or p_mode not in ('add','keep','correct') then raise exception 'Puan kayıt şeklini kontrol et.';end if;
 select * into m from public.club_match_entries where id=p_match for update;
 if not found or m.cancelled_at is not null then raise exception 'Aktif maç kaydı bulunamadı.';end if;
 if p_ratings is null or jsonb_typeof(p_ratings)<>'array' or jsonb_array_length(p_ratings) not between 1 and 60 then raise exception 'En az bir oyuncunun puanını gir.';end if;
 if exists(select 1 from jsonb_array_elements(p_ratings) q group by q->>'player_id' having count(*)>1) then raise exception 'Aynı oyuncu iki kez gönderilemez.';end if;
 for r in select value from jsonb_array_elements(p_ratings) loop
  pid=(r->>'player_id')::uuid;
  if pid is null or not exists(select 1 from jsonb_array_elements(m.player_entries) q where q->>'player_id'=pid::text) then raise exception 'Oyuncu bu maçta yer almıyor.';end if;
  if not(r ? 'points') or jsonb_typeof(r->'points')<>'number' or (r->>'points')::numeric<>trunc((r->>'points')::numeric) or (r->>'points')::numeric not between 0 and 10 then raise exception 'Puan 0–10 arasında tam sayı olmalı.';end if;
 end loop;
 for e in select value from jsonb_array_elements(m.player_entries) loop
  select value into r from jsonb_array_elements(p_ratings) where value->>'player_id'=e->>'player_id';
  if found then
   grade=(r->>'points')::integer;pid=(e->>'player_id')::uuid;
   if p_mode='correct' then
    previous_grade=(e->>'points')::integer;
    if not (r ? 'expected') or previous_grade is distinct from (r->>'expected')::integer then
      raise exception 'Puan başka bir ekranda değişti. Kartı yeniden aç.';
    end if;
    if previous_grade is distinct from grade then
     if m.count_team_match and coalesce(e->>'points_mode','add')='add' then
      update public.player_season_stats set points=coalesce(points,0)+grade-coalesce(previous_grade,0),updated_at=now()
      where player_id=pid and season=m.season and coalesce(points,0)+grade-coalesce(previous_grade,0)>=0;
      if not found then raise exception 'Sezon puan toplamı doğrulanamadı.';end if;
     end if;
     e=e||jsonb_build_object('points',grade,'points_mode',case when not m.count_team_match then 'keep' else coalesce(e->>'points_mode','add') end);
     changes=changes||jsonb_build_array(jsonb_build_object('player_id',pid,'previous_points',previous_grade,'points',grade,'points_mode',e->>'points_mode'));n=n+1;
    end if;
   elsif e->>'points' is not null then
    if (e->>'points')::numeric<>grade then raise exception 'Bu oyuncunun maç puanı zaten kayıtlı; ikinci kez eklenmedi.';end if;
   else
    update public.player_season_stats set points=case when p_mode='add' then coalesce(points,0)+grade else points end,updated_at=now() where player_id=pid and season=m.season;
    if not found then raise exception 'Oyuncunun sezon kaydı bulunamadı.';end if;
    e=e||jsonb_build_object('points',grade,'points_mode',p_mode);
    changes=changes||jsonb_build_array(jsonb_build_object('player_id',pid,'points',grade,'points_mode',p_mode));n=n+1;
   end if;
  end if;
  next_entries=next_entries||jsonb_build_array(e);
 end loop;
 if n>0 then
  update public.club_match_entries set player_entries=next_entries where id=p_match;
  insert into public.club_match_rating_events(match_id,tx,changes,actor_id) values(p_match,txid_current(),changes,auth.uid());
 end if;
 return n;
end $function$
