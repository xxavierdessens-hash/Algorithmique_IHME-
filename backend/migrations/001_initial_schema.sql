CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  jersey_number INTEGER UNIQUE CHECK (jersey_number IS NULL OR jersey_number > 0),
  position TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  opponent TEXT NOT NULL,
  venue TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
