import { Router } from "express";
import {
  createTraining,
  deleteTraining,
  listTrainings,
  replaceTrainingDrills,
  updateTraining,
} from "../controllers/trainingsController.js";
import { requireAuth, requireCoach } from "../middleware/auth.js";

const router = Router();
router.get("/", listTrainings);
router.post("/", requireAuth, requireCoach, createTraining);
router.put("/:id", requireAuth, requireCoach, updateTraining);
router.delete("/:id", requireAuth, requireCoach, deleteTraining);
router.put("/:id/drills", requireAuth, requireCoach, replaceTrainingDrills);

export default router;
