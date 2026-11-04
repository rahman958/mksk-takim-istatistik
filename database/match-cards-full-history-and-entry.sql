-- Match card flow: show every card, mark non-playing players, and save new cards safely.
CREATE OR REPLACE FUNCTION public.club_player_match_status(p_player uuid, p_season text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT (
    public.is_admin()
    OR (
      public.player_access_allowed()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'player' AND player_id = p_player
      )
    )
  ) THEN
    RAISE EXCEPTION 'Bu oyuncunun maç detaylarına erişim iznin yok.';
  END IF;

  WITH records AS (
    SELECT
      m.id, m.match_date, m.match_time, m.opponent, m.our_score, m.opponent_score, m.created_at,
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(m.player_entries) e
        WHERE e->>'player_id' = p_player::text
      ) AS played,
      (
        SELECT e FROM jsonb_array_elements(m.player_entries) e
        WHERE e->>'player_id' = p_player::text
        LIMIT 1
      ) AS player_entry,
      COALESCE(m.match_roster, '[]'::jsonb) ? p_player::text AS roster_has_player,
      jsonb_array_length(COALESCE(m.match_roster, '[]'::jsonb)) AS roster_count
    FROM public.club_match_entries m
    WHERE m.season = p_season AND m.cancelled_at IS NULL
  ),
  recent AS (
    SELECT * FROM records
    ORDER BY match_date DESC, created_at DESC
    LIMIT 100
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'match_date', match_date,
        'match_time', match_time,
        'opponent', opponent,
        'our_score', our_score,
        'opponent_score', opponent_score,
        'status', CASE
          WHEN played THEN 'OYNADI'
          WHEN roster_has_player OR roster_count = 0 THEN 'OYNAMADI'
          ELSE 'VERİ İŞLENMEDİ'
        END,
        'points', CASE WHEN played THEN (player_entry->>'points')::numeric END,
        'goals', CASE WHEN played THEN (player_entry->>'goals')::integer END,
        'assists', CASE WHEN played THEN (player_entry->>'assists')::integer END,
        'goals_conceded', CASE WHEN played THEN (player_entry->>'goals_conceded')::integer END,
        'source', 'Maç kartı'
      )
      ORDER BY match_date DESC, created_at DESC
    ),
    '[]'::jsonb
  ) INTO result
  FROM recent;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.club_player_form(p_player uuid, p_season text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result jsonb; total integer;
BEGIN
  IF NOT (
    public.is_admin()
    OR (
      public.player_access_allowed()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'player' AND player_id = p_player
      )
    )
  ) THEN
    RAISE EXCEPTION 'Bu oyuncunun maç detaylarına erişim iznin yok.';
  END IF;

  SELECT matches INTO total
  FROM public.player_season_stats
  WHERE player_id = p_player AND season = p_season;

  WITH records AS (
    SELECT
      'entry:' || m.id::text AS key,
      m.match_date, m.opponent, m.our_score, m.opponent_score,
      CASE WHEN (e->>'points')::numeric BETWEEN 0 AND 10 THEN (e->>'points')::numeric ELSE NULL END AS points,
      (e->>'goals')::integer AS goals,
      (e->>'assists')::integer AS assists,
      (e->>'goals_conceded')::integer AS goals_conceded,
      m.created_at,
      'Maç kartı'::text AS source
    FROM public.club_match_entries m
    CROSS JOIN LATERAL jsonb_array_elements(m.player_entries) e
    WHERE m.season = p_season
      AND m.cancelled_at IS NULL
      AND e->>'player_id' = p_player::text
  ),
  recent AS (
    SELECT * FROM records
    ORDER BY match_date DESC, created_at DESC, key DESC
    LIMIT 100
  )
  SELECT jsonb_build_object(
    'total_matches', COALESCE(total, 0),
    'recorded_matches', (SELECT count(*) FROM records),
    'items', COALESCE(
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY match_date DESC, created_at DESC, key DESC) FROM recent r),
      '[]'::jsonb
    )
  )
  INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.club_save_match_card(
  p_id uuid,
  p_season text,
  p_date date,
  p_time text,
  p_opponent text,
  p_our integer,
  p_against integer,
  p_count boolean,
  p_entries jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  e jsonb;
  pid uuid;
  k text;
  v numeric;
  goals_total integer := 0;
  mom_total integer := 0;
  known_roster jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yalnızca yöneticiler maç kartı ekleyebilir.';
  END IF;
  PERFORM public.club_require_area('matches');
  IF p_id IS NULL OR p_season !~ '^20[0-9]{2}-20[0-9]{2}$'
     OR p_date IS NULL OR p_date > (now() AT TIME ZONE 'Europe/Istanbul')::date
     OR length(trim(COALESCE(p_opponent, ''))) NOT BETWEEN 1 AND 200
     OR p_our NOT BETWEEN 0 AND 200 OR p_against NOT BETWEEN 0 AND 200
     OR p_count IS NULL THEN
    RAISE EXCEPTION 'Tarih, rakip ve skor bilgilerini kontrol et.';
  END IF;
  IF p_entries IS NULL OR jsonb_typeof(p_entries) <> 'array'
     OR jsonb_array_length(p_entries) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'En az bir oyuncuyu seç.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_entries) item
    GROUP BY item->>'player_id' HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Aynı oyuncu iki kez seçilemez.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.club_match_entries
    WHERE season = p_season
      AND match_date = p_date
      AND lower(trim(opponent)) = lower(trim(p_opponent))
      AND our_score = p_our
      AND opponent_score = p_against
      AND cancelled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Bu tarih, rakip ve skorla kayıtlı maç kartı zaten var.';
  END IF;

  FOR e IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
    pid := (e->>'player_id')::uuid;
    IF pid IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.players
      WHERE id = pid AND archived_at IS NULL AND NOT access_disabled AND team_left_on IS NULL
    ) THEN
      RAISE EXCEPTION 'Seçilen oyuncu takımda değil veya erişimi kapalı.';
    END IF;
    FOREACH k IN ARRAY ARRAY['goals','assists','points','goals_conceded','man_of_match'] LOOP
      IF k = 'points' AND e ? k AND e->k = 'null'::jsonb THEN
        CONTINUE;
      END IF;
      IF NOT (e ? k) OR jsonb_typeof(e->k) <> 'number' THEN
        RAISE EXCEPTION 'Oyuncu değerleri sayısal olmalı.';
      END IF;
      v := (e->>k)::numeric;
      IF v <> trunc(v) OR v < 0
         OR v > (CASE WHEN k = 'points' THEN 10 WHEN k = 'man_of_match' THEN 1 ELSE 200 END) THEN
        RAISE EXCEPTION 'Puan 0–10, maçın adamı 0–1, diğer değerler 0–200 olmalı.';
      END IF;
    END LOOP;
    goals_total := goals_total + (e->>'goals')::integer;
    mom_total := mom_total + (e->>'man_of_match')::integer;
  END LOOP;
  IF goals_total > p_our OR mom_total > 1 THEN
    RAISE EXCEPTION 'Oyuncu golleri takım skorunu aşamaz; maçın adamı en fazla bir kişi olabilir.';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(id::text)), '[]'::jsonb)
  INTO known_roster
  FROM public.players
  WHERE archived_at IS NULL AND NOT access_disabled AND team_left_on IS NULL;

  INSERT INTO public.club_match_entries(
    id, season, match_date, opponent, our_score, opponent_score,
    player_entries, count_team_match, actor_id, tx, match_roster, match_time
  ) VALUES (
    p_id, p_season, p_date, trim(p_opponent), p_our, p_against,
    p_entries, p_count, auth.uid(), txid_current(), known_roster, nullif(trim(COALESCE(p_time, '')), '')
  );

  IF p_count THEN
    FOR e IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
      pid := (e->>'player_id')::uuid;
      INSERT INTO public.player_season_stats(player_id, season)
      VALUES(pid, p_season)
      ON CONFLICT(player_id, season) DO NOTHING;
      UPDATE public.player_season_stats
      SET
        matches = COALESCE(matches, 0) + 1,
        goals = COALESCE(goals, 0) + (e->>'goals')::integer,
        assists = COALESCE(assists, 0) + (e->>'assists')::integer,
        points = CASE
          WHEN e->>'points' IS NULL THEN points
          ELSE COALESCE(points, 0) + (e->>'points')::integer
        END,
        goals_conceded = COALESCE(goals_conceded, 0) + (e->>'goals_conceded')::integer,
        man_of_match = COALESCE(man_of_match, 0) + (e->>'man_of_match')::integer,
        updated_at = now()
      WHERE player_id = pid AND season = p_season;
    END LOOP;
    INSERT INTO public.club_season_summary(season, matches)
    VALUES(p_season, 0)
    ON CONFLICT(season) DO NOTHING;
    UPDATE public.club_season_summary SET matches = matches + 1 WHERE season = p_season;
  END IF;

  RETURN p_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.club_save_match_card(uuid, text, date, text, text, integer, integer, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_save_match_card(uuid, text, date, text, text, integer, integer, boolean, jsonb) TO authenticated;