import { Router } from "express";
import {
  createMatch,
  deleteMatch,
  listMatches,
  updateMatch,
} from "../controllers/matchesController.js";
import { requireAuth, requireCoach } from "../middleware/auth.js";

const router = Router();
router.get("/", listMatches);
router.post("/", requireAuth, requireCoach, createMatch);
router.put("/:id", requireAuth, requireCoach, updateMatch);
router.delete("/:id", requireAuth, requireCoach, deleteMatch);

export default router;
