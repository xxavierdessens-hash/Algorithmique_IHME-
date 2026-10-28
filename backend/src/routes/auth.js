import { Router } from "express";
import {
  login,
  loginCoachDemo,
  register,
} from "../controllers/authController.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/coach-demo", loginCoachDemo);

export default router;
