import "dotenv/config";
import app from "./app.js";
import { closePool, initializeDatabase } from "./config/database.js";

const port = Number(process.env.PORT || 3000);

try {
  await initializeDatabase();
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`StatsVolley API listening on port ${port}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    });
  }
} catch (error) {
  console.error("Unable to start StatsVolley API:", error);
  await closePool();
  process.exit(1);
}
