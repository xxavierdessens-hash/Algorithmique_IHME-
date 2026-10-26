import { Router } from "express";
import {
  createMatch,
  deleteMatch,
  listMatches,
  updateMatch,
} from "../controllers/matchesController.js";

const router = Router();
router.get("/", listMatches);
router.post("/", createMatch);
router.put("/:id", updateMatch);
router.delete("/:id", deleteMatch);

export default router;
