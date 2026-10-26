import { Router } from "express";
import { listMatches } from "../controllers/matchesController.js";

const router = Router();
router.get("/", listMatches);

export default router;
