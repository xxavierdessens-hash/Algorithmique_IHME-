import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Database transaction rollback failed:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  const schemaPath = new URL("../../migrations/001_initial_schema.sql", import.meta.url);
  const seedPath = new URL("../../seeds/seed.sql", import.meta.url);
  const schema = await readFile(fileURLToPath(schemaPath), "utf8");
  const seed = await readFile(fileURLToPath(seedPath), "utf8");

  for (const script of [
    { type: "migration", version: "001_initial_schema", contents: schema },
    { type: "seed", version: "001_demo_seed", contents: seed },
  ]) {
    await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock($1)", [827361904]);
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_initialization_scripts (
          script_type TEXT NOT NULL CHECK (script_type IN ('migration', 'seed')),
          version TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (script_type, version)
        )
      `);

      const applied = await client.query(
        `SELECT 1
         FROM app_initialization_scripts
         WHERE script_type = $1 AND version = $2`,
        [script.type, script.version],
      );
      if (applied.rowCount > 0) return;

      await client.query(script.contents);
      await client.query(
        `INSERT INTO app_initialization_scripts (script_type, version)
         VALUES ($1, $2)`,
        [script.type, script.version],
      );
    });
  }
}

export function closePool() {
  return pool.end();
}
