import { Router } from "express";
import {
  createTraining,
  deleteTraining,
  listTrainings,
  replaceTrainingDrills,
  updateTraining,
} from "../controllers/trainingsController.js";

const router = Router();
router.get("/", listTrainings);
router.post("/", createTraining);
router.put("/:id", updateTraining);
router.delete("/:id", deleteTraining);
router.put("/:id/drills", replaceTrainingDrills);

export default router;
