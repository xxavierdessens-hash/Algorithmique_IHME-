CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  number INTEGER,
  position TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE players ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS number INTEGER;

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
UPDATE players SET position = 'R4' WHERE position IS NULL OR position = '';
UPDATE players SET position = CASE position
  WHEN 'Réceptionneuse-attaquante' THEN 'R4'
  WHEN 'Réceptionneur-attaquant' THEN 'R4'
  WHEN 'Libero' THEN 'Libéro'
  ELSE position
END;
UPDATE players SET position = 'R4'
WHERE position NOT IN ('Passeur', 'R4', 'Central', 'Pointu', 'Libéro');

CREATE UNIQUE INDEX IF NOT EXISTS players_number_unique_idx ON players(number);
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_number_positive;
ALTER TABLE players ADD CONSTRAINT players_number_positive
  CHECK (number IS NULL OR number > 0);
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_position_check;
ALTER TABLE players ADD CONSTRAINT players_position_check
  CHECK (position IN ('Passeur', 'R4', 'Central', 'Pointu', 'Libéro'));

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

CREATE TABLE IF NOT EXISTS match_player_stats (
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  attack_points INTEGER NOT NULL DEFAULT 0 CHECK (attack_points >= 0),
  attack_attempts INTEGER NOT NULL DEFAULT 0 CHECK (attack_attempts >= 0),
  attack_errors INTEGER NOT NULL DEFAULT 0 CHECK (attack_errors >= 0),
  serve_aces INTEGER NOT NULL DEFAULT 0 CHECK (serve_aces >= 0),
  serve_errors INTEGER NOT NULL DEFAULT 0 CHECK (serve_errors >= 0),
  block_points INTEGER NOT NULL DEFAULT 0 CHECK (block_points >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, player_id)
);

CREATE INDEX IF NOT EXISTS matches_match_date_idx ON matches(match_date);
CREATE INDEX IF NOT EXISTS match_player_stats_player_idx ON match_player_stats(player_id);
