import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import StatusMessage from "../components/StatusMessage.jsx";

const SORTABLE_COLUMNS = [
  { key: "points", label: "Points" },
  { key: "attack_points", label: "Attaques" },
  { key: "serve_aces", label: "Aces" },
  { key: "block_points", label: "Blocs" },
  { key: "sets_played", label: "Temps de jeu" },
];

function formatMetric(value, setsPlayed, displayMode, unit = "") {
  const total = Number(value || 0);
  const sets = Number(setsPlayed || 0);
  const ratio = sets > 0
    ? (total / sets).toLocaleString("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
    : "—";
  const setsLabel = `${sets.toLocaleString("fr-FR")} ${sets === 1 ? "set" : "sets"}`;
  const totalLabel = `${total.toLocaleString("fr-FR")}${unit ? ` ${unit}` : ""}`;
  if (displayMode === "perSet") {
    return <>{ratio}<small> /set</small><span className="summary-table__subvalue">{totalLabel} · {setsLabel}</span></>;
  }
  return <>{totalLabel}<span className="summary-table__subvalue">{ratio}/set · {setsLabel}</span></>;
}

export default function MatchSummaryPage({ matches, initialMatch, canManage = false }) {
  const [selectedId, setSelectedId] = useState(initialMatch?.id ?? "");
  const [rows, setRows] = useState([]);
  const [setsDraft, setSetsDraft] = useState({});
  const [setsSaving, setSetsSaving] = useState("");
  const [displayMode, setDisplayMode] = useState("totals");
  const [sortKey, setSortKey] = useState("points");
  const [sortDirection, setSortDirection] = useState("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialMatch) setSelectedId(initialMatch.id);
  }, [initialMatch]);

  useEffect(() => {
    let active = true;
    if (!selectedId) {
      setRows([]);
      return () => { active = false; };
    }
    setLoading(true);
    setError("");
    api.getMatchStatistics(selectedId)
      .then((result) => {
        if (active) {
          setRows(result);
          setSetsDraft(Object.fromEntries(
            result.map((player) => [player.id, String(player.sets_played ?? 0)]),
          ));
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedId]);

  const selectedMatch = matches.find(
    (match) => String(match.id) === String(selectedId),
  );
  const sortedRows = useMemo(() => [...rows].sort((first, second) => {
    const firstValue = first[sortKey];
    const secondValue = second[sortKey];
    const comparison = typeof firstValue === "string"
      ? String(firstValue).localeCompare(String(secondValue), "fr")
      : Number(firstValue || 0) - Number(secondValue || 0);
    return comparison * (sortDirection === "asc" ? 1 : -1);
  }), [rows, sortDirection, sortKey]);
  const mvp = [...rows].sort((first, second) =>
    Number(second.points) - Number(first.points))[0];
  const attackPoints = rows.reduce(
    (total, player) => total + Number(player.attack_points || 0),
    0,
  );
  const attackAttempts = rows.reduce(
    (total, player) => total + Number(player.attack_attempts || 0),
    0,
  );
  const teamAttackRatio = attackAttempts > 0
    ? Math.round((attackPoints / attackAttempts) * 100)
    : 0;

  function sortBy(key) {
    if (sortKey === key) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection(key === "name" ? "asc" : "desc");
    }
  }

  async function saveSetsPlayed(playerId) {
    const rawValue = setsDraft[playerId] ?? "0";
    const setsPlayed = rawValue === "" ? 0 : Number(rawValue);
    const player = rows.find((item) => item.id === playerId);
    if (Number.isFinite(setsPlayed) &&
      setsPlayed === Number(player?.sets_played ?? 0)) return;

    setSetsSaving(String(playerId));
    setError("");
    try {
      const updated = await api.updatePlayerSets(selectedId, playerId, setsPlayed);
      setRows((current) =>
        current.map((item) => item.id === updated.id ? updated : item),
      );
      setSetsDraft((current) => ({
        ...current,
        [playerId]: String(updated.sets_played),
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSetsSaving("");
    }
  }

  return (
    <section className="match-summary">
      <div className="section-heading">
        <div>
          <p className="eyebrow summary-overline">Après le coup de sifflet</p>
          <h2>Fiche récap</h2>
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
          <>
            <section className="match-report">
              <div className="match-report__heading">
                <p className="eyebrow summary-overline">Bilan de la rencontre</p>
                <h2 className="summary-contrast-title">Bilan & MVP du match</h2>
                <p>StatsVolley <span>vs</span> {selectedMatch?.opponent || "Adversaire"}</p>
              </div>
              <div className="match-report__metrics">
                <article>
                  <span className="summary-metric-label">Score</span>
                  <strong className="summary-metric-value">{selectedMatch
                    ? `${selectedMatch.score_home} – ${selectedMatch.score_away}`
                    : "—"}</strong>
                  <small>sets</small>
                </article>
                <article>
                  <span className="summary-metric-label">MVP</span>
                  <strong className="summary-metric-value">{mvp && Number(mvp.points) > 0 ? mvp.name : "—"}</strong>
                  <small>{mvp && Number(mvp.points) > 0 ? `${mvp.points} points` : "Aucun point enregistré"}</small>
                </article>
                <article>
                  <span className="summary-metric-label">Attaque équipe</span>
                  <strong className="summary-metric-value">{teamAttackRatio}%</strong>
                  <small>{attackPoints} / {attackAttempts} attaques gagnantes</small>
                </article>
              </div>
            </section>

            <div className="summary-table-toolbar">
              <div>
                <p className="eyebrow summary-overline">Performance individuelle</p>
                <h3 className="summary-contrast-title">Statistiques des joueurs</h3>
              </div>
              <div className="view-toggle" aria-label="Mode d'affichage">
                <button
                  aria-pressed={displayMode === "totals"}
                  className={displayMode === "totals" ? "view-toggle__active" : ""}
                  onClick={() => setDisplayMode("totals")}
                  type="button"
                >Totaux</button>
                <button
                  aria-pressed={displayMode === "perSet"}
                  className={displayMode === "perSet" ? "view-toggle__active" : ""}
                  onClick={() => setDisplayMode("perSet")}
                  type="button"
                >Par set</button>
              </div>
            </div>
            <div className="summary-table-wrap">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th className="summary-table__heading" scope="col">Joueur</th>
                    {SORTABLE_COLUMNS.map((column) => (
                      <th aria-sort={sortKey === column.key
                        ? sortDirection === "asc" ? "ascending" : "descending"
                        : "none"} className="summary-table__heading" key={column.key} scope="col">
                        <button onClick={() => sortBy(column.key)} type="button">
                          {column.label}
                          {sortKey === column.key && (
                            <span aria-hidden="true">{sortDirection === "asc" ? " ↑" : " ↓"}</span>
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((player) => (
                    <tr key={player.id}>
                      <th scope="row">
                        <span className="player-number">{player.jersey_number ?? "—"}</span>
                        <span>{player.name}</span>
                        {Number(player.id) === Number(mvp?.id) && Number(player.points) > 0 &&
                          <span className="tag tag--mvp">MVP</span>}
                      </th>
                      <td>{formatMetric(player.points, player.sets_played, displayMode, "pts")}</td>
                      <td>
                        <span className="summary-table__value">
                          {formatMetric(player.attack_points, player.sets_played, displayMode, "pts")}
                        </span>
                        <small className="summary-table__efficiency">{player.attack_ratio}% réussite</small>
                      </td>
                      <td>{formatMetric(player.serve_aces, player.sets_played, displayMode)}</td>
                      <td>{formatMetric(player.block_points, player.sets_played, displayMode)}</td>
                      <td>
                        {canManage ? (
                          <label className="summary-table__sets">
                            <input
                              aria-label={`Sets joués par ${player.name}`}
                              disabled={setsSaving === String(player.id)}
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
                            <small>sets</small>
                          </label>
                        ) : <span>{player.sets_played ?? 0} sets</span>}
                      </td>
                    </tr>
                  ))}
                  {!sortedRows.length && !loading && (
                    <tr><td className="summary-table__empty" colSpan={6}>Aucune statistique saisie pour ce match.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </StatusMessage>
    </section>
  );
}
