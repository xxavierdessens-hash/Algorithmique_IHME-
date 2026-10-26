import { query } from "../config/database.js";

const PLAYER_POSITIONS = new Set(["Passeur", "R4", "Central", "Pointu", "Libéro"]);
const PLAYER_FIELDS = `id, first_name, last_name, number, number AS jersey_number,
  CONCAT_WS(' ', first_name, last_name) AS name, position`;

function parsePlayerId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validatePlayer(body) {
  const firstName = typeof body?.first_name === "string" ? body.first_name.trim() : "";
  const lastName = typeof body?.last_name === "string" ? body.last_name.trim() : "";
  const { number, position } = body ?? {};

  if (
    !firstName || !lastName ||
    !Number.isInteger(number) || number < 1 || number > 99 ||
    !PLAYER_POSITIONS.has(position)
  ) {
    return null;
  }

  return { firstName, lastName, number, position };
}

function handleDuplicateNumber(error, response) {
  if (error.code !== "23505") throw error;
  response.status(409).json({ error: "Ce numéro est déjà attribué à un joueur." });
}

export async function listPlayers(_request, response) {
  const { rows } = await query(
    `SELECT ${PLAYER_FIELDS}
     FROM players
     WHERE active = TRUE
     ORDER BY number NULLS LAST, last_name, first_name`,
  );
  response.json(rows);
}

export async function createPlayer(request, response) {
  const player = validatePlayer(request.body);
  if (!player) {
    return response.status(400).json({
      error: "Renseignez le prénom, le nom, un numéro entre 1 et 99 et un poste valide.",
    });
  }

  try {
    const { rows } = await query(
      `INSERT INTO players (first_name, last_name, number, position)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PLAYER_FIELDS}`,
      [player.firstName, player.lastName, player.number, player.position],
    );
    response.status(201).json(rows[0]);
  } catch (error) {
    handleDuplicateNumber(error, response);
  }
}

export async function updatePlayer(request, response) {
  const id = parsePlayerId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Identifiant de joueur invalide." });
  }

  const player = validatePlayer(request.body);
  if (!player) {
    return response.status(400).json({
      error: "Renseignez le prénom, le nom, un numéro entre 1 et 99 et un poste valide.",
    });
  }

  try {
    const { rows } = await query(
      `UPDATE players
       SET first_name = $2, last_name = $3, number = $4, position = $5
       WHERE id = $1 AND active = TRUE
       RETURNING ${PLAYER_FIELDS}`,
      [id, player.firstName, player.lastName, player.number, player.position],
    );
    if (rows.length === 0) {
      return response.status(404).json({ error: "Joueur introuvable." });
    }
    response.json(rows[0]);
  } catch (error) {
    handleDuplicateNumber(error, response);
  }
}

export async function deletePlayer(request, response) {
  const id = parsePlayerId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Identifiant de joueur invalide." });
  }

  const result = await query(
    "DELETE FROM players WHERE id = $1 AND active = TRUE",
    [id],
  );
  if (result.rowCount === 0) {
    return response.status(404).json({ error: "Joueur introuvable." });
  }
  response.status(204).end();
}
