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

const POSITION_GROUPS = [
  { label: "PASSEURS", positions: ["Passeur"] },
  { label: "CENTRAUX", positions: ["Central"] },
  { label: "ATTAQUANTS / R4", positions: ["R4"] },
  { label: "POINTUS", positions: ["Pointu"] },
  { label: "LIBÉROS", positions: ["Libéro"] },
];

export default function LiveMatchPage({ match, onUpdateMatch }) {
  const [players, setPlayers] = useState([]);
  const [setsDraft, setSetsDraft] = useState({});
  const [loading, setLoading] = useState(Boolean(match));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [setsSaving, setSetsSaving] = useState("");
  const [scoreSaving, setScoreSaving] = useState(false);
  const [undoSaving, setUndoSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!match) {
      setPlayers([]);
      setSetsDraft({});
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError("");
    api.getMatchStatistics(match.id)
      .then((rows) => {
        if (active) {
          setPlayers(rows);
          setSetsDraft(Object.fromEntries(
            rows.map((player) => [player.id, String(player.sets_played ?? 0)]),
          ));
        }
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
  }, [match?.id]);

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

  async function saveSetsPlayed(playerId, value = setsDraft[playerId]) {
    const setsPlayed = value === "" ? 0 : Number(value);
    const player = players.find((item) => item.id === playerId);
    if (Number.isFinite(setsPlayed) &&
      setsPlayed === Number(player?.sets_played ?? 0)) return;

    setSetsSaving(String(playerId));
    setError("");
    try {
      const updated = await api.updatePlayerSets(match.id, playerId, setsPlayed);
      setPlayers((current) =>
        current.map((item) => item.id === updated.id ? updated : item),
      );
      setSetsDraft((current) => ({ ...current, [playerId]: String(updated.sets_played) }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSetsSaving("");
    }
  }

  async function undoLastAction() {
    setUndoSaving(true);
    setError("");
    try {
      const updated = await api.undoLastAction(match.id);
      setPlayers((current) =>
        current.map((item) => item.id === updated.id ? updated : item),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUndoSaving(false);
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
      const changedPlayers = players.filter((player) =>
        Number(setsDraft[player.id] ?? player.sets_played) !== Number(player.sets_played ?? 0),
      );
      const updatedPlayers = await Promise.all(changedPlayers.map((player) =>
        api.updatePlayerSets(
          match.id,
          player.id,
          setsDraft[player.id] === "" ? 0 : Number(setsDraft[player.id] ?? player.sets_played),
        ),
      ));
      const updatedById = new Map(updatedPlayers.map((player) => [player.id, player]));
      setPlayers((current) => current.map((player) =>
        updatedById.get(player.id) ?? player,
      ));
      setSetsDraft((current) => ({
        ...current,
        ...Object.fromEntries(updatedPlayers.map((player) => [
          player.id,
          String(player.sets_played),
        ])),
      }));
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
        <div className="live-heading-actions">
          <button
            className="button button--secondary"
            disabled={undoSaving || Boolean(saving) || Boolean(setsSaving) ||
              scoreSaving || match.status === "Terminé"}
            onClick={undoLastAction}
            type="button"
          >
            {undoSaving ? "Annulation…" : "↩ Annuler la dernière action"}
          </button>
          {match.status === "Terminé"
            ? <span className="tag tag--completed">Match terminé</span>
            : <span className="live-indicator"><i /> LIVE</span>}
        </div>
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
          ? `Score final : ${match.score_home} – ${match.score_away} sets. Les statistiques d'action sont verrouillées ; le temps de jeu reste modifiable.`
          : "Touchez + pour enregistrer une action, − pour la corriger. Le temps de jeu se saisit par pas de 0,5 set."}
      </p>
      <StatusMessage loading={loading} error={error}>
        <div className="live-table-wrap">
          <table className="live-table">
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Temps de jeu</th>
                {ACTIONS.map((action) => (
                  <th key={action.key}>
                    <span>{action.group}</span>
                    {action.label}
                  </th>
                ))}
              </tr>
            </thead>
            {POSITION_GROUPS.map((group) => {
              const groupPlayers = players.filter((player) =>
                group.positions.includes(player.position),
              );
              if (!groupPlayers.length) return null;
              return (
                <tbody key={group.label}>
                  <tr className="live-table__group">
                    <th colSpan={ACTIONS.length + 2}>{group.label}</th>
                  </tr>
                  {groupPlayers.map((player) => (
                    <tr key={player.id}>
                  <th scope="row">
                    <span className="player-number">{player.jersey_number ?? "—"}</span>
                    <span>{player.name}</span>
                  </th>
                  <td>
                    <input
                      aria-label={`Temps de jeu, en sets, pour ${player.name}`}
                      className="sets-input"
                      disabled={scoreSaving || setsSaving === String(player.id)}
                      max="5"
                      min="0"
                      onBlur={() => saveSetsPlayed(player.id)}
                      onChange={(event) => setSetsDraft((current) => ({
                        ...current,
                        [player.id]: event.target.value,
                      }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      step="0.5"
                      type="number"
                      value={setsDraft[player.id] ?? player.sets_played ?? 0}
                    />
                  </td>
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
              );
            })}
          </table>
          {players.length === 0 && !loading && (
            <p className="status-message">Aucun joueur dans l'effectif. Ajoutez des joueurs à la base pour commencer.</p>
          )}
        </div>
      </StatusMessage>
    </section>
  );
}
