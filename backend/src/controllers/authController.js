import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { query } from "../config/database.js";
import { createAccessToken } from "../middleware/auth.js";

const COACH_EMAIL = (
  process.env.STATSVOLLEY_COACH_EMAIL || "xxavier.dessens@gmail.com"
).trim().toLowerCase();
const COACH_DEMO_PIN = process.env.STATSVOLLEY_COACH_DEMO_PIN || "1234";
const SCRYPT_COST = 16384;
const PASSWORD_BYTES = 64;

function normalizedEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

function normalizedName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function derivePassword(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      PASSWORD_BYTES,
      { N: SCRYPT_COST, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await derivePassword(password, salt);
  return `scrypt$${SCRYPT_COST}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, cost, saltValue, hashValue, extra] = storedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    cost !== String(SCRYPT_COST) ||
    !saltValue ||
    !hashValue ||
    extra !== undefined
  ) return false;
  const salt = Buffer.from(saltValue, "base64url");
  const expected = Buffer.from(hashValue, "base64url");
  if (salt.length !== 16 || expected.length !== PASSWORD_BYTES) return false;
  const actual = await derivePassword(password, salt);
  return timingSafeEqual(expected, actual);
}

function userProfile(row) {
  const user = {
    id: String(row.id),
    role: row.role,
    name: `${row.firstname} ${row.lastname}`.trim(),
    email: row.email,
    playerId: row.player_id == null ? null : String(row.player_id),
  };
  return { ...user, accessToken: createAccessToken(user) };
}

function validPassword(value) {
  return typeof value === "string" && value.length >= 10 && value.length <= 128;
}

export async function register(request, response) {
  const firstname = normalizedName(request.body?.firstname);
  const lastname = normalizedName(request.body?.lastname);
  const email = normalizedEmail(request.body?.email);
  const password = request.body?.password;

  if (
    !firstname || firstname.length > 100 ||
    !lastname || lastname.length > 100 ||
    !email || !validPassword(password)
  ) {
    return response.status(400).json({
      error: "Renseignez votre prénom, votre nom, un email valide et un mot de passe de 10 à 128 caractères.",
    });
  }

  let player = null;
  let role = "Invité";
  if (email === COACH_EMAIL) {
    const coach = await query(
      `SELECT id, first_name, last_name
       FROM players
       WHERE active = TRUE AND role = 'Coach' AND LOWER(email) = $1
       LIMIT 1`,
      [email],
    );
    if (!coach.rows.length) {
      return response.status(503).json({
        error: "Le compte Coach de démonstration n'est pas initialisé.",
      });
    }
    player = coach.rows[0];
    role = "Coach";
  } else {
    const rosterPlayer = await query(
      `SELECT id, first_name, last_name
       FROM players
       WHERE active = TRUE AND role = 'Joueur' AND LOWER(email) = $1
       LIMIT 1`,
      [email],
    );
    if (rosterPlayer.rows.length) {
      player = rosterPlayer.rows[0];
      role = "Joueur";
    }
  }

  const passwordHash = await hashPassword(password);
  try {
    const { rows } = await query(
      `INSERT INTO users (firstname, lastname, email, password_hash, role, player_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, firstname, lastname, email, role, player_id`,
      [firstname, lastname, email, passwordHash, role, player?.id ?? null],
    );
    return response.status(201).json(userProfile(rows[0]));
  } catch (error) {
    if (error.code === "23505" && error.constraint === "users_email_lower_unique_idx") {
      return response.status(409).json({ error: "Un compte utilise déjà cette adresse email." });
    }
    throw error;
  }
}

export async function login(request, response) {
  const email = normalizedEmail(request.body?.email);
  const password = request.body?.password;
  if (!email || typeof password !== "string" || password.length > 128) {
    return response.status(400).json({ error: "Saisissez un email et un mot de passe valides." });
  }

  const { rows } = await query(
    `SELECT id, firstname, lastname, email, password_hash, role, player_id
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [email],
  );
  if (!rows.length || !(await verifyPassword(password, rows[0].password_hash))) {
    return response.status(401).json({ error: "Email ou mot de passe incorrect." });
  }
  response.json(userProfile(rows[0]));
}

async function findCoach() {
  const { rows } = await query(
    `SELECT id, first_name, last_name, email
     FROM players
     WHERE active = TRUE AND role = 'Coach' AND LOWER(email) = $1
     LIMIT 1`,
    [COACH_EMAIL],
  );
  return rows[0] ?? null;
}

function securePinEquals(candidate, expected) {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length &&
    timingSafeEqual(candidateBytes, expectedBytes);
}

export async function loginCoachDemo(request, response) {
  const pin = typeof request.body?.pin === "string" ? request.body.pin.trim() : "";
  if (!securePinEquals(pin, COACH_DEMO_PIN)) {
    return response.status(401).json({ error: "Code PIN incorrect." });
  }
  const coach = await findCoach();
  if (!coach) {
    return response.status(503).json({
      error: "Le compte Coach de démonstration n'est pas initialisé.",
    });
  }

  const user = {
    id: "coach-demo",
    role: "Coach",
    name: `${coach.first_name} ${coach.last_name}`.trim(),
    email: coach.email,
    playerId: String(coach.id),
  };
  response.json({ ...user, accessToken: createAccessToken(user) });
}
