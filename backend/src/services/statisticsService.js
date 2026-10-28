import { query, withTransaction } from "../config/database.js";

const ALLOWED_ACTIONS = new Set([
  "attack_points",
  "attack_attempts",
  "attack_errors",
  "serve_aces",
  "serve_errors",
  "block_points",
]);

const MATCH_STATISTICS_SQL = `
  SELECT
    p.id,
    CONCAT_WS(' ', p.first_name, p.last_name) AS name,
    p.number AS jersey_number,
    p.position,
    COALESCE(s.attack_points, 0)::int AS attack_points,
    COALESCE(s.attack_attempts, 0)::int AS attack_attempts,
    COALESCE(s.attack_errors, 0)::int AS attack_errors,
    COALESCE(s.serve_aces, 0)::int AS serve_aces,
    COALESCE(s.serve_errors, 0)::int AS serve_errors,
    COALESCE(s.block_points, 0)::int AS block_points,
    COALESCE(s.sets_played, 0)::numeric(5, 1) AS sets_played,
    (COALESCE(s.attack_points, 0) + COALESCE(s.serve_aces, 0) +
      COALESCE(s.block_points, 0))::int AS points,
    CASE
      WHEN COALESCE(s.attack_attempts, 0) = 0 THEN 0
      ELSE ROUND(100.0 * COALESCE(s.attack_points, 0) / s.attack_attempts)::int
    END AS attack_ratio
  FROM players p
  LEFT JOIN match_player_stats s ON s.player_id = p.id AND s.match_id = $1
  WHERE p.active = TRUE AND p.role = 'Joueur'
  ORDER BY p.number NULLS LAST, p.last_name, p.first_name
`;

export async function getMatchStatistics(matchId) {
  const { rows } = await query(MATCH_STATISTICS_SQL, [matchId]);
  return rows;
}

export async function getSeasonProgression() {
  const { rows } = await query(
    `SELECT
       p.id,
       CONCAT_WS(' ', p.first_name, p.last_name) AS name,
       p.number AS jersey_number,
       p.position,
       COUNT(DISTINCT s.match_id) FILTER (
         WHERE COALESCE(s.sets_played, 0) > 0 OR
           COALESCE(s.attack_points, 0) > 0 OR
           COALESCE(s.attack_attempts, 0) > 0 OR
           COALESCE(s.attack_errors, 0) > 0 OR
           COALESCE(s.serve_aces, 0) > 0 OR
           COALESCE(s.serve_errors, 0) > 0 OR
           COALESCE(s.block_points, 0) > 0
       )::int AS matches_played,
       COALESCE(SUM(s.attack_points), 0)::int AS attack_points,
       COALESCE(SUM(s.attack_attempts), 0)::int AS attack_attempts,
       COALESCE(SUM(s.attack_errors), 0)::int AS attack_errors,
       COALESCE(SUM(s.serve_aces), 0)::int AS serve_aces,
       COALESCE(SUM(s.serve_errors), 0)::int AS serve_errors,
       COALESCE(SUM(s.block_points), 0)::int AS block_points,
       COALESCE(SUM(s.sets_played), 0)::numeric(6, 1) AS sets_played,
       (COALESCE(SUM(s.attack_points), 0) + COALESCE(SUM(s.serve_aces), 0) +
         COALESCE(SUM(s.block_points), 0))::int AS points,
       CASE
         WHEN COALESCE(SUM(s.attack_attempts), 0) = 0 THEN 0
         ELSE ROUND(100.0 * COALESCE(SUM(s.attack_points), 0) /
           SUM(s.attack_attempts))::int
       END AS attack_ratio
     FROM players p
     LEFT JOIN match_player_stats s ON s.player_id = p.id
     WHERE p.active = TRUE AND p.role = 'Joueur'
     GROUP BY p.id
     ORDER BY points DESC, p.number NULLS LAST, p.last_name, p.first_name`,
  );
  return rows;
}

export async function recordPlayerAction(matchId, playerId, action, delta) {
  if (!ALLOWED_ACTIONS.has(action)) {
    throw Object.assign(new Error("Action statistique non autorisée."), {
      status: 400,
    });
  }

  const column = action;
  const recorded = await withTransaction(async (client) => {
    const match = await client.query(
      `SELECT m.id
       FROM matches m
       JOIN players p ON p.id = $2 AND p.active = TRUE
       WHERE m.id = $1 AND m.status <> 'Terminé'
       FOR UPDATE OF m`,
      [matchId, playerId],
    );
    if (match.rowCount === 0) return false;

    await client.query(
      `INSERT INTO match_player_stats (match_id, player_id)
       VALUES ($1, $2)
       ON CONFLICT (match_id, player_id) DO NOTHING`,
      [matchId, playerId],
    );
    const current = await client.query(
      `SELECT ${column} FROM match_player_stats
       WHERE match_id = $1 AND player_id = $2 FOR UPDATE`,
      [matchId, playerId],
    );
    const before = Number(current.rows[0][column]);
    const after = Math.max(0, before + delta);
    if (after === before) return true;

    await client.query(
      `UPDATE match_player_stats
       SET ${column} = $3, updated_at = NOW()
       WHERE match_id = $1 AND player_id = $2`,
      [matchId, playerId, after],
    );
    await client.query(
      `INSERT INTO match_action_history (match_id, player_id, action, delta)
       VALUES ($1, $2, $3, $4)`,
      [matchId, playerId, action, after - before],
    );
    return true;
  });

  if (!recorded) return null;
  const stats = await getMatchStatistics(matchId);
  return stats.find((player) => Number(player.id) === playerId) ?? null;
}

export async function updatePlayerSetsPlayed(matchId, playerId, setsPlayed) {
  const { rows } = await query(
    `INSERT INTO match_player_stats (match_id, player_id, sets_played)
     SELECT m.id, p.id, $3
     FROM matches m
     JOIN players p ON p.id = $2 AND p.active = TRUE
     WHERE m.id = $1
     ON CONFLICT (match_id, player_id) DO UPDATE
       SET sets_played = EXCLUDED.sets_played, updated_at = NOW()
     RETURNING player_id`,
    [matchId, playerId, setsPlayed],
  );
  if (rows.length === 0) return null;
  const stats = await getMatchStatistics(matchId);
  return stats.find((player) => Number(player.id) === playerId) ?? null;
}

export async function undoLastPlayerAction(matchId) {
  const playerId = await withTransaction(async (client) => {
    const match = await client.query(
      "SELECT status FROM matches WHERE id = $1 FOR UPDATE",
      [matchId],
    );
    if (match.rowCount === 0 || match.rows[0].status === "Terminé") return null;

    const latest = await client.query(
      `SELECT id, player_id, action, delta
       FROM match_action_history
       WHERE match_id = $1 AND undone_at IS NULL
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [matchId],
    );
    if (latest.rowCount === 0) return null;

    const { id, player_id: playerId, action, delta } = latest.rows[0];
    if (!ALLOWED_ACTIONS.has(action)) {
      throw Object.assign(new Error("Action statistique enregistrée invalide."), {
        status: 500,
      });
    }
    await client.query(
      `UPDATE match_player_stats
       SET ${action} = GREATEST(0, ${action} - $3), updated_at = NOW()
       WHERE match_id = $1 AND player_id = $2`,
      [matchId, playerId, delta],
    );
    await client.query(
      "UPDATE match_action_history SET undone_at = NOW() WHERE id = $1",
      [id],
    );
    return Number(playerId);
  });

  if (playerId === null) return null;
  const stats = await getMatchStatistics(matchId);
  return stats.find((player) => Number(player.id) === playerId) ?? null;
}
