import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client.js";
import StatusMessage from "../components/StatusMessage.jsx";

const STAT_OPTIONS = [
  { value: "attack_efficiency", label: "Efficacité attaque %" },
  { value: "total_points", label: "Total points" },
  { value: "aces", label: "Aces" },
  { value: "blocks", label: "Blocs" },
];
const POSITION_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "Passeur", label: "Passeurs" },
  { value: "R4", label: "R4 / Attaquants" },
  { value: "Central", label: "Centraux" },
  { value: "Pointu", label: "Pointus" },
  { value: "Libéro", label: "Libéros" },
];
const CHART_COLORS = ["#2457d6", "#d05b38", "#15836d", "#8b5cf6", "#c08a14", "#dc3d72"];
const PERIOD_OPTIONS = [
  { value: "all", label: "Tout le semestre" },
  { value: "last_5", label: "5 derniers matchs" },
  { value: "last_3", label: "3 derniers matchs" },
];
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
});
const SEASON_STATS = [
  { key: "points", label: "Points", unit: "pts" },
  { key: "attack_points", label: "Attaques gagnantes", unit: "pts" },
  { key: "attack_attempts", label: "Tentatives", unit: "actions" },
  { key: "attack_errors", label: "Fautes attaque", unit: "fautes" },
  { key: "serve_aces", label: "Aces", unit: "aces" },
  { key: "serve_errors", label: "Fautes service", unit: "fautes" },
  { key: "block_points", label: "Contres", unit: "contres" },
];

function formatValue(value, statType) {
  const formatted = Number(value || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: statType === "attack_efficiency" ? 1 : 0,
  });
  return statType === "attack_efficiency" ? `${formatted}%` : formatted;
}

function formatAverage(value) {
  return Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default function PlayerProgressPage() {
  const [players, setPlayers] = useState([]);
  const [position, setPosition] = useState("all");
  const [statType, setStatType] = useState("attack_efficiency");
  const [period, setPeriod] = useState("all");
  const [comparedIds, setComparedIds] = useState([]);
  const [playerToAdd, setPlayerToAdd] = useState("");
  const [includeAverage, setIncludeAverage] = useState(true);
  const [data, setData] = useState(null);
  const [seasonRows, setSeasonRows] = useState([]);
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [seasonError, setSeasonError] = useState("");
  const [displayMode, setDisplayMode] = useState("totals");
  const [playersLoading, setPlayersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getPlayers("Joueur")
      .then((result) => {
        if (active) setPlayers(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setPlayersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api.getProgression()
      .then((result) => {
        if (active) setSeasonRows(result);
      })
      .catch((requestError) => {
        if (active) setSeasonError(requestError.message);
      })
      .finally(() => {
        if (active) setSeasonLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const positionFilter = position === "all" ? null : position;
    const playerRequests = comparedIds.map((id) => {
      const player = players.find((item) => String(item.id) === String(id));
      return api.getAnalyticsProgression({
        player_id: id,
        stat_type: statType,
        period,
        position: positionFilter,
      }).then((result) => ({ id, name: player?.name || "Joueur", result }));
    });
    const averageRequest = includeAverage
      ? api.getAnalyticsProgression({
        player_id: "all",
        stat_type: statType,
        period,
        position: positionFilter,
      }).then((result) => ({ id: "average", name: "Moyenne", result }))
      : Promise.resolve(null);
    Promise.all([Promise.all(playerRequests), averageRequest])
      .then(([playerResults, averageResult]) => {
        if (!active) return;
        const results = [...playerResults, ...(averageResult ? [averageResult] : [])];
        const pointsByMatch = new Map();
        for (const series of results) {
          for (const item of series.result.time_series) {
            const key = String(item.match_id);
            if (!pointsByMatch.has(key)) {
              pointsByMatch.set(key, {
                match_id: item.match_id,
                match_date: item.match_date,
                match_label: dateFormatter.format(new Date(item.match_date)),
                opponent: item.opponent,
              });
            }
            const dataKey = series.id === "average" ? "average" : `player_${series.id}`;
            pointsByMatch.get(key)[dataKey] = Number(item.value);
          }
        }
        setData({
          chartData: [...pointsByMatch.values()].sort(
            (first, second) => new Date(first.match_date) - new Date(second.match_date),
          ),
          kpis: (playerResults[0] || averageResult)?.result.kpis ?? null,
          kpiLabel: playerResults[0]?.name || averageResult?.name || "",
        });
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
  }, [comparedIds, includeAverage, period, position, players, statType]);

  const availablePlayers = players.filter(
    (player) => position === "all" || player.position === position,
  );
  const chartData = data?.chartData ?? [];
  const kpis = data?.kpis;
  const statLabel = STAT_OPTIONS.find((option) =>
    option.value === statType)?.label || "Statistiques";
  const sortedSeasonRows = [...seasonRows].sort(
    (first, second) => Number(second.points) - Number(first.points),
  );
  const formatSeasonMetric = (value, setsPlayed, unit) => {
    const total = Number(value || 0);
    const sets = Number(setsPlayed || 0);
    const perSet = sets > 0 ? total / sets : 0;
    const ratio = perSet.toLocaleString("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const totalLabel = `${total} ${unit}`;
    const formattedSets = sets.toLocaleString("fr-FR");
    return displayMode === "totals"
      ? `${totalLabel} (${ratio}/set — ${formattedSets} sets)`
      : `${ratio}/set (${totalLabel} — ${formattedSets} sets)`;
  };
  const averageLabel = position === "all"
    ? "Moyenne équipe"
    : `Moyenne · ${POSITION_OPTIONS.find((item) => item.value === position)?.label}`;

  function addPlayerToComparison() {
    if (!playerToAdd || comparedIds.includes(playerToAdd)) return;
    setComparedIds((current) => [...current, playerToAdd]);
    setPlayerToAdd("");
  }

  function changePosition(nextPosition) {
    setPosition(nextPosition);
    if (nextPosition !== "all") {
      setComparedIds((current) => current.filter((id) =>
        players.find((player) => String(player.id) === String(id))?.position === nextPosition,
      ));
    }
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Du premier service au dernier set</p>
          <h2>Progression</h2>
        </div>
        <span className="count-pill">Saison en cours</span>
      </div>

      <div className="position-filter" role="group" aria-label="Filtrer par poste">
        {POSITION_OPTIONS.map((option) => (
          <button
            aria-pressed={position === option.value}
            className={position === option.value ? "position-filter__active" : ""}
            key={option.value}
            onClick={() => changePosition(option.value)}
            type="button"
          >{option.label}</button>
        ))}
      </div>
      <div className="progress-filters">
        <label className="select-label">
          Ajouter un joueur à la comparaison
          <select
            disabled={playersLoading || comparedIds.length >= CHART_COLORS.length}
            onChange={(event) => setPlayerToAdd(event.target.value)}
            value={playerToAdd}
          >
            <option value="">Choisir un joueur</option>
            {availablePlayers.filter((player) => !comparedIds.includes(String(player.id))).map((player) => (
              <option key={player.id} value={String(player.id)}>{player.name}</option>
            ))}
          </select>
        </label>
        <button
          className="button button--secondary"
          disabled={!playerToAdd}
          onClick={addPlayerToComparison}
          type="button"
        >Ajouter</button>
        <label className="progress-average-toggle">
          <input
            checked={includeAverage}
            onChange={(event) => setIncludeAverage(event.target.checked)}
            type="checkbox"
          />
          {averageLabel}
        </label>
        <label className="select-label">
          Statistique
          <select
            onChange={(event) => setStatType(event.target.value)}
            value={statType}
          >
            {STAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Période
          <select
            onChange={(event) => setPeriod(event.target.value)}
            value={period}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <StatusMessage loading={loading} error={error}>
        {!chartData.length ? (
          <p className="status-message">Les statistiques apparaîtront ici dès qu'un match sera terminé, ou sélectionnez une moyenne à comparer.</p>
        ) : (
          <>
            <div className="progress-comparison-list" aria-label="Séries comparées">
              {comparedIds.map((id) => {
                const player = players.find((item) => String(item.id) === String(id));
                return (
                  <span className="progress-comparison-chip" key={id}>
                    {player?.name || "Joueur"}
                    <button
                      aria-label={`Retirer ${player?.name || "le joueur"} de la comparaison`}
                      onClick={() => setComparedIds((current) => current.filter((item) => item !== id))}
                      type="button"
                    >×</button>
                  </span>
                );
              })}
            </div>
            <div className="progress-kpis">
              <article className="progress-kpi">
                <span>Efficacité attaque</span>
                <strong>{formatValue(kpis?.attack_efficiency, "attack_efficiency")}</strong>
                <small>Attaques gagnantes / (gagnantes + fautes) · {data?.kpiLabel}</small>
              </article>
              <article className="progress-kpi">
                <span>Total points marquants</span>
                <strong>{formatValue(kpis?.total_points, "total_points")}</strong>
                <small>Attaques + aces + blocs · {data?.kpiLabel}</small>
              </article>
              <article className="progress-kpi">
                <span>Aces par match</span>
                <strong>{formatAverage(kpis?.aces_per_match)}</strong>
                <small>{formatValue(kpis?.serve_errors, "total_points")} fautes de service · période</small>
              </article>
              <article className="progress-kpi">
                <span>Blocs gagnants par match</span>
                <strong>{formatAverage(kpis?.blocks_per_match)}</strong>
                <small>Sur la période sélectionnée</small>
              </article>
            </div>
            <div className="progress-charts">
              <article className="chart-card chart-card--wide">
                <div className="chart-card__heading">
                  <div><p className="eyebrow">Évolution temporelle</p><h3>{statLabel}</h3></div>
                </div>
                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="#edf0eb" strokeDasharray="3 3" />
                      <XAxis dataKey="match_label" tick={{ fill: "#596579", fontSize: 11 }} />
                      <YAxis
                        domain={statType === "attack_efficiency" ? [0, 100] : ["auto", "auto"]}
                        tick={{ fill: "#596579", fontSize: 11 }}
                        tickFormatter={(value) => statType === "attack_efficiency" ? `${value}%` : value}
                      />
                      <Tooltip
                        formatter={(value, name) => [formatValue(value, statType), name]}
                        labelFormatter={(_label, items) => items[0]?.payload?.opponent || ""}
                      />
                      <Legend />
                      {comparedIds.map((id, index) => {
                        const player = players.find((item) => String(item.id) === String(id));
                        return (
                          <Line
                            activeDot={{ r: 6 }}
                            dataKey={`player_${id}`}
                            dot={{ r: 3 }}
                            key={id}
                            name={player?.name || "Joueur"}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={2.5}
                          />
                        );
                      })}
                      {includeAverage && (
                        <Line
                          activeDot={{ r: 5 }}
                          dataKey="average"
                          dot={false}
                          name={averageLabel}
                          stroke="#64748b"
                          strokeDasharray="6 4"
                          strokeWidth={2.5}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>
          </>
        )}
      </StatusMessage>
      <section className="season-progression">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cumuls individuels</p>
            <h2>Statistiques par joueur</h2>
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
        <StatusMessage loading={seasonLoading} error={seasonError}>
          <div className="progress-table-wrap">
            <table className="progress-table">
              <thead>
                <tr>
                  <th scope="col">Joueur</th>
                  <th scope="col">Sets joués</th>
                  {SEASON_STATS.map((stat) => (
                    <th key={stat.key} scope="col">{stat.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSeasonRows.map((player) => (
                  <tr key={player.id}>
                    <th scope="row">
                      <span className="player-number">{player.jersey_number ?? "—"}</span>
                      {player.name}
                    </th>
                    <td>{Number(player.sets_played || 0).toLocaleString("fr-FR")}</td>
                    {SEASON_STATS.map((stat) => (
                      <td key={stat.key}>
                        {formatSeasonMetric(player[stat.key], player.sets_played, stat.unit)}
                      </td>
                    ))}
                  </tr>
                ))}
                {!sortedSeasonRows.length && !seasonLoading && (
                  <tr><td colSpan={SEASON_STATS.length + 2}>Aucun joueur actif à afficher.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </StatusMessage>
      </section>
    </section>
  );
}
