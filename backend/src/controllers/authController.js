import { query } from "../config/database.js";

const COACH_EMAIL = (
  process.env.STATSVOLLEY_COACH_EMAIL || "xxavier.dessens@gmail.com"
).trim().toLowerCase();
const COACH_DEMO_PIN = process.env.STATSVOLLEY_COACH_DEMO_PIN || "1234";

function normalizedEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

function profileFromRow(row) {
  return {
    id: String(row.id),
    role: row.role,
    name: row.name,
    email: row.email,
  };
}

async function findCoach() {
  const { rows } = await query(
    `SELECT id, role, email, CONCAT_WS(' ', first_name, last_name) AS name
     FROM players
     WHERE active = TRUE AND role = 'Coach' AND LOWER(email) = $1
     LIMIT 1`,
    [COACH_EMAIL],
  );
  return rows[0] ?? null;
}

export async function loginPlayer(request, response) {
  const email = normalizedEmail(request.body?.email);
  if (!email) {
    return response.status(400).json({ error: "Saisissez une adresse email valide." });
  }
  const { rows } = await query(
    `SELECT id, role, email, CONCAT_WS(' ', first_name, last_name) AS name
     FROM players
     WHERE active = TRUE AND role = 'Joueur' AND LOWER(email) = $1
     LIMIT 1`,
    [email],
  );
  if (!rows.length) {
    return response.status(401).json({
      error: "Email non reconnu dans l'effectif du club.",
    });
  }
  response.json(profileFromRow(rows[0]));
}

export async function loginCoach(request, response) {
  const email = normalizedEmail(request.body?.email);
  if (!email) {
    return response.status(400).json({ error: "Saisissez une adresse email valide." });
  }
  if (email !== COACH_EMAIL) {
    return response.status(401).json({ error: "Adresse email Coach non reconnue." });
  }
  const coach = await findCoach();
  if (!coach) {
    return response.status(503).json({
      error: "Le compte Coach par défaut n'est pas initialisé. Vérifiez le seed de la base.",
    });
  }
  response.json(profileFromRow(coach));
}

export async function loginCoachDemo(request, response) {
  const pin = typeof request.body?.pin === "string" ? request.body.pin.trim() : "";
  if (pin !== COACH_DEMO_PIN) {
    return response.status(401).json({ error: "Code PIN incorrect." });
  }
  const coach = await findCoach();
  if (!coach) {
    return response.status(503).json({
      error: "Le compte Coach par défaut n'est pas initialisé. Vérifiez le seed de la base.",
    });
  }
  response.json(profileFromRow(coach));
}
