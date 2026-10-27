import { query, withTransaction } from "../config/database.js";

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function trainingPayload(body) {
  const date = body?.date;
  const startTime = body?.start_time;
  const endTime = body?.end_time;
  const location = typeof body?.location === "string" ? body.location.trim() : "";
  const theme = typeof body?.theme === "string" ? body.theme.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  const validDate = typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  const validTime = (time) =>
    typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  if (
    !validDate || !validTime(startTime) || !validTime(endTime) ||
    endTime <= startTime || !location || location.length > 200 ||
    !theme || theme.length > 160 || notes.length > 4000
  ) {
    return null;
  }
  return {
    date,
    startTime: `${startTime}:00`,
    endTime: `${endTime}:00`,
    location,
    theme,
    notes,
  };
}

const TRAINING_SELECT = `
  SELECT t.id, t.date, t.start_time, t.end_time, t.location, t.theme, t.notes,
         COALESCE(
           json_agg(
             json_build_object(
               'id', d.id,
               'title', d.title,
               'category', d.category,
               'description', d.description,
               'min_players', d.min_players,
               'source_url', d.source_url,
               'is_custom', d.is_custom,
               'duration_minutes', td.duration_minutes,
               'order_index', td.order_index
             ) ORDER BY td.order_index
           ) FILTER (WHERE d.id IS NOT NULL),
           '[]'::json
         ) AS drills
  FROM trainings t
  LEFT JOIN training_drills td ON td.training_id = t.id
  LEFT JOIN drills d ON d.id = td.drill_id`;

export async function listTrainings(_request, response) {
  const { rows } = await query(
    `${TRAINING_SELECT}
     GROUP BY t.id
     ORDER BY t.date ASC, t.start_time ASC`,
  );
  response.json(rows);
}

export async function createTraining(request, response) {
  const training = trainingPayload(request.body);
  if (!training) {
    return response.status(400).json({
      error: "Renseignez une date, un créneau valide, un lieu et un thème.",
    });
  }
  const { rows } = await query(
    `INSERT INTO trainings (date, start_time, end_time, location, theme, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, date, start_time, end_time, location, theme, notes`,
    [
      training.date,
      training.startTime,
      training.endTime,
      training.location,
      training.theme,
      training.notes,
    ],
  );
  response.status(201).json({ ...rows[0], drills: [] });
}

export async function updateTraining(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Identifiant de séance invalide." });
  }
  const training = trainingPayload(request.body);
  if (!training) {
    return response.status(400).json({
      error: "Renseignez une date, un créneau valide, un lieu et un thème.",
    });
  }
  const { rows } = await query(
    `UPDATE trainings
     SET date = $2, start_time = $3, end_time = $4,
         location = $5, theme = $6, notes = $7
     WHERE id = $1
     RETURNING id`,
    [
      id,
      training.date,
      training.startTime,
      training.endTime,
      training.location,
      training.theme,
      training.notes,
    ],
  );
  if (!rows.length) {
    return response.status(404).json({ error: "Séance introuvable." });
  }
  const result = await query(
    `${TRAINING_SELECT}
     WHERE t.id = $1
     GROUP BY t.id`,
    [id],
  );
  response.json(result.rows[0]);
}

export async function deleteTraining(request, response) {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: "Identifiant de séance invalide." });
  }
  const result = await query("DELETE FROM trainings WHERE id = $1", [id]);
  if (!result.rowCount) {
    return response.status(404).json({ error: "Séance introuvable." });
  }
  response.status(204).end();
}

export async function replaceTrainingDrills(request, response) {
  const trainingId = parseId(request.params.id);
  const entries = request.body?.drills;
  if (!trainingId) {
    return response.status(400).json({ error: "Identifiant de séance invalide." });
  }
  if (
    !Array.isArray(entries) ||
    entries.length > 40 ||
    entries.some((entry) =>
      !Number.isInteger(entry?.drill_id) || entry.drill_id <= 0 ||
      !Number.isInteger(entry?.duration_minutes) ||
      entry.duration_minutes < 1 || entry.duration_minutes > 600
    ) ||
    new Set(entries.map((entry) => entry.drill_id)).size !== entries.length
  ) {
    return response.status(400).json({
      error: "La liste doit contenir des exercices distincts avec une durée de 1 à 600 minutes.",
    });
  }

  const updated = await withTransaction(async (client) => {
    const training = await client.query(
      "SELECT id FROM trainings WHERE id = $1 FOR UPDATE",
      [trainingId],
    );
    if (!training.rowCount) return false;

    if (entries.length) {
      const drillIds = entries.map((entry) => entry.drill_id);
      const drills = await client.query(
        "SELECT id FROM drills WHERE id = ANY($1::bigint[])",
        [drillIds],
      );
      if (drills.rowCount !== drillIds.length) {
        throw Object.assign(new Error("Un ou plusieurs exercices sont introuvables."), {
          status: 404,
        });
      }
    }

    await client.query("DELETE FROM training_drills WHERE training_id = $1", [trainingId]);
    for (const [orderIndex, entry] of entries.entries()) {
      await client.query(
        `INSERT INTO training_drills (training_id, drill_id, duration_minutes, order_index)
         VALUES ($1, $2, $3, $4)`,
        [trainingId, entry.drill_id, entry.duration_minutes, orderIndex],
      );
    }
    return true;
  });
  if (!updated) {
    return response.status(404).json({ error: "Séance introuvable." });
  }
  const result = await query(
    `${TRAINING_SELECT}
     WHERE t.id = $1
     GROUP BY t.id`,
    [trainingId],
  );
  response.json(result.rows[0]);
}
