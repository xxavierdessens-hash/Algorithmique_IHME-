import { query, withTransaction } from "../config/database.js";

const MATCH_STATUSES = new Set(["À venir", "En cours", "Terminé"]);

function parseMatchId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isValidMatchDate(value) {
  return typeof value === "string" && value.trim() !== "" &&
    !Number.isNaN(Date.parse(value));
}

export async function listMatches(_request, response) {
  const { rows } = await query(
    `SELECT id, opponent, location, location AS venue, match_date, status,
            score_home, score_away, current_set_home, current_set_away,
            sets_score, points_detail
     FROM matches
     ORDER BY match_date ASC`,
  );
  response.json(rows);
}

export async function createMatch(request, response) {
  const {
    opponent,
    match_date: matchDate,
    location,
    sets_score: requestedSetsScore,
    points_detail: pointsDetail,
  } = request.body ?? {};
  const setsScoreParts = typeof requestedSetsScore === "string"
    ? /^(\d+)-(\d+)$/.exec(requestedSetsScore)
    : null;
  const scoreHome = request.body?.score_home ??
    (setsScoreParts ? Number(setsScoreParts[1]) : 0);
  const scoreAway = request.body?.score_away ??
    (setsScoreParts ? Number(setsScoreParts[2]) : 0);
  if (
    typeof opponent !== "string" || opponent.trim() === "" ||
    !isValidMatchDate(matchDate) ||
    (location !== undefined && location !== null && typeof location !== "string") ||
    !Number.isInteger(scoreHome) || scoreHome < 0 ||
    !Number.isInteger(scoreAway) || scoreAway < 0 ||
    (requestedSetsScore !== undefined && !setsScoreParts) ||
    (pointsDetail !== undefined && pointsDetail !== null &&
      (typeof pointsDetail !== "object" ||
        (!Array.isArray(pointsDetail) && Object.getPrototypeOf(pointsDetail) !== Object.prototype)))
  ) {
    return response.status(400).json({
      error: "L'adversaire, la date et le score doivent être valides ; le détail des points doit être un objet ou une liste JSON.",
    });
  }

  const createdMatch = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO matches (
         opponent, match_date, location, score_home, score_away, sets_score, points_detail
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING id, opponent, location, location AS venue, match_date, status,
                 score_home, score_away, current_set_home, current_set_away,
                 sets_score, points_detail`,
      [
        opponent.trim(),
        new Date(matchDate).toISOString(),
        location?.trim() || null,
        scoreHome,
        scoreAway,
        `${scoreHome}-${scoreAway}`,
        pointsDetail == null ? null : JSON.stringify(pointsDetail),
      ],
    );
    await client.query(
      `INSERT INTO attendance (player_id, event_type, event_id, status)
       SELECT id, 'Match', $1, 'En attente'
       FROM players
       WHERE active = TRUE AND $2::timestamptz >= CURRENT_DATE
       ON CONFLICT (player_id, event_type, event_id) DO NOTHING`,
      [rows[0].id, new Date(matchDate).toISOString()],
    );
    return rows[0];
  });
  response.status(201).json(createdMatch);
}

export async function updateMatch(request, response) {
  const id = parseMatchId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Identifiant de match invalide." });
  }

  const body = request.body ?? {};
  const {
    status,
    score_home: scoreHome,
    score_away: scoreAway,
    current_set_home: currentSetHome,
    current_set_away: currentSetAway,
    sets_score: requestedSetsScore,
    points_detail: pointsDetail,
  } = body;
  const setsScoreParts = typeof requestedSetsScore === "string"
    ? /^(\d+)-(\d+)$/.exec(requestedSetsScore)
    : null;
  const normalizedScoreHome = scoreHome ??
    (setsScoreParts ? Number(setsScoreParts[1]) : undefined);
  const normalizedScoreAway = scoreAway ??
    (setsScoreParts ? Number(setsScoreParts[2]) : undefined);
  const normalizedSetsScore = requestedSetsScore ?? null;
  if (
    (status === undefined && scoreHome === undefined && scoreAway === undefined &&
      currentSetHome === undefined && currentSetAway === undefined &&
      requestedSetsScore === undefined && pointsDetail === undefined) ||
    (status !== undefined && !MATCH_STATUSES.has(status)) ||
    (requestedSetsScore !== undefined && !setsScoreParts) ||
    (normalizedScoreHome !== undefined &&
      (!Number.isInteger(normalizedScoreHome) || normalizedScoreHome < 0)) ||
    (normalizedScoreAway !== undefined &&
      (!Number.isInteger(normalizedScoreAway) || normalizedScoreAway < 0)) ||
    (currentSetHome !== undefined &&
      (!Number.isInteger(currentSetHome) || currentSetHome < 0)) ||
    (currentSetAway !== undefined &&
      (!Number.isInteger(currentSetAway) || currentSetAway < 0)) ||
    (pointsDetail !== undefined && pointsDetail !== null &&
      (typeof pointsDetail !== "object" ||
        (!Array.isArray(pointsDetail) && Object.getPrototypeOf(pointsDetail) !== Object.prototype)))
  ) {
    return response.status(400).json({
      error: "Fournissez des valeurs valides pour le statut, le score et le détail des points.",
    });
  }

  if (status !== undefined || currentSetHome !== undefined || currentSetAway !== undefined) {
    const current = await query("SELECT status FROM matches WHERE id = $1", [id]);
    if (current.rowCount === 0) {
      return response.status(404).json({ error: "Match introuvable." });
    }
    if (
      current.rows[0].status === "Terminé" &&
      ((status !== undefined && status !== "Terminé") ||
        currentSetHome !== undefined || currentSetAway !== undefined)
    ) {
      return response.status(409).json({
        error: "Le match est terminé. Seule la correction de son score final est autorisée.",
      });
    }
  }

  const { rows } = await query(
    `UPDATE matches
     SET status = COALESCE($2, status),
         score_home = COALESCE($3, score_home),
         score_away = COALESCE($4, score_away),
         current_set_home = COALESCE($5, current_set_home),
         current_set_away = COALESCE($6, current_set_away),
         sets_score = COALESCE(
           $7,
           CASE WHEN $3 IS NOT NULL OR $4 IS NOT NULL
             THEN COALESCE($3, score_home)::text || '-' || COALESCE($4, score_away)::text
             ELSE sets_score
           END
         ),
         points_detail = CASE WHEN $9 THEN $8::jsonb ELSE points_detail END
     WHERE id = $1
     RETURNING id, opponent, location, location AS venue, match_date, status,
               score_home, score_away, current_set_home, current_set_away,
               sets_score, points_detail`,
    [
      id,
      status ?? null,
      normalizedScoreHome ?? null,
      normalizedScoreAway ?? null,
      currentSetHome ?? null,
      currentSetAway ?? null,
      normalizedSetsScore,
      pointsDetail == null ? null : JSON.stringify(pointsDetail),
      Object.prototype.hasOwnProperty.call(body, "points_detail"),
    ],
  );
  if (rows.length === 0) {
    return response.status(404).json({ error: "Match introuvable." });
  }
  response.json(rows[0]);
}

export async function deleteMatch(request, response) {
  const id = parseMatchId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Identifiant de match invalide." });
  }

  const deleted = await withTransaction(async (client) => {
    const match = await client.query(
      "SELECT id FROM matches WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (match.rowCount === 0) return false;
    await client.query(
      "DELETE FROM attendance WHERE event_type = 'Match' AND event_id = $1",
      [id],
    );
    await client.query("DELETE FROM matches WHERE id = $1", [id]);
    return true;
  });
  if (!deleted) {
    return response.status(404).json({ error: "Match introuvable." });
  }
  response.status(204).end();
}
