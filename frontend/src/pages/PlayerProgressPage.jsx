import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatusMessage from "../components/StatusMessage.jsx";

export default function PlayerProgressPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getProgression()
      .then((result) => {
        if (active) setPlayers(result);
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
  }, []);

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Du premier service au dernier set</p>
          <h2>Progression de l'équipe</h2>
        </div>
        <span className="count-pill">Saison en cours</span>
      </div>
      <StatusMessage loading={loading} error={error}>
        {players.length === 0 ? (
          <p className="status-message">Les statistiques de saison apparaîtront ici.</p>
        ) : (
          <div className="progress-list">
            {players.map((player) => (
              <article className="progress-card" key={player.id}>
                <div className="progress-card__identity">
                  <span className="player-number">{player.jersey_number ?? "—"}</span>
                  <div><h3>{player.name}</h3><p>{player.position || "Joueur"}</p></div>
                </div>
                <div className="progress-metric"><strong>{player.matches_played}</strong><span>matchs</span></div>
                <div className="progress-metric"><strong>{player.points}</strong><span>points</span></div>
                <div className="progress-metric"><strong>{player.attack_ratio}%</strong><span>réussite attaque</span></div>
              </article>
            ))}
          </div>
        )}
      </StatusMessage>
    </section>
  );
}
