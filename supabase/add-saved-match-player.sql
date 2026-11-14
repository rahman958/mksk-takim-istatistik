create or replace function public.club_add_saved_match_player(p_match uuid,p_player uuid,p_goals integer,p_assists integer,p_points integer,p_already_counted boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  card public.club_match_entries%rowtype;
  entry jsonb;
  add_totals boolean;
begin
  if auth.uid() is null or not coalesce(public.is_admin(),false) then
    raise exception 'Yönetici yetkisi gerekli.' using errcode='42501';
  end if;
  perform public.club_require_area('matches');
  perform pg_catalog.pg_advisory_xact_lock(67151);
  select * into card from public.club_match_entries where id=p_match for update;
  if not found or card.cancelled_at is not null then raise exception 'Aktif maç kartı bulunamadı.'; end if;
  if not exists(select 1 from public.players where id=p_player and archived_at is null and team_left_on is null and not access_disabled) then
    raise exception 'Aktif bir oyuncu seç.';
  end if;
  if exists(select 1 from jsonb_array_elements(card.player_entries) e where e->>'player_id'=p_player::text) then
    raise exception 'Bu oyuncu zaten maç kartında kayıtlı.';
  end if;
  if jsonb_array_length(card.player_entries)>=60 or p_already_counted is null
     or p_goals is null or p_goals not between 0 and 200 or p_assists is null or p_assists not between 0 and 200
     or (p_points is not null and p_points not between 0 and 10) then
    raise exception 'Oyuncu sayısını ve istatistik değerlerini kontrol et.';
  end if;
  if p_goals+(select coalesce(sum(coalesce((e->>'goals')::integer,0)),0) from jsonb_array_elements(card.player_entries) e)>card.our_score then
    raise exception 'Oyuncu golleri takım skorunu aşamaz.';
  end if;
  add_totals:=coalesce(card.count_team_match,false) and not p_already_counted;
  entry:=jsonb_build_object('player_id',p_player,'goals',p_goals,'assists',p_assists,
    'points',p_points,'goals_conceded',0,'man_of_match',0,'points_mode',case when add_totals then 'add' else 'keep' end);
  insert into public.player_season_stats(player_id,season) values(p_player,card.season)
    on conflict(player_id,season) do nothing;
  if add_totals then
    update public.player_season_stats set matches=coalesce(matches,0)+1,goals=coalesce(goals,0)+p_goals,
      assists=coalesce(assists,0)+p_assists,points=case when p_points is null then points else coalesce(points,0)+p_points end,updated_at=now()
      where player_id=p_player and season=card.season;
  end if;
  update public.club_match_entries set player_entries=player_entries||jsonb_build_array(entry) where id=card.id;
  insert into public.club_match_rating_events(match_id,tx,changes,actor_id)
    values(card.id,txid_current(),jsonb_build_array(entry||jsonb_build_object('action','add_player')),auth.uid());
  return entry;
end;
$$;
revoke all on function public.club_add_saved_match_player(uuid,uuid,integer,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.club_add_saved_match_player(uuid,uuid,integer,integer,integer,boolean) to authenticated;
