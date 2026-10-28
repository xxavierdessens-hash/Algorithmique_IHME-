import { query } from "../config/database.js";

const STAT_TYPES = new Set([
  "attack_efficiency",
  "kills",
  "aces",
  "blocks",
  "total_points",
]);
const PERIODS = new Set(["all", "last_3", "last_5"]);
const POSITIONS = new Set(["Passeur", "R4", "Central", "Pointu", "Libéro"]);

function summarize(stats) {
  const attackPoints = Number(stats.attack_points || 0);
  const attackAttempts = Number(stats.attack_attempts || 0);
  const attackErrors = Number(stats.attack_errors || 0);
  const aces = Number(stats.serve_aces || 0);
  const serveErrors = Number(stats.serve_errors || 0);
  const blocks = Number(stats.block_points || 0);
  return {
    attack_points: attackPoints,
    attack_attempts: attackAttempts,
    attack_errors: attackErrors,
    serve_aces: aces,
    serve_errors: serveErrors,
    block_points: blocks,
    total_points: attackPoints + aces + blocks,
    attack_efficiency: attackPoints + attackErrors
      ? 100 * attackPoints / (attackPoints + attackErrors)
      : 0,
  };
}

function metricValue(stats, statType) {
  if (statType === "kills") return stats.attack_points;
  if (statType === "aces") return stats.serve_aces;
  if (statType === "blocks") return stats.block_points;
  return stats[statType];
}

export async function progression(request, response) {
  const playerFilter = request.query.player_id ?? "all";
  const statType = request.query.stat_type ?? "total_points";
  const period = request.query.period ?? "all";
  const position = request.query.position || null;
  const playerId = playerFilter === "all" ? null : Number(playerFilter);

  if (
    (playerFilter !== "all" &&
      (!Number.isInteger(playerId) || playerId <= 0)) ||
    !STAT_TYPES.has(statType) ||
    !PERIODS.has(period) ||
    (position !== null && !POSITIONS.has(position))
  ) {
    return response.status(400).json({
      error: "Filtres invalides. Vérifiez player_id, stat_type, period et position.",
    });
  }

  if (playerId !== null) {
    const player = await query(
      "SELECT id FROM players WHERE id = $1 AND active = TRUE AND role = 'Joueur'",
      [playerId],
    );
    if (player.rowCount === 0) {
      return response.status(404).json({ error: "Joueur introuvable." });
    }
  }

  const { rows } = await query(
    `SELECT m.id AS match_id, m.opponent, m.match_date,
            p.id AS player_id,
            COALESCE(s.attack_points, 0)::int AS attack_points,
            COALESCE(s.attack_attempts, 0)::int AS attack_attempts,
            COALESCE(s.attack_errors, 0)::int AS attack_errors,
            COALESCE(s.serve_aces, 0)::int AS serve_aces,
            COALESCE(s.serve_errors, 0)::int AS serve_errors,
            COALESCE(s.block_points, 0)::int AS block_points
     FROM matches m
     CROSS JOIN players p
     LEFT JOIN match_player_stats s
       ON s.match_id = m.id AND s.player_id = p.id
     WHERE m.status = 'Terminé' AND p.active = TRUE AND p.role = 'Joueur'
       AND ($1::text IS NULL OR p.position = $1)
     ORDER BY m.match_date ASC, p.id ASC`,
    [position],
  );

  const matches = new Map();
  for (const row of rows) {
    if (!matches.has(row.match_id)) {
      matches.set(row.match_id, {
        match_id: Number(row.match_id),
        opponent: row.opponent,
        match_date: row.match_date,
        players: [],
      });
    }
    const playerStats = summarize(row);
    matches.get(row.match_id).players.push({
      player_id: Number(row.player_id),
      stats: playerStats,
    });
  }

  let orderedMatches = [...matches.values()];
  if (period !== "all") {
    const limit = period === "last_3" ? 3 : 5;
    orderedMatches = orderedMatches.slice(-limit);
  }

  const series = orderedMatches.map((match) => {
    const selectedPlayers = playerId === null
      ? match.players
      : match.players.filter((player) => player.player_id === playerId);
    const values = selectedPlayers.map(({ stats }) => metricValue(stats, statType));
    const teamValues = match.players.map(({ stats }) => metricValue(stats, statType));
    const average = (items) => items.length
      ? items.reduce((sum, value) => sum + value, 0) / items.length
      : 0;
    return {
      match_id: match.match_id,
      opponent: match.opponent,
      match_date: match.match_date,
      value: average(values),
      team_average: average(teamValues),
      regularity_value: average(
        selectedPlayers.map(({ stats }) => stats.total_points),
      ),
      players: selectedPlayers.map(({ stats }) => stats),
      team_players: match.players.map(({ stats }) => stats),
    };
  });

  const values = series.map(({ value }) => value);
  const recordIndex = values.reduce(
    (best, value, index) => best === -1 || value > values[best] ? index : best,
    -1,
  );
  const selectedStats = series.flatMap((match) => match.players);
  const teamStats = series.flatMap((match) => match.team_players);
  const cumulativeTotal = (stats) => stats.reduce(
    (total, item) => total + (statType === "attack_efficiency"
      ? item.attack_points
      : metricValue(item, statType)),
    0,
  );
  const totalStats = (playerId === null ? teamStats : selectedStats)
    .reduce((total, item) => ({
      attack_points: total.attack_points + item.attack_points,
      attack_errors: total.attack_errors + item.attack_errors,
      serve_aces: total.serve_aces + item.serve_aces,
      serve_errors: total.serve_errors + item.serve_errors,
      block_points: total.block_points + item.block_points,
      total_points: total.total_points + item.total_points,
    }), {
      attack_points: 0,
      attack_errors: 0,
      serve_aces: 0,
      serve_errors: 0,
      block_points: 0,
      total_points: 0,
    });
  const matchCount = series.length;

  return response.json({
    filters: { player_id: playerFilter, stat_type: statType, period, position },
    kpis: {
      average_per_match: values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0,
      record_max: recordIndex < 0 ? null : {
        value: values[recordIndex],
        opponent: series[recordIndex].opponent,
        match_date: series[recordIndex].match_date,
      },
      cumulative_total: cumulativeTotal(playerId === null ? teamStats : selectedStats),
      attack_efficiency: totalStats.attack_points + totalStats.attack_errors
        ? 100 * totalStats.attack_points /
          (totalStats.attack_points + totalStats.attack_errors)
        : 0,
      total_points: totalStats.total_points,
      aces_per_match: matchCount ? totalStats.serve_aces / matchCount : 0,
      serve_errors: totalStats.serve_errors,
      blocks_per_match: matchCount ? totalStats.block_points / matchCount : 0,
    },
    time_series: series.map(({
      players: _players,
      team_players: _teamPlayers,
      regularity_value: _regularityValue,
      ...item
    }) => item),
  });
}
