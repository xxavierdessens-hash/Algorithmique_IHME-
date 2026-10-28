import { Router } from "express";
import { createDrill, listDrills } from "../controllers/drillsController.js";
import { requireAuth, requireCoach } from "../middleware/auth.js";

const router = Router();
router.get("/", listDrills);
router.post("/", requireAuth, requireCoach, createDrill);

export default router;
