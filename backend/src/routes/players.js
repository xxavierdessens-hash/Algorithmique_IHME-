import { Router } from "express";
import {
  createPlayer,
  deletePlayer,
  listPlayers,
  updatePlayer,
} from "../controllers/playersController.js";

const router = Router();
router.get("/", listPlayers);
router.post("/", createPlayer);
router.put("/:id", updatePlayer);
router.delete("/:id", deletePlayer);

export default router;
