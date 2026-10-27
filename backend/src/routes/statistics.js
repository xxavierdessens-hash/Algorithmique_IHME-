import { Router } from "express";
import {
  matchStatistics,
  seasonProgression,
  undoPlayerAction,
  updatePlayerAction,
  updatePlayerSets,
} from "../controllers/statisticsController.js";

const router = Router();
router.get("/progression", seasonProgression);
router.get("/matches/:matchId", matchStatistics);
router.post("/matches/:matchId/players/:playerId", updatePlayerAction);
router.put("/matches/:matchId/players/:playerId/sets", updatePlayerSets);
router.post("/matches/:matchId/undo", undoPlayerAction);

export default router;
