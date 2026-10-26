import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatusMessage from "../components/StatusMessage.jsx";

const ACTIONS = [
  { key: "attack_attempts", label: "Tentative", group: "Attaque", symbol: "↗" },
  { key: "attack_points", label: "Attaque gagnante", group: "Attaque", symbol: "↗" },
  { key: "attack_errors", label: "Faute d'attaque", group: "Attaque", symbol: "×" },
  { key: "serve_aces", label: "Ace", group: "Service", symbol: "✦" },
  { key: "serve_errors", label: "Faute de service", group: "Service", symbol: "×" },
  { key: "block_points", label: "Contre gagnant", group: "Bloc", symbol: "▥" },
];

export default function LiveMatchPage({ match }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(Boolean(match));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  useEffect(() => {
    let active = true;
    if (!match) {
      setPlayers([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError("");
    api.getMatchStatistics(match.id)
      .then((rows) => {
        if (active) setPlayers(rows);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [match]);

  async function updateStat(player, action, delta) {
    const key = `${player.id}-${action}`;
    setSaving(key);
    setError("");
    try {
      const updated = await api.recordAction(match.id, player.id, action, delta);
      setPlayers((current) =>
        current.map((item) => item.id === updated.id ? updated : item),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving("");
    }
  }

  if (!match) {
    return (
      <section className="empty-state">
        <span className="empty-state__icon" aria-hidden="true">◎</span>
        <h2>Aucun match sélectionné</h2>
        <p>Choisissez un match dans le calendrier pour ouvrir la feuille de stats live.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Feuille de match · {match.venue || "Lieu à confirmer"}</p>
          <h2>StatsVolley <span className="muted">vs</span> {match.opponent}</h2>
        </div>
        <span className="live-indicator"><i /> LIVE</span>
      </div>
      <p className="helper-text">Touchez + pour enregistrer une action, − pour la corriger.</p>
      <StatusMessage loading={loading} error={error}>
        <div className="live-table-wrap">
          <table className="live-table">
            <thead>
              <tr>
                <th>Joueur</th>
                {ACTIONS.map((action) => (
                  <th key={action.key}>
                    <span>{action.group}</span>
                    {action.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <th scope="row">
                    <span className="player-number">{player.jersey_number ?? "—"}</span>
                    <span>{player.name}</span>
                  </th>
                  {ACTIONS.map((action) => {
                    const count = Number(player[action.key] || 0);
                    const isSaving = saving === `${player.id}-${action.key}`;
                    return (
                      <td key={action.key}>
                        <div className="counter">
                          <button
                            aria-label={`Retirer une action ${action.label} pour ${player.name}`}
                            disabled={count === 0 || Boolean(saving)}
                            onClick={() => updateStat(player, action.key, -1)}
                            type="button"
                          >−</button>
                          <strong aria-live="polite">{isSaving ? "…" : count}</strong>
                          <button
                            aria-label={`Ajouter une action ${action.label} pour ${player.name}`}
                            disabled={Boolean(saving)}
                            onClick={() => updateStat(player, action.key, 1)}
                            type="button"
                          >+</button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {players.length === 0 && !loading && (
            <p className="status-message">Aucun joueur dans l'effectif. Ajoutez des joueurs à la base pour commencer.</p>
          )}
        </div>
      </StatusMessage>
    </section>
  );
}
