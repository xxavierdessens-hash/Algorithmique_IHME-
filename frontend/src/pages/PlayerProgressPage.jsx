import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
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

export default function PlayerProgressPage() {
  const [players, setPlayers] = useState([]);
  const [filters, setFilters] = useState({
    player_id: "all",
    stat_type: "attack_efficiency",
    period: "all",
  });
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
    api.getAnalyticsProgression(filters)
      .then((result) => {
        if (active) setData(result);
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
  }, [filters]);

  const selectedPlayer = players.find(
    (player) => String(player.id) === filters.player_id,
  );
  const label = filters.player_id === "all"
    ? "Moyenne de l'équipe"
    : selectedPlayer?.name || "Joueur";
  const chartData = (data?.time_series || []).map((item) => ({
    ...item,
    match_label: dateFormatter.format(new Date(item.match_date)),
  }));
  const kpis = data?.kpis;
  const statLabel = STAT_OPTIONS.find((option) =>
    option.value === filters.stat_type)?.label || "Statistiques";
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

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Du premier service au dernier set</p>
          <h2>Progression</h2>
        </div>
        <span className="count-pill">Saison en cours</span>
      </div>

      <div className="progress-filters">
        <label className="select-label">
          Joueur
          <select
            disabled={playersLoading}
            onChange={(event) => setFilters({ ...filters, player_id: event.target.value })}
            value={filters.player_id}
          >
            <option value="all">Toute l'équipe (Moyenne)</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Statistique
          <select
            onChange={(event) => setFilters({ ...filters, stat_type: event.target.value })}
            value={filters.stat_type}
          >
            {STAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="select-label">
          Période
          <select
            onChange={(event) => setFilters({ ...filters, period: event.target.value })}
            value={filters.period}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <StatusMessage loading={loading} error={error}>
        {!chartData.length ? (
          <p className="status-message">Les statistiques apparaîtront ici dès qu'un match sera terminé.</p>
        ) : (
          <>
            <div className="progress-kpis">
              <article className="progress-kpi">
                <span>Moyenne / match</span>
                <strong>{formatValue(kpis.average_per_match, filters.stat_type)}</strong>
                <small>{statLabel}</small>
              </article>
              <article className="progress-kpi">
                <span>Record max</span>
                <strong>{formatValue(kpis.record_max.value, filters.stat_type)}</strong>
                <small>vs {kpis.record_max.opponent}</small>
              </article>
              <article className="progress-kpi">
                <span>Total cumulé</span>
                <strong>{formatValue(kpis.cumulative_total, "total_points")}</strong>
                <small>{filters.stat_type === "attack_efficiency" ? "points d'attaque" : statLabel}</small>
              </article>
              <article className="progress-kpi">
                <span>Efficacité attaque</span>
                <strong>{formatValue(kpis.success_rate, "attack_efficiency")}</strong>
                <small>sur la période sélectionnée</small>
              </article>
            </div>
            <div className="progress-charts">
              <article className="chart-card chart-card--wide">
                <div className="chart-card__heading">
                  <div><p className="eyebrow">Évolution temporelle</p><h3>{statLabel} · {label}</h3></div>
                </div>
                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="#edf0eb" strokeDasharray="3 3" />
                      <XAxis dataKey="match_label" tick={{ fill: "#829089", fontSize: 11 }} />
                      <YAxis
                        domain={filters.stat_type === "attack_efficiency" ? [0, 100] : ["auto", "auto"]}
                        tick={{ fill: "#829089", fontSize: 11 }}
                        tickFormatter={(value) => filters.stat_type === "attack_efficiency" ? `${value}%` : value}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatValue(value, filters.stat_type),
                          name === "team_average" ? "Moyenne équipe" : label,
                        ]}
                        labelFormatter={(_label, items) => items[0]?.payload?.opponent || ""}
                      />
                      <Legend formatter={(value) => value === "team_average" ? "Moyenne équipe" : label} />
                      {filters.player_id !== "all" && (
                        <Line dataKey="team_average" name="team_average" stroke="#aeb8b0" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                      )}
                      <Line dataKey="value" name={label} stroke="#1c5a43" activeDot={{ r: 6 }} dot={{ r: 3 }} strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
              <article className="chart-card">
                <div className="chart-card__heading">
                  <div><p className="eyebrow">Profil multicritères</p><h3>{label}</h3></div>
                </div>
                <div className="chart-area chart-area--radar">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data.radar} outerRadius="72%">
                      <PolarGrid stroke="#e4eae3" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#718078", fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" name={label} stroke="#1c5a43" fill="#1c5a43" fillOpacity={0.22} />
                      <Tooltip formatter={(value) => [`${Math.round(value)} / 100`, "Profil"]} />
                    </RadarChart>
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
