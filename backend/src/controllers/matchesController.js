import { query } from "../config/database.js";

export async function listMatches(_request, response) {
  const { rows } = await query(
    `SELECT id, opponent, venue, match_date, status
     FROM matches
     ORDER BY match_date ASC`,
  );
  response.json(rows);
}
