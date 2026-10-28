const API_URL = import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : import.meta.env.BASE_URL.replace(/\/$/, ""));

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 204) return null;

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("La réponse du serveur n'est pas un JSON valide.");
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Erreur API (${response.status})`);
  }

  return payload;
}

export const api = {
  getMatches: () => request("/api/matches"),
  getTrainings: () => request("/api/trainings"),
  getAttendance: () => request("/api/attendance"),
  setAttendance: (playerId, eventType, eventId, status) =>
    request("/api/attendance", {
      method: "PUT",
      body: JSON.stringify({
        player_id: Number(playerId),
        event_type: eventType,
        event_id: Number(eventId),
        status,
      }),
    }),
  createTraining: (training) =>
    request("/api/trainings", {
      method: "POST",
      body: JSON.stringify(training),
    }),
  updateTraining: (trainingId, training) =>
    request(`/api/trainings/${trainingId}`, {
      method: "PUT",
      body: JSON.stringify(training),
    }),
  deleteTraining: (trainingId) =>
    request(`/api/trainings/${trainingId}`, { method: "DELETE" }),
  replaceTrainingDrills: (trainingId, drills) =>
    request(`/api/trainings/${trainingId}/drills`, {
      method: "PUT",
      body: JSON.stringify({ drills }),
    }),
  getDrills: (category) => {
    const parameters = new URLSearchParams();
    if (category) parameters.set("category", category);
    const query = parameters.toString();
    return request(`/api/drills${query ? `?${query}` : ""}`);
  },
  createDrill: (drill) =>
    request("/api/drills", {
      method: "POST",
      body: JSON.stringify(drill),
    }),
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
  getPlayers: (role) => {
    const query = role ? `?role=${encodeURIComponent(role)}` : "";
    return request(`/api/players${query}`);
  },
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
  updatePlayerSets: (matchId, playerId, setsPlayed) =>
    request(`/api/statistics/matches/${matchId}/players/${playerId}/sets`, {
      method: "PUT",
      body: JSON.stringify({ sets_played: setsPlayed }),
    }),
  undoLastAction: (matchId) =>
    request(`/api/statistics/matches/${matchId}/undo`, { method: "POST" }),
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
