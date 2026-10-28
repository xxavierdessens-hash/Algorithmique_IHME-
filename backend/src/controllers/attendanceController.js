import { query, withTransaction } from "../config/database.js";

const EVENT_TABLES = new Map([
  ["Match", "matches"],
  ["Training", "trainings"],
]);
const ATTENDANCE_STATUSES = new Set(["Présent", "Absent", "En attente"]);

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function listAttendance(request, response) {
  const { event_type: eventType, event_id: eventIdValue } = request.query;
  const hasEventType = eventType !== undefined;
  const hasEventId = eventIdValue !== undefined;
  if (
    hasEventType !== hasEventId ||
    (hasEventType && !EVENT_TABLES.has(eventType))
  ) {
    return response.status(400).json({
      error: "Fournissez un type d'événement (Match ou Training) et un identifiant valides.",
    });
  }

  const eventId = hasEventId ? parseId(eventIdValue) : null;
  if (hasEventId && !eventId) {
    return response.status(400).json({ error: "Identifiant d'événement invalide." });
  }

  const { rows } = await query(
    `SELECT a.id, a.player_id, a.event_type, a.event_id, a.status,
            p.first_name, p.last_name, p.number, p.position, p.role
     FROM attendance a
     JOIN players p ON p.id = a.player_id
     WHERE ($1::text IS NULL OR a.event_type = $1)
       AND ($2::bigint IS NULL OR a.event_id = $2)
     ORDER BY p.number NULLS LAST, p.last_name, p.first_name`,
    [eventType ?? null, eventId],
  );
  response.json(rows);
}

export async function setAttendance(request, response) {
  const {
    player_id: playerIdValue,
    event_type: eventType,
    event_id: eventIdValue,
    status,
  } = request.body ?? {};
  const playerId = parseId(playerIdValue);
  const eventId = parseId(eventIdValue);
  const eventTable = EVENT_TABLES.get(eventType);
  if (
    !playerId || !eventId || !eventTable ||
    !ATTENDANCE_STATUSES.has(status)
  ) {
    return response.status(400).json({
      error: "Fournissez un joueur, un événement et un statut de présence valides.",
    });
  }

  const savedAttendance = await withTransaction(async (client) => {
    const player = await client.query(
      "SELECT id FROM players WHERE id = $1 AND active = TRUE FOR KEY SHARE",
      [playerId],
    );
    if (player.rowCount === 0) return { missing: "player" };
    const event = await client.query(
      `SELECT id FROM ${eventTable} WHERE id = $1 FOR KEY SHARE`,
      [eventId],
    );
    if (event.rowCount === 0) return { missing: "event" };
    const { rows } = await client.query(
      `INSERT INTO attendance (player_id, event_type, event_id, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (player_id, event_type, event_id)
       DO UPDATE SET status = EXCLUDED.status
       RETURNING id, player_id, event_type, event_id, status`,
      [playerId, eventType, eventId, status],
    );
    return { attendance: rows[0] };
  });
  if (savedAttendance.missing === "player") {
    return response.status(404).json({ error: "Joueur introuvable." });
  }
  if (savedAttendance.missing === "event") {
    return response.status(404).json({ error: "Événement introuvable." });
  }
  response.json(savedAttendance.attendance);
}
