import { query } from "../config/database.js";

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
    (COALESCE(s.attack_points, 0) + COALESCE(s.serve_aces, 0) +
      COALESCE(s.block_points, 0))::int AS points,
    CASE
      WHEN COALESCE(s.attack_attempts, 0) = 0 THEN 0
      ELSE ROUND(100.0 * COALESCE(s.attack_points, 0) / s.attack_attempts)::int
    END AS attack_ratio
  FROM players p
  LEFT JOIN match_player_stats s ON s.player_id = p.id AND s.match_id = $1
  WHERE p.active = TRUE
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
       COUNT(DISTINCT s.match_id)::int AS matches_played,
       COALESCE(SUM(s.attack_points), 0)::int AS attack_points,
       COALESCE(SUM(s.attack_attempts), 0)::int AS attack_attempts,
       COALESCE(SUM(s.serve_aces), 0)::int AS serve_aces,
       COALESCE(SUM(s.block_points), 0)::int AS block_points,
       (COALESCE(SUM(s.attack_points), 0) + COALESCE(SUM(s.serve_aces), 0) +
         COALESCE(SUM(s.block_points), 0))::int AS points,
       CASE
         WHEN COALESCE(SUM(s.attack_attempts), 0) = 0 THEN 0
         ELSE ROUND(100.0 * COALESCE(SUM(s.attack_points), 0) /
           SUM(s.attack_attempts))::int
       END AS attack_ratio
     FROM players p
     LEFT JOIN match_player_stats s ON s.player_id = p.id
     WHERE p.active = TRUE
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
  const { rows } = await query(
    `INSERT INTO match_player_stats (match_id, player_id, ${column})
     SELECT $1, p.id, GREATEST(0, $3)
     FROM players p
     JOIN matches m ON m.id = $1
     WHERE p.id = $2 AND p.active = TRUE AND m.status <> 'Terminé'
     ON CONFLICT (match_id, player_id) DO UPDATE
       SET ${column} = GREATEST(0, match_player_stats.${column} + $3),
           updated_at = NOW()
     RETURNING player_id`,
    [matchId, playerId, delta],
  );

  if (rows.length === 0) return null;
  const stats = await getMatchStatistics(matchId);
  return stats.find((player) => Number(player.id) === playerId) ?? null;
}
