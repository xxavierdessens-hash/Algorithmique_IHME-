import { query } from "../config/database.js";
import {
  getMatchStatistics,
  getSeasonProgression,
  recordPlayerAction,
} from "../services/statisticsService.js";

export async function matchStatistics(request, response) {
  const matchId = Number(request.params.matchId);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return response.status(400).json({ error: "Identifiant de match invalide." });
  }

  const match = await query("SELECT id FROM matches WHERE id = $1", [matchId]);
  if (match.rowCount === 0) {
    return response.status(404).json({ error: "Match introuvable." });
  }

  response.json(await getMatchStatistics(matchId));
}

export async function seasonProgression(_request, response) {
  response.json(await getSeasonProgression());
}

export async function updatePlayerAction(request, response) {
  const matchId = Number(request.params.matchId);
  const playerId = Number(request.params.playerId);
  const { action, delta } = request.body ?? {};

  if (
    !Number.isInteger(matchId) || matchId <= 0 ||
    !Number.isInteger(playerId) || playerId <= 0
  ) {
    return response.status(400).json({ error: "Identifiant de match ou de joueur invalide." });
  }
  if (delta !== 1 && delta !== -1) {
    return response.status(400).json({ error: "delta doit être égal à 1 ou -1." });
  }

  const updated = await recordPlayerAction(matchId, playerId, action, delta);
  if (!updated) {
    const match = await query("SELECT status FROM matches WHERE id = $1", [matchId]);
    if (match.rows[0]?.status === "Terminé") {
      return response.status(409).json({
        error: "Le match est terminé et ses statistiques sont verrouillées.",
      });
    }
    return response.status(404).json({ error: "Match ou joueur introuvable." });
  }
  response.json(updated);
}
