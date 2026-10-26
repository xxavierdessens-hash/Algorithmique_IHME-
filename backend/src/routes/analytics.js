import { Router } from "express";
import { progression } from "../controllers/analyticsController.js";

const router = Router();
router.get("/progression", progression);

export default router;
