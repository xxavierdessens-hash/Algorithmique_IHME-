import { query } from "../config/database.js";

export async function listPlayers(_request, response) {
  const { rows } = await query(
    `SELECT id, name, jersey_number, position
     FROM players
     WHERE active = TRUE
     ORDER BY jersey_number NULLS LAST, name`,
  );
  response.json(rows);
}
