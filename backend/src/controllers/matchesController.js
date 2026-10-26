import { query } from "../config/database.js";

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
            score_home, score_away, current_set_home, current_set_away
     FROM matches
     ORDER BY match_date ASC`,
  );
  response.json(rows);
}

export async function createMatch(request, response) {
  const { opponent, match_date: matchDate, location } = request.body ?? {};
  if (
    typeof opponent !== "string" || opponent.trim() === "" ||
    !isValidMatchDate(matchDate) ||
    (location !== undefined && location !== null && typeof location !== "string")
  ) {
    return response.status(400).json({
      error: "L'adversaire et une date valide sont obligatoires.",
    });
  }

  const { rows } = await query(
    `INSERT INTO matches (opponent, match_date, location)
     VALUES ($1, $2, $3)
     RETURNING id, opponent, location, location AS venue, match_date, status,
               score_home, score_away, current_set_home, current_set_away`,
    [opponent.trim(), new Date(matchDate).toISOString(), location?.trim() || null],
  );
  response.status(201).json(rows[0]);
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
  } = body;
  if (
    (status === undefined && scoreHome === undefined && scoreAway === undefined &&
      currentSetHome === undefined && currentSetAway === undefined) ||
    (status !== undefined && !MATCH_STATUSES.has(status)) ||
    (scoreHome !== undefined && (!Number.isInteger(scoreHome) || scoreHome < 0)) ||
    (scoreAway !== undefined && (!Number.isInteger(scoreAway) || scoreAway < 0)) ||
    (currentSetHome !== undefined &&
      (!Number.isInteger(currentSetHome) || currentSetHome < 0)) ||
    (currentSetAway !== undefined &&
      (!Number.isInteger(currentSetAway) || currentSetAway < 0))
  ) {
    return response.status(400).json({
      error: "Fournissez un statut valide et/ou des scores entiers positifs ou nuls.",
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
         current_set_away = COALESCE($6, current_set_away)
     WHERE id = $1
     RETURNING id, opponent, location, location AS venue, match_date, status,
               score_home, score_away, current_set_home, current_set_away`,
    [
      id,
      status ?? null,
      scoreHome ?? null,
      scoreAway ?? null,
      currentSetHome ?? null,
      currentSetAway ?? null,
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

  const result = await query("DELETE FROM matches WHERE id = $1", [id]);
  if (result.rowCount === 0) {
    return response.status(404).json({ error: "Match introuvable." });
  }
  response.status(204).end();
}
