import cors from "cors";
import express from "express";
import matchesRouter from "./routes/matches.js";
import playersRouter from "./routes/players.js";
import statisticsRouter from "./routes/statistics.js";
import analyticsRouter from "./routes/analytics.js";
import trainingsRouter from "./routes/trainings.js";
import drillsRouter from "./routes/drills.js";
import attendanceRouter from "./routes/attendance.js";
import authRouter from "./routes/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthController } from "./controllers/healthController.js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = express();
const frontendDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const frontendIndex = fileURLToPath(new URL("../public/index.html", import.meta.url));

app.use(cors());
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", healthController);
app.use("/api/auth", authRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/players", playersRouter);
app.use("/api/statistics", statisticsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/trainings", trainingsRouter);
app.use("/api/drills", drillsRouter);
app.use("/api/attendance", attendanceRouter);

if (existsSync(frontendIndex)) {
  app.use(express.static(frontendDirectory, { index: false }));
  app.use((request, response, next) => {
    if (
      request.method !== "GET" ||
      request.path === "/api" ||
      request.path.startsWith("/api/")
    ) return next();
    response.sendFile(frontendIndex);
  });
}
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
