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
  createMatch: (match) =>
    request("/api/matches", {
      method: "POST",
      body: JSON.stringify(match),
    }),
  updateMatch: (matchId, changes) =>
    request(`/api/matches/${matchId}`, {
      method: "PUT",
      body: JSON.stringify(changes),
    }),
  deleteMatch: (matchId) =>
    request(`/api/matches/${matchId}`, { method: "DELETE" }),
  getPlayers: () => request("/api/players"),
  createPlayer: (player) =>
    request("/api/players", {
      method: "POST",
      body: JSON.stringify(player),
    }),
  updatePlayer: (playerId, player) =>
    request(`/api/players/${playerId}`, {
      method: "PUT",
      body: JSON.stringify(player),
    }),
  deletePlayer: (playerId) =>
    request(`/api/players/${playerId}`, { method: "DELETE" }),
  getMatchStatistics: (matchId) =>
    request(`/api/statistics/matches/${matchId}`),
  getProgression: () => request("/api/statistics/progression"),
  getAnalyticsProgression: (filters) => {
    const parameters = new URLSearchParams(filters);
    return request(`/api/analytics/progression?${parameters.toString()}`);
  },
  recordAction: (matchId, playerId, action, delta) =>
    request(`/api/statistics/matches/${matchId}/players/${playerId}`, {
      method: "POST",
      body: JSON.stringify({ action, delta }),
    }),
};
