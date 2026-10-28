import { Router } from "express";
import {
  listAttendance,
  setAttendance,
} from "../controllers/attendanceController.js";

const router = Router();
router.get("/", listAttendance);
router.put("/", setAttendance);

export default router;
