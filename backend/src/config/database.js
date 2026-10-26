import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : undefined,
);

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function initializeDatabase() {
  const schemaPath = new URL("../../migrations/001_initial_schema.sql", import.meta.url);
  const seedPath = new URL("../../seeds/seed.sql", import.meta.url);
  const schema = await readFile(fileURLToPath(schemaPath), "utf8");
  const seed = await readFile(fileURLToPath(seedPath), "utf8");

  await pool.query(schema);
  await pool.query(seed);
}

export function closePool() {
  return pool.end();
}
