import { query, withTransaction } from "../config/database.js";

const PLAYER_POSITIONS = new Set(["Passeur", "R4", "Central", "Pointu", "Libéro"]);
const PLAYER_ROLES = new Set(["Coach", "Joueur", "Invité"]);
const PLAYER_FIELDS = `id, first_name, last_name, number, number AS jersey_number,
  CONCAT_WS(' ', first_name, last_name) AS name, position, role`;

function parsePlayerId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validatePlayer(body) {
  const firstName = typeof body?.first_name === "string" ? body.first_name.trim() : "";
  const lastName = typeof body?.last_name === "string" ? body.last_name.trim() : "";
  const { number, position } = body ?? {};
  const role = body?.role ?? "Joueur";
  const hasJersey = number !== undefined && number !== null && number !== "";

  if (
    !firstName || !lastName ||
    !PLAYER_ROLES.has(role) ||
    (role === "Joueur" && (!Number.isInteger(number) || number < 1 || number > 99)) ||
    (hasJersey && (!Number.isInteger(number) || number < 1 || number > 99)) ||
    (role === "Joueur" && !PLAYER_POSITIONS.has(position)) ||
    (position != null && position !== "" && !PLAYER_POSITIONS.has(position))
  ) {
    return null;
  }

  return {
    firstName,
    lastName,
    number: hasJersey ? number : null,
    position: position || null,
    role,
  };
}

function handleDuplicateNumber(error, response) {
  if (error.code !== "23505") throw error;
  response.status(409).json({ error: "Ce numéro est déjà attribué à un joueur." });
}

export async function listPlayers(request, response) {
  const role = request.query.role;
  if (role !== undefined && !PLAYER_ROLES.has(role)) {
    return response.status(400).json({ error: "Rôle de membre invalide." });
  }
  const { rows } = await query(
    `SELECT ${PLAYER_FIELDS}
     FROM players
     WHERE active = TRUE AND ($1::text IS NULL OR role = $1)
     ORDER BY number NULLS LAST, last_name, first_name`,
    [role ?? null],
  );
  response.json(rows);
}

export async function createPlayer(request, response) {
  const player = validatePlayer(request.body);
  if (!player) {
    return response.status(400).json({
      error: "Renseignez le prénom, le nom et un rôle valide ; les joueurs doivent aussi avoir un numéro et un poste valides.",
    });
  }

  try {
    const createdPlayer = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO players (first_name, last_name, number, position, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${PLAYER_FIELDS}`,
        [player.firstName, player.lastName, player.number, player.position, player.role],
      );
      await client.query(
        `INSERT INTO attendance (player_id, event_type, event_id, status)
         SELECT $1, 'Match', id, 'En attente'
         FROM matches
         WHERE status <> 'Terminé' AND match_date >= CURRENT_DATE
         ON CONFLICT (player_id, event_type, event_id) DO NOTHING`,
        [rows[0].id],
      );
      await client.query(
        `INSERT INTO attendance (player_id, event_type, event_id, status)
         SELECT $1, 'Training', id, 'En attente'
         FROM trainings
         WHERE date >= CURRENT_DATE
         ON CONFLICT (player_id, event_type, event_id) DO NOTHING`,
        [rows[0].id],
      );
      return rows[0];
    });
    response.status(201).json(createdPlayer);
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
      error: "Renseignez le prénom, le nom et un rôle valide ; les joueurs doivent aussi avoir un numéro et un poste valides.",
    });
  }

  try {
    const { rows } = await query(
      `UPDATE players
       SET first_name = $2, last_name = $3, number = $4, position = $5, role = $6
       WHERE id = $1 AND active = TRUE
       RETURNING ${PLAYER_FIELDS}`,
      [id, player.firstName, player.lastName, player.number, player.position, player.role],
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
