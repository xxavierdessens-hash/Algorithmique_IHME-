import { Router } from "express";
import {
  matchStatistics,
  seasonProgression,
  updatePlayerAction,
} from "../controllers/statisticsController.js";

const router = Router();
router.get("/progression", seasonProgression);
router.get("/matches/:matchId", matchStatistics);
router.post("/matches/:matchId/players/:playerId", updatePlayerAction);

export default router;
