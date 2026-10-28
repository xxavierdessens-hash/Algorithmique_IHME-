CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  number INTEGER,
  position TEXT,
  role TEXT NOT NULL DEFAULT 'Joueur',
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE players ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS number INTEGER;
ALTER TABLE players ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Joueur';
ALTER TABLE players ADD COLUMN IF NOT EXISTS email TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'players'
      AND column_name = 'name'
  ) THEN
    EXECUTE $migration$
      UPDATE players
      SET first_name = COALESCE(first_name, split_part(name, ' ', 1)),
          last_name = COALESCE(
            last_name,
            NULLIF(regexp_replace(name, '^[^ ]+[ ]*', ''), '')
          )
      WHERE first_name IS NULL OR last_name IS NULL
    $migration$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'players'
      AND column_name = 'jersey_number'
  ) THEN
    EXECUTE 'UPDATE players SET number = jersey_number WHERE number IS NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'players'
      AND column_name = 'name'
  ) THEN
    EXECUTE 'ALTER TABLE players ALTER COLUMN name DROP NOT NULL';
  END IF;
END $$;

UPDATE players SET first_name = 'Joueur' WHERE first_name IS NULL OR first_name = '';
UPDATE players
SET email = COALESCE(
  NULLIF(LOWER(REGEXP_REPLACE(
    CONCAT_WS('.', first_name, last_name),
    '[^a-z0-9.]+',
    '',
    'g'
  )), ''),
  'joueur-' || id::text
) || '@example.com'
WHERE email IS NULL OR BTRIM(email) = '';
ALTER TABLE players ALTER COLUMN email SET NOT NULL;
UPDATE players
SET position = 'R4'
WHERE (position IS NULL OR position = '') AND role = 'Joueur';
UPDATE players SET position = CASE position
  WHEN 'Réceptionneuse-attaquante' THEN 'R4'
  WHEN 'Réceptionneur-attaquant' THEN 'R4'
  WHEN 'Libero' THEN 'Libéro'
  ELSE position
END;
UPDATE players SET position = 'R4'
WHERE position NOT IN ('Passeur', 'R4', 'Central', 'Pointu', 'Libéro');

CREATE UNIQUE INDEX IF NOT EXISTS players_number_unique_idx ON players(number);
CREATE UNIQUE INDEX IF NOT EXISTS players_email_lower_unique_idx ON players(LOWER(email));
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_number_positive;
ALTER TABLE players ADD CONSTRAINT players_number_positive
  CHECK (number IS NULL OR number > 0);
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_position_check;
ALTER TABLE players ADD CONSTRAINT players_position_check
  CHECK (position IN ('Passeur', 'R4', 'Central', 'Pointu', 'Libéro'));
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_role_check;
UPDATE players SET role = 'Joueur'
WHERE role IS NULL OR role NOT IN ('Coach', 'Joueur', 'Invité');
ALTER TABLE players ALTER COLUMN role SET DEFAULT 'Joueur';
ALTER TABLE players ALTER COLUMN role SET NOT NULL;
ALTER TABLE players ADD CONSTRAINT players_role_check
  CHECK (role IN ('Coach', 'Joueur', 'Invité'));

CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  opponent TEXT NOT NULL,
  location TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'À venir'
    CHECK (status IN ('À venir', 'En cours', 'Terminé')),
  score_home INTEGER NOT NULL DEFAULT 0,
  score_away INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_home INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_away INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_set_home INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_set_away INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_detail JSONB;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS sets_score TEXT;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_score_home_nonnegative;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_score_away_nonnegative;
ALTER TABLE matches ADD CONSTRAINT matches_score_home_nonnegative CHECK (score_home >= 0);
ALTER TABLE matches ADD CONSTRAINT matches_score_away_nonnegative CHECK (score_away >= 0);
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_current_set_home_nonnegative;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_current_set_away_nonnegative;
ALTER TABLE matches ADD CONSTRAINT matches_current_set_home_nonnegative
  CHECK (current_set_home >= 0);
ALTER TABLE matches ADD CONSTRAINT matches_current_set_away_nonnegative
  CHECK (current_set_away >= 0);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'matches'
      AND column_name = 'venue'
  ) THEN
    EXECUTE 'UPDATE matches SET location = venue WHERE location IS NULL';
  END IF;
END $$;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
UPDATE matches
SET status = CASE status
  WHEN 'scheduled' THEN 'À venir'
  WHEN 'live' THEN 'En cours'
  WHEN 'completed' THEN 'Terminé'
  ELSE status
END;
ALTER TABLE matches ALTER COLUMN status SET DEFAULT 'À venir';
ALTER TABLE matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('À venir', 'En cours', 'Terminé'));
UPDATE matches
SET sets_score = score_home::text || '-' || score_away::text
WHERE sets_score IS NULL OR sets_score = '';

CREATE TABLE IF NOT EXISTS match_player_stats (
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  attack_points INTEGER NOT NULL DEFAULT 0 CHECK (attack_points >= 0),
  attack_attempts INTEGER NOT NULL DEFAULT 0 CHECK (attack_attempts >= 0),
  attack_errors INTEGER NOT NULL DEFAULT 0 CHECK (attack_errors >= 0),
  serve_aces INTEGER NOT NULL DEFAULT 0 CHECK (serve_aces >= 0),
  serve_errors INTEGER NOT NULL DEFAULT 0 CHECK (serve_errors >= 0),
  block_points INTEGER NOT NULL DEFAULT 0 CHECK (block_points >= 0),
  sets_played NUMERIC(5, 1) NOT NULL DEFAULT 0 CHECK (sets_played >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, player_id)
);

ALTER TABLE match_player_stats
  ADD COLUMN IF NOT EXISTS sets_played NUMERIC(5, 1) NOT NULL DEFAULT 0
  CHECK (sets_played >= 0);

CREATE TABLE IF NOT EXISTS match_action_history (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'attack_points', 'attack_attempts', 'attack_errors',
    'serve_aces', 'serve_errors', 'block_points'
  )),
  delta SMALLINT NOT NULL CHECK (delta IN (-1, 1)),
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS matches_match_date_idx ON matches(match_date);
CREATE INDEX IF NOT EXISTS match_player_stats_player_idx ON match_player_stats(player_id);
CREATE INDEX IF NOT EXISTS match_action_history_match_idx
  ON match_action_history(match_id, id DESC) WHERE undone_at IS NULL;

CREATE TABLE IF NOT EXISTS trainings (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT NOT NULL,
  theme TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('Match', 'Training')),
  event_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'En attente'
    CHECK (status IN ('Présent', 'Absent', 'En attente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, event_type, event_id)
);

CREATE TABLE IF NOT EXISTS drills (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Gammes', 'Phase K1', 'Phase K2', 'Situationnel 6x6'
  )),
  description TEXT NOT NULL,
  min_players INTEGER NOT NULL DEFAULT 6 CHECK (min_players > 0),
  source_url TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE drills DROP CONSTRAINT IF EXISTS drills_category_check;
UPDATE drills SET category = CASE category
  WHEN 'K1 Side-out' THEN 'Phase K1'
  WHEN 'K2 Transition' THEN 'Phase K2'
  ELSE category
END;
ALTER TABLE drills ADD CONSTRAINT drills_category_check
  CHECK (category IN ('Gammes', 'Phase K1', 'Phase K2', 'Situationnel 6x6'));

CREATE TABLE IF NOT EXISTS training_drills (
  training_id BIGINT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  drill_id BIGINT NOT NULL REFERENCES drills(id) ON DELETE RESTRICT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  PRIMARY KEY (training_id, drill_id),
  UNIQUE (training_id, order_index)
);

CREATE INDEX IF NOT EXISTS trainings_date_idx ON trainings(date, start_time);
CREATE INDEX IF NOT EXISTS attendance_event_idx
  ON attendance(event_type, event_id);
CREATE INDEX IF NOT EXISTS drills_category_idx ON drills(category);
CREATE INDEX IF NOT EXISTS training_drills_drill_idx ON training_drills(drill_id);
