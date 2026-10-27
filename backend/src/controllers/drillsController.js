import { query } from "../config/database.js";

const CATEGORIES = new Set([
  "Gammes",
  "Phase K1",
  "Phase K2",
  "Situationnel 6x6",
]);

function drillPayload(body) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const category = body?.category;
  const description = typeof body?.description === "string"
    ? body.description.trim()
    : "";
  const minPlayers = body?.min_players;
  const sourceUrl = typeof body?.source_url === "string"
    ? body.source_url.trim()
    : "";
  let parsedUrl = null;
  if (sourceUrl) {
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return null;
    }
  }
  if (
    !title || title.length > 160 || !CATEGORIES.has(category) ||
    !description || description.length > 4000 ||
    !Number.isInteger(minPlayers) || minPlayers < 1 || minPlayers > 100 ||
    (parsedUrl && !["http:", "https:"].includes(parsedUrl.protocol))
  ) {
    return null;
  }
  return { title, category, description, minPlayers, sourceUrl: sourceUrl || null };
}

export async function listDrills(request, response) {
  const category = request.query.category;
  if (category !== undefined && !CATEGORIES.has(category)) {
    return response.status(400).json({ error: "Catégorie d'exercice invalide." });
  }
  const { rows } = await query(
    `SELECT id, title, category, description, min_players, source_url, is_custom
     FROM drills
     WHERE $1::text IS NULL OR category = $1
     ORDER BY category, title`,
    [category ?? null],
  );
  response.json(rows);
}

export async function createDrill(request, response) {
  const drill = drillPayload(request.body);
  if (!drill) {
    return response.status(400).json({
      error: "Renseignez un titre, une catégorie, une description, un nombre de joueurs valide et un lien HTTP(S) facultatif.",
    });
  }
  const { rows } = await query(
    `INSERT INTO drills (
       title, category, description, min_players, source_url, is_custom
     )
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id, title, category, description, min_players, source_url, is_custom`,
    [
      drill.title,
      drill.category,
      drill.description,
      drill.minPlayers,
      drill.sourceUrl,
    ],
  );
  response.status(201).json(rows[0]);
}
