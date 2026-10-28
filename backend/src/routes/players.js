import { Router } from "express";
import {
  createPlayer,
  deletePlayer,
  listPlayers,
  updatePlayer,
} from "../controllers/playersController.js";
import { requireAuth, requireCoach } from "../middleware/auth.js";

const router = Router();
router.get("/", listPlayers);
router.post("/", requireAuth, requireCoach, createPlayer);
router.put("/:id", requireAuth, requireCoach, updatePlayer);
router.delete("/:id", requireAuth, requireCoach, deletePlayer);

export default router;
