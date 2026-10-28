import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 7;
const allowedRoles = new Set(["Coach", "Joueur", "Invité"]);

function tokenKey() {
  const configuredSecret = process.env.STATSVOLLEY_AUTH_SECRET;
  const source = configuredSecret || process.env.DATABASE_URL;
  if (!source) return null;
  if (configuredSecret && Buffer.byteLength(configuredSecret) < 32) {
    throw new Error("STATSVOLLEY_AUTH_SECRET must contain at least 32 bytes.");
  }
  return createHmac("sha256", "statsvolley-token-key-v1")
    .update(source)
    .digest();
}

function sign(payload, key) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createAccessToken(user) {
  const key = tokenKey();
  if (!key) throw new Error("Configure DATABASE_URL or STATSVOLLEY_AUTH_SECRET.");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: String(user.id),
    role: user.role,
    name: user.name,
    email: user.email,
    playerId: user.playerId == null ? null : String(user.playerId),
    iat: now,
    exp: now + TOKEN_LIFETIME_SECONDS,
  })).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

function verifyAccessToken(token) {
  const key = tokenKey();
  if (!key) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, key));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof user.sub !== "string" ||
      !allowedRoles.has(user.role) ||
      typeof user.name !== "string" ||
      typeof user.email !== "string" ||
      !Number.isInteger(user.exp) ||
      user.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return user;
  } catch {
    return null;
  }
}

export function requireAuth(request, response, next) {
  const authorization = request.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  const user = match ? verifyAccessToken(match[1]) : null;
  if (!user) {
    return response.status(401).json({ error: "Connectez-vous pour effectuer cette action." });
  }
  request.auth = {
    id: user.sub,
    role: user.role,
    playerId: user.playerId,
    name: user.name,
    email: user.email,
  };
  next();
}

export function requireCoach(request, response, next) {
  if (request.auth?.role !== "Coach") {
    return response.status(request.auth ? 403 : 401).json({
      error: request.auth
        ? "Cette action est réservée au Coach."
        : "Connectez-vous comme Coach pour effectuer cette action.",
    });
  }
  next();
}

export function requireAttendanceAccess(request, response, next) {
  const user = request.auth;
  const playerId = request.body?.player_id;
  if (user?.role === "Coach") return next();
  if (
    user?.role === "Joueur" &&
    user.playerId !== null &&
    String(user.playerId) === String(playerId)
  ) return next();
  return response.status(user ? 403 : 401).json({
    error: user
      ? "Vous ne pouvez modifier que vos propres présences."
      : "Connectez-vous pour modifier une présence.",
  });
}
