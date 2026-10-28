import { Router } from "express";
import {
  matchStatistics,
  seasonProgression,
  undoPlayerAction,
  updatePlayerAction,
  updatePlayerSets,
} from "../controllers/statisticsController.js";
import { requireAuth, requireCoach } from "../middleware/auth.js";

const router = Router();
router.get("/progression", seasonProgression);
router.get("/matches/:matchId", matchStatistics);
router.post("/matches/:matchId/players/:playerId", requireAuth, requireCoach, updatePlayerAction);
router.put("/matches/:matchId/players/:playerId/sets", requireAuth, requireCoach, updatePlayerSets);
router.post("/matches/:matchId/undo", requireAuth, requireCoach, undoPlayerAction);

export default router;
