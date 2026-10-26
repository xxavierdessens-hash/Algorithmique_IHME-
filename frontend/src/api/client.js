const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Erreur API (${response.status})`);
  }

  return payload;
}

export const api = {
  getMatches: () => request("/api/matches"),
  getPlayers: () => request("/api/players"),
  getMatchStatistics: (matchId) =>
    request(`/api/statistics/matches/${matchId}`),
  getProgression: () => request("/api/statistics/progression"),
  recordAction: (matchId, playerId, action, delta) =>
    request(`/api/statistics/matches/${matchId}/players/${playerId}`, {
      method: "POST",
      body: JSON.stringify({ action, delta }),
    }),
};
