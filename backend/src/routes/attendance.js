import { Router } from "express";
import {
  listAttendance,
  setAttendance,
} from "../controllers/attendanceController.js";
import { requireAttendanceAccess, requireAuth } from "../middleware/auth.js";

const router = Router();
router.get("/", listAttendance);
router.put("/", requireAuth, requireAttendanceAccess, setAttendance);

export default router;
