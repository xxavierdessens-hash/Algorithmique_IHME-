import { query } from "../config/database.js";

export async function healthController(_request, response) {
  await query("SELECT 1");
  response.json({ status: "ok", database: "connected" });
}
