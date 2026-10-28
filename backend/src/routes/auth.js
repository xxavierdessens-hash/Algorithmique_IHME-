import { Router } from "express";
import {
  loginCoach,
  loginCoachDemo,
  loginPlayer,
} from "../controllers/authController.js";

const router = Router();
router.post("/player", loginPlayer);
router.post("/coach", loginCoach);
router.post("/coach-demo", loginCoachDemo);

export default router;
