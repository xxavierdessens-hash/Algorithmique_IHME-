import { Router } from "express";
import { createDrill, listDrills } from "../controllers/drillsController.js";

const router = Router();
router.get("/", listDrills);
router.post("/", createDrill);

export default router;
