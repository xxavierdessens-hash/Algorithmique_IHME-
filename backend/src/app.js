import cors from "cors";
import express from "express";
import matchesRouter from "./routes/matches.js";
import playersRouter from "./routes/players.js";
import statisticsRouter from "./routes/statistics.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthController } from "./controllers/healthController.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", healthController);
app.use("/api/matches", matchesRouter);
app.use("/api/players", playersRouter);
app.use("/api/statistics", statisticsRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
