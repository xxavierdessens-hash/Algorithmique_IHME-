import "dotenv/config";
import app from "./app.js";
import { closePool, initializeDatabase } from "./config/database.js";

const port = Number(process.env.PORT || 3000);
const transientDatabaseErrors = new Set([
  "57P03",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
]);

async function initializeDatabaseWithRetry() {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await initializeDatabase();
      return;
    } catch (error) {
      if (!transientDatabaseErrors.has(error.code) || attempt === maxAttempts) {
        throw error;
      }

      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
      console.warn(
        `Database is not ready (attempt ${attempt}/${maxAttempts}); retrying in ${delay} ms.`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

try {
  await initializeDatabaseWithRetry();
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
