
create or replace function public.club_edit_saved_match(p_match uuid,p_expected jsonb,p_entries jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.club_match_entries; old_e jsonb; new_e jsonb; e jsonb; pid uuid; k text; v numeric; next_entries jsonb:='[]'; goals_total integer:=0; old_add boolean; new_add boolean; dm integer; dg integer; da integer; dp integer; dc integer; dw integer; changes jsonb:='[]';
begin
 if auth.uid() is null or not coalesce(public.is_admin(),false) then raise exception 'Yönetici yetkisi gerekli' using errcode='42501';end if;
 perform public.club_require_area('matches');
 perform pg_catalog.pg_advisory_xact_lock(67151);
 select * into m from public.club_match_entries where id=p_match for update;
 if not found or m.cancelled_at is not null then raise exception 'Aktif maç bulunamadı';end if;
 if p_expected is distinct from m.player_entries then raise exception 'Maç başka ekranda değişti. Yeniden aç; hiçbir değişiklik kaydedilmedi.';end if;
 if p_entries is null or pg_catalog.jsonb_typeof(p_entries)<>'array' or pg_catalog.jsonb_array_length(p_entries)>60 then raise exception 'Oyuncu listesini kontrol et';end if;
 if exists(select 1 from pg_catalog.jsonb_array_elements(p_entries) x group by x->>'player_id' having count(*)>1) then raise exception 'Aynı oyuncu iki kez seçilemez';end if;
 for e in select value from pg_catalog.jsonb_array_elements(p_entries) loop
  pid:=(e->>'player_id')::uuid;
  select value into old_e from pg_catalog.jsonb_array_elements(m.player_entries) x where x->>'player_id'=pid::text;
  if pid is null or (old_e is null and not exists(select 1 from public.players where id=pid and archived_at is null and team_left_on is null and not access_disabled)) then raise exception 'Aktif bir oyuncu seç';end if;
  foreach k in array array['goals','assists','goals_conceded','points','man_of_match'] loop
   if k='points' and e->k='null'::jsonb then continue;end if;
   if not(e ? k) or pg_catalog.jsonb_typeof(e->k)<>'number' then raise exception 'Oyuncu değerleri sayısal olmalı';end if;
   v:=(e->>k)::numeric;
   if v<>trunc(v) or v<0 or v>(case when k='points' then 10 when k='man_of_match' then 1 else 200 end) then raise exception 'Puan 0–10, ödül 0–1, diğer değerler 0–200 olmalı';end if;
  end loop;
  if old_e is null and pg_catalog.jsonb_typeof(e->'already_counted') is distinct from 'boolean' then raise exception 'Yeni oyuncunun sezon toplamı seçimini kontrol et';end if;
  new_e:=coalesce(old_e,'{}')||pg_catalog.jsonb_build_object('player_id',pid,'goals',(e->>'goals')::int,'assists',(e->>'assists')::int,'points',(e->>'points')::int,'goals_conceded',(e->>'goals_conceded')::int,'man_of_match',(e->>'man_of_match')::int,'points_mode',case when old_e is not null then coalesce(old_e->>'points_mode',case when m.count_team_match then 'add' else 'keep' end) when m.count_team_match and not(e->>'already_counted')::boolean then 'add' else 'keep' end);
  next_entries:=next_entries||pg_catalog.jsonb_build_array(new_e);
  goals_total:=goals_total+(e->>'goals')::int;
 end loop;
 if goals_total>m.our_score then raise exception 'Oyuncu golleri takım skorunu aşamaz';end if;
 if next_entries=m.player_entries then return pg_catalog.jsonb_build_object('saved',true,'unchanged',true,'entries',next_entries);end if;
 for pid in select distinct (x->>'player_id')::uuid from pg_catalog.jsonb_array_elements(m.player_entries||next_entries) x order by 1 loop
  select value into old_e from pg_catalog.jsonb_array_elements(m.player_entries) x where x->>'player_id'=pid::text;
  select value into new_e from pg_catalog.jsonb_array_elements(next_entries) x where x->>'player_id'=pid::text;
  old_add:=m.count_team_match and old_e is not null and coalesce(old_e->>'points_mode','add')='add';
  new_add:=m.count_team_match and new_e is not null and coalesce(new_e->>'points_mode','add')='add';
  dm:=(case when new_add then 1 else 0 end)-(case when old_add then 1 else 0 end);
  dg:=(case when new_add then coalesce((new_e->>'goals')::int,0) else 0 end)-(case when old_add then coalesce((old_e->>'goals')::int,0) else 0 end);
  da:=(case when new_add then coalesce((new_e->>'assists')::int,0) else 0 end)-(case when old_add then coalesce((old_e->>'assists')::int,0) else 0 end);
  dp:=(case when new_add then coalesce((new_e->>'points')::int,0) else 0 end)-(case when old_add then coalesce((old_e->>'points')::int,0) else 0 end);
  dc:=(case when new_add then coalesce((new_e->>'goals_conceded')::int,0) else 0 end)-(case when old_add then coalesce((old_e->>'goals_conceded')::int,0) else 0 end);
  dw:=(case when new_add then coalesce((new_e->>'man_of_match')::int,0) else 0 end)-(case when old_add then coalesce((old_e->>'man_of_match')::int,0) else 0 end);
  if dm<>0 or dg<>0 or da<>0 or dp<>0 or dc<>0 or dw<>0 then
   insert into public.player_season_stats(player_id,season) values(pid,m.season) on conflict(player_id,season) do nothing;
   update public.player_season_stats set matches=coalesce(matches,0)+dm,goals=coalesce(goals,0)+dg,assists=coalesce(assists,0)+da,points=coalesce(points,0)+dp,goals_conceded=coalesce(goals_conceded,0)+dc,man_of_match=coalesce(man_of_match,0)+dw,updated_at=now()
   where player_id=pid and season=m.season and coalesce(matches,0)+dm>=0 and coalesce(goals,0)+dg>=0 and coalesce(assists,0)+da>=0 and coalesce(points,0)+dp>=0 and coalesce(goals_conceded,0)+dc>=0 and coalesce(man_of_match,0)+dw>=0;
   if not found then raise exception 'Sezon toplamları doğrulanamadı; hiçbir kayıt değiştirilmedi';end if;
  end if;
  if old_e is distinct from new_e then changes:=changes||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('action','edit_match_player','player_id',pid,'before',old_e,'after',new_e,'totals_changed',old_add or new_add));end if;
 end loop;
 update public.club_match_entries set player_entries=next_entries where id=m.id;
 insert into public.club_match_rating_events(match_id,tx,changes,actor_id) values(m.id,pg_catalog.txid_current(),changes,auth.uid());
 return pg_catalog.jsonb_build_object('saved',true,'entries',next_entries);
end $$;
revoke all on function public.club_edit_saved_match(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.club_edit_saved_match(uuid,jsonb,jsonb) to authenticated;


create or replace function public.club_remove_match(p_match uuid)
returns text language plpgsql security definer set search_path='' as $$
declare m public.club_match_entries;e jsonb;pid uuid;restored integer;
begin
 if auth.uid() is null or not coalesce(public.is_admin(),false) then raise exception 'Yönetici yetkisi gerekli' using errcode='42501';end if;
 perform public.club_require_area('matches');perform pg_catalog.pg_advisory_xact_lock(67151);
 select * into m from public.club_match_entries where id=p_match for update;
 if not found or m.cancelled_at is not null then raise exception 'Aktif maç bulunamadı';end if;
 if not m.count_team_match then update public.club_match_entries set cancelled_at=now() where id=m.id;return 'Geçmiş maç kartı kaldırıldı; sezon toplamları korundu.';end if;
 if not exists(select 1 from public.club_match_rating_events r cross join lateral pg_catalog.jsonb_array_elements(r.changes) ch where r.match_id=m.id and ch->>'action'='edit_match_player') then
  restored:=public.club_undo_changes(m.tx);if restored<1 then raise exception 'Maçın bağlı kayıtları geri alınamadı';end if;return 'Maç ve bağlı oyuncu verileri geri alındı.';
 end if;
 for e in select value from pg_catalog.jsonb_array_elements(m.player_entries) loop
  if coalesce(e->>'points_mode','add')<>'add' then continue;end if;
  pid:=(e->>'player_id')::uuid;
  update public.player_season_stats set matches=coalesce(matches,0)-1,goals=coalesce(goals,0)-coalesce((e->>'goals')::int,0),assists=coalesce(assists,0)-coalesce((e->>'assists')::int,0),points=coalesce(points,0)-coalesce((e->>'points')::int,0),goals_conceded=coalesce(goals_conceded,0)-coalesce((e->>'goals_conceded')::int,0),man_of_match=coalesce(man_of_match,0)-coalesce((e->>'man_of_match')::int,0),updated_at=now()
  where player_id=pid and season=m.season and coalesce(matches,0)>=1 and coalesce(goals,0)>=coalesce((e->>'goals')::int,0) and coalesce(assists,0)>=coalesce((e->>'assists')::int,0) and coalesce(points,0)>=coalesce((e->>'points')::int,0) and coalesce(goals_conceded,0)>=coalesce((e->>'goals_conceded')::int,0) and coalesce(man_of_match,0)>=coalesce((e->>'man_of_match')::int,0);
  if not found then raise exception 'Sezon toplamları doğrulanamadı; hiçbir kayıt değiştirilmedi';end if;
 end loop;
 update public.club_season_summary set matches=matches-1 where season=m.season and matches>=1;
 if not found then raise exception 'Takım maç sayısı doğrulanamadı';end if;
 update public.club_match_entries set cancelled_at=now() where id=m.id;
 insert into public.club_match_rating_events(match_id,tx,changes,actor_id) values(m.id,pg_catalog.txid_current(),pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('action','remove_edited_match')),auth.uid());
 return 'Maç kaldırıldı; yalnız bu maçın güncel katkıları geri alındı.';
end $$;
