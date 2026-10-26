import { Router } from "express";
import { listPlayers } from "../controllers/playersController.js";

const router = Router();
router.get("/", listPlayers);

export default router;
