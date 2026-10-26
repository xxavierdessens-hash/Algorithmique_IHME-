import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatusMessage from "../components/StatusMessage.jsx";

export default function MatchSummaryPage({ matches, initialMatch }) {
  const [selectedId, setSelectedId] = useState(initialMatch?.id ?? "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialMatch) setSelectedId(initialMatch.id);
  }, [initialMatch]);

  useEffect(() => {
    let active = true;
    if (!selectedId) {
      setRows([]);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError("");
    api.getMatchStatistics(selectedId)
      .then((result) => {
        if (active) setRows(result);
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
  }, [selectedId]);

  const ranking = [...rows].sort((a, b) => Number(b.points) - Number(a.points));

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Après le coup de sifflet</p>
          <h2>Récapitulatif du match</h2>
        </div>
        <label className="select-label">
          Match
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            <option value="">Choisir un match</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>vs {match.opponent}</option>
            ))}
          </select>
        </label>
      </div>
      <StatusMessage loading={loading} error={error}>
        {!selectedId ? (
          <p className="status-message">Sélectionnez un match pour afficher ses statistiques.</p>
        ) : (
          <div className="summary-grid">
            {ranking.map((player, index) => (
              <article className={`summary-card${index === 0 && Number(player.points) > 0 ? " summary-card--mvp" : ""}`} key={player.id}>
                <div className="summary-card__top">
                  <span className="player-number">{player.jersey_number ?? "—"}</span>
                  {index === 0 && Number(player.points) > 0 && <span className="tag tag--mvp">MVP</span>}
                </div>
                <h3>{player.name}</h3>
                <p className="eyebrow">{player.position || "Joueur"}</p>
                <strong className="points-total">{player.points}<small> pts</small></strong>
                <div className="ratio-row">
                  <span>Attaques gagnantes</span><strong>{player.attack_points}</strong>
                </div>
                <div className="ratio-row">
                  <span>Réussite attaque</span><strong>{player.attack_ratio}%</strong>
                </div>
                <div className="ratio-row">
                  <span>Aces · contres</span><strong>{player.serve_aces} · {player.block_points}</strong>
                </div>
              </article>
            ))}
            {ranking.length === 0 && <p className="status-message">Aucune statistique saisie pour ce match.</p>}
          </div>
        )}
      </StatusMessage>
    </section>
  );
}
