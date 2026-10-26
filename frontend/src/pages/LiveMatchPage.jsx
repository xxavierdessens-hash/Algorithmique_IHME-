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

export default function LiveMatchPage({ match, onUpdateMatch }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(Boolean(match));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [scoreSaving, setScoreSaving] = useState(false);

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

  async function updateScore(field, delta) {
    const current = Number(match[field] || 0);
    if (delta < 0 && current === 0) return;
    setScoreSaving(true);
    setError("");
    try {
      await onUpdateMatch(match.id, { [field]: current + delta, status: "En cours" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setScoreSaving(false);
    }
  }

  async function finishMatch() {
    if (!window.confirm("Terminer le match et verrouiller ses statistiques ?")) return;
    setScoreSaving(true);
    setError("");
    try {
      await onUpdateMatch(match.id, { status: "Terminé" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setScoreSaving(false);
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
          <p className="eyebrow">Feuille de match · {match.location || match.venue || "Lieu à confirmer"}</p>
          <h2>StatsVolley <span className="muted">vs</span> {match.opponent}</h2>
        </div>
        {match.status === "Terminé"
          ? <span className="tag tag--completed">Match terminé</span>
          : <span className="live-indicator"><i /> LIVE</span>}
      </div>
      <div className="scoreboard">
        <div className="scoreboard__side">
          <span>StatsVolley</span>
          <div className="scoreboard__set-points">
            <strong>{match.current_set_home ?? 0}</strong>
            <div className="counter">
              <button aria-label="Retirer un point à StatsVolley" disabled={scoreSaving || match.status === "Terminé" || Number(match.current_set_home || 0) === 0} onClick={() => updateScore("current_set_home", -1)} type="button">−</button>
              <span>Points du set</span>
              <button aria-label="Ajouter un point à StatsVolley" disabled={scoreSaving || match.status === "Terminé"} onClick={() => updateScore("current_set_home", 1)} type="button">+</button>
            </div>
          </div>
          <div className="scoreboard__sets">
            <span>Sets</span>
            <div className="counter">
              <button aria-label="Retirer un set à StatsVolley" disabled={scoreSaving || match.status === "Terminé" || Number(match.score_home || 0) === 0} onClick={() => updateScore("score_home", -1)} type="button">−</button>
              <strong>{match.score_home ?? 0}</strong>
              <button aria-label="Ajouter un set à StatsVolley" disabled={scoreSaving || match.status === "Terminé"} onClick={() => updateScore("score_home", 1)} type="button">+</button>
            </div>
          </div>
        </div>
        <span className="scoreboard__versus">—</span>
        <div className="scoreboard__side">
          <span>{match.opponent}</span>
          <div className="scoreboard__set-points">
            <strong>{match.current_set_away ?? 0}</strong>
            <div className="counter">
              <button aria-label={`Retirer un point à ${match.opponent}`} disabled={scoreSaving || match.status === "Terminé" || Number(match.current_set_away || 0) === 0} onClick={() => updateScore("current_set_away", -1)} type="button">−</button>
              <span>Points du set</span>
              <button aria-label={`Ajouter un point à ${match.opponent}`} disabled={scoreSaving || match.status === "Terminé"} onClick={() => updateScore("current_set_away", 1)} type="button">+</button>
            </div>
          </div>
          <div className="scoreboard__sets">
            <span>Sets</span>
            <div className="counter">
              <button aria-label={`Retirer un set à ${match.opponent}`} disabled={scoreSaving || match.status === "Terminé" || Number(match.score_away || 0) === 0} onClick={() => updateScore("score_away", -1)} type="button">−</button>
              <strong>{match.score_away ?? 0}</strong>
              <button aria-label={`Ajouter un set à ${match.opponent}`} disabled={scoreSaving || match.status === "Terminé"} onClick={() => updateScore("score_away", 1)} type="button">+</button>
            </div>
          </div>
        </div>
        {match.status !== "Terminé" && (
          <button className="button button--primary scoreboard__finish" disabled={scoreSaving} onClick={finishMatch} type="button">
            {scoreSaving ? "Enregistrement…" : "Terminer le match"}
          </button>
        )}
      </div>
      <p className="helper-text">
        {match.status === "Terminé"
          ? `Score final : ${match.score_home} – ${match.score_away} sets. Les statistiques sont verrouillées.`
          : "Touchez + pour enregistrer une action, − pour la corriger."}
      </p>
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
                            disabled={count === 0 || Boolean(saving) || match.status === "Terminé"}
                            onClick={() => updateStat(player, action.key, -1)}
                            type="button"
                          >−</button>
                          <strong aria-live="polite">{isSaving ? "…" : count}</strong>
                          <button
                            aria-label={`Ajouter une action ${action.label} pour ${player.name}`}
                            disabled={Boolean(saving) || match.status === "Terminé"}
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
